import { useEffect, useRef, useState } from "react";
import { bearingTo, compassLabel, describeManeuver, formatDistance, haversineDistanceKm } from "../utils/geo";

// iOS 13+ gates device-motion/orientation events behind an explicit,
// tap-triggered permission prompt; every other browser exposes them
// directly. This has to be read once at module load (not inside an effect)
// since it decides whether we even attempt to auto-subscribe.
const NEEDS_IOS_MOTION_PERMISSION =
  typeof window !== "undefined" &&
  typeof window.DeviceOrientationEvent !== "undefined" &&
  typeof window.DeviceOrientationEvent.requestPermission === "function";

// Once the rider is within this radius of a route step's *end* (i.e. the
// next step's maneuver point), that next instruction takes over — loose
// enough to tolerate ordinary GPS drift without skipping a turn early.
const STEP_ADVANCE_RADIUS_KM = 0.015;

// AR-style walking guidance: a live rear-camera feed with a chevron stack
// overlaid on top, rotated by (bearing to the next route point) - (device
// compass heading) so it points the right way regardless of which way the
// rider is currently facing — plus, when `steps` (an OSRM route leg's
// turn-by-turn steps) is available, a live "Turn left / Continue straight"
// instruction card that advances as the rider reaches each maneuver.
export default function CameraNavView({ myLocation, destination, distanceKm, steps }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const headingHandlerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [heading, setHeading] = useState(null);
  const [needsCompassTap, setNeedsCompassTap] = useState(NEEDS_IOS_MOTION_PERMISSION);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

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
        const track = stream.getVideoTracks()[0];
        setTorchSupported(!!track?.getCapabilities?.().torch);
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

  function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    track
      .applyConstraints({ advanced: [{ torch: next }] })
      .then(() => setTorchOn(next))
      .catch(() => {});
  }

  // A fresh `steps` array means a newly (re-)fetched route — start over
  // from its first step rather than indexing into it with a stale offset.
  useEffect(() => {
    setStepIndex(0);
  }, [steps]);

  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const clampedIndex = hasSteps ? Math.min(stepIndex, steps.length - 1) : 0;
  const currentStep = hasSteps ? steps[clampedIndex] : null;
  const nextStep = hasSteps && clampedIndex + 1 < steps.length ? steps[clampedIndex + 1] : null;
  const nextPoint = nextStep
    ? { lat: nextStep.maneuver.location[1], lon: nextStep.maneuver.location[0] }
    : destination;

  // Advance to the next instruction once the rider is close enough to this
  // step's end point (which is where the next step's maneuver happens).
  useEffect(() => {
    if (!myLocation || !nextStep) return;
    const pt = { lat: nextStep.maneuver.location[1], lon: nextStep.maneuver.location[0] };
    if (haversineDistanceKm(myLocation, pt) <= STEP_ADVANCE_RADIUS_KM) {
      setStepIndex((i) => i + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLocation, nextStep]);

  const stepRemainingKm = hasSteps && myLocation && nextStep ? haversineDistanceKm(myLocation, nextPoint) : null;
  const instructionText = hasSteps ? describeManeuver(currentStep?.maneuver) : null;

  const bearing = myLocation ? bearingTo(myLocation, nextPoint) : null;
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

      {!cameraError && torchSupported && (
        <button
          type="button"
          className={`nav-ar-torch ${torchOn ? "is-on" : ""}`}
          onClick={toggleTorch}
          title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
        >
          <i className={`ti ${torchOn ? "ti-flashlight-off" : "ti-flashlight"}`}></i>
        </button>
      )}

      {!cameraError && bearing != null && (
        <div className="nav-ar-guide">
          <div className="nav-ar-chevrons" style={{ transform: `rotate(${arrowRotation}deg)` }}>
            <i className="ti ti-chevron-up nav-ar-chevron-1"></i>
            <i className="ti ti-chevron-up nav-ar-chevron-2"></i>
            <i className="ti ti-chevron-up nav-ar-chevron-3"></i>
          </div>

          {instructionText && (
            <div className="nav-ar-instruction">
              <i className="ti ti-navigation"></i>
              <div>
                <p className="nav-ar-instruction-title">{instructionText}</p>
                {stepRemainingKm != null && (
                  <p className="nav-ar-instruction-sub">for {formatDistance(stepRemainingKm)}</p>
                )}
              </div>
            </div>
          )}

          {!hasHeading && !needsCompassTap && (
            <p className="nav-ar-hint">Can't read your compass — head {compassLabel(bearing)}</p>
          )}
        </div>
      )}

      {!cameraError && distanceKm != null && (
        <div className="nav-ar-distance">
          <i className="ti ti-map-pin"></i>
          {formatDistance(distanceKm)} to destination
        </div>
      )}
    </div>
  );
}
