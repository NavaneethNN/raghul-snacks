"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

type ComboItem = {
  id: number;
  productId: number | null;
  quantity: number;
  name?: string | null;
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
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = combos.length;

  const goTo = useCallback(
    (next: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setActiveIndex(next);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  const advance = useCallback(() => {
    goTo((activeIndex + 1) % total);
  }, [activeIndex, total, goTo]);

  // Auto-advance every 4s
  useEffect(() => {
    if (total <= 1 || paused) {
      if (autoRef.current) clearInterval(autoRef.current);
      return;
    }
    autoRef.current = setInterval(advance, 4000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [paused, advance, total]);

  function handleGoTo(i: number) {
    if (autoRef.current) clearInterval(autoRef.current);
    goTo(i);
    if (!paused && total > 1) {
      autoRef.current = setInterval(advance, 4000);
    }
  }

  if (total === 0) return null;

  const combo = combos[activeIndex];
  const displayPrice =
    combo.discount && parseFloat(combo.discount) > 0
      ? combo.discount
      : combo.price;

  return (
    <section
      className="combo-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        .combo-showcase {
          background: var(--terracotta);
          color: #fff;
          max-width: 100%;
          margin: 48px auto 0;
          padding: 40px 24px 36px;
          position: relative;
          overflow: hidden;
        }
        .combo-showcase::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255,255,255,0.06), transparent 65%);
          border-radius: 50%;
          top: -120px;
          right: -100px;
          pointer-events: none;
        }
        .combo-showcase-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: center;
        }
        @media (min-width: 768px) {
          .combo-showcase-inner {
            grid-template-columns: 1fr 1fr;
            gap: 48px;
          }
        }
        .combo-showcase-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1100px;
          margin: 0 auto 28px;
        }
        .combo-showcase-header .eyebrow {
          color: #ffe2ab;
          margin: 0;
        }
        .combo-showcase-view-all {
          color: rgba(255,255,255,0.85);
          font: 600 13px 'DM Sans', sans-serif;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.4);
          padding: 6px 14px;
          border-radius: 6px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .combo-showcase-view-all:hover {
          background: rgba(255,255,255,0.15);
        }
        .combo-slide {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .combo-slide.exit {
          opacity: 0;
          transform: translateY(8px);
        }
        .combo-text h2 {
          font: 700 clamp(28px, 5vw, 42px) 'Playfair Display', serif;
          letter-spacing: -0.04em;
          margin: 8px 0 12px;
          color: #fff;
          line-height: 1.1;
        }
        .combo-text h2 i {
          color: #ffe2ab;
          font-style: italic;
        }
        .combo-text .combo-desc {
          font-size: 15px;
          color: rgba(255,255,255,0.85);
          margin: 0 0 16px;
          line-height: 1.6;
        }
        .combo-items-list {
          list-style: none;
          padding: 0;
          margin: 0 0 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .combo-items-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: rgba(255,255,255,0.9);
        }
        .combo-items-list li::before {
          content: '✦';
          font-size: 8px;
          color: #ffe2ab;
          flex-shrink: 0;
        }
        .combo-price-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .combo-price-main {
          font: 700 28px 'DM Sans', sans-serif;
          color: #ffe2ab;
        }
        .combo-price-original {
          font-size: 16px;
          color: rgba(255,255,255,0.5);
          text-decoration: line-through;
        }
        .combo-actions-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .combo-btn-primary {
          background: #fff;
          color: var(--terracotta);
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font: 700 14px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        .combo-btn-primary:hover {
          background: #ffe2ab;
          color: var(--ink);
          transform: translateY(-2px);
        }
        .combo-btn-outline {
          background: transparent;
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.6);
          border-radius: 8px;
          padding: 12px 24px;
          font: 600 14px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        .combo-btn-outline:hover {
          background: rgba(255,255,255,0.15);
          border-color: #fff;
        }
        /* Image side */
        .combo-image-side {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .combo-image-frame {
          width: 100%;
          max-width: 420px;
          aspect-ratio: 4/3;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .combo-image-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .combo-image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .combo-image-placeholder-num {
          font: 700 80px 'Playfair Display', serif;
          color: rgba(255,255,255,0.35);
          line-height: 1;
        }
        .combo-image-placeholder-label {
          font: 400 italic 16px 'Playfair Display', serif;
          color: rgba(255,255,255,0.5);
        }
        /* Dots + arrows */
        .combo-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 28px;
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }
        .combo-nav-arrow {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.5);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .combo-nav-arrow:hover {
          background: rgba(255,255,255,0.3);
        }
        .combo-nav-dots {
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
          background: rgba(255,255,255,0.35);
          transition: all 0.25s ease;
        }
        .combo-nav-dot.active {
          background: #fff;
          transform: scale(1.3);
        }
        /* Progress bar */
        .combo-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255,255,255,0.6);
          border-radius: 0 2px 2px 0;
          animation: combo-progress-fill 4s linear;
          animation-play-state: running;
        }
        @keyframes combo-progress-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="combo-showcase-header">
        <p className="eyebrow">Special Combos</p>
        <Link href="/shop?tab=combos" className="combo-showcase-view-all">
          View all →
        </Link>
      </div>

      {/* Slide content */}
      <div className={`combo-showcase-inner combo-slide${animating ? " exit" : ""}`}>
        {/* Text side */}
        <div className="combo-text">
          <span style={{ font: "600 11px 'DM Mono',monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffe2ab" }}>
            {combo.items.length} item{combo.items.length !== 1 ? "s" : ""}
          </span>
          <h2>{combo.title}</h2>

          {combo.description && (
            <p className="combo-desc">{combo.description}</p>
          )}

          {combo.items.length > 0 && (
            <ul className="combo-items-list">
              {combo.items.slice(0, 4).map((item, idx) => (
                <li key={idx}>
                  {item.name || "Product"} × {item.quantity}g
                </li>
              ))}
              {combo.items.length > 4 && (
                <li>+{combo.items.length - 4} more items</li>
              )}
            </ul>
          )}

          <div className="combo-price-row">
            <span className="combo-price-main">₹{displayPrice}</span>
            {combo.discount && parseFloat(combo.discount) > 0 && (
              <span className="combo-price-original">₹{combo.price}</span>
            )}
          </div>

          <div className="combo-actions-row">
            <Link href={`/combo/${combo.slug}`} className="combo-btn-primary">
              Get this combo →
            </Link>
          </div>
        </div>

        {/* Image side */}
        <div className="combo-image-side">
          <div className="combo-image-frame">
            {combo.image ? (
              <img src={combo.image} alt={combo.title} />
            ) : (
              <div className="combo-image-placeholder">
                <span className="combo-image-placeholder-num">{combo.items.length}</span>
                <span className="combo-image-placeholder-label">delicious items</span>
              </div>
            )}
            {/* Progress bar — resets on each combo change */}
            {total > 1 && !paused && (
              <div key={`${activeIndex}-progress`} className="combo-progress" />
            )}
          </div>
        </div>
      </div>

      {/* Dots + prev/next — only when multiple combos */}
      {total > 1 && (
        <div className="combo-nav">
          <button
            className="combo-nav-arrow"
            onClick={() => handleGoTo((activeIndex - 1 + total) % total)}
            aria-label="Previous combo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div className="combo-nav-dots">
            {combos.map((_, i) => (
              <button
                key={i}
                className={`combo-nav-dot${i === activeIndex ? " active" : ""}`}
                onClick={() => handleGoTo(i)}
                aria-label={`Go to combo ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="combo-nav-arrow"
            onClick={() => handleGoTo((activeIndex + 1) % total)}
            aria-label="Next combo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
