import { useState } from "react";

const TYPE_COLOR = {
  jeepney: "#e2a53a",
  bus:     "#5b93c9",
  walk:    "#4fae94",
};

export default function RouteDetailsPage({
  route, from, to, discountRate, userLabel, onBack,
}) {
  const [copied, setCopied] = useState(false);
  const discountedFare = Math.round(route.fare * (1 - discountRate));
  const savings = route.fare - discountedFare;
  const stops = route.stops || [from.name, to.name];
  const typeColor = TYPE_COLOR[route.type] || "#5b93c9";
  const routeNote = discountRate > 0
    ? `Best value for ${userLabel} riders — the discount applies to the full fare.`
    : route.transfers === 0
    ? "Direct route with zero transfers — fastest path to destination."
    : "Balanced route: reasonable cost, time, and number of transfers.";

  async function shareRoute() {
    const text = `${route.label} — ${from.name} to ${to.name}\n₱${discountedFare} · ${route.duration} min · ${route.transfers} transfer${route.transfers === 1 ? "" : "s"}\n\nFound via TransitGo`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "TransitGo route", text });
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#0a0e14", color: "#fff", padding: "1.25rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
        <button onClick={onBack} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer" }}>
          <i className="ti ti-arrow-left" /> Back to results
        </button>
        <button onClick={shareRoute} style={{ display: "flex", alignItems: "center", gap: 6, background: copied ? "rgba(95,207,142,0.14)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(95,207,142,0.4)" : "rgba(255,255,255,0.14)"}`, borderRadius: 6, padding: "8px 14px", color: copied ? "#5fcf8e" : "#fff", fontSize: 13, cursor: "pointer" }}>
          <i className={`ti ${copied ? "ti-check" : "ti-share-2"}`} /> {copied ? "Copied" : "Share"}
        </button>
      </div>

      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>{route.label}</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1.25rem" }}>
        <span style={{ background: `${typeColor}29`, color: typeColor, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{route.type}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{from.name} → {to.name}</span>
      </div>

      <div style={{ background: "rgba(226,165,58,0.07)", border: "1px solid rgba(226,165,58,0.22)", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
        <div className="section-label" style={{ color: "#e2a53a", marginBottom: 6 }}>Why this route</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{routeNote}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
        {[
          { label: "Fare", value: `₱${discountedFare}`, sub: discountRate > 0 ? `Save ₱${savings}` : null },
          { label: "Duration", value: `${route.duration} min`, sub: null },
          { label: "Transfers", value: route.transfers, sub: null },
          { label: "Rider type", value: userLabel, sub: null },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "0.875rem" }}>
            <div className="field-label">{label}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: "#fff", fontFamily: "'Fira Code', monospace" }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "#5fcf8e", marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Stops along the route</div>
        {stops.map((stop, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < stops.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: "rgba(226,165,58,0.14)", border: "1.5px solid #e2a53a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#e2a53a", fontWeight: 600, fontFamily: "'Fira Code', monospace" }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{stop}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "1rem" }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Tips</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
          {route.type === "walk"
            ? "Perfect for short distances. Wear comfortable shoes and check the weather."
            : route.transfers > 1
            ? "Multiple transfers — plan extra time and keep change handy."
            : "Straightforward route. Have your fare ready for quick boarding."}
        </div>
      </div>
    </div>
  );
}
