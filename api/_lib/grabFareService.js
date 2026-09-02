// Server-side only. Calls Grab's Farefeed Partner Ride Pricing API and
// returns only the fields TransitGo's UI actually needs — never the raw
// Grab payload, and never anything auth-related.
import {
  GRAB_API_BASE_URL,
  getGrabAccessToken,
  invalidateGrabToken,
  fetchWithTimeout,
  GrabConfigError,
} from "./grabOAuth.js";

const ESTIMATE_PATH = "/farefeed/v1/estimate";

// Mirrors the HTTP semantics the integration brief specifies:
// 400 -> bad request, 404 -> no coverage (not a failure), everything else
// unexpected (401 / timeout / network / 5xx) -> "temporarily unavailable".
export class GrabBadRequestError extends Error {}
export class GrabNoServiceError extends Error {}
export class GrabUnavailableError extends Error {}

function isFiniteCoord(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function validatePoint(point, label) {
  if (!point || !isFiniteCoord(point.latitude) || !isFiniteCoord(point.longitude)) {
    throw new GrabBadRequestError(`${label} must include numeric latitude and longitude.`);
  }
  // Grab's own API reference marks address as required on both pickUp and
  // dropOff, not just an optional label.
  if (!point.address || !String(point.address).trim()) {
    throw new GrabBadRequestError(`${label} must include an address.`);
  }
}

// Strips Grab's response down to exactly the fields TransitGo exposes to
// the frontend, dropping anything else Grab might include.
function sanitizeServices(rawServices) {
  return (Array.isArray(rawServices) ? rawServices : [])
    .filter((s) => s && s.fare)
    .map((s) => ({
      serviceID: s.serviceID,
      serviceName: s.serviceName,
      eta: s.eta,
      minFare: s.fare.minFare,
      maxFare: s.fare.maxFare,
      currency: s.fare.currency,
      deepLink: s.deepLink || null,
      directDeepLink: s.directDeepLink || null,
      iconLink: s.iconLink || null,
      surgeNotice: s.surgeNotice || null,
    }));
}

function callFarefeed(pickUp, dropOff, token) {
  return fetchWithTimeout(`${GRAB_API_BASE_URL}${ESTIMATE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pickUp, dropOff }),
  });
}

// Fare estimates should reflect live conditions (surge, ETA) — this cache
// is deliberately short-lived. It exists only to absorb rapid re-searches
// of the same pair within one warm serverless instance, not to serve
// minutes-old pricing as if it were current.
const ESTIMATE_CACHE_TTL_MS = 30_000;
const estimateCache = new Map();

function cacheKey(pickUp, dropOff) {
  const round = (n) => Math.round(n * 10000) / 10000; // ~11m precision
  return [round(pickUp.latitude), round(pickUp.longitude), round(dropOff.latitude), round(dropOff.longitude)].join(",");
}

export async function getGrabFareEstimate({ pickUp, dropOff }) {
  validatePoint(pickUp, "pickUp");
  validatePoint(dropOff, "dropOff");

  const key = cacheKey(pickUp, dropOff);
  const cached = estimateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.services;
  }

  let token;
  try {
    token = await getGrabAccessToken();
  } catch (err) {
    if (err instanceof GrabConfigError) throw err;
    throw new GrabUnavailableError(err.message);
  }

  let response;
  try {
    response = await callFarefeed(pickUp, dropOff, token);
  } catch (err) {
    throw new GrabUnavailableError(`Grab Farefeed request failed: ${err.message}`);
  }

  // Grab's docs point support requests at this header — worth capturing in
  // our own server-side logs (not exposed to the client) for anything that
  // fails, so a real support ticket to Grab can reference it.
  const requestId = response.headers.get("X-Grabkit-Grab-Requestid");
  const withRequestId = (message) => (requestId ? `${message} (X-Grabkit-Grab-Requestid: ${requestId})` : message);

  if (response.status === 401) {
    invalidateGrabToken();
    throw new GrabUnavailableError(withRequestId("Grab rejected the access token (401)."));
  }
  if (response.status === 404) {
    throw new GrabNoServiceError("Grab has no service available for this pickup/drop-off.");
  }
  if (response.status === 400) {
    throw new GrabBadRequestError(withRequestId("Grab rejected the request (400)."));
  }
  if (!response.ok) {
    throw new GrabUnavailableError(withRequestId(`Grab Farefeed returned ${response.status}.`));
  }

  const data = await response.json();
  const services = sanitizeServices(data.services);

  if (services.length === 0) {
    throw new GrabNoServiceError("Grab returned no usable services for this trip.");
  }

  estimateCache.set(key, { services, expiresAt: Date.now() + ESTIMATE_CACHE_TTL_MS });
  return services;
}
