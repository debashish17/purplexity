interface Props {
  text: string;
  streaming?: boolean;
}

export default function AnswerRenderer({ text, streaming }: Props) {
  const html = renderMarkdown(text);
  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "1.0625rem",
        lineHeight: "1.85",
        color: "var(--text-body)",
        fontWeight: 300,
      }}
      dangerouslySetInnerHTML={{
        __html: html + (streaming
          ? '<span style="display:inline-block;animation:blink 0.8s ease infinite;color:var(--text-dimmer);margin-left:2px">▍</span>'
          : ""),
      }}
    />
  );
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only link to targets that can't run script. `url` is already escaped by esc().
function safeHref(url: string): string | null {
  const href = url.trim();
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : null;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("### ")) {
      out.push(`<h3 style="font-family:'Cormorant Garamond',Georgia,serif;color:var(--text-body-strong);font-size:1.15rem;font-weight:400;letter-spacing:-0.01em;margin:1.6em 0 0.5em">${inline(line.slice(4))}</h3>`);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2 style="font-family:'Cormorant Garamond',Georgia,serif;color:var(--text-body-strong);font-size:1.35rem;font-weight:400;letter-spacing:-0.01em;margin:1.6em 0 0.5em">${inline(line.slice(3))}</h2>`);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:var(--text-heading);font-size:1.6rem;font-weight:300;letter-spacing:-0.02em;margin:1.6em 0 0.5em">${inline(line.slice(2))}</h1>`);
      i++; continue;
    }

    if (line.startsWith("> ")) {
      out.push(`<blockquote style="border-left:1px solid var(--surface-blockquote);padding-left:1.2em;color:var(--text-muted);margin:0.75em 0;font-style:italic">${inline(line.slice(2))}</blockquote>`);
      i++; continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        codeLines.push(esc(lines[i] ?? "")); i++;
      }
      out.push(`<pre style="background:var(--surface-code);border:1px solid var(--surface-code-border);border-radius:10px;padding:1rem 1.2rem;overflow-x:auto;margin:1.2em 0"><code style="font-family:'Fira Code',monospace;font-size:0.82em;color:var(--text-code)">${codeLines.join("\n")}</code></pre>`);
      i++; continue;
    }

    if (line.match(/^[\*\-] /)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").match(/^[\*\-] /)) {
        items.push(`<li style="padding-left:1.2em;position:relative;margin-bottom:0.4em;color:var(--text-body)"><span style="position:absolute;left:0;color:var(--text-dimmer);font-size:0.8em;top:0.25em">—</span>${inline((lines[i] ?? "").slice(2))}</li>`);
        i++;
      }
      out.push(`<ul style="list-style:none;padding:0;margin:0.75em 0">${items.join("")}</ul>`);
      continue;
    }

    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      let n = 1;
      while (i < lines.length && (lines[i] ?? "").match(/^\d+\. /)) {
        items.push(`<li style="padding-left:1.6em;position:relative;margin-bottom:0.4em;color:var(--text-body)"><span style="position:absolute;left:0;color:var(--text-dimmer);font-family:'DM Sans',sans-serif;font-size:0.8em;top:0.1em;font-weight:400">${n}.</span>${inline((lines[i] ?? "").replace(/^\d+\. /, ""))}</li>`);
        n++; i++;
      }
      out.push(`<ol style="list-style:none;padding:0;margin:0.75em 0">${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    out.push(`<p style="margin:0.6em 0;color:var(--text-body)">${inline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

// Model output is untrusted (search results can prompt-inject it), so escape it
// first, then stash generated code/link tags behind placeholders so the emphasis
// passes can't rewrite their attributes.
function inline(text: string): string {
  const tags: string[] = [];
  const stash = (html: string) => `\u0000${tags.push(html) - 1}\u0000`;

  return esc(text.replace(/\u0000/g, ""))
    .replace(/`([^`]+)`/g, (_, code) => stash(`<code style="font-family:'Fira Code',monospace;font-size:0.82em;background:var(--surface-code);border:1px solid var(--surface-code-border);border-radius:4px;padding:0.1em 0.4em;color:var(--text-code)">${code}</code>`))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const href = safeHref(url);
      if (!href) return label;
      return stash(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:var(--text-link);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--surface-chip-border)">`) + label + stash("</a>");
    })
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="color:var(--text-body-strong);font-weight:500"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-body-strong);font-weight:500">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:var(--text-body)">$1</em>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => tags[Number(i)] ?? "");
}
