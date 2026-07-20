"use client";

import { FormEvent, useState } from "react";
import styles from "./order-tracker.module.css";

type Result = { orderNumber: string; orderStatus: string; paymentStatus: string; createdAt: string };
const labels: Record<string, string> = { placed: "Order placed", packed: "Packed with care", shipped: "On the way", delivered: "Delivered", cancelled: "Cancelled" };

export function OrderTracker({ initialOrder }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder || "");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    // Client-side validation
    if (!orderNumber.trim()) {
      setError("Please enter your order number.");
      return;
    }
    if (!/^RS-\d{8}$/i.test(orderNumber)) {
      setError("Please enter a valid order number (format: RS-12345678).");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone })
      });
      const data = await response.json() as { order?: Result; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "Unable to find your order.");
      setResult(data.order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to find your order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.formSection}>
          <p className="eyebrow">Order tracking</p>
          <h1>Where&apos;s my order?</h1>
          <p className={styles.subtitle}>Enter your order details to check the latest delivery status.</p>

          <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
              <label>Order number</label>
              <input
                required
                placeholder="RS-12345678"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              />
              <small>Found in your order confirmation email</small>
            </div>

            <div className={styles.field}>
              <label>Mobile number</label>
              <input
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                placeholder="10-digit number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <small>Used during checkout</small>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className="button button-dark" disabled={loading}>
              {loading ? "Checking…" : "Track order"}
            </button>
          </form>
        </div>

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                {result.orderStatus === "delivered" ? "✓" : "📦"}
              </div>
              <p className="eyebrow">Latest update</p>
              <h2>{labels[result.orderStatus] || "Order received"}</h2>

              <div className={styles.orderDetails}>
                <div className={styles.detail}>
                  <span>Order number</span>
                  <strong>{result.orderNumber}</strong>
                </div>
                <div className={styles.detail}>
                  <span>Order date</span>
                  <strong>{new Date(result.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</strong>
                </div>
                <div className={styles.detail}>
                  <span>Payment status</span>
                  <strong className={result.paymentStatus === "paid" ? styles.paid : ""}>
                    {result.paymentStatus === "paid" ? "Paid ✓" : result.paymentStatus}
                  </strong>
                </div>
              </div>

              <div className={styles.timeline}>
                <div className={result.orderStatus === "placed" || result.orderStatus === "packed" || result.orderStatus === "shipped" || result.orderStatus === "delivered" ? styles.active : ""}>
                  <span>Order placed</span>
                </div>
                <div className={result.orderStatus === "packed" || result.orderStatus === "shipped" || result.orderStatus === "delivered" ? styles.active : ""}>
                  <span>Packed</span>
                </div>
                <div className={result.orderStatus === "shipped" || result.orderStatus === "delivered" ? styles.active : ""}>
                  <span>Shipped</span>
                </div>
                <div className={result.orderStatus === "delivered" ? styles.active : ""}>
                  <span>Delivered</span>
                </div>
              </div>

              <p className={styles.helpText}>
                Need help with this order? Contact us with your order number.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
