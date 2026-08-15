const STAT_STYLE = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  flex: 1,
  minWidth: 0,
};

const LABEL_STYLE = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const VALUE_STYLE = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--text-primary)",
};

function Skeleton() {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={STAT_STYLE}>
          <div style={{ width: 28, height: 8, borderRadius: 4, background: "var(--bg-disabled)", animation: `pulse 1.2s ${i * 0.1}s infinite` }} />
          <div style={{ width: 36, height: 14, borderRadius: 4, background: "var(--bg-disabled)", animation: `pulse 1.2s ${i * 0.1}s infinite` }} />
        </div>
      ))}
    </div>
  );
}

// Compact Fare/ETA/Transfers/Walking summary above the assistant map.
// `trip` is a findRoutesBetween() result; `syntheticWalkMinutes` is the
// first-mile GPS-to-nearest-stop walk that assembleTripGeometry() computes
// separately since it isn't part of the graph (and so isn't in trip.duration).
export default function FareEtaCard({ trip, syntheticWalkMinutes = 0, loading }) {
  if (loading) return <Skeleton />;
  if (!trip) return null;

  const eta = trip.duration + syntheticWalkMinutes;
  const walkLegMinutes = (trip.legs || [])
    .filter((l) => l.kind === "walk")
    .reduce((sum, l) => sum + l.duration, 0);
  const totalWalkMinutes = syntheticWalkMinutes + walkLegMinutes;

  const stats = [
    { label: "Fare", value: `₱${trip.fare}` },
    { label: "ETA", value: `${eta} min` },
    { label: "Transfers", value: trip.transfers },
    { label: "Walking", value: `${totalWalkMinutes} min` },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "10px 12px",
        background: "var(--bg-surface-alt)",
        borderBottom: "1px solid rgba(var(--border-rgb), 0.10)",
      }}
    >
      {stats.map((stat) => (
        <div key={stat.label} style={STAT_STYLE}>
          <span style={LABEL_STYLE}>{stat.label}</span>
          <span style={VALUE_STYLE}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
