import { StoreHeader } from "@/components/store-header";
import { AnnouncementBar } from "@/components/announcement-bar";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
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
