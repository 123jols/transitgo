import NearbyTerminals from "../components/NearbyTerminals";

export default function TripsPage({ stops, onSelectTerminal }) {
  return (
    <div className="static-page">
      <h2 className="route-label">Trips</h2>
      <div className="empty-state">
        <i className="ti ti-route"></i>
        <p>No trip history yet</p>
        <span>Routes you search will show up here once this feature is ready.</span>
      </div>
      <NearbyTerminals stops={stops} onSelect={onSelectTerminal} />
    </div>
  );
}
