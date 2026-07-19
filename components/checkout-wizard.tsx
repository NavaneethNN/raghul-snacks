"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/catalog";
import styles from "./checkout-wizard.module.css";

type CheckoutForm = { customerName: string; phone: string; email: string; password: string; confirmPassword: string; address: string; city: string; state: string; pincode: string }; 
type ShippingQuote = { charge: number; courierName: string; estimatedDeliveryDays: string | null };
type PaymentOrder = { orderId: string; paymentSessionId: string; environment: "sandbox" | "production"; error?: string };

const steps = ["Contact", "Delivery", "Review"];

export function CheckoutWizard() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
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
      if (!data.account) return;
      setAccount(data.account); setForm((current) => ({ ...current, customerName: data.account!.name, email: data.account!.email, password: "", confirmPassword: "" }));
    }).catch(() => undefined);
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
    if (step === 1 && (!form.customerName.trim() || !/^[6-9]\d{9}$/.test(form.phone) || !/^\S+@\S+\.\S+$/.test(form.email) || (!account && (form.password.length < 8 || form.password !== form.confirmPassword)))) { setError(account ? "Enter your name, mobile number, and account email." : "Enter your name, mobile number, email, and matching password of at least 8 characters."); return; }
    if (step === 2 && (!form.address.trim() || !form.state || !form.city || !/^\d{6}$/.test(form.pincode) || !quote)) { setError(quoteLoading ? "Delivery is still being calculated." : "Complete your delivery details and wait for a shipping quote."); return; }
    setError(""); setStep(nextStep);
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  if (!items.length) return <section className={styles.empty}><p className="eyebrow">Checkout</p><h1>Your bag is empty.</h1><p>Add a few fresh snacks before placing your order.</p><Link className="button button-dark" href="/shop">Shop snacks</Link></section>;
  return <><Script src="https://sdk.cashfree.com/js/v3/cashfree.js" onLoad={() => setPaymentReady(true)} /><main className={styles.page}><Link className={styles.back} href="/cart">← Back to bag</Link><div className={styles.intro}><p className="eyebrow">Secure checkout</p><h1>Fresh snacks, <em>on their way.</em></h1></div><div className={styles.layout}><form className={styles.card} onSubmit={pay}><nav className={styles.steps} aria-label="Checkout progress">{steps.map((label, index) => { const number = index + 1; return <button type="button" key={label} className={number === step ? styles.activeStep : number < step ? styles.completeStep : ""} disabled={number > step} onClick={() => setStep(number)}><span>{number < step ? "✓" : number}</span>{label}</button>; })}</nav>{step === 1 && <section className={styles.panel}><div className={styles.panelHead}><p>Step 1 of 3</p><h2>How can we reach you?</h2><span>We use this only for delivery updates.</span></div><div className={styles.fields}><label>Full name<input autoComplete="name" autoFocus required value={form.customerName} onChange={(event) => update("customerName", event.target.value)} /></label><label>Mobile number<input autoComplete="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit number" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><label className={styles.full}>Email <small>{account ? "Signed-in account email" : "Used to create your account and send your receipt"}</small><input autoComplete="email" type="email" required readOnly={Boolean(account)} value={form.email} onChange={(event) => update("email", event.target.value)} /></label>{account ? <p className={styles.full}>Signed in as <strong>{account.name}</strong>. Your new order will be added to this account.</p> : <><label>Password <input autoComplete="new-password" type="password" required minLength={8} placeholder="At least 8 characters" value={form.password} onChange={(event) => update("password", event.target.value)} /></label><label>Confirm password<input autoComplete="new-password" type="password" required minLength={8} value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} /></label></>}</div></section>}{step === 2 && <section className={styles.panel}><div className={styles.panelHead}><p>Step 2 of 3</p><h2>Where should we deliver?</h2><span>Choose your location to calculate a live courier rate.</span></div><div className={styles.fields}><label className={styles.full}>Street address<textarea autoComplete="street-address" required minLength={8} placeholder="House / flat number, street and area" value={form.address} onChange={(event) => update("address", event.target.value)} /></label><label>State<select required value={form.state} onChange={(event) => update("state", event.target.value)}><option value="">{states.length ? "Select state" : "Loading states…"}</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></label><label>City<select required disabled={!form.state || !cities.length} value={form.city} onChange={(event) => update("city", event.target.value)}><option value="">{form.state ? cities.length ? "Select city" : "Loading cities…" : "Select state first"}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label>PIN code<input autoComplete="postal-code" required inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit PIN" value={form.pincode} onChange={(event) => update("pincode", event.target.value)} /></label></div><div className={styles.courier}><div><strong>{quote?.courierName || "Courier rate"}</strong><span>{quoteLoading ? "Calculating delivery…" : quote?.estimatedDeliveryDays ? `Estimated delivery: ${quote.estimatedDeliveryDays}` : "Enter your PIN code for a live delivery quote"}</span></div><b>{quote ? formatPrice(shipping) : "—"}</b></div></section>}{step === 3 && <section className={styles.panel}><div className={styles.panelHead}><p>Step 3 of 3</p><h2>Review and pay.</h2><span>Your order will be delivered to the details below.</span></div><div className={styles.review}><div><span>Contact</span><strong>{form.customerName} · {form.phone}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div><div><span>Delivery address</span><strong>{form.address}, {form.city}, {form.state} — {form.pincode}</strong><button type="button" onClick={() => setStep(2)}>Edit</button></div><div><span>Payment</span><strong>Secure payment via Cashfree</strong></div></div><p className={styles.security}>▣ Your payment is encrypted and processed securely. We never store card details.</p></section>}{success && <p className={styles.success}>{success}</p>}{error && <p className={styles.error}>{error}</p>}<div className={styles.actions}>{step > 1 ? <button className={styles.secondary} type="button" onClick={() => setStep(step - 1)}>← Back</button> : <span />}{step < 3 ? <button className="button button-dark" type="button" onClick={() => continueTo(step + 1)}>Continue →</button> : <button className="button button-dark" type="submit" disabled={loading || !paymentReady}>{loading ? "Opening secure payment…" : paymentReady ? `Pay ${formatPrice(total)} securely` : "Loading secure payment…"}</button>}</div></form><aside className={styles.summary}><p className={styles.summaryLabel}>Order summary</p><h2>Your fresh picks.</h2><div className={styles.items}>{items.map((item) => <div key={item.id}><span>{item.name}<small>{item.weight} · Qty {item.quantity}</small></span><strong>{formatPrice(item.offerPrice * item.quantity)}</strong></div>)}</div><p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p><p><span>Delivery</span><strong>{quote ? formatPrice(shipping) : "Calculated next"}</strong></p><div className={styles.total}><span>Total</span><strong>{formatPrice(total)}</strong></div><small>Live courier pricing by Shiprocket</small></aside></div></main></>;
}
