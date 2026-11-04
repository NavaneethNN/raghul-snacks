"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export type Banner = {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string | null;
  offerText: string | null;
  couponCode: string | null;
  buttonText: string;
  validityText: string | null;
  image: string | null;
  href: string;
  active: boolean;
};

function BannerCard({
  banner,
  onCopyCoupon,
  isCopied,
}: {
  banner: Banner;
  onCopyCoupon: (code: string) => void;
  isCopied: boolean;
}) {
  return (
    <div className="hero-neat-card">
      {/* Top accent badge */}
      {banner.eyebrow && (
        <div className="hero-neat-header">
          <span className="hero-neat-eyebrow">
            <span className="hero-neat-dot" />
            {banner.eyebrow}
          </span>
        </div>
      )}

      {/* Main Title & Subtitle */}
      <div className="hero-neat-body">
        {banner.title && <h3 className="hero-neat-title">{banner.title}</h3>}
        {banner.subtitle && <p className="hero-neat-subtitle">{banner.subtitle}</p>}
      </div>

      {/* Coupon Chip (if couponCode exists) */}
      {banner.couponCode && (
        <button
          type="button"
          onClick={() => onCopyCoupon(banner.couponCode!)}
          className={`hero-neat-coupon ${isCopied ? "copied" : ""}`}
          title="Click to copy coupon code"
        >
          <span className="hero-neat-coupon-label">CODE</span>
          <span className="hero-neat-coupon-code">{banner.couponCode}</span>
          <span className="hero-neat-coupon-action">
            {isCopied ? (
              <span className="hero-neat-copied-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Copied
              </span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </span>
        </button>
      )}

      {/* Action CTA & Validity */}
      <div className="hero-neat-footer">
        <Link href={banner.href || "/shop"} className="hero-neat-cta">
          <span>{banner.buttonText || "Shop Now"}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
        {banner.validityText && (
          <span className="hero-neat-validity">{banner.validityText}</span>
        )}
      </div>
    </div>
  );
}

export function HeroBanner({ initialBanners }: { initialBanners?: Banner[] } = {}) {
  const initialActive = (initialBanners ?? []).filter((b) => b.active);
  const [banners, setBanners] = useState<Banner[]>(initialActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [loading, setLoading] = useState(initialBanners === undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const nextIndexRef = useRef(0);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.banners || []);
        setBanners(arr.filter((b: Banner) => b.active));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  const goTo = useCallback((idx: number, dir: "left" | "right") => {
    if (sliding || idx === currentIndex) return;
    nextIndexRef.current = idx;
    setNextIndex(idx);
    setSlideDir(dir);
    setSliding(true);
    setTimeout(() => {
      setCurrentIndex(idx);
      setSliding(false);
    }, 380);
  }, [sliding, currentIndex]);

  useEffect(() => {
    if (initialBanners === undefined) fetchBanners(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const id = setInterval(() => {
      goTo((currentIndex + 1) % banners.length, "left");
    }, 5500);
    return () => clearInterval(id);
  }, [banners.length, currentIndex, goTo, isPaused]);

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2200);
    } catch {}
  }

  if (loading || banners.length === 0) return null;

  const current = banners[currentIndex];
  const next = banners[nextIndex];

  return (
    <div
      className="hero-neat-track"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <style>{`
        .hero-neat-track {
          position: relative;
          width: 100%;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e7e2d8;
          box-shadow: 0 12px 28px -5px rgba(36, 49, 39, 0.12), 0 3px 8px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          box-sizing: border-box;
        }

        .hero-neat-slides-container {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .hero-neat-slide {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
        }

        .hero-neat-card {
          width: 100%;
          padding: 14px 14px 12px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: linear-gradient(180deg, #ffffff 0%, #faf8f4 100%);
          border-top: 3px solid var(--terracotta, #c95f3b);
        }

        .hero-neat-header {
          margin-bottom: 6px;
        }

        .hero-neat-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font: 700 9.5px 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--terracotta, #c95f3b);
          background: rgba(201, 95, 59, 0.08);
          padding: 3px 8px;
          border-radius: 999px;
        }

        .hero-neat-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--terracotta, #c95f3b);
        }

        .hero-neat-body {
          margin-bottom: 8px;
          width: 100%;
        }

        .hero-neat-title {
          margin: 0 0 3px;
          font-family: var(--font-playfair, Georgia, serif);
          font-size: 15px;
          font-weight: 700;
          color: var(--ink, #243127);
          line-height: 1.25;
          letter-spacing: -0.01em;
        }

        .hero-neat-subtitle {
          margin: 0;
          font-size: 11px;
          color: #6b7280;
          line-height: 1.35;
        }

        .hero-neat-coupon {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px dashed rgba(201, 95, 59, 0.45);
          border-radius: 7px;
          padding: 4px 9px;
          margin-bottom: 9px;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
        }

        .hero-neat-coupon:hover {
          border-color: var(--terracotta, #c95f3b);
          background: #fff8f5;
          transform: translateY(-1px);
        }

        .hero-neat-coupon.copied {
          border-color: #22c55e;
          background: #f0fdf4;
        }

        .hero-neat-coupon-label {
          font: 700 9px 'DM Mono', monospace;
          color: #78716c;
          letter-spacing: 0.05em;
        }

        .hero-neat-coupon-code {
          font: 700 11.5px 'DM Mono', monospace;
          color: var(--terracotta, #c95f3b);
          letter-spacing: 0.05em;
        }

        .hero-neat-coupon-action {
          color: #78716c;
          display: flex;
          align-items: center;
        }

        .hero-neat-copied-text {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font: 700 10.5px 'DM Sans', sans-serif;
          color: #16a34a;
        }

        .hero-neat-footer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .hero-neat-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          background: var(--ink, #243127);
          color: #ffffff !important;
          border-radius: 7px;
          padding: 6px 14px;
          font: 600 11.5px 'DM Sans', sans-serif;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .hero-neat-cta:hover {
          background: var(--terracotta, #c95f3b);
          transform: translateY(-1px);
          color: #ffffff !important;
        }

        .hero-neat-validity {
          font: 500 9px 'DM Mono', monospace;
          color: #a8a29e;
          margin-top: 2px;
        }

        /* Dots pagination */
        .hero-neat-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 0 7px;
          background: #faf8f4;
          border-top: 1px solid #f0ede8;
        }

        .hero-neat-dot-btn {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #d6d3cd;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hero-neat-dot-btn.active {
          width: 16px;
          background: var(--terracotta, #c95f3b);
        }

        @keyframes heroNeatSlideInLeft {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }

        @keyframes heroNeatSlideInRight {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }

        @media (max-width: 860px) {
          .hero-neat-card {
            padding: 16px 18px 14px;
          }
          .hero-neat-title {
            font-size: 16px;
          }
          .hero-neat-subtitle {
            font-size: 12px;
          }
          .hero-neat-cta {
            padding: 7px 16px;
            font-size: 12px;
          }
        }
      `}</style>

      <div className="hero-neat-slides-container">
        {/* Current banner */}
        <div
          className="hero-neat-slide"
          style={{
            transform: sliding
              ? `translateX(${slideDir === "left" ? "-100%" : "100%"})`
              : "translateX(0)",
            transition: sliding ? "transform 0.38s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
        >
          <BannerCard
            banner={current}
            onCopyCoupon={copyCoupon}
            isCopied={copiedCode === current.couponCode}
          />
        </div>

        {/* Incoming banner — only rendered during slide */}
        {sliding && (
          <div
            className="hero-neat-slide"
            style={{
              position: "absolute",
              inset: 0,
              transform: slideDir === "left" ? "translateX(100%)" : "translateX(-100%)",
              animation: `heroNeatSlideIn${slideDir === "left" ? "Left" : "Right"} 0.38s cubic-bezier(0.4,0,0.2,1) forwards`,
            }}
          >
            <BannerCard
              banner={next}
              onCopyCoupon={copyCoupon}
              isCopied={copiedCode === next.couponCode}
            />
          </div>
        )}
      </div>

      {/* Pagination dots if multiple banners */}
      {banners.length > 1 && (
        <div className="hero-neat-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > currentIndex ? "left" : "right")}
              className={`hero-neat-dot-btn ${i === currentIndex ? "active" : ""}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
