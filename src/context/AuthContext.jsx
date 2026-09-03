import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Clicking the emailed reset link logs the rider in with a short-lived
      // "recovery" session — session/user look identical to a normal sign-in,
      // so without this flag the app would just drop them straight into the
      // home screen instead of forcing the "set a new password" step.
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // profile carries every sign-up field besides email/password (full name,
  // account type, phone, age, address) — passed as Supabase auth metadata
  // so the database trigger (see supabase/schema.sql) can populate a
  // complete profiles row in the same transaction as account creation.
  const signUp = async (email, password, profile = {}) => {
    if (!isSupabaseConfigured) throw new Error("Cloud sync isn't configured yet.");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profile.fullName,
          account_type: profile.accountType,
          phone_number: profile.phoneNumber,
          age: profile.age,
          address_street: profile.address?.street,
          address_barangay: profile.address?.barangay,
          address_city: profile.address?.city,
          address_province: profile.address?.province,
          address_postal_code: profile.address?.postalCode,
        },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) throw new Error("Cloud sync isn't configured yet.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) throw new Error("Cloud sync isn't configured yet.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) throw new Error("Cloud sync isn't configured yet.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        isPasswordRecovery,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
