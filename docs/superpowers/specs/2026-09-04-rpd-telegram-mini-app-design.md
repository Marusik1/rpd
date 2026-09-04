# RPD Telegram Mini App — Design Specification

Date: 2026-09-04  
Status: Approved for implementation planning  
Project location: `bot/` (standalone Git repository root)

## 1. Purpose and scope

Build a production-ready Telegram service for discovering and receiving university course-program PDF documents (РПД). The service consists of a React Telegram Mini App hosted by GitHub Pages and a Telegram bot implemented as a Cloudflare Worker.

The first version has no database, accounts, registration, server-side favorites, analytics, or download history. PDF files stored in the project repository are the source of truth. The entire project, including its Git metadata, documentation, CI, and configuration, is self-contained in `bot/` as an independent repository and has no dependency on neighboring projects. The user's explicit authorization for this task applies only to this new `bot/` repository; no neighboring project files are in scope.

## 2. Final product boundaries

- Mobile-only Telegram Mini App; one column at every viewport.
- Supported width range: 320–430 px. Primary visual QA viewport: 390 px.
- Application container: `width: 100%`, `min-width: 0`, `max-width: 430px`, centered if a wider client opens it.
- No desktop layout, tablet layout, sidebar, multi-column grid, desktop navigation, or desktop-specific breakpoints.
- UI language is Russian.
- No Python, persistent Node server, VPS, database, external object storage, Firebase, or Supabase.
- Frontend stack: React, TypeScript, Vite, HashRouter, lightweight CSS, one consistent outline icon set.
- Backend stack: TypeScript Cloudflare Worker and Telegram Bot API webhook.
- CI/CD: GitHub Actions and GitHub Pages.

## 3. Visual source of truth

The red-white-black five-screen collage stored at `docs/references/rpd-mobile-collage.png` is the visual source of truth. The implementation must reproduce the composition, density, spacing, card proportions, radii, typography hierarchy, icon scale, navigation, and control states shown inside the phone screens.

The following presentation elements must not be rendered: iPhone bodies, bezels, notches, status bars, screen numbers, collage background, and the heading above the phones.

The five required UI states are:

1. Home.
2. Bachelor course selection.
3. Discipline list for a course.
4. Master program and course selection.
5. Discipline detail with both document actions.

### Visual system

- Background and cards: white.
- Primary text and headings: near-black.
- Brand and action accent: red, centered on `#E50914` with a darker pressed state.
- Secondary surfaces, borders, placeholder text, and inactive controls: neutral grays.
- Green is allowed only for success feedback.
- Telegram theme and viewport APIs are integration inputs, not permission to replace the red identity with Telegram blue.
- Cards use subtle neutral borders, small soft shadows, 12–14 px radii, and compact mobile density.
- Course cards are approximately 52–58 px high. Discipline cards are approximately 56–66 px high and may grow for wrapped titles.
- Page horizontal padding is approximately 16 px and may vary within 14–18 px only to match the reference.
- Touch targets are at least 44×44 px.
- Typography uses the system stack: `-apple-system`, `BlinkMacSystemFont`, `Inter`, `SF Pro Text`, `SF Pro Display`, `Segoe UI`, sans-serif.
- Motion is restrained: press scale around 0.98, 150–200 ms page opacity/translation, button spinner, and toast fade/short slide. No bounce, decorative animation, gradients, glassmorphism, glow, or landing-page styling.

## 4. Information architecture and navigation

Use HashRouter so GitHub Project Pages refreshes and direct navigation do not require server-side route fallback.

Logical routes:

- `#/` — home.
- `#/bachelor` — bachelor course selection.
- `#/bachelor/:course` — bachelor discipline list.
- `#/master` — master program selection with compact course controls.
- `#/master/:program/:course` — master discipline list.
- `#/document/:documentId` — discipline detail.
- `#/favorites` — locally stored favorites.
- `#/profile` — minimal static application information only.

The home bottom navigation contains Home, Favorites, and Profile. It is fixed or sticky to the bottom, includes bottom safe-area padding, and never overlaps page content. Long discipline lists use the Telegram viewport as the single vertical scroll container.

Telegram BackButton is hidden on home and shown on every deeper route. It returns to the previous logical screen. A visible in-content back control remains where shown in the collage and provides a browser fallback.

## 5. Document filesystem and catalog

PDF documents live under:

```text
bot/public/documents/
├── bachelor/{1,2,3,4,5}/
└── master/
    ├── corporate-law/{1,2}/
    └── business-legal-support/{1,2}/
```

Empty required directories are retained with `.gitkeep`. Disciplines are never hardcoded in React components, handlers, Worker code, or configuration lists. The two master program slugs and their Russian display labels are structural education metadata, not discipline data.

`scripts/generate-catalog.ts` recursively scans actual PDF files and generates `public/catalog.json`. The generated catalog is a deployable index/cache; the filesystem remains authoritative and the catalog can always be regenerated.

Each catalog record contains at least:

```ts
interface CatalogDocument {
  id: string;
  level: "bachelor" | "master";
  program: "corporate-law" | "business-legal-support" | null;
  course: number;
  code: string | null;
  name: string;
  filename: string;
  path: string;
}
```

The generator derives level, program, and course only from the relative path. It parses the optional discipline code and display name from the original filename without renaming the file. It removes `.pdf`, `(РПД)`, trailing `РПД`, copy suffixes such as `(1)`, and redundant whitespace from the display name.

Document IDs are deterministic, stable, URL-safe, and collision-checked. Their derivation uses the normalized structural path and filename, not the array index. URL construction percent-encodes path segments and respects Vite/GitHub Pages base paths.

Possible same-course duplicates are retained but reported as build warnings. Exact ID collisions or structurally invalid PDF paths fail catalog generation because they would make document selection unsafe or ambiguous.

Catalog records are sorted deterministically by parseable discipline code and then normalized name; records without a parseable code sort by normalized name.

Administrative workflow:

```text
add PDF to the correct folder → git push → CI generates catalog → build/deploy → discipline appears
```

No frontend or Worker source change is required when adding a discipline.

## 6. Frontend behavior

The application loads `catalog.json` once and performs navigation, filtering, sorting, and search locally. Search is case-insensitive, normalizes whitespace and `ё/е`, and matches name and code. Course search is scoped to that course; home search covers the catalog and groups or labels results with education context.

Favorites and up to five recently opened documents are stored in versioned, validated localStorage values. Invalid or stale entries are ignored. Opening a document records it as recent. The recent block is hidden when empty.

The discipline detail contains two independent actions:

- **Открыть РПД** constructs the public GitHub Pages document URL, opens it with the appropriate Telegram link API when available, and falls back to a normal browser link.
- **Получить в Telegram** sends only `{ initData, documentId }` to the Worker.

Send state is `idle → sending → success | error`. While sending, the control is disabled to prevent duplicate submission. Success produces the green inline/toast state shown in the reference and optional Telegram success haptics. Errors stay on the same screen and produce an inline message or toast with a retry path.

Telegram integration handles current viewport height, stable viewport height, content safe area, device safe-area environment variables, viewport changes, and mobile keyboard appearance. Layout height uses dynamic viewport units with a compatible fallback. Haptics, theme APIs, link opening, and BackButton all degrade gracefully outside Telegram.

## 7. Cloudflare Worker

The Worker exposes:

- `GET /health` → `{ "status": "ok" }`.
- `POST /telegram/webhook` → handles at least `/start` and returns a Web App button using `MINI_APP_URL`.
- `POST /api/send-document` → validates Telegram identity and sends a selected document.

Worker configuration:

- Secret: `BOT_TOKEN`.
- Secret: `TELEGRAM_WEBHOOK_SECRET`.
- Variables: `MINI_APP_URL`, `MINI_APP_ORIGIN`, `PUBLIC_CATALOG_URL`.

`BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` must never appear in frontend code, catalog data, repository files, logs, or public CI output.

The webhook endpoint rejects requests unless `X-Telegram-Bot-Api-Secret-Token` matches `TELEGRAM_WEBHOOK_SECRET` using a timing-safe comparison. Webhook registration includes this secret token.

For `/api/send-document`, the Worker:

1. Enforces method, JSON content type, a 16 KiB request-body limit, and a strict request schema.
2. Applies CORS only for the configured Mini App origin and handles preflight safely.
3. Validates Telegram `initData` server-side using Telegram's documented HMAC algorithm and rejects `auth_date` older than 15 minutes or unreasonably far in the future.
4. Reads the Telegram user ID only from validated `initData`; client-supplied user IDs are not accepted.
5. Accepts only `documentId`, never an arbitrary URL or path.
6. Loads the trusted `PUBLIC_CATALOG_URL`, using a five-minute cache TTL and cache bypass/revalidation after an unknown document ID so a fresh deployment becomes visible promptly.
7. Resolves the exact catalog record and constructs/uses only its trusted public Pages URL.
8. Calls Telegram Bot API `sendDocument` with the public HTTPS PDF URL and a Russian caption containing discipline and education context.
9. Applies a 10-second timeout to catalog and Telegram upstream requests and returns a bounded, non-secret error response if catalog loading, validation, or Telegram delivery fails.

Logs may contain error categories and request correlation information. They must not contain the bot token, raw `initData`, catalog secrets, or other secret values.

The webhook `/start` response explains the catalog and contains a WebApp button. The README also documents BotFather menu-button configuration and webhook setup.

## 8. Error handling

Every recoverable failure renders within the current application shell; no failure may result in an unhandled white screen.

Required states include:

- catalog loading and catalog fetch failure with retry;
- empty course and no search results;
- unknown or stale document ID;
- catalog entry whose PDF is unavailable;
- Mini App opened outside Telegram;
- missing/invalid Telegram `initData` for chat delivery;
- offline or Worker unavailable;
- Telegram Bot API delivery failure.

Opening a PDF may remain available in an ordinary browser even when Telegram delivery is unavailable. Error text is actionable and does not expose internal or secret details.

## 9. Repository and deployment structure

The project is contained in `bot/`, which is the root of its own standalone Git repository. It uses a single root npm installation with isolated Worker configuration:

```text
bot/                         # standalone repository root
├── .github/workflows/deploy-pages.yml
├── public/
│   ├── catalog.json
│   └── documents/...
├── scripts/generate-catalog.ts
├── shared/
├── src/
├── tests/
├── worker/
│   ├── src/
│   ├── package.json
│   └── wrangler.toml
├── package.json
├── vite.config.ts
├── .env.example
└── README.md
```

The exact internal file split may be refined in the implementation plan, but catalog/parser logic, UI, Telegram adapter, local persistence, and Worker security must remain independently testable modules.

GitHub Actions on `main` performs checkout, Node setup, dependency installation, catalog generation, lint, typecheck, tests, production build, artifact upload, and Pages deployment. `dist/` is not committed. The Vite base path is configurable for GitHub Project Pages.

GitHub Actions therefore discovers `bot/.github/workflows/deploy-pages.yml` as `.github/workflows/deploy-pages.yml` inside the standalone repository. The README provides exact repository initialization, local development, test, build, Pages, Cloudflare Worker, webhook, BotFather, environment variable, and PDF update instructions.

## 10. Testing and verification

Automated tests cover at minimum:

- PDF filename parsing variants;
- level, program, and course derivation;
- deterministic document ID generation and collision handling;
- catalog generation and deterministic ordering;
- duplicate warning detection;
- search normalization and filtering;
- URL/path-segment encoding and GitHub Pages base paths;
- validated/invalid/stale Telegram `initData`;
- Worker request schema, CORS, unknown `documentId`, and arbitrary URL rejection;
- send-state duplicate-click prevention;
- localStorage validation for favorites and recent items;
- route and BackButton behavior;
- error states that retain the application shell.

Required verification commands include dependency installation from the lockfile, catalog generation, lint, typecheck, tests, and production build.

### Visual QA

After functional implementation, capture all five required screens at 390 px width and compare them with the corresponding collage screens. Review card width/height, vertical rhythm, horizontal padding, radii, typography, icon sizes, red-white-black hierarchy, search field, bottom navigation, CTA controls, and discipline-list density. Iterate until the application clearly reads as the same product.

Additionally test widths 320, 375, and 430 px without introducing separate breakpoint designs. Verify no horizontal overflow, clipped text, obscured bottom content, broken safe areas, or keyboard-induced layout failure.

## 11. Acceptance criteria

The design is satisfied when:

1. The complete project lives in `bot/` and does not depend on a database.
2. Adding a valid PDF and running the generator or CI makes it available without source changes.
3. The Mini App implements the five reference states as a single mobile-only column.
4. Catalog load, navigation, local search, favorites, and recent documents work without per-document requests.
5. Public PDF opening respects Cyrillic filenames and the GitHub Pages base path.
6. Telegram delivery accepts only a trusted catalog `documentId` and a server-validated Telegram identity.
7. `/start`, the Web App button, webhook, `/health`, and `sendDocument` flow are implemented.
8. Secrets never enter the frontend, repository, catalog, or logs.
9. All specified failure states remain inside the application shell with actionable feedback.
10. Automated verification passes and visual QA artifacts demonstrate reference fidelity at 390 px and robust scaling from 320 to 430 px.

## 12. Explicitly deferred

- Any database or durable user record.
- Registration, accounts, server-side profiles, or permissions.
- Analytics, statistics, and download history.
- Server-side favorites or recent history.
- Document upload/admin UI.
- Separate desktop or tablet design.
- Features outside the confirmed catalog, discovery, opening, and Telegram-delivery workflow.
