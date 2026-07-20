"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { PasswordInput } from "@/components/password-input";
import { formatPrice, formatWeight } from "@/lib/catalog";
import styles from "./checkout-wizard.module.css";

type CheckoutForm = { customerName: string; phone: string; email: string; password: string; confirmPassword: string; address: string; city: string; state: string; pincode: string }; 
type ShippingQuote = { charge: number; courierName: string; estimatedDeliveryDays: string | null };
type PaymentOrder = { orderId: string; paymentSessionId: string; environment: "sandbox" | "production"; error?: string };

const steps = ["Contact", "Delivery"];

export function CheckoutWizard() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState<CheckoutForm>({ customerName: "", phone: "", email: "", password: "", confirmPassword: "", address: "", city: "", state: "", pincode: "" });
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const itemPayload = useMemo(() => items.map((item) => ({ productId: item.id, quantity: item.quantity })), [items]);
  const shipping = quote?.charge ?? 0;
  const total = subtotal + shipping;

  useEffect(() => {
    const savedPincode = window.localStorage.getItem("raghul-snacks-pincode");
    if (savedPincode && /^\d{6}$/.test(savedPincode)) setForm((current) => ({ ...current, pincode: savedPincode }));
    fetch("/api/auth/session").then(async (response) => {
      const data = await response.json() as { account?: { name: string; email: string } | null };
      if (!data.account) {
        // Redirect to login with return URL
        window.location.href = `/login?returnTo=${encodeURIComponent('/checkout')}`;
        return;
      }
      setAccount(data.account);
      setForm((current) => ({ ...current, customerName: data.account!.name, email: data.account!.email }));
      setCheckingAuth(false);
    }).catch(() => {
      window.location.href = `/login?returnTo=${encodeURIComponent('/checkout')}`;
    });
  }, []);

  useEffect(() => {
    fetch("/api/locations/states").then(async (response) => {
      const data = await response.json() as { states?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load states.");
      setStates(data.states || []);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load states."));
  }, []);

  useEffect(() => {
    if (!form.state) { setCities([]); return; }
    setCities([]); setForm((current) => ({ ...current, city: "" }));
    fetch(`/api/locations/cities?state=${encodeURIComponent(form.state)}`).then(async (response) => {
      const data = await response.json() as { cities?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load cities.");
      setCities(data.cities || []);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load cities."));
  }, [form.state]);

  useEffect(() => {
    if (!/^\d{6}$/.test(form.pincode) || !itemPayload.length) { setQuote(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true); setError("");
      try {
        const response = await fetch("/api/shipping/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ pincode: form.pincode, items: itemPayload }) });
        const data = await response.json() as ShippingQuote & { error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to calculate delivery.");
        setQuote(data);
      } catch (caught) { if (!controller.signal.aborted) { setQuote(null); setError(caught instanceof Error ? caught.message : "Unable to calculate delivery."); } } finally { if (!controller.signal.aborted) setQuoteLoading(false); }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [form.pincode, itemPayload]);

  function update(field: keyof CheckoutForm, value: string) { setError(""); setSuccess(""); setForm((current) => ({ ...current, [field]: value })); }

  function continueTo(nextStep: number) {
    setError("");

    if (step === 1) {
      // Validate Step 1: Contact Details
      if (!form.customerName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (form.customerName.trim().length < 3) {
        setError("Name must be at least 3 characters long.");
        return;
      }
      if (!form.phone) {
        setError("Please enter your mobile number.");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(form.phone)) {
        setError("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
        return;
      }
    }

    setStep(nextStep);
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Validate delivery form if on step 2
    if (step === 2) {
      // Validate address
      if (!form.address.trim()) {
        setError("Please enter your delivery address.");
        return;
      }
      if (form.address.trim().length < 8) {
        setError("Address must be at least 8 characters long.");
        return;
      }

      // Validate state
      if (!form.state) {
        setError("Please select your state.");
        return;
      }

      // Validate city
      if (!form.city) {
        setError("Please select your city.");
        return;
      }

      // Validate PIN code
      if (!form.pincode) {
        setError("Please enter your PIN code.");
        return;
      }
      if (!/^\d{6}$/.test(form.pincode)) {
        setError("Please enter a valid 6-digit PIN code.");
        return;
      }

      // Validate shipping quote
      if (!quote) {
        if (quoteLoading) {
          setError("Please wait while we calculate your delivery charges.");
        } else {
          setError("Unable to calculate shipping. Please check your PIN code.");
        }
        return;
      }
    }

    if (!quote || !paymentReady) return;
    setLoading(true); setError("");
    try {
      const payload = { ...form, items: itemPayload };
      const response = await fetch("/api/checkout/create-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const paymentOrder = await response.json() as PaymentOrder;
      if (!response.ok || !paymentOrder.paymentSessionId) throw new Error(paymentOrder.error || "Payment could not be started.");
      if (!window.Cashfree) throw new Error("The secure payment window is still loading. Please try again.");
      const result = await window.Cashfree({ mode: paymentOrder.environment }).checkout({ paymentSessionId: paymentOrder.paymentSessionId, redirectTarget: "_modal" });
      if (result.error) throw new Error(result.error.message || "Payment was cancelled.");
      if (!result.paymentDetails) { setLoading(false); return; }
      const verifyResponse = await fetch("/api/cashfree/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, cashfreeOrderId: paymentOrder.orderId }) });
      const verified = await verifyResponse.json() as { orderNumber?: string; error?: string };
      if (!verifyResponse.ok || !verified.orderNumber) throw new Error(verified.error || "Your payment needs support review. Please contact us.");
      window.localStorage.setItem("raghul-snacks-last-order", JSON.stringify({ orderNumber: verified.orderNumber, phone: form.phone }));
      setSuccess("Payment successful! Your order is confirmed. Taking you to your order details…");
      window.setTimeout(() => { clearCart(); window.location.assign("/orders"); }, 1100);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to continue to payment."); setLoading(false); }
  }

  if (checkingAuth) return <section className={styles.empty}><p className="eyebrow">Checkout</p><h1>Checking authentication...</h1><p>Please wait while we verify your session.</p></section>;
  if (!items.length) return <section className={styles.empty}><p className="eyebrow">Checkout</p><h1>Your bag is empty.</h1><p>Add a few fresh snacks before placing your order.</p><Link className="button button-dark" href="/shop">Shop snacks</Link></section>;
  return <><Script src="https://sdk.cashfree.com/js/v3/cashfree.js" onLoad={() => setPaymentReady(true)} /><main className={styles.page}><Link className={styles.back} href="/cart">← Back to bag</Link><div className={styles.intro}><p className="eyebrow">Secure checkout</p><h1>Fresh snacks, <em>on their way.</em></h1></div><div className={styles.layout}><form className={styles.card} onSubmit={pay}><nav className={styles.steps} aria-label="Checkout progress">{steps.map((label, index) => { const number = index + 1; return <button type="button" key={label} className={number === step ? styles.activeStep : number < step ? styles.completeStep : ""} disabled={number > step} onClick={() => setStep(number)}><span>{number < step ? "✓" : number}</span>{label}</button>; })}</nav>{step === 1 && <section className={styles.panel}><div className={styles.panelHead}><p>Step 1 of 2</p><h2>How can we reach you?</h2><span>We use this only for delivery updates.</span></div><div className={styles.fields}><label>Full name<input autoComplete="name" autoFocus required value={form.customerName} onChange={(event) => update("customerName", event.target.value)} /></label><label>Mobile number<input autoComplete="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit number" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><p className={styles.full}>Signed in as <strong>{account?.name}</strong> ({account?.email}). Your order will be added to this account.</p></div></section>}{step === 2 && <section className={styles.panel}><div className={styles.panelHead}><p>Step 2 of 2</p><h2>Where should we deliver?</h2><span>Choose your location to calculate a live courier rate and complete payment.</span></div><div className={styles.fields}><label className={styles.full}>Street address<textarea autoComplete="street-address" required minLength={8} placeholder="House / flat number, street and area" value={form.address} onChange={(event) => update("address", event.target.value)} /></label><label>State<select required value={form.state} onChange={(event) => update("state", event.target.value)}><option value="">{states.length ? "Select state" : "Loading states…"}</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></label><label>City<select required disabled={!form.state || !cities.length} value={form.city} onChange={(event) => update("city", event.target.value)}><option value="">{form.state ? cities.length ? "Select city" : "Loading cities…" : "Select state first"}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label>PIN code<input autoComplete="postal-code" required inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit PIN" value={form.pincode} onChange={(event) => update("pincode", event.target.value)} /></label></div><div className={styles.courier}><div><strong>{quote?.courierName || "Courier rate"}</strong><span>{quoteLoading ? "Calculating delivery…" : quote?.estimatedDeliveryDays ? `Estimated delivery: ${quote.estimatedDeliveryDays}` : "Enter your PIN code for a live delivery quote"}</span></div><b>{quote ? formatPrice(shipping) : "—"}</b></div><p className={styles.security}>▣ Your payment is encrypted and processed securely. We never store card details.</p></section>}{success && <p className={styles.success}>{success}</p>}{error && <p className={styles.error}>{error}</p>}<div className={styles.actions}>{step > 1 ? <button className={styles.secondary} type="button" onClick={() => setStep(step - 1)}>← Back</button> : <span />}{step < 2 ? <button className="button button-dark" type="button" onClick={() => continueTo(step + 1)}>Continue →</button> : <button className="button button-dark" type="submit" disabled={loading || !paymentReady || !quote}>{loading ? "Opening secure payment…" : paymentReady && quote ? `Pay ${formatPrice(total)} securely` : !quote ? "Enter PIN code first" : "Loading secure payment…"}</button>}</div></form><aside className={styles.summary}><p className={styles.summaryLabel}>Order summary</p><h2>Your fresh picks.</h2><div className={styles.items}>{items.map((item) => <div key={item.id}><span>{item.name}<small>{formatWeight(item.weight)} · Qty {item.quantity}</small></span><strong>{formatPrice(item.offerPrice * item.quantity)}</strong></div>)}</div><p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p><p><span>Delivery</span><strong>{quote ? formatPrice(shipping) : "Calculated next"}</strong></p><div className={styles.total}><span>Total</span><strong>{formatPrice(total)}</strong></div><small>Live courier pricing by Shiprocket</small></aside></div></main></>;
}
