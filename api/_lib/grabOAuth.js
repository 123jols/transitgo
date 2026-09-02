// Server-side only — this file must never be imported from client code
// (anything under src/). It handles Grab's two-legged (client_credentials)
// OAuth 2.0 flow and caches the resulting access token in memory.
//
// That cache is best-effort: it only lives for as long as this serverless
// instance stays warm. A cold start, or a different concurrent instance,
// won't share it — there's no Redis/shared store in this project. If Grab's
// call volume ever justifies it, swap this module-level cache for a real
// shared one (Vercel KV, Upstash, etc.) without touching any caller.

const DEFAULT_BASE_URLS = {
  production: "https://partner-api.grab.com",
  staging: "https://partner-api.stg-myteksi.com",
};

export const GRAB_API_BASE_URL =
  process.env.GRAB_API_BASE_URL ||
  DEFAULT_BASE_URLS[process.env.GRAB_ENVIRONMENT] ||
  DEFAULT_BASE_URLS.staging;

const REQUIRED_SCOPE = "ride.estimate";
const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh slightly before real expiry
export const FETCH_TIMEOUT_MS = 8000;

let cachedToken = null; // { accessToken, expiresAt }

export function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export class GrabConfigError extends Error {}
export class GrabAuthError extends Error {}

// Grab's exact OAuth token endpoint, request encoding (JSON vs
// form-urlencoded), and parameter names are only published in Grab's
// partner developer portal, gated behind partner approval — GRAB_OAUTH_TOKEN_URL
// must be filled in from that documentation before this can authenticate for
// real. What's implemented below is the standard RFC 6749 "client
// credentials" grant, i.e. the two-legged flow this integration calls for —
// the correct shape for most OAuth providers — but verify it against Grab's
// actual docs once you have partner access; nothing here is a guess at
// Grab-specific undocumented behavior.
export async function getGrabAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > now) {
    return cachedToken.accessToken;
  }

  const { GRAB_CLIENT_ID, GRAB_CLIENT_SECRET, GRAB_OAUTH_TOKEN_URL } = process.env;
  if (!GRAB_CLIENT_ID || !GRAB_CLIENT_SECRET || !GRAB_OAUTH_TOKEN_URL) {
    throw new GrabConfigError(
      "Grab OAuth is not configured. Set GRAB_CLIENT_ID, GRAB_CLIENT_SECRET, and " +
      "GRAB_OAUTH_TOKEN_URL (from Grab's partner portal) as server-side environment variables."
    );
  }

  let response;
  try {
    response = await fetchWithTimeout(GRAB_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: GRAB_CLIENT_ID,
        client_secret: GRAB_CLIENT_SECRET,
        scope: REQUIRED_SCOPE,
      }).toString(),
    });
  } catch (err) {
    throw new GrabAuthError(`Grab OAuth request failed: ${err.message}`);
  }

  if (!response.ok) {
    throw new GrabAuthError(`Grab OAuth token request returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new GrabAuthError("Grab OAuth response did not include an access_token");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

// Called by the fare service after a 401 from Grab — forces a fresh token
// on the next attempt instead of retrying with one we know is bad.
export function invalidateGrabToken() {
  cachedToken = null;
}
