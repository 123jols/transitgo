// Talks only to TransitGo's own backend (/api/grab/estimate) — never to
// Grab directly. The OAuth token and Grab credentials live server-side in
// api/_lib/grabOAuth.js and never reach this file or the browser.
export async function fetchGrabEstimate(pickUp, dropOff) {
  try {
    const res = await fetch("/api/grab/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickUp, dropOff }),
    });

    if (res.status === 503) {
      return { services: [], unavailable: true };
    }
    if (!res.ok) {
      // 400 (bad coordinates) or anything unexpected — no usable estimate,
      // but not worth alarming the rider over; behave like "no coverage".
      return { services: [], unavailable: false };
    }

    const data = await res.json();
    return { services: Array.isArray(data.services) ? data.services : [], unavailable: false };
  } catch {
    // Network failure reaching our own backend (offline, dev server without
    // the /api functions running, etc.)
    return { services: [], unavailable: true };
  }
}
