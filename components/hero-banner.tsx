"use client";

import { useState, useEffect } from "react";
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

export function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000); // Rotate every 5 seconds
      return () => clearInterval(interval);
    }
  }, [banners]);

  async function fetchBanners() {
    try {
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json();
        const activeBanners = data.banners?.filter((b: Banner) => b.active) || [];
        setBanners(activeBanners);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || banners.length === 0) {
    return null;
  }

  const banner = banners[currentIndex];

  return (
    <div className="hero-banner">
      <div className="hero-banner-pattern">
        <span className="hero-banner-gift">🎁</span>
        <span className="hero-banner-leaf leaf-1">🍃</span>
        <span className="hero-banner-leaf leaf-2">🍂</span>
        <span className="hero-banner-leaf leaf-3">🌿</span>
      </div>

      <div className="hero-banner-content">
        {banner.eyebrow && (
          <p className="hero-banner-eyebrow">{banner.eyebrow}</p>
        )}

        {banner.title && (
          <h3 className="hero-banner-title">{banner.title}</h3>
        )}

        {banner.subtitle && (
          <p className="hero-banner-subtitle">{banner.subtitle}</p>
        )}

        {banner.couponCode && (
          <div className="hero-banner-coupon">
            <span className="hero-banner-coupon-text">
              {banner.offerText || `Use Code:`}{" "}
              <strong>{banner.couponCode}</strong>
            </span>
          </div>
        )}

        <Link href={banner.href || "/shop"} className="hero-banner-cta">
          {banner.buttonText || "Shop Now"}
        </Link>

        {banner.validityText && (
          <p className="hero-banner-validity">{banner.validityText}</p>
        )}

        {banners.length > 1 && (
          <div className="hero-banner-dots">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`hero-banner-dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
