import { useState } from "react";
import { searchStops, findRoutes, getPopularRoutes } from "../api/transit";
import { useLang } from "../context/LanguageContext";
import LangSwitcher from "../components/LangSwitcher";

const USER_TYPES = [
  { id: "regular", labelKey: "regular", discount: 0,   icon: "ti-user"       },
  { id: "student", labelKey: "student", discount: 0.2, icon: "ti-school"     },
  { id: "pwd",     labelKey: "pwd",     discount: 0.2, icon: "ti-wheelchair" },
  { id: "senior",  labelKey: "senior",  discount: 0.2, icon: "ti-heart"      },
];

const TYPE_COLOR = {
  jeepney: "#e2a53a",
  bus:     "#5b93c9",
  walk:    "#4fae94",
};

function routeCode(route) {
  if (route.type === "walk") return "WALK";
  const parts = route.label.split(" ");
  return parts[parts.length - 1].toUpperCase();
}

export default function HomePage({ onViewRoute }) {
  const { t } = useLang();
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [fromId,      setFromId]      = useState("");
  const [toId,        setToId]        = useState("");
  const [fromResults, setFromResults] = useState([]);
  const [toResults,   setToResults]   = useState([]);
  const [routes,      setRoutes]      = useState([]);
  const [userType,    setUserType]    = useState("regular");
  const [searched,    setSearched]    = useState(false);

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
    setFrom(to);   setTo(from);
    setFromId(toId); setToId(fromId);
    setFromResults([]); setToResults([]);
    setRoutes([]); setSearched(false);
  }

  const popular = getPopularRoutes().slice(0, 4);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#0a0e14", color: "#fff", paddingBottom: 32 }}>

      {/* Hero */}
      <div style={{ padding: "1.5rem 1.25rem 2rem" }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 22, border: "1.5px solid #e2a53a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 11, fontWeight: 600, color: "#e2a53a", letterSpacing: "0.02em" }}>TG</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{t.appName}</span>
          </div>
          <LangSwitcher />
        </div>

        <div style={{ fontSize: 21, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>{t.whereGoing}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem" }}>{t.tagline}</div>

        {/* Search box */}
        <div style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "0.875rem" }}>

          {/* From */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "10px 12px" }}>
              <i className="ti ti-current-location" style={{ color: "#5b93c9", fontSize: 18 }} />
              <input
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
                placeholder={t.fromWhere}
                style={{ flex: 1, fontSize: 15, color: "#fff", background: "transparent" }}
              />
              {fromId && <i className="ti ti-check" style={{ color: "#5fcf8e", fontSize: 15 }} />}
            </div>
            {fromResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100, background: "#0d1420", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, marginTop: 4, overflow: "hidden" }}>
                {fromResults.map((s) => (
                  <div key={s.id} onClick={() => { setFrom(s.name); setFromId(s.id); setFromResults([]); }}
                    style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <i className="ti ti-map-pin" style={{ marginRight: 8, color: "#5b93c9" }} />{s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Swap */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <button onClick={swap} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <i className="ti ti-arrows-sort" style={{ fontSize: 13 }} />
            </button>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* To */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "10px 12px" }}>
              <i className="ti ti-map-pin" style={{ color: "#4fae94", fontSize: 18 }} />
              <input
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
                placeholder={t.whereTo}
                style={{ flex: 1, fontSize: 15, color: "#fff", background: "transparent" }}
              />
              {toId && <i className="ti ti-check" style={{ color: "#5fcf8e", fontSize: 15 }} />}
            </div>
            {toResults.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 100, background: "#0d1420", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, marginTop: 4, overflow: "hidden" }}>
                {toResults.map((s) => (
                  <div key={s.id} onClick={() => { setTo(s.name); setToId(s.id); setToResults([]); }}
                    style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <i className="ti ti-map-pin" style={{ marginRight: 8, color: "#4fae94" }} />{s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User type */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {USER_TYPES.map((u) => (
              <button key={u.id} onClick={() => setUserType(u.id)}
                style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "1px solid", borderColor: userType === u.id ? "#e2a53a" : "rgba(255,255,255,0.1)", background: userType === u.id ? "rgba(226,165,58,0.14)" : "rgba(255,255,255,0.05)", color: userType === u.id ? "#e2a53a" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500 }}>
                <i className={`ti ${u.icon}`} style={{ display: "block", fontSize: 16, marginBottom: 2 }} />
                {t[u.labelKey]}
              </button>
            ))}
          </div>

          {/* Find Routes button */}
          <button onClick={handleSearch} disabled={!fromId || !toId}
            style={{ width: "100%", padding: "12px", borderRadius: 6, background: fromId && toId ? "#e2a53a" : "rgba(255,255,255,0.08)", color: fromId && toId ? "#1a1408" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <i className="ti ti-route" /> {t.findRoutes}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: "0 1.25rem" }}>
        {searched && routes.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            {t.noRoutes}
          </div>
        )}

        {routes.length > 0 && (
          <>
            <div className="section-label">
              {routes.length} {t.routesFound}
            </div>
            {routes.map((route, i) => {
              const fare = Math.round(route.fare * (1 - currentUser.discount));
              const typeColor = TYPE_COLOR[route.type] || "#5b93c9";
              return (
                <div key={route.id}
                  onClick={() => onViewRoute(route, { name: from, id: fromId }, { name: to, id: toId }, userType, currentUser.discount, t[currentUser.labelKey])}
                  style={{ background: i === 0 ? "rgba(226,165,58,0.07)" : "rgba(255,255,255,0.045)", border: `1px solid ${i === 0 ? "rgba(226,165,58,0.35)" : "rgba(255,255,255,0.10)"}`, borderRadius: 8, padding: "1rem", marginBottom: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {i === 0 && <span style={{ background: "#e2a53a", color: "#1a1408", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>{t.best}</span>}
                    <span style={{ background: `${typeColor}29`, color: typeColor, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>{route.type}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)", flex: 1 }}>{route.label}</span>
                    <i className="ti ti-chevron-right" style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }} />
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[
                      { icon: "ti-clock",              text: `${route.duration} min` },
                      { icon: "ti-coin",               text: `₱${fare}`              },
                      { icon: "ti-arrows-transfer-down",text: `${route.transfers} ${t.transfers}` },
                    ].map(({ icon, text }) => (
                      <span key={icon} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "'Fira Code', monospace", color: "rgba(255,255,255,0.5)" }}>
                        <i className={`ti ${icon}`} style={{ fontSize: 13, fontFamily: "initial" }} />{text}
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
            <div className="section-label">
              {t.popularRoutes}
            </div>
            {popular.map((p, i) => (
              <div key={i}
                onClick={() => { setFrom(p.from?.name || ""); setFromId(p.from?.id || ""); setTo(p.to?.name || ""); setToId(p.to?.id || ""); }}
                style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "0.875rem 1rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ minWidth: 44, padding: "3px 0", border: `1px solid ${TYPE_COLOR[p.route?.type] || "#5b93c9"}55`, borderRadius: 4, textAlign: "center" }}>
                  <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 11, fontWeight: 600, color: TYPE_COLOR[p.route?.type] || "#5b93c9" }}>
                    {p.route ? routeCode(p.route) : "—"}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "'Fira Code', monospace" }}>₱{p.route?.fare} · {p.route?.duration} min</div>
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
