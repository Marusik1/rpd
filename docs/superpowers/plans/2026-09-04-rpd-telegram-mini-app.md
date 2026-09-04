# RPD Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-only, data-driven RPD Telegram Mini App, GitHub Pages document catalog, and secure Cloudflare Worker bot inside the standalone `bot/` repository.

**Architecture:** Use npm workspaces for `apps/web`, `apps/worker`, and `packages/shared`, with repository-level catalog scripts and verification commands. PDF files remain authoritative; the generated catalog is consumed once by the frontend and fetched from a trusted URL by the Worker. Shared pure TypeScript modules own catalog contracts, stable document identity, and public document URL validation/construction so no runtime reimplements security-sensitive path logic.

**Tech Stack:** Node.js 22, npm workspaces, React 19, TypeScript strict mode, Vite, React Router HashRouter, Lucide React, Telegram Mini Apps SDK/API adapter, Cloudflare Workers, Wrangler, Vitest, Testing Library, MSW where network boundaries require it, ESLint, Prettier, Playwright, GitHub Actions, GitHub Pages.

---

## Plan constraints

- Work only inside the standalone repository rooted at `bot/`.
- Do not create a database, user registration, analytics, upload UI, server-side favorites/history, or desktop layout.
- Follow test-driven development for every behavior: write one focused failing test, observe the expected failure, implement the minimum, rerun focused and affected suites, then commit.
- Do not add sample academic PDFs. Empty education folders use `.gitkeep`; visual fixtures live in test/preview code and are never included in the generated production catalog.
- Use the checked-in reference `docs/references/rpd-mobile-collage.png` for visual QA.

## Dependency graph

```text
Task 1 workspace/tooling
  ├─> Task 2 shared catalog + URL contracts
  │     ├─> Task 3 filesystem catalog generator
  │     │     └─> Task 4 frontend catalog/navigation foundation
  │     │            ├─> Task 5 search/local persistence
  │     │            ├─> Task 6 Telegram adapter + document actions
  │     │            └─> Task 9 mobile UI fidelity
  │     └─> Task 7 Worker security + send-document
  │            └─> Task 8 webhook + operational setup
  ├─> Task 10 CI/CD + documentation (depends on Tasks 3–8)
  ├─> Task 11 automated quality gates (depends on Tasks 1–10)
  └─> Task 12 visual QA (depends on Tasks 4–11)
```

Tasks 4 and 7 may proceed in parallel after Tasks 2–3 establish contracts. Task 9 waits for frontend behavior to be complete so visual changes do not mask missing states. Task 12 is the final implementation task and may require repeated UI-only corrections.

## Locked file map

```text
bot/
├── .github/workflows/deploy-pages.yml     # Pages build and deployment
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/                      # router, providers, shell, error boundary
│   │   │   ├── catalog/                  # one-shot catalog loader and selectors
│   │   │   ├── components/               # reference-derived mobile primitives
│   │   │   ├── pages/                    # five core screens + favorites/profile
│   │   │   ├── storage/                  # versioned recent/favorite persistence
│   │   │   ├── telegram/                 # Telegram/browser capability adapter
│   │   │   ├── styles/                   # tokens, global layout, component styles
│   │   │   └── test/                     # fixtures and render helpers
│   │   ├── e2e/                           # navigation, failure, screenshot specs
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── worker/
│       ├── src/
│       │   ├── index.ts                  # routing and response boundary
│       │   ├── env.ts                    # binding contract
│       │   ├── cors.ts                   # exact-origin CORS
│       │   ├── init-data.ts              # Telegram HMAC/auth-date validation
│       │   ├── catalog-client.ts          # trusted catalog cache/revalidation
│       │   ├── send-document.ts           # validated delivery use case
│       │   ├── telegram-api.ts            # Bot API client and captions
│       │   └── webhook.ts                 # secret header and /start
│       ├── test/
│       ├── package.json
│       └── wrangler.toml
├── packages/shared/
│   ├── src/
│   │   ├── catalog.ts                    # schema and structural validation
│   │   ├── document-id.ts                # stable ID generation
│   │   ├── document-url.ts               # URL construction/verification
│   │   ├── filename.ts                   # filename parser
│   │   ├── search.ts                     # normalization and matching
│   │   └── index.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── generate-catalog.ts
│   └── lib/scan-documents.ts
├── public/
│   ├── catalog.json
│   └── documents/...
├── tests/catalog-generator.test.ts
├── artifacts/visual-qa/390x844/          # five final screenshots + comparison notes
├── docs/references/rpd-mobile-collage.png
├── docs/superpowers/specs/...
├── docs/superpowers/plans/...
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── playwright.config.ts
├── .env.example
├── .gitignore
└── README.md
```

## Task 1: Establish the npm workspace and strict quality baseline

**Depends on:** Nothing.

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.base.json`, `eslint.config.js`, `prettier.config.js`, `.gitignore`, `.env.example`
- Create: `apps/web/package.json`, `apps/worker/package.json`, `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: minimal test configs under each workspace

- [ ] **Step 1: Write a failing workspace smoke test**

Create `tests/workspace-structure.test.ts` that reads root `package.json` and asserts exact workspaces `apps/web`, `apps/worker`, `packages/shared`, plus root scripts `generate:catalog`, `lint`, `typecheck`, `test`, `test:e2e`, `test:visual`, `build`, and `verify`.

- [ ] **Step 2: Run the smoke test and observe RED**

Run: `npm test -- workspace-structure.test.ts`  
Expected: FAIL because the workspace manifest and test runner do not exist yet.

- [ ] **Step 3: Create the minimal workspace manifests and configurations**

Root scripts must fan out consistently:

```json
{
  "workspaces": ["apps/web", "apps/worker", "packages/shared"],
  "scripts": {
    "generate:catalog": "tsx scripts/generate-catalog.ts",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "npm run typecheck --workspaces --if-present && tsc -p tsconfig.scripts.json --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test --grep-invert @visual",
    "test:visual": "playwright test --grep @visual",
    "build": "npm run generate:catalog && npm run build --workspace @rpd/web && npm run build --workspace @rpd/worker",
    "verify": "npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

Keep all production dependency ownership explicit: React/Vite/UI dependencies in `@rpd/web`, Worker/Wrangler dependencies in `@rpd/worker`, pure schema/transliteration dependencies in `@rpd/shared`, and test/tooling dependencies at root. Use one root `package-lock.json`; never run workspace-local installs.

- [ ] **Step 4: Install once from the repository root and make the smoke test GREEN**

Run: `npm install` then `npm test -- workspace-structure.test.ts`  
Expected: lockfile created and focused test PASS.

- [ ] **Step 5: Verify strict compiler and formatting baselines**

Run: `npm run lint && npm run typecheck`  
Expected: PASS without warnings; all TypeScript projects inherit strict settings.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json tsconfig.scripts.json eslint.config.js prettier.config.js .gitignore .env.example apps packages tests
git commit -m "chore: establish RPD npm workspace"
```

**Acceptance criteria:** A clean checkout needs only `npm ci`; root commands address every workspace; no runtime package owns another workspace's unrelated dependencies.

## Task 2: Implement shared catalog, identity, search, and URL contracts

**Depends on:** Task 1.

**Files:**
- Create: `packages/shared/src/catalog.ts`, `filename.ts`, `document-id.ts`, `document-url.ts`, `search.ts`, `index.ts`
- Create: `packages/shared/test/*.test.ts`

- [ ] **Step 1: Define failing filename-parser tests**

Cover `(РПД)`, trailing `РПД`, `(РПД) (1)`, Cyrillic code extraction, whitespace collapse, and code-less filenames. Assert the original filename is preserved separately.

- [ ] **Step 2: Run parser tests and observe RED**

Run: `npm test --workspace @rpd/shared -- filename.test.ts`  
Expected: FAIL because `parsePdfFilename` is missing.

- [ ] **Step 3: Implement the minimal parser and rerun GREEN**

Expose:

```ts
export type ParsedPdfName = { code: string | null; name: string };
export function parsePdfFilename(filename: string): ParsedPdfName;
```

Run the focused parser suite; expected PASS.

- [ ] **Step 4: Define failing stable-ID and catalog-schema tests**

Assert IDs are deterministic, URL-safe, structure-sensitive, independent of array order, and collision-detectable. Validate level/program/course relationships and reject paths that escape `documents/`.

- [ ] **Step 5: Implement `createDocumentId` and catalog validation, then rerun GREEN**

Use normalized structural fields plus filename and a short deterministic digest to avoid transliteration collisions. The public API returns either validated records or structured validation errors.

- [ ] **Step 6: Define failing shared document URL tests**

Test Cyrillic, spaces, parentheses, dots, encoded traversal, absolute-path injection, foreign origins, and GitHub Project Pages bases.

- [ ] **Step 7: Implement the single URL authority, then rerun GREEN**

Expose:

```ts
export function buildDocumentUrl(input: {
  siteBaseUrl: URL;
  relativeDocumentPath: string;
}): URL;

export function isTrustedDocumentUrl(input: {
  candidate: URL;
  siteBaseUrl: URL;
}): boolean;

export function siteBaseFromCatalogUrl(catalogUrl: URL): URL;
```

The implementation encodes each path segment exactly once, requires HTTPS outside localhost tests, forbids credentials/query/hash/traversal, and requires the resolved URL to stay below the configured Pages base path. `siteBaseFromCatalogUrl` requires the trusted catalog URL pathname to end in `/catalog.json`, rejects query/hash/credentials, and returns the parent Pages URL with its trailing slash. Frontend derives the equivalent absolute base with `new URL(import.meta.env.BASE_URL, window.location.origin)`; Worker derives it only through `siteBaseFromCatalogUrl(PUBLIC_CATALOG_URL)`; generator/tests use the same shared validators with an injected canonical test/deployment base. Frontend, generator, and Worker import this module; none may concatenate document URLs independently.

- [ ] **Step 8: Define and implement normalized search and deterministic sorting via RED/GREEN**

Normalize case, Unicode, whitespace, and `ё/е`; match code and name. Sort numeric code segments naturally, then normalized names.

- [ ] **Step 9: Run the full shared suite and commit**

Run: `npm test --workspace @rpd/shared && npm run typecheck --workspace @rpd/shared`  
Expected: all PASS.

```bash
git add packages/shared
git commit -m "feat: add shared RPD document contracts"
```

**Acceptance criteria:** All three consumers can import one tested URL API; malicious or off-base paths are rejected; IDs and sorting are deterministic across builds.

## Task 3: Build the filesystem-authoritative catalog generator

**Depends on:** Task 2.

**Files:**
- Create: `scripts/generate-catalog.ts`, `scripts/lib/scan-documents.ts`, `tests/catalog-generator.test.ts`, `tsconfig.scripts.json`
- Create: all required `public/documents/**/.gitkeep`
- Generate: `public/catalog.json`

- [ ] **Step 1: Write failing scanner tests using temporary fixture trees**

Test bachelor/master path derivation, case-insensitive `.pdf`, ignored non-PDF files, invalid structures, nested surprises, and deterministic relative POSIX paths.

- [ ] **Step 2: Run and observe RED**

Run: `npm test -- catalog-generator.test.ts`  
Expected: FAIL because scanner/generator exports are missing.

- [ ] **Step 3: Implement minimal scanning with shared parsing and identity**

Expose pure `scanDocuments(root): Promise<ScanResult>` and a thin CLI writer. Do not make catalog reads depend on an existing `catalog.json`.

- [ ] **Step 4: Add failing duplicate/collision/output tests**

Assert possible duplicates produce warnings without deletion or failure, while exact ID collisions and invalid paths fail. Assert output JSON is stable and ends with a newline.

- [ ] **Step 5: Implement warning/error behavior and rerun GREEN**

Use structured diagnostics internally and human-readable CLI output without absolute secret paths.

- [ ] **Step 6: Generate the real empty catalog**

Run: `npm run generate:catalog`  
Expected: `public/catalog.json` contains a valid versioned empty document array because no real PDFs have been supplied.

- [ ] **Step 7: Verify regeneration from a temporary added PDF without committing it**

Copy a minimal test fixture into one required folder, run generation, assert one record appears, then remove only that known fixture and regenerate the empty catalog. This is a verification operation, not shipped demo content.

- [ ] **Step 8: Commit**

```bash
git add scripts tests tsconfig.scripts.json public
git commit -m "feat: generate catalog from RPD filesystem"
```

**Acceptance criteria:** A new valid PDF appears after one generator run; no discipline list exists in code; empty folders remain tracked; output is reproducible.

## Task 4: Create frontend shell, catalog loading, and logical navigation

**Depends on:** Task 3.

**Files:**
- Create: `apps/web/index.html`, `vite.config.ts`, `src/main.tsx`
- Create: `src/app/router.tsx`, `app-providers.tsx`, `app-shell.tsx`, `error-boundary.tsx`
- Create: `src/catalog/catalog-provider.tsx`, `catalog-client.ts`, `selectors.ts`
- Create: page modules for all confirmed routes with minimal semantic structure; final reference styling is applied in Task 9
- Create: `playwright.config.ts`, `apps/web/e2e/navigation.spec.ts`, `apps/web/e2e/error-states.spec.ts`, `apps/web/e2e/mobile-widths.spec.ts`
- Test: corresponding `*.test.tsx`

- [ ] **Step 1: Write failing Vite base-path and catalog-client tests**

Assert Vite uses repository-root `public/` through `publicDir: "../../public"`, catalog loads from `import.meta.env.BASE_URL + "catalog.json"` once, validates through shared contracts, supports retry after failure, and never issues one request per discipline.

- [ ] **Step 2: Observe RED, implement minimal provider, and rerun GREEN**

Run focused Vitest commands for catalog client/provider.

- [ ] **Step 3: Write failing HashRouter route tests**

Cover every confirmed route, unknown routes, stale document IDs, and context-preserving back destinations.

- [ ] **Step 4: Implement route objects and minimal pages, then rerun GREEN**

Pages receive selected catalog records through selectors; they do not contain discipline constants.

- [ ] **Step 5: Write and implement application-shell error tests via RED/GREEN**

Assert the initial catalog request shows an in-shell loading indicator without replacing the application frame. Assert catalog failure, unknown route, stale document ID, and render error retain the same shell and show Russian recovery actions rather than a blank page. Assert an existing structural course with zero catalog records renders `Пока нет загруженных РПД для этого курса` plus working back/home navigation. Assert an empty production catalog still renders Home with education navigation and hides recent/search-result content instead of becoming blank.

- [ ] **Step 6: Run web tests/typecheck and commit**

Before committing, configure Playwright's web server and deterministic catalog/network fixtures, then add functional E2E coverage for hash navigation, catalog failure recovery, and horizontal-overflow checks at 320/375/390/430 px. These are functional tests and are tagged without `@visual`.

```bash
npm test --workspace @rpd/web
npm run typecheck --workspace @rpd/web
npm run test:e2e
git add apps/web playwright.config.ts
git commit -m "feat: add catalog-driven Mini App navigation"
```

**Acceptance criteria:** Direct hash URLs render after static hosting refresh; one catalog request powers all screens; loading, empty catalog/course, and failure states remain useful inside the application shell; the workspace-root public directory is included in the web build.

## Task 5: Implement local search, favorites, and recent documents

**Depends on:** Task 4.

**Files:**
- Create: `apps/web/src/storage/document-preferences.ts`, `use-document-preferences.ts`
- Create/modify: home, discipline-list, favorites pages
- Modify: `apps/web/e2e/navigation.spec.ts`
- Create: `apps/web/e2e/local-discovery.spec.ts`
- Test: storage, search interaction, and page tests

- [ ] **Step 1: Write failing versioned localStorage tests**

Cover missing data, malformed JSON, unknown schema version, duplicate IDs, stale catalog IDs, max-five recents, and storage exceptions.

- [ ] **Step 2: Observe RED, implement minimal persistence, rerun GREEN**

Keep stored values to IDs and timestamps only; reconcile against the loaded catalog.

- [ ] **Step 3: Write failing search interaction tests**

Cover home global search, course-scoped search, code/name matching, clear action, no-results state, and keyboard-safe scroll behavior at the DOM/CSS-contract level.

- [ ] **Step 4: Implement search/favorites/recent UI behavior and rerun GREEN**

Do not add backend calls. Hide the recent section when empty.

- [ ] **Step 5: Run affected suites and commit**

Extend functional Playwright coverage before this gate: exercise global and scoped search, no-results recovery, favorite persistence after reload, recent-item ordering/cap, and corrupt localStorage recovery through the real browser UI.

```bash
npm test --workspace @rpd/web -- storage search favorites
npm run test:e2e
git add apps/web/src apps/web/e2e
git commit -m "feat: add local RPD discovery preferences"
```

**Acceptance criteria:** Search stays local; favorites and recents survive reload but fail safely; no stale ID crashes a route.

## Task 6: Integrate Telegram viewport, BackButton, haptics, and document actions

**Depends on:** Tasks 4–5 and shared URL API from Task 2.

**Files:**
- Create: `apps/web/src/telegram/telegram-adapter.ts`, `telegram-provider.tsx`, `browser-adapter.ts`
- Create: `apps/web/src/documents/use-document-availability.ts`, `use-open-document.ts`, `use-send-document.ts`, `send-state.ts`
- Modify: app shell and document detail page
- Create: `apps/web/e2e/document-actions.spec.ts`
- Test: adapter, BackButton, URL opening, send-state tests
- Modify: `.env.example` (the full README configuration section is deferred to Task 10)

- [ ] **Step 1: Write failing capability-adapter tests**

Specify initialization, viewport/stable-height CSS variables, safe-area/content-safe-area values, BackButton show/hide/click cleanup, link opening, theme input, and graceful absence outside Telegram.

- [ ] **Step 2: Implement the narrow Telegram adapter and rerun GREEN**

All Telegram globals/SDK calls stay behind this adapter; UI modules depend on capabilities, not global objects.

- [ ] **Step 3: Write failing document-open tests**

Assert the URL comes from shared `buildDocumentUrl`. Before opening, issue a same-origin `HEAD` request with a five-second timeout. A successful response dispatches through Telegram link opening when available and falls back to an encoded ordinary browser link. A 404/410, timeout, offline failure, or non-success response keeps the user on the discipline page and renders `Документ временно недоступен` with retry; it must not open a known-broken tab. Mock the availability boundary in unit tests rather than making live GitHub requests.

- [ ] **Step 4: Implement document opening and rerun GREEN**

Implement availability state as `idle | checking | available | unavailable`, block duplicate checks while pending, and clear stale errors on retry. The check and open are one user action; if popup blocking requires a browser fallback, render a same-shell verified link after the successful check.

- [ ] **Step 5: Write failing send-state tests**

Cover `idle → sending → success/error`, duplicate tap suppression, missing `initData`, retry, bounded user-facing errors, success/error haptic fallback, and missing/invalid `VITE_WORKER_URL`. The public frontend variable must be an absolute HTTPS Worker origin outside localhost development, must not include credentials/query/hash, and must not include the endpoint path.

- [ ] **Step 6: Implement send hook and detail action states, then rerun GREEN**

Frontend request schema is exactly `{ initData, documentId }`; no URL or user ID field exists. The hook resolves the endpoint as `new URL("api/send-document", normalizedWorkerBaseUrl)` from `VITE_WORKER_URL`. `.env.example` contains an empty/example public Worker URL and no secret values. GitHub Pages build obtains `VITE_WORKER_URL` from a GitHub Actions repository variable, not a secret embedded in source.

- [ ] **Step 7: Run web verification and commit**

Add functional Playwright scenarios for encoded Cyrillic PDF opening, 404 staying in-shell, browser fallback outside Telegram, `idle/sending/success/error`, duplicate send suppression, missing initData, and retry. Network calls are intercepted deterministically.

```bash
npm test --workspace @rpd/web
npm run typecheck --workspace @rpd/web
npm run test:e2e
git add apps/web/src apps/web/e2e .env.example
git commit -m "feat: integrate Telegram Mini App capabilities"
```

**Acceptance criteria:** BackButton follows logical routes; keyboard/viewport values update without remounting; verified PDFs remain usable outside Telegram; unavailable PDFs produce a retryable in-shell state; duplicate sends are impossible while pending.

## Task 7: Implement secure Worker validation and document delivery

**Depends on:** Task 2. May run in parallel with Tasks 4–6.

**Files:**
- Create: `apps/worker/src/env.ts`, `cors.ts`, `init-data.ts`, `catalog-client.ts`, `telegram-api.ts`, `send-document.ts`, `index.ts`
- Create: focused files under `apps/worker/test/`

- [ ] **Step 1: Write failing Telegram initData tests from fixed vectors**

Cover valid signature, changed field, malformed encoding, duplicate keys, missing hash/user/auth_date, stale (>15 min), and future timestamps. Never log raw initData.

- [ ] **Step 2: Observe RED, implement HMAC validation with Web Crypto, rerun GREEN**

Return only the validated minimal identity needed by the use case.

- [ ] **Step 3: Write failing exact-origin CORS and request-boundary tests**

Cover allowed preflight, disallowed/missing origin, non-JSON, >16 KiB body, extra fields, `url`/`userId` injection, malformed IDs, and wrong methods.

- [ ] **Step 4: Implement request boundary and rerun GREEN**

- [ ] **Step 5: Write failing trusted-catalog tests**

Cover five-minute caching, 10-second timeout, schema rejection, unknown ID forced revalidation once, unknown-after-refresh 404, and catalog URL misconfiguration. Derive the canonical Pages base exclusively through shared `siteBaseFromCatalogUrl(PUBLIC_CATALOG_URL)` and resolve the final PDF URL only with shared URL validation.

- [ ] **Step 6: Implement catalog client and rerun GREEN**

- [ ] **Step 7: Write failing Telegram delivery tests**

Assert `sendDocument` receives validated chat/user ID, trusted public HTTPS URL, correct Russian caption, timeout/Telegram error mapping, and no secret leakage.

- [ ] **Step 8: Implement delivery and `/health`, then rerun GREEN**

- [ ] **Step 9: Run Worker verification and commit**

```bash
npm test --workspace @rpd/worker
npm run typecheck --workspace @rpd/worker
npm run build --workspace @rpd/worker
git add apps/worker
git commit -m "feat: securely deliver RPD documents from Worker"
```

**Acceptance criteria:** Arbitrary URLs and identities are structurally impossible; stale/forged initData is rejected; Worker trusts only configured catalog data; upstream failures are bounded and sanitized.

## Task 8: Implement authenticated webhook and `/start`

**Depends on:** Task 7.

**Files:**
- Create: `apps/worker/src/webhook.ts`
- Modify: `apps/worker/src/index.ts`, `wrangler.toml`
- Test: `apps/worker/test/webhook.test.ts`

- [ ] **Step 1: Write failing webhook-security tests**

Cover missing/wrong/correct `X-Telegram-Bot-Api-Secret-Token`, timing-safe equality behavior, unsupported updates, malformed payloads, and no-secret logs.

- [ ] **Step 2: Implement secret validation and rerun GREEN**

- [ ] **Step 3: Write failing `/start` response tests**

Assert the Russian copy and Web App keyboard URL use `MINI_APP_URL`; bot cannot accept a client-provided URL.

- [ ] **Step 4: Implement `/start`, rerun tests, and document a webhook registration command template**

The command uses local shell variables/placeholders so secrets are not printed into repository files.

- [ ] **Step 5: Commit**

```bash
git add apps/worker
git commit -m "feat: add protected Telegram bot webhook"
```

**Acceptance criteria:** Forged webhook requests cannot trigger Bot API calls; `/start` opens the configured Mini App; unrelated updates acknowledge safely.

## Task 9: Reproduce the five-screen mobile visual system

**Depends on:** Tasks 4–6. Worker may still be tested independently.

**Files:**
- Create: `apps/web/src/styles/tokens.css`, `global.css`, `components.css`
- Create/modify: focused components (`MobileHeader`, `SearchField`, `EducationCard`, `CourseCard`, `DocumentRow`, `BottomNavigation`, `DocumentActions`, `InlineNotice`)
- Modify: all pages and `index.html`
- Test: component accessibility and layout-contract tests

- [ ] **Step 1: Write failing semantic/accessibility component tests**

Assert real buttons/links, keyboard activation, accessible names, current navigation state, visible focus, 44 px target classes, wrapped document titles, and disabled/loading semantics.

- [ ] **Step 2: Implement semantic components and rerun GREEN**

- [ ] **Step 3: Add design tokens and mobile-only shell**

Define centralized red/white/black/gray tokens, type scale, 14–16 px spacing, 12–14 px radii, subtle border/shadow, dynamic viewport variables, `max-width: 430px`, and safe-area padding. Do not add desktop breakpoints.

- [ ] **Step 4: Match Home and Bachelor screens to the collage**

Use actual catalog counts; use visual fixtures only in tests/QA mode when the real catalog is empty. Verify bottom navigation does not cover content.

- [ ] **Step 5: Match discipline list, Master, and detail screens**

Preserve one column and reference density; long names wrap without shrinking touch targets.

- [ ] **Step 6: Add restrained motion and user-preference fallbacks**

Use 150–200 ms transform/opacity only, pressed scale, reduced-motion cross-fade/static fallback, and no bounce/glass/gradient.

- [ ] **Step 7: Run component suites and commit**

```bash
npm test --workspace @rpd/web
npm run lint
npm run typecheck
git add apps/web
git commit -m "feat: reproduce mobile RPD visual system"
```

**Acceptance criteria:** All five screens visibly follow the collage, the interface remains one column at 320–430 px, and accessibility/interaction tests pass.

## Task 10: Add deployment automation and operator documentation

**Depends on:** Tasks 3–9.

**Files:**
- Create: `.github/workflows/deploy-pages.yml`, `README.md`
- Modify: `.env.example`, `apps/worker/wrangler.toml`, package scripts
- Test: `tests/deployment-config.test.ts`

- [ ] **Step 1: Write failing deployment-config tests**

Parse the workflow and manifests to assert `npm ci → generate:catalog → lint → typecheck → test → build → upload-pages-artifact → deploy-pages`, correct `dist` path, Pages permissions, concurrency, `VITE_WORKER_URL` injection from the named repository variable, and absence of bot-token interpolation.

- [ ] **Step 2: Implement the workflow and rerun GREEN**

Set Vite base from `VITE_BASE_PATH` with repository-name fallback documented explicitly.

- [ ] **Step 3: Write README as an executable operator runbook**

Cover root-only npm commands, PDF folder rules, catalog warnings/errors, GitHub repository/Pages setup, Cloudflare deployment, all variables/secrets, `wrangler secret put` commands, webhook secret registration, BotFather Web App/menu configuration, local browser fallback, and update/rollback troubleshooting.

- [ ] **Step 4: Verify every documented local command that does not require credentials**

Run commands from a clean install state where practical; expected outputs must match README.

- [ ] **Step 5: Commit**

```bash
git add .github README.md .env.example apps/worker/wrangler.toml package.json tests/deployment-config.test.ts
git commit -m "ci: deploy RPD Mini App to GitHub Pages"
```

**Acceptance criteria:** Pages can deploy from the standalone repo; Worker setup is reproducible without secret exposure; a maintainer can add a PDF without code edits.

## Task 11: Run functional quality gates and security regression checks

**Depends on:** Tasks 1–10.

**Files:**
- Modify only files required by failing checks
- Create: `artifacts/verification/README.md` with command versions and summarized results

- [ ] **Step 1: Verify a clean dependency install**

Run: `npm ci`  
Expected: exit 0 with lockfile unchanged.

- [ ] **Step 2: Run catalog and static gates**

Run: `npm run generate:catalog && npm run lint && npm run typecheck`  
Expected: exit 0, no warnings except intentional duplicate-PDF diagnostics, clean generated diff.

- [ ] **Step 3: Run all unit/integration tests**

Run: `npm test`  
Expected: all suites PASS with no unhandled rejection or secret-bearing snapshot.

- [ ] **Step 4: Run production builds**

Run: `npm run build`  
Expected: web and Worker builds PASS; inspect `dist` to confirm no `BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, raw initData fixture, or absolute local path.

- [ ] **Step 5: Run browser functional tests at mobile widths**

Run: `npm run test:e2e` using the Playwright configuration and functional specs created in Task 4 and extended by Tasks 5–6.  
Expected: navigation, search, local persistence, encoded PDF opening, send states, current-shell errors, and 320/375/390/430 overflow checks PASS.

- [ ] **Step 6: Record evidence and commit any verified fixes plus evidence**

```bash
git add artifacts/verification README.md apps packages scripts tests
git commit -m "test: verify RPD production workflows"
```

**Acceptance criteria:** Every root quality command passes from the standalone repository and production artifacts contain no secrets or local filesystem references.

## Task 12: Perform five-screen visual QA against the collage

**Depends on:** Task 11.

**Files:**
- Create: `apps/web/e2e/visual-qa.spec.ts` (tag every case `@visual`, owned by root `test:visual` script created in Task 1)
- Create: `apps/web/src/test/visual-catalog-fixture.ts` or a build-time QA fixture mechanism excluded from production output
- Create: `artifacts/visual-qa/390x844/{01-home,02-bachelor,03-course,04-master,05-document}.png`
- Create: `artifacts/visual-qa/390x844/README.md`

- [ ] **Step 1: Write a failing visual-route fixture test**

Assert QA mode supplies deterministic reference-like catalog data only when explicitly enabled during local Playwright runs and cannot be activated in the production build.

- [ ] **Step 2: Implement the isolated visual fixture and rerun GREEN**

Use the same components, selectors, and routes as production; do not hardcode disciplines into production handlers/pages.

- [ ] **Step 3: Capture the five required 390×844 screenshots**

Run: `npm run test:visual -- --update-snapshots` or the exact committed equivalent.  
Expected: five deterministic PNG files under `artifacts/visual-qa/390x844/` named in navigation order.

- [ ] **Step 4: Compare each screenshot with `docs/references/rpd-mobile-collage.png`**

Record five separately labeled comparison subsections in `artifacts/visual-qa/390x844/README.md`, mapping `01`–`05` to the corresponding numbered phone/crop in `docs/references/rpd-mobile-collage.png`. Each subsection checks card width/height, vertical rhythm, 14–18 px horizontal padding, radii, typography, icon size/alignment, red-white-black hierarchy, search, bottom navigation, CTA states, and list density. The detail subsection also checks that `checking` and `unavailable` states do not shift, clip, or visually break the action card.

- [ ] **Step 5: Correct mismatches and recapture until the product is recognizably the same design**

Each correction follows RED/GREEN where behavior or a testable layout contract changes. Do not accept a new visual concept. Re-run web unit tests after each correction batch.

- [ ] **Step 6: Validate natural scaling without new layouts**

Run Playwright at 320×667, 375×812, 390×844, and 430×932. Assert no horizontal overflow, clipped controls, hidden final content, safe-area collision, or keyboard/search breakage. These checks must not introduce width-specific page compositions.

- [ ] **Step 7: Run final full verification**

Run: `npm run verify && npm run test:e2e && npm run test:visual`  
Expected: all PASS, screenshots unchanged, Git working tree clean after committed generated artifacts.

- [ ] **Step 8: Commit visual evidence**

```bash
git add apps/web/e2e apps/web/src/test artifacts/visual-qa
git commit -m "test: complete mobile RPD visual QA"
```

**Acceptance criteria:** Five 390 px screenshots exist in the documented location, comparison notes address every required visual dimension, 320–430 px checks pass, and the UI reads as the same product as the source collage.

## Final quality gates

All gates are mandatory before completion is reported:

1. `npm ci` succeeds from `bot/` and does not modify `package-lock.json`.
2. `npm run generate:catalog` is deterministic and derives only from PDF files.
3. `npm run lint` passes with zero warnings.
4. `npm run typecheck` passes for web, Worker, shared code, and scripts.
5. `npm test` passes all unit and integration suites.
6. `npm run build` produces GitHub Pages and Worker artifacts without secrets/local paths.
7. `npm run test:e2e` passes navigation, persistence, error, URL, and mobile-width scenarios.
8. Worker rejects invalid/stale initData, forged webhook calls, foreign origins, arbitrary URLs, unknown document IDs, and oversized/malformed requests.
9. GitHub workflow configuration test confirms the complete generation-to-deployment chain.
10. Five screenshots at 390×844 and their comparison report are committed under `artifacts/visual-qa/390x844/`.
11. 320, 375, 390, and 430 px checks show one naturally scaling mobile composition with no horizontal overflow.
12. README instructions have been exercised for all credential-free steps.
13. `git status --short` is clean in the standalone `bot/` repository.

## Completion boundary

Stop after the final quality gates and report the implementation, project tree, commands, deployment/manual setup, PDF placement, URLs, required variables/secrets, test results, and visual-QA evidence. Do not add post-v1 features.
