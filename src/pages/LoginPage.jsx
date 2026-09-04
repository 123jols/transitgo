import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { normalizePhilippineMobile } from "../utils/phone";
import PersonalInfoFields, { EMPTY_PERSONAL_INFO, validatePersonalInfo } from "../components/PersonalInfoFields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const INITIAL_FORM = {
  ...EMPTY_PERSONAL_INFO,
  email: "",
  password: "",
  confirmPassword: "",
  agreedToTerms: false,
};

function validateStep2(form) {
  const errors = {};
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!PASSWORD_RE.test(form.password)) {
    errors.password = "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match.";
  if (!form.agreedToTerms) errors.agreedToTerms = "You must agree to continue.";
  return errors;
}

function PasswordField({ label, value, onChange, placeholder, autoComplete, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="expense-field">
      <span className="expense-field-label">{label}</span>
      <div className="password-input">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} tabIndex={-1}>
          <i className={`ti ${visible ? "ti-eye-off" : "ti-eye"}`}></i>
        </button>
      </div>
      {error && <span className="expense-field-error">{error}</span>}
    </label>
  );
}

// Two stops connected by a route that quietly keeps "flowing" — the login
// page's brand mark, in place of a generic icon-in-a-circle.
function RouteMark() {
  return (
    <div className="auth-mark" aria-hidden="true">
      <svg viewBox="0 0 60 60" width="34" height="34" fill="none">
        <path
          className="auth-mark-path"
          d="M9 44 C 9 44, 20 12, 30 27 S 51 44, 51 16"
          stroke="var(--accent-primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="1 9"
        />
        <circle cx="9" cy="44" r="4.5" fill="var(--accent-primary)" />
        <circle cx="51" cy="16" r="4.5" fill="var(--accent-primary)" />
      </svg>
    </div>
  );
}

export default function LoginPage({ onBack, onGuest, recoveryMode }) {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signedUpMessage, setSignedUpMessage] = useState(false);

  // Sign-in stays a single simple form — only sign-up needs the full wizard.
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // "Forgot password?" — a sub-flow off of sign-in, not a mode of its own.
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Forced "set a new password" screen, reached only via recoveryMode after
  // the rider clicks the emailed reset link (see AuthContext/App.jsx).
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryErrors, setRecoveryErrors] = useState({});
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoverySubmitError, setRecoverySubmitError] = useState("");

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await signIn(signInEmail.trim(), signInPassword, rememberMe);
      // In gate mode (no onBack) the auth state change alone swaps this
      // page out for the app; onBack is only for the Profile-page entry
      // point, which needs to be told to close explicitly.
      onBack?.();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    setForgotMode(true);
    setForgotEmail(signInEmail);
    setForgotSent(false);
    setForgotError("");
  };

  const closeForgotPassword = () => {
    setForgotMode(false);
    setForgotSent(false);
    setForgotError("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSubmitting(true);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.message || "Something went wrong. Please try again.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    const stepErrors = {};
    if (!PASSWORD_RE.test(newPassword)) {
      stepErrors.newPassword = "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";
    }
    if (confirmNewPassword !== newPassword) stepErrors.confirmNewPassword = "Passwords don't match.";
    setRecoveryErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setRecoverySubmitError("");
    setRecoverySubmitting(true);
    try {
      // Flips isPasswordRecovery off — AuthGate re-renders straight into the
      // app on its own, no manual "continue" step needed here.
      await updatePassword(newPassword);
    } catch (err) {
      setRecoverySubmitError(err.message || "Something went wrong. Please try again.");
      setRecoverySubmitting(false);
    }
  };

  const handleContinueToStep2 = (e) => {
    e.preventDefault();
    const stepErrors = validatePersonalInfo(form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep(2);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const stepErrors = validateStep2(form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      await signUp(form.email.trim(), form.password, {
        fullName: form.fullName.trim(),
        accountType: form.accountType,
        phoneNumber: normalizePhilippineMobile(form.phoneNumber),
        age: Number(form.age),
        address: {
          street: form.street.trim(),
          barangay: form.barangay.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
        },
      });
      setSignedUpMessage(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchToSignUp = () => {
    setMode("signup");
    setStep(1);
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError("");
  };

  const switchToSignIn = () => {
    setMode("signin");
    setStep(1);
    setErrors({});
    setSubmitError("");
    setSignedUpMessage(false);
    setForgotMode(false);
  };

  if (recoveryMode) {
    return (
      <div className="auth-page">
        <div className="auth-page-bg" aria-hidden="true">
          <span className="auth-blob auth-blob-a"></span>
          <span className="auth-blob auth-blob-b"></span>
        </div>

        <div className="auth-page-content">
          <div className="auth-hero">
            <RouteMark />
            <h1 className="auth-title">Set a new password</h1>
            <p className="auth-subtitle">Choose a new password for your TransitGo account.</p>
          </div>

          <div className="auth-card">
            <form className="expense-form" onSubmit={handleSetNewPassword} noValidate>
              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a new password"
                autoComplete="new-password"
                error={recoveryErrors.newPassword}
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                error={recoveryErrors.confirmNewPassword}
              />
              {recoverySubmitError && <span className="expense-field-error">{recoverySubmitError}</span>}
              <button type="submit" className="auth-submit-btn" disabled={recoverySubmitting}>
                {recoverySubmitting ? "Please wait…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden="true">
        <span className="auth-blob auth-blob-a"></span>
        <span className="auth-blob auth-blob-b"></span>
      </div>

      <div className="auth-page-content">
        {onBack && (
          <button type="button" className="back-button" onClick={onBack}>
            <i className="ti ti-arrow-left"></i>
            <span>Back to Profile</span>
          </button>
        )}

        <div className="auth-hero">
          <RouteMark />
          <h1 className="auth-title">
            {forgotMode
              ? forgotSent ? "Check your email" : "Reset your password"
              : signedUpMessage ? "Check your email" : mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="auth-subtitle">
            {forgotMode
              ? forgotSent
                ? "We've sent a password reset link to your email."
                : "Enter your email and we'll send you a link to reset it."
              : signedUpMessage
                ? "Confirm your email to finish creating your account."
                : "Sync your trips and expenses across devices"}
          </p>
        </div>

        {!signedUpMessage && !forgotMode && (
          <div className="auth-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`auth-toggle-btn ${mode === "signin" ? "active" : ""}`}
              onClick={switchToSignIn}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-toggle-btn ${mode === "signup" ? "active" : ""}`}
              onClick={switchToSignUp}
            >
              Sign Up
            </button>
            <span className={`auth-toggle-thumb ${mode === "signup" ? "signup" : ""}`}></span>
          </div>
        )}

        <div className="auth-card">
          {forgotMode ? (
            forgotSent ? (
              <div className="auth-confirm-message">
                <i className="ti ti-mail-check"></i>
                <p>Check <strong>{forgotEmail}</strong> for a link to reset your password.</p>
                <button type="button" className="auth-submit-btn" onClick={closeForgotPassword}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <form className="expense-form" onSubmit={handleForgotPassword} noValidate>
                <label className="expense-field">
                  <span className="expense-field-label">Email</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                {forgotError && <span className="expense-field-error">{forgotError}</span>}
                <button type="submit" className="auth-submit-btn" disabled={forgotSubmitting}>
                  {forgotSubmitting ? "Please wait…" : "Send reset link"}
                </button>
                <button type="button" className="auth-text-link" onClick={closeForgotPassword}>
                  Back to sign in
                </button>
              </form>
            )
          ) : signedUpMessage ? (
            <div className="auth-confirm-message">
              <i className="ti ti-mail-check"></i>
              <p>Check <strong>{form.email}</strong> for a confirmation link, then sign in.</p>
              <button type="button" className="auth-submit-btn" onClick={switchToSignIn}>
                Back to sign in
              </button>
            </div>
          ) : mode === "signin" ? (
            <form className="expense-form" onSubmit={handleSignIn} noValidate>
              <label className="expense-field">
                <span className="expense-field-label">Email</span>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <PasswordField
                label="Password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <div className="auth-options-row">
                <label className="auth-remember-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth-forgot-link" onClick={openForgotPassword}>
                  Forgot password?
                </button>
              </div>
              {submitError && <span className="expense-field-error">{submitError}</span>}
              <button type="submit" className="auth-submit-btn" disabled={submitting}>
                {submitting ? "Please wait…" : "Sign In"}
              </button>
            </form>
          ) : (
            <>
              <div className="auth-step-bar">
                <span className="auth-step-fill" style={{ width: step === 1 ? "50%" : "100%" }}></span>
              </div>

              {step === 1 ? (
                <form className="expense-form" onSubmit={handleContinueToStep2} noValidate>
                  <PersonalInfoFields form={form} errors={errors} setField={setField} />
                  <button type="submit" className="auth-submit-btn">Continue</button>
                </form>
              ) : (
                <form className="expense-form" onSubmit={handleCreateAccount} noValidate>
                  <label className="expense-field">
                    <span className="expense-field-label">Email Address</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                    {errors.email && <span className="expense-field-error">{errors.email}</span>}
                  </label>

                  <PasswordField
                    label="Password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    error={errors.password}
                  />
                  <PasswordField
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    error={errors.confirmPassword}
                  />

                  <label className="auth-terms-row">
                    <input
                      type="checkbox"
                      checked={form.agreedToTerms}
                      onChange={(e) => setField("agreedToTerms", e.target.checked)}
                    />
                    <span>I agree to the Terms of Service and Privacy Policy</span>
                  </label>
                  {errors.agreedToTerms && <span className="expense-field-error">{errors.agreedToTerms}</span>}

                  {submitError && <span className="expense-field-error">{submitError}</span>}

                  <div className="expense-form-actions">
                    <button type="button" className="expense-form-cancel" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button type="submit" className="auth-submit-btn" disabled={submitting}>
                      {submitting ? "Please wait…" : "Create Account"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {onGuest && !signedUpMessage && !forgotMode && (
          <button type="button" className="auth-guest-link" onClick={onGuest}>
            Continue as guest — limited features
          </button>
        )}
      </div>
    </div>
  );
}
