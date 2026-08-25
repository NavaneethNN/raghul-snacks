export default function StoreLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
