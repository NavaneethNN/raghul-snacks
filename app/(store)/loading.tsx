export default function StoreLoading() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span
        style={{
          display: "inline-block",
          width: 32,
          height: 32,
          border: "3px solid #dcd8cd",
          borderTopColor: "#c95f3b",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
          flexShrink: 0,
        }}
        aria-label="Loading…"
      />
    </div>
  );
}
