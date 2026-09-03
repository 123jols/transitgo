import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import AdminRouteMapPreview from "./AdminRouteMapPreview";
import { supabase } from "../lib/supabaseClient";
import { refreshLiveTransitData } from "../lib/transitSync";
import { fareForDistance, durationForDistance } from "../utils/routing";
import { haversineDistanceKm } from "../utils/geo";
import { TRANSPORT_TYPES } from "../hooks/useExpenses";

// Grab isn't a route TransitGo itself operates — every other mode is a
// valid route type an admin might add.
const ROUTE_TRANSPORT_TYPES = TRANSPORT_TYPES.filter((t) => t.id !== "grab" && t.id !== "other")
  .concat(TRANSPORT_TYPES.filter((t) => t.id === "other"));

const EMPTY_FORM = { code: "", type: "jeepney", stopIds: [], status: "active" };

function totalDistanceKm(stopIds, stopsById) {
  let total = 0;
  for (let i = 0; i < stopIds.length - 1; i++) {
    const a = stopsById[stopIds[i]];
    const b = stopsById[stopIds[i + 1]];
    if (a && b) total += haversineDistanceKm(a, b);
  }
  return total;
}

function RouteForm({ initial, stops, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [addStopId, setAddStopId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  const stopsById = useMemo(() => Object.fromEntries(stops.map((s) => [s.id, s])), [stops]);
  const orderedStops = form.stopIds.map((id) => stopsById[id]).filter(Boolean);
  const distanceKm = totalDistanceKm(form.stopIds, stopsById);
  const estimatedFare = orderedStops.length >= 2 ? fareForDistance(distanceKm) : null;
  const estimatedDuration = orderedStops.length >= 2 ? durationForDistance(distanceKm) : null;

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addStop = () => {
    if (!addStopId || form.stopIds.includes(addStopId)) return;
    setField("stopIds", [...form.stopIds, addStopId]);
    setAddStopId("");
  };

  const removeStop = (id) => setField("stopIds", form.stopIds.filter((s) => s !== id));

  const moveStop = (index, dir) => {
    const next = [...form.stopIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setField("stopIds", next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { setError("Enter a route code."); return; }
    if (form.stopIds.length < 2) { setError("Add at least 2 stops."); return; }

    setError("");
    setSaving(true);
    try {
      const direction = orderedStops.map((s) => s.name).join(" → ");
      const routeRow = { code: form.code.trim(), type: form.type, direction, status: form.status };
      let routeId = initial?.id;

      if (isEdit) {
        const { error: err } = await supabase.from("routes").update({ ...routeRow, updated_at: new Date().toISOString() }).eq("id", routeId);
        if (err) throw err;
        const { error: delErr } = await supabase.from("route_stops").delete().eq("route_id", routeId);
        if (delErr) throw delErr;
      } else {
        routeId = crypto.randomUUID();
        const { error: err } = await supabase.from("routes").insert({ id: routeId, ...routeRow });
        if (err) throw err;
      }

      const routeStopRows = form.stopIds.map((stopId, i) => ({ route_id: routeId, stop_id: stopId, stop_order: i }));
      const { error: rsErr } = await supabase.from("route_stops").insert(routeStopRows);
      if (rsErr) throw rsErr;

      await refreshLiveTransitData();
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save this route.");
    } finally {
      setSaving(false);
    }
  };

  const availableStops = stops.filter((s) => !form.stopIds.includes(s.id));

  return (
    <Modal title={isEdit ? "Edit Route" : "Add Route"} onClose={onClose}>
      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Route Code</span>
            <input type="text" value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="e.g. 04L" />
          </label>
          <label className="expense-field">
            <span className="expense-field-label">Transportation Type</span>
            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
              {ROUTE_TRANSPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <label className="expense-field">
          <span className="expense-field-label">Status</span>
          <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <span className="admin-form-section-label">Stops (in order)</span>

        {orderedStops.length > 0 && (
          <div className="admin-stop-order-list">
            {orderedStops.map((s, i) => (
              <div key={s.id} className="admin-stop-order-row">
                <span className="admin-stop-order-index">{i + 1}</span>
                <span className="admin-stop-order-name">{s.name}</span>
                <div className="admin-stop-order-controls">
                  <button type="button" className="admin-icon-btn" disabled={i === 0} onClick={() => moveStop(i, -1)} title="Move up">
                    <i className="ti ti-chevron-up"></i>
                  </button>
                  <button type="button" className="admin-icon-btn" disabled={i === orderedStops.length - 1} onClick={() => moveStop(i, 1)} title="Move down">
                    <i className="ti ti-chevron-down"></i>
                  </button>
                  <button type="button" className="admin-icon-btn danger" onClick={() => removeStop(s.id)} title="Remove">
                    <i className="ti ti-x"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="expense-form-row">
          <select className="admin-filter-select" value={addStopId} onChange={(e) => setAddStopId(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select a stop to add…</option>
            {availableStops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="expense-form-cancel" onClick={addStop} disabled={!addStopId}>Add Stop</button>
        </div>

        {orderedStops.length >= 2 && (
          <>
            <div className="admin-fare-preview">
              <span>Distance: <strong>{distanceKm.toFixed(1)} km</strong></span>
              <span>Est. fare: <strong>₱{estimatedFare}</strong></span>
              <span>Est. duration: <strong>{estimatedDuration} min</strong></span>
            </div>
            <AdminRouteMapPreview stops={orderedStops} />
          </>
        )}

        {error && <span className="expense-field-error">{error}</span>}

        <div className="expense-form-actions">
          <button type="button" className="expense-form-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="expense-form-submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Route"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [routesRes, routeStopsRes, stopsRes] = await Promise.all([
      supabase.from("routes").select("*").order("code"),
      supabase.from("route_stops").select("route_id, stop_id, stop_order").order("stop_order"),
      supabase.from("stops").select("*").order("name"),
    ]);
    if (!stopsRes.error) setStops(stopsRes.data);
    if (!routesRes.error && !routeStopsRes.error) {
      const byRoute = new Map();
      routeStopsRes.data.forEach((rs) => {
        if (!byRoute.has(rs.route_id)) byRoute.set(rs.route_id, []);
        byRoute.get(rs.route_id).push(rs.stop_id);
      });
      setRoutes(routesRes.data.map((r) => ({ ...r, stopIds: byRoute.get(r.id) || [] })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (route) => {
    await supabase.from("routes").update({ status: route.status === "active" ? "inactive" : "active" }).eq("id", route.id);
    await refreshLiveTransitData();
    load();
  };

  const remove = async (route) => {
    if (!window.confirm(`Delete route "${route.code}"? This can't be undone.`)) return;
    const { error } = await supabase.from("routes").delete().eq("id", route.id);
    if (error) { window.alert(error.message); return; }
    await refreshLiveTransitData();
    load();
  };

  const filtered = routes.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || r.code.toLowerCase().includes(q) || r.direction.toLowerCase().includes(q);
  });

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Routes</h1>
      <p className="admin-page-subtitle">Public transit routes riders search against.</p>

      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search routes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {ROUTE_TRANSPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className="admin-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" className="admin-primary-btn" onClick={() => setEditing({})}>
          <i className="ti ti-plus"></i> Add Route
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Stops</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>No routes found.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td className="admin-table-name">{r.code}</td>
                <td>{r.type}</td>
                <td className="admin-table-sub">{r.direction}</td>
                <td>{r.stopIds.length}</td>
                <td><span className={`admin-status-badge ${r.status}`}>{r.status}</span></td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditing(r)}>
                      <i className="ti ti-edit"></i>
                    </button>
                    <button type="button" className="admin-icon-btn" title={r.status === "active" ? "Disable" : "Enable"} onClick={() => toggleStatus(r)}>
                      <i className={`ti ${r.status === "active" ? "ti-eye-off" : "ti-eye"}`}></i>
                    </button>
                    <button type="button" className="admin-icon-btn danger" title="Delete" onClick={() => remove(r)}>
                      <i className="ti ti-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RouteForm
          initial={editing.id ? editing : null}
          stops={stops}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
