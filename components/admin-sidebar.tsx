"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./admin-sidebar.module.css";

const navGroups = [
  {
    label: "Store",
    items: [
      { href: "/admin",            label: "Dashboard",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
      { href: "/admin/orders",     label: "Orders",        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
      { href: "/admin/customers",  label: "Customers",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { href: "/admin/messages",   label: "Messages",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
      { href: "/admin/reviews",    label: "Reviews",       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products",      label: "Products",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5c-1.5-1-3.5-1-5 0"/><path d="M8.5 17.5c1.5 1.5 3 2 5.5 2s4-.5 5.5-2"/></svg> },
      { href: "/admin/categories",    label: "Categories",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
      { href: "/admin/combos",        label: "Combos",        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8v-4"/><path d="M8 4h8"/></svg> },
      { href: "/admin/coupons",       label: "Coupons",       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg> },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
      { href: "/admin/banners",       label: "Banners",       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    ],
  },
  {
    label: "Config",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
      { href: "/admin/settings",  label: "Settings",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m8.66-10l-5.2 3m-5.2 3l-5.2 3M20.66 17l-5.2-3m-5.2-3l-5.2-3"/></svg> },
    ],
  },
];

const badgeRoutes = { orders: "/admin/orders", messages: "/admin/messages", reviews: "/admin/reviews" };

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingReviews, setPendingReviews]   = useState(0);
  const [unreadMessages, setUnreadMessages]   = useState(0);
  const [newOrders,      setNewOrders]        = useState(0);
  const [drawerOpen,     setDrawerOpen]       = useState(false);
  const [confirmSignOut, setConfirmSignOut]   = useState(false);

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((data: Array<{ approved: boolean }>) => {
        if (Array.isArray(data)) setPendingReviews(data.filter((r) => !r.approved).length);
      })
      .catch(() => {});

    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((data: Array<{ read: boolean }>) => {
        if (Array.isArray(data)) setUnreadMessages(data.filter((m) => !m.read).length);
      })
      .catch(() => {});

    fetch("/api/admin/notifications/orders")
      .then((r) => r.json())
      .then((data: { newOrders?: number }) => {
        if (data.newOrders !== undefined) setNewOrders(data.newOrders);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setConfirmSignOut(false);
    if (pathname === "/admin/reviews")  setPendingReviews(0);
    if (pathname === "/admin/messages") setUnreadMessages(0);
    if (pathname === "/admin/orders")   setNewOrders(0);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function doSignOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  const totalBadges = pendingReviews + unreadMessages + newOrders;

  function getBadge(href: string) {
    if (href === badgeRoutes.orders   && newOrders > 0)      return newOrders;
    if (href === badgeRoutes.messages && unreadMessages > 0) return unreadMessages;
    if (href === badgeRoutes.reviews  && pendingReviews > 0) return pendingReviews;
    return null;
  }

  const navContent = (
    <>
      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.label} className={styles.navGroup}>
            <span className={styles.groupLabel}>{group.label}</span>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href + "/")) ||
                (item.href !== "/admin" && pathname === item.href);
              const badge = getBadge(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.icon}>{item.icon as React.ReactNode}</span>
                  <span className={styles.label}>{item.label}</span>
                  {badge && <span className={styles.badge}>{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        {confirmSignOut ? (
          <div className={styles.signOutConfirm}>
            <p>Sign out?</p>
            <div className={styles.signOutConfirmActions}>
              <button className={styles.signOutCancelBtn} onClick={() => setConfirmSignOut(false)}>
                Cancel
              </button>
              <button className={styles.signOutConfirmBtn} onClick={doSignOut}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmSignOut(true)} className={styles.signOutButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/admin" className={styles.brandName}>
            <img src="/logo-footer.png" alt="Raghul Delights" style={{ height: "60px", width: "auto" }} />
            <span className={styles.shopName}>Raghul Delights</span>
          </Link>
        </div>
        {navContent}
      </aside>

      {/* ── Mobile top bar ── */}
      <header className={styles.mobileTopBar}>
        <Link href="/admin" className={styles.mobileBrand}>
          <img src="/logo-footer.png" alt="Raghul Delights" style={{ height: "36px", width: "auto" }} />
          <span>Raghul Delights</span>
        </Link>
        <div className={styles.mobileTopBarActions}>
          {totalBadges > 0 && <span className={styles.mobileGlobalBadge}>{totalBadges}</span>}
          <button className={styles.hamburger} onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Overlay ── */}
      {drawerOpen && (
        <div className={styles.overlay} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <Link href="/admin" className={styles.brandName} onClick={() => setDrawerOpen(false)}>
            <img src="/logo-footer.png" alt="Raghul Delights" style={{ height: "48px", width: "auto" }} />
            <span className={styles.shopName}>Raghul Delights</span>
          </Link>
          <button className={styles.closeButton} onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {navContent}
      </aside>
    </>
  );
}
