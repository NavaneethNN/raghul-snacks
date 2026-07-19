"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/catalog";
import styles from "./cart-shipping-estimate.module.css";

type CartLine = { id: string; quantity: number };
type Quote = { charge: number; courierName: string; estimatedDeliveryDays: string | null };

export function CartShippingEstimate({ items, subtotal }: { items: CartLine[]; subtotal: number }) {
  const [pincode, setPincode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const payload = useMemo(() => items.map((item) => ({ productId: item.id, quantity: item.quantity })), [items]);

  useEffect(() => { setPincode(window.localStorage.getItem("raghul-snacks-pincode") || ""); }, []);
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) { setQuote(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/shipping/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ pincode, items: payload }) });
        const data = await response.json() as Quote & { error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to calculate delivery.");
        setQuote(data); window.localStorage.setItem("raghul-snacks-pincode", pincode);
      } catch (caught) { if (!controller.signal.aborted) { setQuote(null); setError(caught instanceof Error ? caught.message : "Unable to calculate delivery."); } } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [pincode, payload]);

  const total = Math.round((subtotal + (quote?.charge || 0)) * 100) / 100;
  return <div className={styles.estimate}><label>Delivery PIN code<input value={pincode} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="Enter 6-digit PIN" onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} /></label>{loading && <p>Calculating courier charges…</p>}{error && <p className={styles.error}>{error}</p>}{quote && <div className={styles.quote}><span><strong>{quote.courierName}</strong>{quote.estimatedDeliveryDays && <small>Estimated delivery: {quote.estimatedDeliveryDays}</small>}</span><strong>{formatPrice(quote.charge)}</strong></div>}<p><span>Shipping</span><strong>{quote ? formatPrice(quote.charge) : "Enter PIN code"}</strong></p><div className="total"><span>Total</span><strong>{formatPrice(total)}</strong></div></div>;
}
