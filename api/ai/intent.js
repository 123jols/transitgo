// POST /api/ai/intent — the only AI-route-planning endpoint the frontend
// talks to. Runs server-side on Vercel; holds the Gemini key, which never
// reaches the client. Returns ONLY structured JSON extracted from the
// rider's free-text message — it never sees TransitGo's actual stop/route/
// fare data and cannot invent any of it. The frontend is responsible for
// matching the returned `destination`/`origin` strings against the real,
// verified database (see src/api/transit.js's resolveDestinationCandidates)
// and for calling the real routing engine — this endpoint only interprets
// what the rider typed.
import { callGemini, GeminiConfigError, GeminiUnavailableError } from "../_lib/geminiClient.js";

const SYSTEM_INSTRUCTION = `You extract structured intent from a rider's message to a Philippine public-transit app (TransitGo, Metro Cebu).

Reply with ONLY a single JSON object, no other text, no markdown fences:
{"origin": string|null, "destination": string|null, "intent": "route_planning"|"chat"|"unclear"}

Rules:
- "intent" is "route_planning" whenever the rider is asking how to get somewhere or naming a place they want to go, even phrased casually ("take me to X", "how do I get to X", "from X to Y", "X to Y").
- "destination" is the place name as the rider wrote it (don't correct spelling, don't invent a fuller/different name, don't add context they didn't give — just extract their words for that place).
- "origin" is only set if the rider explicitly named a starting point in the message itself (e.g. "from Yati to Ayala" -> origin "Yati"). If they didn't name one, origin is null — do NOT guess or default it to anything.
- If the message isn't about getting somewhere (small talk, a general question, etc.), set intent to "chat" and leave origin/destination null.
- If you truly can't tell what they mean, set intent to "unclear".
- You do not know TransitGo's actual stops, routes, or fares — never state or imply a specific route, fare, or travel time. Your only job is extracting what the rider said, not answering it.`;

function safeParseIntent(text) {
  // Gemini is instructed to return raw JSON, but strip a stray ```json fence
  // if one shows up anyway rather than failing the whole request over it.
  const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const intent = ["route_planning", "chat", "unclear"].includes(parsed.intent) ? parsed.intent : "unclear";
  const asStringOrNull = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    origin: asStringOrNull(parsed.origin),
    destination: asStringOrNull(parsed.destination),
    intent,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message, knownOrigin } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "invalid_request", message: "message is required." });
  }

  try {
    const contextLine = knownOrigin
      ? `(For context only, not something to repeat back: the rider's current resolved location is "${knownOrigin}".)\n`
      : "";
    const text = await callGemini({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [{ role: "user", parts: [{ text: `${contextLine}${message}` }] }],
    });

    const parsed = safeParseIntent(text);
    if (!parsed) {
      return res.status(200).json({ origin: null, destination: null, intent: "unclear" });
    }
    return res.status(200).json(parsed);
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      console.error("[ai/intent] not configured:", err.message);
      return res.status(503).json({ error: "not_configured", message: "AI destination search is temporarily unavailable." });
    }
    if (err instanceof GeminiUnavailableError) {
      console.error("[ai/intent] unavailable:", err.message);
      return res.status(503).json({ error: "unavailable", message: "AI destination search is temporarily unavailable." });
    }
    console.error("[ai/intent] unexpected error:", err);
    return res.status(500).json({ error: "unexpected", message: "AI destination search is temporarily unavailable." });
  }
}
