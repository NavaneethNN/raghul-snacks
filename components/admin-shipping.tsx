"use client";

import { useState, useEffect } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

type Rates = {
  tamilNaduRate: string;      // Coimbatore + Tamil Nadu (Zone 1 & 2)
  southIndiaRate: string;     // Kerala, Karnataka, AP, Telangana (Zone 3)
  northIndiaRate: string;     // North India by air (Zone 4)
  extraKgRate: string;        // Per additional kg above 1kg (all zones)
};

const DEFAULTS: Rates = {
  tamilNaduRate: "60",
  southIndiaRate: "100",
  northIndiaRate: "250",
  extraKgRate: "30",
};

export function AdminShipping() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [rates, setRates] = useState<Rates>(DEFAULTS);

  useEffect(() => { fetchSettings(); }, []); // eslint-disable-line react-hooks/immutability

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as Record<string, string>;
        setRates({
          tamilNaduRate:   data.shippingTamilNadu   || DEFAULTS.tamilNaduRate,
          southIndiaRate:  data.shippingSouthIndia  || DEFAULTS.southIndiaRate,
          northIndiaRate:  data.shippingNorthIndia  || DEFAULTS.northIndiaRate,
          extraKgRate:     data.shippingExtraKg     || DEFAULTS.extraKgRate,
        });
      }
    } catch { /* use defaults */ } finally { setLoading(false); }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "shippingTamilNadu",  value: rates.tamilNaduRate,  description: "Shipping rate for Tamil Nadu (₹/first kg)" }) }),
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "shippingSouthIndia", value: rates.southIndiaRate, description: "Shipping rate for Kerala/Karnataka/AP/Telangana (₹/first kg)" }) }),
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "shippingNorthIndia", value: rates.northIndiaRate, description: "Shipping rate for North India by air (₹/first kg)" }) }),
        fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "shippingExtraKg",    value: rates.extraKgRate,    description: "Shipping rate per additional kg above 1kg (all zones)" }) }),
      ]);
      setToast({ msg: "Shipping rates saved.", ok: true });
      setTimeout(() => setToast(null), 3500);
    } catch {
      setToast({ msg: "Failed to save rates.", ok: false });
      setTimeout(() => setToast(null), 3500);
    } finally { setSaving(false); }
  }

  const field = (label: string, sublabel: string, key: keyof Rates) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</label>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#9ca3af" }}>{sublabel}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>₹</span>
        <input
          type="number"
          min="0"
          value={rates[key]}
          onChange={(e) => setRates((r) => ({ ...r, [key]: e.target.value }))}
          disabled={loading}
          style={{ width: "min(120px, 40%)", padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 15, fontWeight: 600, background: "var(--paper)", color: "var(--ink)" }}
        />
        <span style={{ fontSize: 13, color: "#9ca3af" }}>per first 1 kg</span>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", padding: "12px 20px", borderRadius: 10, font: "600 14px 'DM Sans',sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.14)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
          {toast.msg}
        </div>
      )}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Delivery Configuration</p>
          <h1>Shipping Rates</h1>
          <p>Set zone-based courier charges. Rates apply to the first 1 kg.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      <section className={styles.workspace}>
        <div style={{ padding: "32px", maxWidth: 600 }}>

          {/* Zone table */}
          <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600 }}>Zone Overview</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>
                  <th style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600 }}>Zone</th>
                  <th style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600 }}>States</th>
                  <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 600 }}>Rate</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 14, color: "var(--ink)" }}>
                {[
                  { zone: "Zone 1 & 2", states: "Coimbatore, Tamil Nadu", rate: `₹${rates.tamilNaduRate}` },
                  { zone: "Zone 3", states: "Kerala, Karnataka, AP, Telangana", rate: `₹${rates.southIndiaRate}` },
                  { zone: "Zone 4 (Air)", states: "North India & all other states", rate: `₹${rates.northIndiaRate}` },
                  { zone: "Extra kg", states: "Per additional kg (all zones)", rate: `+₹${rates.extraKgRate}` },
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 0", fontWeight: 600, fontSize: 13 }}>{row.zone}</td>
                    <td style={{ padding: "10px 8px", color: "#6b7280", fontSize: 13 }}>{row.states}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit rates */}
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Edit Rates</h3>

          {field("Tamil Nadu (incl. Coimbatore)", "Zones 1 & 2 — local and statewide delivery", "tamilNaduRate")}
          {field("South India", "Zone 3 — Kerala, Karnataka, Andhra Pradesh, Telangana", "southIndiaRate")}
          {field("North India (Air)", "Zone 4 — all other states, shipped by air", "northIndiaRate")}

          <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

          {field("Extra kg surcharge", "Added per kg above the first 1 kg, for all zones", "extraKgRate")}

          <button
            className={styles.primaryButton}
            onClick={saveSettings}
            disabled={saving || loading}
            style={{ marginTop: 8 }}
          >
            {saving ? "Saving…" : "Save Rates"}
          </button>

          <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
            Changes apply to new checkout sessions immediately after saving.
          </p>
        </div>
      </section>
    </div>
  );
}
