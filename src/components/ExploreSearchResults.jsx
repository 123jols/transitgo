import { haversineDistanceKm } from "../utils/geo";
import ExplorePlaceCard from "./ExplorePlaceCard";

const GROUP_META = {
  terminal: { label: "Terminals", icon: "ti-bus-stop" },
  attraction: { label: "Tourist Spots", icon: "ti-map-pin" },
  stop: { label: "Stops", icon: "ti-map-pin-filled" },
};

function groupOf(result) {
  if (result.id.startsWith("terminal-")) return "terminal";
  if (result.id.startsWith("attraction-")) return "attraction";
  return "stop";
}

// Renders whatever searchDestinations() (api/transit.js) already returns —
// the same real stop/terminal/attraction search the Home tab's From/To
// fields use — grouped by place type instead of building a second search
// implementation just for Explore.
export default function ExploreSearchResults({ results, myCoords, onDirections }) {
  if (results.length === 0) {
    return <p className="explore-empty-state">No places found.</p>;
  }

  const groups = { stop: [], terminal: [], attraction: [] };
  results.forEach((r) => groups[groupOf(r)].push(r));

  return (
    <div className="explore-section">
      {["attraction", "terminal", "stop"].map((key) => {
        const items = groups[key];
        if (items.length === 0) return null;
        const meta = GROUP_META[key];
        return (
          <div key={key} className="explore-search-group">
            <p className="explore-search-group-label">{meta.label}</p>
            <div className="explore-nearby-list">
              {items.map((r) => (
                <ExplorePlaceCard
                  key={r.id}
                  icon={meta.icon}
                  name={r.label}
                  category={meta.label.replace(/s$/, "")}
                  address={r.subtitle}
                  distanceKm={myCoords && r.stop ? haversineDistanceKm(myCoords, r.stop) : null}
                  onDirections={() => r.stop && onDirections(r.stop)}
                  disabled={!r.stop}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
