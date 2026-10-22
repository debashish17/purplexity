import ParticleCanvas from "@/components/ParticleCanvas";
import { createClient } from "@/lib/client";
import { useEffect } from "react";
import { useNavigate } from "react-router";

const supabase = createClient();

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/");
    });
  }, []);

  async function login(provider: "github" | "google") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .auth-card {
          animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1.2) both;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 48px;
        }
        .auth-eyebrow { animation: fadeUp 0.6s 0.08s cubic-bezier(.22,.68,0,1.2) both; }
        .auth-title  { animation: fadeUp 0.7s 0.14s cubic-bezier(.22,.68,0,1.2) both; }
        .auth-sub    { animation: fadeUp 0.6s 0.22s cubic-bezier(.22,.68,0,1.2) both; }
        .auth-divider{ animation: fadeIn 0.5s 0.32s both; }
        .auth-btn-g  { animation: fadeUp 0.5s 0.38s cubic-bezier(.22,.68,0,1.2) both; }
        .auth-btn-gh { animation: fadeUp 0.5s 0.46s cubic-bezier(.22,.68,0,1.2) both; }
        .auth-footer { animation: fadeIn 0.5s 0.6s both; }

        .oauth-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .oauth-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s ease;
        }
        .oauth-btn:hover::after { background: rgba(255,255,255,0.04); }
        .oauth-btn:active { transform: scale(0.985); }

        .btn-google {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d4d2cf;
        }
        .btn-google:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
        }

        .btn-github {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d4d2cf;
        }
        .btn-github:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
        }

        .wordmark-shimmer {
          background: linear-gradient(
            105deg,
            #c8c4be 0%,
            #c8c4be 40%,
            #f0ece6 50%,
            #c8c4be 60%,
            #c8c4be 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear 1.2s 1 both;
        }

        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.022;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }

        .vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%);
        }

        .glow-blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Canvas particles */}
      <ParticleCanvas dotOpacity={0.06} dotPulse={0.03} lineOpacity={0.025} />

      {/* Ambient glow blobs */}
      <div className="glow-blob" style={{ width: 500, height: 400, top: "-10%", left: "-5%", background: "rgba(80,60,140,0.07)" }} />
      <div className="glow-blob" style={{ width: 400, height: 400, bottom: "0%", right: "-5%", background: "rgba(30,80,120,0.06)" }} />

      {/* Noise + vignette */}
      <div className="noise-overlay" />
      <div className="vignette" />

      {/* Main card */}
      <div className="auth-card" style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480, margin: "0 24px" }}>

        {/* Eyebrow */}
        <div className="auth-eyebrow" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L2 9.5L16 17L30 9.5L16 2Z" fill="#a39e99" />
              <path d="M2 22.5L16 30L30 22.5" stroke="#a39e99" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 16L16 23.5L30 16" stroke="#a39e99" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "0.8rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#a39e99",
            fontWeight: 600,
            display: "block"
          }}>
            Purplexity
          </span>
        </div>

        {/* Headline */}
        <div className="auth-title" style={{ marginBottom: 10 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(3rem, 7vw, 4rem)",
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: 0,
            whiteSpace: "normal"
          }}>
            <span className="wordmark-shimmer">Search</span>{" "}
            <em style={{ color: "#d4d2cf", fontStyle: "italic", fontWeight: 300 }}>beyond the surface.</em>
          </h1>
        </div>

        {/* Subtext */}
        <p className="auth-sub" style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "1rem",
          color: "#a39e99",
          fontWeight: 400,
          lineHeight: 1.6,
          marginBottom: 36,
          letterSpacing: "0.01em",
        }}>
          AI-powered answers with real sources.
        </p>

        {/* Thin rule */}
        <div className="auth-divider" style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.07) 60%, transparent)",
          marginBottom: 28,
        }} />

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <button className="oauth-btn btn-google auth-btn-g" onClick={() => login("google")}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="oauth-btn btn-github auth-btn-gh" onClick={() => login("github")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#c8c4be" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Footer */}
        <p className="auth-footer" style={{
          marginTop: 32,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "0.75rem",
          color: "#837e7e",
          letterSpacing: "0.01em",
          lineHeight: 1.6,
          textAlign: "left",
        }}>
          By continuing, you agree to our terms of service<br />and privacy policy.
        </p>
      </div>
    </div>
  );
}
