import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AdminLocationPicker from "./AdminLocationPicker";
import { supabase } from "../lib/supabaseClient";
import { refreshLiveTransitData } from "../lib/transitSync";

const STOP_TYPES = ["landmark", "mall", "business", "district"];

const EMPTY_FORM = { name: "", type: "landmark", lat: null, lon: null, status: "active" };

function StopForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Enter a stop name."); return; }
    if (!Number.isFinite(form.lat) || !Number.isFinite(form.lon)) { setError("Set a location on the map."); return; }

    setError("");
    setSaving(true);
    try {
      const row = { name: form.name.trim(), type: form.type, lat: form.lat, lon: form.lon, status: form.status };
      if (isEdit) {
        const { error: err } = await supabase.from("stops").update({ ...row, updated_at: new Date().toISOString() }).eq("id", initial.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("stops").insert({ id: crypto.randomUUID(), ...row });
        if (err) throw err;
      }
      await refreshLiveTransitData();
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save this stop.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Stop" : "Add Stop"} onClose={onClose}>
      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <label className="expense-field">
          <span className="expense-field-label">Stop Name</span>
          <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Talamban" />
        </label>

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Type</span>
            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
              {STOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="expense-field">
            <span className="expense-field-label">Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <span className="admin-form-section-label">Location</span>
        <AdminLocationPicker lat={form.lat} lon={form.lon} onChange={({ lat, lon }) => setForm((p) => ({ ...p, lat, lon }))} />

        {error && <span className="expense-field-error">{error}</span>}

        <div className="expense-form-actions">
          <button type="button" className="expense-form-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="expense-form-submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Stop"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminStopsPage() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (add) | row (edit)

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stops").select("*").order("name");
    if (!error) setStops(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (stop) => {
    await supabase.from("stops").update({ status: stop.status === "active" ? "inactive" : "active" }).eq("id", stop.id);
    await refreshLiveTransitData();
    load();
  };

  const remove = async (stop) => {
    if (!window.confirm(`Delete "${stop.name}"? This can't be undone, and will fail if any route still uses it.`)) return;
    const { error } = await supabase.from("stops").delete().eq("id", stop.id);
    if (error) {
      window.alert(error.message.includes("foreign key") ? "This stop is still used by a route — remove it from that route first." : error.message);
      return;
    }
    await refreshLiveTransitData();
    load();
  };

  const filtered = stops.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Stops</h1>
      <p className="admin-page-subtitle">Transit stops routes and terminals reference.</p>

      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search stops…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="admin-primary-btn" onClick={() => setEditing({})}>
          <i className="ti ti-plus"></i> Add Stop
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Coordinates</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>No stops found.</td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id}>
                <td className="admin-table-name">{s.name}</td>
                <td>{s.type}</td>
                <td className="admin-table-sub">{s.lat.toFixed(4)}, {s.lon.toFixed(4)}</td>
                <td>
                  <span className={`admin-status-badge ${s.status}`}>{s.status}</span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditing(s)}>
                      <i className="ti ti-edit"></i>
                    </button>
                    <button type="button" className="admin-icon-btn" title={s.status === "active" ? "Disable" : "Enable"} onClick={() => toggleStatus(s)}>
                      <i className={`ti ${s.status === "active" ? "ti-eye-off" : "ti-eye"}`}></i>
                    </button>
                    <button type="button" className="admin-icon-btn danger" title="Delete" onClick={() => remove(s)}>
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
        <StopForm
          initial={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
