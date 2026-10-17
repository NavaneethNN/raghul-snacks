# Implementation Plan — Mobile Responsiveness Fixes + Order Badge

All changes are CSS-only (CSS Modules) unless stated otherwise. No business logic changes.
Build command: `npm run build` (Next.js 14). Manual visual verification in browser DevTools at 375px and 414px.

---

## PRIORITY 1 — Critical (breaks layout / hides content)

- [ ] 1. Fix `.modal` bottom padding on mobile so the sheet is not obscured by the 56-60 px bottom nav bar.
      **File:** `components/admin-table.module.css`
      **Change:** In the `@media (max-width: 768px)` block, the `.modal` rule already sets `padding-top: 60px` to clear the top bar. Add `padding-bottom: 64px` (or `calc(56px + env(safe-area-inset-bottom, 0px))`) so the bottom of the sheet always clears the fixed bottom nav.
      Also set `.modalContent { max-height: calc(100vh - 60px - 64px) }` inside that breakpoint so the scrollable `.form` area never extends behind the nav.
      **Verify:** Open any admin modal on a 375 px viewport; scroll to the bottom of a long form; Save/Cancel buttons must be visible above the bottom nav.

- [ ] 2. Fix `.formActions` sticky bar not clearing the bottom nav.
      **File:** `components/admin-table.module.css`
      **Change:** Inside `@media (max-width: 768px)`, add a rule:
      ```css
      .formActions {
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
      ```
      Because `.formActions` is `position: sticky; bottom: 0` inside the scrollable `.form` div, this ensures the Save button is never clipped by the nav or a device notch.
      **Verify:** Create/edit a product on mobile; the Save button must be fully visible when scrolled to the bottom of the form.

- [ ] 3. Fix the product variant inline-edit row overflowing on narrow screens.
      **File:** `components/admin-table.module.css` (add new helper) and/or inline styles in `components/admin-products.tsx`.
      **Finding:** The saved-variant edit row uses `display: flex; gap: 8px` with three `<input>` elements side-by-side and two action buttons — at 375 px this stretches beyond the modal. Currently rendered with inline styles (no CSS class).
      **Change:** Wrap the three variant inputs in a new CSS class `.variantEditRow` in `admin-table.module.css` (since all admin forms share it):
      ```css
      .variantEditRow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .variantEditRow input {
        flex: 1 1 80px;
        min-width: 0;
      }
      ```
      Then in `admin-products.tsx`, replace the inline `display:"flex"; gap:8` wrapper on the edit row with `className={styles.variantEditRow}`.
      **Verify:** Open Edit Product on a 375 px screen; the inline variant editor must show inputs stacked/wrapped, not overflowing.

- [ ] 4. Fix the selected-items row in admin-combos (Qty input + product name) overflowing.
      **File:** `components/admin-combos.tsx`
      **Finding:** The selected product row uses `display:"flex"; alignItems:"center"; justifyContent:"space-between"` with `flexWrap:"wrap"` — that part is fine. But the inline `width:"72px"` on the Qty input has no `min-width: 0` and the label `"Qty:"` is an inline label that doesn't shrink. On 375 px the row can still push past modal edges because the parent container has no `width: 100%; box-sizing: border-box`.
      **Change:** Add `boxSizing: "border-box", width: "100%"` to the outer `<div>` of each selected-item row (the `display:"flex"` div). Confirm the Qty input already has `boxSizing:"border-box"` (it does). No other change needed.
      **Verify:** Open Create/Edit Combo on 375 px; add 2+ products; the product name + qty input row must not overflow the modal.

---

## PRIORITY 2 — Admin form responsiveness (forms going off-screen)

- [ ] 5. `admin-table.module.css` — ensure `.formGrid` collapses to 1 column at 768 px and below (currently only at 1024 px).
      **File:** `components/admin-table.module.css`
      **Finding:** The `@media (max-width: 1024px)` block already collapses `.formGrid` to `1fr`. But on a real 768 px device, the `1024px` breakpoint fires first only if the viewport is above 1024 px; on 768 px it fires correctly. However the `.modal` does not set `padding: 0` until 768 px — so on a 769–1024 px tablet, the modal is still `max-width: 700px` with 2-column grid inside a narrower viewport (e.g. 800 px tablet). 
      **Change:** Add to `@media (max-width: 820px)`:
      ```css
      .formGrid {
        grid-template-columns: 1fr;
      }
      ```
      This covers all tablet breakpoints from 820 px down, which is consistent with the checkout-wizard breakpoint.
      **Verify:** On a 768–820 px viewport, any admin modal form (products, combos, categories) must show single-column fields.

- [ ] 6. `admin-announcements.tsx` — the `formGrid` 2-column layout (Icon / Order fields) collapses correctly because it inherits from `admin-table.module.css`, so no extra fix is needed. However the form in the announcement modal has no standalone issue beyond item 5 above. Confirm by inspection only.

- [ ] 7. `admin-settings.tsx` — the `workspace` has `margin: "32px auto"` and inline `padding: "32px"` which is too large on mobile.
      **File:** `components/admin-settings.tsx`
      **Change:** Wrap the three inline-styled password inputs in a responsive block. The outer `<section>` uses `styles.workspace` which already handles margin. Change the inner `div` `padding: "32px"` to `padding: "clamp(16px, 4vw, 32px)"`.
      **Verify:** Open `/admin/settings` on 375 px; the change-password form must fit within the screen with no horizontal scroll.

- [ ] 8. `admin-shipping.tsx` — the rate input has `width: 120` (inline, no units — treated as 120px). On very narrow screens this may clip.
      **File:** `components/admin-shipping.tsx`
      **Change:** Change `width: 120` → `width: "min(120px, 40%)"` (still inline).
      **Verify:** Open `/admin/shipping` on 375 px; the rate input must not overflow its row.

---

## PRIORITY 3 — Store page responsiveness

- [ ] 9. Fix the store loading spinner appearing at bottom-right before centering.
      **File:** `app/(store)/loading.tsx`
      **Finding:** The outer `<div>` has `position: "fixed"`, `width: "100vw"`, `height: "100vh"`, `display: "flex"`, `alignItems: "center"`, `justifyContent: "center"` — this is correct and should always centre the spinner. The reported bug (appearing bottom-right first) is a hydration flash: during SSR/hydration the inline styles may not apply until JS runs, so the browser renders the bare `<span>` without flex centering. The `<span>` is an inline element so it flows to wherever text would land.
      **Change:** Add `display: "block"` and `margin: "auto"` to the `<span>`, and add an extra wrapping class to ensure the outer div renders with flex even before JS:
      ```tsx
      // In loading.tsx — add a <style> tag for the outer container too
      <style>{`
        #store-loading-wrap {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center;
          width: 100vw; height: 100vh; background: #faf8f5; z-index: 99999;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div id="store-loading-wrap">
        <span style={{ display:"block", width:32, height:32, border:"3px solid #dcd8cd",
          borderTopColor:"#c95f3b", borderRadius:"50%", animation:"spin 0.75s linear infinite" }}
          aria-label="Loading…" />
      </div>
      ```
      Remove the inline styles from the outer `<div>` (they're now in the `<style>` tag to guarantee critical CSS before hydration).
      **Verify:** On mobile Chrome with 3G throttling, hard-refresh any store page; the spinner must appear centred from the first paint.

- [ ] 10. `checkout-wizard.module.css` — `.actions` row has `flex-wrap: nowrap` which can clip buttons on narrow screens with long labels.
       **File:** `components/checkout-wizard.module.css`
       **Change:** At `@media (max-width: 480px)`, add:
       ```css
       .actions {
         flex-wrap: wrap;
       }
       .actions :global(.button) {
         min-width: 120px;
       }
       ```
       **Verify:** At 360 px, the checkout Next/Back button row must wrap if needed, never overflow.

- [ ] 11. `checkout-wizard.module.css` — `.fields` grid does not collapse until 820px breakpoint (`.fields { grid-template-columns: 1fr }` is already there) — this is already correct. No change needed. Confirm by inspection.

- [ ] 12. `product-detail-view` global CSS — variant selector buttons (`.variant-options`) may overflow if many variants exist on 375 px.
       **File:** `app/globals.css`
       **Finding:** Search for `.variant-options` to confirm wrap behaviour.
       **Change:** Ensure `.variant-options` has `flex-wrap: wrap` in its rule. If not present, add it. (If it is already present, skip this step.)
       **Verify:** On a product with 4+ variants at 375 px, variant buttons wrap to a second line.

---

## PRIORITY 4 — Order notification badge on mobile bottom nav (TASK 2)

- [ ] 13. Verify `.bottomNavBadge` visual appearance matches spec.
       **File:** `components/admin-sidebar.module.css`
       **Finding (from code read):** `.bottomNavBadge` is already defined with `position: absolute; top: -4px; right: -6px; background: #f59e0b; color: #fff; border-radius: 999px; font-size: 9px; font-weight: 700; padding: 2px 4px; min-width: 14px; text-align: center`.
       **Issue:** The badge uses amber (`#f59e0b`) not red. The desktop `.badge` also uses amber. The user's requirement is a "red circle". Change `.bottomNavBadge` background to `#ef4444` (red) for clear visual distinction.
       Also add `border: 2px solid var(--ink)` to give a halo so it doesn't bleed into the icon.
       **Change:**
       ```css
       .bottomNavBadge {
         background: #ef4444;
         border: 2px solid var(--ink);
       }
       ```
       **Verify:** With a new order pending, the Orders icon in the mobile bottom nav must show a red circle badge with the order count.

- [ ] 14. Verify badge clears when visiting `/admin/orders`.
       **File:** `components/admin-sidebar.tsx`
       **Finding:** The `useEffect` already contains `if (pathname === "/admin/orders") setNewOrders(0)` — this is correct and working.
       No code change needed. Document as verified.

- [ ] 15. Verify `AdminHeaderActions` bell badge on mobile top bar.
       **File:** `components/admin-header-actions.tsx`
       **Finding:** The bell button renders with `variant="dark"` from `admin-sidebar.tsx`'s `<AdminHeaderActions variant="dark" />`. The badge in `AdminHeaderActions` is rendered via inline styles (`position: absolute; top: -5; right: -5; background: var(--terracotta)`) which are already correct and always rendered. The `badgeBorder` adapts for dark bg via `variant`.
       No code change needed. Document as verified.

---

## PRIORITY 5 — Supplement / nice-to-have

- [ ] 16. `account-dashboard.module.css` — `.signOutConfirm` uses `white-space: nowrap` on the label text which may overflow on very small screens (< 360 px).
       **File:** `components/account-dashboard.module.css`
       **Change:** In `@media (max-width: 400px)`:
       ```css
       .signOutConfirm {
         flex-wrap: wrap;
       }
       .signOutConfirm span {
         white-space: normal;
       }
       ```
       **Verify:** At 360 px, the sign-out confirmation row must not overflow the card.

- [ ] 17. `admin-table.module.css` — `.workspace` on `@media (max-width: 480px)` has `margin: 8px`. On 375 px this is fine. However the stat banners row in `admin-products.tsx` uses `padding: "24px 32px 8px"` inline — this is too wide on mobile.
       **File:** `components/admin-products.tsx`
       **Change:** Replace the inline `padding: "24px 32px 8px"` on the stats banner `<div>` with `padding: "clamp(12px, 4vw, 24px) clamp(12px, 4vw, 32px) 8px"`.
       **Verify:** Open `/admin/products` on 375 px; stat cards must not overflow the screen edge.

---

## Notes & Assumptions

1. **`.bottomNavBadge` colour change (item 13):** The desktop `.badge` in the sidebar stays amber (amber = messages/notifications convention). Only the mobile bottom nav badge is changed to red because the user specifically said it should be a "red circle".

2. **Store loading spinner (item 9):** The reported "bottom-right corner then re-centering" is a classic SSR hydration flash. The fix (critical CSS in a `<style>` tag) ensures the layout rules exist before React hydrates.

3. **No changes to cart page (`app/(store)/cart/page.tsx`):** Reading the file confirms it uses inline flexbox with `flex-wrap` everywhere that matters. No fix needed.

4. **No changes to login/signup pages:** Not read in full but they use simple single-column forms — low risk. If the implementer finds issues, the same pattern applies: `grid-template-columns: 1fr` at ≤480px.

5. **Verification command:** After each item, run `npm run build` from the project root to confirm no TypeScript/CSS Module errors. There are no unit tests for CSS.
