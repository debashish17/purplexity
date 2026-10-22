import AppLayout from "@/components/AppLayout";
import AnswerRenderer from "@/components/AnswerRenderer";
import ErrorNotice from "@/components/ErrorNotice";
import FollowUpChips from "@/components/FollowUpChips";
import ParticleCanvas from "@/components/ParticleCanvas";
import SourceCards from "@/components/SourceCards";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { createClient } from "@/lib/client";
import { errorMessage, isAuthError, parseStreamedText, streamAsk } from "@/lib/stream";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

const supabase = createClient();

type Phase = "idle" | "searching" | "streaming" | "done";

// Shared font import + global keyframes injected once
const GLOBAL_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 0.3; transform: scale(0.85); }
    50%       { opacity: 1;   transform: scale(1); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  * { box-sizing: border-box; }

  .home-idle-enter  { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) both; }
  .home-title       { animation: fadeUp 0.65s 0.05s cubic-bezier(.22,.68,0,1.2) both; }
  .home-sub         { animation: fadeUp 0.55s 0.14s cubic-bezier(.22,.68,0,1.2) both; }
  .home-box         { animation: fadeUp 0.55s 0.22s cubic-bezier(.22,.68,0,1.2) both; }
  .result-enter     { animation: fadeIn 0.4s ease both; }

  .search-box-wrap {
    position: relative;
    border-radius: 14px;
    background: var(--surface-search);
    border: 1px solid var(--surface-search-border);
    transition: all 0.25s ease;
  }
  .search-box-wrap:focus-within {
    border-color: var(--surface-search-border-focus);
    box-shadow: 0 0 0 3px var(--ring);
    background: var(--surface-search-hover);
  }
  .search-box-wrap.group:hover {
    border-color: var(--surface-search-border);
    background: var(--surface-search-hover);
  }
  .search-textarea {
    width: 100%;
    resize: none;
    background: transparent;
    border: none;
    outline: none;
    padding: 18px 20px 56px;
    color: var(--foreground);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 300;
    line-height: 1.6;
    caret-color: var(--foreground);
  }
  .search-textarea::placeholder { color: var(--text-placeholder); }

  .submit-btn {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.1s;
  }
  .submit-btn:active { transform: scale(0.93); }

  .noise-overlay {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    opacity: 0.022;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 128px 128px;
  }
  .vignette {
    position: fixed; inset: 0; pointer-events: none; z-index: 1;
    background: radial-gradient(ellipse at center, transparent 50%, var(--vignette-color) 100%);
  }
  .glow-blob {
    position: fixed; border-radius: 50%;
    filter: blur(120px); pointer-events: none; z-index: 0;
  }
`;

export default function Home() {
  const [query, setQuery] = useState("");
  // The query being answered; `query` is the live input and changes as the user types
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
    });
  }, []);

  // Cancel an in-flight answer when leaving the page
  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [query]);

  const { answer, sources, followUps, conversationId, error: streamError } = parseStreamedText(rawText);
  const shownError = error ?? streamError;

  async function handleSearch(q?: string) {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery || phase === "streaming" || phase === "searching") return;
    if (q) setQuery(q);
    setSubmittedQuery(searchQuery);
    setPhase("searching");
    setRawText("");
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) { navigate("/auth"); return; }
    setPhase("streaming");

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = "";
    try {
      await streamAsk(jwt, searchQuery, chunk => { accumulated += chunk; setRawText(accumulated); }, controller.signal);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (isAuthError(e)) { navigate("/auth"); return; }
      setError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) setPhase("done");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); }
  }

  useEffect(() => {
    if (phase !== "done" || !conversationId) return;
    const timer = setTimeout(() => navigate(`/conversation/${conversationId}`, { state: { answer, sources, followUps, query: submittedQuery } }), 600);
    return () => clearTimeout(timer);
  }, [phase, conversationId]);

  const isIdle = phase === "idle";

  return (
    <AppLayout>
      <style>{GLOBAL_STYLES}</style>

      {/* Background layers */}
      <ParticleCanvas
        dotOpacity={0.25}
        dotPulse={0.1}
        lineOpacity={0.1}
        followTheme
        style={{
          opacity: (isIdle && query.length === 0) ? 1 : 0.3,
          transition: "opacity 1.5s ease-in-out"
        }}
      />
      <div className="glow-blob" style={{ width: 500, height: 400, top: "-10%", left: "10%", background: "var(--glow-blob-a)" }} />
      <div className="glow-blob" style={{ width: 400, height: 400, bottom: "0", right: "5%", background: "var(--glow-blob-b)" }} />
      <div className="noise-overlay" />
      <div className="vignette" />

      <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column" }}>
        {isIdle ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            <div className="home-idle-enter" style={{ width: "100%", maxWidth: 580 }}>
              {/* Eyebrow */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <div style={{ width: 1, height: 20, background: "var(--surface-search-border)" }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 400 }}>
                  Search the web
                </span>
              </div>

              {/* Headline */}
              <h1 className="home-title" style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2.2rem, 5vw, 3rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--text-heading)",
                margin: "0 0 8px",
              }}>
                What do you want<br />
                <em style={{ color: "var(--text-heading-em)", fontStyle: "italic" }}>to know?</em>
              </h1>

              <p className="home-sub" style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 300,
                marginBottom: 32,
                letterSpacing: "0.01em",
              }}>
                AI-powered answers with real sources.
              </p>

              {/* Search box */}
              <div className="home-box search-box-wrap group">
                <textarea
                  ref={textareaRef}
                  className="search-textarea"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything…"
                  rows={1}
                />
                <div style={{ position: "absolute", bottom: 12, left: 20, right: 52, display: "flex", alignItems: "center" }}>
                  {query.length > 0 && (
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>↵ to search</span>
                  )}
                </div>
                <button
                  className="submit-btn"
                  onClick={() => handleSearch()}
                  aria-label="Search"
                  disabled={!query.trim()}
                  style={{
                    background: query.trim() ? "var(--submit-btn-active-bg)" : "var(--submit-btn-idle-bg)",
                    color: query.trim() ? "var(--submit-btn-active-color)" : "var(--submit-btn-idle-color)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px 80px" }}>
            <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
              {/* Query heading */}
              <h2 className="result-enter" style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1.6rem, 3vw, 2rem)",
                fontWeight: 300,
                color: "var(--text-heading)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                marginBottom: 28,
              }}>
                {submittedQuery}
              </h2>

              {/* Searching state */}
              {phase === "searching" && (
                <div className="result-enter" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", fontWeight: 300 }}>
                  <SearchingSpinner />
                  Searching the web…
                </div>
              )}
              {phase === "streaming" && !answer && (
                <div className="result-enter">
                  <ThinkingIndicator type="home" />
                </div>
              )}
              {sources.length > 0 && <SourceCards sources={sources} />}

              {answer && (
                <div className="result-enter">
                  <AnswerRenderer text={answer} streaming={phase === "streaming"} />
                </div>
              )}

              {shownError && phase === "done" && <ErrorNotice message={shownError} />}

              {followUps.length > 0 && phase === "done" && (
                <FollowUpChips questions={followUps} onSelect={handleSearch} />
              )}

              {/* Sticky bottom search bar when not idle */}
              <div style={{ marginTop: 48 }}>
                <div className="search-box-wrap group">
                  <textarea
                    className="search-textarea"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up…"
                    rows={1}
                    disabled={phase === "searching" || phase === "streaming"}
                  />
                  <button
                    className="submit-btn"
                    onClick={() => handleSearch()}
                    aria-label="Ask a follow-up"
                    disabled={!query.trim() || phase === "searching" || phase === "streaming"}
                    style={{
                      background: query.trim() ? "var(--submit-btn-active-bg)" : "var(--submit-btn-idle-bg)",
                      color: query.trim() ? "var(--submit-btn-active-color)" : "var(--submit-btn-idle-color)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SearchingSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ animation: "spin-slow 1.2s linear infinite", color: "var(--text-muted)" }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
