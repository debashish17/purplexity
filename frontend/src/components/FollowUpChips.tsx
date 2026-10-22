interface Props {
  questions: string[];
  onSelect: (q: string) => void;
}

export default function FollowUpChips({ questions, onSelect }: Props) {
  if (!questions.length) return null;

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--surface-divider), transparent)" }} />
        <span style={{
          fontSize: "0.68rem",
          color: "var(--text-label)",
          fontFamily: "'DM Sans', sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 400,
          flexShrink: 0,
        }}>
          Follow-ups
        </span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--surface-divider))" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              textAlign: "left",
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--surface-chip)",
              border: "1px solid var(--surface-chip-border)",
              color: "var(--text-muted)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.875rem",
              fontWeight: 300,
              lineHeight: "1.5",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--surface-chip-hover)";
              e.currentTarget.style.color = "var(--text-heading)";
              e.currentTarget.style.borderColor = "var(--surface-chip-border-hover)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--surface-chip)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--surface-chip-border)";
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ flexShrink: 0, marginTop: 3, color: "var(--text-label)" }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
