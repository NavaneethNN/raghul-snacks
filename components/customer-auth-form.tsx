"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./customer-auth-form.module.css";

export function CustomerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, email, password } : { email, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      router.replace("/orders"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to continue."); setLoading(false); }
  }

  return <main className={styles.page}><section className={styles.intro}><p className="eyebrow">Raghul Snacks account</p><h1>{signup ? "Save your favourites." : "Welcome back."}</h1><p>{signup ? "Create an account to make future orders and tracking simpler." : "Sign in to continue to your orders."}</p></section><form className={styles.form} onSubmit={submit}>{signup && <label>Full name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>}<label>Email address<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input autoComplete={signup ? "new-password" : "current-password"} type="password" required minLength={signup ? 8 : undefined} placeholder={signup ? "At least 8 characters" : undefined} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className={styles.error}>{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? "Please wait…" : signup ? "Create account" : "Sign in"}</button><p className={styles.switch}>{signup ? "Already have an account?" : "New here?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p></form></main>;
}
