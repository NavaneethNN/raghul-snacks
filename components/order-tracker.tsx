"use client";

import { FormEvent, useState } from "react";

type Result = { orderNumber: string; orderStatus: string; paymentStatus: string; createdAt: string };
const labels: Record<string, string> = { placed: "Order placed", packed: "Packed with care", shipped: "On the way", delivered: "Delivered", cancelled: "Cancelled" };

export function OrderTracker({ initialOrder }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder || "");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResult(null); setLoading(true);
    try {
      const response = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, phone }) });
      const data = await response.json() as { order?: Result; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "Unable to find your order.");
      setResult(data.order);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to find your order."); } finally { setLoading(false); }
  }

  return <div className="order-tracker"><form className="checkout-form" onSubmit={submit}><p className="eyebrow">Order tracking</p><h1>Where&apos;s my order?</h1><p>Enter the details used at checkout to see your latest delivery status.</p><label>Order number<input required placeholder="RS-12345678" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} /></label><label>Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? "Checking…" : "Track order"}</button></form>{result && <aside className="order-summary tracking-result"><p className="eyebrow">Latest update</p><h2>{labels[result.orderStatus] || "Order received"}</h2><p>Order <strong>{result.orderNumber}</strong></p><p>Placed {new Date(result.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</p><p>Payment: <strong>{result.paymentStatus === "paid" ? "Confirmed" : result.paymentStatus}</strong></p></aside>}</div>;
}
