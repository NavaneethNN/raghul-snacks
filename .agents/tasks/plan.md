# Implementation Plan — Product Card Variant Enhancements

## What we found

- **`product-card.tsx`** uses `product: any`; reads `product.offerPrice`, `product.price`, `product.weight` directly. No variant awareness.
- **`app/api/products/route.ts`** does a single `SELECT … LEFT JOIN categories` — no variant join.
- **`app/(store)/page.tsx`** (home), **`app/(store)/shop/page.tsx`**, and **`app/(store)/shop/[category]/page.tsx`** each have their own inline `getProducts()` that duplicate the same query without variants.
- **`components/shop-content.tsx`** is a pure client component that receives products as props — no fetching of its own.
- **`app/(store)/wishlist/page.tsx`** renders products from the wishlist context (saved in localStorage via `useWishlist`). Products get into the wishlist when the user clicks the WishlistButton, which stores the `cartProduct` object constructed in `ProductCard`. The wishlist page has its own inline card rendering (not using `ProductCard`). It does NOT fetch from the DB at render time — it reads stored items. **Variant data should flow through the wishlist automatically once `ProductCard` stores variants in `cartProduct`**, but the wishlist page's inline rendering also needs the same variant-aware price/weight/icon logic.
- **`drizzle/schema.ts`** — `productVariants` table: `id`, `productId` (FK → products.id, cascade delete), `weight`, `price`, `offerPrice`, `sortOrder`, `active`, `createdAt`.
- **`lib/catalog.ts`** — `formatPrice` and `formatWeight` are stable helpers; use them as-is.
- **Build**: `npm run build` (Next.js, no test framework exists). Verification is TypeScript compile (`npx tsc --noEmit`) plus a build.
- **Badge position**: `.product-visual b` sits `top: 8px; left: 8px; z-index: 2`. The stack icon must go `top: 8px; right: 8px; z-index: 2` to mirror it.

---

## Implementation Plan

- [ ] 1. Create a shared `getProductsWithVariants` helper in `lib/db-queries.ts`.

  Write and export an async function `getProductsWithVariants(db, filters?)` that:
  1. Runs the existing products + categories LEFT JOIN query (same columns as all current `getProducts()` calls).
  2. Immediately after, runs a second query: `SELECT * FROM product_variants WHERE active = true` — fetch all active variants at once.
  3. Groups variants by `productId`, sorts each group by `sortOrder ASC, id ASC`.
  4. Merges them onto each product as `variants: ProductVariantRow[]` (an array; empty array `[]` when a product has no variants).

  Use a plain second Drizzle query + in-memory merge (no subquery/aggregation) to avoid changing the main query shape. Both queries run in the same function call.

  **Files:** `lib/db-queries.ts` (new file)

  **Verify:** `npx tsc --noEmit` — no TypeScript errors.

---

- [ ] 2. Replace the `getProducts()` function in all four data-fetching locations to use `getProductsWithVariants`.

  The four locations are:
  - `app/api/products/route.ts` — replace the inline Drizzle query with a call to `getProductsWithVariants(db)`.
  - `app/(store)/page.tsx` — replace its `getProducts()` function body.
  - `app/(store)/shop/page.tsx` — replace its `getProducts()` function body.
  - `app/(store)/shop/[category]/page.tsx` — replace its `getProducts()` function body. This one filters by categoryId in the query; pass the category filter through to `getProductsWithVariants` or filter the result afterwards (filter afterwards is simpler and consistent).

  Import `productVariants` from `@/drizzle/schema` and `getProductsWithVariants` from `@/lib/db-queries` wherever needed.

  **Files:**
  - `app/api/products/route.ts`
  - `app/(store)/page.tsx`
  - `app/(store)/shop/page.tsx`
  - `app/(store)/shop/[category]/page.tsx`

  **Verify:** `npm run build` — build completes without errors.

---

- [ ] 3. Add the `.variant-icon` CSS rule to `app/globals.css`.

  Append this rule after the `.product-visual b` block (around line 2044):

  ```css
  .variant-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 253, 248, 0.90);
    border-radius: 4px;
    padding: 3px 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.10);
  }
  ```

  Also add a small-screen override inside the existing `@media (max-width: 480px)` block that already targets `.product-visual b`:

  ```css
  .variant-icon svg {
    width: 12px;
    height: 12px;
  }
  ```

  Keep it minimal — just mirrors the badge treatment on the opposite corner.

  **Files:** `app/globals.css`

  **Verify:** `npm run build` — build completes without errors (CSS only; no TS errors possible).

---

- [ ] 4. Rewrite the price/weight/badge logic in `components/product/product-card.tsx`.

  ### Variant-aware price and weight logic

  Add a helper block at the top of the `ProductCard` function (before `return`):

  ```ts
  const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = variants.filter((v: any) => v.active !== false);
  // Already sorted by the API; use first item as representative
  const firstVariant = activeVariants[0] ?? null;

  const displayPrice = firstVariant
    ? (firstVariant.offerPrice && parseFloat(firstVariant.offerPrice) > 0
        ? parseFloat(firstVariant.offerPrice)
        : parseFloat(firstVariant.price))
    : (product.offerPrice && parseFloat(product.offerPrice) > 0
        ? parseFloat(product.offerPrice)
        : parseFloat(product.price));

  const originalPrice = firstVariant
    ? parseFloat(firstVariant.price)
    : parseFloat(product.price);

  const displayWeight = firstVariant ? firstVariant.weight : product.weight;

  const hasDiscount = displayPrice < originalPrice;
  const priceLabel = activeVariants.length >= 2 ? 'from ' : '';
  ```

  ### JSX changes

  1. **Weight line**: change `{formatWeight(product.weight)}` → `{formatWeight(displayWeight)}`.
  2. **Price display**: wrap the price text with `{priceLabel}` before `formatPrice(displayPrice)`. Use the `<em>` element that's already styled in the CSS for "from":
     ```tsx
     <strong>{priceLabel}{formatPrice(displayPrice)}</strong>
     ```
     Or, if visual distinction is needed, render `<em className="price-from">{priceLabel}</em>` before `<strong>`. The simplest correct approach: render `priceLabel` inline inside the existing `<strong>`.
  3. **Stack icon**: inside `.product-visual` Link, right after `{badge && <b>{badge}</b>}`, add:
     ```tsx
     {activeVariants.length > 0 && (
       <span className="variant-icon" aria-label="Multiple sizes available">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
           <rect x="2" y="7" width="20" height="14" rx="2"/>
           <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
           <line x1="12" y1="12" x2="12" y2="17"/>
           <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
         </svg>
       </span>
     )}
     ```
     This inline SVG resembles a "stack/layers" concept using a box-with-layers icon — no new library needed.
  4. **`cartProduct` object**: update `weight` and `price`/`offerPrice` to use the variant-aware values so the cart receives the correct initial price:
     ```ts
     const cartProduct = {
       ...product,
       id: String(product.id),
       slug: product.slug || '',
       name: product.name || '',
       price: originalPrice,
       offerPrice: displayPrice,
       weight: displayWeight || '',
       // ...rest unchanged
     };
     ```
  5. **`hasDiscount` guard**: replace the old `{product.offerPrice && <s>…</s>}` with `{hasDiscount && <s>{formatPrice(originalPrice)}</s>}` so a zero/null offerPrice never renders a strikethrough.

  **Files:** `components/product/product-card.tsx`

  **Verify:** `npm run build` — build completes without TypeScript or JSX errors.

---

- [ ] 5. Update the wishlist page inline card rendering to use the same variant-aware logic.

  `app/(store)/wishlist/page.tsx` has its own inline card that reads `item.offerPrice` and `item.price` directly. Items come from `useWishlist()` which stores whatever `cartProduct` object was passed to `WishlistButton`. After step 4, `cartProduct` will carry the correct `price`, `offerPrice`, and `weight`. However, the wishlist page still renders its own simplified card — update it to:
  - Show the variant stack icon if `item.variants` exists and has active entries (mirror the logic from step 4).
  - Use `item.weight` (which will now be the variant weight) for `formatWeight`.
  - The `displayPrice`/`hasDiscount` logic already mirrors: `item.offerPrice || item.price` and `item.offerPrice < item.price`. This already works correctly once `cartProduct` carries the right values — **no change needed to the price display logic in the wishlist page**.
  - Add the variant icon span inside the wishlist page's `.product-visual` Link, using the same SVG and `.variant-icon` class. Guard with `item.variants?.filter((v:any) => v.active !== false).length > 0`.

  **Files:** `app/(store)/wishlist/page.tsx`

  **Verify:** `npm run build` — build completes without errors.

---

- [ ] 6. Final build and lint verification.

  Run full build and linter to confirm no regressions across all changed files.

  **Verify:** `npm run build && npm run lint` — both pass cleanly.

---

## Notes / Assumptions

- **Sorting**: variants are sorted in-memory by `sortOrder ASC, id ASC` in `getProductsWithVariants`. The helper does `group.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)`. This is correct because the Drizzle query for variants fetches all at once and there's no guarantee of DB order without an explicit ORDER BY on the subquery.
- **"Active" filter**: only variants with `active = true` (or `active` not explicitly set to false) are considered. The schema default is `true`, so `active = true` in the WHERE clause of the variants query is the right filter.
- **No variant = fall back**: if `product.variants` is missing or empty, all existing behaviour is preserved exactly. No regressions for products without variants.
- **Wishlist context shape**: `WishlistButton` stores the `cartProduct` prop. Since `cartProduct` spreads `product` (which now includes `variants`), the wishlist items will have `variants` once the user adds to wishlist after this change. Items already in localStorage won't have `variants`, so the icon guard `item.variants?.filter(…).length > 0` handles both gracefully (old items without the field show no icon; no crash).
- **`from ₹X` label**: rendered as plain text prefix inside `<strong>`. No new element or class needed; `priceLabel` is `'from '` (with trailing space) or `''`. This keeps the existing `<strong>` styling intact.
- **No icon library**: the inline SVG used is a standard briefcase/box-with-plus variant that conveys "multiple options". It does not require any import.
