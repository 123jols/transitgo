import { useState } from "react";
import RouteMap from "../components/RouteMap";
import ThemeToggle from "../components/ThemeToggle";
import ExpenseFormModal from "../components/ExpenseFormModal";
import useExpenses from "../hooks/useExpenses";
import { stops } from "../data/db";
import { haversineDistanceKm } from "../utils/geo";
import { openGrabRide } from "../utils/grabLink";
import { openWalkingDirections } from "../utils/navigation";

const stopById = Object.fromEntries(stops.map((s) => [s.id, s]));

const VEHICLE_ICON = {
  jeepney: "ti-bus",
  bus: "ti-bus",
  walk: "ti-walk",
};

// Tints the route-hero icon tile by vehicle type — "" falls through to the
// default (jeepney) gradient since that's the overwhelming majority of
// routes in this app's verified network.
const VEHICLE_HERO_CLASS = {
  bus: "bus",
  walk: "walk",
};

// RouteDetailsPage's route.type doesn't line up 1:1 with the expense
// tracker's transport types (e.g. a zero-fare walking leg) — this maps it to
// the closest one so "Add to Expenses" starts from a sensible default that
// the rider can still change before saving.
const ROUTE_TYPE_TO_EXPENSE_TYPE = {
  jeepney: "jeepney",
  bus: "bus",
  walk: "other",
};

export default function RouteDetailsPage({
  route,
  from,
  to,
  userType,
  discountRate,
  userLabel,
  onBack,
  isSaved,
  onSaveTrip,
}) {
  const discountedFare = Math.round(route.fare * (1 - discountRate));
  const savings = route.fare - discountedFare;
  const directDistanceKm = Number.isFinite(from?.lat) && Number.isFinite(to?.lat)
    ? haversineDistanceKm(from, to).toFixed(1)
    : null;
  const vehicleIcon = VEHICLE_ICON[route.type] || "ti-bus";
  const [grabCopied, setGrabCopied] = useState(false);
  const handleGrabClick = () => {
    openGrabRide(from, to);
    setGrabCopied(true);
    setTimeout(() => setGrabCopied(false), 3000);
  };

  const { addExpense } = useExpenses();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseSaved, setExpenseSaved] = useState(false);

  // Walking directions to the first physical stop the rider needs to reach
  // — the first leg's boarding point if one exists, otherwise straight to
  // the destination (a walk-only trip, or a fallback single-leg route with
  // no coordinate-bearing legs array).
  const handleStartNavigation = () => {
    const firstLeg = route.legs && route.legs.length > 0 ? route.legs[0] : null;
    const target = (firstLeg && stopById[firstLeg.toId]) || to;
    openWalkingDirections(target.lat, target.lon);
  };

  // One combined "trip tip" — the old design showed this same kind of advice
  // split across two separate cards (an "AI Insight" and a generic "Tips"
  // card) that were really saying overlapping things; this merges both into
  // a single sentence pair.
  const aiInsight = discountRate > 0
    ? `Smart pick for ${userLabel} riders: this route maximizes your savings with excellent timing and minimal transfers.`
    : route.transfers === 0
      ? "Direct route with zero transfers — the fastest path from start to destination."
      : "A balanced route that delivers strong value across cost, time, and convenience.";
  const practicalTip = route.type === "walk"
    ? "Wear comfortable shoes and check the weather."
    : route.transfers > 1
      ? "Keep change handy at each transfer."
      : "Have your fare ready for quick boarding.";
  const tripTip = `${aiInsight} ${practicalTip}`;

  return (
    <div className="route-details-container">
      <div className="route-details-card">
        {/* Back button */}
        <div className="route-details-header">
          <button type="button" className="back-button" onClick={onBack}>
            <i className="ti ti-arrow-left"></i>
            <span>Back to results</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Route hero */}
        <div className="route-hero">
          <div className={`route-hero-icon ${VEHICLE_HERO_CLASS[route.type] || ""}`}>
            <i className={`ti ${vehicleIcon}`}></i>
          </div>
          <div>
            <p className="route-hero-code">{route.label}</p>
            <span className="route-type-badge">
              <i className={`ti ${vehicleIcon}`}></i> {route.type}
            </span>
          </div>
        </div>

        {/* Fare receipt strip */}
        <div className="fare-strip">
          <div className="fare-strip-main">
            <p className="fare-strip-label">Fare</p>
            <p className="fare-strip-value">₱{discountedFare}</p>
            <p className="fare-strip-note">
              {discountRate > 0 ? `Save ₱${savings}` : `${userLabel} fare`}
            </p>
          </div>
          <div className="fare-strip-mini">
            <div className="fare-mini-item">
              <span>Duration</span>
              <strong>{route.duration} min</strong>
            </div>
            <div className="fare-mini-item">
              <span>Transfers</span>
              <strong>{route.transfers}</strong>
            </div>
          </div>
        </div>

        {/* From / To capsule */}
        <div className="stop-capsule">
          <div className="stop-row">
            <div className="stop-dot-col">
              <div className="stop-dot"></div>
              <div className="stop-connector"></div>
            </div>
            <div className="stop-text-col">
              <p className="stop-label">From</p>
              <p className="stop-value">{from.name}</p>
            </div>
          </div>
          <div className="stop-divider"></div>
          <div className="stop-row">
            <div className="stop-dot-col">
              <div className="stop-dot pin"></div>
            </div>
            <div className="stop-text-col">
              <p className="stop-label">To</p>
              <p className="stop-value">{to.name}</p>
            </div>
          </div>
        </div>

        {/* Route map */}
        <div className="route-map-wrap">
          <RouteMap from={from} to={to} />
          {directDistanceKm && (
            <span className="map-distance-chip">~{directDistanceKm} km direct</span>
          )}
        </div>

        {/* Journey steps */}
        <div className="journey-steps">
          <div className="journey-step">
            <div className="journey-step-icon"><i className="ti ti-map-pin"></i></div>
            <div className="journey-step-text">
              <p className="journey-step-title">Board at {from.name}</p>
            </div>
          </div>

          {(route.legs && route.legs.length > 0 ? route.legs : [{
            kind: "ride", code: route.type, toName: to.name, duration: route.duration, fare: route.fare,
          }]).map((leg, i) => (
            <div className={`journey-step ${leg.kind === "walk" ? "walk" : "ride"}`} key={i}>
              <div className={`journey-step-icon ${leg.kind === "walk" ? "" : "journey-step-icon-ride"}`}>
                <i className={`ti ${leg.kind === "walk" ? "ti-walk" : vehicleIcon}`}></i>
              </div>
              <div className="journey-step-text">
                <p className="journey-step-title">
                  {leg.kind === "walk" ? `Walk to ${leg.toName}` : `${leg.code} to ${leg.toName}`}
                </p>
                <p className="journey-step-meta">
                  {leg.kind === "walk"
                    ? `${leg.duration} min walk`
                    : `${leg.duration} min${leg.fare ? ` · ₱${leg.fare}` : ""}`}
                </p>
              </div>
            </div>
          ))}

          <div className="journey-step">
            <div className="journey-step-icon journey-step-icon-end"><i className="ti ti-flag"></i></div>
            <div className="journey-step-text">
              <p className="journey-step-title">Arrive at {to.name}</p>
            </div>
          </div>
        </div>

        {/* Trip tip */}
        <div className="ai-insight-card">
          <i className="ti ti-bulb"></i>
          <div>
            <p className="ai-insight-label">Trip tip</p>
            <p className="ai-insight-text">{tripTip}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="route-action-row">
          <button
            type="button"
            className={`action-pill ${isSaved ? "active" : ""}`}
            onClick={onSaveTrip}
            disabled={isSaved}
          >
            <i className={`ti ${isSaved ? "ti-bookmark-check" : "ti-bookmark-plus"}`}></i>
            {isSaved ? "Saved" : "Save"}
          </button>

          <button type="button" className="action-pill grab" onClick={handleGrabClick}>
            <i className="ti ti-car"></i>
            Grab
          </button>

          <button
            type="button"
            className={`action-pill ${expenseSaved ? "active" : ""}`}
            onClick={() => setShowExpenseModal(true)}
            disabled={expenseSaved}
          >
            <i className={`ti ${expenseSaved ? "ti-check" : "ti-receipt-2"}`}></i>
            {expenseSaved ? "Added" : "Expense"}
          </button>
        </div>
        {grabCopied && (
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: -14 }}>
            Opening Grab… pickup/drop-off addresses copied in case they don't carry over.
          </p>
        )}

        {showExpenseModal && (
          <ExpenseFormModal
            title="Add to Expenses"
            submitLabel="Save Expense"
            initialValues={{
              fromName: from.name,
              toName: to.name,
              transportType: ROUTE_TYPE_TO_EXPENSE_TYPE[route.type] || "other",
              fare: discountedFare,
              date: new Date().toISOString(),
            }}
            onSubmit={(values) => {
              addExpense({ ...values, routeId: route.id });
              setShowExpenseModal(false);
              setExpenseSaved(true);
            }}
            onClose={() => setShowExpenseModal(false)}
          />
        )}

        {/* Primary CTA */}
        <button
          type="button"
          className="start-navigation-button"
          onClick={handleStartNavigation}
        >
          <i className="ti ti-navigation"></i>
          Start Navigation
        </button>
      </div>
    </div>
  );
}
