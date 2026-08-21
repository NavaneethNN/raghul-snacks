"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./admin-table.module.css";

export function AdminShipping() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Shipping Configuration</p>
          <h1>Shipping Settings</h1>
          <p>Configure shipping rates and delivery zones.</p>
        </div>
        <div className={styles.headerActions}>
          
        </div>
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
