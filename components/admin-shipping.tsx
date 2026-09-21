"use client";

import { useState, useEffect } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

export function AdminShipping() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [settings, setSettings] = useState({
    standardShippingRate: "50",
    shiprocketApiKey: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          standardShippingRate: data.standardShippingRate || "50",
          shiprocketApiKey: data.shiprocketApiKey || ""
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "standardShippingRate",
            value: settings.standardShippingRate,
            description: "Standard shipping rate"
          })
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "shiprocketApiKey",
            value: settings.shiprocketApiKey,
            description: "Shiprocket API key for shipping calculations"
          })
        })
      ]);
      setToast({ msg: "Settings saved.", ok: true });
      setTimeout(() => setToast(null), 3500);
    } catch (error) {
      console.error("Error saving settings:", error);
      setToast({ msg: "Failed to save settings.", ok: false });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          background: toast.ok ? "#166534" : "#991b1b", color: "#fff",
          padding: "12px 20px", borderRadius: 10,
          font: "600 14px 'DM Sans',sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.ok
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
          {toast.msg}
        </div>
      )}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Shipping Configuration</p>
          <h1>Shipping Settings</h1>
          <p>Configure shipping rates and delivery zones.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      <section className={styles.workspace}>
        <div style={{ padding: '40px' }}>
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Shipping Configuration</h3>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>Set up your shipping rates and delivery zones.</p>

            <div style={{ background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Standard Shipping Rate (₹)
                </label>
                <input
                  type="number"
                  value={settings.standardShippingRate}
                  onChange={(e) => setSettings({ ...settings, standardShippingRate: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Shiprocket API Key
                </label>
                <input
                  type="password"
                  value={settings.shiprocketApiKey}
                  onChange={(e) => setSettings({ ...settings, shiprocketApiKey: e.target.value })}
                  placeholder="Enter your Shiprocket API key"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                />
                <small style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                  Get your API key from Shiprocket dashboard
                </small>
              </div>

              <button
                className={styles.primaryButton}
                style={{ marginTop: '24px' }}
                onClick={saveSettings}
                disabled={saving || loading}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
