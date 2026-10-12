# Implementation Plan — Six Fixes

## Key findings from exploration

**Schema (drizzle/schema.ts)**
- `products` table has no `shelfLife` column — needs adding after `bestseller`.
- `combos` table has no `description` column — needs adding.
- `reviews` table already has `approved: false` default — existing `GET /api/reviews` already filters `approved: true` only. No changes needed there.

**Column-select vs select-star**
- Files with explicit column selects that need `shelfLife` added: `app/(store)/product/[slug]/page.tsx` (getProduct), `app/api/admin/products/route.ts` (GET), `lib/db-queries.ts` (getProductsWithVariants).
- Files that use `getProductsWithVariants` (shop page, category page, home page) do NOT need direct changes — they get whatever `lib/db-queries.ts` returns.
- `app/(store)/shop/page.tsx`, `app/(store)/shop/[category]/page.tsx`, `app/(store)/page.tsx` all call `getProductsWithVariants` — no explicit column list there, no change needed.

**Password fields in checkout**
- `lib/order-input.ts` defines `password` and `confirmPassword` as optional fields in `checkoutSchema`, `verifiedOrderSchema`, and `cashfreeVerifiedOrderSchema`. They are optional (`z.string().max(128).optional()`).
- `components/checkout-wizard.tsx` declares them in the `CheckoutForm` type and initialises them in `form` state as empty strings. They are sent in the POST payload via the spread `...form`. They are NOT rendered anywhere in the JSX (no `<input type="password">` in the checkout form). The `/api/cashfree/verify` and `/api/checkout/create-payment` routes accept them via the zod schema which accepts them as optional.
- Decision: safe to remove them from both the UI type/state in checkout-wizard.tsx AND from `lib/order-input.ts`. Removing them from the zod schema is safe because: (a) they are optional so existing callers sending them will be unaffected if we drop them, but (b) the checkout wizard will stop sending them in the payload, which is the right behaviour. Verify that no other route reads `body.password` before removing from schemas.

**Session endpoint**
- The session endpoint is `/api/auth/session` (used by checkout-wizard, store-header, delivery-notification, etc.). NOT `/api/session`.

**`/api/orders/mine`**
- Returns orders for the logged-in account. Does NOT return `orderItems`. The review form will need to fetch the orders list and then separately determine if any contain the product. The review API itself verifies this server-side, so the client only needs to show the form when there are any paid orders at all — it doesn't need to pre-verify per-product. Simplification: show the form to any logged-in user with at least one paid order; the API will reject with a clear error if the product wasn't in the order. The review form will use a simple orderId dropdown from paid orders.

**Admin products search**
- `GET /api/admin/products/route.ts` reads `q` from searchParams but never uses it — it fetches all products and returns them unfiltered. The `q` and `filter` variables are declared but unused.
- `components/admin-products.tsx` uses `searchQuery` state with client-side `.filter()` — no URL param or fetch call is triggered on search.

**Combo description**
- `combos` table: no `description` column. `app/(store)/combo/[slug]/page.tsx` uses `db.select()` with no column list (select-star) so it will automatically include `description` once the column is added to the schema.
- `app/api/admin/combos/route.ts` GET also uses `db.select()` (no column list) — will auto-include `description`.
- POST and PATCH in combo API routes explicitly list only `title, slug, price, discount, image` — need `description` added.
- `components/admin-combos.tsx` `formData` state and `handleSubmit` don't include `description` — need adding.

---

## Implementation Plan

- [ ] 1. Add `shelfLife` and `description` (combos) columns to the schema.
      In `drizzle/schema.ts`:
      - On the `products` table definition, add `shelfLife: text("shelf_life")` as a nullable column immediately after `bestseller`.
      - On the `combos` table definition, add `description: text("description")` as a nullable column (place it after `image`).
      Files: `drizzle/schema.ts`
      Verify: `npx next build` — TypeScript compiles without errors (the migration hasn't run yet, so DB queries that include the new columns will fail at runtime, but that is expected at this stage).

- [ ] 2. Generate the Drizzle migration for both new columns.
      Run `npx drizzle-kit generate` from the project root. This creates a new SQL migration file under `drizzle/` — do NOT run the migration.
      Files: `drizzle/` (new migration file created by the tool)
      Verify: A new `.sql` file appears under `drizzle/` containing `ALTER TABLE "products" ADD COLUMN "shelf_life" text;` and `ALTER TABLE "combos" ADD COLUMN "description" text;`. Confirm with `npx next build` still passing.

- [ ] 3. Update explicit-column SELECT queries to include `shelfLife`.
      Two files have explicit column selects for products and need the new field:
      - `app/(store)/product/[slug]/page.tsx` — `getProduct()` selects named columns. Add `shelfLife: products.shelfLife` to the select object.
      - `app/api/admin/products/route.ts` — `GET` handler selects named columns. Add `shelfLife: products.shelfLife` to the select object.
      - `lib/db-queries.ts` — `getProductsWithVariants()` selects named columns. Add `shelfLife: products.shelfLife` to the select object.
      Files: `app/(store)/product/[slug]/page.tsx`, `app/api/admin/products/route.ts`, `lib/db-queries.ts`
      Verify: `npx next build` — no TypeScript errors.

- [ ] 4. Replace the hardcoded shelf life in the product detail view.
      In `components/product/product-detail-view.tsx`, find the detail-item div that shows "Shelf life" with `<strong>30 days</strong>`. Replace with `<strong>{product.shelfLife || '30 days'}</strong>`.
      The `product` prop is typed `any`, so no type change is needed.
      Files: `components/product/product-detail-view.tsx`
      Verify: `npx next build` passes.

- [ ] 5. Add Shelf Life field to the admin products form.
      In `components/admin-products.tsx`:
      - Add `shelfLife` to the `Product` type: `shelfLife: string | null;`
      - In the form JSX (inside `{showForm && ...}`), after the Ingredients textarea, add a new field:
        ```tsx
        <div className={styles.field}>
          <label>Shelf Life</label>
          <input type="text" name="shelfLife" placeholder="e.g., 30 days" defaultValue={editingProduct?.shelfLife ?? ""} />
        </div>
        ```
      - In `handleSubmit`, in the `data` object passed to POST/PATCH, add: `shelfLife: formData.get("shelfLife") as string || null`
      Files: `components/admin-products.tsx`
      Verify: `npx next build` passes.

- [ ] 6. Update admin products API handlers to read/save `shelfLife`.
      - `app/api/admin/products/route.ts` POST handler: add `shelfLife` to destructuring from `body`, and add `shelfLife: shelfLife || null` to the `db.insert(products).values(...)` call.
      - `app/api/admin/products/[id]/route.ts` PATCH handler: add `if (body.shelfLife !== undefined) updateData.shelfLife = body.shelfLife || null;` to the `updateData` block.
      Files: `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`
      Verify: `npx next build` passes.

- [ ] 7. Create the ReviewForm client component.
      Create `components/product/review-form.tsx` as a `"use client"` component.
      - Props: `{ productId: number }`
      - Fetches session from `GET /api/auth/session`. If not logged in, render: `<p>Please <a href="/login">log in</a> to leave a review.</p>`
      - If logged in, fetches `GET /api/orders/mine`. Filter to orders where `paymentStatus === "paid"`. If no paid orders, render: `<p>Purchase this product to leave a review.</p>`
      - If paid orders exist, render a form with:
        - Star rating selector: 5 clickable star buttons (1–5), stored in `rating` state
        - Textarea for review text (`content` state)
        - Order selector: `<select>` listing paid orders by orderNumber (value = `order.id`)
        - Submit button
      - On submit: `POST /api/reviews` with `{ productId, orderId: Number(selectedOrderId), rating, content }`
      - On success: show `<p>Thank you! Your review is pending approval.</p>` and hide the form.
      - On API error: show the error message from the response JSON (`error` field).
      - Handle loading states for both the session fetch and orders fetch.
      - Note: The review API verifies server-side that the product was in the order. The form shows all paid orders; the user selects which order to attribute the review to.
      Files: `components/product/review-form.tsx` (new file)
      Verify: `npx next build` passes.

- [ ] 8. Add ReviewForm to the product detail page.
      In `app/(store)/product/[slug]/page.tsx`, import `ReviewForm` and add it between `<ProductReviews productId={product.id} />` and the recommendations section:
      ```tsx
      import { ReviewForm } from "@/components/product/review-form";
      ...
      <ProductReviews productId={product.id} />
      <ReviewForm productId={product.id} />
      ```
      Files: `app/(store)/product/[slug]/page.tsx`
      Verify: `npx next build` passes.

- [ ] 9. Add cancelled order visual to the order tracker.
      In `components/order-tracker.tsx`, inside the `{result && ...}` block, before the `<div className={styles.resultSection}>` content renders the status card and timeline, add a conditional banner at the top of `resultSection`:
      ```tsx
      {result.orderStatus === "cancelled" && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "14px 18px", marginBottom: 16, color: "#991b1b", fontWeight: 600, fontSize: 15 }}>
          This order has been cancelled.
        </div>
      )}
      ```
      The existing timeline can remain rendered for cancelled orders (all steps inactive) — the banner is shown above the status card. This is the least intrusive approach and doesn't break non-cancelled flows.
      Files: `components/order-tracker.tsx`
      Verify: `npx next build` passes.

- [ ] 10. Remove dead password fields from the checkout schema and form type.
      First, confirm no route reads `body.password` from checkout payloads — grep `app/api/checkout` and `app/api/cashfree` for `.password`. Those routes validate via the zod schemas; password fields are optional and unused.
      - `lib/order-input.ts`: Remove `password: z.string().max(128).optional()` and `confirmPassword: z.string().max(128).optional()` from `checkoutFields`. Remove the `passwordsMatch` refinement function. Remove `.refine(passwordsMatch, ...)` from `checkoutSchema`, `verifiedOrderSchema`, and `cashfreeVerifiedOrderSchema`.
      - `components/checkout-wizard.tsx`: Remove `password` and `confirmPassword` from the `CheckoutForm` type, and remove them from the `form` initial state object.
      Files: `lib/order-input.ts`, `components/checkout-wizard.tsx`
      Verify: `npx next build` passes with no TypeScript errors. Specifically check that no file imports `passwordsMatch` or references the removed fields.

- [ ] 11. Add server-side search filtering to the admin products API.
      In `app/api/admin/products/route.ts` GET handler, the `query` variable is already extracted from `searchParams` but unused. Replace the current unfiltered query with a conditional:
      - Import `ilike`, `or` from `drizzle-orm` (in addition to existing `desc`, `eq`).
      - After building the base query (`.select(...).from(products).leftJoin(...)`), add:
        ```ts
        const result = query
          ? await productList.where(or(ilike(products.name, `%${query}%`), ilike(products.slug, `%${query}%`))).orderBy(desc(products.createdAt))
          : await productList.orderBy(desc(products.createdAt));
        ```
      - Remove the old `const result = await productList;` line.
      Note: The `components/admin-products.tsx` search works client-side using `searchQuery` state — this is fine for the current UX. The server-side filter acts as a server-side safeguard and is the source of truth if the search is ever wired to the URL. No changes needed to the admin-products component for this fix.
      Files: `app/api/admin/products/route.ts`
      Verify: `npx next build` passes.

- [ ] 12. Add `description` column to combo admin form and API.
      a) `components/admin-combos.tsx`:
         - Add `description: string` (or `description?: string`) to the `Combo` type.
         - Add `description: ""` to the `formData` state initial value.
         - In `handleEdit`, set `description: combo.description || ""` in the `setFormData` call.
         - In `handleCloseForm`, reset `description: ""`.
         - In the form JSX, after the Slug field, add:
           ```tsx
           <div className={styles.field}>
             <label>Description <small style={{ color: "#9ca3af", fontWeight: 400 }}>optional</small></label>
             <textarea
               rows={3}
               placeholder="e.g., A carefully curated combo, perfect for gifting…"
               value={formData.description}
               onChange={(e) => handleInputChange("description", e.target.value)}
             />
           </div>
           ```
         - In `handleSubmit`, add `description: formData.description || null` to the JSON body.
      b) `app/api/admin/combos/route.ts` POST: destructure `description` from `body`, add `description: description || null` to `db.insert(combos).values(...)`.
      c) `app/api/admin/combos/[id]/route.ts` PATCH: destructure `description` from `body`, add `description: description || null` to `db.update(combos).set(...)`.
      Files: `components/admin-combos.tsx`, `app/api/admin/combos/route.ts`, `app/api/admin/combos/[id]/route.ts`
      Verify: `npx next build` passes.

- [ ] 13. Use DB description in the combo detail page.
      In `app/(store)/combo/[slug]/page.tsx`, the `getCombo` function uses `db.select()` with no column list, so `combo.description` will be available once the column exists. Replace the hardcoded `<p className="description">` with:
      ```tsx
      <p className="description">
        {combo.description || 'A carefully curated combo, perfect for gifting or enjoying with family.'}
      </p>
      ```
      (The page currently has a multi-line template literal string — replace that entire `<p>` block.)
      Files: `app/(store)/combo/[slug]/page.tsx`
      Verify: `npx next build` passes. Full manual verification: after running the migration and starting `next dev`, create a combo with a description in the admin panel, visit the combo detail page, and confirm the description text appears instead of the fallback.

---

## Build command
`npm run build` (runs `next build`)

## Migration command (generate only — do NOT migrate)
`npm run db:generate` (runs `drizzle-kit generate`)

## Notes
- Steps 1–2 must be done together (schema + migration) before any runtime testing.
- Steps 3–6 all depend on the `shelfLife` column existing in the schema (step 1); they can be done in any order relative to each other.
- Steps 12–13 (combo description) depend on step 1 (schema change) and step 2 (migration generated).
- Steps 7–8 (review form) are independent of all schema changes.
- Steps 9, 10, 11 are fully independent of everything else.
