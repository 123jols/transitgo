const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { key: "routes", label: "Routes", icon: "ti-route" },
  { key: "terminals", label: "Terminals", icon: "ti-bus-stop" },
  { key: "stops", label: "Stops", icon: "ti-map-pin" },
];

export default function AdminSidebar({ section, onSelect, open, onClose, adminEmail, onExit, onSignOut }) {
  const select = (key) => {
    onSelect(key);
    onClose();
  };

  return (
    <>
      {open && <div className="admin-drawer-backdrop" onClick={onClose}></div>}
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-icon"><i className="ti ti-map-2"></i></div>
          <span className="admin-sidebar-brand-text">TransitGo Admin</span>
        </div>

        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-nav-item ${section === item.key ? "active" : ""}`}
              onClick={() => select(item.key)}
            >
              <i className={`ti ${item.icon}`}></i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {adminEmail && <p className="admin-sidebar-account">{adminEmail}</p>}
          <button type="button" className="admin-nav-item" onClick={onExit}>
            <i className="ti ti-arrow-back"></i>
            Exit Admin
          </button>
          <button type="button" className="admin-nav-item" onClick={onSignOut}>
            <i className="ti ti-logout"></i>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
