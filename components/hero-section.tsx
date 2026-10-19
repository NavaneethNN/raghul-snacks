"use client";

import Link from "next/link";
import { HeroBanner, Banner } from "./hero-banner";

export function HeroSection({ banners = [] }: { banners?: Banner[] }) {
  return (
    <section className="hero-custom">
      <style>{`
        .hero-custom {
          background: radial-gradient(circle at 12% 20%, rgba(229, 165, 47, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 88% 80%, rgba(201, 95, 59, 0.08) 0%, transparent 45%),
                      #fcfaf6;
          border-bottom: 1px solid var(--line);
          position: relative;
          overflow: hidden;
          padding: 44px 20px 48px;
        }

        .hero-custom::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(36, 49, 39, 0.035) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .hero-container {
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 40px;
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
          gap: 6px;
          font: 600 11px 'DM Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terracotta);
          background: rgba(201, 95, 59, 0.09);
          border: 1px solid rgba(201, 95, 59, 0.2);
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 14px;
        }
        .hero-eyebrow-pill .sparkle {
          font-size: 10px;
        }

        .hero-heading {
          font: 700 clamp(30px, 4.2vw, 50px) 'Playfair Display', serif;
          color: var(--ink);
          letter-spacing: -0.03em;
          line-height: 1.12;
          margin: 0 0 14px;
        }
        .hero-heading .serif-accent {
          color: var(--terracotta);
          font-style: italic;
          font-weight: 600;
        }

        .hero-description {
          font-size: clamp(14px, 1.5vw, 16px);
          line-height: 1.6;
          color: #4b5563;
          margin: 0 0 20px;
          max-width: 540px;
        }

        /* Trust Chips */
        .hero-trust-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin-bottom: 24px;
        }
        .hero-trust-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.07);
          padding: 5px 11px;
          border-radius: 8px;
        }
        .hero-trust-chip svg {
          color: var(--terracotta);
          flex-shrink: 0;
        }

        /* Action Buttons */
        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
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
          padding: 13px 24px;
          font: 700 14.5px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(201, 95, 59, 0.25);
        }
        .hero-btn-primary:hover {
          background: #b54a27;
          border-color: #b54a27;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(201, 95, 59, 0.32);
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
          padding: 13px 20px;
          font: 600 14.5px 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          border-color: var(--terracotta);
          color: var(--terracotta);
          background: #faf8f5;
          transform: translateY(-2px);
        }

        /* ── Right Showcase Column ── */
        .hero-visual-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .hero-visual-wrapper {
          position: relative;
          width: 100%;
          max-width: 480px;
        }

        .hero-image-frame {
          position: relative;
          width: 100%;
          max-width: 480px;
          aspect-ratio: 4/3;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid var(--line);
          box-shadow: 0 20px 40px -10px rgba(36, 49, 39, 0.12), 0 3px 10px rgba(0, 0, 0, 0.04);
        }

        .hero-main-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }
        .hero-image-frame:hover .hero-main-photo {
          transform: scale(1.02);
        }

        /* Floating badges on photo (desktop only) */
        .hero-badge-artisan {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 5px 12px;
          border-radius: 999px;
          font: 600 10.5px 'DM Mono', monospace;
          color: var(--ink);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 2;
        }
        .hero-badge-artisan .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16a34a;
        }

        .hero-badge-pure {
          position: absolute;
          bottom: 14px;
          right: 14px;
          background: rgba(36, 49, 39, 0.88);
          backdrop-filter: blur(8px);
          color: #ffe2ab;
          padding: 5px 12px;
          border-radius: 999px;
          font: 700 11.5px 'DM Sans', sans-serif;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          z-index: 2;
        }

        /* Hero banner placement: compact card on top-right of hero image */
        .hero-banner-wrapper {
          position: absolute;
          top: -20px;
          right: -12px;
          width: 215px;
          z-index: 10;
        }

        /* ── Mobile-Only Hero Redesign (≤860px) ── */
        @media (max-width: 860px) {
          .hero-custom {
            padding: 24px 16px 28px;
            background: radial-gradient(ellipse at 50% 0%, rgba(229, 165, 47, 0.18) 0%, transparent 65%),
                        radial-gradient(ellipse at 85% 95%, rgba(201, 95, 59, 0.08) 0%, transparent 50%),
                        #fcfaf6;
          }

          .hero-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0;
            max-width: 440px;
            margin: 0 auto;
          }

          /* Flatten columns on mobile so elements can be ordered purposefully */
          .hero-text-col,
          .hero-visual-col {
            display: contents;
          }

          /* 1. Category Eyebrow Pill */
          .hero-eyebrow-pill {
            order: 1;
            margin: 0 auto 10px;
            font: 700 10.5px 'DM Mono', monospace;
            padding: 4px 12px;
            letter-spacing: 0.12em;
            background: rgba(201, 95, 59, 0.08);
            border: 1px solid rgba(201, 95, 59, 0.22);
            color: var(--terracotta);
            border-radius: 999px;
            box-shadow: 0 2px 6px rgba(201, 95, 59, 0.06);
          }

          /* 2. Headline */
          .hero-heading {
            order: 2;
            font: 700 clamp(28px, 8.2vw, 35px) / 1.15 'Playfair Display', serif;
            letter-spacing: -0.03em;
            margin: 0 auto 8px;
            text-align: center;
            max-width: 380px;
            color: var(--ink);
          }

          /* 3. Short Punchy Description */
          .hero-description {
            order: 3;
            font-size: 13.5px;
            line-height: 1.5;
            color: #525a50;
            margin: 0 auto 14px;
            text-align: center;
            max-width: 360px;
          }

          /* 4. Compact Horizontal Scrolling Trust Badges */
          .hero-trust-chips {
            order: 4;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 2px 4px 12px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 4px;
            scrollbar-width: none;
            justify-content: flex-start;
          }

          .hero-trust-chips::-webkit-scrollbar {
            display: none;
          }

          .hero-trust-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #ffffff !important;
            border: 1px solid rgba(201, 95, 59, 0.18) !important;
            box-shadow: 0 2px 6px -1px rgba(36, 49, 39, 0.06) !important;
            padding: 6px 12px !important;
            border-radius: 999px !important;
            font-size: 11.5px;
            font-weight: 600;
            color: #374151;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .hero-trust-chip svg {
            color: var(--terracotta);
            flex-shrink: 0;
            width: 13px;
            height: 13px;
          }

          /* 5. Mobile Snack Visual Showcase & Promo Banner */
          .hero-visual-wrapper {
            order: 5;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
          }

          .hero-image-frame {
            display: block !important;
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 10;
            border-radius: 16px;
            overflow: hidden;
            background: #fdfbf7;
            border: 2px solid #ffffff;
            box-shadow: 0 10px 26px -6px rgba(36, 49, 39, 0.14), 0 3px 10px rgba(0, 0, 0, 0.05);
          }

          .hero-main-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          /* Floating badge: Fresh Batch (top-left) */
          .hero-badge-artisan {
            display: flex !important;
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(0, 0, 0, 0.08);
            padding: 4.5px 10px;
            border-radius: 999px;
            font: 700 10px 'DM Mono', monospace;
            color: var(--ink);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            align-items: center;
            gap: 5px;
            z-index: 2;
          }

          .hero-badge-artisan .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #16a34a;
            box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
          }

          /* Floating badge: Pure Cold-Pressed (bottom-right) */
          .hero-badge-pure {
            display: block !important;
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(36, 49, 39, 0.88);
            backdrop-filter: blur(8px);
            color: #ffe2ab;
            padding: 5px 11px;
            border-radius: 999px;
            font: 700 11px 'DM Sans', sans-serif;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 2;
          }

          /* Promo banner sits cleanly below visual card */
          .hero-banner-wrapper {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            width: 100% !important;
            max-width: 420px !important;
            margin: 12px auto 0 !important;
            z-index: 5 !important;
          }

          /* 6. Action Buttons: Touch-friendly side-by-side CTAs */
          .hero-cta-row {
            order: 6;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
          }

          .hero-btn-primary {
            width: 100%;
            padding: 13px 10px;
            font-size: 13.5px;
            font-weight: 700;
            text-align: center;
            justify-content: center;
            border-radius: 12px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #c95f3b 0%, #b34a26 100%);
            color: #ffffff;
            border: none;
            box-shadow: 0 4px 14px rgba(201, 95, 59, 0.32);
            text-decoration: none;
            white-space: nowrap;
          }

          .hero-btn-secondary {
            width: 100%;
            padding: 12px 10px;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            border-radius: 12px;
            box-sizing: border-box;
            background: #ffffff;
            border: 1.5px solid rgba(201, 95, 59, 0.28);
            color: var(--ink);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
            text-decoration: none;
            white-space: nowrap;
          }
        }

        /* Ultra small screens (≤380px) */
        @media (max-width: 380px) {
          .hero-custom {
            padding: 18px 12px 24px;
          }

          .hero-heading {
            font-size: 26px;
          }

          .hero-description {
            font-size: 12.5px;
          }

          .hero-image-frame {
            border-radius: 14px;
          }

          .hero-btn-primary {
            font-size: 12.5px;
            padding: 12px 6px;
          }

          .hero-btn-secondary {
            font-size: 12px;
            padding: 11px 6px;
          }
        }
      `}</style>

      <div className="hero-container">
        {/* Left Story & Actions */}
        <div className="hero-text-col">
          <div className="hero-eyebrow-pill">
            <span className="sparkle">✦</span> Handcrafted South Indian Delights
          </div>

          <h1 className="hero-heading">
            Snacks made the <span className="serif-accent">real way</span>.
          </h1>

          <p className="hero-description">
            Wholesome millet laddus, authentic crispy traditional savouries, and everyday stone-ground podi varieties. Made fresh in small batches with heirloom family recipes.
          </p>

          <div className="hero-trust-chips">
            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Millet Laddus</span>
            </span>

            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Traditional Snacks</span>
            </span>

            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Everyday Podi Varieties</span>
            </span>

            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Shipped Fresh Across India</span>
            </span>
          </div>

          <div className="hero-cta-row">
            <Link href="/shop" className="hero-btn-primary">
              Shop Fresh Snacks →
            </Link>
            <Link href="/#bestsellers" className="hero-btn-secondary">
              Explore Bestsellers →
            </Link>
          </div>
        </div>

        {/* Right Showcase Column */}
        <div className="hero-visual-col">
          <div className="hero-visual-wrapper">
            <div className="hero-image-frame">
              <picture>
                <source
                  media="(max-width: 860px)"
                  srcSet="/hero-mobile.webp"
                  type="image/webp"
                />
                <source srcSet="/hero.webp" type="image/webp" />
                <img
                  src="/hero.png"
                  alt="Handcrafted millet laddus, traditional snacks, and authentic podi varieties from Raghul Delights"
                  className="hero-main-photo"
                  fetchPriority="high"
                />
              </picture>
              <div className="hero-badge-artisan">
                <span className="dot" />
                <span>Fresh Batch Handcrafted</span>
              </div>
              <div className="hero-badge-pure">
                <span>Authentic Traditional Recipe</span>
              </div>
            </div>

            {/* Active Promo Banner floating top-right of image */}
            {banners && banners.length > 0 && (
              <div className="hero-banner-wrapper">
                <HeroBanner initialBanners={banners} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
