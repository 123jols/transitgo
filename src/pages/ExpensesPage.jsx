import { useMemo, useState } from "react";
import useExpenses, { formatPeso, startOfDay, transportTypeIcon, transportTypeLabel } from "../hooks/useExpenses";
import ExpenseFormModal from "../components/ExpenseFormModal";
import SwipeToDelete from "../components/SwipeToDelete";

function groupLabel(dateStr) {
  const day = startOfDay(dateStr);
  const today = startOfDay(new Date());
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return day.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: day.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function ExpensesPage({ onBack }) {
  const { expenses, addExpense, removeExpense, totals, tripCount, avgPerTrip, avgPerDay, byType } = useExpenses();
  const [showAddModal, setShowAddModal] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map();
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach((expense) => {
      const label = groupLabel(expense.date);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(expense);
    });
    return [...map.entries()];
  }, [expenses]);

  const maxTypeTotal = byType[0]?.total || 0;

  return (
    <div className="static-page">
      <button type="button" className="back-button" onClick={onBack}>
        <i className="ti ti-arrow-left"></i>
        <span>Back to Profile</span>
      </button>

      <h2 className="route-label">Travel Expenses</h2>

      {tripCount === 0 ? (
        <div className="empty-state">
          <i className="ti ti-receipt-2"></i>
          <p>No travel expenses yet</p>
          <span>Your transportation expenses will appear here after you record your first trip.</span>
          <button
            type="button"
            className="save-trip-button"
            style={{ marginTop: 8 }}
            onClick={() => setShowAddModal(true)}
          >
            <i className="ti ti-plus"></i>
            Add Expense
          </button>
        </div>
      ) : (
        <>
          <div className="expense-summary-grid">
            <div className="expense-summary-tile">
              <span className="expense-summary-label">Today</span>
              <strong className="expense-summary-value">{formatPeso(totals.today)}</strong>
            </div>
            <div className="expense-summary-tile">
              <span className="expense-summary-label">This Week</span>
              <strong className="expense-summary-value">{formatPeso(totals.week)}</strong>
            </div>
            <div className="expense-summary-tile">
              <span className="expense-summary-label">This Month</span>
              <strong className="expense-summary-value">{formatPeso(totals.month)}</strong>
            </div>
            <div className="expense-summary-tile">
              <span className="expense-summary-label">Total</span>
              <strong className="expense-summary-value">{formatPeso(totals.all)}</strong>
            </div>
          </div>

          <div className="expense-stats-row">
            <div className="expense-stat">
              <span>{formatPeso(avgPerDay)}</span>
              <p>Avg. per day</p>
            </div>
            <div className="expense-stat">
              <span>{formatPeso(avgPerTrip)}</span>
              <p>Avg. per trip</p>
            </div>
            <div className="expense-stat">
              <span>{tripCount}</span>
              <p>Total trips</p>
            </div>
          </div>

          {byType.length > 0 && (
            <div className="expense-breakdown">
              <p className="section-label">By transportation type</p>
              <div className="expense-breakdown-bars">
                {byType.map((type) => (
                  <div className="expense-breakdown-row" key={type.id}>
                    <div className="expense-breakdown-meta">
                      <i className={`ti ${type.icon}`}></i>
                      <span>{type.label}</span>
                    </div>
                    <div className="expense-breakdown-track">
                      <div
                        className="expense-breakdown-fill"
                        style={{ width: `${maxTypeTotal ? (type.total / maxTypeTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <strong>{formatPeso(type.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="expense-history-header">
            <p className="section-label">History</p>
            <button type="button" className="expense-add-link" onClick={() => setShowAddModal(true)}>
              <i className="ti ti-plus"></i>
              Add Expense
            </button>
          </div>

          <div className="recent-section">
            {grouped.map(([label, records]) => (
              <div key={label} className="expense-day-group">
                <p className="expense-day-label">{label}</p>
                <div className="recent-card">
                  {records.map((expense) => (
                    <SwipeToDelete key={expense.id} onDelete={() => removeExpense(expense.id)} deleteLabel="Delete">
                      <div className="expense-row">
                        <div className="recent-icon">
                          <i className={`ti ${transportTypeIcon(expense.transportType)}`}></i>
                        </div>
                        <div className="recent-content">
                          <p className="recent-name">{expense.fromName} → {expense.toName}</p>
                          <p className="recent-type">
                            {transportTypeLabel(expense.transportType)}
                            {expense.note ? ` · ${expense.note}` : ""}
                          </p>
                        </div>
                        <strong className="expense-row-fare">{formatPeso(expense.fare)}</strong>
                      </div>
                    </SwipeToDelete>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <ExpenseFormModal
          title="Add Expense"
          submitLabel="Save Expense"
          onSubmit={(values) => {
            addExpense(values);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
