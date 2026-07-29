import Link from "next/link";
import { getDb } from "@/lib/db";
import { banners } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

async function getActiveBanners() {
  try {
    const db = getDb();
    const result = await db
      .select()
      .from(banners)
      .where(eq(banners.active, true))
      .orderBy(desc(banners.createdAt));
    return result;
  } catch (error) {
    console.error("Error fetching banners:", error);
    // Return empty array on error to prevent page crash
    // This handles case where banners table doesn't exist yet
    return [];
  }
}

function BannerCard({ banner }: { banner: Banner }) {
  return (
    <div className="banner-card">
      <div className="banner-card-pattern">
        <span className="banner-gift">🎁</span>
        <span className="banner-leaf leaf-1">🍃</span>
        <span className="banner-leaf leaf-2">🍂</span>
        <span className="banner-leaf leaf-3">🌿</span>
        <span className="banner-leaf leaf-4">🍁</span>
        <span className="banner-leaf leaf-5">🌾</span>
      </div>

      <div className="banner-card-content">
        {banner.eyebrow && (
          <p className="banner-eyebrow">{banner.eyebrow}</p>
        )}

        {banner.title && (
          <h3 className="banner-title">{banner.title}</h3>
        )}

        {banner.subtitle && (
          <p className="banner-subtitle">{banner.subtitle}</p>
        )}

        {banner.couponCode && (
          <div className="banner-coupon">
            <span className="banner-coupon-text">
              {banner.offerText || `Use Code:`}{" "}
              <strong>{banner.couponCode}</strong>
            </span>
          </div>
        )}

        <Link href={banner.href || "/shop"} className="banner-cta">
          {banner.buttonText || "Shop Now"}
        </Link>

        {banner.validityText && (
          <p className="banner-validity">{banner.validityText}</p>
        )}
      </div>
    </div>
  );
}

export async function HomeBanners() {
  const activeBanners = await getActiveBanners();

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <section className="section banners-section">
      <div className="banners-grid">
        {activeBanners.map((banner) => (
          <BannerCard key={banner.id} banner={banner as Banner} />
        ))}
      </div>
    </section>
  );
}
