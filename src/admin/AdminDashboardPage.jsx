import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AdminSignupsChart from "./AdminSignupsChart";
import AdminStatusBarChart from "./AdminStatusBarChart";

// Every card is a real count query — no hardcoded numbers. A card whose
// query errors (e.g. a brand-new project that hasn't run the admin
// migration yet) shows 0 rather than crashing the dashboard.
const CARD_DEFS = [
  { key: "totalUsers", label: "Total Users", icon: "ti-users", query: () => supabase.from("profiles").select("*", { count: "exact", head: true }) },
  { key: "students", label: "Students", icon: "ti-school", query: () => supabase.from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "student") },
  { key: "regular", label: "Regular Users", icon: "ti-user", query: () => supabase.from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "regular") },
  { key: "activeRoutes", label: "Active Routes", icon: "ti-route", query: () => supabase.from("routes").select("*", { count: "exact", head: true }).eq("status", "active") },
  { key: "activeTerminals", label: "Active Terminals", icon: "ti-bus-stop", query: () => supabase.from("terminals").select("*", { count: "exact", head: true }).eq("status", "active") },
  { key: "activeStops", label: "Active Stops", icon: "ti-map-pin", query: () => supabase.from("stops").select("*", { count: "exact", head: true }).eq("status", "active") },
  { key: "totalTrips", label: "Total Saved Trips", icon: "ti-bookmark", query: () => supabase.from("saved_trips").select("*", { count: "exact", head: true }) },
];

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CARD_DEFS.map((c) => c.query())).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((res, i) => { next[CARD_DEFS[i].key] = res.error ? 0 : (res.count || 0); });
      setCounts(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">TransitGo Admin Dashboard</h1>
      <p className="admin-page-subtitle">Manage transportation data and monitor TransitGo activity.</p>

      <div className="admin-cards-grid">
        {CARD_DEFS.map((c, i) => (
          <div key={c.key} className="admin-stat-card admin-fade-in" style={{ animationDelay: `${i * 45}ms` }}>
            <div className="admin-stat-icon"><i className={`ti ${c.icon}`}></i></div>
            <div>
              <p className="admin-stat-value">{loading ? "…" : counts[c.key] ?? 0}</p>
              <p className="admin-stat-label">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-charts-grid">
        <div className="admin-fade-in" style={{ animationDelay: "320ms" }}>
          <AdminSignupsChart />
        </div>
        <div className="admin-fade-in" style={{ animationDelay: "380ms" }}>
          <AdminStatusBarChart />
        </div>
      </div>
    </div>
  );
}
