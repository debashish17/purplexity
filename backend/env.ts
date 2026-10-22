// Imported first by index.ts so a missing variable fails fast with a clear
// message instead of a confusing error from the first request.
const REQUIRED = [
    "DATABASE_URL",
    "TAVILY_API_KEY",
    "AI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
] as const;

const missing = REQUIRED.filter(key => !process.env[key]);

if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}. Copy backend/.env.example to backend/.env and fill them in.`);
    process.exit(1);
}
