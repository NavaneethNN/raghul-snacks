import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { StoreHeader } from "@/components/store-header";

export const metadata: Metadata = { title: "Raghul Snacks | Tradition, thoughtfully made", description: "Wholesome traditional millet snacks delivered across India." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CartProvider><div className="announcement">Free shipping on orders above ₹499 <span>•</span> Made fresh in small batches</div><StoreHeader /><main>{children}</main><footer><div className="brand"><span>Raghul</span> Snacks</div><p>Traditional snacks, made with ingredients you can recognise.</p><div><a href="/faq">FAQs</a><a href="/policies/privacy">Privacy</a><a href="/policies/terms">Terms</a></div></footer></CartProvider></body></html>;
}
