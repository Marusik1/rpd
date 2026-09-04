# Visual QA — 390 × 844

Source of truth: [`docs/references/rpd-mobile-collage.png`](../../../docs/references/rpd-mobile-collage.png).

Captured with Playwright from the production Vite build. The deterministic catalog exists only in the Playwright route fixture and is not included in `public/catalog.json` or the production bundle.

## 01 — Home → collage phone 1

Artifact: `01-home.png`

- 16 px content padding and full-width single mobile column match the source composition.
- Heading, subtitle, neutral search surface, 12–14 px card radii, circular red/black education icons, and compact secondary text follow the reference hierarchy.
- Two recent documents and the safe-area-aware three-item bottom navigation are visible without overlap.
- Red is limited to brand/action states; inactive navigation and chevrons stay neutral.

## 02 — Bachelor course selection → collage phone 2

Artifact: `02-bachelor.png`

- Back control, title/subtitle, and five vertically stacked 56 px course cards match the reference order and density.
- Card width, border, shadow, radius, icon scale, text weight, and chevron alignment are consistent across all rows.
- Bottom navigation is intentionally absent on this deeper route, matching the collage.

## 03 — Discipline list → collage phone 3

Artifact: `03-course.png`

- Course heading and compact neutral search field align with the reference.
- Six document rows fit comfortably in the 390 × 844 viewport; long names wrap without clipping or reducing the touch target.
- Red outline document icons, smaller gray discipline codes, and neutral chevrons preserve the source hierarchy.

## 04 — Master programs → collage phone 4

Artifact: `04-master.png`

- Two compact white program cards use one column with red outline icons and right chevrons.
- First-course pills use the brand red selected state; second-course pills remain white with a neutral border.
- Program names wrap naturally and the vertical spacing stays close to the source layout.

## 05 — Document detail → collage phone 5

Artifact: `05-document.png`

- Document icon, title, code, description, education/course badges, and two independent full-width actions follow the source order.
- Primary red and secondary bordered CTA heights and radii match the mobile control system.
- The captured green success notice mirrors the only green state permitted by the reference.
- Functional E2E also verifies the `checking` and `unavailable` states remain inside this screen without clipping or layout failure.

## Width and interaction checks

- Functional Playwright checks pass at 320, 375, 390, and 430 px.
- The same mobile composition scales naturally; no alternate desktop/tablet layout exists.
- No horizontal overflow, clipped controls, hidden final content, or bottom-navigation overlap was observed.
- Touch targets remain at least 44 px; motion is restrained and disabled under reduced-motion preference.
