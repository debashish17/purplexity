// BUN_PUBLIC_* variables are inlined at build time (bunfig.toml for dev, build.ts
// for production). One that isn't set is left as a `process.env` lookup, which
// throws in the browser, so read them through this guard.
function publicEnv(read: () => string | undefined): string | undefined {
  try {
    return read() || undefined;
  } catch {
    return undefined;
  }
}

export const BACKEND_URL = publicEnv(() => process.env.BUN_PUBLIC_BACKEND_URL) ?? "http://localhost:3001";
export const SUPABASE_URL = publicEnv(() => process.env.BUN_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = publicEnv(() => process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
