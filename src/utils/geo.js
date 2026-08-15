const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a, b) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const WALKING_SPEED_KMH = 4.5;

// Estimated walking time for a distance the route graph doesn't cover itself
// (e.g. GPS fix -> nearest stop) — always at least 1 minute so a very short
// hop still reads as "a little walk" rather than 0.
export function walkingMinutes(km) {
  return Math.max(1, Math.round((km / WALKING_SPEED_KMH) * 60));
}

// Turns a GPS fix into a human-readable address via Nominatim's public
// reverse-geocoding endpoint (the same OSM service MapExplorer already uses
// for its own pins). Throws on network failure or an empty result so
// callers can fall back to something else instead of silently showing "".
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=0`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reverse geocode request failed (${res.status})`);
  const data = await res.json();
  if (!data?.display_name) throw new Error("No address found for this location");
  return data.display_name;
}

// Nominatim's display_name is a full postal-style string ("Salinas Drive,
// Apas, Cebu City, Cebu, 6000, Philippines") — too long for a one-line
// search field, so this keeps just the first couple of meaningful parts
// ("Salinas Drive, Apas").
export function shortenAddress(displayName) {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 2).join(", ") || displayName;
}
