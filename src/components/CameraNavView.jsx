import { useEffect, useRef, useState } from "react";
import { bearingTo, compassLabel, formatDistance } from "../utils/geo";

// iOS 13+ gates device-motion/orientation events behind an explicit,
// tap-triggered permission prompt; every other browser exposes them
// directly. This has to be read once at module load (not inside an effect)
// since it decides whether we even attempt to auto-subscribe.
const NEEDS_IOS_MOTION_PERMISSION =
  typeof window !== "undefined" &&
  typeof window.DeviceOrientationEvent !== "undefined" &&
  typeof window.DeviceOrientationEvent.requestPermission === "function";

// AR-style walking guidance: a live rear-camera feed with a directional
// arrow overlaid on top, rotated by (bearing to destination) - (device
// compass heading) so the arrow points at the stop regardless of which way
// the rider is currently facing — Google Maps "Live View", minus street
// imagery matching (this app has no such model, just geometry).
export default function CameraNavView({ myLocation, destination, distanceKm }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const headingHandlerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [heading, setHeading] = useState(null);
  const [needsCompassTap, setNeedsCompassTap] = useState(NEEDS_IOS_MOTION_PERMISSION);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This device/browser doesn't support camera access.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError("Camera access was denied. Allow it in your browser settings to use AR view."));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    function handleOrientation(e) {
      // iOS gives true-north heading directly. Everyone else gives `alpha`
      // (counter-clockwise from the device's arbitrary start orientation),
      // which only becomes a true compass heading when the event is the
      // "absolute" variant — 360-alpha converts it to clockwise-from-north.
      const h =
        typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading
          : e.alpha != null
            ? (360 - e.alpha) % 360
            : null;
      if (h != null) setHeading(h);
    }
    headingHandlerRef.current = handleOrientation;
    if (NEEDS_IOS_MOTION_PERMISSION) return; // wait for the explicit tap below

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  function grantCompassAccess() {
    window.DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          setNeedsCompassTap(false);
          window.addEventListener("deviceorientation", headingHandlerRef.current, true);
        }
      })
      .catch(() => {});
  }

  const bearing = myLocation ? bearingTo(myLocation, destination) : null;
  const hasHeading = heading != null;
  const arrowRotation = bearing != null && hasHeading ? bearing - heading : 0;

  return (
    <div className="nav-ar">
      {cameraError ? (
        <div className="nav-ar-error">
          <i className="ti ti-camera-off"></i>
          <p>{cameraError}</p>
        </div>
      ) : (
        <video ref={videoRef} className="nav-ar-video" autoPlay playsInline muted />
      )}

      {!cameraError && needsCompassTap && (
        <button type="button" className="nav-ar-compass-request" onClick={grantCompassAccess}>
          <i className="ti ti-compass"></i>
          Enable Compass
        </button>
      )}

      {!cameraError && bearing != null && (
        <div className="nav-ar-arrow-wrap">
          <div className="nav-ar-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>
            <i className="ti ti-navigation"></i>
          </div>
          {!hasHeading && !needsCompassTap && (
            <p className="nav-ar-hint">Can't read your compass — head {compassLabel(bearing)}</p>
          )}
        </div>
      )}

      {!cameraError && distanceKm != null && (
        <div className="nav-ar-distance">{formatDistance(distanceKm)} to go</div>
      )}
    </div>
  );
}
