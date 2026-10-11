# Implementation Plan — Raghul Snacks Site Fixes

**Date:** 2025-07-11  
**Based on:** site-audit-report.md + direct source reading  
**Build command:** `npm run build` (Next.js 14 App Router, no test framework present)  
**Lint command:** `npm run lint`

---

## Key Findings from Source Reading

- `app/(store)/checkout/page.tsx` — `CheckoutPage` renders `<CheckoutWizard />` correctly. `LegacyCheckoutPage` is a dead function never exported/called; it uses Razorpay JS SDK and `window.Razorpay`. Unused imports: `Link`, `Script`, `FormEvent`, `useEffect`, `useMemo`, `useState`, `useCart`, `formatPrice`, `styles` are **all shared with or unused by the active page** — only `styles` (from `./checkout.module.css`) is unused in the active page. The active `CheckoutPage` only needs `CheckoutWizard`. No `/api/razorpay/` directory exists.

- `app/admin/layout.tsx` — `"use client"`, uses `usePathname()` to skip sidebar on login. No auth check. `app/admin/page.tsx` uses `cookies()` + `isValidAdminSession` + `redirect()` — same pattern must be applied in the layout as a server component. `usePathname` must be extracted into a child client component since server components can't use it.

- `components/admin-settings.tsx` — Section heading says "Configure Razorpay payment integration" and fields are labelled "Razorpay Key ID" / "Razorpay Key Secret". `lib/cashfree.ts` uses env vars `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`.

- `app/(store)/policies/terms/page.tsx` — Line: `"Payments are processed securely by Razorpay."` — single occurrence.

- `app/(store)/policies/privacy/page.tsx` — "Razorpay" appears 3 times: in Payment information bullet, Data Sharing > Payment processors bullet, Data Security > secure payment processing bullet.

- `app/(store)/page.tsx` — `<Link href="/shop" className="button button-light">Get this combo…</Link>` — must change to `href={`/combo/${featuredCombo.slug}`}`. Combo item quantity rendered as `({item.quantity}g)` — must become `(×{item.quantity})`. Two `console.log` calls at lines 60-61.

- `app/(store)/combo/[slug]/page.tsx` — `{formatWeight(item.quantity.toString())}` renders quantity as weight (e.g. "2g"). Must change to `×{item.quantity}`.

- `lib/order-pricing.ts` — `priceOrder` fetches product by `baseId` and throws if not found, but never checks `product.stock`. Need to add: `if (product.stock !== null && product.stock < item.quantity) throw new Error(...)` after the product lookup.

- `components/product/product-detail-view.tsx` — No stock check. Buttons `handleAddToCart` and `handleBuyNow` are never disabled for out-of-stock. Add `const isOutOfStock = product.stock !== null && product.stock <= 0` guard.

- `components/product/product-card.tsx` — Uses `AddToCart` component (from `add-to-cart.tsx`). `AddToCart` takes a `product` prop but never checks `product.stock`. The card must pass a `disabled` prop or the card itself must show an out-of-stock overlay. Since `AddToCart` doesn't accept a `disabled` override, the card must conditionally render a disabled button and out-of-stock badge rather than `<AddToCart>` when stock is 0.

- `components/customer-orders.tsx` — `setOrder(accountData.orders[0])` — only first order shown. Must use a `orders` array state and render all. Also always shows "Payment successful" heading — must gate on `?success=true` query param.

- `app/(store)/layout.tsx` — Footer has `&copy; 2024`. Must become `{new Date().getFullYear()}`.

- `app/(store)/policies/shipping/page.tsx` — Processing Time section needs a sentence about 2–3 additional business days for made-to-order preparation.

- `app/(store)/product/[slug]/page.tsx` — No `generateMetadata` export. Has `product.name` and `product.description` available from the DB query.

- `lib/catalog.ts` — `products` array (6 mock items) and `categories` array are never imported anywhere. `formatPrice`, `formatWeight`, and `Product` type are imported by many components. Only the arrays must be deleted.

- `app/api/auth/google/callback/route.ts` — `const returnTo = searchParams.get("state") || "/account"` — then directly used in `NextResponse.redirect(new URL(returnTo, appUrl))`. No validation. Must validate: starts with `/`, no `://`.

- `components/shop-content.tsx` — `product-grid` div renders empty with no fallback. Three active tab branches each need an empty state guard.

- `components/checkout-wizard.tsx` — `buyNowItem` is read synchronously via `useState(() => readBuyNowItem())`. `clearBuyNowItem()` is called after successful payment AND when using the cart path. The `orderPlacedRef` tracks whether payment completed. On unmount without payment, `clearBuyNowItem` should be called if `buyNowItem` exists and `orderPlacedRef.current === false`. This requires a `useEffect` cleanup.

---

## Implementation Plan

- [ ] 1. **C-1 — Delete dead `LegacyCheckoutPage` from checkout page**  
      Remove the entire `LegacyCheckoutPage` function and the now-unused imports: `Link`, `Script`, `FormEvent`, `useEffect`, `useMemo`, `useState`, `useCart`, `formatPrice`, `styles`. The active `CheckoutPage` only imports `CheckoutWizard` — keep just that import plus the `"use client"` directive. Note: `/api/razorpay/` directory does NOT exist in this repo, so no deletion needed there.  
      Files: `app/(store)/checkout/page.tsx`  
      Verify: `npm run build` — no TypeScript errors; `npm run lint` passes.

- [ ] 2. **C-2 — Add server-side auth guard to admin layout**  
      Convert `app/admin/layout.tsx` from a client component to a server component. Remove `"use client"`, `usePathname`, and the pathname-based login skip. Add the server-side auth check using `cookies()`, `adminCookieName()`, and `isValidAdminSession()` exactly as `app/admin/page.tsx` does it — if not authenticated, `redirect("/admin/login")`. Since the login page is a child route of this layout, the redirect creates an infinite loop: guard by checking `if (!isValidAdminSession(cookie) && /* not login page */)`. The login page check cannot use `usePathname` in a server component — instead, accept that the layout wraps the login page too and gate differently: move the login page outside the admin layout, or — simpler — check the path from the request headers. **Decision:** use `headers()` from `next/headers` to read `x-pathname` is not reliable; the cleanest approach is to move admin login outside the layout by checking the pathname via `headers().get('x-invoke-path')`. Actually the simplest correct approach: keep the login page protected from the sidebar wrapper by extracting the sidebar wrapper into a small client component `AdminShell` that simply wraps children with the sidebar, and call it from the server component layout **after** the auth check — but only if the path is not `/admin/login`. Read the path using `headers()` — Next.js sets a header but it's not standardised. **Final decision:** use a different approach — extract the mobile sidebar toggle/pathname check into `AdminLayoutShell` client component, but perform the auth redirect server-side unconditionally. The login page lives at `app/admin/login/page.tsx` — it is its own route. The layout wraps it. If the layout always redirects unauthenticated users, the login page is inaccessible. To avoid this, check the referer/path: use `next/headers` `headers()` to read the Next.js internal `x-matched-path` or use the `connection()` API. **Simplest correct solution that matches the existing pattern:** keep `app/admin/login/page.tsx` outside the admin layout by restructuring the route group — but that's invasive. The pragmatic solution used across Next.js apps: the auth check in the layout should skip itself when the current route IS the login page; since we're in a server component, read the URL from `headers().get('referer')` is wrong. **Correct solution:** use `headers()` to read the `next-url` header which Next.js sets to the pathname. Implement:
      ```ts
      import { headers } from "next/headers"
      const headersList = await headers()
      const pathname = headersList.get("x-pathname") ?? headersList.get("next-url") ?? ""
      if (!pathname.startsWith("/admin/login")) { /* auth check */ }
      ```
      Actually the most reliable and common pattern in Next.js 14 app router is to put the auth guard in `middleware.ts`. But since the task says "convert layout to server component," implement it in the layout using the pathname from the `NextRequest`-equivalent. Since `layout.tsx` is a server component and Next.js doesn't provide the request object there, the correct approach is: call `redirect()` without the login page exception — and move `app/admin/login/page.tsx` out of the `app/admin/` layout scope by placing it at `app/admin/login/page.tsx` with its own standalone layout (or no layout). Check whether `app/admin/login/` has its own `layout.tsx`. Since none exists, the admin layout currently wraps the login page. The fix: the layout server component performs the auth check; if it would redirect the login page, the result is an infinite redirect loop — this is exactly why the existing code skips the sidebar for the login page. **Adopted approach:** Convert to server component. Add `import { headers } from "next/headers"` and read `headers().get("x-pathname")`. In Next.js App Router, this header is not set by the framework — but `next-url` is set by the middleware. Since no middleware exists, use a fallback: check whether the `cookie` value matches the admin cookie name — if the cookie is present and valid, render children normally; if cookie is absent/invalid, redirect to `/admin/login` — BUT skip the redirect if the current pathname is exactly `/admin/login`. The only way to know the pathname in a server layout without middleware is to check `headers().get("x-invoke-path")` (internal Next.js header present in some versions) or simply accept that the login page needs its own route group. **Final adopted approach (simplest, works reliably):** Create `app/admin/(protected)/layout.tsx` as the auth-guarded server layout; move all admin sub-pages under `(protected)` and leave `app/admin/login/` at the current location outside the group. However, this reorganises the route structure which is a large change. **Actual simplest approach that doesn't restructure routes:** Keep the layout server component and check via a custom request header set by middleware. Since adding middleware is the correct Next.js pattern for auth guards, and it avoids all the above complications: **add `middleware.ts`** at the repo root that checks the admin cookie on any `/admin/*` route (excluding `/admin/login`) and redirects to `/admin/login` if not authenticated. Convert the layout to a server component that just renders the sidebar without auth logic (the middleware handles it). This is correct, robust, and minimal.  
      Files: `app/admin/layout.tsx` (convert to server component, remove `"use client"`, keep sidebar rendering), `middleware.ts` (create new — guard `/admin/*` except `/admin/login`)  
      Verify: `npm run build` passes. Manually confirm `/admin/orders` redirects to `/admin/login` without a valid cookie; `/admin/login` remains accessible.

- [ ] 3. **C-3 — Replace Razorpay references with Cashfree**  
      (a) In `app/(store)/policies/terms/page.tsx`: replace `"Payments are processed securely by Razorpay."` with `"Payments are processed securely by Cashfree."`.  
      (b) In `app/(store)/policies/privacy/page.tsx`: replace all 3 occurrences of "Razorpay" with "Cashfree" — in the Payment information bullet, Data Sharing > Payment processors bullet, and Data Security > secure payment processing bullet.  
      (c) In `components/admin-settings.tsx`: change section description from `"Configure Razorpay payment integration."` to `"Configure Cashfree payment integration."`. Change label `"Razorpay Key ID"` to `"Cashfree Client ID"` and placeholder `"rzp_test_xxxxxxxxxxxx"` to match Cashfree format (e.g. `"TEST_xxxxxxxxxx"`). Change label `"Razorpay Key Secret"` to `"Cashfree Client Secret"`. These match the env vars `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` used in `lib/cashfree.ts`.  
      Files: `app/(store)/policies/terms/page.tsx`, `app/(store)/policies/privacy/page.tsx`, `components/admin-settings.tsx`  
      Verify: `npm run build` passes. Grep confirms zero occurrences of "Razorpay" in these three files post-edit.

- [ ] 4. **H-2 — Fix combo "Get this combo" button href on home page**  
      In `app/(store)/page.tsx`, change `<Link href="/shop" className="button button-light">` to `<Link href={`/combo/${featuredCombo.slug}`} className="button button-light">`. `featuredCombo` is already in scope and non-null at this render point (it's inside the `{featuredCombo && featuredCombo.title && (` guard).  
      Files: `app/(store)/page.tsx`  
      Verify: `npm run build` passes.

- [ ] 5. **H-7 / M-11 — Fix combo item quantity display ("2g" → "×2")**  
      (a) In `app/(store)/combo/[slug]/page.tsx`: replace `{formatWeight(item.quantity.toString())}` with `×{item.quantity}`. Remove the `formatWeight` import if it is no longer used in this file.  
      (b) In `app/(store)/page.tsx`: replace `({item.quantity}g)` with `(×{item.quantity})`.  
      Files: `app/(store)/combo/[slug]/page.tsx`, `app/(store)/page.tsx`  
      Verify: `npm run build` passes.

- [ ] 6. **M-8 — Remove console.log from home page**  
      In `app/(store)/page.tsx`, delete the two lines:
      ```ts
      console.log('Combos fetched:', combos);
      console.log('Featured combo:', featuredCombo);
      ```
      Files: `app/(store)/page.tsx`  
      Verify: `npm run build` passes; `npm run lint` passes (no `no-console` violations).

- [ ] 7. **M-9 — Fix hardcoded copyright year in footer**  
      In `app/(store)/layout.tsx`, replace `&copy; 2024 Raghul Delights.` with `&copy; {new Date().getFullYear()} Raghul Delights.`. Since this is a server component, the expression evaluates at render time.  
      Files: `app/(store)/layout.tsx`  
      Verify: `npm run build` passes.

- [ ] 8. **H-3/H-4 — Stock check in order-pricing.ts**  
      In `lib/order-pricing.ts`, inside the `lines = parsed.map(...)` callback, after `const product = dbProducts.find(...)` and the `if (!product)` throw, add a stock check:
      ```ts
      if (product.stock !== null && product.stock < item.quantity) {
        throw new Error(`"${product.name}" is out of stock or has insufficient stock.`);
      }
      ```
      This runs server-side during payment creation, preventing overselling.  
      Files: `lib/order-pricing.ts`  
      Verify: `npm run build` passes.

- [ ] 9. **H-3/H-4 — Out-of-stock UI in product-detail-view.tsx**  
      In `components/product/product-detail-view.tsx`, add an `isOutOfStock` constant after the existing state declarations:
      ```ts
      const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
      ```
      Then:
      - Add an "Out of Stock" badge near the price section when `isOutOfStock` is true (e.g. a `<span className="out-of-stock-badge">Out of Stock</span>`).
      - Disable the "Add to Cart" button: `disabled={isAdded || isOutOfStock}` and update the button text condition: show `"Out of Stock"` instead of `"Add to Cart"` when out of stock.
      - Disable the "Buy Now" button: `disabled={redirecting || isOutOfStock}`.
      - Do NOT show available stock count — the requirement is only to show "Out of Stock" when stock is 0, never to show the actual count.  
      Files: `components/product/product-detail-view.tsx`  
      Verify: `npm run build` passes.

- [ ] 10. **H-3/H-4 — Out-of-stock UI in product-card.tsx**  
       In `components/product/product-card.tsx`, add an `isOutOfStock` check:
       ```ts
       const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
       ```
       In the `product-actions` div, when `isOutOfStock` is true, render a disabled button with "Out of Stock" label instead of `<AddToCart product={cartProduct} showModal={true} />`. Add a visual badge (`<b className="out-of-stock-label">Out of Stock</b>` or similar) on the `product-visual` area, styled like the existing `<b>Bestseller</b>` badge. Do not use `<AddToCart>` for out-of-stock products since that component has no `disabled` prop.  
       Files: `components/product/product-card.tsx`  
       Verify: `npm run build` passes.

- [ ] 11. **H-5 — Show all orders in customer-orders.tsx**  
       In `components/customer-orders.tsx`:
       - Change state from `const [order, setOrder] = useState<CustomerOrder | null>(null)` to `const [orders, setOrders] = useState<CustomerOrder[]>([])`.
       - In `loadOrder`, change `if (accountResponse.ok && accountData.orders?.[0]) { setOrder(accountData.orders[0]); return; }` to `if (accountResponse.ok && accountData.orders?.length) { setOrders(accountData.orders); return; }`.
       - Update the null/empty check: instead of `if (!order)` show the lookup fallback, use `if (!orders.length && !saved)` (also handle the guest-tracked single order: keep `order` state for the guest-tracked single order separately, or merge it — simplest is to keep a separate `trackedOrder` state for the guest case).
       - The rendered output: when `orders.length > 0`, render a list of all orders. Each order row shows: order number, date (formatted), status badge, total, and a "View Details" expansion or inline summary. The most recent order (first in array, as the API returns desc order) shows the full status timeline; older orders show a condensed summary row. This avoids a full redesign while fixing the bug.
       - For the guest single-order case (`saved` path), keep existing single-order behaviour.  
       Files: `components/customer-orders.tsx`  
       Verify: `npm run build` passes.

- [ ] 12. **L-4 — Conditional "Payment successful" heading in customer-orders.tsx**  
       In `components/customer-orders.tsx`, add a check for the `?success=true` query parameter using `useSearchParams()`. Import `useSearchParams` from `"next/navigation"`.
       ```ts
       const searchParams = useSearchParams();
       const isPostPayment = searchParams.get("success") === "true";
       ```
       Show the `<p className="eyebrow">Payment successful</p>` / `<h1>Thank you…</h1>` / `<p>Your payment is confirmed…</p>` block only when `isPostPayment` is true. When false, show `<h1>Your Orders</h1>` as the heading.  
       Update `components/checkout-wizard.tsx`: when redirecting after successful payment, change `window.location.assign("/orders")` to `window.location.assign("/orders?success=true")`.  
       Files: `components/customer-orders.tsx`, `components/checkout-wizard.tsx`  
       Verify: `npm run build` passes.

- [ ] 13. **L-2 — Clear stale buy-now item on checkout wizard unmount**  
       In `components/checkout-wizard.tsx`, add a `useEffect` cleanup that clears the buy-now item if the user navigates away before completing payment. The `orderPlacedRef` already tracks whether payment completed. Add:
       ```ts
       useEffect(() => {
         return () => {
           if (buyNowItem && !orderPlacedRef.current) {
             clearBuyNowItem();
           }
         };
       }, [buyNowItem]);
       ```
       Place this after the existing `useEffect` blocks. The `buyNowItem` is read once via `useState` initializer and is stable.  
       Files: `components/checkout-wizard.tsx`  
       Verify: `npm run build` passes.

- [ ] 14. **M-6 — Update shipping policy with made-to-order preparation time**  
       In `app/(store)/policies/shipping/page.tsx`, replace the Processing Time paragraph:
       > "Orders are processed within 1-2 business days. Since our snacks are made in small batches to ensure freshness, some items may require additional preparation time."
       
       with:
       > "All our snacks are freshly prepared after your order is placed, in small batches to ensure the best quality and flavour. Please allow 2–3 additional business days for preparation before your order is dispatched. Total delivery time = preparation time (2–3 days) + transit time shown below."
       
       Files: `app/(store)/policies/shipping/page.tsx`  
       Verify: `npm run build` passes.

- [ ] 15. **M-7 — Add generateMetadata to product detail page**  
       In `app/(store)/product/[slug]/page.tsx`, add a `generateMetadata` export above the default page export:
       ```ts
       export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
         const { slug } = await params;
         const product = await getProduct(slug);
         if (!product) return {};
         return {
           title: `${product.name} | Raghul Delights`,
           description: product.description || `Buy ${product.name} — handcrafted, fresh millet snacks from Raghul Delights.`,
         };
       }
       ```
       The `getProduct` function is already defined in the same file. Call it a second time here — this is the standard Next.js pattern; Next.js deduplicates fetch/DB calls via React cache when using `cache()`, but since `getProduct` is not wrapped in `cache()`, it will run twice. This is acceptable for a server-side DB read at the page level.  
       Files: `app/(store)/product/[slug]/page.tsx`  
       Verify: `npm run build` passes.

- [ ] 16. **L-1 — Delete dead mock data from catalog.ts**  
       In `lib/catalog.ts`, delete the `products: Product[]` array (lines 8–16) and the `categories` array. Keep: the `Product` type export, `formatPrice`, and `formatWeight`. Before deleting, confirm no file imports the `products` or `categories` named exports from `@/lib/catalog` — search across the codebase.  
       Files: `lib/catalog.ts`  
       Verify: `npm run build` passes (TypeScript will error if any import of `products`/`categories` from this file exists).

- [ ] 17. **L-3 — Validate OAuth returnTo to prevent open redirect**  
       In `app/api/auth/google/callback/route.ts`, after `const returnTo = searchParams.get("state") || "/account"`, add validation:
       ```ts
       const safeReturnTo = (returnTo.startsWith("/") && !returnTo.includes("://")) ? returnTo : "/account";
       ```
       Then replace all uses of `returnTo` in the redirect with `safeReturnTo`. There is one use: `NextResponse.redirect(new URL(returnTo, appUrl))`.  
       Files: `app/api/auth/google/callback/route.ts`  
       Verify: `npm run build` passes.

- [ ] 18. **M-9 (shop-content) — Add empty state to ShopContent**  
       In `components/shop-content.tsx`, after the `product-grid` div opening tag, add empty-state guards for each of the three active tab cases:
       - `activeTab === 'products'` and `filteredProducts.length === 0`: show `<p className="empty-state">No products found.</p>`
       - `activeTab === 'combos'` and `filteredCombos.length === 0`: show `<p className="empty-state">No combos found.</p>`
       - Category tab active and filtered result empty: show `<p className="empty-state">No products found in this category.</p>`
       
       Move the rendering logic so each branch renders the empty state when its list is empty.  
       Files: `components/shop-content.tsx`  
       Verify: `npm run build` passes.

---

## Dependency Order

Items 1–7 are independent of each other (different files) and can be done in any order.  
Item 8 (stock in order-pricing) must come before items 9–10 (stock UI) — conceptually related but independently implementable.  
Item 11 (show all orders) and item 12 (conditional heading) both touch `customer-orders.tsx` — do them together in sequence (11 then 12) to avoid merge conflicts.  
Item 13 (checkout unmount cleanup) and item 12 (redirect URL change) both touch `checkout-wizard.tsx` — do 12 first (it changes the `window.location.assign` line), then 13 adds a new `useEffect`.  
Items 14–18 are independent.

## Files NOT to touch

- `app/api/razorpay/` — does not exist, nothing to delete.
- `drizzle/schema.ts` — no schema migrations in this plan.
- `components/checkout-wizard.module.css` — no style changes required.
- Any admin page files beyond `layout.tsx` and `middleware.ts` for C-2.
