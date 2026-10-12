# Implementation Plan — Backend & UX Fixes

Project: Raghul Snacks (`e:\work\raghul-snacks\raghul-snacks`)  
Build command: `npm run build`  
Type-check: `npx tsc --noEmit`  
No automated test suite — verification is TypeScript clean + successful `npm run build`.

---

## Fix M-1 — Eliminate N+1 queries on the account page

### What was found

`app/(store)/account/page.tsx` runs three nested query loops:
1. Fetch all orders for the customer email.
2. For each order → `Promise.all` to fetch its `orderItems`.
3. For each item → up to two product lookups (by id, then by name fallback).

This produces O(orders × items × 2) sequential DB round-trips. The `AccountDashboard` component already types `Order.items[]` with a `product` field — so only the data-fetch layer needs to change, not the UI.

`app/api/orders/mine/route.ts` is a separate client-facing endpoint; it currently returns no item data.

---

- [ ] 1. Replace the nested loops in `app/(store)/account/page.tsx` with a single three-way join query.

  **What to do:**  
  Import `inArray` from `drizzle-orm`. After fetching `customerOrders` (the existing single-query for orders), run one `orderItems` query filtered by all order IDs at once using `inArray(orderItems.orderId, orderIds)`. Then run one `products` query using `inArray(products.id, productIds)` for all unique product IDs collected from those items. In memory: build a Map of products by id; build a Map of items-by-orderId; then combine into the `ordersWithItems` array the component already expects. Keep the name-based fallback lookup only when `productId` is null — do that in memory against the products already fetched (match by `item.name` against `product.name`), not with an extra DB query. Preserve the output shape exactly (each order has `total: String`, `discount: String`, `couponCode`, `createdAt: string`, and `items[]` with `product | null`).

  **Files:** `app/(store)/account/page.tsx`

  **Verify:** `npx tsc --noEmit` — no new TypeScript errors. `npm run build` completes successfully.

---

- [ ] 2. Update `app/api/orders/mine/route.ts` to include items with basic product info.

  **What to do:**  
  After the existing orders query, collect all order IDs, fetch all matching `orderItems` rows in one `inArray` query, fetch all matching `products` in one `inArray` query (by the distinct productIds from those items). Build the same in-memory grouping as item 1. Append an `items` array to each order in the response. Import `inArray` and the `orderItems`, `products` tables. Add `paymentMethod` to the selected columns of the orders query (it is already in the schema but missing from this route). Keep the existing response shape for all other fields.

  **Files:** `app/api/orders/mine/route.ts`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix M-3 — Category-aware product recommendations

### What was found

`app/(store)/product/[slug]/page.tsx` does `.filter(item => item.id !== product.id).slice(0, 3)` — a random slice of all products. The `product` object already has `categoryId` from the `getProduct()` query. `allProducts` is already fetched via `getProductsWithVariants` which returns `categoryId` on each item. No extra DB call is needed.

---

- [ ] 3. Change the recommendations logic in `app/(store)/product/[slug]/page.tsx` to prefer same-category products.

  **What to do:**  
  Replace the single `recommendations` line:
  ```
  const recommendations = allProducts.filter(item => item.id !== product.id).slice(0, 3);
  ```
  with:
  ```ts
  const others = allProducts.filter((item: any) => item.id !== product.id);
  const sameCat = product.categoryId
    ? others.filter((item: any) => item.categoryId === product.categoryId)
    : [];
  const diffCat = others.filter((item: any) => item.categoryId !== product.categoryId);
  const recommendations = [...sameCat, ...diffCat].slice(0, 3);
  ```
  No other change needed.

  **Files:** `app/(store)/product/[slug]/page.tsx`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix M-5 — Cart page upsell: limit products API response

### What was found

`app/(store)/cart/page.tsx` calls `fetch('/api/products')` which runs `getProductsWithVariants` — returning every product — just to randomly pick one upsell. The route already filters by `category`, `featured`, `bestseller` but has no `limit` param. Adding `?limit=10` trims the payload to ~10 items.

---

- [ ] 4. Add `?limit=N` support to `app/api/products/route.ts`.

  **What to do:**  
  After all existing filters are applied, read `searchParams.get("limit")`, parse it to an integer with `parseInt`. If it is a valid positive integer, slice `result` to that length: `result = result.slice(0, limit)`. Place this slice as the very last step before `NextResponse.json(result)`.

  **Files:** `app/api/products/route.ts`

  **Verify:** `npx tsc --noEmit` — no errors.

---

- [ ] 5. Update the cart page upsell fetch to use `?limit=10`.

  **What to do:**  
  In `app/(store)/cart/page.tsx`, change the single `fetch("/api/products")` call inside `fetchUpsellProduct` to `fetch("/api/products?limit=10")`. No other change needed.

  **Files:** `app/(store)/cart/page.tsx`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix I-2 — Show payment method in order history

### What was found

`components/account-dashboard.tsx`:  
- The `Order` type already has `paymentMethod?: string | null`.  
- In the orders list, each order row renders a status badge and a price, but no payment method label.  
- The badge rendering block (the spread of a `Record<string, CSSProperties>` keyed by `order.orderStatus`) is near where the payment method label should appear.

`components/customer-orders.tsx`:  
- The `CustomerOrder` type does **not** include `paymentMethod` — it needs to be added.  
- The summary aside shows `paymentStatus` ("Paid · Cashfree") but not payment method.

Mapping rule:
- `'cod'` or `'cash_on_delivery'` → `'Cash on Delivery'`
- Any other non-null value → `'Online Payment'`
- `null` / `undefined` → show nothing

---

- [ ] 6. Add payment method label to the order row in `components/account-dashboard.tsx`.

  **What to do:**  
  Inside the `orders.map` render in the orders list section, after the existing `<span>` that shows the order status badge and `<strong>` that shows the price, add a small inline `<span>` that shows the payment method label. Only render it when `order.paymentMethod` is not null/undefined. Derive the label with a helper inline expression:
  ```ts
  const pmLabel = (pm: string | null | undefined) =>
    !pm ? null
    : (pm === 'cod' || pm === 'cash_on_delivery') ? 'Cash on Delivery'
    : 'Online Payment';
  ```
  Style it as a small muted tag consistent with the existing badge style — e.g., `fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#6b7280', background: '#f3f4f6', borderRadius: 4, padding: '2px 8px'`. Place it immediately after the order status badge `<span>` inside the flex row div that holds the badge and price.

  **Files:** `components/account-dashboard.tsx`

  **Verify:** `npx tsc --noEmit` — no errors.

---

- [ ] 7. Add `paymentMethod` to `CustomerOrder` type in `components/customer-orders.tsx` and show it in the summary aside.

  **What to do:**  
  1. Add `paymentMethod?: string | null` to the `CustomerOrder` type at the top of the file.  
  2. In the summary aside section, the existing `<div>` that shows `paymentStatus` has: `{displayOrder.paymentStatus === "paid" ? "Paid · Cashfree" : displayOrder.paymentStatus}`. After that `<strong>`, add a second `<div>` row (same layout — `<span>` label + `<strong>` value) for payment method, only when `displayOrder.paymentMethod` is not null. Use the same mapping: `cod`/`cash_on_delivery` → 'Cash on Delivery', anything else non-null → 'Online Payment'. Use `<span>Method</span>` as the label.

  **Files:** `components/customer-orders.tsx`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix I-3 — Admin sidebar badge: only fetch pending reviews

### What was found

`components/admin-sidebar.tsx`:  
- The `useEffect` calls `fetch("/api/admin/reviews")`, gets the full array, and filters `.filter(r => !r.approved).length` client-side.  
- That works but sends all reviews over the wire.

`app/api/admin/reviews/route.ts`:  
- The GET handler accepts no query params; it always returns all rows with a left join to products.  
- The `eq` import is already present. `reviews.approved` exists in the schema as a boolean column.

Adding `?pending=true` makes the DB do the filter; the sidebar then uses `d.length` directly.

---

- [ ] 8. Add `?pending=true` filter support to `app/api/admin/reviews/route.ts`.

  **What to do:**  
  Change the function signature to `GET(request: NextRequest)` (add `NextRequest` import from `"next/server"`). Read `request.nextUrl.searchParams.get("pending")`. If it equals `"true"`, add `.where(eq(reviews.approved, false))` to the Drizzle query (use `and()` if other where clauses exist in the future — for now just a single where is fine). When `pending` is not `"true"`, return all rows as before. No change to the response shape.

  **Files:** `app/api/admin/reviews/route.ts`

  **Verify:** `npx tsc --noEmit` — no errors.

---

- [ ] 9. Update `components/admin-sidebar.tsx` to call `/api/admin/reviews?pending=true` and use `d.length` directly.

  **What to do:**  
  In the `useEffect`, change:
  ```ts
  fetch("/api/admin/reviews")
    .then(r => r.json())
    .then((d: Array<{ approved: boolean }>) => {
      if (Array.isArray(d)) setPendingReviews(d.filter(r => !r.approved).length);
    })
  ```
  to:
  ```ts
  fetch("/api/admin/reviews?pending=true")
    .then(r => r.json())
    .then((d: Array<{ approved: boolean }>) => {
      if (Array.isArray(d)) setPendingReviews(d.length);
    })
  ```
  The type annotation on `d` can stay the same (the shape is identical; we just stop filtering client-side).

  **Files:** `components/admin-sidebar.tsx`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix I-5 — Cancelled order status in order tracker

### What was found

`components/order-tracker.tsx`:  
- There is **already** a `cancelledBanner` CSS class in `order-tracker.module.css` with correct red styling (background `#fee2e2`, border `#dc2626`, color `#991b1b`).  
- There is **already** a conditional block:
  ```tsx
  {result.orderStatus === "cancelled" ? (
    <div className={styles.cancelledBanner}>…</div>
  ) : (
    <div className={styles.timeline}>…</div>
  )}
  ```
  So the cancelled banner is **already showing** and the timeline is already hidden for cancelled orders. The status icon (`.statusIcon`) always uses the same two SVGs: a checkmark for delivered, a box icon for everything else. There is no X icon for cancelled.

`components/customer-orders.tsx`:  
- The `<ol className={styles.timeline}>` always renders all 4 stages with the `done` class applied up to `stageIndex`. For `cancelled`, `stages.indexOf("cancelled")` returns `-1`, so `stageIndex = -1` and no stage gets `done` — the timeline shows all stages as inactive. There is no cancelled banner.  
- `customer-orders.module.css` does **not** have a `cancelledBanner` class.

**Decision:** In `order-tracker.tsx` the banner and hidden-timeline logic already works correctly; the only missing piece is the X icon for cancelled in `.statusIcon`. In `customer-orders.tsx`, add a cancelled banner above the timeline and make all timeline items appear muted when cancelled, without removing the existing timeline rendering (keep the stages visible, just none highlighted).

---

- [ ] 10. Add X icon for cancelled status in `components/order-tracker.tsx`.

  **What to do:**  
  The `.statusIcon` div currently renders:
  ```tsx
  {result.orderStatus === "delivered"
    ? <svg …checkmark…/>
    : <svg …box…/>
  }
  ```
  Change it to a three-branch ternary:
  ```tsx
  {result.orderStatus === "delivered"
    ? <svg …checkmark…/>
    : result.orderStatus === "cancelled"
    ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    : <svg …box…/>
  }
  ```
  No other change needed — the banner and hidden-timeline logic already exist.

  **Files:** `components/order-tracker.tsx`

  **Verify:** `npx tsc --noEmit` — no errors.

---

- [ ] 11. Add cancelled treatment to the timeline in `components/customer-orders.tsx`.

  **What to do:**  
  The `CustomerOrders` component renders an `<ol className={styles.timeline}>` unconditionally. Add a cancelled banner above it and apply an `opacity: 0.4` style to the `<ol>` when `displayOrder.orderStatus === "cancelled"`:

  1. Add a `cancelledBanner` CSS class to `components/customer-orders.module.css`:
     ```css
     .cancelledBanner {
       display: flex;
       align-items: center;
       gap: 10px;
       margin: 0 0 20px;
       padding: 14px 18px;
       background: #fee2e2;
       border: 2px solid #dc2626;
       border-radius: 10px;
       color: #991b1b;
       font-size: 15px;
       font-weight: 600;
     }
     ```

  2. In `components/customer-orders.tsx`, just before the `<ol className={styles.timeline}>`, add:
     ```tsx
     {displayOrder.orderStatus === "cancelled" && (
       <div className={styles.cancelledBanner}>
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
         </svg>
         This order has been cancelled.
       </div>
     )}
     ```

  3. Add `style={{ opacity: displayOrder.orderStatus === "cancelled" ? 0.4 : 1 }}` to the `<ol>` element. This keeps the timeline visible but clearly muted — no stage is `done` because `stageIndex` is already `-1` for `"cancelled"`.

  **Files:** `components/customer-orders.tsx`, `components/customer-orders.module.css`

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes.

---

## Fix L-8 — Skeleton/loading state for the account page

### What was found

- `app/(store)/account/page.tsx` is a server component; it awaits multiple DB queries before rendering.
- There is **no** `app/(store)/account/loading.tsx` — the directory only contains `page.tsx`.
- `app/(store)/loading.tsx` exists and renders a full-screen spinner — that covers all routes under `(store)` including `/account`. However, Next.js route-segment-level `loading.tsx` files are more specific: if `app/(store)/account/loading.tsx` exists it will be shown while the account page's server component is suspending, providing a page-shaped skeleton instead of the generic spinner.
- `components/account-dashboard.module.css` defines `.hero`, `.card`, `.content`, `.heroContent` with the exact CSS variables (`var(--cream)`, `var(--line)`, `var(--ink)`, `var(--paper)`) to match.

**Decision:** Create `app/(store)/account/loading.tsx` with inline styles (no new CSS module) using a CSS shimmer animation via a `<style>` tag. The skeleton mirrors the page structure: a hero bar placeholder, an account details card with 3 shimmer rows, and a placeholder for the orders/messages buttons.

---

- [ ] 12. Create `app/(store)/account/loading.tsx` with a skeleton UI.

  **What to do:**  
  Create the file with a default export `AccountLoading`. Use inline styles only — no new `.module.css` file. Include a `<style>` tag with the shimmer keyframe animation and a `.shimmer` class. The layout must match `AccountDashboard`'s DOM structure:

  ```tsx
  export default function AccountLoading() {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position: 600px 0; }
          }
          .acct-shimmer {
            background: linear-gradient(90deg, var(--line) 25%, var(--paper) 50%, var(--line) 75%);
            background-size: 600px 100%;
            animation: shimmer 1.4s ease-in-out infinite;
            border-radius: 6px;
          }
        `}</style>

        {/* Hero placeholder */}
        <div style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)", padding: "40px 16px" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div className="acct-shimmer" style={{ height: 36, width: 160, marginBottom: 10 }} />
            <div className="acct-shimmer" style={{ height: 18, width: 280 }} />
          </div>
        </div>

        {/* Account details card placeholder */}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <div className="acct-shimmer" style={{ height: 24, width: 140 }} />
              <div className="acct-shimmer" style={{ height: 32, width: 80, borderRadius: 8 }} />
            </div>
            {/* 3 info rows */}
            {[200, 240, 180].map((w, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: i < 2 ? 16 : 0 }}>
                <div className="acct-shimmer" style={{ height: 11, width: 60 }} />
                <div className="acct-shimmer" style={{ height: 18, width: w }} />
              </div>
            ))}
            {/* Buttons placeholder */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
              <div className="acct-shimmer" style={{ height: 44, width: 140, borderRadius: 10 }} />
              <div className="acct-shimmer" style={{ height: 44, width: 140, borderRadius: 10 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

  **Files:** `app/(store)/account/loading.tsx` (create new)

  **Verify:** `npx tsc --noEmit` — no errors. `npm run build` completes. Navigating to `/account` while the server component is loading should show the skeleton rather than a blank screen (or the generic spinner from `app/(store)/loading.tsx`).

---

## Final verification

- [ ] 13. Run full TypeScript check and production build.

  **What to do:**  
  After all 12 items above are complete:
  1. Run `npx tsc --noEmit` — must exit with 0 errors.
  2. Run `npm run build` — must complete without errors.
  
  Fix any TypeScript or build errors before marking this done. Common things to watch: `inArray` needs its second argument to be a non-empty array — add a guard (`if (ids.length === 0) return []`) before any `inArray` query so Drizzle doesn't throw on an empty array.

  **Files:** none (verification step only)

  **Verify:** Both commands exit cleanly with no errors.
