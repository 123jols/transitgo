import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AdminLocationPicker from "./AdminLocationPicker";
import { supabase } from "../lib/supabaseClient";
import { refreshLiveTransitData } from "../lib/transitSync";

const EMPTY_FORM = {
  name: "", location: "", stopId: "", lat: null, lon: null,
  routesText: "", hoursFirst: "", hoursLast: "", status: "active",
};

function rowToForm(row) {
  return {
    name: row.name, location: row.location, stopId: row.stop_id || "",
    lat: row.lat, lon: row.lon, routesText: (row.routes || []).join(", "),
    hoursFirst: row.hours_first || "", hoursLast: row.hours_last || "", status: row.status,
  };
}

function TerminalForm({ initial, stops, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? rowToForm(initial) : EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Enter a terminal name."); return; }
    if (!form.location.trim()) { setError("Enter an address."); return; }
    if (!Number.isFinite(form.lat) || !Number.isFinite(form.lon)) { setError("Set a location on the map."); return; }

    setError("");
    setSaving(true);
    try {
      const row = {
        name: form.name.trim(),
        location: form.location.trim(),
        stop_id: form.stopId || null,
        lat: form.lat,
        lon: form.lon,
        routes: form.routesText.split(",").map((r) => r.trim()).filter(Boolean),
        hours_first: form.hoursFirst.trim() || null,
        hours_last: form.hoursLast.trim() || null,
        hours_sourced: false,
        status: form.status,
      };
      if (isEdit) {
        const { error: err } = await supabase.from("terminals").update({ ...row, updated_at: new Date().toISOString() }).eq("id", initial.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("terminals").insert({ id: crypto.randomUUID(), ...row });
        if (err) throw err;
      }
      await refreshLiveTransitData();
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save this terminal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Terminal" : "Add Terminal"} onClose={onClose}>
      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <label className="expense-field">
          <span className="expense-field-label">Terminal Name</span>
          <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. SM City Cebu Terminal" />
        </label>

        <label className="expense-field">
          <span className="expense-field-label">Address</span>
          <input type="text" value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="e.g. North Reclamation Area, Cebu City" />
        </label>

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Linked Stop (optional)</span>
            <select value={form.stopId} onChange={(e) => setField("stopId", e.target.value)}>
              <option value="">None</option>
              {stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">First Ride</span>
            <input type="text" value={form.hoursFirst} onChange={(e) => setField("hoursFirst", e.target.value)} placeholder="e.g. 5:00 AM" />
          </label>
          <label className="expense-field">
            <span className="expense-field-label">Last Ride</span>
            <input type="text" value={form.hoursLast} onChange={(e) => setField("hoursLast", e.target.value)} placeholder="e.g. 9:00 PM" />
          </label>
        </div>

        <label className="expense-field">
          <span className="expense-field-label">Routes served (comma-separated)</span>
          <input type="text" value={form.routesText} onChange={(e) => setField("routesText", e.target.value)} placeholder="e.g. 04L, MyBus (city bus)" />
        </label>

        <span className="admin-form-section-label">Location</span>
        <AdminLocationPicker lat={form.lat} lon={form.lon} onChange={({ lat, lon }) => setForm((p) => ({ ...p, lat, lon }))} />

        {error && <span className="expense-field-error">{error}</span>}

        <div className="expense-form-actions">
          <button type="button" className="expense-form-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="expense-form-submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Terminal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminTerminalsPage() {
  const [terminals, setTerminals] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [terminalsRes, stopsRes] = await Promise.all([
      supabase.from("terminals").select("*").order("name"),
      supabase.from("stops").select("id, name").order("name"),
    ]);
    if (!terminalsRes.error) setTerminals(terminalsRes.data);
    if (!stopsRes.error) setStops(stopsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (terminal) => {
    await supabase.from("terminals").update({ status: terminal.status === "active" ? "inactive" : "active" }).eq("id", terminal.id);
    await refreshLiveTransitData();
    load();
  };

  const remove = async (terminal) => {
    if (!window.confirm(`Delete "${terminal.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("terminals").delete().eq("id", terminal.id);
    if (error) { window.alert(error.message); return; }
    await refreshLiveTransitData();
    load();
  };

  const filtered = terminals.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Terminals</h1>
      <p className="admin-page-subtitle">Transport hubs riders see on the Terminals tab.</p>

      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search terminals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="admin-primary-btn" onClick={() => setEditing({})}>
          <i className="ti ti-plus"></i> Add Terminal
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Hours</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>No terminals found.</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id}>
                <td className="admin-table-name">{t.name}</td>
                <td className="admin-table-sub">{t.location}</td>
                <td className="admin-table-sub">{t.hours_first && t.hours_last ? `${t.hours_first} – ${t.hours_last}` : "—"}</td>
                <td><span className={`admin-status-badge ${t.status}`}>{t.status}</span></td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditing(t)}>
                      <i className="ti ti-edit"></i>
                    </button>
                    <button type="button" className="admin-icon-btn" title={t.status === "active" ? "Disable" : "Enable"} onClick={() => toggleStatus(t)}>
                      <i className={`ti ${t.status === "active" ? "ti-eye-off" : "ti-eye"}`}></i>
                    </button>
                    <button type="button" className="admin-icon-btn danger" title="Delete" onClick={() => remove(t)}>
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
        <TerminalForm
          initial={editing.id ? editing : null}
          stops={stops}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
