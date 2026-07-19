"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error || "Unable to sign in.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Raghul Snacks</p>
            <h1 className={styles.title}>Admin Portal</h1>
            <p className={styles.subtitle}>Sign in to access the dashboard</p>
          </div>

          <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={styles.input}
                placeholder="Enter admin password"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className={styles.footer}>
            <p>Secure access to order management</p>
          </div>
        </div>
      </div>
    </div>
  );
}
