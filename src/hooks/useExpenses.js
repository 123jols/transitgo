import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const STORAGE_KEY = "transitgo-expenses";

export const TRANSPORT_TYPES = [
  { id: "jeepney", label: "Jeepney", icon: "ti-bus" },
  { id: "modern-jeepney", label: "Modern Jeepney", icon: "ti-bus" },
  { id: "bus", label: "Bus", icon: "ti-bus" },
  { id: "multicab", label: "Multicab", icon: "ti-car" },
  { id: "van", label: "Van", icon: "ti-car" },
  { id: "ferry", label: "Ferry", icon: "ti-anchor" },
  { id: "taxi", label: "Taxi", icon: "ti-car" },
  { id: "grab", label: "Grab", icon: "ti-car" },
  { id: "other", label: "Other", icon: "ti-dots" },
];

export const transportTypeLabel = (id) =>
  TRANSPORT_TYPES.find((t) => t.id === id)?.label || "Other";

export const transportTypeIcon = (id) =>
  TRANSPORT_TYPES.find((t) => t.id === id)?.icon || "ti-dots";

export function formatPeso(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₱${Math.round(value).toLocaleString("en-PH")}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function loadLocalExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read stored expenses", err);
    return [];
  }
}

function saveLocalExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.warn("Could not save expenses", err);
  }
}

function fromSupabaseRow(row) {
  return {
    id: row.id,
    date: row.date,
    fromName: row.from_name,
    toName: row.to_name,
    transportType: row.transport_type,
    fare: Number(row.fare) || 0,
    note: row.note || "",
    routeId: row.route_id || null,
  };
}

function toSupabaseRow(record, userId) {
  return {
    id: record.id,
    user_id: userId,
    date: record.date,
    from_name: record.fromName,
    to_name: record.toName,
    transport_type: record.transportType,
    fare: record.fare,
    note: record.note || null,
    route_id: record.routeId || null,
  };
}

function buildRecord(entry) {
  return {
    id: crypto.randomUUID(),
    date: entry.date || new Date().toISOString(),
    fromName: (entry.fromName || "").trim(),
    toName: (entry.toName || "").trim(),
    transportType: entry.transportType || "jeepney",
    fare: Math.max(0, Number(entry.fare) || 0),
    note: (entry.note || "").trim(),
    routeId: entry.routeId || null,
  };
}

// Signed-in riders get their expenses persisted to Supabase (see
// supabase/schema.sql) so they follow the account across devices; signed-out
// riders keep the original localStorage-only behavior — nothing regresses
// for guests just because cloud sync exists.
export default function useExpenses() {
  const { user } = useAuth();
  const userId = user?.id;
  const cloudMode = isSupabaseConfigured && !!userId;

  const [expenses, setExpenses] = useState(() => (cloudMode ? [] : loadLocalExpenses()));

  const loadCloudExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) {
      console.warn("Could not load expenses from Supabase", error);
      return [];
    }
    return data.map(fromSupabaseRow);
  }, [userId]);

  const reload = useCallback(() => {
    if (cloudMode) {
      loadCloudExpenses().then(setExpenses);
    } else {
      setExpenses(loadLocalExpenses());
    }
  }, [cloudMode, loadCloudExpenses]);

  // Fetch on mount / whenever we switch between guest and signed-in.
  useEffect(() => {
    let cancelled = false;
    if (cloudMode) {
      loadCloudExpenses().then((rows) => { if (!cancelled) setExpenses(rows); });
    } else {
      setExpenses(loadLocalExpenses());
    }
    return () => { cancelled = true; };
  }, [cloudMode, loadCloudExpenses]);

  // Guests: every change persists to localStorage, same as before. Signed-in
  // riders persist per-action instead (see addExpense/removeExpense) since
  // each row needs its own insert/delete call.
  useEffect(() => {
    if (!cloudMode) saveLocalExpenses(expenses);
  }, [expenses, cloudMode]);

  const addExpense = (entry) => {
    const record = buildRecord(entry);
    setExpenses((prev) => [record, ...prev]);

    if (cloudMode) {
      supabase.from("expenses").insert(toSupabaseRow(record, userId)).then(({ error }) => {
        if (error) console.warn("Could not save expense to Supabase", error);
      });
    }
    return record;
  };

  const removeExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    if (cloudMode) {
      supabase.from("expenses").delete().eq("id", id).then(({ error }) => {
        if (error) console.warn("Could not delete expense from Supabase", error);
      });
    }
  };

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6); // rolling 7-day window, today inclusive
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (since) =>
    expenses
      .filter((e) => new Date(e.date) >= since)
      .reduce((sum, e) => sum + e.fare, 0);

  const totals = {
    today: sumSince(todayStart),
    week: sumSince(weekStart),
    month: sumSince(monthStart),
    all: expenses.reduce((sum, e) => sum + e.fare, 0),
  };

  const tripCount = expenses.length;
  const oldestTime = tripCount
    ? Math.min(...expenses.map((e) => new Date(e.date).getTime()))
    : now.getTime();
  const daysTracked = tripCount
    ? Math.max(1, Math.round((todayStart - startOfDay(oldestTime)) / 86400000) + 1)
    : 0;

  const avgPerTrip = tripCount ? totals.all / tripCount : 0;
  const avgPerDay = daysTracked ? totals.all / daysTracked : 0;

  const byType = TRANSPORT_TYPES.map((type) => ({
    ...type,
    total: expenses
      .filter((e) => e.transportType === type.id)
      .reduce((sum, e) => sum + e.fare, 0),
  }))
    .filter((type) => type.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    expenses,
    addExpense,
    removeExpense,
    reload,
    totals,
    tripCount,
    avgPerTrip,
    avgPerDay,
    byType,
    cloudSynced: cloudMode,
  };
}
