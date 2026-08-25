export default function StoreLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,253,248,0.92)",
        backdropFilter: "blur(4px)",
      }}
    >
      <style>{`
        @keyframes logoPulse {
          0%   { opacity: 1;   transform: scale(1); }
          50%  { opacity: 0.5; transform: scale(0.94); }
          100% { opacity: 1;   transform: scale(1); }
        }
      `}</style>
      <img
        src="/logo.png"
        alt="Raghul Delights"
        style={{
          height: "clamp(72px, 18vw, 120px)",
          width: "auto",
          animation: "logoPulse 1.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}
