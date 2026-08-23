"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      subject: (form.elements.namedItem("subject") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setSent(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="contact-page-hero">
        <div className="contact-page-hero-content">
          <p className="eyebrow">Get in Touch</p>
          <h1>We&apos;re here to <i>help.</i></h1>
          <p className="hero-description">
            Have questions about our snacks, need help with an order, or interested in bulk purchases?
            Our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Main */}
      <section className="contact-page-main">
        <div className="contact-page-container">

          {/* Form */}
          <div className="contact-page-form-wrapper">
            <div className="contact-form-header">
              <h2>Send us a message</h2>
              <p>Fill out the form and we&apos;ll get back to you within 24 hours.</p>
            </div>

            {sent ? (
              <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#166534" }}>Message sent!</h3>
                <p style={{ margin: "0 0 20px", fontSize: 14, color: "#166534" }}>We&apos;ll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} style={{ background: "#166534", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", font: "600 14px 'DM Sans',sans-serif", cursor: "pointer" }}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="contact-page-form" onSubmit={handleSubmit} noValidate>
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

                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="button button-dark" disabled={loading}>
                  {loading ? "Sending…" : "Send Message"}
                </button>

                <p className="form-note">* Required fields. We respect your privacy.</p>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="contact-page-info">
            <div className="contact-info-card">
              <h3>Contact Information</h3>
              <div className="contact-info-items">
                <div className="contact-info-item">
                  <div className="info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Phone</h4>
                    <a href="tel:+918667829041">+91 86678 29041</a>
                    <p>Mon–Sat, 9 AM – 6 PM</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Follow us</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
                      <a href="https://www.instagram.com/raghul_delights?igsh=emg3b3plYmkxeWlo" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        Instagram
                      </a>
                      <a href="https://www.facebook.com/share/1Be8hDcm56/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="11"/><path d="M13.5 8H15V5.5H13.2C10.9 5.5 9.5 6.9 9.5 9.2V11H7.5V13.5H9.5V19H12.5V13.5H14.5L15 11H12.5V9.5C12.5 8.5 12.8 8 13.5 8Z" fill="currentColor" stroke="none"/></svg>
                        Facebook
                      </a>
                      <a href="https://wa.me/918667829041" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-info-card">
              <h3>Business Hours</h3>
              <div className="business-hours">
                <div className="hours-row"><span>Monday – Friday</span><strong>9:00 AM – 6:00 PM</strong></div>
                <div className="hours-row"><span>Saturday</span><strong>9:00 AM – 2:00 PM</strong></div>
                <div className="hours-row"><span>Sunday</span><strong>Closed</strong></div>
              </div>
            </div>

            <div className="contact-info-card">
              <h3>Quick Links</h3>
              <div className="quick-links">
                <a href="/track">Track Your Order</a>
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
