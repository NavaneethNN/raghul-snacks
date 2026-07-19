"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/catalog";

type PaymentOrder = { id: string; amount: number; currency: string; key?: string };
type CheckoutForm = { customerName: string; phone: string; email: string; address: string };

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutForm>({ customerName: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shipping = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shipping;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/create-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) }) });
      const paymentOrder = await response.json() as PaymentOrder & { error?: string };
      if (!response.ok || !paymentOrder.key) throw new Error(paymentOrder.error || "Payment could not be started.");
      if (!window.Razorpay) throw new Error("The payment window did not load. Please refresh and try again.");
      new window.Razorpay({ key: paymentOrder.key, amount: paymentOrder.amount, currency: paymentOrder.currency, name: "Raghul Snacks", description: "Fresh traditional snacks", order_id: paymentOrder.id, prefill: { name: form.customerName, contact: form.phone, email: form.email || undefined }, theme: { color: "#c95f3b" }, handler: async (payment) => {
        const verifyResponse = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })), razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }) });
        const verified = await verifyResponse.json() as { orderNumber?: string; error?: string };
        if (!verifyResponse.ok || !verified.orderNumber) { setError(verified.error || "Your payment needs support review. Please contact us."); setLoading(false); return; }
        clearCart();
        window.location.assign(`/track?order=${encodeURIComponent(verified.orderNumber)}`);
      } }).open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue to payment.");
      setLoading(false);
    }
  }

  if (!items.length) return <section className="empty-state"><p className="eyebrow">Checkout</p><h1>Your bag is empty.</h1><p>Add a few snacks before placing your order.</p><Link className="button button-dark" href="/shop">Shop snacks</Link></section>;
  return <><Script src="https://checkout.razorpay.com/v1/checkout.js" /><section className="checkout-page"><form onSubmit={submit} className="checkout-form"><p className="eyebrow">Secure checkout</p><h1>Delivery details.</h1><label>Full name<input required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label><label>Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Email <small>(optional)</small><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Delivery address<textarea required minLength={12} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? "Opening secure payment…" : `Pay ${formatPrice(total)}`}</button></form><aside className="order-summary"><p className="eyebrow">Your order</p>{items.map((item) => <p key={item.id}><span>{item.name} × {item.quantity}</span><strong>{formatPrice(item.offerPrice * item.quantity)}</strong></p>)}<p><span>Shipping</span><strong>{shipping ? formatPrice(shipping) : "Free"}</strong></p><div className="total"><span>Total</span><strong>{formatPrice(total)}</strong></div><small>Payments are securely processed by Razorpay.</small></aside></section></>;
}
