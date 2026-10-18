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

function BannerCard({ banner, onCopyCoupon }: { banner: Banner; onCopyCoupon: (code: string) => void }) {
  return (
    <div className="hero-banner-card">
      <div className="hero-banner-pattern" aria-hidden="true">
        <svg className="hero-banner-leaf leaf-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
        <svg className="hero-banner-leaf leaf-2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
        <svg className="hero-banner-leaf leaf-3" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
      </div>
      <div className="hero-banner-content">
        {banner.eyebrow && <p className="hero-banner-eyebrow">{banner.eyebrow}</p>}
        {banner.title && <h3 className="hero-banner-title">{banner.title}</h3>}
        {banner.subtitle && <p className="hero-banner-subtitle">{banner.subtitle}</p>}
        {banner.couponCode && (
          <div className="hero-banner-coupon" onClick={() => onCopyCoupon(banner.couponCode!)} style={{ cursor: "pointer" }}>
            <span className="hero-banner-coupon-text"><strong>{banner.couponCode}</strong></span>
          </div>
        )}
        <Link href={banner.href || "/shop"} className="hero-banner-cta">
          {banner.buttonText || "Shop Now"}
        </Link>
        {banner.validityText && <p className="hero-banner-validity">{banner.validityText}</p>}
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
  const [showToast, setShowToast] = useState(false);
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
    if (sliding) return;
    nextIndexRef.current = idx;
    setNextIndex(idx);
    setSlideDir(dir);
    setSliding(true);
    setTimeout(() => {
      setCurrentIndex(idx);
      setSliding(false);
    }, 400);
  }, [sliding]);

  useEffect(() => {
    if (initialBanners === undefined) fetchBanners(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => goTo((currentIndex + 1) % banners.length, "left"), 5000);
    return () => clearInterval(id);
  }, [banners.length, currentIndex, goTo]);

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {}
  }

  if (loading || banners.length === 0) return null;

  const current = banners[currentIndex];
  const next = banners[nextIndex];

  return (
    <>
      <div className="hero-banner-track">
        {/* Current banner */}
        <div
          className="hero-banner-slide"
          style={{
            transform: sliding
              ? `translateX(${slideDir === "left" ? "-100%" : "100%"})`
              : "translateX(0)",
            transition: sliding ? "transform 0.4s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
        >
          <BannerCard banner={current} onCopyCoupon={copyCoupon} />
        </div>

        {/* Incoming banner — only rendered during slide */}
        {sliding && (
          <div
            className="hero-banner-slide hero-banner-slide-incoming"
            style={{
              position: "absolute",
              inset: 0,
              transform: slideDir === "left" ? "translateX(100%)" : "translateX(-100%)",
              animation: `heroBannerSlideIn${slideDir === "left" ? "Left" : "Right"} 0.4s cubic-bezier(0.4,0,0.2,1) forwards`,
            }}
          >
            <BannerCard banner={next} onCopyCoupon={copyCoupon} />
          </div>
        )}

        {/* No dot indicators — banner fills the full hero image area */}
      </div>

      {showToast && (
        <div className="toast visible">Code copied!</div>
      )}
    </>
  );
}
