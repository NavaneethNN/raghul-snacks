# Mobile Fix Verification — Iteration 1

## Changes Made

### admin-table.module.css
- Added `padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px))` to `.modal` at `@media (max-width: 768px)` — clears bottom nav bar
- Added `.modalContent { max-height: calc(100vh - 60px - 60px) }` inside that breakpoint — prevents form overflow behind nav
- Added `.formActions { padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) }` — Save button always visible
- Added `@media (max-width: 820px) { .formGrid { grid-template-columns: 1fr } }` — covers tablet gap between 820–1024px
- Added `.variantEditRow` and `.variantEditRow input` CSS classes — flex-wrap wrapping for variant inline-edit rows

### admin-sidebar.module.css
- Changed `.bottomNavBadge` background from amber `#f59e0b` to red `#ef4444`
- Added `border: 2px solid var(--ink)` to `.bottomNavBadge` for contrast halo

### admin-products.tsx
- Replaced inline `display:"flex"` wrappers on saved and draft variant edit rows with `className={styles.variantEditRow}` (removes flex overflow on narrow screens)
- Changed stat banner padding from `"24px 32px 8px"` to `"clamp(12px, 4vw, 24px) clamp(12px, 4vw, 32px) 8px"`

### admin-combos.tsx
- Added `width: "100%", boxSizing: "border-box"` to the outer selected-item row div — prevents overflow in combo form on mobile

### admin-settings.tsx
- Changed inner card `padding: "32px"` to `padding: "clamp(16px, 4vw, 32px)"` — adapts to narrow screens

### admin-shipping.tsx
- Changed rate input `width: 120` to `width: "min(120px, 40%)"` — prevents overflow on very narrow screens

### app/(store)/loading.tsx
- Refactored to use a `<style>` tag with critical CSS for the outer container, ensuring the flex centering is applied before JS hydration — fixes the spinner appearing at bottom-right corner before re-centering on mobile

### components/checkout-wizard.module.css
- Added `flex-wrap: wrap` and `min-width: 120px` to `.actions` at `@media (max-width: 480px)` — checkout buttons wrap instead of overflowing

### components/account-dashboard.module.css
- Added `.signOutConfirm { flex-wrap: wrap }` and `.signOutConfirm span { white-space: normal }` to `@media (max-width: 400px)` — sign-out confirmation row wraps on very small screens

## Items Verified as Already Correct (no change needed)
- `.variant-options` in globals.css already has `flex-wrap: wrap` (item 12 — skip)
- `.bottomNavIcon` in admin-sidebar.module.css already has `position: relative` (item 13 — confirmed)
- `admin-sidebar.tsx` already calls `setNewOrders(0)` when `pathname === '/admin/orders'` (item 14 — confirmed)
- `AdminHeaderActions` bell badge already uses `position: absolute, top: -5, right: -5` with correct styling (item 15 — confirmed)
- Cart page uses flex-wrap everywhere needed (note 3 from plan — confirmed)

## Commands Run

```
npx tsc --noEmit
# Exit 0, zero errors

npx next build
# Exit 0, compiled successfully in 20.7s, 46 pages generated
# Only pre-existing warnings about deprecated config fields (not introduced by these changes)
```
