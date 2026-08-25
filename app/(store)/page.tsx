import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ProductCard } from "@/components/product/product-card";
import { BestsellersSlider } from "@/components/bestsellers-slider";
import { HeroBanner } from "@/components/hero-banner";
import { ScrollAnimate } from "@/components/scroll-animate";
import { getDb } from "@/lib/db";
import { products, categories, combos, comboItems } from "@/drizzle/schema";
import { getBannersWithValidity } from "@/lib/banners";

export const dynamic = 'force-dynamic';

async function getBanners() {
  try {
    return await getBannersWithValidity();
  } catch (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
}

async function getCategories() {
  try {
    const db = getDb();
    return await db.select().from(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getProducts() {
  try {
    const db = getDb();
    return await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        ingredients: products.ingredients,
        price: products.price,
        offerPrice: products.offerPrice,
        weight: products.weight,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        image: products.image,
        featured: products.featured,
        bestseller: products.bestseller,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCombos() {
  try {
    const db = getDb();
    const allCombos = await db.select().from(combos).orderBy(desc(combos.createdAt));
    return await Promise.all(
      allCombos.map(async (combo) => {
        const items = await db
          .select({
            id: comboItems.id,
            productId: comboItems.productId,
            quantity: comboItems.quantity,
            name: products.name,
          })
          .from(comboItems)
          .leftJoin(products, eq(comboItems.productId, products.id))
          .where(eq(comboItems.comboId, combo.id));
        return { ...combo, items };
      })
    );
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();
  const allProducts = await getProducts();
  const combos = await getCombos();
  const banners = await getBanners();
  const featuredCombo = combos && combos.length > 0 ? combos[0] : null;
  const bestsellers = allProducts.filter((p: any) => p.bestseller).slice(0, 4);
  const products = bestsellers.length > 0 ? bestsellers : allProducts.slice(0, 4);

  console.log('Combos fetched:', combos);
  console.log('Featured combo:', featuredCombo);
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Tradition in every bite</p>
          <h1>
            Snacks made the <i>real</i> way.
          </h1>
          <p className="hero-copy">
            Wholesome millet snacks, stone-ground podis, crispy savouries and
            homemade flavours crafted in small batches.
          </p>

          <div className="hero-features">
            <div className="hero-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>100% Natural Ingredients</span>
            </div>
            <div className="hero-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20"></path>
              </svg>
              <span>Handcrafted in Small Batches</span>
            </div>
            <div className="hero-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>Delivered Fresh Across India</span>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="button button-dark" href="/shop">
              Shop all snacks
            </Link>
            <Link className="button button-outline" href="#bestsellers">
              Meet the favourites →
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-wrapper">
            <div className="snacks-display">
              <img
                src="/hero.png"
                alt="Traditional snacks"
              />
            </div>
            <HeroBanner initialBanners={banners} />
          </div>
        </div>
      </section>

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

          <div className="category-grid">
            {categories.map((category: any, index: number) => (
              <Link
                href={`/shop/${category.slug}`}
                className={`category-card card-${index}`}
                key={category.slug}
                style={{
                  backgroundImage: category.image
                    ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)), url(${category.image})`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="category-mark">0{index + 1}</span>
                <h3>{category.name}</h3>
                <p>{category.description || 'Explore our collection'}</p>
                <b>Explore →</b>
              </Link>
            ))}
          </div>
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

      {/* Combo Box Section */}
      {featuredCombo && featuredCombo.title && (
        <section className="combo">
          <ScrollAnimate animation="left">
            <div>
              <p className="eyebrow">Special Combo</p>
              <h2>
                {featuredCombo.title}
                {featuredCombo.title?.includes(' ') && (
                  <>
                    <br />
                    <i>Box</i>
                  </>
                )}
              </h2>
              <p>
                A curated selection of our finest snacks in one combo.
              </p>

              {featuredCombo.items && featuredCombo.items.length > 0 && (
                <ul>
                  {featuredCombo.items.map((item: any, index: number) => (
                    <li key={index}>{item.name || 'Product'} ({item.quantity}g)</li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/shop" className="button button-light">
                  Get this combo · ₹{featuredCombo.discount && parseFloat(featuredCombo.discount) > 0 ? featuredCombo.discount : featuredCombo.price}
                </Link>
                <Link href="/shop?tab=combos" className="button button-outline">
                  View all combos →
                </Link>
              </div>
            </div>
          </ScrollAnimate>

          <ScrollAnimate animation="right">
            <div className="combo-visual">
              <span>{featuredCombo.items?.length || 0}</span>
              <p>
                delicious
                <br />
                items
              </p>
            </div>
          </ScrollAnimate>
        </section>
      )}
      {/* Values Section */}
      <ScrollAnimate>
        <section className="values">
          <div>
            <b>01</b>
            <h3>Ingredients you know</h3>
            <p>No preservatives. No unpronounceable extras.</p>
          </div>

          <div>
            <b>02</b>
            <h3>Rooted in tradition</h3>
            <p>Time-tested recipes with wholesome millets.</p>
          </div>

          <div>
            <b>03</b>
            <h3>Fresh to your door</h3>
            <p>Made in small batches and shipped across India.</p>
          </div>
        </section>
      </ScrollAnimate>

      {/* Contact Section */}
      <ScrollAnimate animation="right">
        <section className="contact-section" id="contact">
          <div className="contact-container">
            <div className="contact-content">
              <p className="eyebrow">Get in touch</p>
              <h2>We'd love to hear from you.</h2>
              <p className="contact-description">
                Have a question about our snacks, need help with an order, or want to explore bulk orders?
                We're here to help.
              </p>

              <div className="contact-details">
                <div className="contact-item">
                  <div>
                    <h4>Call us</h4>
                    <a href="tel:+918667829041" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      +91 86678 29041
                    </a>
                  </div>
                </div>

                <div className="contact-item">
                  <div>
                    <h4>Follow us</h4>
                    <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                      <a href="https://www.instagram.com/raghul_delights?igsh=emg3b3plYmkxeWlo" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        Instagram
                      </a>
                      <a href="https://www.facebook.com/share/1Be8hDcm56/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="11"/><path d="M13.5 8H15V5.5H13.2C10.9 5.5 9.5 6.9 9.5 9.2V11H7.5V13.5H9.5V19H12.5V13.5H14.5L15 11H12.5V9.5C12.5 8.5 12.8 8 13.5 8Z" fill="currentColor" stroke="none"/></svg>
                        Facebook
                      </a>
                      <a href="https://wa.me/918667829041" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

              </div>

      
            </div>

            <div className="contact-form-wrapper">
              <form className="contact-form">
                <h3>Send us a message</h3>

                <label>
                  <span>Your name</span>
                  <input type="text" name="name" placeholder="Full name" required />
                </label>

                <label>
                  <span>Email address</span>
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>

                <label>
                  <span>Phone number</span>
                  <input type="tel" name="phone" placeholder="10-digit mobile number" />
                </label>

                <label>
                  <span>Message</span>
                  <textarea name="message" rows={5} placeholder="How can we help you?" required></textarea>
                </label>

                <button type="submit" className="button button-dark">
                  Send message
                </button>
              </form>
            </div>
          </div>
        </section>
      </ScrollAnimate>
    </>
  );
}
