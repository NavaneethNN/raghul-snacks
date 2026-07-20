import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <p className="eyebrow">Our Story</p>
          <h1>
            Tradition meets <i>nourishment</i> in every bite.
          </h1>
          <p className="hero-description">
            Born from a love for authentic South Indian flavors and the wisdom of wholesome millets,
            Raghul Snacks brings you snacks that honor tradition while nourishing the modern family.
          </p>
        </div>
        <div className="about-hero-image">
          <div className="image-wrapper">
            <img src="/hero.png" alt="Traditional snacks" />
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-container">
          <div className="story-text">
            <p className="eyebrow">Where it began</p>
            <h2>A kitchen, a recipe book, and a promise.</h2>
            <p>
              It started with Raghul's grandmother — a woman who believed that food was more than
              sustenance. It was memory, love, and heritage wrapped in every laddu, every podi,
              every crunchy kadalai.
            </p>
            <p>
              Her recipes, passed down through generations, used millets long before they became
              a health trend. She knew what we're only rediscovering now: that foxtail millet,
              little millet, and kodo millet aren't just nutritious — they're delicious.
            </p>
            <p>
              Today, we honor her legacy by making snacks the way she did: in small batches,
              with real ingredients, and with the kind of care that can't be rushed.
            </p>
          </div>
          <div className="story-stats">
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="stat-label">Natural Ingredients</div>
              <p>No preservatives, no shortcuts. Just real food.</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">5+</div>
              <div className="stat-label">Millet Varieties</div>
              <p>Ancient grains that modern bodies love.</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">Small</div>
              <div className="stat-label">Batch Production</div>
              <p>Made fresh, never mass-produced.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="about-values-container">
          <div className="values-intro">
            <p className="eyebrow">What drives us</p>
            <h2>Our commitments to you.</h2>
          </div>

          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M2 12h20"></path>
                </svg>
              </div>
              <h3>Authentic Recipes</h3>
              <p>
                Every recipe is tested against tradition. We don't innovate for the sake of it —
                we perfect what's already been perfected over generations.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3>Quality First</h3>
              <p>
                From sourcing to packaging, we never compromise. If an ingredient doesn't meet
                our standards, it doesn't go into our snacks. Period.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3>Made Fresh</h3>
              <p>
                We make what we can sell this week, not this year. Small batches mean every
                package is as fresh as the day it was made.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3>Family Made</h3>
              <p>
                This isn't a factory. It's a kitchen that grew. Every member of our team
                knows your snacks by name, not by SKU.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="process-container">
          <div className="values-intro">
            <p className="eyebrow">How we do it</p>
            <h2>From grain to goodness.</h2>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">01</div>
              <h3>Source</h3>
              <p>
                We work directly with farmers who grow millets the traditional way —
                without chemicals, without compromise.
              </p>
            </div>

            <div className="process-step">
              <div className="step-number">02</div>
              <h3>Stone Grind</h3>
              <p>
                Our podis are ground on stone mills, the way they've been for centuries.
                Slow, yes. Worth it? Absolutely.
              </p>
            </div>

            <div className="process-step">
              <div className="step-number">03</div>
              <h3>Hand Roll</h3>
              <p>
                Laddus are shaped by hand. It takes longer, but there's no machine
                that can replicate the perfect texture.
              </p>
            </div>

            <div className="process-step">
              <div className="step-number">04</div>
              <h3>Pack Fresh</h3>
              <p>
                We pack your snacks within hours of making them. What you get is as
                close to homemade as commerce allows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="about-cta-content">
          <h2>Taste the tradition yourself.</h2>
          <p>
            Every snack tells a story. Let us share ours with you, one bite at a time.
          </p>
          <div className="cta-actions">
            <Link href="/shop" className="button button-dark">
              Shop All Snacks
            </Link>
            <Link href="#contact" className="button button-outline">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
