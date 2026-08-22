"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./customer-auth-form.module.css";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string; // server-level or Google errors
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p style={{ margin: "5px 0 0", fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </p>
  );
}

export function CustomerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const returnTo = searchParams.get("returnTo") || "/account";

  useEffect(() => {
    const googleErrors: Record<string, string> = {
      google_not_configured: "Google Sign-In is not available at this time.",
      google_denied: "Google sign-in was cancelled.",
      google_no_email: "We couldn't get a verified email from your Google account.",
      google_failed: "Something went wrong signing in with Google. Please try again.",
    };
    const code = searchParams.get("error");
    if (code) setErrors({ form: googleErrors[code] || "Something went wrong signing in with Google." });
  }, [searchParams]);

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    if (signup) {
      if (!name.trim()) next.name = "Full name is required.";
      else if (name.trim().length < 3) next.name = "Name must be at least 3 characters.";
    }

    if (!email.trim()) next.email = "Email address is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Please enter a valid email address.";

    if (!password) next.password = "Password is required.";
    else if (signup && password.length < 8) next.password = "Password must be at least 8 characters.";

    if (signup) {
      if (!confirmPassword) next.confirmPassword = "Please confirm your password.";
      else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password } : { email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      router.replace(returnTo);
      router.refresh();
    } catch (caught) {
      setErrors({ form: caught instanceof Error ? caught.message : "Unable to continue." });
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setErrors({});
    setLoading(true);
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => hasError
    ? { borderColor: "#dc2626", outline: "none" }
    : {};

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p>Raghul Delights account</p>
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
        <form className={styles.form} onSubmit={submit} noValidate>
          <h2 className={styles.formTitle}>
            {signup ? "Create account" : "Sign in"}
          </h2>

          {/* Full name — signup only */}
          {signup && (
            <div>
              <label>
                <span>Full name</span>
                <input
                  autoComplete="name"
                  value={name}
                  style={inputStyle(!!errors.name)}
                  onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                  placeholder="Your full name"
                />
              </label>
              <FieldError message={errors.name} />
            </div>
          )}

          {/* Email */}
          <div>
            <label>
              <span>Email address</span>
              <input
                autoComplete="email"
                type="email"
                value={email}
                style={inputStyle(!!errors.email)}
                onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                placeholder="you@example.com"
              />
            </label>
            <FieldError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <label>
              <span>Password</span>
              <div className={styles.passwordField} style={errors.password ? { borderColor: "#dc2626" } : {}}>
                <input
                  autoComplete={signup ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                  placeholder={signup ? "At least 8 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
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
            <FieldError message={errors.password} />
          </div>

          {/* Confirm password — signup only */}
          {signup && (
            <div>
              <label>
                <span>Confirm password</span>
                <div className={styles.passwordField} style={errors.confirmPassword ? { borderColor: "#dc2626" } : {}}>
                  <input
                    autoComplete="new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={styles.passwordToggle}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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
              <FieldError message={errors.confirmPassword} />
            </div>
          )}

          {/* Server / form-level error (e.g. wrong password, email taken) */}
          {errors.form && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ margin: 0, fontSize: 13, color: "#dc2626", lineHeight: 1.4 }}>{errors.form}</p>
            </div>
          )}

          <button className="button button-dark" disabled={loading}>
            {loading ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={styles.googleButton}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.335z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
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
