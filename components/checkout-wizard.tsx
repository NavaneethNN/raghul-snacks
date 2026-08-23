"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/catalog";
import { clearBuyNowItem, readBuyNowItem, type BuyNowItem } from "@/lib/buy-now";
import styles from "./checkout-wizard.module.css";
type CheckoutForm = { customerName: string; phone: string; email: string; password: string; confirmPassword: string; address: string; city: string; state: string; pincode: string };
type ShippingQuote = { charge: number; courierName: string; estimatedDeliveryDays: string | null };
type PaymentOrder = { orderId: string; paymentSessionId: string; environment: "sandbox" | "production"; error?: string };
type AppliedCoupon = { code: string; name: string | null; discountType: string; value: string; discountAmount: number };
type PublicCoupon = { id: number; code: string; name: string | null; description: string | null; discountType: string; value: string; maxDiscount: string | null; minOrderValue: string; applyTo: string; applicableProducts: string[] | null; applicableCategories: string[] | null };

const steps = ["Contact", "Delivery"];

export function CheckoutWizard() {
  const { items: cartItems, subtotal: cartSubtotal, clearCart } = useCart();
  const [buyNowItem, setBuyNowItemState] = useState<BuyNowItem | null>(null);
  const [buyNowChecked, setBuyNowChecked] = useState(false);
  const items = buyNowItem ? [buyNowItem] : cartItems;
  const subtotal = buyNowItem ? buyNowItem.offerPrice * buyNowItem.quantity : cartSubtotal;
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState<CheckoutForm>({
    customerName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<PublicCoupon[]>([]);

  const itemPayload = useMemo(
    () => items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [items],
  );

  const shipping = quote?.charge ?? 0;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const total = subtotal - discount + shipping;

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  // Track whether payment was successfully completed
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    setBuyNowItemState(readBuyNowItem());
    setBuyNowChecked(true);
  }, []);

  // Clear the buy-now item from sessionStorage when leaving checkout
  // without completing payment — prevents it bleeding into future sessions.
  useEffect(() => {
    return () => {
      if (!orderPlacedRef.current) {
        clearBuyNowItem();
      }
    };
  }, []);

  useEffect(() => {
    const savedPincode = window.localStorage.getItem("raghul-snacks-pincode");
    if (savedPincode && /^\d{6}$/.test(savedPincode))
      setForm((c) => ({ ...c, pincode: savedPincode }));

    // Pre-fill contact details for logged-in users; guests can proceed without signing in
    fetch("/api/auth/session")
      .then(async (res) => {
        const data = (await res.json()) as {
          account?: { name: string; email: string } | null;
        };
        if (data.account) {
          setAccount(data.account);
          setForm((c) => ({
            ...c,
            customerName: data.account!.name,
            email: data.account!.email,
          }));
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        // Network error — still allow guest checkout
        setCheckingAuth(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/locations/states")
      .then(async (res) => {
        const data = (await res.json()) as {
          states?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Unable to load states.");
        setStates(data.states || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load states."));
  }, []);

  useEffect(() => {
    if (!form.state) { setCities([]); return; }
    setCities([]);
    setForm((c) => ({ ...c, city: "" }));
    fetch(`/api/locations/cities?state=${encodeURIComponent(form.state)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          cities?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Unable to load cities.");
        setCities(data.cities || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load cities."));
  }, [form.state]);

  useEffect(() => {
    if (!/^\d{6}$/.test(form.pincode) || !itemPayload.length) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      setError("");
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ pincode: form.pincode, items: itemPayload }),
        });
        const data = (await res.json()) as ShippingQuote & { error?: string };
        if (!res.ok) throw new Error(data.error || "Unable to calculate delivery.");
        setQuote(data);
      } catch (e) {
        if (!controller.signal.aborted) {
          setQuote(null);
          setError(e instanceof Error ? e.message : "Unable to calculate delivery.");
        }
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [form.pincode, itemPayload]);

  // Load public coupons once we know the subtotal (so we can show min-order hints)
  useEffect(() => {
    if (subtotal <= 0) return;
    fetch("/api/coupons?public=1")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { coupons?: PublicCoupon[] };
        setPublicCoupons(data.coupons || []);
      })
      .catch(() => { /* non-critical */ });
  }, [subtotal]);

  // ── Coupon helpers ─────────────────────────────────────────────────────────

  const applyCoupon = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) { setCouponError("Enter a coupon code."); return; }
      setCouponLoading(true);
      setCouponError("");
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed, items: itemPayload }),
        });
        const data = (await res.json()) as {
          coupon?: { code: string; name: string | null; discountType: string; value: string };
          discountAmount?: number;
          error?: string;
        };
        if (!res.ok || !data.coupon) throw new Error(data.error || "Invalid coupon.");
        setAppliedCoupon({
          code: data.coupon.code,
          name: data.coupon.name,
          discountType: data.coupon.discountType,
          value: data.coupon.value,
          discountAmount: data.discountAmount ?? 0,
        });
        setCouponInput("");
      } catch (e) {
        setCouponError(e instanceof Error ? e.message : "Invalid coupon.");
      } finally {
        setCouponLoading(false);
      }
    },
    [itemPayload],
  );

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  function couponDiscountLabel(c: PublicCoupon) {
    if (c.discountType === "bogo") return "Buy 1 Get 1 Free";
    if (c.discountType === "percentage") {
      const pct = `${parseFloat(c.value)}% off`;
      return c.maxDiscount ? `${pct} (up to ₹${parseFloat(c.maxDiscount)})` : pct;
    }
    return `₹${parseFloat(c.value)} off`;
  }

  // ── Form helpers ───────────────────────────────────────────────────────────

  function update(field: keyof CheckoutForm, value: string) {
    setError("");
    setSuccess("");
    setForm((c) => ({ ...c, [field]: value }));
  }

  function continueTo(nextStep: number) {
    setError("");
    if (step === 1) {
      if (!form.customerName.trim()) { setError("Please enter your full name."); return; }
      if (form.customerName.trim().length < 3) { setError("Name must be at least 3 characters long."); return; }
      if (!form.phone) { setError("Please enter your mobile number."); return; }
      if (!/^[6-9]\d{9}$/.test(form.phone)) { setError("Please enter a valid 10-digit Indian mobile number starting with 6-9."); return; }
      // For guests, validate email if provided
      if (!account && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError("Please enter a valid email address."); return;
      }
    }
    setStep(nextStep);
    // Scroll to top so the new step header is visible, especially on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Payment ────────────────────────────────────────────────────────────────

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (step === 2) {
      if (!form.address.trim()) { setError("Please enter your delivery address."); return; }
      if (form.address.trim().length < 8) { setError("Address must be at least 8 characters long."); return; }
      if (!form.state) { setError("Please select your state."); return; }
      if (!form.city) { setError("Please select your city."); return; }
      if (!form.pincode) { setError("Please enter your PIN code."); return; }
      if (!/^\d{6}$/.test(form.pincode)) { setError("Please enter a valid 6-digit PIN code."); return; }
      if (!quote) {
        setError(quoteLoading ? "Please wait while we calculate your delivery charges." : "Unable to calculate shipping. Please check your PIN code.");
        return;
      }
    }

    if (!quote || !paymentReady) return;
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        items: itemPayload,
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
      };

      const res = await fetch("/api/checkout/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const paymentOrder = (await res.json()) as PaymentOrder;
      if (!res.ok || !paymentOrder.paymentSessionId)
        throw new Error(paymentOrder.error || "Payment could not be started.");

      if (!window.Cashfree)
        throw new Error("The secure payment window is still loading. Please try again.");

      const result = await window
        .Cashfree({ mode: paymentOrder.environment })
        .checkout({ paymentSessionId: paymentOrder.paymentSessionId, redirectTarget: "_modal" });

      if (result.error) throw new Error(result.error.message || "Payment was cancelled.");
      if (!result.paymentDetails) { setLoading(false); return; }

      const verifyRes = await fetch("/api/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, cashfreeOrderId: paymentOrder.orderId }),
      });
      const verified = (await verifyRes.json()) as { orderNumber?: string; error?: string };
      if (!verifyRes.ok || !verified.orderNumber)
        throw new Error(verified.error || "Your payment needs support review. Please contact us.");

      window.localStorage.setItem(
        "raghul-snacks-last-order",
        JSON.stringify({ orderNumber: verified.orderNumber, phone: form.phone }),
      );
      if (buyNowItem) clearBuyNowItem(); else clearCart();
      orderPlacedRef.current = true;
      window.location.assign("/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue to payment.");
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (checkingAuth || !buyNowChecked)
    return (
      <section className={styles.empty}>
        <p className="eyebrow">Checkout</p>
        <h1>Checking authentication...</h1>
        <p>Please wait while we verify your session.</p>
      </section>
    );

  if (!items.length)
    return (
      <section className={styles.empty}>
        <p className="eyebrow">Checkout</p>
        <h1>Your bag is empty.</h1>
        <p>Add a few fresh snacks before placing your order.</p>
        <Link className="button button-dark" href="/shop">Shop snacks</Link>
      </section>
    );

  // Applied coupon summary line shown in the order summary sidebar
  const summaryCouponLine = appliedCoupon ? (
    <p>
      <span>Discount ({appliedCoupon.code})</span>
      <strong style={{ color: "#4ade80" }}>− {formatPrice(discount)}</strong>
    </p>
  ) : null;

  // Coupon section rendered inside Step 2 (below the delivery form)
  const couponSection = (
    <div className={styles.couponSection}>
      {appliedCoupon ? (
        <div className={styles.appliedCoupon}>
          <div>
            <strong>{appliedCoupon.code}</strong>
            {appliedCoupon.name && <span style={{ marginLeft: 8, fontSize: 12, color: "#166534" }}>{appliedCoupon.name}</span>}
            <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
              {appliedCoupon.discountType === "bogo"
                ? `Buy 1 Get 1 Free · You save ${formatPrice(discount)}`
                : `You save ${formatPrice(discount)}`}
            </div>
          </div>
          <button type="button" className={styles.removeCouponButton} onClick={removeCoupon}>
            Remove
          </button>
        </div>
      ) : (
        <>
          <label className={styles.couponLabel}>
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(couponInput); } }}
              disabled={couponLoading}
              aria-label="Coupon code"
            />
            <button
              type="button"
              className={styles.applyCouponButton}
              disabled={couponLoading || !couponInput.trim()}
              onClick={() => applyCoupon(couponInput)}
            >
              {couponLoading ? "Checking…" : "Apply"}
            </button>
          </label>
          {couponError && <p className={styles.couponError}>{couponError}</p>}

          {publicCoupons.length > 0 && (
            <div className={styles.availableCoupons}>
              <p className={styles.availableCouponsTitle}>Available offers</p>
              <div className={styles.couponList}>
                {publicCoupons.map((c) => {
                  const meetsMin = subtotal >= parseFloat(c.minOrderValue || "0");

                  // Work out eligible item slugs for product-restricted coupons
                  const itemSlugs = items.map((i) => i.slug ?? i.id);
                  const hasEligibleProducts = c.applyTo === "products" && c.applicableProducts?.length
                    ? c.applicableProducts.some((slug) => itemSlugs.includes(slug))
                    : true; // entire_store or category — optimistic (server validates anyway)

                  // For BOGO: count eligible units specifically
                  const eligibleUnits = c.discountType === "bogo"
                    ? (() => {
                        const bogoSlugs = c.applicableProducts?.length ? c.applicableProducts : null;
                        return items
                          .filter((item) => !bogoSlugs || bogoSlugs.includes(item.slug ?? item.id))
                          .reduce((sum, item) => sum + item.quantity, 0);
                      })()
                    : 0;
                  const bogoClear = c.discountType !== "bogo" || eligibleUnits >= 2;

                  const eligible = meetsMin && bogoClear && hasEligibleProducts;

                  return (
                    <div
                      key={c.id}
                      className={`${styles.couponItem} ${!eligible ? styles.couponNotApplicable : ""}`}
                      role={eligible ? "button" : undefined}
                      tabIndex={eligible ? 0 : undefined}
                      onClick={() => { if (eligible) applyCoupon(c.code); }}
                      onKeyDown={(e) => { if (eligible && (e.key === "Enter" || e.key === " ")) applyCoupon(c.code); }}
                      title={eligible ? `Click to apply ${c.code}` : undefined}
                    >
                      <div className={styles.couponHeader}>
                        <span className={styles.couponCode}>{c.code}</span>
                        <span className={styles.couponDiscount}>{couponDiscountLabel(c)}</span>
                      </div>
                      <div className={styles.couponDetails}>
                        {c.description && <span>{c.description}</span>}
                        {/* BOGO — show eligible units and how many will be free */}
                        {c.discountType === "bogo" && (
                          <span style={{ fontWeight: 600, color: bogoClear ? "#15803d" : "#92400e" }}>
                            {bogoClear
                              ? `✓ Eligible — ${Math.floor(eligibleUnits / 2)} unit${Math.floor(eligibleUnits / 2) > 1 ? "s" : ""} will be free`
                              : `Min. 2 eligible units required · Add ${2 - eligibleUnits} more`}
                          </span>
                        )}
                        {/* Min order value hint (non-BOGO) */}
                        {c.discountType !== "bogo" && parseFloat(c.minOrderValue || "0") > 0 && (
                          <span>
                            {meetsMin
                              ? "✓ Eligible on your order"
                              : `Min. order ₹${parseFloat(c.minOrderValue)} · Add ₹${Math.ceil(parseFloat(c.minOrderValue) - subtotal)} more`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setPaymentReady(true)}
      />
      <main className={styles.page}>
        <Link className={styles.back} href="/cart">← Back to bag</Link>
        <div className={styles.intro}>
          <p className="eyebrow">Secure checkout</p>
          <h1>Fresh snacks, <em>on their way.</em></h1>
        </div>

        <div className={styles.layout}>
          {/* ── Left: form ── */}
          <form className={styles.card} onSubmit={pay}>
            <nav className={styles.steps} aria-label="Checkout progress">
              {steps.map((label, index) => {
                const number = index + 1;
                return (
                  <button
                    type="button"
                    key={label}
                    className={
                      number === step
                        ? styles.activeStep
                        : number < step
                        ? styles.completeStep
                        : ""
                    }
                    disabled={number > step}
                    onClick={() => { setStep(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    <span>{number < step ? "✓" : number}</span>
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Step 1 – Contact */}
            {step === 1 && (
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <p>Step 1 of 2</p>
                  <h2>How can we reach you?</h2>
                  <span>We use this only for delivery updates.</span>
                </div>
                <div className={styles.fields}>
                  <label>
                    Full name
                    <input
                      autoComplete="name"
                      autoFocus
                      required
                      value={form.customerName}
                      onChange={(e) => update("customerName", e.target.value)}
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      autoComplete="tel"
                      required
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      placeholder="10-digit number"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </label>
                  {account ? (
                    <p className={styles.full}>
                      Signed in as <strong>{account.name}</strong> ({account.email}).
                      Your order will be added to this account.
                    </p>
                  ) : (
                    <>
                      <label className={styles.full}>
                        Email address
                        <input
                          autoComplete="email"
                          type="email"
                          placeholder="For order confirmation"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                        />
                      </label>
                      <p className={styles.full} style={{ fontSize: 13, color: "#687267" }}>
                        Checking out as guest.{" "}
                        <a href="/login?returnTo=/checkout" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                          Sign in
                        </a>{" "}
                        to save this order to your account.
                      </p>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Step 2 – Delivery + coupon */}
            {step === 2 && (
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <p>Step 2 of 2</p>
                  <h2>Where should we deliver?</h2>
                  <span>
                    Choose your location to calculate a live courier rate and complete payment.
                  </span>
                </div>
                <div className={styles.fields}>
                  <label className={styles.full}>
                    Street address
                    <textarea
                      autoComplete="street-address"
                      required
                      minLength={8}
                      placeholder="House / flat number, street and area"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                    />
                  </label>
                  <label>
                    State
                    <select
                      required
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                    >
                      <option value="">
                        {states.length ? "Select state" : "Loading states…"}
                      </option>
                      {states.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label>
                    City
                    <select
                      required
                      disabled={!form.state || !cities.length}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                    >
                      <option value="">
                        {form.state
                          ? cities.length ? "Select city" : "Loading cities…"
                          : "Select state first"}
                      </option>
                      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>
                    PIN code
                    <input
                      autoComplete="postal-code"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      placeholder="6-digit PIN"
                      value={form.pincode}
                      onChange={(e) => update("pincode", e.target.value)}
                    />
                  </label>
                </div>

                {/* Courier rate */}
                <div className={styles.courier}>
                  <div>
                    <strong>{quote?.courierName || "Courier rate"}</strong>
                    <span>
                      {quoteLoading
                        ? "Calculating delivery…"
                        : quote?.estimatedDeliveryDays
                        ? `Estimated delivery: ${quote.estimatedDeliveryDays}`
                        : "Enter your PIN code for a live delivery quote"}
                    </span>
                  </div>
                  <b>{quote ? formatPrice(shipping) : "—"}</b>
                </div>

                {/* Coupon */}
                {couponSection}

                <p className={styles.security}>
                  ▣ Your payment is encrypted and processed securely. We never store card details.
                </p>
              </section>
            )}

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              {step > 1 ? (
                <button className={styles.secondary} type="button" onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  ← Back
                </button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <button className="button button-dark" type="button" onClick={() => continueTo(step + 1)}>
                  Continue →
                </button>
              ) : (
                <button
                  className="button button-dark"
                  type="submit"
                  disabled={loading || !paymentReady || !quote}
                >
                  {loading
                    ? "Opening secure payment…"
                    : paymentReady && quote
                    ? `Pay ${formatPrice(total)} securely`
                    : !quote
                    ? "Enter PIN code first"
                    : "Loading secure payment…"}
                </button>
              )}
            </div>
          </form>

          {/* ── Right: order summary ── */}
          <aside className={styles.summary}>
            <p className={styles.summaryLabel}>Order summary</p>
            <h2>Your fresh picks.</h2>
            <div className={styles.items}>
              {items.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>{item.weight} · Qty {item.quantity}</small>
                  </span>
                  <strong>{formatPrice(item.offerPrice * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
            {summaryCouponLine}
            <p><span>Delivery</span><strong>{quote ? formatPrice(shipping) : "Calculated next"}</strong></p>
            <div className={styles.total}>
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <small>Live courier pricing by Shiprocket</small>
          </aside>
        </div>
      </main>
    </>
  );
}
