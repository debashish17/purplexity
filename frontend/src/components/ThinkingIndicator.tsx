import { useState, useEffect } from "react";

const PHRASES = [
  "Thinking deeply...",
  "Analyzing search results...",
  "Synthesizing information...",
  "Formulating answer...",
  "Connecting the dots..."
];

export default function ThinkingIndicator({ type: _type }: { type?: "home" | "conversation" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 mb-4" style={{ color: "var(--thinking-text)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: 300 }}>
      <span className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
            background: "var(--thinking-dot)",
            animation: `blink 1.2s ease ${i * 0.2}s infinite`,
            display: "inline-block",
          }} />
        ))}
      </span>
      <span style={{ animation: "fadeIn 0.5s ease" }} key={index}>
        {PHRASES[index]}
      </span>
    </div>
  );
}
