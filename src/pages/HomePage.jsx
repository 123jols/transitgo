import { useEffect, useRef, useState } from "react";
import { addRoute, findRoutes, getPopularRoutes, getStops, resolveDestinationCandidates, resolveRealWorldLandmark, searchDestinations, searchStops } from "../api/transit";
import { fetchAiIntent } from "../api/ai";
import { selectDisplayRoutes } from "../utils/routing";
import { haversineDistanceKm, reverseGeocode, shortenAddress } from "../utils/geo";
import RouteDetailsPage from "./RouteDetailsPage";
import WeatherTip from "../components/WeatherTip";
import ThemeToggle from "../components/ThemeToggle";
import MapExplorer from "../components/MapExplorer";
import NearbyTerminalsCard from "../components/NearbyTerminalsCard";
import TouristSpots from "../components/TouristSpots";
import ExploreNearby from "../components/ExploreNearby";
import ExploreHubs from "../components/ExploreHubs";
import ExploreSearchResults from "../components/ExploreSearchResults";
import SwipeToDelete from "../components/SwipeToDelete";
import BottomSheet from "../components/BottomSheet";
import BottomNav from "../components/BottomNav";
import TripsPage from "./TripsPage";
import TerminalsPage from "./TerminalsPage";
import ProfilePage from "./ProfilePage";
import GrabRideCard from "../components/GrabRideCard";
import useGrabEstimate from "../hooks/useGrabEstimate";
import useSavedTrips from "../hooks/useSavedTrips";
import { attractions } from "../data/attractions";
import { terminals } from "../data/terminals";
import { RIDER_TYPES, getStoredRiderType, setStoredRiderType } from "../data/riderTypes";

const EXPLORE_CATEGORIES = [
  { key: "all", label: "All", icon: "ti-apps" },
  { key: "tourist", label: "Tourist Spots", icon: "ti-map-pin" },
  { key: "terminals", label: "Terminals", icon: "ti-bus-stop" },
  { key: "stops", label: "Stops", icon: "ti-map-pin-filled" },
];

// Only auto-fill "From" with a detected stop if it's actually within Metro
// Cebu — otherwise a GPS fix from way outside our coverage area (or a bad
// fix) would silently pin the wrong origin.
const MAX_AUTO_LOCATE_KM = 20;

// Minimum movement (km) between GPS fixes before we bother re-hitting the
// reverse-geocoding API — avoids hammering Nominatim (and rewriting the
// field) on every watchPosition tick while the rider is standing still.
const MIN_REGEOCODE_MOVE_KM = 0.05; // ~50m

// Glassmorphic dropdown component for stop suggestions
function StopDropdown({ suggestions, onSelect, open }) {
  if (!open || !suggestions.length) return null;
  return (
    <div className="stop-dropdown">
      {suggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          className="stop-dropdown-item"
          onClick={() => onSelect(item)}
        >
          <i className="ti ti-map-pin" style={{ color: "#1976d2" }}></i>
          <div className="stop-dropdown-content">
            <p className="stop-name">{item.name ?? item.label}</p>
            <p className="stop-type">{item.subtitle || "Transit stop"}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  // Grab estimate runs independently of public-transit search — it must
  // never block or delay the routes list, and it's fine for it to still be
  // loading (or to fail) while public transit results are already shown.
  const grabEstimate = useGrabEstimate(from, to);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  // AI-assisted destination search — only ever offered/used when the
  // deterministic searchDestinations() above found nothing, and only ever
  // resolves against resolveDestinationCandidates' real, verified place
  // list (never a place the AI invented). See src/api/ai.js / api/ai/intent.js.
  const [aiAsking, setAiAsking] = useState(false);
  const [aiCandidates, setAiCandidates] = useState([]);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [results, setResults] = useState([]);
  const [userType, setUserType] = useState(getStoredRiderType);
  const [routeFilter, setRouteFilter] = useState("all");
  const [recentSearches, setRecentSearches] = useState([]);
  const { savedTrips, saveTripToTrips, removeSavedTrip } = useSavedTrips();
  const [routeDetails, setRouteDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("search");
  const [isSearching, setIsSearching] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [heroAnimated, setHeroAnimated] = useState(false);
  const [searchAnimated, setSearchAnimated] = useState(false);
  const [resultsAnimated, setResultsAnimated] = useState(false);
  const [newRouteInput, setNewRouteInput] = useState({
    fromId: "",
    toId: "",
    type: "jeepney",
    label: "",
    fare: "",
    duration: "",
    transfers: "0",
  });
  const [routeSavedMessage, setRouteSavedMessage] = useState("");
  const [sheetSnap, setSheetSnap] = useState("half");
  const [navTab, setNavTab] = useState("home");
  const [locStatus, setLocStatus] = useState("idle"); // idle | locating | ok | denied
  const [locError, setLocError] = useState("");
  // Raw GPS coords, independent of the "From" field above — that field only
  // tracks location while autoLocateRef is engaged (it stops once the rider
  // types a manual origin), but Explore's "Nearby You" distances need the
  // rider's real position regardless of what they've done to trip search.
  const [myCoords, setMyCoords] = useState(null);
  const [exploreCategory, setExploreCategory] = useState("all");
  const [exploreQuery, setExploreQuery] = useState("");
  const searchTimeoutRef = useRef(null);
  const fromRef = useRef(null);
  // True while the "From" field should keep tracking live GPS fixes; flipped
  // off the moment the rider takes explicit control of it (typing, picking a
  // suggestion, swapping, opening a saved trip, etc.) so GPS updates stop
  // clobbering their choice. Separate from `fromRef`, which only tells us
  // whether a value is present — that alone can't distinguish "the rider
  // chose this" from "GPS auto-filled this and should keep refreshing it".
  const autoLocateRef = useRef(true);
  // Last coordinates we actually reverse-geocoded, so a stationary rider's
  // watchPosition updates (which can fire every few seconds) don't re-hit
  // the Nominatim API for a fix that hasn't meaningfully moved.
  const lastGeocodedFixRef = useRef(null);
  // Bumped on every GPS-driven locate so a slow, older reverse-geocode
  // response can't overwrite the field after a newer fix already resolved.
  const locateRequestIdRef = useRef(0);

  const popularRoutes = getPopularRoutes();
  const stops = getStops();

  const discounts = Object.fromEntries(RIDER_TYPES.map((t) => [t.id, t.discount]));
  const userLabels = Object.fromEntries(RIDER_TYPES.map((t) => [t.id, t.label]));

  // Kept in sync with the Profile page's Rider Type setting (both read/write
  // the same localStorage key) so a discount picked in one place applies in
  // the other without needing to lift this state up or add a context.
  useEffect(() => {
    setStoredRiderType(userType);
  }, [userType]);

  useEffect(() => {
    const storedHistory = window.localStorage.getItem("transitgo-recent-searches");
    if (storedHistory) {
      try {
        setRecentSearches(JSON.parse(storedHistory));
      } catch (error) {
        console.warn("Invalid recent search history stored", error);
      }
    }
  }, []);

  useEffect(() => {
    setPageReady(true);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === "search") {
      setSearchAnimated(false);
      const timer = setTimeout(() => setSearchAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "results") {
      setResultsAnimated(false);
      setSheetSnap("full");
      const timer = setTimeout(() => setResultsAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const saveRecentSearch = (entry) => {
    setRecentSearches((prevHistory) => {
      const nextHistory = [entry, ...prevHistory.filter((item) => item.label !== entry.label)].slice(0, 5);
      window.localStorage.setItem("transitgo-recent-searches", JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const removeRecentSearch = (label) => {
    setRecentSearches((prevHistory) => {
      const nextHistory = prevHistory.filter((item) => item.label !== label);
      window.localStorage.setItem("transitgo-recent-searches", JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const getSearchLabel = (source, destination) => `${source.name} → ${destination.name}`;

  const openSavedTrip = (trip) => {
    autoLocateRef.current = false;
    setFrom(trip.from);
    setTo(trip.to);
    setRouteDetails(trip.route);
  };

  const getDiscountedFare = (fare) => {
    const discount = discounts[userType] || 0;
    return Math.round(fare * (1 - discount));
  };

  const getDiscountLabel = () => {
    if (userType === "regular") return "";
    return `${Math.round((discounts[userType] || 0) * 100)}% ${userLabels[userType]} discount`;
  };

  const handleNewRouteInput = (field, value) => {
    setNewRouteInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddRoute = () => {
    const { fromId, toId, type, label, fare, duration, transfers } = newRouteInput;
    if (!fromId || !toId || !label || !fare || !duration) {
      setRouteSavedMessage("Please fill in all required fields.");
      return;
    }
    if (fromId === toId) {
      setRouteSavedMessage("From and to must be different.");
      return;
    }

    const fromStop = stops.find((stop) => stop.id === fromId);
    const toStop = stops.find((stop) => stop.id === toId);
    const newRoute = {
      id: `r-${Date.now()}`,
      type,
      label,
      fare: Number(fare),
      duration: Number(duration),
      transfers: Number(transfers),
      stops: [fromStop?.name || fromId, toStop?.name || toId],
      fromId,
      toId,
    };

    addRoute(newRoute);
    setRouteSavedMessage("Route added successfully.");
    setNewRouteInput({
      fromId: "",
      toId: "",
      type: "jeepney",
      label: "",
      fare: "",
      duration: "",
      transfers: "0",
    });
    setTimeout(() => setRouteSavedMessage(""), 3000);
  };

  const executeSearch = (source, destination) => {
    const routes = findRoutes(source.id, destination.id);
    setResults(routes);
    saveRecentSearch({
      label: getSearchLabel(source, destination),
      from: source,
      to: destination,
    });
    setIsSearching(false);
  };

  const handleSearch = () => {
    if (!from || !to) return;
    setActiveTab("results");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(() => {
      executeSearch(from, to);
      searchTimeoutRef.current = null;
    }, 220);
  };

  const handleFromChange = (e) => {
    autoLocateRef.current = false;
    const value = e.target.value;
    setFromQuery(value);
    setFrom(null);
    setFromSuggestions(value ? searchStops(value) : []);
  };

  const handleToChange = (e) => {
    const value = e.target.value;
    setToQuery(value);
    setTo(null);
    setToSuggestions(value ? searchDestinations(value) : []);
    // A fresh edit invalidates whatever the AI search last found/said.
    setAiCandidates([]);
    setAiStatusMessage("");
  };

  // A destination search hit (stop, terminal, or attraction — see
  // api/transit.js's searchDestinations) resolves to a real routable stop,
  // relabeled with whatever the rider actually searched for (e.g. "Kawasan
  // Falls" instead of its jump-off stop's own name "Carbon Market") so the
  // UI reflects their intent while routing still runs on the real node.
  const selectDestination = (result) => {
    viewRoutesTo({ ...result.stop, name: result.label });
  };

  const selectFrom = (stop) => {
    autoLocateRef.current = false;
    setFrom(stop);
    setFromQuery(stop.name);
    setFromSuggestions([]);
  };

  // Only ever called when the rider tapped "Ask AI" after the deterministic
  // searchDestinations() above already found nothing for their exact text —
  // this is a fallback for typos/phrasing ("jmall", "how do I get to X"),
  // never the first thing tried. The AI (api/ai/intent.js) only extracts
  // what the rider meant; resolveDestinationCandidates() then matches that
  // against TransitGo's real, verified stops/terminals/destinations — if
  // nothing scores high enough, this reports "not found" rather than
  // guessing, exactly like the routing engine never invents a route.
  const handleAskAi = async () => {
    if (!toQuery.trim() || aiAsking) return;
    setAiAsking(true);
    setAiCandidates([]);
    setAiStatusMessage("");

    const result = await fetchAiIntent(toQuery, from?.name);

    if (!result.available) {
      setAiStatusMessage("AI search is unavailable right now — try a different search term instead.");
      setAiAsking(false);
      return;
    }
    if (result.intent === "chat") {
      setAiStatusMessage("That doesn't look like a place to go — try naming a destination.");
      setAiAsking(false);
      return;
    }

    // If the rider named an explicit origin ("from Yati to Ayala"), try to
    // resolve and apply it too — same real place-list, same confidence bar,
    // then the same live-landmark fallback the destination gets below.
    if (result.origin) {
      const originMatches = resolveDestinationCandidates(result.origin, { limit: 1 });
      if (originMatches.length && originMatches[0].confidence >= 0.75) {
        selectFrom({ ...originMatches[0].stop, name: originMatches[0].label });
      } else {
        const originLandmark = await resolveRealWorldLandmark(result.origin);
        if (originLandmark) selectFrom({ ...originLandmark.stop, name: originLandmark.label });
      }
    }

    const destinationQuery = result.destination || toQuery;
    const matches = resolveDestinationCandidates(destinationQuery);

    if (matches.length === 1 && matches[0].confidence >= 0.75) {
      selectDestination(matches[0]);
    } else {
      // Nothing in the curated list matched confidently enough to
      // auto-select on its own — also check whether this is actually a
      // different real place before settling for the curated list's best
      // (possibly wrong) guess. E.g. "SM Seaside City Cebu" fuzzily
      // resembles the curated "SM City Cebu" entry, a real but different
      // mall — surfacing the genuine landmark alongside it lets the rider
      // pick the one they actually meant instead of silently getting the
      // wrong destination.
      const landmark = await resolveRealWorldLandmark(destinationQuery);
      const candidates = landmark
        ? [landmark, ...matches.filter((m) => m.stop.id !== landmark.stop.id)]
        : matches;

      if (candidates.length === 1) {
        selectDestination(candidates[0]);
      } else if (candidates.length > 1) {
        setAiCandidates(candidates);
      } else {
        setAiStatusMessage(`Couldn't find "${destinationQuery}" in TransitGo's Cebu coverage yet.`);
      }
    }
    setAiAsking(false);
  };

  // The known stop nearest a given GPS fix, or null if none are within
  // MAX_AUTO_LOCATE_KM. Routing only works between stops in the verified
  // graph (data/db.js), so search still has to anchor on one of these even
  // though the field now *displays* the real detected address, not this
  // stop's name — see buildCurrentLocationStop below.
  const nearestStopTo = (lat, lon) => {
    const nearest = stops
      .map((stop) => ({ stop, distanceKm: haversineDistanceKm({ lat, lon }, stop) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
    return nearest && nearest.distanceKm <= MAX_AUTO_LOCATE_KM ? nearest.stop : null;
  };

  // Turns a raw geolocation PositionError into a message that actually
  // tells the rider what to do, instead of every failure mode collapsing
  // into the same silent "denied" state.
  const describeGeoError = (err) => {
    if (!err || typeof err.code !== "number") return "Couldn't determine your location.";
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return "Location access is off. Enable it for this site in your browser/device settings.";
      case err.POSITION_UNAVAILABLE:
        return "Couldn't get a GPS fix. Make sure location services are turned on.";
      case err.TIMEOUT:
        return "Getting your location took too long. Check your signal and try again.";
      default:
        return "Couldn't determine your location.";
    }
  };

  // Resolves a raw GPS fix into a "From"-ready stop: the nearest known stop
  // (still needed so trip search runs against the verified route graph),
  // but labeled with the real reverse-geocoded address and positioned at
  // the *actual* detected coordinates rather than the stop's static ones.
  // Root cause of the old "From always says Talamban" bug: 7 of our 8 known
  // stops sit in one small downtown cluster and Talamban alone stands in
  // for the entire rest of Metro Cebu, so nearly any real fix outside that
  // cluster resolved to Talamban's *stop name* — which was then shown
  // as-is, as if it were the rider's actual address. Reverse geocoding here
  // replaces that static name with the real address, so the field says
  // where the rider actually is even though routing still anchors on
  // Talamban as the nearest graph node when that's genuinely the case.
  const buildCurrentLocationStop = async (lat, lon) => {
    const stop = nearestStopTo(lat, lon);
    if (!stop) {
      setLocError("You're outside the area TransitGo currently covers.");
      return null;
    }
    let label = stop.name;
    try {
      label = shortenAddress(await reverseGeocode(lat, lon));
    } catch {
      // Best-effort only — a network hiccup or Nominatim being unavailable
      // shouldn't block auto-fill, just fall back to the known stop's name
      // instead of leaving the field blank.
    }
    setLocError("");
    return { ...stop, name: label, lat, lon };
  };

  // One-shot locate: gets a fresh high-accuracy GPS fix and resolves it to
  // a "From"-ready stop, or null if location is unavailable/denied/too far
  // (in which case locError explains why).
  const locateCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocError("Location isn't supported on this device/browser.");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => resolve(await buildCurrentLocationStop(pos.coords.latitude, pos.coords.longitude)),
        (err) => {
          setLocError(describeGeoError(err));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  // The map (MapExplorer) tracks GPS continuously on its own and reports
  // every fix here, so a location grant made via its "Enable Location" or
  // "My Location" controls still fills in this page's own "Your location"
  // field — even if this page's own initial locate attempt above had
  // already failed/been denied and won't retry by itself. Because this
  // fires on every watchPosition update, it's also what keeps "From" in
  // sync as the rider actually moves — as long as autoLocateRef is still
  // true, i.e. they haven't since taken manual control of the field.
  const applyGpsFix = async (lat, lon) => {
    setMyCoords({ lat, lon });
    if (!autoLocateRef.current) return;

    const last = lastGeocodedFixRef.current;
    if (last && haversineDistanceKm(last, { lat, lon }) < MIN_REGEOCODE_MOVE_KM) return;

    const requestId = ++locateRequestIdRef.current;
    const stop = await buildCurrentLocationStop(lat, lon);
    // A newer fix (or the rider taking manual control) may have landed
    // while this reverse-geocode was in flight — don't let a stale response
    // overwrite whatever's current now.
    if (requestId !== locateRequestIdRef.current || !autoLocateRef.current) return;

    lastGeocodedFixRef.current = { lat, lon };
    if (stop) {
      setFrom(stop);
      setFromQuery(stop.name);
      setLocStatus("ok");
    }
  };

  useEffect(() => {
    fromRef.current = from;
  }, [from]);

  useEffect(() => {
    setLocStatus("locating");
    locateCurrentLocation().then((stop) => {
      // Don't clobber an origin the user already picked while we were
      // waiting on the GPS fix.
      if (fromRef.current) {
        setLocStatus("idle");
        return;
      }
      if (stop) {
        lastGeocodedFixRef.current = { lat: stop.lat, lon: stop.lon };
        setFrom(stop);
        setFromQuery(stop.name);
        setLocStatus("ok");
      } else {
        setLocStatus("denied");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attempts the GPS locate on demand (the "Try again" link shown next to
  // a location error) — the browser only shows its native permission prompt
  // once per origin, but a retry is still meaningful for a timeout, a
  // temporarily unavailable fix, or the rider having just flipped location
  // services back on in Settings.
  const retryLocate = async () => {
    autoLocateRef.current = true;
    setLocStatus("locating");
    const stop = await locateCurrentLocation();
    if (stop) {
      lastGeocodedFixRef.current = { lat: stop.lat, lon: stop.lon };
      setFrom(stop);
      setFromQuery(stop.name);
      setLocStatus("ok");
    } else {
      setLocStatus("denied");
    }
  };

  // Explore's own "Enable Location" trigger — deliberately doesn't touch the
  // "From" field (unlike retryLocate above), since tapping it from the
  // Explore tab shouldn't silently change what the Home tab's trip search
  // is anchored to. Shares locStatus with the rest of the page so a prior
  // denial elsewhere still suppresses the button instead of re-prompting.
  const enableExploreLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const swapStops = () => {
    if (!from && !to) return;
    autoLocateRef.current = false;
    setFrom(to);
    setTo(from);
    setFromQuery(to ? to.name : "");
    setToQuery(from ? from.name : "");
    setFromSuggestions([]);
    setToSuggestions([]);
    if (to && from) {
      setIsSearching(true);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = window.setTimeout(() => {
        executeSearch(to, from);
        searchTimeoutRef.current = null;
      }, 220);
    }
  };

  const clearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setFromQuery("");
    setToQuery("");
    setFrom(null);
    setTo(null);
    setFromSuggestions([]);
    setToSuggestions([]);
    setResults([]);
    setIsSearching(false);
    setActiveTab("search");
    // Clearing isn't "I want something else" the way typing/picking/swapping
    // is — there's no explicit alternative, so let GPS auto-fill "From"
    // again on the next fix instead of leaving it permanently disabled.
    autoLocateRef.current = true;
    lastGeocodedFixRef.current = null;
  };

  const applyPopularRoute = (route) => {
    autoLocateRef.current = false;
    setFrom(route.from);
    setTo(route.to);
    setFromQuery(route.from.name);
    setToQuery(route.to.name);
    setFromSuggestions([]);
    setToSuggestions([]);
    setActiveTab("results");
    setIsSearching(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      executeSearch(route.from, route.to);
      searchTimeoutRef.current = null;
    }, 220);
  };

  // Used by both the Terminals and Explore quick-pick lists: the tapped stop
  // becomes the destination, and the origin is either whatever's already
  // selected or (failing that) a live GPS fix snapped to the nearest stop —
  // so picking a place to go is enough to see routes, no manual "From" step.
  const viewRoutesTo = async (stop) => {
    setTo(stop);
    setToQuery(stop.name);
    setToSuggestions([]);
    setNavTab("home");

    let origin = from;
    if (!origin) {
      setActiveTab("search");
      setLocStatus("locating");
      origin = await locateCurrentLocation();
      if (origin) {
        lastGeocodedFixRef.current = { lat: origin.lat, lon: origin.lon };
        autoLocateRef.current = true;
        setFrom(origin);
        setFromQuery(origin.name);
        setLocStatus("ok");
      } else {
        setLocStatus("denied");
      }
    }

    if (!origin) return;

    setActiveTab("results");
    setIsSearching(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      executeSearch(origin, stop);
      searchTimeoutRef.current = null;
    }, 220);
  };

  const openRouteDetails = (route) => {
    setRouteDetails(route);
    setActiveTab("details");
  };

  const backToResults = () => {
    setRouteDetails(null);
    setActiveTab("results");
  };

  // `results` (from findRoutesBetween) already arrives compareTrips-sorted —
  // filtering by transport type preserves that order, so selectDisplayRoutes
  // below can rely on it without re-sorting.
  const filteredResults = results.filter((route) => {
    if (routeFilter === "all") return true;
    return route.type.toLowerCase() === routeFilter;
  });

  const routeCount = filteredResults.length;
  const hasSelection = Boolean(from && to);
  // The single BEST route plus a small set of genuinely meaningful
  // alternatives — see selectDisplayRoutes' dominance filter (utils/routing.js)
  // for why a merely-technically-valid-but-worse route doesn't show up here.
  const { best: bestRoute, alternatives: alternativeRoutes } = selectDisplayRoutes(filteredResults);

  // Badges (Fastest/Cheapest/Fewest transfers) are computed over the
  // alternatives only — the best route's own position already says it's the
  // recommended pick, so it doesn't need a repeated badge.
  const topPickCategories = [
    { label: "Fastest", icon: "ti-bolt", route: [...alternativeRoutes].sort((a, b) => a.duration - b.duration)[0] },
    { label: "Cheapest", icon: "ti-currency-peso", route: [...alternativeRoutes].sort((a, b) => getDiscountedFare(a.fare) - getDiscountedFare(b.fare))[0] },
  ];
  const topPickMap = new Map();
  topPickCategories.forEach(({ label, icon, route }) => {
    if (!route) return;
    if (!topPickMap.has(route.id)) topPickMap.set(route.id, { route, badges: [] });
    topPickMap.get(route.id).badges.push({ label, icon });
  });

  const currentDiscountText = userType === "regular" ? "No discount" : getDiscountLabel();

  if (routeDetails) {
    const isTripSaved = Boolean(
      from && to && savedTrips.some((trip) => trip.id === `${routeDetails.id}-${from.id}-${to.id}`)
    );
    return (
      <RouteDetailsPage
        route={routeDetails}
        from={from}
        to={to}
        userType={userType}
        discountRate={discounts[userType] || 0}
        userLabel={userLabels[userType]}
        onBack={backToResults}
        isSaved={isTripSaved}
        onSaveTrip={() => saveTripToTrips(routeDetails, from, to)}
      />
    );
  }

  if (navTab === "trips") {
    return (
      <>
        <TripsPage
          trips={savedTrips}
          onOpenTrip={openSavedTrip}
          onRemoveTrip={removeSavedTrip}
        />
        <BottomNav active={navTab} onChange={setNavTab} />
      </>
    );
  }

  if (navTab === "terminals") {
    return (
      <>
        <TerminalsPage stops={stops} onViewRoutes={viewRoutesTo} />
        <BottomNav active={navTab} onChange={setNavTab} />
      </>
    );
  }

  if (navTab === "profile") {
    return (
      <>
        <ProfilePage onNavigate={setNavTab} />
        <BottomNav active={navTab} onChange={setNavTab} />
      </>
    );
  }

  // Reuses the exact same real stop/terminal/attraction search the Home
  // tab's From/To fields already run (api/transit.js) rather than a second,
  // parallel search implementation just for Explore.
  const exploreSearchResults = exploreQuery.trim() ? searchDestinations(exploreQuery.trim()) : null;
  const exploreTouristSpots = exploreCategory === "all" || exploreCategory === "tourist"
    ? attractions
    : [];

  return (
    <div className="home-shell">
      {/* Full-screen map background */}
      <div className="home-map-layer">
        <MapExplorer fullscreen showSearchOverlay={false} onLocationFix={applyGpsFix} />
      </div>

      {/* Floating branding + theme toggle */}
      <div className="home-floating-header">
        <div className="home-brand">
          <div className="home-brand-icon"><i className="ti ti-map-2"></i></div>
          <span className="home-brand-text">TransitGo</span>
        </div>
        <ThemeToggle />
      </div>

      <BottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
        {navTab === "explore" && (
          <>
            <div className="explore-header">
              <h2 className="hero-headline explore-header-title">Explore</h2>
              <p className="hero-subhead explore-header-subhead">Discover places and transportation around you.</p>
            </div>

            <div className="explore-search-field">
              <i className="ti ti-search"></i>
              <input
                type="text"
                value={exploreQuery}
                onChange={(e) => setExploreQuery(e.target.value)}
                placeholder="Search destinations, terminals, or places"
              />
              {exploreQuery && (
                <button type="button" className="explore-search-clear" onClick={() => setExploreQuery("")}>
                  <i className="ti ti-x"></i>
                </button>
              )}
            </div>

            <div className="chips-scroll-wrapper">
              <div className="chips-scroll">
                {EXPLORE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`quick-chip${exploreCategory === cat.key ? " quick-chip-active" : ""}`}
                    onClick={() => setExploreCategory(cat.key)}
                  >
                    <i className={`ti ${cat.icon}`}></i>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="chips-fade" aria-hidden="true"></div>
            </div>

            {exploreSearchResults ? (
              <ExploreSearchResults
                results={exploreSearchResults}
                myCoords={myCoords}
                onDirections={viewRoutesTo}
              />
            ) : (
              <>
                <ExploreNearby
                  stops={stops}
                  terminals={terminals}
                  myCoords={myCoords}
                  category={exploreCategory}
                  locDenied={locStatus === "denied"}
                  onEnableLocation={enableExploreLocation}
                  onDirections={viewRoutesTo}
                />

                {(exploreCategory === "all" || exploreCategory === "tourist") && (
                  <TouristSpots spots={exploreTouristSpots} stops={stops} myCoords={myCoords} onSelect={viewRoutesTo} />
                )}

                {(exploreCategory === "all" || exploreCategory === "terminals") && (
                  <ExploreHubs
                    stops={stops}
                    terminals={terminals}
                    myCoords={myCoords}
                    onDirections={viewRoutesTo}
                    onViewAll={() => setNavTab("terminals")}
                  />
                )}
              </>
            )}
          </>
        )}

        {navTab === "home" && (
          <>
        {/* Headline and subhead */}
        <h2 className="hero-headline">Where are you going?</h2>
        <div className="hero-meta-pills">
          <span className="hero-meta-pill"><span className="hero-meta-dot"></span>Live ETAs</span>
          <span className="hero-meta-pill"><span className="hero-meta-dot"></span>Cebu</span>
        </div>

        {/* Route card: merged From/To with a connector (boarding dot ->
            dashed line -> alighting pin) instead of two separate fields. */}
        <div className="route-card">
          <div className="route-row">
            <div className="connector">
              <div className="connector-dot"></div>
              <div className="connector-line"></div>
            </div>
            <div className="route-field-input">
              <span className="route-field-label">From</span>
              <div className="route-field-input-wrapper">
                <input
                  type="text"
                  value={fromQuery}
                  onChange={handleFromChange}
                  placeholder="Your location"
                  className="route-field-text"
                  autoComplete="off"
                />
                <StopDropdown
                  suggestions={fromSuggestions}
                  onSelect={selectFrom}
                  open={fromSuggestions.length > 0}
                />
              </div>
            </div>
          </div>

          <div className="route-row">
            <div className="connector">
              <div className="connector-pin"></div>
            </div>
            <div className="route-field-input">
              <span className="route-field-label">To</span>
              <div className="route-field-input-wrapper">
                <input
                  type="text"
                  value={toQuery}
                  onChange={handleToChange}
                  placeholder="Where to?"
                  className="route-field-text"
                  autoComplete="off"
                />
                <StopDropdown
                  suggestions={toSuggestions}
                  onSelect={selectDestination}
                  open={toSuggestions.length > 0}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="swap-fab"
            onClick={swapStops}
            disabled={!hasSelection || isSearching}
            title="Swap origin and destination"
          >
            <i className="ti ti-arrows-sort"></i>
          </button>
        </div>

        {toQuery.trim().length >= 2 && toSuggestions.length === 0 && !to && (
            <div className="ai-destination-search">
              {aiAsking ? (
                <p className="ai-destination-status">
                  <i className="ti ti-sparkles"></i> Asking AI…
                </p>
              ) : aiCandidates.length > 0 ? (
                <div className="ai-destination-candidates">
                  <p className="ai-destination-status">AI found these possible matches:</p>
                  {aiCandidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="ai-destination-candidate"
                      onClick={() => { selectDestination(c); setAiCandidates([]); }}
                    >
                      <i className="ti ti-map-pin"></i>
                      <span className="ai-destination-candidate-text">
                        <strong>{c.label}</strong>
                        <small>{c.subtitle}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : aiStatusMessage ? (
                <p className="ai-destination-status">{aiStatusMessage}</p>
              ) : (
                <button type="button" className="ai-destination-ask-button" onClick={handleAskAi}>
                  <i className="ti ti-sparkles"></i> Can&apos;t find it? Ask AI about &quot;{toQuery.trim()}&quot;
                </button>
              )}
            </div>
          )}

          <div className="rider-segmented">
            {RIDER_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`rider-segment${userType === t.id ? " active" : ""}`}
                onClick={() => setUserType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="find-routes-button"
            onClick={handleSearch}
            disabled={!hasSelection || isSearching}
          >
            {isSearching ? "Searching…" : "Find Routes"} <i className="ti ti-arrow-right"></i>
          </button>

        {locStatus === "locating" && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 2px 0" }}>
            <i className="ti ti-locate" style={{ marginRight: 4 }}></i>
            Finding your location…
          </p>
        )}
        {locStatus === "ok" && from && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 2px 0" }}>
            <i className="ti ti-map-pin" style={{ marginRight: 4 }}></i>
            Starting near {from.name} (your location)
          </p>
        )}
        {locStatus === "denied" && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 2px 0" }}>
            <i className="ti ti-map-pin-off" style={{ marginRight: 4 }}></i>
            {locError || "Couldn't detect your location."}{" "}
            <button
              type="button"
              onClick={retryLocate}
              style={{ background: "none", border: "none", padding: 0, color: "var(--accent-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </p>
        )}

        {locStatus === "ok" && from && (
          <NearbyTerminalsCard
            userLocation={{ lat: from.lat, lon: from.lon }}
            destination={to}
            onViewAllTerminals={() => setNavTab("terminals")}
          />
        )}

        {/* Popular routes */}
        {popularRoutes.length > 0 && (
          <div className="quick-chips-row">
            <p className="section-label">Popular routes</p>
            <div className="chips-scroll-wrapper">
              <div className="chips-scroll">
                {popularRoutes.map((route) => (
                  <button
                    key={`${route.from.id}-${route.to.id}`}
                    type="button"
                    className="route-chip-card"
                    onClick={() => applyPopularRoute(route)}
                  >
                    <span className="route-chip-card-icon"><i className="ti ti-sparkles"></i></span>
                    <span className="route-chip-card-name">
                      {route.from.name.split(" ")[0]} → {route.to.name.split(" ")[0]}
                    </span>
                    <span className="route-chip-card-fare">from ₱{getDiscountedFare(route.route.fare)}</span>
                  </button>
                ))}
              </div>
              <div className="chips-fade" aria-hidden="true"></div>
            </div>
          </div>
        )}

      {/* Main content tabs */}
      {activeTab === "search" && (
        <div className={`tab-content search-tab ${searchAnimated ? "animated" : ""}`}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="recent-section">
              <p className="section-label">Recent</p>
              <div className="recent-card">
                {recentSearches.map((search) => (
                  <SwipeToDelete key={search.label} onDelete={() => removeRecentSearch(search.label)}>
                    <button
                      type="button"
                      className="recent-row"
                      onClick={() => applyPopularRoute({ from: search.from, to: search.to })}
                    >
                      <div className="recent-icon">
                        <i className="ti ti-history"></i>
                      </div>
                      <div className="recent-content">
                        <p className="recent-name">{search.label}</p>
                        <p className="recent-type">Recent search</p>
                      </div>
                    </button>
                  </SwipeToDelete>
                ))}
              </div>
            </div>
          )}

          {/* Commuter tips */}
          <div className="tips-section">
            <p className="section-label">Tips</p>
            <div className="tips-grid">
              <WeatherTip />
              <div className="tip-card">
                <i className="ti ti-clock"></i>
                <p>Travel during off-peak hours for shorter routes</p>
              </div>
              <div className="tip-card">
                <i className="ti ti-wallet"></i>
                <p>Student and PWD discounts apply automatically</p>
              </div>
              <div className="tip-card">
                <i className="ti ti-route"></i>
                <p>Check route maps before boarding</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "results" && (
        <div className={`tab-content results-tab ${resultsAnimated ? "animated" : ""}`}>
          {/* Best route — the single recommended pick per selectDisplayRoutes'
              ranking (fewest transfers, then least walking, then fastest,
              then cheapest, then simplest). A direct route always wins here
              over a technically-valid-but-unnecessary transfer route. */}
          {bestRoute && !isSearching && (
            <div className="ai-card">
              <div className="ai-header">
                <div>
                  <p className="section-label">Best Route</p>
                  <h3>{bestRoute.label}</h3>
                </div>
                <span className="ai-badge">
                  {bestRoute.transfers === 0
                    ? "Direct"
                    : `${bestRoute.transfers} transfer${bestRoute.transfers === 1 ? "" : "s"}`}
                </span>
              </div>

              <div className="best-route-board-row">
                <div className="best-route-board-item">
                  <span className="best-route-board-label"><i className="ti ti-circle-dot"></i> Board</span>
                  <strong>{bestRoute.stops[0]}</strong>
                </div>
                <i className="ti ti-arrow-right best-route-board-arrow"></i>
                <div className="best-route-board-item">
                  <span className="best-route-board-label"><i className="ti ti-map-pin"></i> Get off</span>
                  <strong>{bestRoute.stops[bestRoute.stops.length - 1]}</strong>
                </div>
              </div>

              {bestRoute.stops.length > 2 && (
                <div className="best-route-stops">
                  <p className="section-label">Stops</p>
                  <div className="best-route-stops-list">
                    {bestRoute.stops.map((stopName, i) => (
                      <div key={`${stopName}-${i}`} className="best-route-stop-row">
                        <span className={`best-route-stop-name${i === 0 || i === bestRoute.stops.length - 1 ? " endpoint" : ""}`}>
                          {stopName}
                        </span>
                        {i < bestRoute.stops.length - 1 && <i className="ti ti-arrow-down best-route-stop-arrow"></i>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="ai-meta">
                <span>₱{getDiscountedFare(bestRoute.fare)}</span>
                <span>{bestRoute.duration} min</span>
                <span>{bestRoute.transfers} transfer{bestRoute.transfers === 1 ? "" : "s"}</span>
              </div>
              <button
                type="button"
                className="ai-view-button"
                onClick={() => openRouteDetails(bestRoute)}
              >
                View details
              </button>
            </div>
          )}

          {/* Results controls */}
          <div className="results-controls">
            <div className="control-group">
              <label>Filter</label>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="control-select"
              >
                <option value="all">All transport</option>
                <option value="jeepney">Jeepney</option>
                <option value="bus">Bus</option>
                <option value="walk">Walk</option>
              </select>
            </div>
          </div>

          {/* Results display */}
          {isSearching ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner-dot"></div>
              </div>
              <p>Finding the best routes...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-search"></i>
              <p>{hasSelection ? "No routes found" : "No results yet"}</p>
              <span>
                {hasSelection
                  ? "Try another destination pair"
                  : "Enter a location and destination to search"}
              </span>
            </div>
          ) : alternativeRoutes.length > 0 && (
            <div className="routes-list">
              <p className="result-count">Other options</p>
              {alternativeRoutes.map((route) => {
                const pick = topPickMap.get(route.id);
                const badges = pick ? pick.badges : [];
                return (
                <div key={route.id} className="route-result-card">
                  <div className="route-result-header">
                    <div>
                      <h4 className="route-result-label">{route.label}</h4>
                      <p className="route-result-meta">
                        {route.type} • {route.transfers} transfer{route.transfers === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {badges.length > 0 && (
                    <div className="top-pick-badges">
                      {badges.map((badge) => (
                        <span key={badge.label} className="top-pick-badge">
                          <i className={`ti ${badge.icon}`}></i>
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="route-result-footer">
                    <div className="fare-block">
                      <span className="fare-label">Fare</span>
                      <strong className="fare-amount">₱{getDiscountedFare(route.fare)}</strong>
                    </div>
                    <div className="duration-block">
                      <span className="duration-label">Duration</span>
                      <strong className="duration-amount">{route.duration} min</strong>
                    </div>
                    <button
                      type="button"
                      className="route-view-button"
                      onClick={() => openRouteDetails(route)}
                    >
                      View details
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Grab — an additional option, never the default. Loads
              independently of the public-transit results above. */}
          {hasSelection && !isSearching && (
            <>
              {grabEstimate.status === "loading" && (
                <div className="grab-status-row">
                  <i className="ti ti-car"></i>
                  Grab · Getting fare estimate…
                </div>
              )}
              {grabEstimate.status === "unavailable" && (
                <div className="grab-status-row">
                  <i className="ti ti-car-off"></i>
                  Grab estimates are temporarily unavailable.
                </div>
              )}
              {grabEstimate.status === "ok" && (
                <div className="grab-section">
                  <p className="section-label">More ways to go</p>
                  {grabEstimate.services.map((service) => (
                    <GrabRideCard key={service.serviceID} service={service} from={from} to={to} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
          </>
        )}
      </BottomSheet>

      <BottomNav active={navTab} onChange={setNavTab} />
    </div>
  );
}
