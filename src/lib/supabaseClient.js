import { createClient } from "@supabase/supabase-js";

// The anon key is meant to be public — Supabase's security model relies on
// Row Level Security policies (see supabase/schema.sql), not on this key
// being secret. This is different from the Grab OAuth credentials
// (src/api? no — api/_lib/grabOAuth.js), which must never reach the client.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// null when not configured — every caller (AuthContext, the cloud-backed
// data hooks) checks isSupabaseConfigured / falls back to local-only
// behavior instead of crashing when a Supabase project hasn't been set up
// yet.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
