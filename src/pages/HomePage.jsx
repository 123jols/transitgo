import { useState } from "react";
import { searchStops, findRoutes, getPopularRoutes } from "../api/transit";
import { useLang } from "../context/LanguageContext";
import LangSwitcher from "../components/LangSwitcher";

const USER_TYPES = [
  { id: "regular", label: "Regular", discount: 0, icon: "ti-user" },
  { id: "student", label: "Student", discount: 0.2, icon: "ti-school" },
  { id: "pwd", label: "PWD", discount: 0.2, icon: "ti-wheelchair" },
  { id: "senior", label: "Senior", discount: 0.2, icon: "ti-heart" },
];

export default function HomePage({ onViewRoute }) {
  const { t } = useLang();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [fromResults, setFromResults] = useState([]);
  const [toResults, setToResults] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [userType, setUserType] = useState("regular");
  const [searched, setSearched] = useState(false);

  const currentUser = USER_TYPES.find((u) => u.id === userType);

  function handleFromChange(v) {
    setFrom(v);
    setFromId("");
    setFromResults(searchStops(v));
  }

  function handleToChange(v) {
    setTo(v);
    setToId("");
    setToResults(searchStops(v));
  }

  function handleSearch() {
    if (!fromId || !toId) return;
    const found = findRoutes(fromId, toId);
    setRoutes(found);
    setSearched(true);
  }

  function swap() {
    setFrom(to); setTo(from);
    setFromId(toId); setToId(fromId);
    setFromResults([]); setToResults([]);
    setRoutes([]); setSearched(false);
  }

  const popular = getPopularRoutes().slice(0, 4);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#080f1a", color: "#fff", paddingBottom: 32 }}>

      {/* Hero */}
      <div style={{ padding: "1.5rem 1.25rem 2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, left: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(25,118,210,0.15)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, right: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(0,137,123,0.12)", filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem", position: "relative" }}>
          <div style={{ width: 32, height: 32, background: "rgba(255,255,255,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-map-2" style={{ fontSize: 18, color: "#64b5f6" }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 500 }}>TransitGo</span>
        </div>

        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4, position: "relative" }}>t.whereGoing?</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem", position: "relative" }}>Find routes · Live ETAs · Cebu</div>

        {/* Search box */}
        <div style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.13)", borderRadius: 16, padding: "0.875rem", position: "relative" }}>
          {/* From */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 12px" }}>
              <i className="ti ti-current-location" style={{ color: "#64b5f6", fontSize: 18 }} />
              <input value={from} onChange={(e) => handleFromChange(e.target.value)} placeholder="From where?" style={{ flex: 1, fontSize: 15, color: "#fff", background: "transparent" }} />
              {fromId && <i className="ti ti-check" style={{ color: "#69f0ae", fontSize: 15 }} />}
            </div>
            {fromResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100, background: "#0d1e35", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 12, marginTop: 4, overflow: "hidden" }}>
                {fromResults.map((s) => (
                  <div key={s.id} onClick={() => { setFrom(s.name); setFromId(s.id); setFromResults([]); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.85)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <i className="ti ti-map-pin" style={{ marginRight: 8, color: "#64b5f6" }} />{s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Swap */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 8 }}>
            <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.1)" }} />
            <button onClick={swap} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <i className="ti ti-arrows-sort" style={{ fontSize: 13 }} />
            </button>
            <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* To */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 12px" }}>
              <i className="ti ti-map-pin" style={{ color: "#4db6ac", fontSize: 18 }} />
              <input value={to} onChange={(e) => handleToChange(e.target.value)} placeholder="Where to?" style={{ flex: 1, fontSize: 15, color: "#fff", background: "transparent" }} />
              {toId && <i className="ti ti-check" style={{ color: "#69f0ae", fontSize: 15 }} />}
            </div>
            {toResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100, background: "#0d1e35", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 12, marginTop: 4, overflow: "hidden" }}>
                {toResults.map((s) => (
                  <div key={s.id} onClick={() => { setTo(s.name); setToId(s.id); setToResults([]); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.85)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <i className="ti ti-map-pin" style={{ marginRight: 8, color: "#4db6ac" }} />{s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User type */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {USER_TYPES.map((u) => (
              <button key={u.id} onClick={() => setUserType(u.id)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "0.5px solid", borderColor: userType === u.id ? "#64b5f6" : "rgba(255,255,255,0.1)", background: userType === u.id ? "rgba(100,181,246,0.15)" : "rgba(255,255,255,0.05)", color: userType === u.id ? "#64b5f6" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500 }}>
                <i className={`ti ${u.icon}`} style={{ display: "block", fontSize: 16, marginBottom: 2 }} />
                {u.label}
              </button>
            ))}
          </div>

          <button onClick={handleSearch} disabled={!fromId || !toId} style={{ width: "100%", padding: "12px", borderRadius: 12, background: fromId && toId ? "#1976d2" : "rgba(255,255,255,0.08)", color: fromId && toId ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <i className="ti ti-route" /> Find Routes
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: "0 1.25rem" }}>
        {searched && routes.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            No routes found for this journey.
          </div>
        )}

        {routes.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              {routes.length} route{routes.length !== 1 ? "s" : ""} found
            </div>
            {routes.map((route, i) => {
              const fare = Math.round(route.fare * (1 - currentUser.discount));
              return (
                <div key={route.id} onClick={() => onViewRoute(route, { name: from, id: fromId }, { name: to, id: toId }, userType, currentUser.discount, currentUser.label)}
                  style={{ background: i === 0 ? "rgba(100,181,246,0.08)" : "rgba(255,255,255,0.06)", border: `0.5px solid ${i === 0 ? "rgba(100,181,246,0.35)" : "rgba(255,255,255,0.12)"}`, borderRadius: 14, padding: "1rem", marginBottom: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {i === 0 && <span style={{ background: "#1976d2", color: "#fff", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>Best</span>}
                    <span style={{ background: "rgba(100,181,246,0.15)", color: "#64b5f6", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>{route.type}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)", flex: 1 }}>{route.label}</span>
                    <i className="ti ti-chevron-right" style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }} />
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[
                      { icon: "ti-clock", text: `${route.duration} min` },
                      { icon: "ti-coin", text: `₱${fare}` },
                      { icon: "ti-arrows-transfer-down", text: `${route.transfers} transfer${route.transfers !== 1 ? "s" : ""}` },
                    ].map(({ icon, text }) => (
                      <span key={icon} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        <i className={`ti ${icon}`} style={{ fontSize: 13 }} />{text}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Popular routes */}
        {!searched && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Popular routes</div>
            {popular.map((p, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.875rem 1rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => { setFrom(p.from?.name || ""); setFromId(p.from?.id || ""); setTo(p.to?.name || ""); setToId(p.to?.id || ""); }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(100,181,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-route" style={{ fontSize: 16, color: "#64b5f6" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>₱{p.route?.fare} · {p.route?.duration} min</div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}