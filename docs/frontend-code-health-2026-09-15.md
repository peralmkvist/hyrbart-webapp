# Frontend code-health audit — 2026-09-15

## Scope

This cleanup is deliberately behavior-preserving. It does not redesign the UI, write to Sanity, change product data, or merge/deploy to production. The goal is to reduce accidental CSS coupling, make ownership clearer, and add guardrails before more UI work is layered on top.

## Changes completed

- `app/globals.css` was reduced from 25,922 bytes to 440 bytes (about 98.3% smaller). It now contains document-level primitives only and no class selectors.
- The former feature/page rules from `globals.css` were isolated in `app/legacy-ui.css`. This is an explicit compatibility/migration layer rather than pretending the legacy cascade is already fully modernized.
- `app/layout.tsx` now has a readable, explicit global stylesheet import order. Inline `html`/`body` layout styles were moved into CSS.
- `guide-fixes.css` was removed and its only rule moved into the owning shared page stylesheet (`pages2.css`).
- `heading-spacing.css` was removed and its rental-search rules moved into the existing rental-search override stylesheet (`rental-search-polish.css`).
- A permanent `scripts/frontend-code-health.mjs` audit was added and wired into `npm run code-health:frontend` and `npm run test:quality`.
- A lightweight GitHub Actions workflow now runs the frontend code-health gate on pushes and pull requests.

## Current audit snapshot

The final audit reports:

- 36 CSS files, 201,967 CSS bytes in total.
- 27 global stylesheet imports in `app/layout.tsx`.
- 440 bytes in `globals.css`.
- 336 `!important` declarations.
- 5 remaining stylesheet filenames that explicitly signal patch/fix/polish debt: `host-calendar-sticky-fix.css`, `launch-polish.css`, `page-alignment-fixes.css`, `rental-search-polish.css`, and `ui-fixes.css`.
- 262 TS/TSX files inspected.
- 636 inline `style={{...}}` objects. This is an inventory signal, not evidence that all 636 are wrong; many may be genuinely dynamic.
- One frontend TS/TSX file over 20 KB: `components/HostCalendar.tsx` at 23,083 bytes.
- CSS files over 12 KB: `designsystem2.css` (14,072), `host-calendar.css` (14,006), `host-listings.css` (12,018), and the transitional `legacy-ui.css` (25,415).

The code-health gate passes with the current branch state.

## Validation completed

A temporary validation workflow was used during the cleanup and removed afterwards. On the validated application changes:

- Lifecycle tests: 16 passed, 0 failed.
- Next.js production build: successful, including lint/type validation and generation of 208 static pages.
- Playwright public smoke/accessibility suite: 14 passed across desktop and mobile Chromium.
- The Vercel preview deployment for the validated application commit reached `READY`.

The Playwright run emitted expected local-CI noise because Supabase server/admin environment variables were intentionally not supplied to this public smoke suite; affected code paths failed closed and the smoke/accessibility assertions still passed. Authenticated application behavior was not rewritten by this cleanup.

## Dependency/security audit

`npm audit --omit=dev` currently reports 22 vulnerabilities in the runtime dependency graph: 10 moderate, 11 high, and 1 critical.

The critical finding is in the transitive `decompress <=4.2.1` dependency used through the current Sanity toolchain. Other findings include transitive Sanity/CLI packages, `postcss`, `glob`, `adm-zip`, `valibot`, `uuid`, and related packages. Direct packages implicated by the audit include the current `next`, `next-sanity`, and `sanity` versions.

npm's available remediation paths require major-version upgrades: Next 16.x, next-sanity 13.x, and Sanity 6.x. No `npm audit fix --force` was run. Mixing those framework/CMS migrations into a behavior-preserving CSS cleanup would materially increase regression risk and should be handled as a dedicated dependency-modernization/security change with its own migration review and full authenticated regression suite.

## Remaining frontend debt

The cleanup establishes a safer baseline but does not claim that the frontend is debt-free. The next controlled cleanup work should be:

1. Migrate selectors out of `legacy-ui.css` feature by feature into clearly owned stylesheets, preserving cascade order and validating each slice.
2. Fold the five remaining patch/fix/polish stylesheets into their owning feature stylesheets where equivalence can be proven.
3. Reduce `!important` usage by fixing selector ownership/specificity rather than mechanically deleting declarations.
4. Audit the 636 inline style objects and migrate only static/repeated patterns; retain styles that are truly data-driven.
5. Decompose `HostCalendar.tsx` behind tests into smaller responsibilities/components instead of doing a broad React rewrite.
6. Run the dependency modernization/security migration separately, because the available fixes are major upgrades rather than safe patch releases.

## Guardrails going forward

The new gate intentionally prevents `globals.css` from regrowing into a feature stylesheet: it must stay at or below 4 KB, contain no class selectors, be imported first, and keep the token and transitional legacy layers explicit. The audit also keeps reporting large stylesheets, patch-file debt, `!important` volume, inline styles, and oversized TS/TSX files so future cleanup can be measured instead of guessed.
