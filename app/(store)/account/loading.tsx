export default function AccountLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .acct-shimmer {
          background: linear-gradient(90deg, var(--line) 25%, var(--paper) 50%, var(--line) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* Hero placeholder */}
      <div style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)", padding: "40px 16px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="acct-shimmer" style={{ height: 36, width: 160, marginBottom: 10 }} />
          <div className="acct-shimmer" style={{ height: 18, width: 280 }} />
        </div>
      </div>

      {/* Account details card placeholder */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
          {/* Card header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
            <div className="acct-shimmer" style={{ height: 24, width: 140 }} />
            <div className="acct-shimmer" style={{ height: 32, width: 80, borderRadius: 8 }} />
          </div>
          {/* 3 info rows */}
          {[200, 240, 180].map((w, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: i < 2 ? 16 : 0 }}>
              <div className="acct-shimmer" style={{ height: 11, width: 60 }} />
              <div className="acct-shimmer" style={{ height: 18, width: w }} />
            </div>
          ))}
          {/* Buttons placeholder */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
            <div className="acct-shimmer" style={{ height: 44, width: 140, borderRadius: 10 }} />
            <div className="acct-shimmer" style={{ height: 44, width: 140, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
