"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/toast-provider";

type ComboItem = {
  id: number;
  productId: number | null;
  quantity: number;
  name?: string | null;
  image?: string | null;
  weight?: string | null;
  slug?: string | null;
};

type Combo = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  price: string;
  discount?: string | null;
  image?: string | null;
  items: ComboItem[];
};

export function CombosSlider({ combos }: { combos: Combo[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabsTrackRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const total = combos.length;

  const { addItem, getItemQuantity } = useCart();
  const { show } = useToast();

  // Smoothly scroll active tab into view inside the tabs track ONLY
  // (Avoids element.scrollIntoView which scrolls the entire window/page causing horizontal blowout)
  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeIndex];
    const track = tabsTrackRef.current;
    if (activeBtn && track) {
      const trackRect = track.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const targetScroll = track.scrollLeft + (btnRect.left - trackRect.left) - (trackRect.width / 2) + (btnRect.width / 2);
      track.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsTrackRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      tabsTrackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const goTo = useCallback(
    (next: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setActiveIndex(next);
        setAnimating(false);
      }, 260);
    },
    [animating]
  );

  const advance = useCallback(() => {
    goTo((activeIndex + 1) % total);
  }, [activeIndex, total, goTo]);

  // Auto-advance every 5 seconds when not hovered
  useEffect(() => {
    if (total <= 1 || paused) {
      if (autoRef.current) clearInterval(autoRef.current);
      return;
    }
    autoRef.current = setInterval(advance, 5000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [paused, advance, total]);

  function handleGoTo(i: number) {
    if (autoRef.current) clearInterval(autoRef.current);
    goTo(i);
    if (!paused && total > 1) {
      autoRef.current = setInterval(advance, 5000);
    }
  }

  function handleAddToCart(c: Combo) {
    if (addedId === c.id) return;
    const op = c.discount && parseFloat(c.discount) > 0 ? parseFloat(c.discount) : parseFloat(c.price);
    const orig = parseFloat(c.price);
    const cartItem = {
      id: `combo-${c.id}`,
      slug: c.slug,
      name: c.title,
      price: orig,
      offerPrice: op,
      weight: `${c.items?.length || 0} items`,
      description: c.description || `Combo with ${c.items?.length || 0} products`,
      ingredients: c.items?.map((it) => it.name).filter(Boolean).join(", ") || "",
      category: "combo",
      image: c.image || "",
    };
    addItem(cartItem, 1);
    setAddedId(c.id);
    show(`✓ ${c.title} added to cart`, { duration: 4500, href: "/cart" });
    setTimeout(() => setAddedId(null), 2500);
  }

  if (total === 0) return null;

  const combo = combos[activeIndex] || combos[0];
  const displayPrice = combo.discount && parseFloat(combo.discount) > 0
    ? parseFloat(combo.discount)
    : parseFloat(combo.price);
  const originalPrice = parseFloat(combo.price);
  const hasDiscount = combo.discount && parseFloat(combo.discount) > 0 && displayPrice < originalPrice;
  const savings = hasDiscount ? Math.round(originalPrice - displayPrice) : 0;
  const savingsPercent = hasDiscount ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  const cartComboId = `combo-${combo.id}`;
  const inCart = getItemQuantity(cartComboId) > 0;
  const isAdded = addedId === combo.id;

  return (
    <section
      className="combo-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Special Combos"
    >
      <style>{`
        .combo-section {
          max-width: 1200px;
          margin: 24px auto 28px;
          padding: 0 20px;
          position: relative;
        }

        /* ── Header ── */
        .combo-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 24px;
        }
        .combo-header-left {
          max-width: 680px;
        }
        .combo-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: 600 11px 'DM Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--terracotta);
          background: rgba(201, 95, 59, 0.08);
          border: 1px solid rgba(201, 95, 59, 0.2);
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .combo-eyebrow-pill .sparkle {
          color: var(--terracotta);
          font-size: 10px;
        }
        .combo-section-header h2 {
          font: 700 clamp(26px, 4vw, 36px) 'Playfair Display', serif;
          color: var(--ink);
          letter-spacing: -0.03em;
          margin: 0 0 8px;
          line-height: 1.15;
        }
        .combo-section-subtitle {
          margin: 0;
          font-size: 15px;
          color: #6b7280;
          line-height: 1.55;
        }
        .combo-browse-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: 600 13px 'DM Sans', sans-serif;
          color: var(--terracotta);
          text-decoration: none;
          padding: 8px 16px;
          border: 1.5px solid var(--terracotta);
          border-radius: 999px;
          background: transparent;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .combo-browse-all-btn:hover {
          background: var(--terracotta);
          color: #fff;
          transform: translateX(2px);
        }

        /* ── Tabs selector (multiple combos) ── */
        .combo-tabs-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .combo-tabs-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
          border: 1.5px solid var(--line);
          color: var(--ink);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .combo-tabs-arrow:hover {
          background: #faf8f5;
          border-color: var(--terracotta);
          color: var(--terracotta);
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(201, 95, 59, 0.18);
        }

        .combo-tabs-arrow:active {
          transform: scale(0.95);
        }

        .combo-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 6px 8px;
          background: rgba(36, 49, 39, 0.035);
          border: 1px solid rgba(36, 49, 39, 0.08);
          border-radius: 999px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          flex: 1 1 0%;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        .combo-tabs-bar::-webkit-scrollbar {
          display: none;
        }

        .combo-tab-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: transparent;
          border: 1.5px solid transparent;
          border-radius: 999px;
          font: 600 13px 'DM Sans', sans-serif;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          flex-shrink: 0;
          user-select: none;
        }

        .combo-tab-pill:hover {
          background: rgba(255, 255, 255, 0.85);
          color: var(--ink);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .combo-tab-pill.active {
          background: #ffffff;
          border-color: rgba(201, 95, 59, 0.28);
          color: var(--terracotta);
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(36, 49, 39, 0.08), 0 1px 3px rgba(201, 95, 59, 0.12);
        }

        .tab-pill-index {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font: 700 11px 'DM Mono', monospace;
          opacity: 0.8;
          color: #6b7280;
        }

        .combo-tab-pill.active .tab-pill-index {
          color: var(--terracotta);
          opacity: 1;
        }

        .tab-pill-sparkle {
          font-size: 10px;
          color: var(--saffron);
          animation: spinPulse 2.5s infinite ease-in-out;
        }

        @keyframes spinPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.3); opacity: 1; }
        }

        .tab-pill-title {
          letter-spacing: -0.01em;
        }

        .tab-pill-badge {
          font: 700 10.5px 'DM Sans', sans-serif;
          padding: 2.5px 8px;
          border-radius: 999px;
          background: rgba(22, 163, 74, 0.1);
          color: #15803d;
          border: 1px solid rgba(22, 163, 74, 0.2);
          letter-spacing: 0.01em;
        }

        .combo-tab-pill.active .tab-pill-badge {
          background: rgba(201, 95, 59, 0.12);
          color: var(--terracotta);
          border-color: rgba(201, 95, 59, 0.25);
        }

        @media (max-width: 640px) {
          .combo-tabs-arrow {
            display: none;
          }
          .combo-tabs-bar {
            padding: 4px;
            gap: 6px;
          }
          .combo-tab-pill {
            padding: 7px 14px;
            font-size: 12.5px;
          }
        }

        /* ── Showcase Card ── */
        .combo-card-outer {
          position: relative;
          background: radial-gradient(circle at 85% 15%, rgba(255, 226, 171, 0.18) 0%, transparent 45%),
                      linear-gradient(135deg, #8c3214 0%, #ba512f 52%, #75250c 100%);
          border-radius: 24px;
          border: 1px solid rgba(255, 226, 171, 0.24);
          box-shadow: 0 20px 48px -12px rgba(140, 50, 20, 0.28), 0 2px 8px rgba(0, 0, 0, 0.05);
          color: #fff;
          overflow: hidden;
          padding: 40px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .combo-card-outer::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          opacity: 0.5;
        }
        .combo-card-inner {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 44px;
          align-items: center;
          transition: opacity 0.25s ease, transform 0.25s ease;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .combo-card-inner.exit {
          opacity: 0;
          transform: translateY(6px);
        }

        /* ── Info Column ── */
        .combo-info-col {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .combo-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .combo-badge-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: 700 11px 'DM Sans', sans-serif;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(8px);
          padding: 4px 10px;
          border-radius: 999px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
        }
        .combo-count-tag {
          font: 600 11px 'DM Mono', monospace;
          letter-spacing: 0.04em;
          color: #ffe2ab;
          background: rgba(0, 0, 0, 0.2);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .combo-savings-glow-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font: 700 11px 'DM Sans', sans-serif;
          letter-spacing: 0.04em;
          background: #ffe2ab;
          color: #75250c;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .combo-card-title {
          font: 700 clamp(24px, 3.8vw, 38px) 'Playfair Display', serif;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          color: #fff;
          line-height: 1.16;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .combo-card-desc {
          margin: 0 0 20px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.6;
          max-width: 580px;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        /* ── Chips: What's inside ── */
        .combo-items-box {
          background: rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          backdrop-filter: blur(6px);
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .combo-items-box-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .combo-items-label {
          font: 600 11px 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ffe2ab;
        }
        .combo-items-count {
          font: 500 11px 'DM Sans', sans-serif;
          color: rgba(255, 255, 255, 0.7);
        }
        .combo-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-width: 100%;
          min-width: 0;
        }
        .combo-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 13px;
          color: #fff;
          transition: background 0.15s ease;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .combo-chip:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .combo-chip-bullet {
          color: #ffe2ab;
          font-size: 10px;
        }
        .combo-chip-img {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }
        .combo-chip-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }
        .combo-chip-qty {
          font: 600 11px 'DM Mono', monospace;
          color: #ffe2ab;
          opacity: 0.9;
        }

        /* ── Artisanal Note ── */
        .combo-artisanal-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font: 500 12px 'DM Sans', sans-serif;
          color: rgba(255, 255, 255, 0.78);
          margin-bottom: 24px;
        }
        .combo-artisanal-note svg {
          color: #ffe2ab;
          flex-shrink: 0;
        }

        /* ── Bottom Price & Actions ── */
        .combo-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }
        .combo-price-group {
          display: flex;
          flex-direction: column;
        }
        .combo-price-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .combo-price-current {
          font: 700 32px 'DM Sans', sans-serif;
          color: #ffe2ab;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .combo-price-original {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: line-through;
        }
        .combo-price-subtext {
          font: 600 12px 'DM Sans', sans-serif;
          color: #86efac;
          margin-top: 3px;
        }

        .combo-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .combo-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fff;
          color: var(--terracotta);
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 12px 22px;
          font: 700 14px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }
        .combo-btn-primary:hover:not(:disabled) {
          background: #ffe2ab;
          border-color: #ffe2ab;
          color: var(--ink);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        }
        .combo-btn-primary.added {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
          cursor: default;
        }
        .combo-btn-primary.in-cart {
          background: #ffe2ab;
          border-color: #ffe2ab;
          color: var(--ink);
        }
        .combo-btn-details {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          color: #fff;
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          border-radius: 10px;
          padding: 12px 18px;
          font: 600 14px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .combo-btn-details:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: #fff;
          color: #fff;
        }

        /* ── Visual Column (Image) ── */
        .combo-visual-col {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .combo-image-link {
          display: block;
          width: 100%;
          text-decoration: none;
        }
        .combo-image-card {
          width: 100%;
          aspect-ratio: 4/3;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.25);
          border: 1.5px solid rgba(255, 226, 171, 0.25);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .combo-hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .combo-image-card:hover .combo-hero-image {
          transform: scale(1.04);
        }
        .combo-image-badge-top {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(18, 18, 18, 0.72);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffe2ab;
          font: 600 11px 'DM Mono', monospace;
          padding: 4px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .combo-image-badge-save {
          position: absolute;
          top: 14px;
          right: 14px;
          background: #ffe2ab;
          color: #75250c;
          font: 700 11px 'DM Sans', sans-serif;
          padding: 5px 11px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .combo-placeholder-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          padding: 30px;
        }
        .combo-placeholder-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffe2ab;
          line-height: 1;
        }
        .combo-placeholder-num {
          font: 700 42px 'Playfair Display', serif;
          color: #ffe2ab;
          line-height: 1;
        }
        .combo-placeholder-label {
          font: 400 italic 15px 'Playfair Display', serif;
          color: rgba(255, 255, 255, 0.8);
        }

        /* ── Progress & Carousel Nav ── */
        .combo-card-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 226, 171, 0.75);
          border-radius: 0 2px 2px 0;
          animation: combo-progress-fill 5s linear;
        }
        @keyframes combo-progress-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }

        .combo-carousel-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }
        .combo-arrow-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #fff;
          border: 1.5px solid var(--line);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }
        .combo-arrow-btn:hover {
          background: var(--terracotta);
          border-color: var(--terracotta);
          color: #fff;
          transform: scale(1.05);
        }
        .combo-dots-wrap {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .combo-nav-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          padding: 0;
          cursor: pointer;
          background: #dcd8cd;
          transition: all 0.25s ease;
        }
        .combo-nav-dot.active {
          background: var(--terracotta);
          width: 24px;
          border-radius: 999px;
        }

        /* ── Responsive Breakpoints ── */
        @media (max-width: 960px) {
          .combo-card-inner {
            grid-template-columns: minmax(0, 1fr);
            gap: 28px;
          }
          .combo-card-outer {
            padding: 30px 22px;
          }
          .combo-image-card {
            max-width: 480px;
            margin: 0 auto;
          }
        }
        @media (max-width: 640px) {
          .combo-section {
            margin-top: 24px;
            margin-bottom: 32px;
            padding: 0 12px;
            overflow-x: clip;
          }
          .combo-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .combo-card-outer {
            padding: 22px 16px;
            border-radius: 18px;
          }
          .combo-card-title {
            font-size: clamp(22px, 6vw, 28px);
          }
          .combo-card-desc {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          .combo-bottom-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }
          .combo-actions-group {
            flex-direction: column;
            width: 100%;
          }
          .combo-btn-primary, .combo-btn-details {
            width: 100%;
            padding: 12px 14px;
            font-size: 13.5px;
          }
          .combo-price-group {
            align-items: flex-start;
          }
          .combo-price-current {
            font-size: 28px;
          }
          .combo-items-box {
            padding: 12px 14px;
          }
          .combo-chip {
            padding: 5px 8px;
            font-size: 12px;
          }
          .combo-chip-name {
            max-width: 140px;
          }
        }
        @media (max-width: 440px) {
          .combo-section {
            padding: 0 8px;
          }
          .combo-card-outer {
            padding: 18px 12px;
            border-radius: 16px;
          }
          .combo-chip {
            padding: 4px 7px;
            font-size: 11.5px;
            gap: 5px;
          }
          .combo-chip-name {
            max-width: 110px;
          }
          .combo-tab-pill {
            padding: 6px 11px;
            font-size: 12px;
            gap: 5px;
          }
          .tab-pill-badge {
            font-size: 9.5px;
            padding: 2px 6px;
          }
          .combo-badge-tag, .combo-count-tag, .combo-savings-glow-badge {
            font-size: 10px;
            padding: 3px 8px;
          }
        }
      `}</style>

      {/* Section Header */}
      <div className="combo-section-header">
        <div className="combo-header-left">
          <span className="combo-eyebrow-pill">
            <span className="sparkle">✦</span> Curated Bundles & Gift Boxes
          </span>
          <h2>Handpicked Combos, Made for Sharing.</h2>
          <p className="combo-section-subtitle">
            Carefully paired traditional favourites and stone-ground podis. Freshly crafted in small batches with bundle savings.
          </p>
        </div>
        <Link href="/shop?tab=combos" className="combo-browse-all-btn">
          Browse all combos <span>→</span>
        </Link>
      </div>

      {/* Tabs Selector Bar (when multiple combos) */}
      {total > 1 && (
        <div className="combo-tabs-wrapper">
          <button
            type="button"
            className="combo-tabs-arrow combo-tabs-arrow-left"
            onClick={() => scrollTabs("left")}
            aria-label="Scroll tabs left"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div
            ref={tabsTrackRef}
            className="combo-tabs-bar"
            role="tablist"
            aria-label="Combo selections"
          >
            {combos.map((c, i) => {
              const cOffer = c.discount && parseFloat(c.discount) > 0 ? parseFloat(c.discount) : parseFloat(c.price);
              const cOrig = parseFloat(c.price);
              const cSavings = cOffer < cOrig ? Math.round(cOrig - cOffer) : 0;
              const isActive = i === activeIndex;
              return (
                <button
                  key={c.id}
                  ref={(el) => { tabButtonRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`combo-tab-pill ${isActive ? "active" : ""}`}
                  onClick={() => handleGoTo(i)}
                >
                  <span className="tab-pill-index">
                    {isActive && <span className="tab-pill-sparkle">✦</span>}
                    0{i + 1}
                  </span>
                  <span className="tab-pill-title">{c.title}</span>
                  {cSavings > 0 && (
                    <span className="tab-pill-badge">Save ₹{cSavings}</span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="combo-tabs-arrow combo-tabs-arrow-right"
            onClick={() => scrollTabs("right")}
            aria-label="Scroll tabs right"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Showcase Card */}
      <div className="combo-card-outer">
        <div className={`combo-card-inner combo-slide${animating ? " exit" : ""}`}>
          {/* Info Column */}
          <div className="combo-info-col">
            <div className="combo-badge-row">
              <span className="combo-badge-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M19 8a3 3 0 0 0-3-3 3 3 0 0 0-3 3"/><path d="M5 8a3 3 0 0 1 3-3 3 3 0 0 1 3 3"/>
                </svg>
                Special Value Box
              </span>
              <span className="combo-count-tag">
                {combo.items.length} Delicious Snacks
              </span>
              {hasDiscount && (
                <span className="combo-savings-glow-badge">
                  Save ₹{savings} ({savingsPercent}% OFF)
                </span>
              )}
            </div>

            <h3 className="combo-card-title">{combo.title}</h3>

            {combo.description && (
              <p className="combo-card-desc">{combo.description}</p>
            )}

            {/* What's in this box */}
            {combo.items && combo.items.length > 0 && (
              <div className="combo-items-box">
                <div className="combo-items-box-head">
                  <span className="combo-items-label">What&apos;s inside this box</span>
                  <span className="combo-items-count">{combo.items.length} items included</span>
                </div>
                <div className="combo-chips-grid">
                  {combo.items.map((item, idx) => {
                    const qtyText = item.quantity >= 10 ? `${item.quantity}g` : `×${item.quantity}`;
                    return (
                      <div key={idx} className="combo-chip" title={`${item.name || "Snack"} (${qtyText})`}>
                        {item.image ? (
                          <img src={item.image} alt={item.name || ""} className="combo-chip-img" loading="lazy" decoding="async" />
                        ) : (
                          <span className="combo-chip-bullet">✦</span>
                        )}
                        <span className="combo-chip-name">{item.name || "Traditional Snack"}</span>
                        <span className="combo-chip-qty">{qtyText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Artisanal Note */}
            <div className="combo-artisanal-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Crafted fresh in small batches · 100% natural ingredients, no preservatives</span>
            </div>

            {/* Price & Actions */}
            <div className="combo-bottom-bar">
              <div className="combo-price-group">
                <div className="combo-price-row">
                  <span className="combo-price-current">₹{Math.round(displayPrice)}</span>
                  {hasDiscount && (
                    <span className="combo-price-original">₹{Math.round(originalPrice)}</span>
                  )}
                </div>
                {hasDiscount && (
                  <span className="combo-price-subtext">You save ₹{savings} ({savingsPercent}% OFF)</span>
                )}
              </div>

              <div className="combo-actions-group">
                <button
                  type="button"
                  className={`combo-btn-primary ${isAdded ? "added" : inCart ? "in-cart" : ""}`}
                  onClick={() => handleAddToCart(combo)}
                  disabled={isAdded}
                >
                  {isAdded ? (
                    <>✓ Added to Cart</>
                  ) : inCart ? (
                    <>+ Add More · ₹{Math.round(displayPrice)}</>
                  ) : (
                    <>Add to Cart · ₹{Math.round(displayPrice)}</>
                  )}
                </button>
                <Link href={`/combo/${combo.slug}`} className="combo-btn-details">
                  View Details →
                </Link>
              </div>
            </div>
          </div>

          {/* Visual Column */}
          <div className="combo-visual-col">
            <Link href={`/combo/${combo.slug}`} className="combo-image-link" tabIndex={-1} aria-label={`View ${combo.title}`}>
              <div className="combo-image-card">
                {combo.image ? (
                  <img src={combo.image} alt={combo.title} className="combo-hero-image" loading="lazy" decoding="async" />
                ) : (
                  <div className="combo-placeholder-box">
                    <span className="combo-placeholder-icon">
                      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                      </svg>
                    </span>
                    <span className="combo-placeholder-num">{combo.items.length}</span>
                    <span className="combo-placeholder-label">Handcrafted Snacks</span>
                  </div>
                )}
                <div className="combo-image-badge-top">
                  Fresh Batch
                </div>
                {hasDiscount && (
                  <div className="combo-image-badge-save">
                    {savingsPercent}% OFF
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Auto-advance progress line */}
        {total > 1 && !paused && (
          <div key={`${activeIndex}-progress`} className="combo-card-progress" />
        )}
      </div>

      {/* Carousel Controls (when multiple combos) */}
      {total > 1 && (
        <div className="combo-carousel-nav">
          <button
            type="button"
            className="combo-arrow-btn"
            onClick={() => handleGoTo((activeIndex - 1 + total) % total)}
            aria-label="Previous combo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div className="combo-dots-wrap">
            {combos.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`combo-nav-dot ${i === activeIndex ? "active" : ""}`}
                onClick={() => handleGoTo(i)}
                aria-label={`Go to combo ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="combo-arrow-btn"
            onClick={() => handleGoTo((activeIndex + 1) % total)}
            aria-label="Next combo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
