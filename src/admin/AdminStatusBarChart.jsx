import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ENTITIES = [
  { key: "routes", label: "Routes" },
  { key: "terminals", label: "Terminals" },
  { key: "stops", label: "Stops" },
];

// "Active" is the point (is the network actually operating); "Inactive" is
// context — that's the emphasis job (1 accent hue + gray), not identity, so
// this deliberately does NOT reach for a categorical palette.
export default function AdminStatusBarChart() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(ENTITIES.map((e) => supabase.from(e.key).select("status"))).then((results) => {
      if (cancelled) return;
      setCounts(
        ENTITIES.map((e, i) => {
          const rows = results[i].data || [];
          const active = rows.filter((r) => r.status === "active").length;
          return { key: e.key, label: e.label, active, inactive: rows.length - active, total: rows.length };
        })
      );
    });
    return () => { cancelled = true; };
  }, []);

  const max = counts ? Math.max(1, ...counts.map((c) => c.total)) : 1;

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-header">
        <div>
          <p className="admin-chart-title">Network status</p>
          <p className="admin-chart-subtitle">Active vs. inactive records</p>
        </div>
        <div className="admin-chart-legend">
          <span className="admin-chart-legend-item"><span className="admin-chart-swatch active"></span>Active</span>
          <span className="admin-chart-legend-item"><span className="admin-chart-swatch inactive"></span>Inactive</span>
        </div>
      </div>

      {!counts ? (
        <div className="admin-chart-loading">Loading…</div>
      ) : (
        <div className="admin-status-bars">
          {counts.map((c, i) => (
            <div key={c.key} className="admin-status-bar-row">
              <span className="admin-status-bar-label">{c.label}</span>
              <div className="admin-status-bar-track">
                <div
                  className="admin-status-bar-fill active"
                  style={{ "--target-width": `${(c.active / max) * 100}%`, animationDelay: `${i * 80}ms` }}
                  title={`${c.active} active`}
                >
                  {c.active > 0 && <span className="admin-status-bar-value">{c.active}</span>}
                </div>
                {c.inactive > 0 && (
                  <div
                    className="admin-status-bar-fill inactive"
                    style={{ "--target-width": `${(c.inactive / max) * 100}%`, animationDelay: `${i * 80 + 60}ms` }}
                    title={`${c.inactive} inactive`}
                  >
                    <span className="admin-status-bar-value">{c.inactive}</span>
                  </div>
                )}
              </div>
              <span className="admin-status-bar-total">{c.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
