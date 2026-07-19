"use client";

import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminSettings() {
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
          <p className={styles.eyebrow}>System Configuration</p>
          <h1>Settings</h1>
          <p>Configure your store settings and preferences.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.signOutButton} onClick={signOut}>Sign out</button>
        </div>
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
                    defaultValue="Raghul Snacks"
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
                    placeholder="contact@raghulsnacks.com"
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

            <button className={styles.primaryButton} style={{ width: '100%' }}>
              Save All Settings
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
