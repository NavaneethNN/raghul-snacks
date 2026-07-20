"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./customer-auth-form.module.css";

export function CustomerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = searchParams.get("returnTo") || "/orders";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Client-side validation
    if (signup) {
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (name.trim().length < 3) {
        setError("Name must be at least 3 characters long.");
        return;
      }
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (signup && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password } : { email, password })
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      router.replace(returnTo);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
      setLoading(false);
    }
  }

  return <main className={styles.page}><section className={styles.intro}><p>Raghul Snacks account</p><h1>{signup ? "Save your favourites." : "Welcome back."}</h1><p>{signup ? "Create an account to make future orders and tracking simpler." : "Sign in to continue to your orders."}</p><div className={styles.introAccent}><div className={styles.accentItem}>Secure checkout with us</div><div className={styles.accentItem}>Track your orders anytime</div><div className={styles.accentItem}>{signup ? "Access exclusive updates" : "Quick reorder"}</div></div></section><section className={styles.formWrapper}><form className={styles.form} onSubmit={submit}><h2 className={styles.formTitle}>{signup ? "Create account" : "Sign in"}</h2>{signup && <label><span>Full name</span><input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></label>}<label><span>Email address</span><input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label><span>Password</span><input autoComplete={signup ? "new-password" : "current-password"} type="password" required minLength={signup ? 8 : undefined} placeholder={signup ? "At least 8 characters" : "••••••••"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className={styles.error}>{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? "Please wait…" : signup ? "Create account" : "Sign in"}</button><p className={styles.switch}>{signup ? "Already have an account?" : "New here?"}<br/><Link href={signup ? `/login${returnTo !== "/orders" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : `/signup${returnTo !== "/orders" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>{signup ? "Sign in" : "Create an account"}</Link></p></form></section></main>;
}
