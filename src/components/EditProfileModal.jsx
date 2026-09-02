import { useState } from "react";
import Modal from "./Modal";
import PersonalInfoFields, { validatePersonalInfo } from "./PersonalInfoFields";
import { normalizePhilippineMobile } from "../utils/phone";

function toForm(profile) {
  return {
    fullName: profile.fullName || "",
    accountType: profile.accountType || "regular",
    age: profile.age != null ? String(profile.age) : "",
    phoneNumber: profile.phoneNumber || "",
    street: profile.address?.street || "",
    barangay: profile.address?.barangay || "",
    city: profile.address?.city || "",
    province: profile.address?.province || "",
    postalCode: profile.address?.postalCode || "",
  };
}

export default function EditProfileModal({ profile, onUpdate, onClose }) {
  const [form, setForm] = useState(() => toForm(profile));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const stepErrors = validatePersonalInfo(form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      await onUpdate({
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
      onClose();
    } catch (err) {
      setSubmitError(err.message || "Could not save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <PersonalInfoFields form={form} errors={errors} setField={setField} />
        {submitError && <span className="expense-field-error">{submitError}</span>}
        <div className="expense-form-actions">
          <button type="button" className="expense-form-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="expense-form-submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
