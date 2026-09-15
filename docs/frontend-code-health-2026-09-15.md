# Frontend code-health audit — 2026-09-15

## Scope

This cleanup is deliberately behavior-preserving. It does not redesign the UI, write to Sanity, change product data, merge to `main`, or deploy to production. The goal is to reduce accidental CSS coupling, make style ownership clearer, remove safe presentation debt, and add guardrails before more UI work is layered on top.

## Changes completed

- `app/globals.css` was reduced from 25,922 bytes to 440 bytes (about 98.3% smaller). It now contains document-level primitives only and no class selectors.
- The former feature/page rules from `globals.css` were isolated in `app/legacy-ui.css`. This is an explicit compatibility/migration layer rather than pretending the legacy cascade is already fully modernized.
- `app/layout.tsx` now has a readable, explicit global stylesheet import order. Inline `html`/`body` layout styles were moved into CSS.
- `guide-fixes.css` and `heading-spacing.css` were removed and their rules moved to owning stylesheets.
- The remaining late `fix`/`polish` files were replaced with explicitly named layers: `host-calendar-overrides.css`, `rental-search-overrides.css`, `workspace-layout-overrides.css`, `cross-page-overrides.css`, and `launch-states.css`. The cascade position was preserved.
- Referral presentation rules were moved out of the generic page-alignment layer into `referrals.css`, and duplicate profile-insight rules were consolidated.
- A redundant `.srOnly` utility in `navigation2.css` was removed because the same utility is defined later in the canonical launch/accessibility layer.
- Static presentation was moved out of JSX and into scoped CSS Modules for assisted listing import/review, search-alert creation/management, notifications, notification preferences, notification bell, automated messages, favorites, product operations, incident playbook, rental terms heading, and completed-rental agreement views.
- Business logic, fetch/state behavior, booking state behavior, CMS data, and authenticated application flows were not intentionally changed by these presentation refactors.
- A permanent `scripts/frontend-code-health.mjs` audit was added and wired into `npm run code-health:frontend` and `npm run test:quality`.
- The audit now ranks `!important` and inline-style hotspots so future cleanup can target measured debt rather than guesswork.
- A lightweight GitHub Actions workflow runs the frontend code-health gate on pushes and pull requests.

## Current audit snapshot

The final audit reports:

- 48 CSS files and 216,762 CSS bytes in total. The file/byte count increased because repeated/static JSX presentation was deliberately moved into scoped CSS Modules; this is expected and is not evidence of a larger global cascade.
- 27 global stylesheet imports in `app/layout.tsx`.
- 440 bytes in `globals.css`.
- 326 `!important` declarations, down from 336 at the initial audit. Remaining high counts are concentrated in intentional late compatibility/override layers rather than mechanically removed.
- 0 stylesheet filenames containing `fix`, `fixes`, or `polish`, down from 5.
- 262 TS/TSX files inspected.
- 388 inline `style={{...}}` objects, down from 636: 248 removed, a reduction of about 39%. Remaining inline styles were not mass-migrated because many are state/data-driven or sit in components that need dedicated behavioral tests before structural refactoring.
- One frontend TS/TSX file over 20 KB: `components/HostCalendar.tsx` at 23,083 bytes.
- CSS files over 12 KB: transitional `legacy-ui.css` (25,415), `designsystem2.css` (14,072), `host-calendar.css` (14,006), and `host-listings.css` (12,018).
- Highest remaining `!important` counts: `navigation2.css` (100), `cross-page-overrides.css` (44), `workspace-layout-overrides.css` (34), `rental-search.css` (30), `rental-search-overrides.css` (27), and `host-calendar-overrides.css` (23).
- Highest remaining inline-style hotspot: `components/HostCalendar.tsx` (27). The next files are materially smaller hotspots and/or admin/dynamic components.

The permanent code-health gate passes with the current branch state.

## Validation completed

A temporary deep-validation workflow was used during the cleanup and is removed after validation. The final application state passed:

- Frontend code-health gate: passed.
- Lifecycle tests: 16 passed, 0 failed.
- Next.js production build: successful, including lint/type validation and generation of 208 static pages.
- Playwright public smoke/accessibility suite: 14 passed across desktop and mobile Chromium.

The Playwright run emitted expected local-CI noise because Supabase server/admin environment variables were intentionally not supplied to the public smoke suite; affected code paths failed closed and all smoke/accessibility assertions still passed. Authenticated application behavior was not rewritten by this cleanup.

## Dependency/security audit

`npm audit --omit=dev` currently reports 22 vulnerabilities in the runtime dependency graph: 10 moderate, 11 high, and 1 critical.

The critical finding is in the transitive `decompress <=4.2.1` dependency used through the current Sanity toolchain. Other findings include transitive Sanity/CLI packages, `postcss`, `glob`, `adm-zip`, `valibot`, `uuid`, and related packages. Direct packages implicated by the audit include the current `next`, `next-sanity`, and `sanity` versions.

npm's available remediation paths require major-version upgrades: Next 16.x, next-sanity 13.x, and Sanity 6.x. No `npm audit fix --force` was run. Mixing those framework/CMS migrations into a behavior-preserving frontend cleanup would materially increase regression risk and should be handled as a dedicated dependency-modernization/security change with its own migration review and full authenticated regression suite.

## Deliberate safety boundary / remaining debt

The cleanup stops where mechanical presentation cleanup would become a functional or architectural refactor:

1. `legacy-ui.css` remains as a 25 KB compatibility layer. It should be migrated feature by feature, but only with an automated equivalence/diff check that proves cascade order has not changed. A manual whole-file split was intentionally not attempted.
2. `HostCalendar.tsx` remains the only frontend source file above 20 KB and the largest inline-style hotspot. Several styles are genuinely date/state-driven; it should be decomposed behind dedicated calendar behavior/visual tests rather than mass-converted for a metric.
3. Remaining `!important` declarations are concentrated in canonical late override layers. They should be reduced only when older competing selectors are retired, not by deleting specificity safeguards in isolation.
4. Remaining inline styles should be migrated only when they are demonstrably static/repeated. Dynamic styles should stay dynamic or move to a tested component API/CSS-variable pattern.
5. Dependency modernization/security is a separate migration because available fixes are major-version upgrades rather than safe patches.

## Guardrails going forward

The permanent gate intentionally prevents `globals.css` from regrowing into a feature stylesheet: it must stay at or below 4 KB, contain no class selectors, be imported first, and keep the token and transitional legacy layers explicit. The audit also reports large stylesheets, patch-file debt, `!important` volume, inline styles, and oversized TS/TSX files so future cleanup can be measured instead of guessed.
