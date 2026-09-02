import { useEffect, useState } from "react";
import { fetchGrabEstimate } from "../api/grab";

// Fetches a Grab fare estimate for the current from/to pair independently
// of public-transit route search — this must never block or delay the
// public-transit results, so it owns its own loading/error state.
export default function useGrabEstimate(from, to) {
  const [status, setStatus] = useState("idle"); // idle | loading | ok | unavailable | none
  const [services, setServices] = useState([]);

  useEffect(() => {
    const hasCoords = from && to
      && Number.isFinite(from.lat) && Number.isFinite(from.lon)
      && Number.isFinite(to.lat) && Number.isFinite(to.lon);

    if (!hasCoords) {
      setStatus("idle");
      setServices([]);
      return;
    }

    let cancelled = false;
    setStatus("loading");

    fetchGrabEstimate(
      { latitude: from.lat, longitude: from.lon, address: from.name },
      { latitude: to.lat, longitude: to.lon, address: to.name }
    ).then(({ services: result, unavailable }) => {
      if (cancelled) return;
      if (unavailable) {
        setStatus("unavailable");
        setServices([]);
      } else if (result.length === 0) {
        setStatus("none");
        setServices([]);
      } else {
        setStatus("ok");
        setServices(result);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.id, from?.lat, from?.lon, to?.id, to?.lat, to?.lon]);

  return { status, services };
}
