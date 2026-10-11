"use client";

import { useRef, useState, useEffect } from "react";
import { ProductCard } from "@/components/product/product-card";

export function BestsellersSlider({ products }: { products: any[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateState() {
    const track = trackRef.current;
    if (!track) return;
    const scrollable = track.scrollWidth > track.clientWidth;
    setCanScroll(scrollable);
    setAtStart(track.scrollLeft <= 0);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateState();

    const ro = new ResizeObserver(() => updateState());
    ro.observe(track);

    track.addEventListener("scroll", updateState);

    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", updateState);
    };
  }, []);

  function scroll(direction: "prev" | "next") {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.querySelector<HTMLElement>(".product-card")?.offsetWidth ?? 200;
    const gap = 20;
    const amount = (cardWidth + gap) * 2;
    track.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  }

  const arrowBase: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.95)",
    border: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
  };

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .bestsellers-track::-webkit-scrollbar { display: none }
        .slider-arrow:hover {
          background: #fff !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
          transform: translateY(-50%) scale(1.05) !important;
        }
        .slider-arrow:active {
          transform: translateY(-50%) scale(0.97) !important;
        }
      `}</style>

      {/* Prev arrow */}
      {canScroll && !atStart && (
        <button
          onClick={() => scroll("prev")}
          aria-label="Previous"
          className="slider-arrow"
          style={{ ...arrowBase, left: -20 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      )}

      {/* Scrollable track */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: 20,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 8,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="bestsellers-track"
      >
        {products.map((product: any) => (
          <div
            key={product.id}
            style={{
              flex: "0 0 clamp(220px, 45vw, 280px)",
              scrollSnapAlign: "start",
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Next arrow */}
      {canScroll && !atEnd && (
        <button
          onClick={() => scroll("next")}
          aria-label="Next"
          className="slider-arrow"
          style={{ ...arrowBase, right: -20 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}
    </div>
  );
}
