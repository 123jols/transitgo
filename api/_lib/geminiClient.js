// Server-side only — must never be imported from client code (anything
// under src/). Holds GEMINI_API_KEY so it never reaches the browser bundle,
// unlike the old VITE_GEMINI_API_KEY this replaces (that key was shipped to
// every client — see AiChat.jsx's previous direct-fetch implementation).

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const FETCH_TIMEOUT_MS = 15000;

export class GeminiConfigError extends Error {}
export class GeminiUnavailableError extends Error {}

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Calls Gemini's generateContent endpoint with a system instruction + a
// conversation (or single-turn) history, returning just the reply text.
// Callers decide what shape they need from that text (free-form chat vs.
// parsed structured JSON) — this function only owns the transport and key.
export async function callGemini({ systemInstruction, contents }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      "Gemini is not configured. Set GEMINI_API_KEY as a server-side environment variable."
    );
  }

  let response;
  try {
    response = await fetchWithTimeout(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    });
  } catch (err) {
    throw new GeminiUnavailableError(`Gemini request failed: ${err.message}`);
  }

  if (!response.ok) {
    throw new GeminiUnavailableError(`Gemini returned ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new GeminiUnavailableError("Gemini response did not include reply text");
  }
  return text;
}
