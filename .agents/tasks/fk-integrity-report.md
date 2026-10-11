# FK & Data Integrity Investigation Report
**Project:** Raghul Snacks (Next.js 14 / Drizzle ORM / PostgreSQL)  
**Date:** 2025-07  
**Scope:** `drizzle/schema.ts`, all `app/api/**/route.ts`, `lib/order-pricing.ts`, `lib/db-queries.ts`

---

## Executive Summary

The codebase is **generally well-handled** for a small e-commerce project. Most delete paths correctly null-out or cascade child rows. The biggest real issues are:

1. **HIGH** — `cartItems.productId` is `text` but products have `integer` IDs. No database-level FK constraint exists, so cart rows silently persist after a product is deleted.
2. **HIGH** — `comboItems.productId` has a non-cascading FK. Deleting a product manually cleans `comboItems` in the API, but the *database constraint* itself has no `onDelete` rule, so a direct DB delete would leave orphaned rows.
3. **MEDIUM** — `orderItems.productId` is nullable with no cascade. A deleted product nulls the FK in the API but the `name` snapshot means display works. The `productId` link is lost permanently.
4. **MEDIUM** — No `onDelete: "cascade"` or `"set null"` on `reviews.productId`, `reviews.accountId`, `reviews.orderId`. All three FKs are nullable with no cascade defined at the schema level, relying entirely on application-layer cleanup.
5. **MEDIUM** — `orders.customerId` and `orders.accountId` FKs have no cascade/set-null rule. Deleting a customer/account (currently no delete endpoint exists) would violate the FK at the DB level.
6. **MEDIUM** — `orderItems` price is stored as the live `offerPrice` at checkout time — a good snapshot — but there is no `weight` snapshot. Order history cannot reconstruct the exact variant weight shipped.
7. **LOW** — No FK index on several FK columns (Drizzle does not auto-create indexes on FK columns for PostgreSQL).
8. **LOW** — `stock` column on `products` is never decremented at checkout; it is purely cosmetic.
9. **LOW** — `coupons.applicableProducts` / `applicableCategories` are stored as `text[]` (string slugs), not integer FKs, so deleting a product/category does not clean up these references.
10. **INFO** — `banners.couponCode` is a text reference, not an FK. The application manually cascades it (code rename + delete), which is correct but fragile.

---

## 1. Schema & Foreign Key Inventory

### Tables and FK relationships

| Table | Column | References | onDelete | onUpdate | Notes |
|---|---|---|---|---|---|
| `products` | `category_id` | `categories.id` | — | — | No cascade; category delete handled in API |
| `combo_items` | `combo_id` | `combos.id` | **cascade** | — | Correct |
| `combo_items` | `product_id` | `products.id` | — | — | ⚠️ Missing cascade |
| `orders` | `customer_id` | `customers.id` | — | — | ⚠️ No cascade/set-null |
| `orders` | `account_id` | `customer_accounts.id` | — | — | ⚠️ No cascade/set-null |
| `order_items` | `order_id` | `orders.id` | **cascade** | — | Correct |
| `order_items` | `product_id` | `products.id` | — | — | Nullable; API nulls it on product delete |
| `reviews` | `product_id` | `products.id` | — | — | Nullable; API nulls it on product delete |
| `reviews` | `account_id` | `customer_accounts.id` | — | — | Nullable; no cascade |
| `reviews` | `order_id` | `orders.id` | — | — | Nullable; no cascade |
| `product_variants` | `product_id` | `products.id` | **cascade** | — | Correct |
| `cart_items` | `account_id` | `customer_accounts.id` | **cascade** | — | Correct |
| `cart_items` | `product_id` | *(none)* | — | — | ⚠️ **TEXT column, no FK at all** |

### Columns named `*_id` with no FK constraint

| Table | Column | Issue |
|---|---|---|
| `cart_items` | `product_id` | `text` type; no FK. Stores `"123"` or `"123-v456"` (variant IDs). No DB enforcement. |
| `coupons` | `applicable_products` / `applicable_categories` | `text[]` — stores slugs, not IDs. No FK possible by design. |
| `orders` | `shipment_id`, `awb_code`, `shiprocket_order_id`, `payment_order_id` | External service IDs — correctly not FK'd. |

**Evidence:** `drizzle/schema.ts` lines defining `cartItems`:
```ts
productId: text("product_id").notNull()  // ← text, no .references()
```
vs all other FK columns which use `.references(() => table.id)`.

---

## 2. DELETE Operations — Gap Analysis

### DELETE /api/admin/products/[id]
**File:** `app/api/admin/products/[id]/route.ts`

Cleanup performed:
- ✅ `comboItems` — deleted (`db.delete(comboItems).where(eq(comboItems.productId, id))`)
- ✅ `orderItems.productId` — nulled (`db.update(orderItems).set({ productId: null })`)
- ✅ `reviews.productId` — nulled
- ✅ `productVariants` — cascade from schema (correct)
- ❌ **`cartItems`** — NOT cleaned up. Cart rows with `productId = "123"` or `"123-v456"` survive indefinitely because `cart_items.product_id` is a `text` column with no FK. The cart GET enriches rows with `product: null` for missing products, so the UI gets null product cards rather than an error, but ghost cart rows pile up in the database.

**Severity: HIGH**  
**Fix:** Add a cleanup step before the product delete:
```ts
// app/api/admin/products/[id]/route.ts DELETE handler
import { like } from "drizzle-orm";
await db.delete(cartItems).where(like(cartItems.productId, `${id}%`));
```
(The `like` handles both `"123"` and `"123-v456"` variant IDs.)

---

### DELETE /api/admin/categories/[id]
**File:** `app/api/admin/categories/[id]/route.ts`

- ✅ Products with this `categoryId` are nulled out before category is deleted.
- No other tables reference categories directly.
- Coupons reference categories via `applicableCategories: text[]` (slug-based), not FK'd — those stale slugs are not cleaned up. Low impact: the coupon engine will just find no matching products for the stale slug.

**Severity: LOW for the slug staleness; category delete itself is safe.**

---

### DELETE /api/admin/combos/[id]
**File:** `app/api/admin/combos/[id]/route.ts`

- ✅ `comboItems` are cascade-deleted by the DB schema (`onDelete: "cascade"` on `combo_id`).
- No other tables reference combos by FK.
- ✅ Safe.

---

### DELETE /api/admin/coupons/[id]
**File:** `app/api/admin/coupons/[id]/route.ts`

- ✅ Banners referencing the deleted coupon code are nulled out.
- `orders.coupon_code` is a plain text snapshot — historical orders keep the code string, which is correct (audit trail).
- ✅ Safe.

---

### DELETE /api/admin/reviews/[id]
**File:** `app/api/admin/reviews/[id]/route.ts`

- Review is a leaf node. No other table references `reviews.id`.
- ✅ Safe.

---

### DELETE /api/admin/announcements/[id]
- Leaf node. ✅ Safe.

### DELETE /api/admin/messages/[id]  
- Leaf node. ✅ Safe.

### DELETE /api/banners/[id]
- Leaf node. ✅ Safe.

### DELETE /api/admin/products/[id]/variants/[variantId]
**File:** `app/api/admin/products/[id]/variants/[variantId]/route.ts`

- ❌ **`cartItems` not cleaned up.** Cart rows using `productId = "123-v456"` for the deleted variant will persist with a null-product enrichment.
- No orderItems reference variant IDs directly (they snapshot name + price at order time).

**Severity: MEDIUM** — same ghost-cart issue as product delete, scoped to variant-specific cart entries.  
**Fix:** Before deleting the variant, delete cart items matching `"${productId}-v${variantId}"`:
```ts
await db.delete(cartItems).where(eq(cartItems.productId, `${productId}-v${variantId}`));
```

---

### No DELETE endpoint for customers / customer_accounts

There is no admin endpoint to delete a customer account. This is currently safe by omission. **However**, if one is ever added:
- `orders.customer_id` and `orders.account_id` have no `onDelete` rule — a direct DB-level delete would violate the FK and throw a constraint error.
- `cart_items.account_id` has `onDelete: "cascade"` — ✅ would auto-clean.
- `reviews.account_id` is nullable with no cascade — would leave orphaned reviews (no error, but author attribution is lost).

**Severity: MEDIUM (future risk)**  
**Fix:** Add `onDelete: "set null"` to `orders.customerId` and `orders.accountId` in the schema, and `onDelete: "cascade"` (or set null) to `reviews.accountId`.

---

## 3. INSERT/UPDATE — FK Validation

### Product creation (POST /api/admin/products)
**File:** `app/api/admin/products/route.ts`

```ts
categoryId: categoryId || null,
```

- No check that `categoryId` actually exists in the `categories` table before inserting.
- If an invalid `categoryId` is sent, PostgreSQL will throw a FK violation (runtime error caught by the `catch` block and returned as 500).
- This is **not a silent data corruption** issue — it fails loudly — but the error message returned to the admin is generic `"Failed to create product"` rather than `"Category not found"`.

**Severity: LOW** — DB enforces integrity; UI should be more helpful.

### Product update (PATCH /api/admin/products/[id])
Same situation: `categoryId` written without explicit existence check. DB FK will catch it.

### Combo creation (POST /api/admin/combos)
```ts
items.map((item) => ({ comboId: newCombo.id, productId: item.productId, ... }))
```
- No check that `item.productId` values exist in `products`. DB FK on `combo_items.product_id` will throw if invalid.
- Additionally: the FK on `combo_items.product_id` has **no `onDelete` rule**, so the DB will refuse a product delete if the product is still in a combo — but the API delete handler manually removes comboItems first, preventing this.

**Severity: LOW** — FK enforced at DB level; could be improved with explicit validation and better error messages.

### Review submission (POST /api/reviews)
✅ **Well-validated.** The route verifies:
1. Order belongs to the logged-in user and is paid.
2. Product was in that order (checks by `productId` first, falls back to product name for old orders where `productId` was nulled).
3. Duplicate review prevented.

---

## 4. Order Items / Price Snapshotting

### What is snapshotted at order time
**File:** `app/api/cashfree/verify/route.ts`

```ts
await db.insert(orderItems).values(
  lines.map((line) => ({
    orderId: order.id,
    name: line.product.name,      // ✅ name snapshotted
    quantity: line.quantity,
    price: String(line.product.offerPrice)  // ✅ price snapshotted
  }))
);
```

- ✅ **Name** is snapshotted — order history remains intact even if the product is renamed or deleted.
- ✅ **Price** (offerPrice at time of order) is snapshotted.
- ❌ **Weight** is NOT snapshotted. `orderItems` has no `weight` column. If a variant's weight changes or is deleted, the historical order cannot tell you what weight was actually shipped.
- ❌ **productId** is stored (FK) but is nullable and gets nulled on product delete. After nulling, the `name` column is the only remaining identifier. The `review-target` and `reviews/batch` endpoints handle this gracefully with name-based fallback matching.

### Could a product deletion break order history display?
**No** — the `name` and `price` snapshots mean past orders display correctly. The `productId` is useful for linking to the product page but is non-critical. The fallback matching in the review flow confirms this is handled.

**Severity for weight missing: LOW** (operational/audit concern, not a correctness bug).

---

## 5. Combo Items Storage

**File:** `drizzle/schema.ts`

```ts
comboItems = pgTable("combo_items", {
  comboId: integer("combo_id").notNull().references(() => combos.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),  // ← no onDelete
  quantity: integer("quantity").notNull().default(1)
})
```

- Combo items hold a **live FK** to products — no snapshotting. Combo descriptions show product names via a live join.
- The `onDelete` on `productId` is **absent**. At the DB level, deleting a product that's in a combo would violate this FK constraint and fail.
- The product DELETE API handler manually removes `comboItems` first, which prevents the DB error. This works but is fragile — a direct DB delete (e.g., a migration, manual psql) would break.

**Severity: MEDIUM**  
**Fix:** Add `{ onDelete: "cascade" }` to `comboItems.productId` (or "restrict" + better error message in the API):
```ts
productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" })
```
Run `drizzle-kit generate` + `drizzle-kit migrate` after.

---

## 6. Reviews FK & Deletion Behavior

**Schema:**
```ts
reviews = pgTable("reviews", {
  productId: integer("product_id").references(() => products.id),        // nullable, no cascade
  accountId: integer("account_id").references(() => customerAccounts.id), // nullable, no cascade
  orderId:   integer("order_id").references(() => orders.id),             // nullable, no cascade
})
```

- All three FKs are **nullable with no `onDelete` rule** in the schema.
- At the DB level, if a referenced row is deleted while `reviews` still holds the ID, PostgreSQL will **throw a FK violation error** because there is no `onDelete: "set null"` or `"cascade"` instruction.
- The product DELETE API handler does `db.update(reviews).set({ productId: null })` before deleting — ✅ correct for product deletions.
- There is **no account delete endpoint**, so `accountId` FK violation is theoretical today.
- There is **no order delete endpoint**, so `orderId` FK violation is theoretical today.

**Severity: MEDIUM** — schema relies entirely on application code to avoid FK violations. One missing cleanup step (e.g., a future order-delete feature) would cause a DB error.  
**Fix:** Add `onDelete: "set null"` to all three FK columns in schema:
```ts
productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
accountId: integer("account_id").references(() => customerAccounts.id, { onDelete: "set null" }),
orderId:   integer("order_id").references(() => orders.id, { onDelete: "set null" }),
```

---

## 7. Other Data Integrity Issues

### 7a. cartItems.productId is text with no FK (HIGH)
**File:** `drizzle/schema.ts`

```ts
cartItems = pgTable("cart_items", {
  accountId: integer("account_id").notNull().references(() => customerAccounts.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),  // ← TEXT, no FK
  ...
})
```

This is intentional by design — the `productId` field encodes both product IDs (`"123"`) and product+variant pairs (`"123-v456"`), making a single integer FK impossible. However, this means:
- Ghost cart rows accumulate when products or variants are deleted.
- The `GET /api/cart` handler gracefully returns `product: null` for these, so no crash — but the cart silently contains orphaned items.

**Fix options:**
1. (Immediate) Add cleanup to product and variant delete handlers (see §2 above).
2. (Long-term) Split `cartItems` into `productId integer` + `variantId integer nullable`, enabling proper FK constraints and cascades.

---

### 7b. stock column never decremented (LOW)
**File:** `drizzle/schema.ts` — `products.stock integer`

The `stock` column exists but the checkout/order creation path (`app/api/cashfree/verify/route.ts`) never decrements it. Stock can go negative without limit. There is no out-of-stock check before accepting payment.

**Fix:** Either remove the `stock` column if it is not used, or add stock validation + decrement in the verify handler (with a transaction to prevent race conditions).

---

### 7c. Missing FK indexes (LOW)
PostgreSQL does **not** automatically create indexes on FK columns (unlike MySQL). The following FK columns have no explicit index and will perform sequential scans on large tables:

| Table | Column | Impact |
|---|---|---|
| `products` | `category_id` | Filter products by category |
| `combo_items` | `product_id` | Join combos → products |
| `order_items` | `order_id` | Already cascaded, but queried per-order frequently |
| `order_items` | `product_id` | Null check + join on product fetch |
| `reviews` | `product_id` | Queried by product on every product page load |
| `reviews` | `account_id` | Queried per-customer |
| `reviews` | `order_id` | Queried per-order in review flow |
| `orders` | `account_id` | Queried per-customer in `/api/orders/mine` |
| `orders` | `customer_id` | Queried in admin customers view |

**Fix:** Add Drizzle index definitions:
```ts
// example
(table) => [
  uniqueIndex("products_slug_unique").on(table.slug),
  index("products_category_id_idx").on(table.categoryId),  // add
]
```

---

### 7d. orders.email vs customerAccounts.email for coupon tracking (LOW)
**File:** `app/api/coupons/eligible/route.ts`

```ts
.where(and(eq(orders.email, userEmail), eq(orders.paymentStatus, "paid")))
```

Coupon usage and `firstPurchase` checks are done by matching `orders.email` to the logged-in account's email. This is correct for normal flows. However:
- Guest orders (where `accountId` is null) placed with the same email before the user created an account ARE counted, which is the desired behavior.
- If a user changes their email on the account (via `PATCH /api/account`), the email in historical `orders` rows does NOT update (orders store a snapshot of email at order time). This means `perCustomer` coupon limits could be bypassed by changing the account email.

**Severity: LOW** (edge case, low abuse surface for a snacks store).  
**Fix:** Track coupon usage by `accountId` in addition to (or instead of) email, or join `orders` on `accountId` when available.

---

### 7e. orderItems price uses offerPrice, not a consistent "charged price" field (LOW)
**File:** `app/api/cashfree/verify/route.ts`

```ts
price: String(line.product.offerPrice)
```

`line.product.offerPrice` is the effective price (after offer). This is correct. However, if a product has no `offerPrice`, `priceOrder` falls back to `product.price`:
```ts
offerPrice = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
```

The `offerPrice` property on the `PricedLine` object is always the "charged price" regardless of whether it came from `offerPrice` or `price`. The naming is slightly confusing but functionally correct.

---

### 7f. type mismatch: cartItems.productId is text, enrichment parses as integer (LOW-INFO)
**File:** `app/api/cart/route.ts`

```ts
const numericIds = rows.map((r) => Number(r.productId)).filter((n) => !Number.isNaN(n));
```

Variant IDs like `"123-v456"` will parse as `NaN` and be filtered out, so variant-specific cart items will always have `product: null` in the enriched response (the base product is not returned). This affects the cart display — variant items will show no product info. Whether the UI handles this gracefully depends on the cart component.

**Severity: LOW** — investigate `components/checkout-wizard.tsx` and cart UI components to confirm null handling.

---

## Prioritized Finding Summary

| Priority | Severity | File | Description |
|---|---|---|---|
| 1 | **HIGH** | `drizzle/schema.ts`, `app/api/admin/products/[id]/route.ts`, `app/api/admin/products/[id]/variants/[variantId]/route.ts` | `cartItems.productId` is `text` with no FK; product/variant deletes do not clean up cart items |
| 2 | **HIGH** | `drizzle/schema.ts` | `comboItems.productId` FK has no `onDelete` rule; direct DB delete of a product would violate the constraint |
| 3 | **MEDIUM** | `drizzle/schema.ts` | `reviews` FKs (productId, accountId, orderId) all nullable with no `onDelete: "set null"` — safe today but fragile |
| 4 | **MEDIUM** | `drizzle/schema.ts` | `orders.customerId` and `orders.accountId` have no cascade/set-null; future customer delete endpoint would throw |
| 5 | **MEDIUM** | `app/api/admin/products/[id]/variants/[variantId]/route.ts` | Variant delete does not clean up cart items for `"${productId}-v${variantId}"` |
| 6 | **LOW** | `drizzle/schema.ts` | No `stock` decrement at checkout; stock data is meaningless |
| 7 | **LOW** | `drizzle/schema.ts` | Missing indexes on FK columns (`reviews.product_id`, `orders.account_id`, etc.) |
| 8 | **LOW** | `app/api/coupons/eligible/route.ts` | Coupon usage tracking by email only; email change could allow limit bypass |
| 9 | **LOW** | `app/api/admin/products/route.ts` | `categoryId` not validated against DB before insert; DB FK gives generic 500 error |
| 10 | **INFO** | `app/api/cashfree/verify/route.ts` | Weight not snapshotted in `orderItems`; historical orders can't reconstruct shipped weight |

---

## Recommended Fixes (Priority Order)

1. **Add cart cleanup to product delete** (`app/api/admin/products/[id]/route.ts`):  
   `await db.delete(cartItems).where(like(cartItems.productId, `${id}%`));`

2. **Add cart cleanup to variant delete** (`app/api/admin/products/[id]/variants/[variantId]/route.ts`):  
   `await db.delete(cartItems).where(eq(cartItems.productId, `${productId}-v${variantId}`));`

3. **Add `onDelete: "cascade"` to `comboItems.productId`** in `drizzle/schema.ts` + migrate.

4. **Add `onDelete: "set null"` to `reviews.productId`, `reviews.accountId`, `reviews.orderId`** in `drizzle/schema.ts` + migrate.

5. **Add `onDelete: "set null"` to `orders.customerId` and `orders.accountId`** in `drizzle/schema.ts` + migrate (future-proofing).

6. **Add FK indexes** in `drizzle/schema.ts` for `reviews.product_id`, `orders.account_id`, `order_items.order_id`, `order_items.product_id`.

7. **Fix or remove `products.stock`** — either implement decrement-on-order with a transaction, or drop the column if unused.
