"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, parseWeightToKg } from "@/lib/catalog";
import { clearBuyNowItem, readBuyNowItem, type BuyNowItem } from "@/lib/buy-now";
import { validateIndianPincode } from "@/lib/pincode";
import { normalizeIndianPhone, isValidIndianPhone } from "@/lib/phone";
import styles from "./checkout-wizard.module.css";
type CheckoutForm = { customerName: string; phone: string; email: string; address: string; city: string; state: string; pincode: string };
type ShippingQuote = { charge: number; courierName: string; estimatedDeliveryDays: string | null };
type PaymentOrder = { razorpayOrderId: string; amount: number; currency: string; keyId: string; error?: string };
type AppliedCoupon = { code: string; name: string | null; discountType: string; value: string; discountAmount: number };
type PublicCoupon = { id: number; code: string; name: string | null; description: string | null; discountType: string; value: string; maxDiscount: string | null; minOrderValue: string; applyTo: string; applicableProducts: string[] | null; applicableCategories: string[] | null };

function cleanCourierDisplayName(name?: string | null): string {
  if (!name) return "Courier Delivery";
  return (
    name
      .replace(/(?:^|[\s\(\[\{—\-])\d+(\.\d+)?\s*(kg|kgs|gm|gms|g)\b[\)\]\}]?/gi, "")
      .replace(/\s*-\s*$/, "")
      .replace(/\s{2,}/g, " ")
      .trim() || name || "Courier Delivery"
  );
}

function inferStateFromPincode(pincode: string): string | null {
  const validation = validateIndianPincode(pincode);
  return validation.state || null;
}

export function CheckoutWizard() {
  const { items: cartItems, subtotal: cartSubtotal, clearCart, addItem, hydrated: cartHydrated, syncing: cartSyncing } = useCart();
  // Read buy-now item synchronously with lazy useState initialiser.
  const [buyNowItem] = useState<BuyNowItem | null>(() =>
    typeof window !== "undefined" ? readBuyNowItem() : null
  );
  const buyNowChecked = true; // always ready — synchronous read, no async needed
  const items = useMemo(() => (buyNowItem ? [buyNowItem] : cartItems), [buyNowItem, cartItems]);
  const subtotal = buyNowItem ? buyNowItem.offerPrice * buyNowItem.quantity : cartSubtotal;
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState<CheckoutForm>({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [states, setStates] = useState<string[]>([]);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(
    typeof window !== "undefined" && !!(window as any).Razorpay
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<PublicCoupon[]>([]);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const itemPayload = useMemo(
    () => items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [items],
  );

  type SavedAddressItem = {
    id: number;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  };

  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">("new");

  useEffect(() => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d: { addresses?: SavedAddressItem[] }) => {
        if (d.addresses && d.addresses.length > 0) {
          setSavedAddresses(d.addresses);
          const def = d.addresses.find((a) => a.isDefault) || d.addresses[0];
          setSelectedAddressId(def.id);
          setForm((c) => ({
            ...c,
            customerName: def.name || c.customerName,
            phone: def.phone || c.phone,
            address: def.address,
            city: def.city,
            state: def.state,
            pincode: def.pincode,
          }));
        }
      })
      .catch(() => {});
  }, []);

  function handleSelectSavedAddress(addr: SavedAddressItem) {
    setSelectedAddressId(addr.id);
    setForm((c) => ({
      ...c,
      customerName: addr.name || c.customerName,
      phone: addr.phone || c.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
  }

  function handleSelectNewAddress() {
    setSelectedAddressId("new");
    setForm((c) => ({
      ...c,
      address: "",
      city: "",
      state: "",
      pincode: "",
    }));
  }

  const shipping = quote?.charge ?? 0;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const total = subtotal - discount + shipping;

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  // Track whether payment was successfully completed
  const orderPlacedRef = useRef(false);

  useEffect(() => {
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
            customerName: c.customerName || data.account!.name,
            email: c.email || data.account!.email,
          }));
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        // Network error — still allow guest checkout
        setCheckingAuth(false);
      });

    // Ensure any previously entered pincode from product detail checks is wiped out and never retained in checkout
    try {
      window.localStorage.removeItem("raghul-customer-pincode");
      window.sessionStorage.removeItem("raghul-customer-pincode");
    } catch {}
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
    if (!itemPayload.length) { setQuote(null); return; } // eslint-disable-line react-hooks/set-state-in-effect

    const hasPincode = /^\d{6}$/.test(form.pincode);
    if (!hasPincode && !form.state) {
      setQuote(null);
      return;
    }

    if (hasPincode) {
      const pinValidation = validateIndianPincode(form.pincode);
      if (!pinValidation.valid) {
        setQuote(null);
        setError(pinValidation.error || "Please enter a valid 6-digit Indian PIN code.");
        return;
      }
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
          body: JSON.stringify({
            pincode: hasPincode ? form.pincode : undefined,
            state: form.state || undefined,
            items: itemPayload,
          }),
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
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [form.state, form.pincode, itemPayload]);

  // Load eligible coupons for this user (server filters firstPurchase, perCustomer limits)
  useEffect(() => {
    if (subtotal <= 0) return;
    fetch("/api/coupons/eligible")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { coupons?: PublicCoupon[] };
        setPublicCoupons(data.coupons || []);
      })
      .catch(() => { /* non-critical */ });
  }, [subtotal]);

  // Check if Razorpay is already attached to window
  useEffect(() => {
    if (typeof window !== "undefined" && !!(window as any).Razorpay) {
      setPaymentReady(true);
    }
  }, []);

  // Clear buy-now from sessionStorage only when navigating away (not on reload)
  useEffect(() => {
    if (!buyNowItem) return;
    function handlePageHide(e: PageTransitionEvent) {
      if (!e.persisted && !orderPlacedRef.current) {
        clearBuyNowItem();
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    let sanitized = value;
    if (field === "phone") {
      sanitized = value.replace(/[^\d+ \-()]/g, "").slice(0, 18);
    } else if (field === "pincode") {
      sanitized = value.replace(/\D/g, "").slice(0, 6);
      if (sanitized.length === 6) {
        const pinValidation = validateIndianPincode(sanitized);
        if (!pinValidation.valid) {
          setError(pinValidation.error || "Please enter a valid 6-digit Indian PIN code.");
          setQuote(null);
        } else {
          setError("");
        }
        const detectedState = pinValidation.state || inferStateFromPincode(sanitized);
        setForm((c) => ({
          ...c,
          pincode: sanitized,
          state: c.state || detectedState || "",
        }));
        return;
      }
    }
    setForm((c) => ({ ...c, [field]: sanitized }));
  }

  // ── Payment ────────────────────────────────────────────────────────────────

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.customerName.trim()) {
      setError("Please enter your full name.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (form.customerName.trim().length < 3) {
      setError("Name must be at least 3 characters long.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your mobile number.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!isValidIndianPhone(form.phone)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210, +91 98765 43210, or 09876543210).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!account && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!form.address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }
    if (form.address.trim().length < 8) {
      setError("Address must be at least 8 characters long.");
      return;
    }
    if (!form.state) {
      setError("Please select your state.");
      return;
    }
    if (!form.city.trim()) {
      setError("Please enter your district or city.");
      return;
    }
    if (!form.pincode) {
      setError("Please enter your PIN code.");
      return;
    }
    const pinValidation = validateIndianPincode(form.pincode);
    if (!pinValidation.valid) {
      setError(pinValidation.error || "Please enter a valid 6-digit Indian PIN code.");
      return;
    }
    if (quoteLoading) {
      setError("Calculating delivery charge, please wait a moment…");
      return;
    }
    if (!quote) {
      setError(error || "Delivery is unavailable for this PIN code. Please verify your address.");
      return;
    }

    if (!paymentReady) return;
    setLoading(true);
    setError("");

    try {
      const cleanPhone = normalizeIndianPhone(form.phone);
      const payload = {
        ...form,
        phone: cleanPhone,
        items: itemPayload,
        shipping: shipping, // pass client-calculated shipping to server
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
      };

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const paymentOrder = (await res.json()) as PaymentOrder;
      if (!res.ok || !paymentOrder.razorpayOrderId)
        throw new Error((paymentOrder as { error?: string }).error || "Payment could not be started.");

      if (!window.Razorpay)
        throw new Error("The secure payment window is still loading. Please try again.");

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: paymentOrder.keyId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          order_id: paymentOrder.razorpayOrderId,
          name: "Raghul Delights",
          description: "Fresh Millet Snacks",
          prefill: {
            name: form.customerName,
            email: form.email,
            contact: cleanPhone,
          },
          theme: { color: "#c95f3b" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...payload,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const verified = (await verifyRes.json()) as { orderNumber?: string; error?: string };
              if (!verifyRes.ok || !verified.orderNumber)
                throw new Error(verified.error || "Your payment needs support review. Please contact us.");

              window.localStorage.setItem(
                "raghul-snacks-last-order",
                JSON.stringify({ orderNumber: verified.orderNumber, phone: cleanPhone }),
              );
              if (buyNowItem) clearBuyNowItem(); else clearCart();
              orderPlacedRef.current = true;
              window.location.assign("/orders?success=true");
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              resolve();
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp: any) => {
          setLoading(false);
          setError(resp.error?.description || "Payment was unsuccessful. Please check your card or UPI details and try again.");
        });
        rzp.open();
      });
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

  if (!cartHydrated) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--terracotta)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Only show spinner if syncing AND cart appears empty (may still be loading from server)
  if (cartSyncing && !items.length && !buyNowItem) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--terracotta)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
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
                              ? `Eligible — ${Math.floor(eligibleUnits / 2)} unit${Math.floor(eligibleUnits / 2) > 1 ? "s" : ""} will be free`
                              : `Min. 2 eligible units required · Add ${2 - eligibleUnits} more`}
                          </span>
                        )}
                        {/* Min order value hint (non-BOGO) */}
                        {c.discountType !== "bogo" && parseFloat(c.minOrderValue || "0") > 0 && (
                          <span>
                            {meetsMin
                              ? "Eligible on your order"
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
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setPaymentReady(true)}
        onReady={() => setPaymentReady(true)}
      />
      <main className={styles.page}>
        <Link className={styles.back} href="/cart" onClick={() => clearBuyNowItem()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to bag
        </Link>
        <div className={styles.intro}>
          <p className="eyebrow">Secure checkout</p>
          <h1>Fresh snacks, <em>on their way.</em></h1>
        </div>

        <div className={styles.layout}>
          {/* ── Left: form ── */}
          <form className={styles.card} onSubmit={pay}>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <p>Delivery Details</p>
                <h2>Where should we deliver?</h2>
                <span>
                  {savedAddresses.length > 0
                    ? "Select your delivery address or enter new details below."
                    : "Enter your contact and address details to calculate live delivery and pay."}
                </span>
              </div>

              {/* Saved addresses selector */}
              {savedAddresses.length > 0 && (
                <div className={styles.addressSelectorGroup}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", fontWeight: 700 }}>
                    Saved Delivery Addresses
                  </p>
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`${styles.addressRadioCard} ${isSelected ? styles.addressRadioCardActive : ""}`}
                      >
                        <input
                          type="radio"
                          name="deliveryAddressChoice"
                          checked={isSelected}
                          onChange={() => handleSelectSavedAddress(addr)}
                        />
                        <div className={styles.addressRadioContent}>
                          <div className={styles.addressRadioHead}>
                            <span className={styles.addressRadioName}>{addr.name}</span>
                            {addr.phone && <span className={styles.addressRadioPhone}>· {addr.phone}</span>}
                            {addr.isDefault && <span className={styles.addressRadioBadge}>Default</span>}
                          </div>
                          <p className={styles.addressRadioText}>
                            {addr.address}, {addr.city}, {addr.state} – {addr.pincode}
                          </p>
                        </div>
                      </label>
                    );
                  })}

                  <label
                    className={`${styles.newAddressToggle} ${selectedAddressId === "new" ? styles.newAddressToggleActive : ""}`}
                  >
                    <input
                      type="radio"
                      name="deliveryAddressChoice"
                      checked={selectedAddressId === "new"}
                      onChange={handleSelectNewAddress}
                      style={{ accentColor: "var(--terracotta)", width: 16, height: 16, margin: 0 }}
                    />
                    <span>+ Deliver to a different / new address</span>
                  </label>
                </div>
              )}

              {/* Show manual contact + address inputs if 'new' is chosen OR if no saved addresses exist */}
              {(selectedAddressId === "new" || savedAddresses.length === 0) && (
                <div className={styles.fields}>
                  <label>
                    Full name
                    <input
                      autoComplete="name"
                      required
                      placeholder="Your full name"
                      value={form.customerName}
                      onChange={(e) => update("customerName", e.target.value)}
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      autoComplete="tel"
                      required
                      type="tel"
                      inputMode="tel"
                      placeholder="10-digit mobile (e.g. 9876543210 or +91 98765 43210)"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      onBlur={() => {
                        if (form.phone && isValidIndianPhone(form.phone)) {
                          setForm((c) => ({ ...c, phone: normalizeIndianPhone(c.phone) }));
                        }
                      }}
                    />
                  </label>

                  {account ? (
                    <p className={styles.full} style={{ fontSize: 13, color: "#687267", margin: "2px 0 6px" }}>
                      Signed in as <strong>{account.name}</strong> ({account.email}). Your order will be linked to your account.
                    </p>
                  ) : (
                    <>
                      <label className={styles.full}>
                        Email address
                        <input
                          autoComplete="email"
                          type="email"
                          placeholder="For order receipt and tracking updates"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                        />
                      </label>
                      <p className={styles.full} style={{ fontSize: 12.5, color: "#687267", margin: "-6px 0 6px" }}>
                        Checking out as guest.{" "}
                        <a href="/login?returnTo=/checkout" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                          Sign in
                        </a>{" "}
                        to use saved addresses.
                      </p>
                    </>
                  )}

                  <label className={styles.full}>
                    Street address
                    <textarea
                      autoComplete="street-address"
                      required
                      minLength={8}
                      placeholder="House / flat number, building name, street, area, landmark"
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
                    District / City
                    <input
                      required
                      autoComplete="address-level2"
                      placeholder="Enter district or city"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                    />
                  </label>
                  <label className={styles.full}>
                    PIN code
                    <input
                      autoComplete="postal-code"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      placeholder="6-digit postal PIN"
                      value={form.pincode}
                      onChange={(e) => update("pincode", e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* Delivery charge */}
              <div className={styles.courier} style={{ marginTop: 24 }}>
                <div>
                  <strong>Delivery</strong>
                  <span>
                    {quoteLoading
                      ? "Checking courier serviceability…"
                      : error && (error.toLowerCase().includes("not available") || error.toLowerCase().includes("pin"))
                      ? <span style={{ color: "#dc2626", fontWeight: 500 }}>{error}</span>
                      : quote
                      ? `${cleanCourierDisplayName(quote.courierName)}${quote.estimatedDeliveryDays ? ` · Est: ${quote.estimatedDeliveryDays}` : ""}`
                      : "Enter 6-digit PIN code to see delivery charge"}
                  </span>
                </div>
                <b>{quoteLoading ? "…" : quote ? formatPrice(shipping) : "—"}</b>
              </div>

              {/* Coupon */}
              {couponSection}

              <p className={styles.security} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Your payment is encrypted and processed securely. We never store card details.</span>
              </p>
            </section>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                className="button button-dark"
                type="submit"
                disabled={loading || !paymentReady || !quote || quoteLoading}
                style={{ width: "100%", padding: "16px 24px", fontSize: 16, fontWeight: 700 }}
              >
                {loading
                  ? "Opening secure payment…"
                  : quoteLoading
                  ? "Checking courier rates…"
                  : paymentReady && quote
                  ? `Pay ${formatPrice(total)} securely`
                  : error && (error.toLowerCase().includes("not available") || error.toLowerCase().includes("pin"))
                  ? "Delivery not available for this PIN code"
                  : !quote
                  ? "Enter 6-digit PIN code"
                  : "Loading secure payment…"}
              </button>
            </div>
          </form>

          {/* Mobile expandable order summary bar */}
          <div
            className={styles.mobileSummaryToggle}
            onClick={() => setMobileSummaryOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={mobileSummaryOpen}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>{mobileSummaryOpen ? "Hide order summary" : `Order summary (${items.reduce((s, i) => s + i.quantity, 0)} item${items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""})`}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  transition: "transform 0.2s ease",
                  transform: mobileSummaryOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <strong style={{ fontSize: 16, fontFamily: "'DM Sans',sans-serif" }}>{formatPrice(total)}</strong>
          </div>

          {/* ── Right: order summary ── */}
          <aside className={`${styles.summary} ${mobileSummaryOpen ? styles.summaryMobileOpen : ""}`}>
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
            <p><span>Delivery</span><strong>{quoteLoading ? "Calculating…" : quote ? formatPrice(shipping) : "Calculated next"}</strong></p>
            <div className={styles.total}>
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <small>Packed fresh in small batches · Delivered across India</small>
          </aside>
        </div>
      </main>
    </>
  );
}
