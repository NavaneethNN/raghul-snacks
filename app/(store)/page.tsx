import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getProducts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCombos() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/combos`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();
  const allProducts = await getProducts();
  const combos = await getCombos();
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
          </div>
        </div>
      </section>

      {/* Browse by Craving Section */}
      <section className="section" id="categories">
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
      </section>

      {/* Combo Box Section */}
      {featuredCombo && featuredCombo.title && (
        <section className="combo">
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

          <div className="combo-visual">
            <span>{featuredCombo.items?.length || 0}</span>
            <p>
              delicious
              <br />
              items
            </p>
          </div>
        </section>
      )}

      {/* Bestsellers Section */}
      <section className="section" id="bestsellers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Loved by many</p>
            <h2>Our bestsellers.</h2>
          </div>
          <Link href="/shop" className="text-link">
            View all →
          </Link>
        </div>

        <div className="product-grid">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Values Section */}
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

      {/* Contact Section */}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <div>
                  <h4>Call us</h4>
                  <a href="tel:+919876543210">+91 98765 43210</a>
                </div>
              </div>

              <div className="contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div>
                  <h4>Email us</h4>
                  <a href="mailto:hello@raghulsnacks.com">hello@raghulsnacks.com</a>
                </div>
              </div>

              <div className="contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div>
                  <h4>Visit us</h4>
                  <p>123 Traditional Lane<br/>Chennai, Tamil Nadu 600001</p>
                </div>
              </div>
            </div>

            <div className="contact-hours">
              <h4>Business Hours</h4>
              <p>Monday - Saturday: 9:00 AM - 6:00 PM</p>
              <p>Sunday: Closed</p>
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
    </>
  );
}
