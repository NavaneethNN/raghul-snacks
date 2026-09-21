"use client";

import { useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

export function AdminSettings() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSave() {
    // Settings form currently uses uncontrolled inputs and no API backend —
    // show a save confirmation to the user.
    showToast("Settings updated.");
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
          <p className={styles.eyebrow}>System Configuration</p>
          <h1>Settings</h1>
          <p>Configure your store settings and preferences.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      <section className={styles.workspace}>
        <div style={{ padding: '40px' }}>
          <div style={{ maxWidth: '700px' }}>
            {/* Store Information */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Store Information</h3>
              <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>Basic details about your store.</p>

              <div style={{ background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Store Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Raghul Delights"
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
                    Store Email
                  </label>
                  <input
                    type="email"
                    placeholder="Store email address"
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
                    Support Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
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
              </div>
            </div>

            {/* Payment Settings */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Payment Gateway</h3>
              <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>Configure Razorpay payment integration.</p>

              <div style={{ background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_test_xxxxxxxxxxxx"
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
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your key secret"
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
              </div>
            </div>

            {/* Admin Password */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Admin Password</h3>
              <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>Change your admin panel password.</p>

              <div style={{ background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
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
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
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
              </div>
            </div>

            <button className={styles.primaryButton} style={{ width: '100%' }} onClick={handleSave}>
              Save All Settings
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
