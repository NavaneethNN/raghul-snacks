"use client";

import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminShipping() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
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
          <button className={styles.signOutButton} onClick={signOut}>Sign out</button>
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
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  defaultValue="499"
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Standard Shipping Rate (₹)
                </label>
                <input
                  type="number"
                  defaultValue="50"
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
                  placeholder="Enter your Shiprocket API key"
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
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
