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
        .hero-trust-chip .chip-sub,
        .hero-trust-chip .chip-icon-box {
          display: none;
        }
        .hero-trust-chip .chip-text-wrap {
          display: inline;
        }
        .hero-mobile-categories {
          display: none;
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
            padding: 26px 16px 30px;
            background: radial-gradient(ellipse at 50% 0%, rgba(229, 165, 47, 0.16) 0%, transparent 60%),
                        radial-gradient(ellipse at 85% 90%, rgba(201, 95, 59, 0.08) 0%, transparent 50%),
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
            margin: 0 auto 12px;
            font: 700 10.5px 'DM Mono', monospace;
            padding: 5px 13px;
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
            font: 700 clamp(29px, 8.4vw, 36px) / 1.15 'Playfair Display', serif;
            letter-spacing: -0.03em;
            margin: 0 auto 10px;
            text-align: center;
            max-width: 380px;
            color: var(--ink);
          }

          /* 3. Short Punchy Description */
          .hero-description {
            order: 3;
            font-size: 13.5px;
            line-height: 1.55;
            color: #525a50;
            margin: 0 auto 18px;
            text-align: center;
            max-width: 360px;
          }

          /* 4. Active Promo Offer Banner (if present) */
          .hero-visual-wrapper {
            order: 4;
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          /* Hide hero image frame & badges completely on mobile */
          .hero-image-frame,
          .hero-badge-artisan,
          .hero-badge-pure {
            display: none !important;
          }

          /* On mobile, promo banner sits cleanly as an offer ticket card */
          .hero-banner-wrapper {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            width: 100% !important;
            max-width: 420px !important;
            margin: 0 auto 18px !important;
            z-index: 5 !important;
          }

          /* 5. Action Buttons: Touch-friendly full-width CTAs */
          .hero-cta-row {
            order: 5;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 20px;
          }

          .hero-btn-primary {
            width: 100%;
            padding: 14px 20px;
            font-size: 15px;
            font-weight: 700;
            text-align: center;
            justify-content: center;
            border-radius: 12px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #c95f3b 0%, #b34a26 100%);
            border: none;
            box-shadow: 0 4px 16px rgba(201, 95, 59, 0.3);
          }

          .hero-btn-secondary {
            width: 100%;
            padding: 12.5px 20px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            border-radius: 12px;
            box-sizing: border-box;
            background: #ffffff;
            border: 1.5px solid rgba(201, 95, 59, 0.28);
            color: var(--ink);
          }

          /* 6. Bento Value Pillars: 2x2 grid */
          .hero-trust-chips {
            order: 6;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto 18px;
          }

          .hero-trust-chip {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 12px 8px;
            border-radius: 12px;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.07);
            box-shadow: 0 2px 8px -2px rgba(36, 49, 39, 0.05);
            width: 100%;
            box-sizing: border-box;
          }

          .hero-trust-chip .desktop-icon {
            display: none !important;
          }

          .hero-trust-chip .chip-icon-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(201, 95, 59, 0.09);
            color: var(--terracotta);
            font-size: 15px;
            margin-bottom: 6px;
          }

          .hero-trust-chip .chip-title {
            font-size: 12.5px;
            font-weight: 700;
            color: var(--ink);
            line-height: 1.25;
          }

          .hero-trust-chip .chip-sub {
            display: block;
            font-size: 10.5px;
            font-weight: 500;
            color: #6b7280;
            line-height: 1.25;
            margin-top: 2px;
          }

          /* 7. Quick Category Jump Bar */
          .hero-mobile-categories {
            order: 7;
            display: flex;
            align-items: center;
            gap: 7px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 4px 2px;
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
            scrollbar-width: none;
          }
          .hero-mobile-categories::-webkit-scrollbar {
            display: none;
          }

          .hero-cat-tag {
            font: 700 10px 'DM Mono', monospace;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #8c9388;
            flex-shrink: 0;
            margin-right: 2px;
          }

          .hero-cat-pill {
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
            flex-shrink: 0;
            font-size: 11.5px;
            font-weight: 600;
            color: #4b5563;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 999px;
            padding: 5px 11px;
            text-decoration: none;
            transition: all 0.2s ease;
          }

          .hero-cat-pill.highlight {
            background: rgba(201, 95, 59, 0.09);
            border-color: rgba(201, 95, 59, 0.25);
            color: var(--terracotta);
            font-weight: 700;
          }
        }

        /* Ultra small screens (≤380px) */
        @media (max-width: 380px) {
          .hero-custom {
            padding: 20px 12px 24px;
          }

          .hero-heading {
            font-size: 26px;
          }

          .hero-description {
            font-size: 12.5px;
          }

          .hero-trust-chips {
            gap: 8px;
          }

          .hero-trust-chip {
            padding: 10px 6px;
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
              <svg className="desktop-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="chip-icon-box">🌾</span>
              <span className="chip-text-wrap">
                <span className="chip-title">Millet Laddus</span>
                <span className="chip-sub">Heirloom Recipes</span>
              </span>
            </span>

            <span className="hero-trust-chip">
              <svg className="desktop-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="chip-icon-box">🫓</span>
              <span className="chip-text-wrap">
                <span className="chip-title">Traditional Snacks</span>
                <span className="chip-sub">Pure Cold-Pressed</span>
              </span>
            </span>

            <span className="hero-trust-chip">
              <svg className="desktop-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="chip-icon-box">🌿</span>
              <span className="chip-text-wrap">
                <span className="chip-title">Everyday Podis</span>
                <span className="chip-sub">Stone-Ground Fresh</span>
              </span>
            </span>

            <span className="hero-trust-chip">
              <svg className="desktop-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="chip-icon-box">🚚</span>
              <span className="chip-text-wrap">
                <span className="chip-title">Shipped Fresh</span>
                <span className="chip-sub">Pan-India Delivery</span>
              </span>
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
                  srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                />
                <source srcSet="/hero.webp" type="image/webp" />
                <img
                  src="/hero.png"
                  alt="Handcrafted millet laddus, traditional snacks, and authentic podi varieties from Raghul Delights"
                  className="hero-main-photo"
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
