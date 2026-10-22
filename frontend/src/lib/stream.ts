import { BACKEND_URL } from "./config";

export interface StreamResult {
  answer: string;
  sources: Array<{ url: string }>;
  followUps: string[];
  conversationId?: string;
  // Set when the backend failed after the stream had already started
  error?: string;
}

// A non-2xx response from the backend, e.g. 401 for an expired session
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isAuthError(e: unknown) {
  return e instanceof HttpError && (e.status === 401 || e.status === 403);
}

export function errorMessage(e: unknown) {
  return e instanceof HttpError ? e.message : "Couldn't reach the server. Check your connection and try again.";
}

export function parseStreamedText(raw: string): StreamResult {
  const error = raw.match(/<ERROR>([\s\S]*?)<\/ERROR>/)?.[1]?.trim();
  raw = raw.replace(/\n?<ERROR>[\s\S]*?(<\/ERROR>|$)\n?/g, "");

  // Split on the sources separator — everything before is the answer
  const sepIdx = raw.indexOf("\n---------SOURCES---------\n");
  const answerRaw = sepIdx !== -1 ? raw.slice(0, sepIdx) : raw;
  const tail = sepIdx !== -1 ? raw.slice(sepIdx) : "";

  // Parse sources from tail
  let sources: Array<{ url: string }> = [];
  const sourcesMatch = tail.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/);
  const sourcesContent = sourcesMatch?.[1];
  if (sourcesContent) {
    try { sources = JSON.parse(sourcesContent.trim()); } catch {}
  }

  // Parse conversationId from tail
  const convIdMatch = tail.match(/<CONVERSATION_ID>([^\n<]+)<\/CONVERSATION_ID>/);
  const conversationId = convIdMatch?.[1]?.trim();

  // Parse follow-up questions from answer — strip them from display
  const followUps: string[] = [];
  const followUpsMatch = answerRaw.match(/<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/);
  const followUpsContent = followUpsMatch?.[1];
  if (followUpsContent) {
    for (const m of followUpsContent.matchAll(/<question>([\s\S]*?)<\/question>/g)) {
      const q = m[1]?.trim();
      if (q) followUps.push(q);
    }
  }

  // Clean up the answer:
  // 1. Extract <ANSWER> block if present (fully arrived)
  // 2. Otherwise strip any XML tags so raw text shows during streaming
  let answer: string;
  const answerBlockMatch = answerRaw.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/);
  const answerBlockContent = answerBlockMatch?.[1];
  
  if (answerBlockContent !== undefined && answerBlockContent.trim() !== "") {
    // If the LLM successfully placed the response inside <ANSWER> tags, use that directly.
    answer = answerBlockContent.trim();
  } else {
    // Fallback: If tags are missing or improperly formed, just take the raw text,
    // strip out the follow ups block and any remaining XML-like tags we don't want to show
    answer = answerRaw
      .replace(/<FOLLOW_UPS>[\s\S]*?(<\/FOLLOW_UPS>|$)/g, "")
      .replace(/<\/?(?:ANSWER|FOLLOW_UPS|question)[^>]*>/g, "")
      .trim();
  }

  return { answer, sources, followUps, conversationId, error };
}

export async function streamAsk(
  jwt: string,
  query: string,
  onChunk: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/purplexity_ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: jwt },
    body: JSON.stringify({ query }),
    signal,
  });
  await readStream(res, onChunk);
}

export async function streamFollowUp(
  jwt: string,
  query: string,
  conversationId: string,
  onChunk: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/purplexity_ask/follow_up`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: jwt },
    body: JSON.stringify({ query, conversationId }),
    signal,
  });
  await readStream(res, onChunk);
}

async function readStream(res: Response, onChunk: (raw: string) => void) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).message ?? message;
    } catch {}
    throw new HttpError(res.status, message);
  }
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }
}
