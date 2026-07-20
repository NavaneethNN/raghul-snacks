import { StoreHeader } from "@/components/store-header";
import { AnnouncementBar } from "@/components/announcement-bar";
import Link from "next/link";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <StoreHeader />
      <main>{children}</main>
      <footer>
        <div className="footer-container">
          <div className="footer-brand">
            <div className="brand">
              <span>Raghul</span> Snacks
            </div>
            <p>Traditional South Indian snacks crafted with wholesome millets and authentic recipes. Made fresh in small batches, delivered across India.</p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Shop</h4>
              <ul>
                <li><Link href="/shop">All Products</Link></li>
                <li><Link href="/shop/laddus">Millet Laddus</Link></li>
                <li><Link href="/shop/kadalai">Masala Kadalai</Link></li>
                <li><Link href="/shop/podi">Everyday Podi</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">Our Story</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/track">Track Order</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Support</h4>
              <ul>
                <li><Link href="/faq">FAQs</Link></li>
                <li><Link href="/policies/shipping">Shipping</Link></li>
                <li><Link href="/policies/returns">Returns</Link></li>
                <li><Link href="/policies/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Raghul Snacks. All rights reserved.</p>
          <div className="footer-payment">
            <span>We accept</span>
            <div className="payment-icons">
              <div className="payment-icon">VISA</div>
              <div className="payment-icon">UPI</div>
              <div className="payment-icon">Card</div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
