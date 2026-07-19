import { StoreHeader } from "@/components/store-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="announcement">
        <span>📦 Free shipping on orders above ₹499</span>
        <span>🌾 Stone-ground ingredients</span>
        <span>❤️ Made Fresh in small batches</span>
      </div>
      <StoreHeader />
      <main>{children}</main>
      <footer>
        <div className="brand">
          <span>Raghul</span> Snacks
        </div>
        <p>Traditional snacks, made with ingredients you can recognise.</p>
        <div>
          <a href="/faq">FAQs</a>
          <a href="/policies/privacy">Privacy</a>
          <a href="/policies/terms">Terms</a>
        </div>
      </footer>
    </>
  );
}
