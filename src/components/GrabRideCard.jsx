import { useState } from "react";
import ExpenseFormModal from "./ExpenseFormModal";
import useExpenses from "../hooks/useExpenses";

// Grab only ever returns PHP for a Metro Cebu trip in practice, but this
// must never assume that — it formats whatever currency Grab actually
// returned, falling back to a generic "CODE amount" shape for anything
// that isn't PHP rather than silently converting.
function formatFare(amount, currency) {
  if (currency === "PHP") return `₱${Math.round(amount).toLocaleString("en-PH")}`;
  return `${currency} ${amount}`;
}

function formatFareRange(service) {
  const { minFare, maxFare, currency } = service;
  if (minFare === maxFare) return formatFare(minFare, currency);
  return `${formatFare(minFare, currency)}–${formatFare(maxFare, currency)}`;
}

function formatSurgeNotice(code) {
  return code.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function GrabRideCard({ service, from, to }) {
  const { addExpense } = useExpenses();
  const [showModal, setShowModal] = useState(false);
  const [added, setAdded] = useState(false);

  const fareRange = formatFareRange(service);
  // A reasonable starting point for the amount the rider actually paid —
  // this is still just a suggestion the rider must confirm or edit before
  // it's saved; the estimate itself never becomes an expense on its own.
  const suggestedFare = Math.round((service.minFare + service.maxFare) / 2);

  return (
    <div className="grab-card">
      <div className="grab-card-header">
        <span className="grab-card-title">
          <i className="ti ti-car"></i>
          Grab
        </span>
        {service.surgeNotice && service.surgeNotice !== "NONE" && (
          <span className="grab-surge-badge">{formatSurgeNotice(service.surgeNotice)}</span>
        )}
      </div>

      <p className="grab-service-name">{service.serviceName}</p>

      <div className="grab-card-meta">
        <span className="grab-fare">{fareRange}</span>
        <span className="grab-eta">ETA {service.eta} min</span>
      </div>

      <div className="grab-card-actions">
        {service.deepLink && (
          <a
            className="grab-open-button"
            href={service.deepLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="ti ti-external-link"></i>
            Open in Grab
          </a>
        )}
        <button
          type="button"
          className={`action-pill ${added ? "active" : ""}`}
          onClick={() => setShowModal(true)}
          disabled={added}
        >
          <i className={`ti ${added ? "ti-check" : "ti-receipt-2"}`}></i>
          {added ? "Added" : "Add to Expenses"}
        </button>
      </div>
      <p className="grab-estimate-disclaimer">Estimate only — record what you actually paid after the trip.</p>

      {showModal && (
        <ExpenseFormModal
          title="Add to Expenses"
          submitLabel="Save Expense"
          initialValues={{
            fromName: from.name,
            toName: to.name,
            transportType: "grab",
            fare: suggestedFare,
            date: new Date().toISOString(),
            note: `Grab ${service.serviceName} · estimated ${fareRange}`,
          }}
          onSubmit={(values) => {
            addExpense(values);
            setShowModal(false);
            setAdded(true);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
