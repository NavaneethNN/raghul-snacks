"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

export function AdminSettings() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, keepLoggedIn }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);

      if (!keepLoggedIn) {
        setTimeout(() => router.replace("/admin/login"), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Panel</p>
          <h1>Security</h1>
          <p>Update your admin password.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      <section className={styles.workspace} style={{ maxWidth: 520, margin: "32px auto" }}>
        <div style={{ padding: "clamp(16px, 4vw, 32px)" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
            Change Password
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6b7280" }}>
            Enter your current password and choose a new one.
          </p>

          {success && (
            <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 14, color: "#166534", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {keepLoggedIn ? "Password changed successfully." : "Password changed. Redirecting to login…"}
            </div>
          )}

          {error && (
            <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 14, color: "#dc2626", marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="Enter current password"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", boxSizing: "border-box" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", fontSize: 14, color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--terracotta)", cursor: "pointer" }}
              />
              Keep me logged in after changing password
            </label>

            <button
              type="submit"
              disabled={saving}
              className={styles.primaryButton}
              style={{ alignSelf: "flex-start", minWidth: 160 }}
            >
              {saving ? "Saving…" : "Change Password"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
