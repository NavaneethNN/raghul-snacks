"use client";

import Link from "next/link";
import { HeroBanner, Banner } from "./hero-banner";

export function HeroSection({ banners = [] }: { banners?: Banner[] }) {
  return (
    <section className="hero-custom">
      <style>{`
        .hero-custom {
          background: radial-gradient(circle at 15% 25%, rgba(229, 165, 47, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 85% 75%, rgba(201, 95, 59, 0.08) 0%, transparent 50%),
                      #fcfaf6;
          border-bottom: 1px solid var(--line);
          position: relative;
          overflow: hidden;
          padding: 56px 24px 52px;
        }

        .hero-custom::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(36, 49, 39, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .hero-container {
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        /* ── Left Content ── */
        .hero-text-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 600 11px 'DM Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terracotta);
          background: rgba(201, 95, 59, 0.09);
          border: 1px solid rgba(201, 95, 59, 0.22);
          padding: 6px 12px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .hero-eyebrow-pill .sparkle {
          font-size: 10px;
        }

        .hero-heading {
          font: 700 clamp(32px, 4.4vw, 52px) 'Playfair Display', serif;
          color: var(--ink);
          letter-spacing: -0.035em;
          line-height: 1.12;
          margin: 0 0 16px;
        }
        .hero-heading .serif-accent {
          color: var(--terracotta);
          font-style: italic;
          font-weight: 600;
        }

        .hero-description {
          font-size: clamp(15px, 1.6vw, 17px);
          line-height: 1.65;
          color: #4b5563;
          margin: 0 0 24px;
          max-width: 580px;
        }

        /* Trust Points */
        .hero-trust-points {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 18px;
          margin-bottom: 28px;
        }
        .hero-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        .hero-trust-item svg {
          color: var(--terracotta);
          flex-shrink: 0;
        }

        /* Action Buttons */
        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 28px;
          width: 100%;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--terracotta);
          color: #fff;
          border: 2px solid var(--terracotta);
          border-radius: 10px;
          padding: 14px 26px;
          font: 700 15px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.22s ease;
          text-decoration: none;
          box-shadow: 0 6px 18px rgba(201, 95, 59, 0.28);
        }
        .hero-btn-primary:hover {
          background: #b54a27;
          border-color: #b54a27;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201, 95, 59, 0.35);
        }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fff;
          color: var(--ink);
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 14px 22px;
          font: 600 15px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.22s ease;
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          border-color: var(--terracotta);
          color: var(--terracotta);
          background: #faf8f5;
          transform: translateY(-2px);
        }

        /* Social proof review snippet */
        .hero-social-proof {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
          width: 100%;
          max-width: 520px;
        }
        .hero-stars {
          display: flex;
          gap: 3px;
          color: #f59e0b;
          font-size: 15px;
          line-height: 1;
        }
        .hero-proof-text {
          font-size: 13px;
          color: #4b5563;
        }
        .hero-proof-text strong {
          color: var(--ink);
        }

        /* ── Right Showcase Column ── */
        .hero-visual-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .hero-image-frame {
          position: relative;
          width: 100%;
          max-width: 500px;
          aspect-ratio: 4/3;
          border-radius: 24px;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid var(--line);
          box-shadow: 0 24px 52px -12px rgba(36, 49, 39, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .hero-main-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .hero-image-frame:hover .hero-main-photo {
          transform: scale(1.03);
        }

        /* Floating badges on photo */
        .hero-badge-artisan {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 6px 14px;
          border-radius: 999px;
          font: 600 11px 'DM Mono', monospace;
          color: var(--ink);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hero-badge-artisan .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16a34a;
        }

        .hero-badge-pure {
          position: absolute;
          bottom: 16px;
          right: 16px;
          background: rgba(36, 49, 39, 0.88);
          backdrop-filter: blur(8px);
          color: #ffe2ab;
          padding: 6px 14px;
          border-radius: 999px;
          font: 700 12px 'DM Sans', sans-serif;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* Hero banner placement */
        .hero-banner-wrapper {
          width: 100%;
          max-width: 480px;
          margin-top: 14px;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .hero-custom {
            padding: 40px 20px 44px;
          }
          .hero-container {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .hero-visual-col {
            order: -1;
          }
          .hero-image-frame {
            max-width: 460px;
          }
        }

        @media (max-width: 640px) {
          .hero-custom {
            padding: 28px 16px 36px;
          }
          .hero-cta-row {
            flex-direction: column;
            width: 100%;
          }
          .hero-btn-primary, .hero-btn-secondary {
            width: 100%;
          }
          .hero-trust-points {
            flex-direction: column;
            gap: 8px;
          }
          .hero-social-proof {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
      `}</style>

      <div className="hero-container">
        {/* Left Story & Actions */}
        <div className="hero-text-col">
          <div className="hero-eyebrow-pill">
            <span className="sparkle">✦</span> Authentic South Indian Snacks
          </div>

          <h1 className="hero-heading">
            Snacks made the <span className="serif-accent">real way</span>. No shortcuts.
          </h1>

          <p className="hero-description">
            Wholesome millet snacks, authentic stone-ground podis, and crispy traditional treats.
            Crafted in small batches using pure cold-pressed groundnut and sesame oils with zero artificial preservatives.
          </p>

          <div className="hero-trust-points">
            <span className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              100% Cold-Pressed Oils
            </span>
            <span className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Small-Batch Fresh Daily
            </span>
            <span className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Shipped Fresh Across India
            </span>
          </div>

          <div className="hero-cta-row">
            <Link href="/shop" className="hero-btn-primary">
              Shop Fresh Snacks →
            </Link>
            <Link href="/shop?tab=combos" className="hero-btn-secondary">
              Curated Gift Combos
            </Link>
          </div>

          <div className="hero-social-proof">
            <div className="hero-stars" aria-label="5 stars rating">
              ★★★★★
            </div>
            <span className="hero-proof-text">
              <strong>4.9 / 5</strong> · Loved by 1,800+ families across India
            </span>
          </div>
        </div>

        {/* Right Showcase Column */}
        <div className="hero-visual-col">
          <div className="hero-image-frame">
            <img
              src="/hero.png"
              alt="Authentic traditional South Indian snacks, podis, and laddus from Raghul Delights"
              className="hero-main-photo"
            />
            <div className="hero-badge-artisan">
              <span className="dot" />
              <span>Fresh Batch Roasted</span>
            </div>
            <div className="hero-badge-pure">
              <span>Pure Traditional Recipe</span>
            </div>
          </div>

          {/* Active Promo Banner if available */}
          {banners && banners.length > 0 && (
            <div className="hero-banner-wrapper">
              <HeroBanner initialBanners={banners} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
