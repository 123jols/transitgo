export default function RouteMap({ stops, type }) {
  const origin = stops?.[0] || "";
  const destination = stops?.[stops.length - 1] || "";
  const query = `${origin} to ${destination}`;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <div className="route-map-container">
      <iframe
        title="Google Maps route preview"
        src={mapSrc}
        className="route-map-iframe"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
