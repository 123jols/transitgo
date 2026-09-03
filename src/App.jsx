import { useEffect, useState } from "react";
import "./App.css";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AiChat from "./components/AiChat";
import ThemeProvider from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { loadLiveTransitData } from "./lib/transitSync";
import AdminRoot from "./admin/AdminRoot";

const GUEST_MODE_KEY = "transitgo-guest-mode";
const isAdminPath = window.location.pathname.startsWith("/admin");

function LoadingScreen() {
  return (
    <div className="auth-gate-loading">
      <div className="loading-state">
        <div className="loading-spinner">
          <div className="spinner-dot"></div>
        </div>
        <p>Loading TransitGo…</p>
      </div>
    </div>
  );
}

// Gates the app behind sign-in: a first-time (or signed-out, never-dismissed)
// visitor sees the login page before anything else. "Continue as guest"
// remembers its choice in localStorage so it isn't asked again — the app
// already falls back to device-only storage for trips/expenses when signed
// out, so guest mode needs no extra feature-gating beyond that.
function AuthGate() {
  const { user, loading, isConfigured, isPasswordRecovery } = useAuth();
  const [guestMode, setGuestMode] = useState(
    () => localStorage.getItem(GUEST_MODE_KEY) === "1"
  );
  // Live transit data (stops/routes/terminals) loads once here, before the
  // rest of the app ever mounts — see src/lib/transitSync.js. That keeps
  // routing.js and every page that reads its data synchronous, with no
  // extra subscriptions needed anywhere downstream.
  const [transitReady, setTransitReady] = useState(false);

  useEffect(() => {
    loadLiveTransitData().finally(() => setTransitReady(true));
  }, []);

  if (loading || !transitReady) {
    return <LoadingScreen />;
  }

  // A recovery session (from clicking the emailed reset link) still counts
  // as "signed in" to Supabase — force the reset-password screen instead of
  // falling through to the user-present branch below and skipping it.
  if (isConfigured && isPasswordRecovery) {
    return <LoginPage recoveryMode />;
  }

  if (isConfigured && !user && !guestMode) {
    return (
      <LoginPage
        onGuest={() => {
          localStorage.setItem(GUEST_MODE_KEY, "1");
          setGuestMode(true);
        }}
      />
    );
  }

  return (
    <>
      <HomePage />
      <AiChat />
    </>
  );
}

// /admin has its own auth requirement (signed in + profile.is_admin) enforced
// inside AdminRoot itself, on top of the real enforcement at the database's
// row-level security policies — this gate only covers the initial auth-
// loading wait. Admin pages query Supabase directly (including inactive
// rows), so they don't need the live-transit-data boot fetch above.
function AdminGate() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <AdminRoot />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        {isAdminPath ? <AdminGate /> : <AuthGate />}
      </ThemeProvider>
    </AuthProvider>
  );
}
