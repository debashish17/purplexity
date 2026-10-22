import "./env";
import express from "express";
import type { Request, Response } from "express";
import { tavily } from "@tavily/core";
import { OpenRouter } from '@openrouter/sdk';
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt";
import { prisma } from "./db.js"
import { middleware } from "./middleware.js";
import cors from "cors";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const openrouter = new OpenRouter({ apiKey: process.env.AI_API_KEY });
const app = express();

const PORT = Number(process.env.PORT ?? 3001);
const MODEL = process.env.AI_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free";
const MAX_QUERY_LENGTH = 2000;
// Follow-ups send at most this many earlier messages (user + assistant) back to the model
const MAX_HISTORY_MESSAGES = 10;
const SOURCES_SEPARATOR = "\n---------SOURCES---------\n";

app.use(express.json());
// CORS_ORIGIN is a comma-separated allowlist; when unset any origin is allowed (local dev)
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",").map(o => o.trim()) } : undefined));

type ChatMessage = { role: "user" | "assistant"; content: string };

function readQuery(req: Request, res: Response): string | null {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query || query.length > MAX_QUERY_LENGTH) {
        res.status(400).json({ message: `query must be a non-empty string of at most ${MAX_QUERY_LENGTH} characters` });
        return null;
    }
    return query;
}

function buildPrompt(webSearchResults: unknown, query: string) {
    // Single pass with a function replacer: `$&`, `$'` etc. in the query are inserted
    // literally, and placeholders inside the inserted text are never expanded.
    return PROMPT_TEMPLATE.replace(/\{\{(WEB_SEARCH_RESULTS|USER_QUERY)\}\}/g, (_, key) =>
        key === "USER_QUERY" ? query : JSON.stringify(webSearchResults));
}

function writeError(res: Response, message: string) {
    res.end(`\n<ERROR>${message}</ERROR>\n`);
}

// Searches the web, then streams the model's answer followed by the sources block.
// Returns the full text to save, or null if the client left or something failed
// (an <ERROR> block has then been sent, if the client is still there).
async function streamAnswer(res: Response, query: string, history: ChatMessage[]): Promise<string | null> {
    // Stop paying for model tokens if the user leaves mid-answer. Note: Bun 1.3
    // doesn't report disconnects on POST requests once the body is read, so this
    // only takes effect under Node until Bun fixes that.
    const abort = new AbortController();
    res.on("close", () => abort.abort());

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.socket?.setNoDelay(true);

    try {
        const webSearchResponse = await client.search(query, {
            searchDepth: "advanced"
        });
        const webSearchResults = webSearchResponse.results;

        const result = await openrouter.chat.send({
            chatRequest: {
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...history,
                    { role: 'user', content: buildPrompt(webSearchResults, query) },
                ],
                stream: true
            }
        }, { signal: abort.signal });

        let fullResponse = "";

        for await (const chunk of result) {
            if (abort.signal.aborted) break;
            const textPart = chunk.choices[0]?.delta?.content;
            if (textPart) {
                fullResponse += textPart;
                res.write(textPart);
            }
        }
        if (abort.signal.aborted) return null;

        const sourcesStr = `${SOURCES_SEPARATOR}\n<SOURCES>\n${JSON.stringify(webSearchResults.map(r => ({ url: r.url })))}\n</SOURCES>\n`;
        res.write(sourcesStr);
        return fullResponse + sourcesStr;
    } catch (e) {
        if (abort.signal.aborted) return null;
        console.error("Failed to generate answer", e);
        writeError(res, "Something went wrong while generating the answer. Please try again.");
        return null;
    }
}

// GET /conversations — list the authenticated user's conversations, most recent first
app.get("/conversations", middleware, async (req, res) => {
    const rows = await prisma.conversation.findMany({
        where: { userId: req.userId },
        select: {
            id: true,
            title: true,
            slug: true,
            // Latest message only, to sort by most recent activity
            messages: {
                select: { createdAt: true },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
            },
        },
    });

    const lastActivity = (c: (typeof rows)[number]) => c.messages[0]?.createdAt.getTime() ?? 0;
    const conversations = rows
        .sort((a, b) => lastActivity(b) - lastActivity(a))
        .map(({ messages, ...c }) => c);

    res.json({ conversations });
});

// GET /conversation/:conversationId — get a single conversation with messages
app.get("/conversation/:conversationId", middleware, async (req, res) => {
    const conversationId = req.params.conversationId as string;

    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.userId },
        include: {
            messages: {
                // Both messages of a turn share a timestamp, so id breaks the tie
                orderBy: [{ createdAt: "asc" }, { id: "asc" }]
            }
        }
    });

    if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
    }

    res.json({ conversation });
});

// POST /purplexity_ask — new search query, creates a new conversation
app.post("/purplexity_ask", middleware, async (req, res) => {
    const query = readQuery(req, res);
    if (!query) return;

    const fullResponse = await streamAnswer(res, query, []);
    if (fullResponse === null) return;

    try {
        // Persist the conversation and messages
        const slug = query.toLowerCase().replace(/\s+/g, "-").slice(0, 60);
        const conversation = await prisma.conversation.create({
            data: {
                title: query,
                slug,
                userId: req.userId,
                messages: {
                    create: [
                        { role: "User", content: query },
                        { role: "Assistant", content: fullResponse },
                    ]
                }
            }
        });

        res.end(`\n<CONVERSATION_ID>${conversation.id}</CONVERSATION_ID>\n`);
    } catch (e) {
        console.error("Failed to save conversation", e);
        writeError(res, "The answer couldn't be saved. Please try again.");
    }
});

// POST /purplexity_ask/follow_up — follow-up question in an existing conversation
app.post("/purplexity_ask/follow_up", middleware, async (req, res) => {
    const query = readQuery(req, res);
    if (!query) return;

    const conversationId = req.body.conversationId;
    if (typeof conversationId !== "string" || !conversationId) {
        res.status(400).json({ message: "conversationId is required" });
        return;
    }

    // Look the conversation up before streaming starts, so a 404 is still a normal response
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.userId },
        include: {
            messages: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: MAX_HISTORY_MESSAGES,
            }
        }
    });

    if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
    }

    // Fetched newest-first to cap the history; the model needs it oldest-first,
    // and without the saved sources block that only the UI uses
    const history: ChatMessage[] = conversation.messages.reverse().map(m => ({
        role: m.role === "User" ? "user" : "assistant",
        content: m.content.split(SOURCES_SEPARATOR)[0] ?? m.content,
    }));

    const fullResponse = await streamAnswer(res, query, history);
    if (fullResponse === null) return;

    try {
        // Append the new turn to the existing conversation
        await prisma.messages.createMany({
            data: [
                { role: "User", content: query, conversationId },
                { role: "Assistant", content: fullResponse, conversationId },
            ]
        });
        res.end();
    } catch (e) {
        console.error("Failed to save follow-up", e);
        writeError(res, "The answer couldn't be saved. Please try again.");
    }
});

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});
