import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing BUN_PUBLIC_SUPABASE_URL or BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy frontend/.env.example to frontend/.env and fill them in.")
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
}
