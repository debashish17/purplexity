import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Collapsed toggle button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open Sidebar"
          className="fixed top-4 left-4 z-50 p-2 rounded-lg cursor-pointer transition-colors"
          style={{
            background: "var(--surface-sidebar-btn)",
            border: "1px solid var(--surface-sidebar-btn-border)",
            color: "var(--text-muted)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-sidebar-btn-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-sidebar-btn)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>
      )}

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
