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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = searchParams.get("returnTo") || "/account";

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

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      // Check if Google OAuth is configured
      const response = await fetch(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google Sign-In is not available at this time.");
      }

      // If configured, redirect to Google OAuth
      window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue with Google.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p>Raghul Snacks account</p>
        <h1>{signup ? "Save your favourites." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Create an account to make future orders and tracking simpler."
            : "Sign in to continue to your orders."}
        </p>
        <div className={styles.introAccent}>
          <div className={styles.accentItem}>Secure checkout with us</div>
          <div className={styles.accentItem}>Track your orders anytime</div>
          <div className={styles.accentItem}>
            {signup ? "Access exclusive updates" : "Quick reorder"}
          </div>
        </div>
      </section>

      <section className={styles.formWrapper}>
        <form className={styles.form} onSubmit={submit}>
          <h2 className={styles.formTitle}>
            {signup ? "Create account" : "Sign in"}
          </h2>

          {signup && (
            <label>
              <span>Full name</span>
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
              />
            </label>
          )}

          <label>
            <span>Email address</span>
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            <span>Password</span>
            <div className={styles.passwordField}>
              <input
                autoComplete={signup ? "new-password" : "current-password"}
                type={showPassword ? "text" : "password"}
                required
                minLength={signup ? 8 : undefined}
                placeholder={signup ? "At least 8 characters" : "••••••••"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className="button button-dark" disabled={loading}>
            {loading ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={styles.googleButton}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.335z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <p className={styles.switch}>
            {signup ? "Already have an account?" : "New here?"}
            <br />
            <Link
              href={
                signup
                  ? `/login${returnTo !== "/account" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                  : `/signup${returnTo !== "/account" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
              }
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
