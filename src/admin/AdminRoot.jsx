import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useUserProfile from "../hooks/useUserProfile";
import AdminSidebar from "./AdminSidebar";
import AdminDashboardPage from "./AdminDashboardPage";
import AdminRoutesPage from "./AdminRoutesPage";
import AdminTerminalsPage from "./AdminTerminalsPage";
import AdminStopsPage from "./AdminStopsPage";

const SECTION_TITLES = {
  dashboard: "Dashboard",
  routes: "Routes",
  terminals: "Terminals",
  stops: "Stops",
};

function AdminMessageScreen({ icon, title, body, action }) {
  return (
    <div className="admin-message-screen">
      <div className="admin-message-card">
        <i className={`ti ${icon}`}></i>
        <h2>{title}</h2>
        <p>{body}</p>
        {action}
      </div>
    </div>
  );
}

// The UI gate here (redirect a non-admin away) is a courtesy, not the real
// security boundary — every actual read/write an admin page makes goes
// through Supabase Row Level Security policies keyed off profiles.is_admin
// (see supabase/migrations/003_admin_foundation.sql), so a client that
// somehow rendered this component without being an admin still couldn't
// write anything.
export default function AdminRoot() {
  const { user, isConfigured, signOut } = useAuth();
  const { profile, loading } = useUserProfile();
  const [section, setSection] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const goToApp = () => window.location.assign("/");

  if (!isConfigured) {
    return (
      <AdminMessageScreen
        icon="ti-cloud-off"
        title="Cloud sync isn't configured"
        body="The admin dashboard needs Supabase configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)."
        action={<button type="button" className="auth-submit-btn" onClick={goToApp}>Go to TransitGo</button>}
      />
    );
  }

  if (!user) {
    return (
      <AdminMessageScreen
        icon="ti-lock"
        title="Sign in required"
        body="Sign in to your TransitGo account to reach the admin dashboard."
        action={<button type="button" className="auth-submit-btn" onClick={goToApp}>Go to TransitGo</button>}
      />
    );
  }

  if (loading) {
    return (
      <div className="auth-gate-loading">
        <div className="loading-state">
          <div className="loading-spinner"><div className="spinner-dot"></div></div>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return (
      <AdminMessageScreen
        icon="ti-shield-x"
        title="Not authorized"
        body="Your account doesn't have admin access."
        action={<button type="button" className="auth-submit-btn" onClick={goToApp}>Go to TransitGo</button>}
      />
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar
        section={section}
        onSelect={setSection}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        adminEmail={user.email}
        onExit={goToApp}
        onSignOut={signOut}
      />
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-btn" onClick={() => setDrawerOpen(true)}>
            <i className="ti ti-menu-2"></i>
          </button>
          <span className="admin-topbar-title">{SECTION_TITLES[section]}</span>
        </header>
        <div className="admin-content">
          {section === "dashboard" && <AdminDashboardPage />}
          {section === "routes" && <AdminRoutesPage />}
          {section === "terminals" && <AdminTerminalsPage />}
          {section === "stops" && <AdminStopsPage />}
        </div>
      </div>
    </div>
  );
}
