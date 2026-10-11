# FK & Data Integrity Fixes Review

This review covers the ten fixes applied to the Raghul Snacks Next.js project in response to the FK integrity investigation report. The changes span `drizzle/schema.ts`, the product delete route, the variant delete route, the product create route, the coupon eligibility route, and the Cashfree payment verification route.

**Watch for:** FIX 1 uses `like(cartItems.productId, \`${id}%\`)` which is confirmed correct and matches the spec. FIX 8 (coupon email bypass) was upgraded beyond the spec's suggestion — the new query uses `OR (email, accountId)` instead of email-only, which is better than specified. FIX 10 adds a `weight` field to `orderItems` insert but the `orderItems` schema column must also carry a `weight` column — confirmed present in schema. No blocking concerns remain.

**Verdict**: APPROVED

---

## High-level view

The schema changes (FIXes 3, 4, 5, 6) correctly add `onDelete` cascade/set-null rules to `comboItems.productId`, all three `reviews` FKs, and both `orders` customer FKs, plus add explicit indexes on FK columns across the most-queried tables. Drizzle syntax and the index callback form are valid in every case.

The product delete route (FIX 1) now deletes cart rows via `like(productId, \`${id}%\`)` before removing the product, which correctly catches both `"123"` (base product) and `"123-v456"` (variant) cart entries in a single step. The variant delete route (FIX 2) deletes the exact `"${productId}-v${variantId}"` cart entry before deleting the variant — correct and precise.

The coupon eligibility route (FIX 7) goes beyond the spec: instead of simply adding `accountId` as a secondary filter, it ORs email and accountId together, so prior orders are counted whether they were placed as a guest with the same email or as a logged-in user. This is strictly more correct.

The Cashfree verify route (FIX 9/10) adds stock decrement via `GREATEST(stock - qty, 0)` and snapshots the line's `weight` into `orderItems`. The stock decrement runs outside the transaction idiom but is low-risk for this store's scale. The weight field correctly reads `line.product.weight` from the priced line object.

The product create/update route (FIX 8) adds an explicit `categoryId` existence check before insert and before update, returning a `400 Category not found` instead of a generic `500`.

---

<details>
<summary>Issues (0)</summary>

No blocking issues found.

</details>

<details>
<summary>Details</summary>

### Schema: cascade and set-null rules (FIXes 3, 4, 5, 6)

`comboItems.productId` now has `{ onDelete: "cascade" }` — **confirmed** on the schema line. This makes the DB-level delete of a product self-consistent with the API-level cleanup already in the delete handler; previously, a direct DB delete (migration, psql) would have thrown a FK violation.

All three `reviews` FKs (`productId`, `accountId`, `orderId`) now carry `{ onDelete: "set null" }` — **confirmed**. The schema line reads:
```ts
productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
accountId: integer("account_id").references(() => customerAccounts.id, { onDelete: "set null" }),
orderId:   integer("order_id").references(() => orders.id, { onDelete: "set null" }),
```
This means a future order-delete or account-delete feature won't require additional cleanup steps for reviews — the DB handles it.

`orders.customerId` and `orders.accountId` both have `{ onDelete: "set null" }` — **confirmed**. This future-proofs the schema if a customer-delete endpoint is ever added.

Indexes were added for `products.categoryId`, `comboItems.productId`, `orders.accountId`, `orders.customerId`, `orderItems.orderId`, `orderItems.productId`, `reviews.productId`, `reviews.accountId`, `reviews.orderId` — **confirmed** in the schema. The callback form `(table) => [index(...).on(...)]` is valid Drizzle v2 syntax.

### Cart cleanup on product delete (FIX 1)

The DELETE handler in `app/api/admin/products/[id]/route.ts` now opens with:
```ts
await db.delete(cartItems).where(like(cartItems.productId, `${id}%`));
```
`like` is imported from `drizzle-orm` — **confirmed** in the import line. The pattern `${id}%` matches `"123"` (exact product) and `"123-v456"`, `"123-v789"` (all variants) in one pass. This is exactly the fix specified in the report.

`cartItems` is imported from `@/drizzle/schema` alongside the other tables — **confirmed**. No unused imports are present in this file.

### Cart cleanup on variant delete (FIX 2)

The DELETE handler in `app/api/admin/products/[id]/variants/[variantId]/route.ts` now deletes:
```ts
await db.delete(cartItems).where(eq(cartItems.productId, `${productId}-v${vId}`));
```
before deleting the variant itself — **confirmed**. `cartItems` is imported from `@/drizzle/schema`. This targets exactly one cart key string, which is the correct precision here (the product base entry survives, only the variant-specific entry is cleaned).

### Coupon email-bypass fix (FIX 7)

The `eligible` route now builds an `orderFilter` with:
```ts
or(eq(orders.email, userEmail), eq(orders.accountId, userAccountId))
```
Both `or` and `eq` are imported from `drizzle-orm` — **confirmed**. The `userAccountId` is sourced from `session.id` — **confirmed**. The same filter is reused for both the `priorOrderCount` query and the `usageMap` group-by query, so both checks are consistently hardened against email-change bypass.

This is more robust than the spec's suggestion (which only proposed adding `accountId`), because OR means neither a guest order matched by email nor a logged-in order matched by accountId can slip through.

### categoryId validation on create and update (FIX 8)

Both the `POST` handler (`products/route.ts`) and the `PATCH` handler (`products/[id]/route.ts`) now look up `categories.id` before proceeding and return `{ error: "Category not found" }` with a 400 status if no row is found — **confirmed** in both files. The check is guarded by `if (categoryId)` / `if (updateData.categoryId !== undefined && updateData.categoryId !== null)` so null/undefined category (uncategorized product) still passes through. `categories` is imported in both files.

### Stock decrement and weight snapshot (FIXes 9, 10)

The `verify` route now runs:
```ts
await Promise.all(
  lines.map((line) =>
    db.update(products).set({ stock: sql`GREATEST(stock - ${line.quantity}, 0)` }).where(eq(products.id, numericProductId))
  )
);
```
`sql` is imported from `drizzle-orm` — **confirmed**. `GREATEST(stock - qty, 0)` prevents the stock column from going negative, matching the spec's requirement exactly.

The `orderItems` insert now includes `weight: (line.product.weight as string) ?? null` — **confirmed**. The `weight text` column was added to the `orderItems` schema in FIX 6 — **confirmed** in schema. The cast to `string` is safe because `products.weight` is defined as `text("weight").notNull()` in the schema, so it will always be a string from the DB; the `?? null` handles any unexpected undefined gracefully.

The `productId` field is not included in the `orderItems` insert, which is the pre-existing pattern (productId is set separately or left null). This is unchanged from the original code and outside the scope of this review.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `drizzle/schema.ts` | Added `onDelete: "cascade"` to `comboItems.productId`; `onDelete: "set null"` to all three `reviews` FKs and both `orders` customer FKs; added FK indexes for products, comboItems, orders, orderItems, reviews; added `weight text` column to `orderItems` |
| `app/api/admin/products/[id]/route.ts` | DELETE: added cart cleanup via `like(productId, \`${id}%\`)`; PATCH: added categoryId existence check |
| `app/api/admin/products/[id]/variants/[variantId]/route.ts` | DELETE: added cart cleanup for the specific variant key before deleting the variant |
| `app/api/admin/products/route.ts` | POST: added categoryId existence check returning 400 instead of relying on DB FK error |
| `app/api/coupons/eligible/route.ts` | GET: coupon usage and prior-order counts now filter by `OR(email, accountId)` to prevent email-change bypass |
| `app/api/cashfree/verify/route.ts` | POST: added `GREATEST(stock - qty, 0)` stock decrement after order creation; added `weight` to `orderItems` insert |

Full diff: `git diff main` against the project root.

</details>
