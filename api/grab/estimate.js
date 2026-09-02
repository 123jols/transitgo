// POST /api/grab/estimate — the only Grab-related endpoint the frontend
// ever talks to. Runs server-side on Vercel; holds the Grab OAuth token and
// credentials, neither of which ever reach the client.
import { getGrabFareEstimate, GrabBadRequestError, GrabNoServiceError, GrabUnavailableError } from "../_lib/grabFareService.js";
import { GrabConfigError } from "../_lib/grabOAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { pickUp, dropOff } = req.body || {};

  try {
    const services = await getGrabFareEstimate({ pickUp, dropOff });
    return res.status(200).json({ services });
  } catch (err) {
    if (err instanceof GrabBadRequestError) {
      return res.status(400).json({ error: "invalid_coordinates", message: err.message });
    }
    if (err instanceof GrabNoServiceError) {
      // Not a TransitGo failure — Grab simply doesn't cover this trip.
      // Respond 200 with an empty list so the frontend just hides the card.
      return res.status(200).json({ services: [] });
    }
    if (err instanceof GrabConfigError) {
      console.error("[grab/estimate] not configured:", err.message);
      return res.status(503).json({ error: "not_configured", message: "Grab estimates are temporarily unavailable." });
    }
    if (err instanceof GrabUnavailableError) {
      // Covers 401 / timeout / network / unexpected 5xx from Grab. Log the
      // real reason server-side only — never surface auth details to the client.
      console.error("[grab/estimate] unavailable:", err.message);
      return res.status(503).json({ error: "unavailable", message: "Grab estimates are temporarily unavailable." });
    }
    console.error("[grab/estimate] unexpected error:", err);
    return res.status(500).json({ error: "unexpected", message: "Grab estimates are temporarily unavailable." });
  }
}
