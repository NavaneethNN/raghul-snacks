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
            padding: 22px 16px 28px;
            background: radial-gradient(circle at 50% 0%, rgba(229, 165, 47, 0.12) 0%, transparent 65%),
                        radial-gradient(circle at 85% 90%, rgba(201, 95, 59, 0.08) 0%, transparent 50%),
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

          /* Flatten columns on mobile so elements can be ordered perfectly */
          .hero-text-col,
          .hero-visual-col {
            display: contents;
          }

          /* 1. Category Eyebrow Pill */
          .hero-eyebrow-pill {
            order: 1;
            margin: 0 auto 10px;
            font-size: 10px;
            padding: 4px 11px;
            letter-spacing: 0.1em;
          }

          /* 2. Headline */
          .hero-heading {
            order: 2;
            font-size: clamp(27px, 7.8vw, 34px);
            line-height: 1.15;
            letter-spacing: -0.03em;
            margin: 0 auto 8px;
            text-align: center;
            max-width: 360px;
          }

          /* 3. Short Punchy Description */
          .hero-description {
            order: 3;
            font-size: 13.5px;
            line-height: 1.5;
            color: #525a50;
            margin: 0 auto 16px;
            text-align: center;
            max-width: 360px;
          }

          /* 4. Showcase Card (Hero Image + Docked Offer Banner) */
          .hero-visual-wrapper {
            order: 4;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .hero-image-frame {
            width: 100%;
            max-width: 100%;
            aspect-ratio: 16 / 10;
            border-radius: 16px;
            border: 1.5px solid var(--line);
            box-shadow: 0 10px 26px -6px rgba(36, 49, 39, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            position: relative;
          }

          /* Show artisanal badge neatly at bottom-left of the image */
          .hero-badge-artisan {
            display: inline-flex !important;
            position: absolute;
            bottom: 10px;
            left: 10px;
            top: auto;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(0, 0, 0, 0.08);
            padding: 4px 10px;
            border-radius: 999px;
            font: 600 9.5px 'DM Mono', monospace;
            color: var(--ink);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
            z-index: 2;
          }

          .hero-badge-pure {
            display: none;
          }

          /* On mobile, promo banner sits cleanly as a full-width offer card below the image */
          .hero-banner-wrapper {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            width: 100% !important;
            max-width: 420px !important;
            margin-top: 12px !important;
            z-index: 5 !important;
          }

          /* 5. Trust Chips: 2x2 grid */
          .hero-trust-chips {
            order: 5;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 16px;
          }

          .hero-trust-chip {
            justify-content: center;
            text-align: center;
            font-size: 11.5px;
            font-weight: 600;
            padding: 7px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(201, 95, 59, 0.16);
            color: #374151;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .hero-trust-chip svg {
            width: 13px;
            height: 13px;
          }

          /* 6. Action Buttons: Clean stacked CTAs */
          .hero-cta-row {
            order: 6;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
          }

          .hero-btn-primary {
            width: 100%;
            padding: 13px 18px;
            font-size: 14.5px;
            font-weight: 700;
            text-align: center;
            justify-content: center;
            border-radius: 10px;
            box-sizing: border-box;
            box-shadow: 0 4px 14px rgba(201, 95, 59, 0.28);
          }

          .hero-btn-secondary {
            width: 100%;
            padding: 12px 18px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            border-radius: 10px;
            box-sizing: border-box;
            background: #fff;
          }
        }

        /* Small screens (≤380px) */
        @media (max-width: 380px) {
          .hero-custom {
            padding: 18px 12px 24px;
          }

          .hero-heading {
            font-size: 25px;
          }

          .hero-description {
            font-size: 12.5px;
          }

          .hero-trust-chips {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .hero-trust-chip {
            justify-content: flex-start;
            padding: 6px 10px;
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
              Millet Laddus
            </span>
            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Traditional Snacks
            </span>
            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Everyday Podi Varieties
            </span>
            <span className="hero-trust-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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
        </div>

        {/* Right Showcase Column */}
        <div className="hero-visual-col">
          <div className="hero-visual-wrapper">
            <div className="hero-image-frame">
              <img
                src="/hero.png"
                alt="Handcrafted millet laddus, traditional snacks, and authentic podi varieties from Raghul Delights"
                className="hero-main-photo"
              />
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
