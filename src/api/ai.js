// Talks only to TransitGo's own backend (/api/ai/*) — never to Gemini
// directly from the browser. The API key lives server-side in
// api/_lib/geminiClient.js and never reaches this file or the browser.

// Structured intent extraction for AI-assisted destination search (Home's
// "Where to?" field). Never throws — a failure just means "AI couldn't help
// this time," so callers can fall back to the deterministic search they
// already had before trying this.
export async function fetchAiIntent(message, knownOrigin) {
  try {
    const res = await fetch("/api/ai/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, knownOrigin: knownOrigin || null }),
    });
    if (!res.ok) return { origin: null, destination: null, intent: "unclear", available: res.status !== 503 };
    const data = await res.json();
    return {
      origin: data.origin || null,
      destination: data.destination || null,
      intent: data.intent || "unclear",
      available: true,
    };
  } catch {
    return { origin: null, destination: null, intent: "unclear", available: false };
  }
}

// General-purpose chat used by the AiChat widget. `history` is the prior
// messages in Gemini's { role, parts: [{ text }] } shape.
export async function fetchAiChatReply(message, history) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    throw new Error(`AI chat request failed (${res.status})`);
  }
  const data = await res.json();
  return data.reply;
}
