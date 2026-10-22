interface Source {
  url: string;
}

export default function SourceCards({ sources }: { sources: Source[] }) {
  // Sources are parsed out of the model's stream, so only link to real web pages
  const links = sources.filter(s => typeof s.url === "string" && /^https?:\/\//i.test(s.url));
  if (!links.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: "0.68rem",
        color: "var(--text-label)",
        fontFamily: "'DM Sans', sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        marginBottom: 10,
        fontWeight: 400,
      }}>
        Sources
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {links.slice(0, 6).map((s, i) => {
          let hostname = "";
          try { hostname = new URL(s.url).hostname.replace("www.", ""); } catch {}
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                borderRadius: 8,
                background: "var(--surface-chip)",
                border: "1px solid var(--surface-chip-border)",
                color: "var(--text-muted)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 300,
                textDecoration: "none",
                maxWidth: 200,
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--surface-chip-border-hover)";
                e.currentTarget.style.color = "var(--text-heading)";
                e.currentTarget.style.background = "var(--surface-chip-hover)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--surface-chip-border)";
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "var(--surface-chip)";
              }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                width={13}
                height={13}
                alt=""
                style={{ borderRadius: 3, flexShrink: 0, opacity: 0.9 }}
                onError={e => (e.currentTarget.style.display = "none")}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hostname || `Source ${i + 1}`}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
