"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = combos.length;

  function updateScrollState() {
    const track = trackRef.current;
    if (!track) return;
    const scrollable = track.scrollWidth > track.clientWidth + 4;
    setCanScroll(scrollable);
    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(track);
    track.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  }

  const advance = useCallback(() => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % total;
      scrollToIndex(next);
      return next;
    });
  }, [total]);

  // Auto-advance every 3.5s
  useEffect(() => {
    if (total <= 1) return;
    if (paused) {
      if (autoRef.current) clearInterval(autoRef.current);
      return;
    }
    autoRef.current = setInterval(advance, 3500);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [paused, advance, total]);

  function goTo(index: number) {
    setActiveIndex(index);
    scrollToIndex(index);
    // Reset timer on manual nav
    if (autoRef.current) clearInterval(autoRef.current);
    if (!paused && total > 1) {
      autoRef.current = setInterval(advance, 3500);
    }
  }

  function scroll(direction: "prev" | "next") {
    const next = direction === "next"
      ? Math.min(activeIndex + 1, total - 1)
      : Math.max(activeIndex - 1, 0);
    goTo(next);
  }

  const arrowBase: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    border: "1.5px solid rgba(255,255,255,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    color: "white",
  };

  return (
    <section
      className="combo-slider-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        .combo-slider-section {
          background: var(--terracotta);
          color: #fff;
          max-width: 100%;
          margin: 48px auto 0;
          padding: 40px 16px 32px;
          position: relative;
          overflow: hidden;
        }
        .combo-slider-section::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%);
          border-radius: 50%;
          top: -80px;
          right: -80px;
          pointer-events: none;
        }
        .combo-slider-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          max-width: 1240px;
          margin: 0 auto 24px;
          gap: 12px;
        }
        .combo-slider-header > div p.eyebrow {
          color: #ffe2ab;
        }
        .combo-slider-header h2 {
          font: 700 clamp(26px, 5vw, 36px) 'Playfair Display', serif;
          letter-spacing: -0.04em;
          margin: 4px 0 0;
          color: #fff;
          line-height: 1.1;
        }
        .combo-slider-track-wrap {
          position: relative;
          max-width: 1240px;
          margin: 0 auto;
        }
        .combo-slider-track {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
        }
        .combo-slider-track::-webkit-scrollbar { display: none; }
        .combo-card {
          flex: 0 0 clamp(260px, 80vw, 360px);
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 24px;
          scroll-snap-align: start;
          transition: transform 0.3s ease, background 0.3s ease;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .combo-card:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-4px);
        }
        .combo-card-img {
          width: 100%;
          height: 160px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .combo-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .combo-card-img-placeholder {
          font: 700 48px 'Playfair Display', serif;
          color: rgba(255,255,255,0.5);
        }
        .combo-card-count {
          display: inline-block;
          font: 600 11px 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ffe2ab;
        }
        .combo-card-title {
          font: 600 20px 'Playfair Display', serif;
          margin: 0;
          color: #fff;
          line-height: 1.2;
        }
        .combo-card-items {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          margin: 0;
          line-height: 1.6;
          list-style: none;
          padding: 0;
        }
        .combo-card-items li::before {
          content: '✦ ';
          font-size: 9px;
          opacity: 0.7;
        }
        .combo-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          gap: 8px;
          flex-wrap: wrap;
        }
        .combo-card-price {
          font: 700 22px 'DM Sans', sans-serif;
          color: #ffe2ab;
        }
        .combo-card-cta {
          background: rgba(255,255,255,0.2);
          border: 1.5px solid rgba(255,255,255,0.6);
          color: #fff;
          border-radius: 6px;
          padding: 8px 16px;
          font: 600 13px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
        }
        .combo-card-cta:hover {
          background: rgba(255,255,255,0.35);
          transform: translateY(-1px);
        }
        .combo-slider-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }
        .combo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: rgba(255,255,255,0.35);
          transition: all 0.25s ease;
          padding: 0;
        }
        .combo-dot.active {
          background: #fff;
          transform: scale(1.25);
        }
        .combo-slider-arrow {
          transition: background 0.2s ease, transform 0.2s ease !important;
        }
        .combo-slider-arrow:hover {
          background: rgba(255,255,255,0.4) !important;
          transform: translateY(-50%) scale(1.1) !important;
        }
        @media (min-width: 768px) {
          .combo-card {
            flex: 0 0 clamp(300px, 32%, 380px);
          }
        }
      `}</style>

      <div className="combo-slider-header">
        <div>
          <p className="eyebrow">Special Combos</p>
          <h2>Curated for you.</h2>
        </div>
        <Link
          href="/shop?tab=combos"
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          View all →
        </Link>
      </div>

      <div className="combo-slider-track-wrap">
        {/* Prev arrow */}
        {canScroll && !atStart && (
          <button
            onClick={() => scroll("prev")}
            aria-label="Previous combo"
            className="combo-slider-arrow"
            style={{ ...arrowBase, left: -12 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}

        <div ref={trackRef} className="combo-slider-track">
          {combos.map((combo, i) => {
            const displayPrice = combo.discount && parseFloat(combo.discount) > 0
              ? combo.discount
              : combo.price;
            return (
              <Link
                key={combo.id}
                href={`/combo/${combo.slug}`}
                className="combo-card"
                onClick={() => setActiveIndex(i)}
              >
                {/* Image or placeholder */}
                <div className="combo-card-img">
                  {combo.image ? (
                    <img src={combo.image} alt={combo.title} />
                  ) : (
                    <span className="combo-card-img-placeholder">
                      {combo.items.length}
                    </span>
                  )}
                </div>

                <span className="combo-card-count">
                  {combo.items.length} item{combo.items.length !== 1 ? "s" : ""}
                </span>
                <h3 className="combo-card-title">{combo.title}</h3>

                {combo.items.length > 0 && (
                  <ul className="combo-card-items">
                    {combo.items.slice(0, 3).map((item, idx) => (
                      <li key={idx}>{item.name || "Product"} ×{item.quantity}</li>
                    ))}
                    {combo.items.length > 3 && (
                      <li>+{combo.items.length - 3} more</li>
                    )}
                  </ul>
                )}

                <div className="combo-card-footer">
                  <span className="combo-card-price">₹{displayPrice}</span>
                  <span className="combo-card-cta">Get this combo →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Next arrow */}
        {canScroll && !atEnd && (
          <button
            onClick={() => scroll("next")}
            aria-label="Next combo"
            className="combo-slider-arrow"
            style={{ ...arrowBase, right: -12 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="combo-slider-dots">
          {combos.map((_, i) => (
            <button
              key={i}
              className={`combo-dot${i === activeIndex ? " active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Go to combo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
