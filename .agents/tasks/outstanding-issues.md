# Outstanding Issues Audit Report

Audited: components/admin-shipping.tsx, components/admin-products.tsx, components/admin-combos.tsx,
components/admin-categories.tsx, components/customer-orders.tsx, components/order-tracker.tsx,
components/product/review-form.tsx, app/layout.tsx, components/toast-provider.tsx,
components/navigation-progress.tsx, app/(store)/track/page.tsx, app/api/settings/route.ts,
components/checkout-wizard.tsx (shipping logic section).

---

## 1. SHIPPING PAGE — Zone-based rate editor

**Status: TODO**

`components/admin-shipping.tsx` still shows the **old UI**: a single "Standard Shipping Rate (₹)"
input and a "Shiprocket API Key" password field. It reads/writes keys
`standardShippingRate` and `shiprocketApiKey` via `/api/settings`.

The actual shipping logic is **already zone-based and hardcoded** in
`components/checkout-wizard.tsx` lines 127–164:

```
Zone 1/2 — Tamil Nadu:                   base ₹60  +₹30/extra kg
Zone 3 — Kerala, Karnataka, AP, Telangana: base ₹100 +₹30/extra kg
Zone 4 — all other states (air):          base ₹250 +₹30/extra kg
```

These four values (`zone2Rate=60`, `zone3Rate=100`, `zone4Rate=250`,
`extraKgRate=30`) are **literal numbers** — not read from `/api/settings` or
any DB row.

The `/api/settings` API (`app/api/settings/route.ts`) is generic key/value and
can store any new keys, so there is no backend blocker.

**What needs to change:**
- Rebuild `admin-shipping.tsx` to show four editable fields:
  - Tamil Nadu base rate (currently 60)
  - Kerala/Karnataka/AP/Telangana base rate (currently 100)
  - North India / air base rate (currently 250)
  - Extra kg surcharge (currently 30)
- Save them as settings keys e.g. `shippingZone2Rate`, `shippingZone3Rate`,
  `shippingZone4Rate`, `shippingExtraKgRate`.
- Remove the Shiprocket API Key field (user asked for this explicitly).
- In `checkout-wizard.tsx`, replace the four hardcoded literals with a
  `useEffect`/`fetch("/api/settings")` call on mount so the UI reads live DB
  values.

---

## 2. REVIEW BADGES on customer-orders.tsx

**Status: DONE**

`components/customer-orders.tsx`:
- Fetches `/api/reviews/mine` after loading orders (lines 44–50) and stores
  `reviewedProductIds`.
- For each order item, shows a "✍ Review" badge only when
  `displayOrder.paymentStatus === "paid"` AND the product has not yet been
  reviewed (line ~168–177).
- Badge links to `/product/{slug}#reviews`.

The condition also shows the badge on non-delivered paid orders (any payment status
"paid"). If the requirement is **only delivered** orders, the check should be
`orderStatus === "delivered" && paymentStatus === "paid"`. As written, it
shows on all paid orders regardless of delivery status.

**Minor gap:** Badge appears for all paid orders, not just delivered ones.
If scoping to delivered only is required, add `displayOrder.orderStatus === "delivered"` to the condition.

---

## 3. GUEST REVIEW on order-tracker

**Status: TODO**

`app/api/reviews/guest/route.ts` — **does not exist**. Confirmed: the
`app/api/reviews/` directory contains only `route.ts`, `batch/route.ts`, and
`mine/route.ts`.

`components/order-tracker.tsx` — shows only a status timeline and tracking
details. There is **no review form or review prompt** for delivered guest
orders.

`app/(store)/track/page.tsx` — simply renders `<OrderTracker>` with no review
UI.

**What needs to be built (if required):**
- `app/api/reviews/guest/route.ts` — accepts `{ orderNumber, phone, productId, rating, content }`, validates the order belongs to that phone, and inserts a review.
- `components/order-tracker.tsx` — after a delivered result, show a mini review form per item that submits to the guest route.

---

## 4. UNUSED `Link` IMPORT in review-form.tsx

**Status: DONE (no issue)**

`components/product/review-form.tsx` imports `Link` from `next/link` (line 4)
but the component body never renders a `<Link>` element — it renders only
`<form>`, `<button>`, and `<section>` tags.

**This import is still unused.** It will produce a lint/compiler warning but not
a runtime error. It should be removed.

**Correction:** This is actually **TODO** — the import is present but unused.
Remove `import Link from "next/link";` from `review-form.tsx`.

---

## 5. COMBO STAT BANNERS

**Status: TODO**

`components/admin-combos.tsx` has **no stat banners**. The `<header>` is
followed directly by `<section className={styles.workspace}>` with the table.
No summary metric cards (total combos, active, etc.) exist.

Per the user's message 12: "no need stat banners for categories pages" — but
combos were not explicitly excluded. The user asked for stat banners on the
products page and that's done. The combos page was not specifically requested to
have them, but it is inconsistent. This is at implementer/product discretion.

---

## 6. ADMIN SHIPPING PAGE — zone-based editor

**Status: TODO** (same as item 1 — this is the same file)

The page still shows the old Shiprocket/single-rate UI. Zone-based editor has
not been implemented.

---

## 7. PRELOADER BOTTOM-RIGHT

**Status: CLEAR — no bottom-right fixed element**

`app/layout.tsx` renders:
1. `<NavigationProgress />` — `components/navigation-progress.tsx` renders a
   3px-tall bar at `position: fixed; top: 0; left: 0; right: 0`. **Top**, not
   bottom-right.
2. `<ToastProvider>` — `components/toast-provider.tsx` renders a toast at
   `position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%)`.
   This is **bottom-center**, not bottom-right, and is invisible until a toast
   fires.

No fixed bottom-right element exists in the layout providers. If a bottom-right
preloader was seen it was likely a browser extension or an admin-specific toast
(the admin shipping/products pages have their own inline `position: fixed;
bottom: 24; right: 24` toast, but those only appear while saving, not on initial
load).

**No action required.**

---

## 8. VARIANT EDIT (admin-products.tsx)

**Status: PARTIAL**

When editing a product that already has variants (`savedVariants`), the saved
variants are displayed (lines ~450–470 of `admin-products.tsx`) with only a
**delete button** (trash icon) per variant row. There is **no edit/pencil
button** to modify a saved variant's label, price, or offer price in place.

The user can workaround by deleting and re-adding, but inline editing is not
available.

**What needs to change:**
- Add an edit button alongside the delete button on each saved-variant row.
- On click, populate the `draftLabel`/`draftPrice`/`draftOffer` fields with
  that variant's values and switch to an "Update" action that calls `PATCH
  /api/admin/products/{productId}/variants/{variantId}` (or DELETE + POST if
  the API lacks PATCH for variants).

---

## Summary Table

| # | Issue | Status | File(s) |
|---|-------|--------|---------|
| 1 | Shipping page: zone-based rate editor | **TODO** | `components/admin-shipping.tsx`, `components/checkout-wizard.tsx` |
| 2 | Review badges on customer-orders | **DONE** (minor: shows on all paid, not just delivered) | `components/customer-orders.tsx` |
| 3 | Guest review on order-tracker | **TODO** | `components/order-tracker.tsx`, `app/(store)/track/page.tsx`, missing `app/api/reviews/guest/route.ts` |
| 4 | Unused `Link` import in review-form.tsx | **TODO** (still present) | `components/product/review-form.tsx` line 4 |
| 5 | Combo stat banners | **TODO** (no banners exist; not explicitly requested) | `components/admin-combos.tsx` |
| 6 | Admin shipping page (duplicate of 1) | **TODO** | `components/admin-shipping.tsx` |
| 7 | Preloader bottom-right | **CLEAR** (no such element in layout) | `app/layout.tsx` |
| 8 | Variant edit button | **PARTIAL** (delete only, no edit) | `components/admin-products.tsx` |

## Priority Recommendations

1. **Shipping page rebuild** (items 1/6) — highest user impact; admin has no
   way to adjust rates without a code deploy. Rebuild `admin-shipping.tsx` with
   four zone-rate fields + extra-kg field; wire `checkout-wizard.tsx` to fetch
   those from `/api/settings` at runtime.

2. **Unused `Link` import** (item 4) — trivial one-line fix; remove it.

3. **Variant edit** (item 8) — quality-of-life improvement; add an inline edit
   mode for saved variants.

4. **Guest reviews** (item 3) — new API route + tracker UI change; implement
   only if guest post-delivery reviews are a product requirement.

5. **Review badge scope** (item 2 minor) — if showing the badge only after
   delivery is required, add `orderStatus === "delivered"` to the condition in
   `customer-orders.tsx`.
