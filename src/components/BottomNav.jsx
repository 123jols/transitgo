const TABS = [
  { key: "home", label: "Home", icon: "ti-home" },
  { key: "explore", label: "Explore", icon: "ti-map-2" },
  { key: "trips", label: "Trips", icon: "ti-route" },
  { key: "terminals", label: "Terminals", icon: "ti-bus-stop" },
  { key: "profile", label: "Profile", icon: "ti-user" },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`bottom-nav-item ${active === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          <i className={`ti ${tab.icon}`}></i>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
