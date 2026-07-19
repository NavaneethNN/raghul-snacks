"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-sidebar.module.css";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/products", label: "Products", icon: "🥜" },
  { href: "/admin/categories", label: "Categories", icon: "📁" },
  { href: "/admin/combos", label: "Combos", icon: "🎁" },
  { href: "/admin/coupons", label: "Coupons", icon: "🎟️" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
  { href: "/admin/banners", label: "Banners", icon: "🖼️" },
  { href: "/admin/shipping", label: "Shipping", icon: "🚚" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>
          <span>Raghul</span> Snacks
        </span>
        <p className={styles.brandTagline}>Admin Portal</p>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <p className={styles.version}>v1.0.0</p>
      </div>
    </aside>
  );
}
