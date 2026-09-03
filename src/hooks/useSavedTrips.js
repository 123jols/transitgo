import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const STORAGE_KEY = "transitgo-saved-trips";
const LOCAL_TRIP_CAP = 20; // signed-out-but-not-configured fallback only
const GUEST_TRIP_CAP = 2; // riders who explicitly chose "Continue as guest"

function loadLocalTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read stored trips", err);
    return [];
  }
}

function saveLocalTrips(trips) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (err) {
    console.warn("Could not save trips", err);
  }
}

// route/from/to are stored as JSONB rows (see supabase/schema.sql) — this
// just unwraps them back into the same shape HomePage.jsx already works with.
function fromSupabaseRow(row) {
  return { id: row.trip_key, route: row.route, from: row.from_point, to: row.to_point, savedAt: row.saved_at };
}

// Same dual-mode pattern as useExpenses.js: signed-in riders get saved trips
// synced to Supabase; guests keep the original localStorage-only behavior.
export default function useSavedTrips() {
  const { user, isGuest } = useAuth();
  const userId = user?.id;
  const cloudMode = isSupabaseConfigured && !!userId;

  const [savedTrips, setSavedTrips] = useState(() => (cloudMode ? [] : loadLocalTrips()));

  const loadCloudTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from("saved_trips")
      .select("*")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false });
    if (error) {
      console.warn("Could not load saved trips from Supabase", error);
      return [];
    }
    return data.map(fromSupabaseRow);
  }, [userId]);

  const reload = useCallback(() => {
    if (cloudMode) {
      loadCloudTrips().then(setSavedTrips);
    } else {
      setSavedTrips(loadLocalTrips());
    }
  }, [cloudMode, loadCloudTrips]);

  useEffect(() => {
    let cancelled = false;
    if (cloudMode) {
      loadCloudTrips().then((rows) => { if (!cancelled) setSavedTrips(rows); });
    } else {
      setSavedTrips(loadLocalTrips());
    }
    return () => { cancelled = true; };
  }, [cloudMode, loadCloudTrips]);

  useEffect(() => {
    if (!cloudMode) saveLocalTrips(savedTrips);
  }, [savedTrips, cloudMode]);

  // Returns a status so callers can surface feedback: "saved" | "duplicate" | "limit".
  const saveTripToTrips = (route, source, destination) => {
    const id = `${route.id}-${source.id}-${destination.id}`;
    if (savedTrips.some((trip) => trip.id === id)) return "duplicate";
    if (isGuest && savedTrips.length >= GUEST_TRIP_CAP) return "limit";

    setSavedTrips((prev) => {
      if (prev.some((trip) => trip.id === id)) return prev;
      const next = [{ id, route, from: source, to: destination, savedAt: new Date().toISOString() }, ...prev];
      return cloudMode ? next : next.slice(0, LOCAL_TRIP_CAP);
    });

    if (cloudMode) {
      supabase
        .from("saved_trips")
        .insert({ user_id: userId, trip_key: id, route, from_point: source, to_point: destination })
        .then(({ error }) => {
          if (error && error.code !== "23505") { // 23505 = unique_violation, i.e. already saved — fine
            console.warn("Could not save trip to Supabase", error);
          }
        });
    }

    return "saved";
  };

  const removeSavedTrip = (id) => {
    setSavedTrips((prev) => prev.filter((trip) => trip.id !== id));

    if (cloudMode) {
      supabase.from("saved_trips").delete().eq("user_id", userId).eq("trip_key", id).then(({ error }) => {
        if (error) console.warn("Could not delete saved trip from Supabase", error);
      });
    }
  };

  return { savedTrips, saveTripToTrips, removeSavedTrip, reload };
}
