import AppLayout from "@/components/AppLayout";
import AnswerRenderer from "@/components/AnswerRenderer";
import ErrorNotice from "@/components/ErrorNotice";
import FollowUpChips from "@/components/FollowUpChips";
import SourceCards from "@/components/SourceCards";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/lib/config";
import { errorMessage, isAuthError, parseStreamedText, streamFollowUp } from "@/lib/stream";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

const supabase = createClient();

interface Message {
  role: "User" | "Assistant";
  content: string;
}

interface Turn {
  query: string;
  answer: string;
  sources: Array<{ url: string }>;
  followUps: string[];
}

type Phase = "idle" | "streaming";

// Keyed by id so switching conversations remounts with clean state, and the
// previous conversation's in-flight requests are cancelled on unmount
export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  return <ConversationView key={id} id={id ?? ""} />;
}

function ConversationView({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [streamingTurn, setStreamingTurn] = useState<Turn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
    });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const state = location.state as {
      answer?: string;
      sources?: Array<{ url: string }>;
      followUps?: string[];
      query?: string;
    } | null;

    // Home hands over the answer it just streamed so it shows without a refetch.
    // Clear it straight away: history state survives reloads and back/forward,
    // by which point the conversation may have more turns than this first one.
    if (state?.answer && state?.query) {
      setTurns([{
        query: state.query,
        answer: state.answer,
        sources: state.sources ?? [],
        followUps: state.followUps ?? [],
      }]);
      setLoading(false);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const controller = new AbortController();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) { navigate("/auth"); return; }

      try {
        const res = await axios.get(`${BACKEND_URL}/conversation/${id}`, {
          headers: { Authorization: jwt },
          signal: controller.signal,
        });
        setTurns(toTurns(res.data.conversation?.messages ?? []));
        setLoading(false);
      } catch (e) {
        if (controller.signal.aborted) return;
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        navigate(status === 401 || status === 403 ? "/auth" : "/");
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, streamingTurn]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [followUpQuery]);

  async function handleFollowUp(q?: string) {
    const searchQuery = (q ?? followUpQuery).trim();
    if (!searchQuery || phase === "streaming" || !id) return;

    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) { navigate("/auth"); return; }

    setFollowUpQuery("");
    setError(null);
    setPhase("streaming");
    setStreamingTurn({ query: searchQuery, answer: "", sources: [], followUps: [] });

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = "";
    let failure: string | undefined;
    try {
      await streamFollowUp(jwt, searchQuery, id, chunk => {
        accumulated += chunk;
        const { answer, sources, followUps } = parseStreamedText(accumulated);
        setStreamingTurn({ query: searchQuery, answer, sources, followUps });
      }, controller.signal);
      failure = parseStreamedText(accumulated).error;
    } catch (e) {
      if (controller.signal.aborted) return;
      if (isAuthError(e)) { navigate("/auth"); return; }
      failure = errorMessage(e);
    }

    if (failure) {
      // The turn wasn't saved, so drop it and put the question back to retry
      setError(failure);
      setFollowUpQuery(searchQuery);
    } else {
      const { answer, sources, followUps } = parseStreamedText(accumulated);
      setTurns(prev => [...prev, { query: searchQuery, answer, sources, followUps }]);
    }
    setStreamingTurn(null);
    setPhase("idle");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center" style={{ background: "var(--background)" }}>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full" style={{
                background: "var(--thinking-dot)",
                animation: `blink 1.2s ease ${i * 0.2}s infinite`,
                display: "inline-block",
              }} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const allTurns = [...turns, ...(streamingTurn ? [streamingTurn] : [])];

  return (
    <AppLayout>
      <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
        {/* Scrollable answer area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-6 py-8 pb-4">
            {allTurns.map((turn, idx) => {
              const isStreamingTurn = idx === allTurns.length - 1 && phase === "streaming";
              const isLastTurn = idx === allTurns.length - 1;
              return (
                <div key={idx} className="mb-12 fade-in-up">
                  {/* Question */}
                  <h2 className="mb-6" style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "1.5rem",
                    color: "var(--text-heading)",
                    fontWeight: "normal",
                    letterSpacing: "-0.01em",
                  }}>
                    {turn.query}
                  </h2>

                  {/* Sources */}
                  {turn.sources.length > 0 && <SourceCards sources={turn.sources} />}

                  {/* Streaming thinking dots */}
                  {isStreamingTurn && !turn.answer && (
                    <ThinkingIndicator type="conversation" />
                  )}

                  {/* Answer */}
                  {turn.answer && (
                    <AnswerRenderer text={turn.answer} streaming={isStreamingTurn} />
                  )}

                  {/* Follow-up chips — only on last completed turn */}
                  {isLastTurn && !isStreamingTurn && turn.followUps.length > 0 && (
                    <FollowUpChips questions={turn.followUps} onSelect={handleFollowUp} />
                  )}

                  {/* Divider between turns */}
                  {idx < allTurns.length - 1 && (
                    <div className="mt-10" style={{ borderTop: "1px solid var(--surface-divider)" }} />
                  )}
                </div>
              );
            })}
            {error && <ErrorNotice message={error} />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Follow-up input bar — floats over content with fade */}
        <div className="shrink-0" style={{
          position: "relative",
          paddingBottom: "20px",
        }}>
          {/* Gradient fade that blends into scroll content above */}
          <div style={{
            position: "absolute",
            top: "-48px",
            left: 0,
            right: 0,
            height: "48px",
            background: "linear-gradient(to bottom, transparent, var(--background))",
            pointerEvents: "none",
          }} />
          <div className="px-6" style={{ position: "relative" }}>
          <div className="max-w-2xl mx-auto">
            <div
              className="relative rounded-2xl transition-all"
              style={{
                background: "var(--surface-search)",
                border: "1px solid var(--surface-search-border)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              }}
              onFocusCapture={e => {
                (e.currentTarget as HTMLElement).style.border = "1px solid var(--surface-search-border-focus)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 32px rgba(0,0,0,0.12), 0 0 0 3px var(--ring)";
              }}
              onBlurCapture={e => {
                (e.currentTarget as HTMLElement).style.border = "1px solid var(--surface-search-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)";
              }}
            >
              <textarea
                ref={textareaRef}
                value={followUpQuery}
                onChange={e => setFollowUpQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={phase === "streaming"}
                placeholder="Ask a follow-up…"
                rows={1}
                className="w-full resize-none bg-transparent px-5 pt-3.5 pb-12 outline-none"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                  caretColor: "var(--foreground)",
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "'DM Sans', sans-serif" }}>
                  {followUpQuery.length > 0 ? "↵ to send" : ""}
                </span>
                <button
                  onClick={() => handleFollowUp()}
                  aria-label="Send follow-up"
                  disabled={phase === "streaming" || !followUpQuery.trim()}
                  className="flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: followUpQuery.trim() && phase === "idle" ? "var(--submit-btn-active-bg)" : "var(--submit-btn-idle-bg)",
                    border: "none",
                    color: followUpQuery.trim() && phase === "idle" ? "var(--submit-btn-active-color)" : "var(--submit-btn-idle-color)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Pair each User message with the Assistant reply that follows it
function toTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const user = messages[i];
    const assistant = messages[i + 1];
    if (user?.role === "User" && assistant?.role === "Assistant") {
      const { answer, sources, followUps } = parseStreamedText(assistant.content);
      turns.push({ query: user.content, answer, sources, followUps });
      i++;
    }
  }
  return turns;
}
