import { useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { normalizePhilippineMobile } from "../utils/phone";
import PersonalInfoFields, { EMPTY_PERSONAL_INFO, validatePersonalInfo } from "./PersonalInfoFields";

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

export default function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth();
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

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await signIn(signInEmail.trim(), signInPassword);
      onClose();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
  };

  if (signedUpMessage) {
    return (
      <Modal title="Create Account" onClose={onClose}>
        <div className="auth-confirm-message">
          <i className="ti ti-mail-check"></i>
          <p>Check <strong>{form.email}</strong> for a confirmation link, then sign in.</p>
          <button type="button" className="expense-form-submit" onClick={switchToSignIn}>
            Back to sign in
          </button>
        </div>
      </Modal>
    );
  }

  if (mode === "signin") {
    return (
      <Modal title="Sign In" onClose={onClose}>
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
          {submitError && <span className="expense-field-error">{submitError}</span>}
          <div className="expense-form-actions">
            <button type="button" className="expense-form-cancel" onClick={switchToSignUp}>
              New here? Create account
            </button>
            <button type="submit" className="expense-form-submit" disabled={submitting}>
              {submitting ? "Please wait…" : "Sign In"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // mode === "signup"
  return (
    <Modal title="Create Account" onClose={onClose}>
      <div className="auth-steps">
        <span className={`auth-step ${step === 1 ? "active" : "done"}`}>
          <i className={`ti ${step === 1 ? "ti-circle-dot" : "ti-circle-check"}`}></i>
          Personal Information
        </span>
        <span className="auth-step-connector"></span>
        <span className={`auth-step ${step === 2 ? "active" : ""}`}>
          <i className="ti ti-circle-dot"></i>
          Account
        </span>
      </div>

      {step === 1 ? (
        <form className="expense-form" onSubmit={handleContinueToStep2} noValidate>
          <PersonalInfoFields form={form} errors={errors} setField={setField} />

          <div className="expense-form-actions">
            <button type="button" className="expense-form-cancel" onClick={switchToSignIn}>
              Have an account? Sign in
            </button>
            <button type="submit" className="expense-form-submit">Continue</button>
          </div>
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
            <button type="submit" className="expense-form-submit" disabled={submitting}>
              {submitting ? "Please wait…" : "Create Account"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
