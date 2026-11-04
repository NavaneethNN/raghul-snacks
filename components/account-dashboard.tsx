"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { OrderDetailModal } from "@/components/order-detail-modal";
import { normalizeIndianPhone, isValidIndianPhone, formatIndianPhone } from "@/lib/phone";

type Order = {
  id: number;
  orderNumber: string;
  total: string;
  discount: string;
  couponCode: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  shippingStatus?: string | null;
  awbCode?: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number | null;
    variantId?: number | null;
    name: string;
    quantity: number;
    price: string;
    weight?: string | null;
    product: {
      id: number;
      name: string;
      slug: string;
      description: string;
      ingredients: string | null;
      price: string;
      offerPrice: string | null;
      weight: string;
      categoryId: number | null;
      image: string | null;
      active?: boolean;
      stock?: number;
      variants?: Array<{ id: number; weight: string; price: string; offerPrice: string | null }>;
    } | null;
  }>;
};

type AccountDashboardProps = {
  account: {
    name: string;
    email: string;
    createdAt: Date;
    isAdmin?: boolean;
  };
  orders: Order[];
};

type UserMessage = {
  id: number;
  subject: string;
  message: string;
  adminReply: string | null;
  replyAt: string | null;
  createdAt: string;
};

type SavedAddress = {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type TabType = "orders" | "addresses" | "profile" | "messages";

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  placed:     { bg: "#fef9ec", color: "#92400e", dot: "#f59e0b" },
  packed:     { bg: "#ede9fe", color: "#5b21b6", dot: "#7c3aed" },
  dispatched: { bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },
  shipped:    { bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },
  delivered:  { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  cancelled:  { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

export function AccountDashboard({ account, orders }: AccountDashboardProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Name edit
  const [name, setName] = useState(account.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Orders / reviews
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);
  const [reviewingItemId, setReviewingItemId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHovered, setReviewHovered] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrDraft, setAddrDraft] = useState({
    name: account.name || "", phone: "", address: "",
    city: "", state: "Tamil Nadu", pincode: "", isDefault: false,
  });
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrError, setAddrError] = useState("");

  // Messages
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const loadAddresses = useCallback(() => {
    fetch("/api/account/addresses")
      .then(r => r.json())
      .then((d: { addresses?: SavedAddress[] }) => { if (d.addresses) setAddresses(d.addresses); })
      .catch(() => {})
      .finally(() => setAddressLoaded(true));
  }, []);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  useEffect(() => {
    fetch("/api/reviews/mine")
      .then(r => r.json())
      .then((d: { reviewedProductIds?: number[] }) => setReviewedProductIds(d.reviewedProductIds ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "messages" && !messagesLoaded) {
      fetch("/api/messages/mine", { credentials: "include" })
        .then(r => r.json())
        .then((d: { messages: UserMessage[] }) => setMessages(d.messages ?? []))
        .catch(() => {})
        .finally(() => setMessagesLoaded(true));
    }
  }, [activeTab, messagesLoaded]);

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const r = await fetch("/api/auth/session", { method: "DELETE" });
      if (r.ok) {
        localStorage.removeItem("raghul-snacks-cart");
        localStorage.removeItem("raghul-snacks-cart-account");
        router.push("/");
        router.refresh();
      }
    } catch { setSigningOut(false); }
  }

  function downloadInvoice(orderNumber: string) {
    const a = document.createElement("a");
    a.href = `/api/orders/${orderNumber}/invoice`;
    a.download = `Invoice-${orderNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) { setNameError("Name must be at least 2 characters."); return; }
    setSavingName(true); setNameError("");
    try {
      const r = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const d = await r.json() as { account?: { name: string }; error?: string };
      if (!r.ok) throw new Error(d.error || "Could not update name.");
      setName(d.account?.name || trimmed);
      setEditingName(false);
      router.refresh();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Could not update name.");
    } finally { setSavingName(false); }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrDraft.name.trim() || addrDraft.name.trim().length < 2) { setAddrError("Enter a recipient name."); return; }
    if (!isValidIndianPhone(addrDraft.phone)) { setAddrError("Enter a valid 10-digit mobile number."); return; }
    if (addrDraft.address.trim().length < 6) { setAddrError("Enter a complete street address."); return; }
    if (!addrDraft.city.trim()) { setAddrError("Enter a city."); return; }
    if (!/^\d{6}$/.test(addrDraft.pincode.trim())) { setAddrError("Enter a valid 6-digit PIN code."); return; }

    setSavingAddr(true); setAddrError("");
    try {
      const r = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addrDraft, phone: normalizeIndianPhone(addrDraft.phone) }),
      });
      const d = await r.json() as { address?: SavedAddress; error?: string };
      if (!r.ok) throw new Error(d.error || "Failed to save address.");
      setShowAddForm(false);
      setAddrDraft({ name: name || "", phone: "", address: "", city: "", state: "Tamil Nadu", pincode: "", isDefault: false });
      loadAddresses();
    } catch (e) {
      setAddrError(e instanceof Error ? e.message : "Failed to save address.");
    } finally { setSavingAddr(false); }
  }

  async function setDefaultAddress(id: number) {
    try {
      const r = await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (r.ok) setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
    } catch { /* non-fatal */ }
  }

  async function deleteAddress(id: number) {
    if (!confirm("Remove this address?")) return;
    try {
      const r = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (r.ok) setAddresses(prev => prev.filter(a => a.id !== id));
    } catch { /* non-fatal */ }
  }

  async function submitReview(productId: number) {
    if (!reviewRating) { setReviewError("Select a star rating."); return; }
    setReviewSubmitting(true); setReviewError("");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: reviewRating, content: reviewContent.trim() }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error || "Failed to post review.");
      setReviewedProductIds(prev => [...prev, productId]);
      setReviewingItemId(null);
      setReviewRating(0);
      setReviewContent("");
      try {
        localStorage.setItem("review-posted", "true");
        localStorage.setItem("delivery-nudge-dismissed", "true");
        sessionStorage.setItem("delivery-nudge-dismissed", "true");
        localStorage.setItem("delivery-notification-dismissed-permanently", "true");
      } catch { /* non-fatal */ }
      window.dispatchEvent(new Event("review-submitted"));
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Failed to post review.");
    } finally { setReviewSubmitting(false); }
  }

  function handleBuyAgain(order: Order) {
    let added = 0;
    order.items.forEach(item => {
      if (!item.product) return;
      const p = item.product;
      const v = item.variantId && p.variants ? p.variants.find(x => x.id === item.variantId) : null;
      addItem({
        id: v ? `${p.id}-v${v.id}` : String(p.id),
        name: p.name, slug: p.slug, category: "Snacks",
        description: p.description || "", ingredients: p.ingredients || "",
        price: parseFloat(v?.price || p.price),
        offerPrice: parseFloat(v?.offerPrice || v?.price || p.offerPrice || p.price),
        weight: v?.weight || item.weight || p.weight,
        image: p.image || "/placeholder.jpg",
      }, item.quantity);
      added++;
    });
    if (added === 0) { alert("These items are no longer available."); return; }
    router.push("/cart");
  }

  const initials = (name || "U")
    .split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const repliedCount = messages.filter(m => m.adminReply).length;

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "orders",    label: "Orders",    count: orders.length },
    { key: "addresses", label: "Addresses", count: addresses.length },
    { key: "profile",   label: "Profile" },
    { key: "messages",  label: "Support",   count: messages.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f7f4ec)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 120px", boxSizing: "border-box" }}>

        {/* ── Header Row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 600, color: "#57534e", textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Store
          </Link>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta, #c95f3b)", fontFamily: "var(--font-dm-mono, monospace)" }}>
            My Account
          </span>
        </div>

        {/* ── Profile Card ── */}
        <div style={{
          background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16,
          padding: "20px", marginBottom: 20, boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--terracotta, #c95f3b), var(--saffron, #e5a52f))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, fontFamily: "var(--font-playfair, Georgia, serif)",
            }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name row */}
              {editingName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    autoFocus
                    style={{ padding: "6px 10px", border: "1.5px solid var(--terracotta, #c95f3b)", borderRadius: 7, fontSize: 14, fontWeight: 600, outline: "none", minWidth: 160, maxWidth: 240 }}
                  />
                  <button onClick={saveName} disabled={savingName} style={{ padding: "6px 14px", background: "var(--terracotta, #c95f3b)", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {savingName ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setEditingName(false); setNameError(""); }} style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#57534e" }}>
                    Cancel
                  </button>
                  {nameError && <span style={{ color: "#dc2626", fontSize: 12, width: "100%" }}>{nameError}</span>}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "nowrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 36px)" }}>
                    {name}
                  </span>
                  <button onClick={() => { setNameDraft(name); setEditingName(true); }} title="Edit name" style={{ width: 26, height: 26, borderRadius: 6, background: "transparent", border: "1px solid #e5e0d8", color: "#78716c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                </div>
              )}

              <div style={{ fontSize: 13.5, color: "#57534e", marginBottom: 8, wordBreak: "break-all" }}>{account.email}</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {account.isAdmin && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-dm-mono, monospace)", letterSpacing: "0.04em" }}>
                    Store Admin
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#a8a29e" }}>
                  Joined {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
              {account.isAdmin && (
                <a href="/api/admin/bridge" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "var(--ink, #243127)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                  Admin Panel
                </a>
              )}
              {showSignOutConfirm ? (
                <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#991b1b", whiteSpace: "nowrap" }}>Sign out?</span>
                  <button onClick={handleSignOut} disabled={signingOut} style={{ padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Yes</button>
                  <button onClick={() => setShowSignOutConfirm(false)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#57534e" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowSignOutConfirm(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#57534e", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0ede8" }}>
            {[
              { label: "Orders", value: orders.length, tab: "orders" as TabType },
              { label: "Addresses", value: addressLoaded ? addresses.length : "—", tab: "addresses" as TabType },
              { label: "Messages", value: repliedCount > 0 ? `${repliedCount} new` : messages.length, tab: "messages" as TabType },
            ].map(stat => (
              <button key={stat.tab} onClick={() => setActiveTab(stat.tab)} style={{ background: activeTab === stat.tab ? "rgba(201,95,59,0.07)" : "var(--cream, #f7f4ec)", border: `1px solid ${activeTab === stat.tab ? "rgba(201,95,59,0.3)" : "#e5e0d8"}`, borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)", lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2, fontFamily: "var(--font-dm-mono, monospace)" }}>{stat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 999, whiteSpace: "nowrap",
              fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "1.5px solid transparent",
              background: activeTab === tab.key ? "var(--terracotta, #c95f3b)" : "#fff",
              color: activeTab === tab.key ? "#fff" : "#57534e",
              borderColor: activeTab === tab.key ? "var(--terracotta, #c95f3b)" : "#e5e0d8",
              boxShadow: activeTab === tab.key ? "0 4px 12px rgba(201,95,59,0.25)" : "none",
              transition: "all 0.18s",
            }}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "rgba(201,95,59,0.1)", color: activeTab === tab.key ? "#fff" : "var(--terracotta, #c95f3b)", fontFamily: "var(--font-dm-mono, monospace)" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                Order History
              </h2>
              <Link href="/track" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--terracotta, #c95f3b)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                Track a shipment
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" style={{ marginBottom: 16 }}>
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
                <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>No orders yet</p>
                <p style={{ margin: "0 0 20px", fontSize: 14, color: "#78716c" }}>Start shopping to place your first order.</p>
                <Link href="/shop" style={{ padding: "10px 22px", background: "var(--terracotta, #c95f3b)", color: "#fff", borderRadius: 9, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                  Browse Snacks
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(order => {
                  const st = STATUS_STYLES[order.orderStatus.toLowerCase()] ?? STATUS_STYLES.placed;
                  const isExpanded = expandedOrderId === order.id;
                  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const itemCount = order.items.length;
                  return (
                    <div key={order.id} style={{ background: "#fff", border: `1px solid ${isExpanded ? "rgba(201,95,59,0.3)" : "#e5e0d8"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.18s" }}>

                      {/* ── Clickable summary row ── */}
                      <button
                        onClick={() => {
                          setExpandedOrderId(prev => prev === order.id ? null : order.id);
                          setReviewingItemId(null);
                        }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}
                      >
                        {/* Left: order number + date/count */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-dm-mono, monospace)", whiteSpace: "nowrap" }}>
                            #{order.orderNumber}
                          </div>
                          <div style={{ fontSize: 12, color: "#78716c", marginTop: 2, whiteSpace: "nowrap" }}>
                            {orderDate} · {itemCount} {itemCount === 1 ? "item" : "items"}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: "4px 9px", borderRadius: 999, fontFamily: "var(--font-dm-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                          {order.orderStatus}
                        </span>

                        {/* Total */}
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)", flexShrink: 0 }}>
                          {fmt.format(parseFloat(order.total))}
                        </span>

                        {/* Chevron */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      {/* ── Expandable content ── */}
                      {isExpanded && (
                        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f0ede8" }}>

                          {/* Items list */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, marginBottom: 14 }}>
                            {order.items.map(item => (
                              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {item.product?.image ? (
                                  <Image src={item.product.image} alt={item.name} width={44} height={44} unoptimized style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #e5e0d8", flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {item.product?.slug ? (
                                    <Link href={`/product/${item.product.slug}`} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink, #243127)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {item.name}
                                    </Link>
                                  ) : (
                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink, #243127)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                                  )}
                                  <div style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                                    <span>Qty {item.quantity} × {fmt.format(parseFloat(item.price))}</span>
                                    {item.weight && <span style={{ background: "#f0ede8", padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-dm-mono, monospace)" }}>{item.weight}</span>}
                                  </div>
                                </div>

                                {/* Review button */}
                                {order.orderStatus.toLowerCase() === "delivered" && item.productId && (
                                  <div style={{ flexShrink: 0 }}>
                                    {reviewedProductIds.includes(item.productId) ? (
                                      <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>✓ Reviewed</span>
                                    ) : reviewingItemId === item.id ? null : (
                                      <button onClick={() => { setReviewingItemId(item.id); setReviewRating(0); setReviewContent(""); setReviewError(""); }} style={{ fontSize: 12, fontWeight: 600, color: "var(--terracotta, #c95f3b)", background: "rgba(201,95,59,0.08)", border: "1px solid rgba(201,95,59,0.25)", borderRadius: 999, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                                        Rate it
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Inline review form */}
                          {reviewingItemId !== null && order.items.some(i => i.id === reviewingItemId) && (
                            <div style={{ background: "#faf8f5", border: "1px solid #e5e0d8", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                                {[1,2,3,4,5].map(s => (
                                  <button key={s} type="button" onClick={() => setReviewRating(s)} onMouseEnter={() => setReviewHovered(s)} onMouseLeave={() => setReviewHovered(0)} style={{ background: "none", border: "none", cursor: "pointer", color: (reviewHovered || reviewRating) >= s ? "#f59e0b" : "#d1d5db", padding: 2 }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                  </button>
                                ))}
                              </div>
                              <textarea rows={2} value={reviewContent} onChange={e => setReviewContent(e.target.value)} placeholder="Share your experience…" style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e0d8", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none", marginBottom: 8 }} />
                              {reviewError && <p style={{ margin: "0 0 6px", color: "#dc2626", fontSize: 12 }}>{reviewError}</p>}
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => { const item = order.items.find(i => i.id === reviewingItemId); if (item?.productId) submitReview(item.productId); }} disabled={reviewSubmitting} style={{ padding: "7px 16px", background: "var(--terracotta, #c95f3b)", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                  {reviewSubmitting ? "Posting…" : "Post Review"}
                                </button>
                                <button onClick={() => setReviewingItemId(null)} style={{ padding: "7px 12px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#57534e" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                            <button onClick={() => setDetailOrder(order)} style={{ flex: 1, minWidth: 110, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--ink, #243127)", cursor: "pointer" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                              Details
                            </button>
                            <button onClick={() => downloadInvoice(order.orderNumber)} style={{ flex: 1, minWidth: 110, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#57534e", cursor: "pointer" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Invoice
                            </button>
                            <button onClick={() => handleBuyAgain(order)} style={{ flex: 1, minWidth: 110, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", background: "var(--terracotta, #c95f3b)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                              Buy Again
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {activeTab === "addresses" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                Saved Addresses
              </h2>
              {!showAddForm && (
                <button onClick={() => { setShowAddForm(true); setAddrError(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--terracotta, #c95f3b)", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Address
                </button>
              )}
            </div>

            {showAddForm && (
              <form onSubmit={handleAddAddress} style={{ background: "#fff", border: "1.5px solid var(--terracotta, #c95f3b)", borderRadius: 14, padding: 20, marginBottom: 18, boxSizing: "border-box" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>New Address</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Recipient Name", key: "name", placeholder: "Full name", full: false },
                    { label: "Mobile Number", key: "phone", placeholder: "10-digit mobile", full: false },
                    { label: "Street Address", key: "address", placeholder: "Door no., Street, Landmark", full: true },
                    { label: "City", key: "city", placeholder: "City / District", full: false },
                    { label: "State", key: "state", placeholder: "State", full: false },
                    { label: "PIN Code", key: "pincode", placeholder: "6-digit PIN", full: false },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c", marginBottom: 4, fontFamily: "var(--font-dm-mono, monospace)" }}>{f.label}</label>
                      <input
                        value={addrDraft[f.key as keyof typeof addrDraft] as string}
                        onChange={e => setAddrDraft(d => ({ ...d, [f.key]: e.target.value }))}
                        onBlur={() => { if (f.key === "phone" && isValidIndianPhone(addrDraft.phone)) setAddrDraft(d => ({ ...d, phone: normalizeIndianPhone(d.phone) })); }}
                        placeholder={f.placeholder}
                        maxLength={f.key === "pincode" ? 6 : undefined}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={addrDraft.isDefault} onChange={e => setAddrDraft(d => ({ ...d, isDefault: e.target.checked }))} />
                      Set as default address
                    </label>
                  </div>
                </div>
                {addrError && <div style={{ marginTop: 10, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "8px 12px" }}>{addrError}</div>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                  <button type="button" onClick={() => { setShowAddForm(false); setAddrError(""); }} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#57534e" }}>Cancel</button>
                  <button type="submit" disabled={savingAddr} style={{ padding: "8px 20px", background: "var(--terracotta, #c95f3b)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {savingAddr ? "Saving…" : "Save Address"}
                  </button>
                </div>
              </form>
            )}

            {!addressLoaded ? (
              <p style={{ color: "#a8a29e", fontSize: 14 }}>Loading…</p>
            ) : addresses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16 }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" style={{ marginBottom: 14 }}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0Z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>No saved addresses</p>
                <p style={{ margin: "0 0 18px", fontSize: 14, color: "#78716c" }}>Add an address to speed up checkout.</p>
                <button onClick={() => setShowAddForm(true)} style={{ padding: "9px 20px", background: "var(--terracotta, #c95f3b)", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Add Address</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {addresses.map(addr => (
                  <div key={addr.id} style={{ background: "#fff", border: `1.5px solid ${addr.isDefault ? "#86efac" : "#e5e0d8"}`, borderRadius: 14, padding: 16, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      {addr.isDefault && (
                        <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 999, marginBottom: 8, fontFamily: "var(--font-dm-mono, monospace)", textTransform: "uppercase" }}>
                          ★ Default
                        </span>
                      )}
                      <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--ink, #243127)" }}>{addr.name}</p>
                      {addr.phone && <p style={{ margin: "0 0 4px", fontSize: 13, color: "#57534e", fontFamily: "var(--font-dm-mono, monospace)" }}>{formatIndianPhone(addr.phone)}</p>}
                      <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "#44403c", lineHeight: 1.5 }}>{addr.address}<br/>{addr.city}, {addr.state}</p>
                      <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "var(--ink, #243127)", background: "#f4f1ea", padding: "2px 8px", borderRadius: 5, fontFamily: "var(--font-dm-mono, monospace)" }}>PIN {addr.pincode}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid #f0ede8" }}>
                      {!addr.isDefault && (
                        <button onClick={() => setDefaultAddress(addr.id)} style={{ fontSize: 12.5, fontWeight: 600, color: "#57534e", background: "#f5f4ef", border: "1px solid #e5e0d8", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                          Set Default
                        </button>
                      )}
                      <button onClick={() => deleteAddress(addr.id)} style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "#dc2626", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>Account Details</h2>
            <div style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 24, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {[
                  { label: "Full Name", value: name },
                  { label: "Email", value: account.email },
                  { label: "Member Since", value: new Date(account.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) },
                  { label: "Role", value: account.isAdmin ? "Store Administrator" : "Customer" },
                ].map(item => (
                  <div key={item.label} style={{ background: "var(--cream, #f7f4ec)", border: "1px solid #e5e0d8", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c", marginBottom: 4, fontFamily: "var(--font-dm-mono, monospace)" }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink, #243127)", wordBreak: "break-word" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>Store Policies</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "Shipping & Delivery", href: "/policies/shipping" },
                  { label: "Returns & Refunds", href: "/policies/refund" },
                  { label: "Privacy Policy", href: "/policies/privacy" },
                  { label: "Terms of Service", href: "/policies/terms" },
                ].map(p => (
                  <Link key={p.href} href={p.href} style={{ padding: "8px 16px", background: "var(--cream, #f7f4ec)", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink, #243127)", textDecoration: "none" }}>
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === "messages" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                Support Inquiries
              </h2>
              <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--terracotta, #c95f3b)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Message
              </Link>
            </div>

            {!messagesLoaded ? (
              <p style={{ color: "#a8a29e", fontSize: 14 }}>Loading…</p>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", background: "#fff", border: "1px solid #e5e0d8", borderRadius: 16 }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" style={{ marginBottom: 14 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>No messages yet</p>
                <p style={{ margin: "0 0 18px", fontSize: 14, color: "#78716c" }}>Contact our team for order support, bulk orders, or any inquiries.</p>
                <Link href="/contact" style={{ padding: "9px 20px", background: "var(--terracotta, #c95f3b)", color: "#fff", borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                  Contact Us
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {messages.map(msg => {
                  const subjectMap: Record<string, string> = { order: "Order Inquiry", product: "Product Question", bulk: "Bulk Orders", feedback: "Feedback", other: "General" };
                  return (
                    <div key={msg.id} style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 14, padding: 18, boxSizing: "border-box" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontFamily: "var(--font-dm-mono, monospace)" }}>
                            {subjectMap[msg.subject] ?? msg.subject}
                          </span>
                          {msg.adminReply ? (
                            <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 6, fontFamily: "var(--font-dm-mono, monospace)" }}>Replied</span>
                          ) : (
                            <span style={{ fontSize: 11.5, color: "#a8a29e" }}>Awaiting reply</span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: "#a8a29e" }}>
                          {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div style={{ background: "var(--cream, #f7f4ec)", border: "1px solid #e5e0d8", borderRadius: 8, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, color: "var(--ink, #243127)", whiteSpace: "pre-wrap", marginBottom: msg.adminReply ? 10 : 0 }}>
                        {msg.message}
                      </div>
                      {msg.adminReply && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", fontFamily: "var(--font-dm-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                            Raghul Delights
                            {msg.replyAt && <span style={{ marginLeft: 8, fontWeight: 400 }}>· {new Date(msg.replyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                          </div>
                          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#166534", whiteSpace: "pre-wrap" }}>{msg.adminReply}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* WhatsApp Banner */}
            <div style={{ marginTop: 16, background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, color: "#166534" }}>Need instant help?</p>
                <p style={{ margin: 0, fontSize: 13, color: "#15803d" }}>Chat with us on WhatsApp for quick order updates.</p>
              </div>
              <a href="https://wa.me/918667829041?text=Hello%20Raghul%20Delights%2C%20I%20have%20an%20inquiry" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "#25d366", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {detailOrder && (
          <OrderDetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onDownloadInvoice={downloadInvoice}
            onBuyAgain={handleBuyAgain}
            reviewedProductIds={reviewedProductIds}
          />
        )}
      </div>
    </div>
  );
}
