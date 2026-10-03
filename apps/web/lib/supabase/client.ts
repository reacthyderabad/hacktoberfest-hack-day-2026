/**
 * Supabase browser client — safe to import from client components.
 * Returns null when env vars are not configured (optional integration).
 */
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export type { SupabaseClient }

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (_client) return _client
  _client = createBrowserClient(url, key)
  return _client
}

export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
