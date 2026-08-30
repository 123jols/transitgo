// Opens the Grab app to a booking screen pre-filled with pickup/dropoff, for
// riders who'd rather skip the commute. Grab doesn't publish an official
// third-party deep-link spec for this (only "grabconnect2" for partner
// sign-in, which needs a registered partner account), so pickUp/dropOff
// params are best-effort — if Grab ignores them the app still opens to its
// home screen. The clipboard copy is the reliable fallback either way.
const GRAB_PH_WEB_FALLBACK = "https://www.grab.com/ph/transport/";
const APP_OPEN_FALLBACK_DELAY_MS = 1500;

export function openGrabRide(from, to) {
  const params = new URLSearchParams({
    screenType: "BOOKING",
    pickUpLatitude: from.lat,
    pickUpLongitude: from.lon,
    pickUpAddress: from.name,
    dropOffLatitude: to.lat,
    dropOffLongitude: to.lon,
    dropOffAddress: to.name,
  });
  const deepLink = `grab://open?${params.toString()}`;

  const clipboardText = `Pickup: ${from.name}\nDrop-off: ${to.name}`;
  navigator.clipboard?.writeText(clipboardText).catch(() => {});

  // If the deep link actually opens the app, the tab loses focus before the
  // timer fires and this fallback never runs.
  const fallbackTimer = setTimeout(() => {
    window.location.href = GRAB_PH_WEB_FALLBACK;
  }, APP_OPEN_FALLBACK_DELAY_MS);
  window.addEventListener("blur", () => clearTimeout(fallbackTimer), { once: true });

  window.location.href = deepLink;
}
