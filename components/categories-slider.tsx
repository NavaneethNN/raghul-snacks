"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

export type Category = {
  id?: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
};

export function CategoriesSlider({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateState() {
    const track = trackRef.current;
    if (!track) return;
    const scrollable = track.scrollWidth > track.clientWidth + 2;
    setCanScroll(scrollable);
    setAtStart(track.scrollLeft <= 5);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 5);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateState();

    const ro = new ResizeObserver(() => updateState());
    ro.observe(track);
    track.addEventListener("scroll", updateState, { passive: true });

    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", updateState);
    };
  }, [categories]);

  function scroll(direction: "prev" | "next") {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".category-card");
    const amount = card ? card.offsetWidth + 16 : 300;
    track.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  }

  return (
    <div className="categories-slider-wrapper">
      <style>{`
        .categories-slider-wrapper {
          position: relative;
          width: 100%;
        }

        .categories-slider-track {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 6px 2px 14px;
        }

        .categories-slider-track::-webkit-scrollbar {
          display: none;
        }

        /* Keep card sizes in single row — never wrap */
        .categories-slider-track .category-card {
          flex: 0 0 300px;
          width: 300px;
          min-height: 250px;
          scroll-snap-align: start;
        }

        @media (max-width: 900px) {
          .categories-slider-track .category-card {
            flex: 0 0 280px;
            width: 280px;
            min-height: 220px;
          }
        }

        @media (max-width: 640px) {
          .categories-slider-track .category-card {
            flex: 0 0 82vw;
            max-width: 320px;
            min-width: 260px;
            min-height: 200px;
          }
        }

        /* Slider navigation arrows */
        .categories-slider-wrapper .slider-arrow {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid var(--line);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          color: var(--ink);
          transition: all 0.2s ease;
        }

        .categories-slider-wrapper .slider-arrow:hover {
          background: #fff;
          color: var(--terracotta);
          border-color: var(--terracotta);
          transform: translateY(-50%) scale(1.06);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
        }

        .categories-slider-wrapper .slider-arrow-prev {
          left: -18px;
        }

        .categories-slider-wrapper .slider-arrow-next {
          right: -18px;
        }

        @media (max-width: 768px) {
          .categories-slider-wrapper .slider-arrow {
            display: none;
          }
        }
      `}</style>

      {/* Prev arrow */}
      {canScroll && !atStart && (
        <button
          type="button"
          onClick={() => scroll("prev")}
          aria-label="Previous categories"
          className="slider-arrow slider-arrow-prev"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {canScroll && !atEnd && (
        <button
          type="button"
          onClick={() => scroll("next")}
          aria-label="Next categories"
          className="slider-arrow slider-arrow-next"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}

      {/* Single-row slider track */}
      <div ref={trackRef} className="categories-slider-track">
        {categories.map((category, index) => (
          <Link
            href={`/shop/${category.slug}`}
            className={`category-card card-${index}`}
            key={category.slug}
            style={{
              backgroundImage: category.image
                ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.45)), url(${category.image})`
                : "linear-gradient(135deg, #243127 0%, #1a221b 60%, #a23c1c 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="category-mark">0{index + 1}</span>
            <h3>{category.name}</h3>
            <p>{category.description || "Handcrafted traditional recipe"}</p>
            <b>Explore →</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
