import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { ProductCard } from "@/components/product/product-card";
import { BestsellersSlider } from "@/components/bestsellers-slider";
import { CombosSlider } from "@/components/combos-slider";
import { CategoriesSlider } from "@/components/categories-slider";
import { HeroSection } from "@/components/hero-section";
import { ScrollAnimate } from "@/components/scroll-animate";
import { getDb } from "@/lib/db";
import { categories, combos, comboItems, products } from "@/drizzle/schema";
import { getBannersWithValidity } from "@/lib/banners";
import { getProductsWithVariants } from "@/lib/db-queries";

import { getOrSetCache } from "@/lib/cache";

export const revalidate = 120;

async function getBanners() {
  return getOrSetCache("home:banners", 60, async () => {
    try {
      return await getBannersWithValidity();
    } catch (error) {
      console.error('Error fetching banners:', error);
      return [];
    }
  });
}

async function getCategories() {
  return getOrSetCache("home:categories", 60, async () => {
    try {
      const db = getDb();
      return await db.select().from(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  });
}

async function getProducts() {
  return getOrSetCache("home:products", 60, async () => {
    try {
      const db = getDb();
      return await getProductsWithVariants(db, { limit: 10 });
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  });
}

async function getCombos() {
  return getOrSetCache("home:combos", 60, async () => {
    try {
      const db = getDb();
      const allCombos = await db.select().from(combos).orderBy(desc(combos.createdAt));
      if (!allCombos || allCombos.length === 0) return [];

      const comboIds = allCombos.map((c) => c.id);
      const allItems = await db
        .select({
          id: comboItems.id,
          comboId: comboItems.comboId,
          productId: comboItems.productId,
          quantity: comboItems.quantity,
          name: products.name,
          image: products.image,
          weight: products.weight,
          slug: products.slug,
        })
        .from(comboItems)
        .leftJoin(products, eq(comboItems.productId, products.id))
        .where(inArray(comboItems.comboId, comboIds));

      const itemsByCombo = new Map<number, any[]>();
      for (const item of allItems) {
        const list = itemsByCombo.get(item.comboId) || [];
        list.push(item);
        itemsByCombo.set(item.comboId, list);
      }

      return allCombos.map((combo) => ({
        ...combo,
        items: itemsByCombo.get(combo.id) || [],
      }));
    } catch (error) {
      console.error('Error fetching combos:', error);
      return [];
    }
  });
}

export default async function HomePage() {
  const [categories, allProducts, combos, banners] = await Promise.all([
    getCategories(),
    getProducts(),
    getCombos(),
    getBanners(),
  ]);

  // Only show combos that still have at least one item
  const validCombos = combos ? combos.filter((c: any) => c.items && c.items.length > 0) : [];
  // Show up to 10 most recently added products in bestsellers
  const products = allProducts.slice(0, 10);

  return (
    <>
      {/* Hero Section */}
      <HeroSection banners={banners} />

      {/* Browse by Craving Section */}
      <section className="section" id="categories">
        <ScrollAnimate>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Browse by craving</p>
              <h2>A little something for everyone.</h2>
            </div>
            <Link href="/shop" className="text-link">
              View all →
            </Link>
          </div>

          <CategoriesSlider categories={categories} />
        </ScrollAnimate>
      </section>

      {/* Bestsellers Section */}
      <section className="section" id="bestsellers">
        <ScrollAnimate>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Loved by many</p>
              <h2>Our bestsellers.</h2>
            </div>
            <Link href="/shop" className="text-link">
              View all →
            </Link>
          </div>

          <BestsellersSlider products={products} />
        </ScrollAnimate>
      </section>

      {/* Combo Slider Section */}
      {validCombos.length > 0 && (
        <CombosSlider combos={validCombos} />
      )}

      {/* Values Section */}
      <ScrollAnimate>
        <section className="values-section">
          <div className="values-header">
            <p className="eyebrow">The Raghul Delights Promise</p>
            <h2>Pure Taste. Zero Compromise.</h2>
          </div>
          <div className="values-grid-home">
            <div className="value-card">
              <div className="value-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9a9 9 0 0 1-9-9 9 9 0 0 1 9-9z"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span className="value-num">01</span>
              <h3>Wholesome Millet Laddus</h3>
              <p>Nutrient-dense native millets sweetened naturally with country jaggery. Wholesome goodness in every single bite.</p>
            </div>

            <div className="value-card">
              <div className="value-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <span className="value-num">02</span>
              <h3>Crunchy Traditional Snacks</h3>
              <p>Time-honoured South Indian savouries — murukku, mixture, seedai, and thattai crafted fresh in small batches.</p>
            </div>

            <div className="value-card">
              <div className="value-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 14 14"/>
                </svg>
              </div>
              <span className="value-num">03</span>
              <h3>Everyday Podi Varieties</h3>
              <p>Authentic stone-ground idli podi, fragrant karuveppilai podi, paruppu podi, and garlic podi made fresh.</p>
            </div>

            <div className="value-card">
              <div className="value-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <span className="value-num">04</span>
              <h3>Moisture-Lock Pan-India</h3>
              <p>Food-grade nitrogen barrier packaging delivered crispy to your doorstep anywhere in India.</p>
            </div>
          </div>
        </section>
      </ScrollAnimate>

      {/* Contact Section */}
      <ScrollAnimate animation="right">
        <section className="contact-section" id="contact">
          <div className="contact-container">

            {/* Left — headline + contact info */}
            <div className="contact-content">
              <p className="eyebrow">Get in touch</p>
              <h2>We&apos;d love to hear from you.</h2>
              <p className="contact-description">
                Questions about our snacks, need help with an order, or interested in bulk purchases? We&apos;re here.
              </p>

              <div className="contact-details">
                <div className="contact-item">
                  <div>
                    <h4>WhatsApp</h4>
                    <a href="https://wa.me/918667829041" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      +91 86678 29041
                    </a>
                  </div>
                </div>

                <div className="contact-item">
                  <div>
                    <h4>Follow us</h4>
                    <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                      <a href="https://www.instagram.com/raghul_delights?igsh=emg3b3plYmkxeWlo" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        Instagram
                      </a>
                      <a href="https://www.facebook.com/share/1Be8hDcm56/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="11"/><path d="M13.5 8H15V5.5H13.2C10.9 5.5 9.5 6.9 9.5 9.2V11H7.5V13.5H9.5V19H12.5V13.5H14.5L15 11H12.5V9.5C12.5 8.5 12.8 8 13.5 8Z" fill="currentColor" stroke="none"/></svg>
                        Facebook
                      </a>
                      <a href="https://wa.me/918667829041" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — CTA card linking to full contact page */}
            <div className="contact-form-wrapper" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 20, padding: "36px 28px" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(201,95,59,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: "0 0 8px", font: "700 20px 'Playfair Display',serif", color: "var(--ink)" }}>Send us a message</h3>
                <p style={{ margin: 0, fontSize: 14, color: "#687267", lineHeight: 1.6 }}>
                  Fill out our contact form and we&apos;ll get back to you within 24 hours.
                </p>
              </div>
              <Link href="/contact" className="button button-dark" style={{ width: "100%", maxWidth: 260, justifyContent: "center" }}>
                Go to Contact Page →
              </Link>
            </div>
          </div>
        </section>
      </ScrollAnimate>
    </>
  );
}