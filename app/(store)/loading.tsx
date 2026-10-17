export default function StoreLoading() {
  return (
    <>
      <style>{`
        #store-loading-wrap {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
          background: #faf8f5;
          z-index: 99999;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div id="store-loading-wrap">
        <span
          style={{
            display: "block",
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
    </>
  );
}
