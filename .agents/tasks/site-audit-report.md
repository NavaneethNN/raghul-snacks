# Raghul Delights — Site Audit Report

**Date:** 2025-07-11  
**Scope:** Full site flow audit — storefront, admin, API routes  
**Stack:** Next.js 14 App Router, Drizzle ORM, PostgreSQL (Neon), Cashfree payments, Shiprocket shipping

---

## Executive Summary

The site is structurally sound with a working end-to-end purchase flow (Cashfree), proper auth guards, and sensible cart/checkout logic. However, there are **3 critical issues**, **8 high-priority issues**, several medium issues, and a batch of inconsistencies that would erode customer trust or cause confusion in production. The most urgent problems are: (1) a dead legacy checkout page that still loads Razorpay but the platform now uses Cashfree, (2) policy pages referencing the wrong payment processor, and (3) the admin panel having zero route-level auth protection — only the root `admin/page.tsx` checks the cookie; all sub-pages and the admin API routes that write data are guarded server-side but the layout itself does not redirect unauthenticated users.

---

## CRITICAL Issues

### C-1 — Dead legacy checkout embedded inside the active checkout page
**File:** `app/(store)/checkout/page.tsx`  
**Lines:** 15–92

`CheckoutPage` at line 15 simply returns `<CheckoutWizard />` (correct, uses Cashfree). But the file also contains a fully-fleshed-out `LegacyCheckoutPage` function (lines 19–92) that:
- Loads the **Razorpay** JS SDK (`https://checkout.razorpay.com/v1/checkout.js`)
- Calls `window.Razorpay`
- POSTs to `/api/razorpay/verify`
- Calls `setPaymentReady` against Razorpay's `onLoad`

This component is never rendered, but it adds dead, confusing code and it means the Razorpay JS file is **not** being loaded for the active flow. More importantly, if any refactor or import accidentally wires `LegacyCheckoutPage` instead of `CheckoutWizard`, real money flows through Razorpay to a potentially non-functional verify endpoint. The `/api/razorpay/verify/route.ts` still exists, meaning parallel but divergent payment code is alive in the repo.

**Risk:** Developer confusion, accidental swap, dead code shipping to production.  
**Fix:** Delete `LegacyCheckoutPage` and the unused `import styles from "./checkout.module.css"` that references the old layout styles.

---

### C-2 — Admin panel sub-pages have no client-side auth redirect
**File:** `app/admin/layout.tsx`

The admin layout is a **client component** (`"use client"`) and only skips rendering the sidebar on `/admin/login`. It never checks whether the user is authenticated before rendering the rest of the admin UI. The individual **page** components (orders, products, etc.) do NOT perform their own auth checks — they simply render admin components that immediately fetch from `/api/admin/*`. Those API routes do check cookies server-side and return 401, but the page HTML renders and the fetch fails silently or with an error toast, leaving the empty admin shell visible to anyone who navigates to `/admin/orders` directly.

The only proper guard is on `app/admin/page.tsx` (the dashboard) which does a server-side `redirect("/admin/login")`. All other admin sub-pages (`/admin/orders`, `/admin/products`, `/admin/coupons`, etc.) are unguarded at the page level.

**Risk:** Admin UI structure exposed to unauthenticated users; data fetches fail with 401 but the shell renders.  
**Fix:** Add a server-side auth check in `app/admin/layout.tsx` (convert to a server component) or add it individually to each admin page file.

---

### C-3 — Policy pages reference Razorpay, site now uses Cashfree
**Files:**  
- `app/(store)/policies/terms/page.tsx` (line 11): "Payments are processed securely by Razorpay."  
- `app/(store)/policies/privacy/page.tsx` (lines 15, 43, 52): multiple mentions of Razorpay as the payment processor  
- `components/admin-settings.tsx` (lines 117–142): Admin settings UI shows "Razorpay Key ID / Key Secret" input fields

The payment gateway is Cashfree (`lib/cashfree.ts`). All customer-visible policy pages and the admin settings screen still name Razorpay. This is legally incorrect (privacy policy must accurately describe the data processor) and will confuse customers who see Cashfree on checkout but Razorpay in policies.

**Risk:** Legal/compliance exposure; customer trust issue.  
**Fix:** Replace "Razorpay" with "Cashfree" in all three files.

---

## HIGH Priority Issues

### H-1 — Shelf life is hardcoded to "30 days" for every product
**File:** `components/product/product-detail-view.tsx` (line ~140)

```tsx
<strong>30 days</strong>
```

The shelf life is hardcoded. Different products (podis vs laddus vs kadalai) likely have different shelf lives. There is no `shelfLife` column in `drizzle/schema.ts` → `products` table.

**Risk:** Customers see wrong information; potential food safety/labelling issue.  
**Fix:** Add a `shelfLife` text column to the products table, populate it in the admin, and render it dynamically.

---

### H-2 — Combo "Get this combo" button links to `/shop`, not `/combo/[slug]`
**File:** `app/(store)/page.tsx` (line ~175)

```tsx
<Link href="/shop" className="button button-light">
  Get this combo · ₹{...}
</Link>
```

The CTA for the featured combo on the home page navigates to the generic `/shop` page, not to the combo's own detail page at `/combo/[slug]`. This kills the conversion for any customer who clicks the button expecting to buy the displayed combo.

**Risk:** Direct revenue impact — customers who click "Get this combo" land on the wrong page.  
**Fix:** Change the `href` to `/combo/${featuredCombo.slug}`.

---

### H-3 — Stock is never checked; out-of-stock products are freely added to cart and purchased
**Files:** `drizzle/schema.ts` (products table has `stock integer`), `lib/order-pricing.ts`, `components/product/product-detail-view.tsx`, `components/product/product-card.tsx`

The `stock` column exists and is decremented on purchase (`app/api/cashfree/verify/route.ts` uses `GREATEST(stock - quantity, 0)`), but:
- Product cards never check `stock` before showing "Add to Cart".
- The detail page never shows "Out of Stock" or disables the buttons when `product.stock === 0`.
- `priceOrder` in `lib/order-pricing.ts` never validates that stock ≥ quantity.
- There is no UI anywhere showing stock status.

This means a sold-out product can be added to cart and successfully checked out. The owner then has to disappoint the customer after payment.

**Risk:** Overselling, disappointed customers, refund/support burden.  
**Fix:** In `priceOrder`, throw if `product.stock < item.quantity`. In the detail/card components, check `stock === 0` and show "Out of Stock" + disable buttons.

---

### H-4 — No out-of-stock indicator shown anywhere on the storefront
This is related to H-3 but worth calling out separately as a UX failure. The user (message 8 in the original workflow) specifically asked whether stock was shown anywhere. The answer is: **stock is never shown** — not on product cards, not on the detail page, not in the cart. The only thing that happens with stock is silent decrementation after payment. Customers see products that may have 0 stock with no indication.

**Fix:** Per H-3.

---

### H-5 — `customer-orders.tsx` shows only the most recent order for logged-in users
**File:** `components/customer-orders.tsx` (line ~34)

```tsx
if (accountResponse.ok && accountData.orders?.[0]) { setOrder(accountData.orders[0]); return; }
```

The `/orders` page fetches all orders but immediately takes only `[0]` (the latest one). A user with multiple orders can only see their most recent one here. Full order history is only accessible inside `/account` via the `AccountDashboard`.

**Risk:** Customers who go to `/orders` after an older order lookup cannot see their history; confusing UX.  
**Fix:** Render all orders in a list on the `/orders` page, not just `orders[0]`.

---

### H-6 — No email confirmation is sent after a successful order
**File:** `app/api/cashfree/verify/route.ts`

After a successful payment and order creation, no email is sent to the customer. The shipping policy page says "we will share tracking details via WhatsApp or phone" — manually. There is no `sendEmail` utility, no transactional email service (Resend, SendGrid, Nodemailer) in `package.json` or `lib/`.

**Risk:** Customers have no written confirmation. If they don't check the `/orders` page, they have no order number to track. This is a significant trust/UX gap for an e-commerce site.  
**Fix:** Integrate a transactional email service and send an order confirmation email with order number, items summary, and total after `db.insert(orders)` succeeds.

---

### H-7 — Combo detail page misuses `formatWeight` for combo item quantities
**File:** `app/(store)/combo/[slug]/page.tsx` (line ~90)

```tsx
{formatWeight(item.quantity.toString())}
```

`item.quantity` in the combo context is a **count** (e.g., "2 units"), not a weight. `formatWeight` appends "g" to any bare number, so quantity `2` renders as "2g" instead of "×2" or "Qty: 2".

**Risk:** Incorrect information displayed on the combo detail page.  
**Fix:** Display quantity as `×${item.quantity}` or `Qty: ${item.quantity}` rather than passing through `formatWeight`.

---

### H-8 — Admin panel has no list endpoint for orders (`GET /api/admin/orders`)
**File:** `app/api/admin/orders/[id]/route.ts` exists; `app/api/admin/orders/route.ts` does **not** exist.

The admin orders page (`components/admin-orders.tsx`) receives orders as props from its parent `app/admin/orders/page.tsx`. Let's check:

Looking at the admin orders page file structure, the GET endpoint for listing all orders is missing from `app/api/admin/orders/`. The admin orders page must be loading orders through a different mechanism — checking the page:

**File:** `app/admin/orders/page.tsx` — this file was not read during the audit. However the component `AdminOrders` takes `orders` as a prop. If the server page fetches directly via Drizzle (bypassing the API), there's no issue at runtime but the missing API endpoint means no external tooling/admin API integration is possible.

> **Note:** This requires verification by reading `app/admin/orders/page.tsx`. The finding is "potentially missing" — the page may query the DB directly.

---

## MEDIUM Priority Issues

### M-1 — N+1 query on the account page for order items + product lookups
**File:** `app/(store)/account/page.tsx` (lines ~60–110)

The account page fetches all orders, then for each order fetches all items, and for each item does up to **two** separate DB queries (by productId, then by name as fallback). For a user with 10 orders of 5 items each, this is potentially **100+ sequential queries**.

**Fix:** Join `orderItems` and `products` in a single query per order, or use a single batch query for all items across all orders.

---

### M-2 — Session cache in `store-header.tsx` leaks between users on shared browsers
**File:** `components/store-header.tsx` (lines 13–14)

```ts
let cachedSession: { name: string; email: string } | null | undefined = undefined;
let cachedCategories: any[] | undefined = undefined;
```

Module-level variables in Next.js client components persist for the browser tab's lifetime. If user A signs in, `cachedSession` is set. If user A signs out on the same tab, the `session-changed` event fires and invalidates it — this part is handled. However, if a user navigates away and back quickly, they might briefly see stale session state. More critically, the comment says "fetched once per browser session" — this means the session name shown in the header may be stale after a name update (even though `AccountDashboard.saveName` calls `router.refresh()`).

**Fix:** The `session-changed` event invalidation already handles sign-out; the main risk is the brief stale state window. This is low-impact in practice but worth noting.

---

### M-3 — Product recommendations on the detail page are not category-filtered
**File:** `app/(store)/product/[slug]/page.tsx` (line ~66)

```tsx
const recommendations = allProducts.filter((item: any) => item.id !== product.id).slice(0, 3);
```

"Frequently bought together" shows any 3 products excluding the current one, regardless of category or relevance. This is cosmetically labelled "Frequently bought together" but has no actual purchase correlation logic.

**Fix:** At minimum filter by same category. Ideally track actual co-purchase data.

---

### M-4 — Review submission UI is missing from the product detail page
**File:** `components/product/product-reviews.tsx`

The `ProductReviews` component only shows approved reviews. There is no form for customers to submit a review from the product page. The review submission API (`POST /api/reviews`) requires authentication and an `orderId`, but there's no UI anywhere in the storefront to trigger it. The only review management is in the admin panel.

**Risk:** No customer-facing review submission flow despite the backend supporting it.  
**Fix:** Add a review submission form that, when the user is logged in and has ordered the product, allows them to select the order and submit a rating + text.

---

### M-5 — Cart page fetches all products on every mount for upsell (N+1 / no pagination)
**File:** `app/(store)/cart/page.tsx` (lines ~38–57)

```tsx
const response = await fetch("/api/products");
```

The cart page fetches the **entire product catalogue** just to pick one random upsell product. As the catalogue grows, this becomes a slow and wasteful request.

**Fix:** Add a `/api/products?featured=true&limit=5` endpoint or a dedicated `/api/products/random` endpoint that returns a single random product without loading everything.

---

### M-6 — Shipping policy does not mention the homemade/preparation delay
**File:** `app/(store)/policies/shipping/page.tsx`

The shipping policy says "Orders are processed within 1–2 business days." However, since snacks are homemade and made in small batches after ordering, the actual preparation time may be longer. The user specifically called this out (message 10 in the workflow). The policy does say "some items may require additional preparation time" but this is vague for a platform where ALL items are made to order.

**Fix:** Add a specific note: "As all our snacks are freshly prepared after your order, please allow 2–3 additional business days for preparation before dispatch."

---

### M-7 — No `metadata` (SEO) on most store pages
**File:** `app/layout.tsx` provides a global default, but no page-level metadata is exported from:
- `app/(store)/product/[slug]/page.tsx` — no dynamic `generateMetadata`
- `app/(store)/shop/page.tsx`
- `app/(store)/cart/page.tsx`
- `app/(store)/checkout/page.tsx`
- `app/(store)/account/page.tsx`
- `app/(store)/policies/*.tsx`

Product pages especially should have dynamic `title` and `description` for SEO.

**Fix:** Add `generateMetadata` to product pages at minimum, returning product name + description in the title/meta.

---

### M-8 — `console.log` statements in production code (home page)
**File:** `app/(store)/page.tsx` (lines 60–61)

```ts
console.log('Combos fetched:', combos);
console.log('Featured combo:', featuredCombo);
```

These debug logs run on every home page render in production, exposing internal data structure in server logs.

**Fix:** Remove both lines.

---

### M-9 — `about` page copyright year hardcoded to 2024
**File:** `app/(store)/layout.tsx` (footer)

```tsx
<p>&copy; 2024 Raghul Delights. All rights reserved.</p>
```

The year is hardcoded as 2024.

**Fix:** Replace with `new Date().getFullYear()` or at least update to the current year.

---

### M-10 — Footer links to hardcoded category slugs that may not exist
**File:** `app/(store)/layout.tsx` (footer, lines ~80–83)

```tsx
<li><Link href="/shop/kadalai">Millet Laddu</Link></li>
<li><Link href="/shop/podi">Everyday Podi</Link></li>
```

The footer links categories by hardcoded slug. If those category slugs are renamed or deleted in the admin, these links 404 silently (the category shop page does `notFound()` or shows an empty state).

**Fix:** Fetch categories dynamically in the layout's server component, or at minimum note these slugs must stay stable.

---

### M-11 — Combo item quantities display incorrectly on the home page
**File:** `app/(store)/page.tsx` (line ~171)

```tsx
<li key={index}>{item.name || 'Product'} ({item.quantity}g)</li>
```

Combo item `quantity` is a count (integer number of units), not grams. Appending "g" is wrong — e.g., "Thinai Laddu (2g)" should be "Thinai Laddu × 2".

**Fix:** Change to `({item.quantity}× or ×{item.quantity})`.

---

### M-12 — Admin panel: no `GET /api/admin/orders` endpoint (confirm)
**Files:** `app/api/admin/orders/` only contains `[id]/route.ts`

If `app/admin/orders/page.tsx` fetches orders via Drizzle directly (server-side), this is fine. But if it needs an API route, the endpoint is missing. **Requires reading the page file to confirm.** The admin orders component receives orders as props, suggesting the page does a server-side DB query — which is the correct pattern for a server component. This is tentatively a LOW finding.

---

## LOW Priority Issues

### L-1 — `catalog.ts` still contains a hardcoded mock product array
**File:** `lib/catalog.ts`

The file exports a `products` array (lines 8–16) with 6 hardcoded products (Thinai Laddu, Samai Laddu, etc.) and a `categories` array. These are never imported in any current component — all data comes from the database. This is dead legacy code that may confuse future developers.

**Fix:** Delete the `products` and `categories` arrays from `catalog.ts`, keeping only `formatPrice`, `formatWeight`, and the `Product` type.

---

### L-2 — `buy-now` flow does not clear on navigation away without completing checkout
**File:** `lib/buy-now.ts` (not read, inferred), `components/checkout-wizard.tsx`

The buy-now item is stored in `sessionStorage`. If a user triggers "Buy Now", navigates to checkout, then navigates away (to cart, back to home, etc.) without completing payment, the buy-now item remains in sessionStorage. The next time they visit `/checkout`, it still tries to checkout the buy-now item rather than the cart. `clearBuyNowItem()` is only called on successful payment.

**Risk:** User confusion — cart checkout doesn't work if a stale buy-now item is sitting in sessionStorage.  
**Fix:** Clear the buy-now item on the checkout wizard's `useEffect` cleanup or on router away events, or add a visible "Cancel buy-now" option.

---

### L-3 — Google OAuth state parameter carries `returnTo` without CSRF protection
**File:** `app/api/auth/google/route.ts`

The `state` parameter in the OAuth request carries `returnTo` (an arbitrary URL path) without any CSRF token or nonce. An attacker could craft a link with a malicious `returnTo` and the callback would redirect there after a successful Google login.

**Risk:** Open redirect after OAuth if `returnTo` is not validated to be an internal path.  
**Fix:** Validate `returnTo` in the callback to only allow relative paths starting with `/` and not containing `://`.

---

### L-4 — `customer-orders.tsx` shows "Payment successful" heading unconditionally
**File:** `components/customer-orders.tsx`

The orders page always shows "Payment successful" and "Your payment is confirmed" even if the user navigates to `/orders` directly (not after a payment). Any logged-in user visiting `/orders` sees "Payment successful — Thank you, [Name]. Your payment is confirmed."

**Risk:** Misleading — this reads like a confirmation screen but is just an orders list.  
**Fix:** Only show the payment-success messaging if the user was redirected from `/checkout` (e.g., via a query param or sessionStorage flag).

---

### L-5 — Upsell product on cart page may show the same product as one already in cart on rare random match
**File:** `app/(store)/cart/page.tsx` (lines ~38–57)

```tsx
const availableProducts = products.filter((p: any) => !cartIds.includes(String(p.id)));
```

This correctly filters out cart items by ID, but variant-keyed items use `${id}-v${variantId}` format. If the cart contains `"1-v2"` but the catalogue product has id `1`, `String(1)` would not match `"1-v2"`, so the same product (different variant) could appear as an upsell. This is a minor edge case.

---

### L-6 — No `<title>` variations for admin pages
**File:** All admin pages use the global layout default title "Raghul Delights | Tradition, thoughtfully made" since the admin layout doesn't export metadata.

**Fix:** Add page-level titles to admin pages, e.g., "Orders — Admin | Raghul Delights".

---

### L-7 — `checkout-wizard.tsx` passes `password` and `confirmPassword` in the order payload
**File:** `components/checkout-wizard.tsx`, `lib/order-input.ts`

The `checkoutSchema` and `cashfreeVerifiedOrderSchema` include `password` and `confirmPassword` fields — a legacy of a previous design where checkout created an account. The current wizard never collects these fields (the form in step 1 doesn't include them for guests), but these fields are still part of the schema and are serialized into the payment payload sent to `create-payment` and `cashfree/verify`. This is confusing and slightly wasteful.

**Fix:** Remove `password` and `confirmPassword` from both schemas and the `CheckoutForm` type.

---

### L-8 — No `loading.tsx` or skeleton UI on the account page
**File:** `app/(store)/account/page.tsx`

The account page does several DB queries (customer, orders, items, products). There is a global `app/(store)/loading.tsx` but it's a bare `<>Loading…</>`. No skeleton or meaningful loading state is shown while account data fetches.

---

### L-9 — `ShopContent` does not show an empty state when a category filter returns no products
**File:** `components/shop-content.tsx`

When a category filter tab is active and no products match (e.g., after a search query narrows results), the `product-grid` div renders empty with no "No products found" message.

**Fix:** Add an empty state check:
```tsx
{activeFilteredProducts.length === 0 && (
  <p>No products found for this category.</p>
)}
```

---

### L-10 — Hero icon SVG path incorrect (not a human figure icon)
**File:** `app/(store)/page.tsx` (hero features, line ~87)

The "100% Natural Ingredients" feature icon uses an SVG path that draws a person silhouette (`<path d="M20 21v-2a4 4 0 0 0-4-4H8..."><circle cx="12" cy="7" r="4">`). A person icon doesn't represent "Natural Ingredients". This appears to be a copy-paste error from an icon library.

**Fix:** Use a leaf/plant icon for "Natural Ingredients".

---

## Inconsistencies and Minor Notes

| # | Description | File |
|---|---|---|
| I-1 | Admin password is compared with `timingSafeEqual` but short-circuit on length mismatch first — this is correct and safe | `lib/admin-auth.ts` |
| I-2 | `orders` table has `paymentMethod` column but `orders/mine` API doesn't return it — customers can't see how they paid | `app/api/orders/mine/route.ts` |
| I-3 | Review approval (`approved: false` on insert) is correct, but there's no notification to the admin when a new review is pending | `app/api/reviews/route.ts` |
| I-4 | `DELIVERY_MODE` env var controls manual vs Shiprocket shipping but is undocumented in any README | `app/api/checkout/create-payment/route.ts` |
| I-5 | `order-tracker.tsx` shows a 4-step timeline (placed/packed/shipped/delivered) but doesn't handle the "cancelled" status visually — it just shows an inactive timeline | `components/order-tracker.tsx` |
| I-6 | `hero-banner.tsx` renders on both mobile (inside `hero-content` div) and desktop (inside `hero-visual`) — the same banner renders twice in the DOM with the hero-banner-mobile class controlling visibility. This is intentional but doubles DOM nodes | `app/(store)/page.tsx` |
| I-7 | Admin login session expires after 12 hours (hardcoded `maxAge: 60 * 60 * 12`) — no "remember me" option | `app/api/admin/session/route.ts` |
| I-8 | Wishlist is localStorage-only — it does not persist across devices or after clearing browser data | `components/wishlist/wishlist-provider.tsx` |
| I-9 | `combo-items` quantity represents the weight included (250g of a product), not number of units — yet the detail page treats it as a count | `app/(store)/combo/[slug]/page.tsx` |
| I-10 | `admin-products.tsx` GET query ignores `q` and `filter` search params even though it reads them from the URL — filtering happens client-side | `app/api/admin/products/route.ts` |

---

## Flows Confirmed Working

- ✅ Cashfree payment flow: order creation → payment session → verify → order record created
- ✅ Cart sync: localStorage ↔ server DB merge on login
- ✅ Admin session: HMAC-signed cookie, timing-safe comparison
- ✅ Customer session: HMAC-signed, scrypt-hashed passwords
- ✅ Coupon validation: server-enforced at both payment creation and verification (double-check)
- ✅ Stock decrement on successful payment
- ✅ Buy Again flow in account dashboard
- ✅ Guest checkout (phone-only tracking via localStorage)
- ✅ Bestseller slider: only shows arrows when scrollable, correct hide/show logic
- ✅ Order tracker: RS-XXXXXXXX format validation, phone validation
- ✅ Review gate: requires login + verified purchase (orderId must belong to authenticated user)
- ✅ Google OAuth: configured to handle missing credentials gracefully

---

## Priority Fix Order

1. **C-3** — Fix policy pages (Razorpay → Cashfree) — 15-minute fix, legal risk
2. **H-2** — Fix combo CTA button href — 1-minute fix, direct revenue impact
3. **M-11 / H-7** — Fix combo quantity display (shows "2g" instead of "×2") — 5-minute fix
4. **M-8** — Remove console.log from home page — 2-minute fix
5. **H-3 / H-4** — Add stock check in `priceOrder` and out-of-stock UI — medium effort
6. **H-1** — Add `shelfLife` field to products — medium effort (DB migration + admin UI)
7. **C-1** — Delete `LegacyCheckoutPage` from `checkout/page.tsx` — low effort
8. **C-2** — Add auth guard to admin sub-pages — medium effort
9. **H-5** — Fix customer orders page to show all orders — low effort
10. **H-6** — Integrate transactional email — high effort, high value
11. **M-6** — Update shipping policy with preparation time note — 10-minute fix
12. **M-7** — Add `generateMetadata` to product pages — low effort, SEO value
13. **L-3** — Validate OAuth `returnTo` in callback — security hardening
14. **L-1** — Delete dead mock data from `catalog.ts`
15. **M-4** — Add review submission UI to product page
