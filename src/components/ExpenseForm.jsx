import { useState } from "react";
import { TRANSPORT_TYPES } from "../hooks/useExpenses";

function toDateInputValue(date) {
  const d = new Date(date);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
}

const TODAY_INPUT_VALUE = toDateInputValue(new Date());

export default function ExpenseForm({ initialValues, onSubmit, onCancel, submitLabel = "Save Expense" }) {
  const [values, setValues] = useState({
    fromName: initialValues?.fromName || "",
    toName: initialValues?.toName || "",
    transportType: initialValues?.transportType || "jeepney",
    fare: initialValues?.fare != null ? String(initialValues.fare) : "",
    date: initialValues?.date ? toDateInputValue(initialValues.date) : TODAY_INPUT_VALUE,
    note: initialValues?.note || "",
  });
  const [errors, setErrors] = useState({});

  const setField = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const nextErrors = {};
    if (!values.fromName.trim()) nextErrors.fromName = "Enter where you started.";
    if (!values.toName.trim()) nextErrors.toName = "Enter where you ended up.";
    const fareNum = Number(values.fare);
    if (!values.fare || !Number.isFinite(fareNum) || fareNum <= 0) {
      nextErrors.fare = "Enter a fare greater than ₱0.";
    }
    if (!values.date) nextErrors.date = "Pick a date.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      fromName: values.fromName.trim(),
      toName: values.toName.trim(),
      transportType: values.transportType,
      fare: Number(values.fare),
      date: new Date(`${values.date}T12:00:00`).toISOString(),
      note: values.note.trim(),
    });
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <div className="expense-form-row">
        <label className="expense-field">
          <span className="expense-field-label">Origin</span>
          <input
            type="text"
            value={values.fromName}
            onChange={(e) => setField("fromName", e.target.value)}
            placeholder="e.g. Home"
            autoComplete="off"
          />
          {errors.fromName && <span className="expense-field-error">{errors.fromName}</span>}
        </label>

        <label className="expense-field">
          <span className="expense-field-label">Destination</span>
          <input
            type="text"
            value={values.toName}
            onChange={(e) => setField("toName", e.target.value)}
            placeholder="e.g. SM City Cebu"
            autoComplete="off"
          />
          {errors.toName && <span className="expense-field-error">{errors.toName}</span>}
        </label>
      </div>

      <div className="expense-form-row">
        <label className="expense-field">
          <span className="expense-field-label">Transportation</span>
          <select
            value={values.transportType}
            onChange={(e) => setField("transportType", e.target.value)}
          >
            {TRANSPORT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </label>

        <label className="expense-field">
          <span className="expense-field-label">Fare</span>
          <div className="expense-fare-input">
            <span>₱</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values.fare}
              onChange={(e) => setField("fare", e.target.value)}
              placeholder="0"
            />
          </div>
          {errors.fare && <span className="expense-field-error">{errors.fare}</span>}
        </label>
      </div>

      <label className="expense-field">
        <span className="expense-field-label">Date</span>
        <input
          type="date"
          value={values.date}
          max={TODAY_INPUT_VALUE}
          onChange={(e) => setField("date", e.target.value)}
        />
        {errors.date && <span className="expense-field-error">{errors.date}</span>}
      </label>

      <label className="expense-field">
        <span className="expense-field-label">Note (optional)</span>
        <textarea
          value={values.note}
          onChange={(e) => setField("note", e.target.value)}
          placeholder="e.g. Paid exact fare"
          maxLength={140}
          rows={2}
        />
      </label>

      <div className="expense-form-actions">
        <button type="button" className="expense-form-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="expense-form-submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
