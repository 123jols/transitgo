import { createClient } from "@supabase/supabase-js";

// The anon key is meant to be public — Supabase's security model relies on
// Row Level Security policies (see supabase/schema.sql), not on this key
// being secret. This is different from the Grab OAuth credentials
// (src/api? no — api/_lib/grabOAuth.js), which must never reach the client.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const REMEMBER_ME_KEY = "transitgo-remember-me";

// Defaults to "remembered" (localStorage) so existing sessions keep behaving
// exactly as before this flag existed — unchecking "Remember me" on the
// login form is what opts a session into the shorter-lived sessionStorage
// path below, not the other way around.
export const getRememberMe = () => localStorage.getItem(REMEMBER_ME_KEY) !== "0";
export const setRememberMe = (remember) =>
  localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");

// Routes Supabase's auth session to localStorage (survives closing the
// browser) or sessionStorage (cleared when the tab/browser closes) based on
// the "Remember me" choice at sign-in time. Reads check both, since a
// session already on disk from before this flag existed — or from a prior
// "remembered" sign-in — should still be picked up.
const authStorage = {
  getItem: (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    if (getRememberMe()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

// null when not configured — every caller (AuthContext, the cloud-backed
// data hooks) checks isSupabaseConfigured / falls back to local-only
// behavior instead of crashing when a Supabase project hasn't been set up
// yet.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storage: authStorage } })
  : null;
