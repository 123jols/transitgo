// Philippines' single nationwide emergency hotline (PNP, BFP, and medical all
// route through this since the 911 unification) — no city-specific numbers
// needed for a Cebu-only app.
export const EMERGENCY_HOTLINE = "911";

export function callEmergencyHotline() {
  window.location.href = `tel:${EMERGENCY_HOTLINE}`;
}

// SMS URI bodies aren't standardized: iOS wants "&body=", every other
// platform (Android included) wants "?body=".
export function openEmergencySms(number, message) {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const separator = isIOS ? "&" : "?";
  window.location.href = `sms:${number}${separator}body=${encodeURIComponent(message)}`;
}

export function buildLocationMessage(address, lat, lon) {
  const mapsLink = Number.isFinite(lat) && Number.isFinite(lon)
    ? `https://maps.google.com/?q=${lat},${lon}`
    : null;
  const parts = ["SOS — I need help."];
  if (address) parts.push(`Near ${address}.`);
  if (mapsLink) parts.push(`My location: ${mapsLink}`);
  return parts.join(" ");
}
