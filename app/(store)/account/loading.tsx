export default function AccountLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f7f4ec)", paddingBottom: 120 }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .acct-shimmer {
          background: linear-gradient(90deg, rgba(220, 216, 205, 0.5) 25%, rgba(255, 253, 248, 0.9) 50%, rgba(220, 216, 205, 0.5) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 80px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Top Navigation Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="acct-shimmer" style={{ height: 32, width: 130, borderRadius: 999 }} />
          <div className="acct-shimmer" style={{ height: 26, width: 140, borderRadius: 999 }} />
        </div>

        {/* Hero Card Skeleton */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(220, 216, 205, 0.8)", borderRadius: 20, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div className="acct-shimmer" style={{ width: 64, height: 64, borderRadius: "50%" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="acct-shimmer" style={{ height: 12, width: 100 }} />
                <div className="acct-shimmer" style={{ height: 24, width: 180 }} />
                <div className="acct-shimmer" style={{ height: 14, width: 220 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="acct-shimmer" style={{ height: 38, width: 100, borderRadius: 10 }} />
            </div>
          </div>

          {/* 3 Metric Tiles Skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "#faf8f5", border: "1px solid rgba(220, 216, 205, 0.7)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div className="acct-shimmer" style={{ width: 42, height: 42, borderRadius: 10 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="acct-shimmer" style={{ height: 18, width: 40 }} />
                  <div className="acct-shimmer" style={{ height: 12, width: 80 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Nav Bar Skeleton */}
        <div style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid rgba(220, 216, 205, 0.7)", borderRadius: 14, padding: 6, display: "flex", gap: 8 }}>
          {[140, 160, 150, 150].map((w, i) => (
            <div key={i} className="acct-shimmer" style={{ height: 38, width: w, borderRadius: 10 }} />
          ))}
        </div>

        {/* Orders Card Skeleton */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(220, 216, 205, 0.8)", borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid rgba(220, 216, 205, 0.6)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="acct-shimmer" style={{ height: 22, width: 160 }} />
              <div className="acct-shimmer" style={{ height: 14, width: 280 }} />
            </div>
            <div className="acct-shimmer" style={{ height: 32, width: 130, borderRadius: 8 }} />
          </div>

          {[1, 2].map((i) => (
            <div key={i} style={{ border: "1px solid rgba(220, 216, 205, 0.7)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="acct-shimmer" style={{ height: 18, width: 120 }} />
                <div className="acct-shimmer" style={{ height: 20, width: 80, borderRadius: 999 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="acct-shimmer" style={{ width: 52, height: 52, borderRadius: 8 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div className="acct-shimmer" style={{ height: 16, width: 180 }} />
                  <div className="acct-shimmer" style={{ height: 12, width: 100 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
