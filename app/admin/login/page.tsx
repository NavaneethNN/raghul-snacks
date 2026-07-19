"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Unable to sign in."); setLoading(false); return; }
    router.replace("/admin"); router.refresh();
  }
  return <section className="empty-state"><form className="checkout-form admin-login" onSubmit={submit}><p className="eyebrow">Raghul Snacks</p><h1>Admin sign in.</h1><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></section>;
}
