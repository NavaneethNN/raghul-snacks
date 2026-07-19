import Link from "next/link";
import { categories, products } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";

export default function HomePage() {
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

          <div className="hero-actions">
            <Link className="button button-dark" href="/shop">
              Shop all snacks
            </Link>
            <Link className="button button-outline" href="#bestsellers">
              Meet the favourites →
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-item">
              <span className="trust-stars">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </span>
              <span className="trust-text">Trusted by 3000+ families</span>
            </div>
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
      <section className="section">
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
          {categories.map((category, index) => (
            <Link
              href={`/shop/${category.slug}`}
              className={`category-card card-${index}`}
              key={category.slug}
            >
              <span className="category-mark">0{index + 1}</span>
              <h3>{category.name}</h3>
              <p>{category.detail}</p>
              <b>Explore →</b>
            </Link>
          ))}
        </div>
      </section>

      {/* Starter Box Section */}
      <section className="combo">
        <div>
          <p className="eyebrow">The easy place to start</p>
          <h2>
            The Millet
            <br />
            <i>Starter Box.</i>
          </h2>
          <p>
            Four classic snacks for tea time, gifting and everything in between.
          </p>

          <ul>
            <li>Thinai Laddu</li>
            <li>Samai Laddu</li>
            <li>Varagu Laddu</li>
            <li>Pepper Kadalai</li>
          </ul>

          <Link href="/shop" className="button button-light">
            Get the box · ₹450
          </Link>
        </div>

        <div className="combo-visual">
          <span>4</span>
          <p>
            little
            <br />
            delights
          </p>
        </div>
      </section>

      {/* Bestsellers Section */}
      <section className="section" id="bestsellers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Loved by many</p>
            <h2>Our bestsellers.</h2>
          </div>
        </div>

        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
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
    </>
  );
}
