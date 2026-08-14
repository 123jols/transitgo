import { useEffect, useRef, useState } from "react";
import { addRoute, findRoutes, getPopularRoutes, getStops, searchStops } from "../api/transit";
import RouteDetailsPage from "./RouteDetailsPage";
import WeatherTip from "../components/WeatherTip";
import ThemeToggle from "../components/ThemeToggle";
import MapExplorer from "../components/MapExplorer";
import TouristSpots from "../components/TouristSpots";
import NearbyTerminals from "../components/NearbyTerminals";
import BottomSheet from "../components/BottomSheet";
import BottomNav from "../components/BottomNav";
import TripsPage from "./TripsPage";
import ProfilePage from "./ProfilePage";

// Glassmorphic dropdown component for stop suggestions
function StopDropdown({ suggestions, onSelect, open }) {
  if (!open || !suggestions.length) return null;
  return (
    <div className="stop-dropdown">
      {suggestions.map((stop) => (
        <button
          key={stop.id}
          type="button"
          className="stop-dropdown-item"
          onClick={() => onSelect(stop)}
        >
          <i className="ti ti-map-pin" style={{ color: "#1976d2" }}></i>
          <div className="stop-dropdown-content">
            <p className="stop-name">{stop.name}</p>
            <p className="stop-type">Transit stop</p>
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
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [userType, setUserType] = useState("regular");
  const [routeFilter, setRouteFilter] = useState("all");
  const [sortBy, setSortBy] = useState("cheapest");
  const [recentSearches, setRecentSearches] = useState([]);
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
  const searchTimeoutRef = useRef(null);

  const popularRoutes = getPopularRoutes();
  const stops = getStops();

  const discounts = {
    regular: 0,
    student: 0.2,
    pwd: 0.3,
    tourist: 0.1,
  };

  const userLabels = {
    regular: "Regular",
    student: "Student",
    pwd: "PWD",
    tourist: "Tourist",
  };

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

  const getSearchLabel = (source, destination) => `${source.name} → ${destination.name}`;

  const getDiscountedFare = (fare) => {
    const discount = discounts[userType] || 0;
    return Math.round(fare * (1 - discount));
  };

  const getDiscountLabel = () => {
    if (userType === "regular") return "";
    return `${Math.round((discounts[userType] || 0) * 100)}% ${userLabels[userType]} discount`;
  };

  const getAiRouteScore = (route) => {
    const fareScore = getDiscountedFare(route.fare) * 1.3;
    const durationScore = route.duration * 1.1;
    const transferScore = route.transfers * 22;
    const typeBonus = route.type === "walk" ? -10 : route.type === "bus" ? 4 : 0;
    return fareScore + durationScore + transferScore + typeBonus;
  };

  const getAiRecommendedRoute = (routes) => {
    if (!routes.length) return null;
    return routes.reduce((best, current) => {
      return getAiRouteScore(current) < getAiRouteScore(best) ? current : best;
    }, routes[0]);
  };

  const getAiRecommendationCopy = (route) => {
    if (!route) return "";
    if (route.transfers === 0 && route.duration <= 25) {
      return "The AI recommends this no-transfer route as the clearest balance of speed and price.";
    }
    if (userType === "student" || userType === "pwd") {
      return `Smart choice for ${userLabels[userType]} riders: low fare with an easy boarding experience.`;
    }
    if (route.type === "walk") {
      return "A zero-fare connection that is ideal for short, direct travel.";
    }
    return "A balanced route with strong performance across cost and travel time.";
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
    const value = e.target.value;
    setFromQuery(value);
    setFrom(null);
    setFromSuggestions(value ? searchStops(value) : []);
  };

  const handleToChange = (e) => {
    const value = e.target.value;
    setToQuery(value);
    setTo(null);
    setToSuggestions(value ? searchStops(value) : []);
  };

  const selectFrom = (stop) => {
    setFrom(stop);
    setFromQuery(stop.name);
    setFromSuggestions([]);
  };

  const selectTo = (stop) => {
    setTo(stop);
    setToQuery(stop.name);
    setToSuggestions([]);
  };

  const swapStops = () => {
    if (!from && !to) return;
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
  };

  const applyPopularRoute = (route) => {
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

  const applyTerminalStop = (stop) => {
    setFrom(stop);
    setFromQuery(stop.name);
    setFromSuggestions([]);
    setNavTab("home");
    setActiveTab("search");
  };

  const applyAttractionStop = (stop) => {
    setTo(stop);
    setToQuery(stop.name);
    setToSuggestions([]);
    setNavTab("home");

    if (from) {
      setActiveTab("results");
      setIsSearching(true);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = window.setTimeout(() => {
        executeSearch(from, stop);
        searchTimeoutRef.current = null;
      }, 220);
    } else {
      setActiveTab("search");
    }
  };

  const openRouteDetails = (route) => {
    setRouteDetails(route);
    setActiveTab("details");
  };

  const backToResults = () => {
    setRouteDetails(null);
    setActiveTab("results");
  };

  const filteredResults = results.filter((route) => {
    if (routeFilter === "all") return true;
    return route.type.toLowerCase() === routeFilter;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "cheapest") {
      return getDiscountedFare(a.fare) - getDiscountedFare(b.fare);
    }
    if (sortBy === "fastest") {
      return a.duration - b.duration;
    }
    if (sortBy === "fewest") {
      return a.transfers - b.transfers;
    }
    return 0;
  });

  const routeCount = sortedResults.length;
  const hasSelection = Boolean(from && to);
  const aiRecommendedRoute = getAiRecommendedRoute(sortedResults);
  const aiRecommendationCopy = getAiRecommendationCopy(aiRecommendedRoute);

  // Top picks: fastest / cheapest / fewest-transfers, deduped so a route that
  // wins multiple categories shows one card with multiple badges instead of repeats.
  const topPickCategories = [
    { label: "Fastest", icon: "ti-bolt", route: [...filteredResults].sort((a, b) => a.duration - b.duration)[0] },
    { label: "Cheapest", icon: "ti-currency-peso", route: [...filteredResults].sort((a, b) => getDiscountedFare(a.fare) - getDiscountedFare(b.fare))[0] },
    { label: "Fewest transfers", icon: "ti-arrows-shuffle", route: [...filteredResults].sort((a, b) => a.transfers - b.transfers)[0] },
  ];
  const topPickMap = new Map();
  topPickCategories.forEach(({ label, icon, route }) => {
    if (!route) return;
    if (!topPickMap.has(route.id)) topPickMap.set(route.id, { route, badges: [] });
    topPickMap.get(route.id).badges.push({ label, icon });
  });
  const topPicks = [...topPickMap.values()];

  const currentDiscountText = userType === "regular" ? "No discount" : getDiscountLabel();

  if (routeDetails) {
    return (
      <RouteDetailsPage
        route={routeDetails}
        from={from}
        to={to}
        userType={userType}
        discountRate={discounts[userType] || 0}
        userLabel={userLabels[userType]}
        onBack={backToResults}
      />
    );
  }

  if (navTab === "trips") {
    return (
      <>
        <TripsPage stops={stops} onSelectTerminal={applyTerminalStop} />
        <BottomNav active={navTab} onChange={setNavTab} />
      </>
    );
  }

  if (navTab === "profile") {
    return (
      <>
        <ProfilePage stops={stops} onSelectTerminal={applyTerminalStop} />
        <BottomNav active={navTab} onChange={setNavTab} />
      </>
    );
  }

  return (
    <div className="home-shell">
      {/* Full-screen map background */}
      <div className="home-map-layer">
        <MapExplorer fullscreen showSearchOverlay={navTab === "explore"} />
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
            <h2 className="hero-headline">Explore the map</h2>
            <p className="hero-subhead">Search anywhere · Drag pins to fine-tune</p>
            <NearbyTerminals stops={stops} onSelect={applyTerminalStop} />
            <div className="tips-section">
              <p className="section-label">Tips</p>
              <div className="tips-grid">
                <div className="tip-card">
                  <i className="ti ti-road"></i>
                  <p>Directions follow roads — jeepneys and buses may take a slightly different path</p>
                </div>
                <div className="tip-card">
                  <i className="ti ti-search"></i>
                  <p>Search any mall, terminal, or barangay to get directions there</p>
                </div>
                <div className="tip-card">
                  <i className="ti ti-arrows-sort"></i>
                  <p>Use the swap button to flip your starting point and destination</p>
                </div>
                <div className="tip-card">
                  <i className="ti ti-currency-peso"></i>
                  <p>For fares and jeepney/bus codes, switch to the Home tab</p>
                </div>
              </div>
            </div>
            <TouristSpots stops={stops} onSelect={applyAttractionStop} />
          </>
        )}

        {navTab === "home" && (
          <>
        {/* Headline and subhead */}
        <h2 className="hero-headline">Where are you going?</h2>
        <p className="hero-subhead">Find routes · Live ETAs · Cebu</p>

        {/* Search box - glassmorphic card */}
        <div className="search-card">
          <div className="search-field from-field">
            <i className="ti ti-current-location"></i>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={fromQuery}
                onChange={handleFromChange}
                placeholder="Your location"
                className="search-input"
                autoComplete="off"
              />
              <StopDropdown
                suggestions={fromSuggestions}
                onSelect={selectFrom}
                open={fromSuggestions.length > 0}
              />
            </div>
          </div>

          <button
            type="button"
            className="swap-button"
            onClick={swapStops}
            disabled={!hasSelection || isSearching}
            title="Swap origin and destination"
          >
            <i className="ti ti-arrows-sort"></i>
          </button>

          <div className="search-field to-field">
            <i className="ti ti-map-pin"></i>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={toQuery}
                onChange={handleToChange}
                placeholder="Where to?"
                className="search-input"
                autoComplete="off"
              />
              <StopDropdown
                suggestions={toSuggestions}
                onSelect={selectTo}
                open={toSuggestions.length > 0}
              />
            </div>
          </div>

          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="user-type-select"
          >
            <option value="regular">Regular</option>
            <option value="student">Student</option>
            <option value="pwd">PWD</option>
            <option value="tourist">Tourist</option>
          </select>

          <button
            type="button"
            className="find-routes-button"
            onClick={handleSearch}
            disabled={!hasSelection || isSearching}
          >
            {isSearching ? "Searching…" : "Find Routes"}
          </button>
        </div>

        {/* Quick destination chips */}
        {popularRoutes.length > 0 && (
          <div className="quick-chips-row">
            <p className="section-label">Popular routes</p>
            <div className="chips-scroll-wrapper">
              <div className="chips-scroll">
                {popularRoutes.map((route) => (
                  <button
                    key={`${route.from.id}-${route.to.id}`}
                    type="button"
                    className="quick-chip"
                    onClick={() => applyPopularRoute(route)}
                  >
                    <i className="ti ti-sparkles"></i>
                    <span>{route.from.name.split(" ")[0]} → {route.to.name.split(" ")[0]}</span>
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
          <NearbyTerminals stops={stops} onSelect={applyTerminalStop} />

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="recent-section">
              <p className="section-label">Recent</p>
              <div className="recent-card">
                {recentSearches.map((search, idx) => (
                  <button
                    key={search.label}
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
                    {idx < recentSearches.length - 1 && <div className="row-divider"></div>}
                  </button>
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
          {/* Top picks */}
          {topPicks.length > 0 && !isSearching && (
            <div className="top-picks-row">
              {topPicks.map(({ route, badges }) => (
                <button
                  key={route.id}
                  type="button"
                  className="top-pick-card"
                  onClick={() => openRouteDetails(route)}
                >
                  <div className="top-pick-badges">
                    {badges.map((badge) => (
                      <span key={badge.label} className="top-pick-badge">
                        <i className={`ti ${badge.icon}`}></i>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <p className="top-pick-label">{route.label}</p>
                  <div className="top-pick-meta">
                    <span>₱{getDiscountedFare(route.fare)}</span>
                    <span>{route.duration} min</span>
                    <span>{route.transfers} transfer{route.transfers === 1 ? "" : "s"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* AI recommendation */}
          {aiRecommendedRoute && !isSearching && (
            <div className="ai-card">
              <div className="ai-header">
                <div>
                  <p className="section-label">AI Recommendation</p>
                  <h3>{aiRecommendedRoute.label}</h3>
                </div>
                <span className="ai-badge">Recommended</span>
              </div>
              <p className="ai-copy">{aiRecommendationCopy}</p>
              <div className="ai-meta">
                <span>₱{getDiscountedFare(aiRecommendedRoute.fare)}</span>
                <span>{aiRecommendedRoute.duration} min</span>
                <span>{aiRecommendedRoute.transfers} transfer{aiRecommendedRoute.transfers === 1 ? "" : "s"}</span>
              </div>
              <button
                type="button"
                className="ai-view-button"
                onClick={() => openRouteDetails(aiRecommendedRoute)}
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
            <div className="control-group">
              <label>Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="control-select"
              >
                <option value="cheapest">Cheapest</option>
                <option value="fastest">Fastest</option>
                <option value="fewest">Fewest transfers</option>
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
          ) : sortedResults.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-search"></i>
              <p>{hasSelection ? "No routes found" : "No results yet"}</p>
              <span>
                {hasSelection
                  ? "Try another destination pair"
                  : "Enter a location and destination to search"}
              </span>
            </div>
          ) : (
            <div className="routes-list">
              <p className="result-count">{routeCount} route{routeCount === 1 ? "" : "s"} found</p>
              {sortedResults.map((route) => (
                <div key={route.id} className="route-result-card">
                  <div className="route-result-header">
                    <div>
                      <h4 className="route-result-label">{route.label}</h4>
                      <p className="route-result-meta">
                        {route.type} • {route.transfers} transfer{route.transfers === 1 ? "" : "s"}
                      </p>
                    </div>
                    {aiRecommendedRoute?.id === route.id && (
                      <span className="route-badge-ai">AI top pick</span>
                    )}
                  </div>
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
              ))}
            </div>
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
