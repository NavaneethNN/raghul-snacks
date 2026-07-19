"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { CheckoutWizard } from "@/components/checkout-wizard";
import { formatPrice } from "@/lib/catalog";
import styles from "./checkout.module.css";

type PaymentOrder = { id: string; amount: number; currency: string; key?: string; shipping: number; courierName: string; estimatedDeliveryDays: string | null };
type ShippingQuote = { charge: number; courierName: string; estimatedDeliveryDays: string | null }; 
type CheckoutForm = { customerName: string; phone: string; email: string; address: string; city: string; state: string; pincode: string };

export default function CheckoutPage() {
  return <CheckoutWizard />;
}

function LegacyCheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutForm>({ customerName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [locationError, setLocationError] = useState("");
  const itemPayload = useMemo(() => items.map((item) => ({ productId: item.id, quantity: item.quantity })), [items]);
  const shipping = quote?.charge ?? 0;
  const total = subtotal + shipping;

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

  useEffect(() => {
    fetch("/api/locations/states").then(async (response) => {
      const data = await response.json() as { states?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load states.");
      setStates(data.states || []);
    }).catch((caught) => setLocationError(caught instanceof Error ? caught.message : "Unable to load states."));
  }, []);

  useEffect(() => {
    if (!form.state) { setCities([]); return; }
    setCities([]); setForm((current) => ({ ...current, city: "" }));
    fetch(`/api/locations/cities?state=${encodeURIComponent(form.state)}`).then(async (response) => {
      const data = await response.json() as { cities?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load cities.");
      setCities(data.cities || []);
    }).catch((caught) => setLocationError(caught instanceof Error ? caught.message : "Unable to load cities."));
  }, [form.state]);

  function updateField(field: keyof CheckoutForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    setLoading(true); setError("");
    try {
      if (!quote) throw new Error("Enter a valid delivery PIN code to calculate shipping first.");
      const payload = { ...form, items: itemPayload };
      const response = await fetch("/api/checkout/create-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const paymentOrder = await response.json() as PaymentOrder & { error?: string };
      if (!response.ok || !paymentOrder.key) throw new Error(paymentOrder.error || "Payment could not be started.");
      if (!window.Razorpay) throw new Error("The secure payment window is still loading. Please try again.");
      new window.Razorpay({ key: paymentOrder.key, amount: paymentOrder.amount, currency: paymentOrder.currency, name: "Raghul Snacks", description: `${items.length} fresh snack item${items.length > 1 ? "s" : ""}`, order_id: paymentOrder.id, prefill: { name: form.customerName, contact: form.phone, email: form.email || undefined }, theme: { color: "#c95f3b" }, handler: async (payment) => {
        const verifyResponse = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }) });
        const verified = await verifyResponse.json() as { orderNumber?: string; error?: string };
        if (!verifyResponse.ok || !verified.orderNumber) { setError(verified.error || "Your payment needs support review. Please contact us."); setLoading(false); return; }
        clearCart(); window.location.assign(`/track?order=${encodeURIComponent(verified.orderNumber)}`);
      } }).open();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to continue to payment."); setLoading(false); }
  }

  if (!items.length) return <section className={styles.empty}><p className="eyebrow">Checkout</p><h1>Your bag is empty.</h1><p>Add a few fresh snacks before placing your order.</p><Link className="button button-dark" href="/shop">Shop snacks</Link></section>;
  return <><Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setPaymentReady(true)} /><main className={styles.page}><Link className={styles.crumb} href="/cart">← Back to bag</Link><h1 className={styles.heading}>Almost yours.</h1><div className={styles.layout}><form className={styles.form} onSubmit={submit}><div className={styles.section}><div className={styles.sectionHead}><span>01</span><div><h2>Delivery details</h2><p>Where should we send your fresh snacks?</p></div></div><div className={styles.fields}><label className={styles.field}>Full name<input autoComplete="name" required value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} /></label><label className={styles.field}>Mobile number<input autoComplete="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit number" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label><label className={`${styles.field} ${styles.full}`}>Email <small>Optional, for your order receipt</small><input autoComplete="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label><label className={`${styles.field} ${styles.full}`}>Street address<textarea autoComplete="street-address" required minLength={8} placeholder="House / flat number, street and area" value={form.address} onChange={(event) => updateField("address", event.target.value)} /></label><label className={styles.field}>State<select required value={form.state} onChange={(event) => updateField("state", event.target.value)}><option value="">{states.length ? "Select state" : "Loading states…"}</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></label><label className={styles.field}>City<select required disabled={!form.state || !cities.length} value={form.city} onChange={(event) => updateField("city", event.target.value)}><option value="">{form.state ? cities.length ? "Select city" : "Loading cities…" : "Select state first"}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label className={styles.field}>PIN code<input autoComplete="postal-code" required inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit PIN" value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} /></label></div></div><div className={styles.section}><div className={styles.sectionHead}><span>02</span><div><h2>Delivery method</h2><p>Live carrier pricing from Shiprocket.</p></div></div><div className={styles.delivery}><div><strong>{quote?.courierName || "Enter your PIN code"}</strong><span>{quoteLoading ? "Calculating delivery…" : quote?.estimatedDeliveryDays ? `Estimated delivery: ${quote.estimatedDeliveryDays}` : "Delivery charge is calculated for your address"}</span></div><strong>{quote ? formatPrice(shipping) : "—"}</strong></div></div><div className={styles.section}><div className={styles.sectionHead}><span>03</span><div><h2>Payment</h2><p>Pay safely using Razorpay</p></div></div><div className={styles.delivery}><div><strong>Secure online payment</strong><span>UPI, cards, netbanking and wallets</span></div><strong>Razorpay</strong></div>{(error || locationError) && <p className={styles.error}>{error || locationError}</p>}<button className={`button button-dark ${styles.pay}`} disabled={loading || !paymentReady || !quote || quoteLoading}>{loading ? "Opening secure payment…" : quoteLoading ? "Calculating delivery…" : !quote ? "Enter PIN code for delivery" : paymentReady ? `Pay ${formatPrice(total)} securely` : "Loading secure payment…"}</button><p className={styles.security}><b>▣</b><span>Your payment is encrypted and processed securely. We never store card details.</span></p></div></form><aside className={styles.summary}><p className={styles.summaryEyebrow}>Order summary</p><h2>Your fresh picks.</h2><div className={styles.lineItems}>{items.map((item) => <div className={styles.item} key={item.id}><div className={styles.thumb}>{item.category.slice(0, 3)}</div><p>{item.name}<span>{item.weight} · Qty {item.quantity}</span></p><strong>{formatPrice(item.offerPrice * item.quantity)}</strong></div>)}</div><p className={styles.priceRow}><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p><p className={styles.priceRow}><span>Delivery</span><strong>{quote ? formatPrice(shipping) : "Calculated at PIN code"}</strong></p><div className={styles.total}><span>Total</span><strong>{formatPrice(total)}</strong></div><p className={styles.summaryFoot}>Packed fresh in small batches · Live courier pricing by Shiprocket</p></aside></div></main></>;
}
