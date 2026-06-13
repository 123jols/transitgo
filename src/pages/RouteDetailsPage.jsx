export default function RouteDetailsPage({
  route, from, to, userType, discountRate, userLabel, onBack,
}) {
  const discountedFare = Math.round(route.fare * (1 - discountRate));
  const savings = route.fare - discountedFare;
  const stops = route.stops || [from.name, to.name];
  const aiInsight = discountRate > 0
    ? `Smart pick for ${userLabel} riders: maximizes savings with excellent timing.`
    : route.transfers === 0
    ? "Direct route with zero transfers — fastest path to destination."
    : "Balanced route delivering strong value across cost, time, and convenience.";

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#080f1a", color: "#fff", padding: "1.25rem" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, marginBottom: "1.25rem", cursor: "pointer" }}>
        <i className="ti ti-arrow-left" /> Back to results
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{route.label}</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1.25rem" }}>
        <span style={{ background: "rgba(100,181,246,0.15)", color: "#64b5f6", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>{route.type}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{from.name} → {to.name}</span>
      </div>

      <div style={{ background: "rgba(100,181,246,0.08)", border: "0.5px solid rgba(100,181,246,0.2)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: 11, color: "#64b5f6", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Insight</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{aiInsight}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
        {[
          { label: "Fare", value: `₱${discountedFare}`, sub: discountRate > 0 ? `Save ₱${savings}` : null },
          { label: "Duration", value: `${route.duration} min`, sub: null },
          { label: "Transfers", value: route.transfers, sub: null },
          { label: "Rider Type", value: userLabel, sub: null },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.875rem" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#fff" }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "#69f0ae", marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Stops along the route</div>
        {stops.map((stop, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < stops.length - 1 ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(100,181,246,0.15)", border: "1.5px solid #64b5f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#64b5f6", fontWeight: 500 }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{stop}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "1rem" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tips</div>
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