export default function ContactPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="contact-page-hero">
        <div className="contact-page-hero-content">
          <p className="eyebrow">Get in Touch</p>
          <h1>
            We're here to <i>help.</i>
          </h1>
          <p className="hero-description">
            Have questions about our snacks, need help with an order, or interested in bulk purchases?
            Our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="contact-page-main">
        <div className="contact-page-container">
          {/* Contact Form */}
          <div className="contact-page-form-wrapper">
            <div className="contact-form-header">
              <h2>Send us a message</h2>
              <p>Fill out the form below and we'll get back to you within 24 hours.</p>
            </div>

            <form className="contact-page-form">
              <div className="form-row">
                <label>
                  <span>Your Name *</span>
                  <input type="text" name="name" placeholder="Full name" required />
                </label>

                <label>
                  <span>Email Address *</span>
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>
              </div>

              <label>
                <span>Phone Number</span>
                <input type="tel" name="phone" placeholder="10-digit mobile number" />
              </label>

              <label>
                <span>Subject *</span>
                <select name="subject" required>
                  <option value="">Select a topic</option>
                  <option value="order">Order Inquiry</option>
                  <option value="product">Product Question</option>
                  <option value="bulk">Bulk Orders</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                <span>Message *</span>
                <textarea name="message" rows={6} placeholder="How can we help you?" required></textarea>
              </label>

              <button type="submit" className="button button-dark">
                Send Message
              </button>

              <p className="form-note">
                * Required fields. We respect your privacy and will never share your information.
              </p>
            </form>
          </div>

          {/* Contact Information */}
          <div className="contact-page-info">
            <div className="contact-info-card">
              <h3>Contact Information</h3>

              <div className="contact-info-items">
                <div className="contact-info-item">
                  <div className="info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4>Phone</h4>
                    <a href="tel:+919876543210">+91 98765 43210</a>
                    <p>Mon-Sat, 9 AM - 6 PM</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h4>Email</h4>
                    <a href="mailto:hello@raghulsnacks.com">hello@raghulsnacks.com</a>
                    <p>We'll respond within 24 hours</p>
                  </div>
                </div>

              </div>
            </div>

            <div className="contact-info-card">
              <h3>Business Hours</h3>
              <div className="business-hours">
                <div className="hours-row">
                  <span>Monday - Friday</span>
                  <strong>9:00 AM - 6:00 PM</strong>
                </div>
                <div className="hours-row">
                  <span>Saturday</span>
                  <strong>9:00 AM - 2:00 PM</strong>
                </div>
                <div className="hours-row">
                  <span>Sunday</span>
                  <strong>Closed</strong>
                </div>
              </div>
            </div>

            <div className="contact-info-card">
              <h3>Quick Links</h3>
              <div className="quick-links">
                <a href="/orders">Track Your Order</a>
                <a href="/shop">Browse Products</a>
                <a href="/about">Our Story</a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
