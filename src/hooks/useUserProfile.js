import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

function fromRow(row) {
  if (!row) return null;
  return {
    fullName: row.full_name,
    email: row.email,
    accountType: row.account_type, // "student" | "regular"
    isAdmin: row.is_admin || false,
    phoneNumber: row.phone_number,
    age: row.age,
    address: {
      street: row.address_street,
      barangay: row.address_barangay || "",
      city: row.address_city,
      province: row.address_province,
      postalCode: row.address_postal_code || "",
    },
  };
}

// Reads/updates the signed-in rider's profiles row (full name, account
// type, phone, age, address — everything collected at sign-up). Returns
// null for both `profile` and loading state when signed out or when
// Supabase isn't configured — callers should treat that as "nothing to show".
export default function useUserProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = isSupabaseConfigured && !!userId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      console.warn("Could not load profile from Supabase", error);
      return null;
    }
    return fromRow(data);
  }, [enabled, userId]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    load().then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [enabled, load]);

  const updateProfile = async (updates) => {
    if (!enabled) throw new Error("Not signed in.");
    const row = {
      full_name: updates.fullName,
      account_type: updates.accountType,
      phone_number: updates.phoneNumber,
      age: updates.age,
      address_street: updates.address?.street,
      address_barangay: updates.address?.barangay || null,
      address_city: updates.address?.city,
      address_province: updates.address?.province,
      address_postal_code: updates.address?.postalCode || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").update(row).eq("id", userId);
    if (error) throw error;
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return { profile, loading, updateProfile, reload: load };
}
