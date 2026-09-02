import { useEffect } from "react";

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="app-modal-backdrop" onClick={onClose}>
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal-header">
          <h3>{title}</h3>
          <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close">
            <i className="ti ti-x"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
