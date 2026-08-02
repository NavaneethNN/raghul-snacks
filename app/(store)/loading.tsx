export default function StoreLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "28px",
          height: "28px",
          border: "3px solid #dcd8cd",
          borderTopColor: "#c95f3b",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
        aria-label="Loading…"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
