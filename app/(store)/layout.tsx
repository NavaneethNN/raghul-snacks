import { StoreHeader } from "@/components/store-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="announcement">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          Free shipping on orders above ₹499
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          Stone-ground ingredients
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          Made Fresh in small batches
        </span>
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
