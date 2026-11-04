"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type ProductOption = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  price?: string | null;
  weight?: string | null;
};

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent! Loved it",
};

export function FeedbackForm({
  products,
  initialProductId,
}: {
  products: ProductOption[];
  initialProductId?: number | null;
}) {
  const [selectedId, setSelectedId] = useState<number | "">(initialProductId ?? "");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState<ProductOption | null>(null);

  const selectedProduct = products.find((p) => p.id === Number(selectedId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedId) {
      setError("Please select the snack you tasted.");
      return;
    }
    if (!rating || rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    if (!customerName.trim() || customerName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!content.trim() || content.trim().length < 3) {
      setError("Please write a few words about your experience.");
      return;
    }
    if (phone.trim()) {
      const cleanDigits = phone.replace(/\D/g, "");
      if (cleanDigits.length < 10) {
        setError("Please enter a valid 10-digit contact number.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedId,
          customerName: customerName.trim(),
          phone: phone.trim() || undefined,
          rating,
          content: content.trim(),
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");

      setSubmittedProduct(selectedProduct || null);
      setSubmitted(true);
      window.dispatchEvent(new Event("review-submitted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setContent("");
    setPhone("");
    setRating(5);
    setHoverRating(0);
    setError("");
    setSelectedId("");
  }

  if (submitted && submittedProduct) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e0d8",
          borderRadius: 18,
          padding: "36px 24px",
          textAlign: "center",
          boxShadow: "0 10px 30px -5px rgba(36, 49, 39, 0.08)",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "#dcfce7",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--ink, #243127)",
            fontFamily: "var(--font-playfair, Georgia, serif)",
          }}
        >
          Thank you, {customerName}!
        </h2>

        <p style={{ margin: "0 0 20px", color: "#57534e", fontSize: 14.5, lineHeight: 1.5 }}>
          Your honest review for <strong>{submittedProduct.name}</strong> has been received and added to our store. We truly appreciate your support!
        </p>

        {submittedProduct.image && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#faf8f4", border: "1px solid #e5e0d8", borderRadius: 10, padding: "8px 14px", marginBottom: 24 }}>
            <Image
              src={submittedProduct.image}
              alt={submittedProduct.name}
              width={40}
              height={40}
              unoptimized
              style={{ borderRadius: 6, objectFit: "cover" }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink, #243127)" }}>
              {submittedProduct.name}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "11px 20px",
              background: "#ffffff",
              border: "1.5px solid #e5e0d8",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#57534e",
              cursor: "pointer",
            }}
          >
            Review Another Snack
          </button>
          <Link
            href="/shop"
            style={{
              padding: "11px 22px",
              background: "var(--terracotta, #c95f3b)",
              color: "#ffffff",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Visit Our Store →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e0d8",
        borderRadius: 18,
        padding: "28px 24px 32px",
        boxShadow: "0 10px 30px -5px rgba(36, 49, 39, 0.08)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* 1. Snack Selection */}
        <div>
          <label
            htmlFor="feedback-product"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#78716c",
              marginBottom: 8,
              fontFamily: "var(--font-dm-mono, monospace)",
            }}
          >
            1. Select the Snack you tasted *
          </label>

          <div style={{ position: "relative" }}>
            <select
              id="feedback-product"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e0d8",
                fontSize: 14.5,
                fontWeight: 600,
                color: "var(--ink, #243127)",
                background: "#faf8f4",
                outline: "none",
                fontFamily: "inherit",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <option value="">— Choose a snack from our kitchen —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.trim()}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 10,
                padding: "8px 12px",
                background: "#fdfbf7",
                borderRadius: 8,
                border: "1px solid #f0ede8",
              }}
            >
              {selectedProduct.image ? (
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  width={36}
                  height={36}
                  unoptimized
                  style={{ borderRadius: 6, objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f0ede8" }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink, #243127)" }}>
                {selectedProduct.name}
              </span>
            </div>
          )}
        </div>

        {/* 2. Rating Picker */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#78716c",
              marginBottom: 8,
              fontFamily: "var(--font-dm-mono, monospace)",
            }}
          >
            2. Your Overall Rating *
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const active = s <= (hoverRating || rating);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${s} stars`}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "4px",
                    cursor: "pointer",
                    color: active ? "#f59e0b" : "#d1d5db",
                    transition: "transform 0.15s, color 0.15s",
                    transform: active ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              );
            })}
            <span
              style={{
                marginLeft: 8,
                fontSize: 13.5,
                fontWeight: 700,
                color: "#92400e",
                background: "#fef3c7",
                padding: "3px 10px",
                borderRadius: 999,
                fontFamily: "var(--font-dm-mono, monospace)",
              }}
            >
              {RATING_LABELS[hoverRating || rating] || `${rating} Stars`}
            </span>
          </div>
        </div>

        {/* 3. Name & Contact Number Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label
              htmlFor="feedback-name"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#78716c",
                marginBottom: 6,
                fontFamily: "var(--font-dm-mono, monospace)",
              }}
            >
              Your Name *
            </label>
            <input
              id="feedback-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Suresh K."
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 9,
                border: "1.5px solid #e5e0d8",
                fontSize: 14,
                color: "var(--ink, #243127)",
                background: "#ffffff",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="feedback-phone"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#78716c",
                marginBottom: 6,
                fontFamily: "var(--font-dm-mono, monospace)",
              }}
            >
              Contact Number <span style={{ textTransform: "none", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              id="feedback-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98765 43210"
              maxLength={15}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 9,
                border: "1.5px solid #e5e0d8",
                fontSize: 14,
                color: "var(--ink, #243127)",
                background: "#ffffff",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* 4. Comments */}
        <div>
          <label
            htmlFor="feedback-content"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#78716c",
              marginBottom: 6,
              fontFamily: "var(--font-dm-mono, monospace)",
            }}
          >
            3. Your Experience & Comments *
          </label>
          <textarea
            id="feedback-content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How was the taste, crunch, and freshness? What did your family think?"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid #e5e0d8",
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--ink, #243127)",
              background: "#ffffff",
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "var(--terracotta, #c95f3b)",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(201, 95, 59, 0.28)",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitting ? "Submitting Review…" : "Publish Review →"}
        </button>
      </div>
    </form>
  );
}

