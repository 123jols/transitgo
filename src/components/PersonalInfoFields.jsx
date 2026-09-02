import { isValidPhilippineMobile } from "../utils/phone";

export const ACCOUNT_TYPES = [
  { id: "student", label: "Student", emoji: "🎓" },
  { id: "regular", label: "Regular", emoji: "👤" },
];

export const EMPTY_PERSONAL_INFO = {
  fullName: "",
  accountType: "regular",
  age: "",
  phoneNumber: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
};

export function validatePersonalInfo(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Enter your full name.";
  if (!/^\d+$/.test(form.age) || Number(form.age) < 1 || Number(form.age) > 120) {
    errors.age = "Enter a valid age (1–120).";
  }
  if (!isValidPhilippineMobile(form.phoneNumber)) {
    errors.phoneNumber = "Enter a valid PH mobile number, e.g. 09171234567.";
  }
  if (!form.street.trim()) errors.street = "Enter your street.";
  if (!form.city.trim()) errors.city = "Enter your city.";
  if (!form.province.trim()) errors.province = "Enter your province.";
  return errors;
}

// Shared by the sign-up wizard's first step and the "Edit Profile" flow —
// same fields, same validation, so the two never quietly drift apart.
export default function PersonalInfoFields({ form, errors, setField }) {
  return (
    <>
      <label className="expense-field">
        <span className="expense-field-label">Full Name</span>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          placeholder="Enter your full name"
          autoComplete="name"
        />
        {errors.fullName && <span className="expense-field-error">{errors.fullName}</span>}
      </label>

      <div className="expense-field">
        <span className="expense-field-label">Account Type</span>
        <div className="account-type-row">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`account-type-card ${form.accountType === t.id ? "active" : ""}`}
              onClick={() => setField("accountType", t.id)}
            >
              <span className="account-type-emoji">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="expense-form-row">
        <label className="expense-field">
          <span className="expense-field-label">Age</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.age}
            onChange={(e) => setField("age", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Enter your age"
          />
          {errors.age && <span className="expense-field-error">{errors.age}</span>}
        </label>
        <label className="expense-field">
          <span className="expense-field-label">Phone Number</span>
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={(e) => setField("phoneNumber", e.target.value)}
            placeholder="09XX XXX XXXX"
            autoComplete="tel"
          />
          {errors.phoneNumber && <span className="expense-field-error">{errors.phoneNumber}</span>}
        </label>
      </div>

      <label className="expense-field">
        <span className="expense-field-label">Street</span>
        <input
          type="text"
          value={form.street}
          onChange={(e) => setField("street", e.target.value)}
          placeholder="House/unit no., street"
        />
        {errors.street && <span className="expense-field-error">{errors.street}</span>}
      </label>

      <div className="expense-form-row">
        <label className="expense-field">
          <span className="expense-field-label">Barangay (optional)</span>
          <input
            type="text"
            value={form.barangay}
            onChange={(e) => setField("barangay", e.target.value)}
            placeholder="Barangay"
          />
        </label>
        <label className="expense-field">
          <span className="expense-field-label">City</span>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="e.g. Cebu City"
          />
          {errors.city && <span className="expense-field-error">{errors.city}</span>}
        </label>
      </div>

      <div className="expense-form-row">
        <label className="expense-field">
          <span className="expense-field-label">Province</span>
          <input
            type="text"
            value={form.province}
            onChange={(e) => setField("province", e.target.value)}
            placeholder="e.g. Cebu"
          />
          {errors.province && <span className="expense-field-error">{errors.province}</span>}
        </label>
        <label className="expense-field">
          <span className="expense-field-label">Postal Code (optional)</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.postalCode}
            onChange={(e) => setField("postalCode", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 6000"
          />
        </label>
      </div>
    </>
  );
}
