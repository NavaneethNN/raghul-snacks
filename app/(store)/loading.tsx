export default function StoreLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Logo mark */}
      <div style={{ animation: "pulse 1.4s ease-in-out infinite" }}>
        <img
          src="/logo-footer.png"
          alt="Raghul Delights"
          style={{ height: 72, width: "auto", opacity: 0.9 }}
        />
      </div>

      {/* Spinner */}
      <span
        style={{
          display: "inline-block",
          width: 32,
          height: 32,
          border: "3px solid #dcd8cd",
          borderTopColor: "var(--terracotta)",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }}
        aria-label="Loading…"
      />
    </div>
  );
}
