export default function TripsPage({ trips, onOpenTrip, onRemoveTrip }) {
  return (
    <div className="static-page">
      <h2 className="route-label">Trips</h2>

      {trips.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-route"></i>
          <p>No trip history yet</p>
          <span>Tap "Add to Trips" on a route's details page to save it here.</span>
        </div>
      ) : (
        <div className="recent-section">
          <p className="section-label">Saved trips</p>
          <div className="trips-list">
            {trips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <button type="button" className="trip-row-main" onClick={() => onOpenTrip(trip)}>
                  <div className="recent-icon">
                    <i className="ti ti-bookmark"></i>
                  </div>
                  <div className="recent-content">
                    <p className="recent-name">{trip.from.name} → {trip.to.name}</p>
                    <p className="recent-type">{trip.route.label} · ₱{trip.route.fare} · {trip.route.duration} min</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="trip-remove-button"
                  onClick={() => onRemoveTrip(trip.id)}
                  title="Remove from Trips"
                >
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
