import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

const supabase = createClient();

interface Conversation {
  id: string;
  title: string | null;
  slug: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check saved theme
    const savedTheme = localStorage.getItem("app-theme") as "dark" | "light" | null;
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.add("light-mode");
    }
  }, []);

  function toggleTheme() {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.add("light-mode");
      localStorage.setItem("app-theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light-mode");
      localStorage.setItem("app-theme", "dark");
    }
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUser({ email: data.user.email, name: data.user.user_metadata?.full_name });

      const { data: session } = await supabase.auth.getSession();
      const jwt = session.session?.access_token;
      if (!jwt) return;

      try {
        const res = await axios.get(`${BACKEND_URL}/conversations`, {
          headers: { Authorization: jwt },
        });
        setConversations(res.data.conversations ?? []);
      } catch {
        // Ignored
      }
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  return (
    <aside
      className="flex flex-col h-full transition-all duration-200"
      style={{
        width: collapsed ? "0px" : "260px",
        minWidth: collapsed ? "0px" : "260px",
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "260px", display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Top: logo + toggle */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid var(--surface-divider)" }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <div
              className="w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-105"
            >
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2L2 9.5L16 17L30 9.5L16 2Z" fill="var(--text-heading)" fillOpacity="0.9" />
                <path d="M2 22.5L16 30L30 22.5" stroke="var(--text-heading)" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 16L16 23.5L30 16" stroke="var(--text-heading)" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ 
              fontFamily: "'Cormorant Garamond', Georgia, serif", 
              color: "var(--text-heading)", 
              fontSize: "1.15rem", 
              fontWeight: 500, 
              letterSpacing: "-0.01em",
              display: "block"
            }}>
              Purplexity
            </span>
          </button>
          <button
            onClick={onToggle}
            aria-label="Toggle Sidebar"
            className="p-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ background: "none", border: "none", color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-sidebar-btn-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
          </button>
        </div>

        {/* New search */}
        <div className="px-3 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
            style={{
              background: "var(--surface-sidebar-btn)",
              border: "1px solid var(--surface-sidebar-btn-border)",
              color: "var(--foreground)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8125rem",
              fontWeight: 300,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-sidebar-btn-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-sidebar-btn)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            New Search
          </button>
        </div>

        {/* Conversation history */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.length > 0 && (
            <div>
              <p className="px-2 py-1.5" style={{ fontSize: "0.68rem", color: "var(--text-label)", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 400 }}>
                Recent
              </p>
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/conversation/${c.id}`)}
                  className="flex w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors mb-0.5"
                  style={{
                    background: activeId === c.id ? "var(--surface-sidebar-btn)" : "none",
                    border: "none",
                    color: activeId === c.id ? "var(--text-heading)" : "var(--text-muted)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.8125rem",
                    fontWeight: 300,
                    lineHeight: "1.4",
                  }}
                  onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "var(--surface-sidebar-btn)"; }}
                  onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "none"; }}
                >
                  <span className="truncate block">{c.title || c.slug}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: user */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--surface-divider)" }}>
          {/* Theme toggle row */}
          <div className="px-3" style={{ marginTop: "12px" }}>
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.8125rem",
                fontWeight: 300,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-sidebar-btn-hover)"; e.currentTarget.style.color = "var(--text-heading)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>

          {user && (
            <div className="px-3 py-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--surface-sidebar-btn)", border: "1px solid var(--surface-sidebar-btn-border)", fontSize: "0.68rem", color: "var(--foreground)", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
                >
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "0.78rem", color: "var(--foreground)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
                    {user.name || user.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1 rounded cursor-pointer transition-colors shrink-0"
                  style={{ background: "none", border: "none", color: "var(--text-dim)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-heading)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
