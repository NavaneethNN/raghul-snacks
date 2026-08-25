"use client";

import { useRef } from "react";
import { ProductCard } from "@/components/product/product-card";

export function BestsellersSlider({ products }: { products: any[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "prev" | "next") {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.querySelector<HTMLElement>(".product-card")?.offsetWidth ?? 200;
    const gap = 20;
    const amount = (cardWidth + gap) * 2;
    track.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Prev arrow */}
      <button
        onClick={() => scroll("prev")}
        aria-label="Previous"
        style={{
          position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)",
          zIndex: 2, width: 40, height: 40, borderRadius: "50%",
          background: "var(--paper)", border: "1.5px solid var(--line)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.color = "var(--terracotta)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "inherit"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: 20,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 8,
          /* hide scrollbar */
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="bestsellers-track"
      >
        <style>{`.bestsellers-track::-webkit-scrollbar{display:none}`}</style>
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
      <button
        onClick={() => scroll("next")}
        aria-label="Next"
        style={{
          position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)",
          zIndex: 2, width: 40, height: 40, borderRadius: "50%",
          background: "var(--paper)", border: "1.5px solid var(--line)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.color = "var(--terracotta)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "inherit"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  );
}
