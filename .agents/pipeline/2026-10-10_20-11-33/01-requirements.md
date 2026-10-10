# Requirements: Product Variants Support

## Summary

The Raghul Snacks store currently models every product as a single SKU with one weight and one price pair (price / offerPrice). When the same product is sold in multiple weights (e.g., 250 g / 500 g / 1 kg at different prices), the admin must create separate catalog entries — leading to duplicated product pages, fragmented analytics, and a confusing shop grid.

This feature adds a `product_variants` table and wires it through the full stack: DB schema → admin UI → store product detail page → cart → order pricing. Products that have no variants continue to work exactly as today (backward compatible).

---

## Assumptions

1. A "variant" is solely a weight/price option of the same product. Attributes like flavor or color are out of scope.
2. The base product's own `price` / `offerPrice` / `weight` fields are kept as-is and serve as the fallback when no variants are defined. They are not repurposed as the "default variant."
3. A product may have zero, one, or many variants. Having exactly one variant is valid (no special-casing needed).
4. Variants are shown on the product detail page only — the shop grid and product cards continue to display the base product price.
5. Cart items already use `product.id` (string) as their deduplication key. When a variant is selected, the key becomes `"<productId>-<variantId>"` so the same product in two different weights can coexist in the cart.
6. The `orderItems` table does not need a structural migration for this feature; the variant price is resolved at checkout time via `lib/order-pricing.ts`, and the stored `price` column captures the final resolved price. The `name` column can optionally capture weight (e.g., "Thinai Laddu – 500g") to keep order history readable.
7. `sortOrder` on variants controls display order of weight buttons (ascending).
8. Only active variants (`active = true`) are shown to customers. Inactive variants are hidden from the store but retained in the DB.
9. Admin authentication for variant API routes follows the same cookie-based pattern used by all other admin API routes (`isValidAdminSession`).
10. No bulk-import CSV tooling is required; variants are managed one-by-one through the modal UI.

---

## Functional Requirements

### FR-1 — Database: product_variants table

1. A new `product_variants` table is added to `drizzle/schema.ts` with columns: `id` (serial PK), `productId` (integer, FK → `products.id`, cascade delete), `weight` (text, not null), `price` (numeric 10,2, not null), `offerPrice` (numeric 10,2, nullable), `sku` (text, nullable, unique), `active` (boolean, default `true`), `sortOrder` (integer, default `0`), `createdAt` (timestamptz, default now).
2. A Drizzle migration is generated from the updated schema (`drizzle-kit generate`). The migration must not touch any existing table.
3. Deleting a product cascades to its variants automatically via the FK constraint.

### FR-2 — Admin UI: variant management inside the product modal

4. The product add/edit modal in `components/admin-products.tsx` gains a "Variants" section rendered below the existing fields, visible for both new and existing products.
5. The variants section shows a list of existing variant rows (when editing). Each row displays: weight input, price input, offer price input, active toggle, and a delete button.
6. An "Add Variant" button appends a new blank row to the local list.
7. Clicking the delete button on a variant row that was already saved to the DB fires `DELETE /api/admin/products/:id/variants/:variantId` and removes the row from the UI on success.
8. Clicking delete on an unsaved (locally-added) row simply removes it from the local list without an API call.
9. When the product form is submitted, variants are upserted via `POST /api/admin/products/:id/variants` after the product save succeeds.
10. The product table row in the admin list shows a "N variants" badge or sub-text when a product has one or more variants, so admins can identify which products have variants configured.

### FR-3 — API routes

11. `GET /api/admin/products` (existing) — response for each product includes a `variantCount` integer field.
12. `POST /api/admin/products/:id/variants` — accepts an array of variant objects `{ weight, price, offerPrice?, sku?, active, sortOrder }`. Performs an upsert: variants with an `id` field are updated, variants without an `id` are inserted. Returns the full updated variant list for the product. Requires admin auth.
13. `DELETE /api/admin/products/:id/variants/:variantId` — deletes the specified variant. Returns `{ success: true }`. Requires admin auth. Returns 404 if the variant does not belong to the product.
14. `GET /api/products/:slug` (or the server component query that feeds `product/[slug]/page.tsx`) — includes a `variants` array ordered by `sortOrder ASC`, filtered to `active = true` only.

### FR-4 — Store product detail page

15. `app/(store)/product/[slug]/page.tsx` fetches active variants alongside the product and passes them as a prop to `ProductDetailView`.
16. `components/product/product-detail-view.tsx` renders a weight selector row of pill/button options below the product name (above the price section) when the product has one or more variants.
17. The first variant (lowest `sortOrder`) is selected by default on page load.
18. Selecting a variant updates the displayed price, offer price, and savings calculation to reflect that variant's values.
19. The weight shown in the detail list item ("Weight" row) updates to reflect the selected variant's weight.
20. The "Add to Cart" and "Buy Now" actions use the selected variant's `offerPrice` (falling back to its `price` if `offerPrice` is null) and pass `variantId` into the cart item.
21. When no variants exist for a product, the page renders identically to the current behavior (weight selector is hidden, base product price is used).

### FR-5 — Cart

22. The `CartItem` type gains an optional `variantId: string | null` field.
23. When a variant is selected, the cart item `id` (used for deduplication and lookup) is set to `"<productId>-<variantId>"`.
24. When no variant is involved, the cart item `id` remains `String(product.id)` — no change to existing behavior.
25. The cart display (cart page / cart drawer) shows the variant weight label alongside the product name when `variantId` is set.
26. `getItemQuantity` in `cart-provider.tsx` continues to work correctly because it matches on item `id`, which now encodes the variant when present.

### FR-6 — Order pricing

27. `lib/order-pricing.ts` `priceOrder` function accepts an extended `RequestedItem` type: `{ productId: string; variantId?: string; quantity: number }`.
28. When `variantId` is present, the function queries `product_variants` for that row and uses its `offerPrice ?? price` as the line price.
29. When `variantId` is absent, existing behavior is preserved (use the product's own `offerPrice ?? price`).
30. If the variantId is provided but not found in the DB, the function throws with a clear message ("Variant not found") rather than silently falling back to the product price.
31. The `name` field stored in `orderItems` is set to `"<product.name> – <variant.weight>"` when a variant is used, so order history remains self-explanatory.

---

## Non-Functional Requirements

- **Backward compatibility**: all existing products with no variants must work identically in the store, cart, and order flow without any data migration or manual intervention.
- **Admin auth**: all new admin API routes must require a valid admin session cookie; unauthenticated requests return HTTP 401.
- **Type safety**: new DB table exports a TypeScript type via Drizzle's inferred types. `ProductDetailView` and `CartItem` receive properly typed variant arrays/fields.
- **No layout changes**: the variant weight selector must fit within the existing product detail page layout/CSS without altering any other section of the store.

---

## Acceptance Criteria

1. **AC-1 (DB schema)** — Running `npx drizzle-kit generate` after the schema change produces a migration that creates the `product_variants` table with the correct columns and FK constraint. No existing table is altered.
2. **AC-2 (cascade delete)** — Deleting a product from the admin panel also removes all its variants from the DB (verified via DB query or cascade definition in schema).
3. **AC-3 (admin add variant)** — In the product modal, clicking "Add Variant", filling in weight "500g" and price "350", then saving the product results in a row in `product_variants` with `productId` matching the product.
4. **AC-4 (admin edit variant)** — Opening the edit modal for a product that has variants shows the existing variant rows pre-populated with their saved weight, price, and offer price values.
5. **AC-5 (admin delete variant)** — Clicking the delete button on a saved variant row, confirming, sends a DELETE request and the row disappears from the UI and from the DB.
6. **AC-6 (variant count badge)** — The admin product list shows "2 variants" next to a product that has 2 active variants.
7. **AC-7 (store: weight selector visible)** — Visiting the product detail page for a product with 3 variants shows 3 weight selector buttons; no selector appears for a product with 0 variants.
8. **AC-8 (store: price updates on selection)** — Clicking a different weight button updates the displayed price and offer price to that variant's values without a page reload.
9. **AC-9 (store: cart item id)** — Adding a "500g" variant of "Thinai Laddu" to the cart and then adding the "250g" variant results in two separate cart line items (not a quantity increment on one item).
10. **AC-10 (store: no-variant fallback)** — A product with no variants in the DB displays its base product price with no weight selector, and "Add to Cart" / "Buy Now" work exactly as before.
11. **AC-11 (cart: weight label)** — The cart page / drawer shows the variant weight (e.g., "500g") alongside the product name for variant-based items.
12. **AC-12 (order pricing with variant)** — Placing an order for a product with a variant selected uses the variant's price (not the base product price) in the order total.
13. **AC-13 (order pricing fallback)** — Placing an order for a product with no variant selected uses the base product's `offerPrice ?? price` as before.
14. **AC-14 (order item name)** — The `name` stored in `order_items` for a variant purchase is `"<Product Name> – <variant weight>"`.
15. **AC-15 (inactive variant hidden)** — A variant with `active = false` does not appear as a weight selector button on the store product page.
16. **AC-16 (admin auth on variant routes)** — Calling `POST /api/admin/products/:id/variants` or `DELETE /api/admin/products/:id/variants/:variantId` without a valid admin session cookie returns HTTP 401.
17. **AC-17 (variant not found in pricing)** — Submitting a checkout payload with a non-existent `variantId` causes `priceOrder` to throw with a "Variant not found" message and the order is not created.

---

## Out of Scope

- Variant attributes other than weight (color, flavor, size, etc.).
- Inventory / stock tracking at the variant level.
- Showing variant prices or a weight selector on the product card in the shop grid.
- Bulk CSV import/export of variants.
- Changing the checkout flow UI.
- Any changes to the shiprocket or delivery-mode logic.
- Migrating existing multi-weight products from separate catalog entries into variants (data migration is a separate operational task).
- Public REST API (`/api/products/[slug]` as a standalone endpoint) — the variant data is fetched directly in the server component query; no separate public API route is required unless one already exists.
