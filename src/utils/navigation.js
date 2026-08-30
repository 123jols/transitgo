// Hands off to the device's own maps app for turn-by-turn walking directions
// to a single point (the trip's first boarding stop, typically) — this app's
// own map (Leaflet + OSRM) draws the route for reference but has no
// turn-by-turn/voice guidance of its own, and building that is out of scope
// when every phone already has a navigation app for it.
// Google Maps' "universal" directions URL needs no API key and works both
// as a plain web link and (on a phone with the app installed) as a deep
// link into it.
export function openWalkingDirections(lat, lon) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  window.open(url, "_blank", "noopener,noreferrer");
}
