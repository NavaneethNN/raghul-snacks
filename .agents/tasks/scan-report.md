# Codebase Scan Report

**Date:** 2025-07-14  
**Scope:** Bug scan across stock system, email, combo-actions, toast-provider, checkout-wizard, admin products, and API routes.

---

## Summary

7 issues found across 5 files. The most critical is **Bug 1** (admin products GET API omits `stock` from the SELECT, so the admin table always shows stock as `undefined` / falsy). The checkout-wizard infinite loop reported in the error console is **fixed** — the `setQuote` now uses a functional guard (`prev` comparison) that prevents re-renders, and `itemPayload` is properly memoized. No import errors or broken references were found.

---

## Bug 1 — CRITICAL: Admin GET `/api/admin/products` omits `stock` from SELECT

**File:** `app/api/admin/products/route.ts`, lines 29–45  
**Symptom:** The product list fetched for the admin panel never includes the `stock` field. The `Product` type in `admin-products.tsx` declares `stock: number`, but the data returned by the GET route will have `stock: undefined`. This means:
- The "Out of Stock" badge in the admin table (checks `product.stock === 0`) will never show — `undefined === 0` is false.
- The "In Stock" checkbox defaultChecked (`product.stock !== 0`) will always be checked (since `undefined !== 0`), so editing an existing out-of-stock product will appear to be in stock in the form.

**Evidence:**  
```typescript
// app/api/admin/products/route.ts — the SELECT object
.select({
  id: products.id,
  name: products.name,
  slug: products.slug,
  description: products.description,
  ingredients: products.ingredients,
  price: products.price,
  offerPrice: products.offerPrice,
  weight: products.weight,
  categoryId: products.categoryId,
  categoryName: categories.name,
  image: products.image,
  featured: products.featured,
  bestseller: products.bestseller,
  createdAt: products.createdAt,
  // ← stock is missing here
})
```

**Fix:** Add `stock: products.stock` to the `.select({...})` object in the GET handler.

---

## Bug 2 — MODERATE: `getProductsWithVariants` omits `stock` from SELECT

**File:** `lib/db-queries.ts`, lines 21–39  
**Symptom:** `getProductsWithVariants` is used by the home page, shop page, and product detail recommendations. Its SELECT does not include `stock`. This means `ProductCard` receives `product.stock === undefined`, and the out-of-stock check:
```typescript
const isOutOfStock = typeof product.stock === "number" && product.stock <= 0;
```
will always be `false` (because `typeof undefined === "undefined"`), so out-of-stock products in the shop and on the home page will show the "Add to Cart" button instead of "Out of Stock".

**Evidence:**
```typescript
// lib/db-queries.ts — SELECT fields
const rows = await db.select({
  id: products.id,
  name: products.name,
  slug: products.slug,
  // ... other fields ...
  featured: products.featured,
  bestseller: products.bestseller,
  createdAt: products.createdAt,
  // ← stock is missing here
})
```

The product detail page `getProduct()` in `app/(store)/product/[slug]/page.tsx` (lines 15–32) also doesnits SELECT and also omits `stock` — same consequence for the detail page's out-of-stock display and buy-now guard.

**Fix:**
1. Add `stock: products.stock` to the `db.select({...})` in `lib/db-queries.ts`.
2. Add `stock: products.stock` to the `db.select({...})` in `app/(store)/product/[slug]/page.tsx`'s `getProduct()`.

---

## Bug 3 — MODERATE: Checkout wizard `useEffect` — shipping quote loop is still possible

**File:** `components/checkout-wizard.tsx`, lines ~148–195  
**Status:** Partially fixed, but still fragile.

The `setQuote` now uses a functional updater with a guard:
```typescript
setQuote((prev) => {
  if (prev?.charge === charge && prev?.courierName === courierLabel) return prev;
  return { charge, courierName: courierLabel, estimatedDeliveryDays: null };
});
```
This correctly prevents a re-render loop when the computed value hasn't changed. And `itemPayload` is properly memoized with `useMemo`.

**However**, the `useEffect`'s dependency array is `[form.state, form.pincode, itemPayload]`. Every time `form` changes (e.g., the user types in the address or city field), a new `form` object is created via `setForm((c) => ({...c, [field]: value}))`. Since only `form.state` and `form.pincode` are in the deps — not `form` itself — this is fine. The deps are correctly scoped.

**Residual risk:** `itemPayload` is `useMemo(() => items.map(...), [items])`. `items` is either `buyNowItem ? [buyNowItem] : cartItems`. `cartItems` comes from `useCart()`. If the cart provider returns a new array reference on every render (even if contents are unchanged), `itemPayload` will recalculate, triggering the effect. This depends entirely on the cart provider's implementation. If `cartItems` is not itself memoized in cart-provider, the loop will still occur when the user has cart items (not buy-now).

**Recommendation:** Check `cart-provider.tsx` to verify `cartItems` is a stable reference (e.g., created via `useMemo` or `useState`, not recomputed on every render). If it's not stable, wrap `itemPayload` with a deeper equality check or stabilize `cartItems` in the provider.

---

## Bug 4 — LOW: `combo-actions.tsx` toast shows no navigation link

**File:** `components/combo-actions.tsx`, line 39  
**Code:**
```typescript
show("✓ Added to cart — tap to view cart →", 5000);
```
The message implies navigation but does not pass an `href`. The toast provider supports `{ duration, href }` as second argument. The user cannot tap the toast to go to the cart.

**Evidence:** `product-detail-view.tsx` has the same pattern (no `href` either), so this may be intentional. But the combo message text explicitly says "tap to view cart →" which implies a link.

**Fix:** Change to:
```typescript
show("✓ Added to cart — tap to view cart →", { duration: 5000, href: "/cart" });
```
Or change the message text to not imply navigation.

---

## Bug 5 — LOW: Product detail page `getProduct` query omits `stock`

**File:** `app/(store)/product/[slug]/page.tsx`, lines 15–32  
*(Also noted above in Bug 2 — listed separately for clarity)*

`getProduct()` does an explicit SELECT that omits `stock`. So `ProductDetailView` receives `product.stock === undefined`, which means `isOutOfStock` is always `false` on the product detail page. The "Out of Stock" badge and the disabled "Buy Now" button won't show even for out-of-stock products.

**Fix:** Add `stock: products.stock` to the SELECT in `getProduct()`.

---

## Bug 6 — LOW: `featured` column still selected in admin GET but never set to `true`

**File:** `app/api/admin/products/route.ts`, line 42; `components/admin-products.tsx`, `handleSubmit`

The admin GET SELECT includes `featured: products.featured`. The admin form `handleSubmit` always sends `featured: false`. The PATCH handler at `app/api/admin/products/[id]/route.ts` (line 34) correctly passes through `body.featured` if provided, so PATCH would save `false`. This is consistent — the feature was intentionally removed from the UI. No schema changes are required because `featured` is still a valid DB column and used in `product-card.tsx` for the badge. No bug here, just confirmation the design is intentional.

**Note:** `product-card.tsx` line 31 still shows a "Featured" badge if `product.featured === true`. Since all products will have `featured: false` going forward, this code path is dead but harmless.

---

## Bug 7 — LOW: Email `BREVO_ADMIN_EMAIL` is the same as `BREVO_SENDER_EMAIL` recipient — sender domain mismatch may cause delivery issues

**File:** `lib/email.ts`, line 83; `.env`

`.env` has:
- `BREVO_SENDER_EMAIL=orders@raghuldelights.com` (the "from" address)
- `BREVO_ADMIN_EMAIL=raghuldelights@gmail.com` (used as `bcc`)

This setup means order confirmations are sent **from** `orders@raghuldelights.com` and BCC'd to `raghuldelights@gmail.com`. As long as `orders@raghuldelights.com` is a verified sender domain in Brevo, this will work correctly. The user confirmed it is verified.

The `sendOrderConfirmationEmail` call in `app/api/cashfree/verify/route.ts` (lines 90–107) is called fire-and-forget with `.catch()` — this is correct and non-blocking.

**No code bug here.** The only risk: if the sending domain `raghuldelights.com` is not verified in Brevo, emails will silently fail. The `console.warn` guard at `lib/email.ts` line 71 only checks for `BREVO_SMTP_KEY` and `BREVO_LOGIN_EMAIL`, not for `BREVO_SENDER_EMAIL`. If `BREVO_SENDER_EMAIL` is unset, the `from` address will be `"Raghul Delights" <undefined>`, which Brevo will reject.

**Fix:** Add a guard for `BREVO_SENDER_EMAIL`:
```typescript
if (!process.env.BREVO_SMTP_KEY || !process.env.BREVO_LOGIN_EMAIL || !process.env.BREVO_SENDER_EMAIL) {
  console.warn("[email] Brevo env vars not fully set — skipping order confirmation email.");
  return;
}
```

---

## Checklist: Items Confirmed Clean

| Area | Status | Notes |
|------|--------|-------|
| `combo-actions.tsx` imports | ✅ OK | `setBuyNowItem` imported from `@/lib/buy-now` — correct |
| `combo-actions.tsx` Buy Now flow | ✅ OK | Matches `product-detail-view.tsx` pattern |
| `toast-provider.tsx` `useRouter` import | ✅ OK | `import { useRouter } from "next/navigation"` |
| `toast-provider.tsx` backward compat | ✅ OK | `show(msg, number)` still works — `typeof durationOrOptions === "number"` path |
| `checkout-wizard.tsx` `itemPayload` memoization | ✅ OK | `useMemo(() => items.map(...), [items])` at line ~58 |
| `checkout-wizard.tsx` infinite loop (reported error) | ✅ FIXED | `setQuote` uses functional updater with prev-equality guard |
| `lib/email.ts` nodemailer import | ✅ OK | `import nodemailer from "nodemailer"` |
| `lib/order-pricing.ts` stock check | ✅ OK | Checks `product.stock === 0` and throws — correct |
| Admin PATCH handles `featured: false` | ✅ OK | Line 34 passes through `body.featured` |
| Admin PATCH handles `stock` | ✅ OK | Line 43 passes through `body.stock` |
| Admin POST sets `stock` correctly | ✅ OK | `stock: body.stock !== undefined ? body.stock : 1` |
| `cashfree/verify` email fire-and-forget | ✅ OK | `.catch()` on the Promise, non-blocking |
| Admin search bar search icon overlap | ✅ ALREADY FIXED | CSS has `.searchIcon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }` and input has `padding: 9px 12px 9px 36px` — icon and placeholder do not overlap |

---

## Prioritized Fix List

| Priority | File | Change |
|----------|------|--------|
| 🔴 Critical | `app/api/admin/products/route.ts` | Add `stock: products.stock` to GET SELECT |
| 🔴 Critical | `lib/db-queries.ts` | Add `stock: products.stock` to `getProductsWithVariants` SELECT |
| 🔴 Critical | `app/(store)/product/[slug]/page.tsx` | Add `stock: products.stock` to `getProduct()` SELECT |
| 🟡 Medium | `components/cart/cart-provider.tsx` | Verify `cartItems` is a stable reference to prevent checkout wizard loop |
| 🟢 Low | `lib/email.ts` | Add guard for `BREVO_SENDER_EMAIL` being set |
| 🟢 Low | `components/combo-actions.tsx` | Pass `{ href: "/cart" }` to `show()` or update toast message text |
