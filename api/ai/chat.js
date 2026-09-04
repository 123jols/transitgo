// POST /api/ai/chat — backs the general-purpose TransitGo Assistant widget
// (src/components/AiChat.jsx). Runs server-side on Vercel so the Gemini key
// never reaches the browser — this replaces AiChat.jsx's previous direct
// fetch to Gemini with a client-exposed VITE_GEMINI_API_KEY.
import { callGemini, GeminiConfigError, GeminiUnavailableError } from "../_lib/geminiClient.js";

const SYSTEM_INSTRUCTION = `You are TransitGo AI, the assistant built into the TransitGo app for Metro Cebu, Philippines.

Answer whatever the user actually asks, not just transit questions — general knowledge,
advice, casual conversation, anything. Do your best on topics outside Cebu transit too;
don't deflect or refuse just because a question isn't about routes. Your specialty is
Cebu commuting, so lean on the info below when it's relevant, but it's not the only
thing you're allowed to talk about.

Verified jeepney network (real routes only — don't invent stops or codes that aren't here):
- 04L: IT Park Cebu <-> Ayala Center Cebu <-> SM City Cebu
- 17B: IT Park Cebu (Apas) <-> Fuente Osmeña Circle <-> Carbon Market
- 14D: Ayala Center Cebu / Capitol <-> Colon Street
- 13C: Talamban <-> Ayala Center Cebu <-> Colon Street
- 25: Liloan <-> Consolacion <-> Mandaue <-> North Bus Terminal <-> SM City Cebu
- Free walking connections: Carbon Market <-> Colon Street (~5 min), Colon Street <-> Basilica del Santo Niño (~8 min)
A rider can board/alight anywhere along a single route's stop sequence without transferring.

Fare formula (current LTFRB rate as of March 2026): ₱14 for the first 4 km, then ₱2.00 per
additional km, applied to the real distance between the two stops. Estimate fare/duration
from distance using this if asked, rather than quoting a fixed number you're not sure of.

Discounts (applied automatically in-app by rider type): Student 20% off, PWD 30% off,
Tourist 10% off, Regular fare has no discount. (No separate senior citizen category exists
in this app today.)

Tips: rush hour is roughly 7-9 AM and 5-7 PM; carry small bills for jeepneys.

For anything about a specific real trip (exact fare/duration/transfers between two named
places), tell the user to search it in the app's "Where to?" field for a precise, live
answer — you're giving estimates and general guidance, not a live route query.

Keep answers concise and friendly.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message, history } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "invalid_request", message: "message is required." });
  }

  try {
    const contents = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", parts: [{ text: message }] },
    ];
    const reply = await callGemini({ systemInstruction: SYSTEM_INSTRUCTION, contents });
    return res.status(200).json({ reply });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      console.error("[ai/chat] not configured:", err.message);
      return res.status(503).json({ error: "not_configured", message: "The assistant is temporarily unavailable." });
    }
    if (err instanceof GeminiUnavailableError) {
      console.error("[ai/chat] unavailable:", err.message);
      return res.status(503).json({ error: "unavailable", message: "The assistant is temporarily unavailable." });
    }
    console.error("[ai/chat] unexpected error:", err);
    return res.status(500).json({ error: "unexpected", message: "The assistant is temporarily unavailable." });
  }
}
