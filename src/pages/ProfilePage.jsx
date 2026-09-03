import { useEffect, useState } from "react";
import ExpensesPage from "./ExpensesPage";
import LoginPage from "./LoginPage";
import ThemeToggle from "../components/ThemeToggle";
import SosModal from "../components/SosModal";
import EditProfileModal from "../components/EditProfileModal";
import { ACCOUNT_TYPES } from "../components/PersonalInfoFields";
import useTheme from "../hooks/useTheme";
import useExpenses, { formatPeso } from "../hooks/useExpenses";
import useSavedTrips from "../hooks/useSavedTrips";
import useUserProfile from "../hooks/useUserProfile";
import { useAuth } from "../context/AuthContext";
import { RIDER_TYPES, getStoredRiderType, setStoredRiderType } from "../data/riderTypes";

const NAME_STORAGE_KEY = "transitgo-display-name";

export default function ProfilePage({ onNavigate }) {
  const [view, setView] = useState("main");
  const { theme } = useTheme();
  const { totals, reload, cloudSynced } = useExpenses();
  const { savedTrips } = useSavedTrips();
  const { user, isConfigured, isGuest, exitGuestMode, signOut } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const accountTypeMeta = ACCOUNT_TYPES.find((t) => t.id === profile?.accountType);

  // The Expense History page owns its own useExpenses() instance, so an
  // expense added/removed there doesn't automatically update this page's
  // already-mounted summary card — refresh it whenever we're back on "main".
  useEffect(() => {
    if (view === "main") reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(NAME_STORAGE_KEY) || ""
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);

  const [riderType, setRiderType] = useState(getStoredRiderType);
  const [showSosModal, setShowSosModal] = useState(false);

  if (view === "history") {
    return <ExpensesPage onBack={() => setView("main")} />;
  }

  if (view === "login") {
    return <LoginPage onBack={() => setView("main")} />;
  }

  const saveName = () => {
    const trimmed = nameDraft.trim().slice(0, 30);
    setDisplayName(trimmed);
    setNameDraft(trimmed);
    if (trimmed) {
      localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(NAME_STORAGE_KEY);
    }
    setEditingName(false);
  };

  const cancelEditName = () => {
    setNameDraft(displayName);
    setEditingName(false);
  };

  const handleRiderTypeChange = (e) => {
    const next = e.target.value;
    setRiderType(next);
    setStoredRiderType(next);
  };

  return (
    <div className="static-page">
      <h2 className="route-label">Profile</h2>

      <div className="profile-identity">
        <div className="profile-avatar">
          <i className="ti ti-user"></i>
        </div>
        <div className="profile-identity-info">
          {user ? (
            <>
              <p className="profile-name">{profile?.fullName || "…"}</p>
              <p className="profile-sub">
                {accountTypeMeta ? `${accountTypeMeta.emoji} ${accountTypeMeta.label}` : "Loading…"}
              </p>
            </>
          ) : editingName ? (
            <input
              className="profile-name-input"
              value={nameDraft}
              autoFocus
              maxLength={30}
              placeholder="Your name"
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") cancelEditName();
              }}
            />
          ) : (
            <>
              <p className="profile-name">{displayName || "Rider"}</p>
              <p className="profile-sub">This device</p>
            </>
          )}
        </div>
        {!editingName && (
          <button
            type="button"
            className="profile-edit-button"
            onClick={() => (user ? setShowEditProfile(true) : setEditingName(true))}
            title={user ? "Edit profile" : "Edit name"}
          >
            <i className="ti ti-pencil"></i>
          </button>
        )}
        <button
          type="button"
          className="sos-button"
          onClick={() => setShowSosModal(true)}
          title="Emergency SOS"
        >
          <i className="ti ti-alert-triangle"></i>
          SOS
        </button>
      </div>

      {showSosModal && <SosModal onClose={() => setShowSosModal(false)} />}

      {isGuest ? (
        <button
          type="button"
          className="expense-card expense-card-locked"
          onClick={exitGuestMode}
        >
          <div className="expense-card-header">
            <span className="expense-card-title">
              <i className="ti ti-wallet"></i>
              Travel Expenses
            </span>
            <i className="ti ti-lock"></i>
          </div>
          <p className="expense-card-caption">Sign in to track what you spend on trips</p>
          <span className="expense-card-link">
            Sign In / Create Account
            <i className="ti ti-arrow-right"></i>
          </span>
        </button>
      ) : (
        <button type="button" className="expense-card" onClick={() => setView("history")}>
          <div className="expense-card-header">
            <span className="expense-card-title">
              <i className="ti ti-wallet"></i>
              Travel Expenses
              {cloudSynced && <i className="ti ti-cloud-check" title="Synced to your account"></i>}
            </span>
          </div>
          <p className="expense-card-total">{formatPeso(totals.month)}</p>
          <p className="expense-card-caption">Spent this month</p>
          <div className="expense-card-split">
            <div className="expense-card-split-item">
              <span>Today</span>
              <strong>{formatPeso(totals.today)}</strong>
            </div>
            <div className="expense-card-split-item">
              <span>This Week</span>
              <strong>{formatPeso(totals.week)}</strong>
            </div>
          </div>
          <span className="expense-card-link">
            View Expense History
            <i className="ti ti-arrow-right"></i>
          </span>
        </button>
      )}

      <div className="profile-section">
        <p className="section-label">My Transit</p>
        <div className="recent-card">
          <button type="button" className="profile-row" onClick={() => onNavigate?.("trips")}>
            <div className="recent-icon">
              <i className="ti ti-route"></i>
            </div>
            <div className="recent-content">
              <p className="recent-name">Recent Trips</p>
              <p className="recent-type">{savedTrips.length} saved</p>
            </div>
            <i className="ti ti-chevron-right profile-row-chevron"></i>
          </button>
          <button type="button" className="profile-row" onClick={() => onNavigate?.("terminals")}>
            <div className="recent-icon">
              <i className="ti ti-bus-stop"></i>
            </div>
            <div className="recent-content">
              <p className="recent-name">Terminals</p>
              <p className="recent-type">Browse nearby terminals</p>
            </div>
            <i className="ti ti-chevron-right profile-row-chevron"></i>
          </button>
        </div>
      </div>

      <div className="profile-section">
        <p className="section-label">Preferences</p>
        <div className="recent-card">
          <div className="profile-row profile-row-static">
            <div className="recent-icon">
              <i className="ti ti-id-badge-2"></i>
            </div>
            <div className="recent-content">
              <p className="recent-name">Rider Type</p>
              <p className="recent-type">Applies your fare discount automatically</p>
            </div>
            <select className="profile-inline-select" value={riderType} onChange={handleRiderTypeChange}>
              {RIDER_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="profile-row profile-row-static">
            <div className="recent-icon">
              <i className={`ti ${theme === "dark" ? "ti-moon" : "ti-sun"}`}></i>
            </div>
            <div className="recent-content">
              <p className="recent-name">Appearance</p>
              <p className="recent-type">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <p className="section-label">Account</p>
        <div className="recent-card">
          {!isConfigured ? (
            <div className="profile-row profile-row-static">
              <div className="recent-icon">
                <i className="ti ti-cloud-off"></i>
              </div>
              <div className="recent-content">
                <p className="recent-name">Cloud sync not set up</p>
                <p className="recent-type">Trips &amp; expenses stay on this device for now</p>
              </div>
            </div>
          ) : user ? (
            <>
              <div className="profile-row profile-row-static">
                <div className="recent-icon">
                  <i className="ti ti-cloud-check"></i>
                </div>
                <div className="recent-content">
                  <p className="recent-name">{user.email}</p>
                  <p className="recent-type">Trips &amp; expenses sync to this account</p>
                </div>
              </div>
              {profile && (
                <>
                  <div className="profile-row profile-row-static">
                    <div className="recent-icon">
                      <i className="ti ti-phone"></i>
                    </div>
                    <div className="recent-content">
                      <p className="recent-name">Phone</p>
                      <p className="recent-type">{profile.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="profile-row profile-row-static">
                    <div className="recent-icon">
                      <i className="ti ti-cake"></i>
                    </div>
                    <div className="recent-content">
                      <p className="recent-name">Age</p>
                      <p className="recent-type">{profile.age}</p>
                    </div>
                  </div>
                  <div className="profile-row profile-row-static">
                    <div className="recent-icon">
                      <i className="ti ti-map-pin"></i>
                    </div>
                    <div className="recent-content">
                      <p className="recent-name">Address</p>
                      <p className="recent-type">{profile.address.city}, {profile.address.province}</p>
                    </div>
                  </div>
                  <button type="button" className="profile-row" onClick={() => setShowEditProfile(true)}>
                    <div className="recent-icon">
                      <i className="ti ti-edit"></i>
                    </div>
                    <div className="recent-content">
                      <p className="recent-name">Edit Profile</p>
                    </div>
                    <i className="ti ti-chevron-right profile-row-chevron"></i>
                  </button>
                  {profile.isAdmin && (
                    <button
                      type="button"
                      className="profile-row"
                      onClick={() => window.location.assign("/admin")}
                    >
                      <div className="recent-icon">
                        <i className="ti ti-shield-lock"></i>
                      </div>
                      <div className="recent-content">
                        <p className="recent-name">Admin Dashboard</p>
                      </div>
                      <i className="ti ti-chevron-right profile-row-chevron"></i>
                    </button>
                  )}
                </>
              )}
              <button type="button" className="profile-row" onClick={signOut}>
                <div className="recent-icon">
                  <i className="ti ti-logout"></i>
                </div>
                <div className="recent-content">
                  <p className="recent-name">Log Out</p>
                </div>
              </button>
            </>
          ) : (
            <button type="button" className="profile-row" onClick={() => setView("login")}>
              <div className="recent-icon">
                <i className="ti ti-cloud"></i>
              </div>
              <div className="recent-content">
                <p className="recent-name">Sign In / Create Account</p>
                <p className="recent-type">Sync trips &amp; expenses across devices</p>
              </div>
              <i className="ti ti-chevron-right profile-row-chevron"></i>
            </button>
          )}
        </div>
      </div>

      {showEditProfile && profile && (
        <EditProfileModal
          profile={profile}
          onUpdate={updateProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      <div className="profile-section">
        <p className="section-label">About</p>
        <div className="recent-card">
          <div className="profile-row profile-row-static">
            <div className="recent-icon">
              <i className="ti ti-info-circle"></i>
            </div>
            <div className="recent-content">
              <p className="recent-name">About TransitGo</p>
              <p className="recent-type">Cebu jeepney &amp; bus route planner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
