import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabaseClient";
import { refreshLiveTransitData } from "../lib/transitSync";

const DESTINATION_CATEGORIES = ["Historical", "Attraction", "Nature", "Beach", "University", "Mall"];
const VERIFICATION_STATUSES = ["verified", "partially_verified", "needs_verification", "outdated"];

const EMPTY_FORM = {
  name: "", category: "Attraction", location: "", description: "", icon: "ti-map-pin",
  wikiTitle: "", nearestStopId: "", source: "", sourceUrl: "",
  verificationStatus: "needs_verification", status: "active",
};

function rowToForm(row) {
  return {
    name: row.name, category: row.category, location: row.location, description: row.description || "",
    icon: row.icon, wikiTitle: row.wiki_title || "", nearestStopId: row.nearest_stop_id || "",
    source: row.source || "", sourceUrl: row.source_url || "",
    verificationStatus: row.verification_status, status: row.status,
  };
}

function DestinationForm({ initial, stops, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? rowToForm(initial) : EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Enter a destination name."); return; }
    if (!form.location.trim()) { setError("Enter a location."); return; }

    setError("");
    setSaving(true);
    try {
      const row = {
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || "ti-map-pin",
        wiki_title: form.wikiTitle.trim() || null,
        nearest_stop_id: form.nearestStopId || null,
        source: form.source.trim() || null,
        source_url: form.sourceUrl.trim() || null,
        verification_status: form.verificationStatus,
        status: form.status,
      };
      if (isEdit) {
        const { error: err } = await supabase.from("destinations").update({ ...row, updated_at: new Date().toISOString() }).eq("id", initial.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("destinations").insert({ id: crypto.randomUUID(), ...row });
        if (err) throw err;
      }
      await refreshLiveTransitData();
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save this destination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Destination" : "Add Destination"} onClose={onClose}>
      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <label className="expense-field">
          <span className="expense-field-label">Name</span>
          <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Kawasan Falls" />
        </label>

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Category</span>
            <select value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {DESTINATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

        <label className="expense-field">
          <span className="expense-field-label">Location</span>
          <input type="text" value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="e.g. Matutinao, Badian (South Cebu)" />
        </label>

        <label className="expense-field">
          <span className="expense-field-label">Description</span>
          <textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Shown on the Explore card" />
        </label>

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Icon (Tabler class)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="text" value={form.icon} onChange={(e) => setField("icon", e.target.value)} placeholder="ti-map-pin" />
              <i className={`ti ${form.icon}`} style={{ fontSize: 20, flexShrink: 0 }}></i>
            </div>
          </label>
          <label className="expense-field">
            <span className="expense-field-label">Wikipedia Title (optional)</span>
            <input type="text" value={form.wikiTitle} onChange={(e) => setField("wikiTitle", e.target.value)} placeholder="For a real photo" />
          </label>
        </div>

        <label className="expense-field">
          <span className="expense-field-label">Nearest Stop (optional)</span>
          <select value={form.nearestStopId} onChange={(e) => setField("nearestStopId", e.target.value)}>
            <option value="">None</option>
            {stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <span className="admin-form-section-label">Verification</span>

        <div className="expense-form-row">
          <label className="expense-field">
            <span className="expense-field-label">Source (optional)</span>
            <input type="text" value={form.source} onChange={(e) => setField("source", e.target.value)} placeholder="e.g. Shell Wanders" />
          </label>
          <label className="expense-field">
            <span className="expense-field-label">Source URL (optional)</span>
            <input type="text" value={form.sourceUrl} onChange={(e) => setField("sourceUrl", e.target.value)} placeholder="https://…" />
          </label>
        </div>

        <label className="expense-field">
          <span className="expense-field-label">Verification Status</span>
          <select value={form.verificationStatus} onChange={(e) => setField("verificationStatus", e.target.value)}>
            {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
          </select>
        </label>

        {error && <span className="expense-field-error">{error}</span>}

        <div className="expense-form-actions">
          <button type="button" className="expense-form-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="expense-form-submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Destination"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [destinationsRes, stopsRes] = await Promise.all([
      supabase.from("destinations").select("*").order("name"),
      supabase.from("stops").select("id, name").order("name"),
    ]);
    if (!destinationsRes.error) setDestinations(destinationsRes.data);
    if (!stopsRes.error) setStops(stopsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (destination) => {
    await supabase.from("destinations").update({ status: destination.status === "active" ? "inactive" : "active" }).eq("id", destination.id);
    await refreshLiveTransitData();
    load();
  };

  const remove = async (destination) => {
    if (!window.confirm(`Delete "${destination.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("destinations").delete().eq("id", destination.id);
    if (error) { window.alert(error.message); return; }
    await refreshLiveTransitData();
    load();
  };

  const filtered = destinations.filter((d) => {
    if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return d.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Destinations</h1>
      <p className="admin-page-subtitle">Tourist spots and landmarks shown on the Explore tab.</p>

      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search destinations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {DESTINATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="admin-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" className="admin-primary-btn" onClick={() => setEditing({})}>
          <i className="ti ti-plus"></i> Add Destination
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Verification</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>No destinations found.</td></tr>
            ) : filtered.map((d) => (
              <tr key={d.id}>
                <td className="admin-table-name">{d.name}</td>
                <td>{d.category}</td>
                <td className="admin-table-sub">{d.location}</td>
                <td className="admin-table-sub">{d.verification_status.replace(/_/g, " ")}</td>
                <td><span className={`admin-status-badge ${d.status}`}>{d.status}</span></td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditing(d)}>
                      <i className="ti ti-edit"></i>
                    </button>
                    <button type="button" className="admin-icon-btn" title={d.status === "active" ? "Disable" : "Enable"} onClick={() => toggleStatus(d)}>
                      <i className={`ti ${d.status === "active" ? "ti-eye-off" : "ti-eye"}`}></i>
                    </button>
                    <button type="button" className="admin-icon-btn danger" title="Delete" onClick={() => remove(d)}>
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
        <DestinationForm
          initial={editing.id ? editing : null}
          stops={stops}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
