// Opens the Grab app to a booking screen pre-filled with pickup/dropoff, for
// riders who'd rather skip the commute.
//
// Uses applink.grab.com — Grab's own real universal-link domain (confirmed
// by "Get the Grab App" links on grab.com itself, e.g.
// applink.grab.com/open?screenType=GRABFOOD&merchantIDs=...&sourceID=SMART_LINK
// found live on their site). Being an https:// universal link, iOS/Android
// hand it straight to the installed app at the OS level if Grab is
// registered for that domain — no installed-app detection or manual
// fallback timer needed, unlike a raw "grab://" custom scheme (which is
// what this used before and which real-device testing showed silently
// failing, always falling through to the web instead of opening the app).
// If Grab isn't installed, the link just opens Grab's own web landing page.
//
// The screenType/pickUp*/dropOff* params below are a best-effort guess at
// the transport equivalent of the confirmed GRABFOOD pattern — Grab hasn't
// published a spec for this, so if the app ignores them it still opens to
// its home screen rather than failing. The clipboard copy is the one part
// of this guaranteed to be useful either way.
const APPLINK_BASE = "https://applink.grab.com/open";

export function openGrabRide(from, to) {
  const params = new URLSearchParams({
    screenType: "TRANSPORT",
    pickUpLatitude: from.lat,
    pickUpLongitude: from.lon,
    pickUpAddress: from.name,
    dropOffLatitude: to.lat,
    dropOffLongitude: to.lon,
    dropOffAddress: to.name,
    sourceID: "TRANSITGO",
  });

  const clipboardText = `Pickup: ${from.name}\nDrop-off: ${to.name}`;
  navigator.clipboard?.writeText(clipboardText).catch(() => {});

  window.location.href = `${APPLINK_BASE}?${params.toString()}`;
}
