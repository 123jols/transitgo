export default function OfflineBanner({ isOnline }) {
  if (isOnline) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        background: "#b71c1c",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 999,
        animation: "slideDown 0.25s ease-out",
      }}
    >
      <i className="ti ti-wifi-off" style={{ fontSize: 16 }} />
      You're offline — showing cached routes
      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}