# HUT RI 81 Offline Roulette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an offline-first, projector-ready HUT RI raffle with an Art Deco casino × punk-collage visual system, unbiased winner selection, no repeat winners, persistent recovery, and a protected full-event reset.

**Architecture:** Astro statically renders a shareable `/` landing page and the `/draw/` projector shell. A framework-free TypeScript state machine owns raffle behavior, persistence, and DOM bindings; CSS/SVG owns the wheel and stage motion. Workbox via `@vite-pwa/astro` precaches the complete build for offline use, while GitHub and Vercel provide source hosting, previews, and production delivery.

**Tech Stack:** Bun, Astro static output, strict vanilla TypeScript, vanilla CSS/SVG, `@vite-pwa/astro`, versioned `localStorage`, Web Crypto, Vitest, DOM Testing Library, Playwright, GitHub, Vercel.

## Global Constraints

- The event path must make no runtime network request and must work after the installed PWA reports **Siap Offline**.
- Winner selection uses `crypto.getRandomValues()` with rejection sampling; animation never determines the winner.
- A lot number can win at most once until a confirmed full-event reset.
- Reset clears winners and restores all configured lots, but preserves event configuration and offline assets.
- The projector layout must pass at 1366×768 and 1920×1080.
- The approved visual world is Art Deco/Vegas casino structure plus punk collage, ransom-note typography, and oblique composition; do not introduce rounded dashboard cards, glassmorphism, remote fonts, remote images, or a UI component library.
- Use self-hosted font packages and authored CSS/SVG geometry only.
- The bazaar-coupon workflow is out of scope.
- Generic labels `Hadiah ke-1` through `Hadiah ke-5` are valid until final prize names are supplied.
- Current lot ranges are event content, not domain logic; the production deployment must use the final ranges supplied by the user.

---

## Planned File Structure

```text
.
├── .gitignore
├── astro.config.mjs
├── bun.lock
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vitest.config.ts
├── public/
│   ├── brand-icon.svg
│   ├── icons/
│   │   ├── pwa-192x192.png
│   │   └── pwa-512x512.png
│   └── robots.txt
├── scripts/
│   └── generate-icons.mjs
├── src/
│   ├── components/
│   │   ├── OfflineStatus.astro
│   │   ├── raffle/
│   │   │   ├── OperatorControls.astro
│   │   │   ├── ResetDialog.astro
│   │   │   ├── RouletteStage.astro
│   │   │   └── WinnerHistory.astro
│   ├── config/
│   │   └── event.ts
│   ├── client/
│   │   ├── offline-status.ts
│   │   ├── raffle-controller.test.ts
│   │   ├── raffle-controller.ts
│   │   ├── roulette-motion.test.ts
│   │   └── roulette-motion.ts
│   ├── domain/
│   │   ├── lot-generation.test.ts
│   │   ├── lot-generation.ts
│   │   ├── raffle-machine.test.ts
│   │   ├── raffle-machine.ts
│   │   ├── random-selection.test.ts
│   │   ├── random-selection.ts
│   │   └── types.ts
│   ├── env.d.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── persistence.test.ts
│   │   └── persistence.ts
│   ├── pages/
│   │   ├── draw.astro
│   │   └── index.astro
│   └── styles/
│       ├── global.css
│       ├── landing.css
│       ├── raffle.css
│       └── tokens.css
├── tests/
│   ├── offline.spec.ts
│   └── raffle-flow.spec.ts
└── README.md
```

## Repository Bootstrap Before SDD

This bootstrap is intentionally completed before implementation begins. It publishes the approved product record, design specification, implementation plan, and an honest work-in-progress README to public `main`; generated brainstorming artifacts and the private handoff remain local.

- [x] Initialize Git with `main` as the default branch.
- [x] Commit only `.gitignore`, `README.md`, `PRODUCT.md`, and `docs/superpowers/` as `docs: establish HUT RI roulette project`.
- [x] Create the public GitHub repository `hutri81-roulette` and push `main`.
- [x] Create the isolated `agent/implement-offline-roulette` workspace used by SDD (separate Git directory fallback because root Git metadata is sandbox-read-only).

## Task 1: Establish the Astro/Bun Project and Test Harness

**Files:**

- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/env.d.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`

**Interfaces:**

- Produces: `bun run dev`, `bun run check`, `bun run build`, `bun run test:unit`, and `bun run test:e2e` commands used by every later task.
- Produces: `BaseLayout` with `title`, `description`, and optional `bodyClass` props.

- [ ] **Step 1: Verify the isolated implementation branch and ignore rules**

Run:

```powershell
git status -sb
git branch --show-current
```

Expected: the branch is `agent/implement-offline-roulette`, the worktree is clean, and `.gitignore` already excludes generated build, test, Visual Companion, GitHub CLI, and private handoff artifacts.

- [ ] **Step 2: Create the package manifest and install exact dependency families**

Create `package.json`:

```json
{
  "name": "hutri81-roulette",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "bun@1",
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "bun run check && astro build",
    "preview": "astro preview",
    "test": "bun run test:unit && bun run test:e2e",
    "test:unit": "vitest run --passWithNoTests",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "icons": "node scripts/generate-icons.mjs"
  }
}
```

Run:

```powershell
bun add astro @vite-pwa/astro @fontsource/limelight @fontsource/bowlby-one-sc @fontsource/barlow-condensed
bun add -d @astrojs/check @playwright/test @testing-library/dom jsdom sharp typescript vitest
bunx playwright install chromium
```

Expected: `bun.lock` exists and `bun install --frozen-lockfile` succeeds.

- [ ] **Step 3: Configure strict TypeScript and unit tests**

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "types": ["vitest/globals"]
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
```

Create `src/env.d.ts`:

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 4: Configure Astro static output and the shared layout**

Create `astro.config.mjs` initially without the PWA integration; Task 7 adds it after the icon assets exist:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
});
```

Create `src/layouts/BaseLayout.astro` with typed props, UTF-8 metadata, viewport metadata, description metadata, local font imports, and imports for `tokens.css` and `global.css`. It must render `<slot />` and never reference a remote asset.

Create a minimal `src/pages/index.astro` using `BaseLayout` and the real heading `Undian HUT RI ke-81`; Task 5 replaces its temporary body with the complete share page.

- [ ] **Step 5: Define durable visual tokens**

Create `src/styles/tokens.css` with the approved palette and motion values:

```css
:root {
  --color-ink: #09080d;
  --color-paper: #f2e7ca;
  --color-red: #e12631;
  --color-gold: #d6aa35;
  --color-jade: #087b68;
  --color-chalk: #fffaf0;
  --font-deco: "Limelight", serif;
  --font-ransom: "Bowlby One SC", sans-serif;
  --font-ui: "Barlow Condensed", sans-serif;
  --ease-wheel: cubic-bezier(.12, .72, .08, 1);
  --projector-min-height: 768px;
}
```

Create `src/styles/global.css` with a border-box reset, full-height body, visible keyboard focus, projector-safe base type, and `prefers-reduced-motion` defaults.

- [ ] **Step 6: Verify the empty shell**

Run:

```powershell
bun run check
bun run build
bun run test:unit
```

Expected: all commands exit 0; the unit-test command reports zero test files without configuration errors.

- [ ] **Step 7: Commit the foundation**

```powershell
git add package.json bun.lock astro.config.mjs tsconfig.json vitest.config.ts src
git commit -m "chore: establish Astro and Bun project"
```

## Task 2: Generate and Validate Lot Numbers

**Files:**

- Create: `src/domain/types.ts`
- Create: `src/config/event.ts`
- Create: `src/domain/lot-generation.ts`
- Create: `src/domain/lot-generation.test.ts`

**Interfaces:**

- Produces: `LotRange`, `Prize`, `EventConfig`, `WinnerRecord`, and `RaffleState` types.
- Produces: `generateLots(ranges: readonly LotRange[]): string[]`.
- Produces: `validateEventConfig(config: EventConfig): readonly string[]`.
- Produces: `EVENT_CONFIG`, consumed by the raffle controller and persistence fingerprint.

- [ ] **Step 1: Write failing inclusive-range tests**

Create tests covering:

```ts
expect(generateLots([{ prefix: 'L', start: 201, end: 203 }]))
  .toEqual(['L201', 'L202', 'L203']);

expect(generateLots([{ prefix: 'A', start: 8, end: 10, padTo: 3 }]))
  .toEqual(['A008', 'A009', 'A010']);
```

Also assert that reversed bounds, blank prefixes, overlapping output, an empty range list, and an empty prize list return explicit validation errors.

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
bunx vitest run src/domain/lot-generation.test.ts
```

Expected: FAIL because `generateLots` and `validateEventConfig` do not exist.

- [ ] **Step 3: Implement domain types and range generation**

Define:

```ts
export interface LotRange {
  readonly prefix: string;
  readonly start: number;
  readonly end: number;
  readonly padTo?: number;
}

export interface Prize {
  readonly id: string;
  readonly label: string;
}

export interface EventConfig {
  readonly id: string;
  readonly title: string;
  readonly neighborhood: string;
  readonly lotRanges: readonly LotRange[];
  readonly prizes: readonly Prize[];
}
```

Implement inclusive iteration, numeric padding, stable range order, duplicate detection, and Indonesian validation messages.

- [ ] **Step 4: Add the event configuration**

Create `EVENT_CONFIG` with the confirmed event identity, five generic prize labels, and the currently supplied example ranges `L201–L250` and `K301–K450`. Keep all count rendering derived from `generateLots()`; never hardcode `165`. Replace only the `lotRanges` array before production when the user supplies the final ranges.

- [ ] **Step 5: Verify and commit**

```powershell
bunx vitest run src/domain/lot-generation.test.ts
bun run check
git add src/domain src/config
git commit -m "feat: generate and validate raffle lots"
```

Expected: focused tests and Astro type checks pass.

## Task 3: Implement Unbiased Selection and the Raffle State Machine

**Files:**

- Create: `src/domain/random-selection.ts`
- Create: `src/domain/random-selection.test.ts`
- Create: `src/domain/raffle-machine.ts`
- Create: `src/domain/raffle-machine.test.ts`
- Modify: `src/domain/types.ts`

**Interfaces:**

- Produces: `randomIndex(length: number, nextUint32?: () => number): number`.
- Produces: `selectWinner(activeLots: readonly string[], nextUint32?: () => number): string`.
- Produces: `createInitialState(config, lots)`, `transition(state, action, prizes)`, and `stabilizeRestoredState(state, prizes)`.

- [ ] **Step 1: Write failing random-index tests**

Test bounds, empty-pool errors, deterministic injection, and rejection sampling:

```ts
const values = [4_294_967_295, 7];
const next = () => values.shift() ?? 0;
expect(randomIndex(10, next)).toBe(7);
expect(() => randomIndex(0)).toThrow('Panjang kumpulan harus lebih dari nol');
```

- [ ] **Step 2: Implement Web Crypto selection**

Use a `Uint32Array(1)`, `2 ** 32`, and a rejection limit of `range - (range % length)`. Do not use `Math.random()` or direct modulo without rejection.

- [ ] **Step 3: Write failing state-transition tests**

Cover these exact transitions:

- `idle + START_DRAW` removes the chosen lot, sets `phase: 'spinning'`, and stores `pendingWinner`.
- `spinning + REVEAL_WINNER` appends one `WinnerRecord` and enters `winner`.
- `winner + ADVANCE` enters `idle` for the next prize or `complete` after the last prize.
- Duplicate `START_DRAW`, `ADVANCE` during spin, and drawing from an empty pool throw explicit domain errors.
- `RESET` restores the supplied full pool, clears winners, clears `pendingWinner`, and returns prize index `0`.
- Restoring a persisted spinning state converts the pending result into a stable winner state without selecting again.

- [ ] **Step 4: Implement the pure raffle machine**

Use the state shape:

```ts
export type RafflePhase = 'idle' | 'spinning' | 'winner' | 'complete';

export interface WinnerRecord {
  readonly lotId: string;
  readonly prizeId: string;
  readonly prizeLabel: string;
  readonly drawnAt: string;
}

export interface RaffleState {
  readonly phase: RafflePhase;
  readonly activeLots: readonly string[];
  readonly winners: readonly WinnerRecord[];
  readonly prizeIndex: number;
  readonly pendingWinner: WinnerRecord | null;
}
```

Every transition returns a new immutable state.

- [ ] **Step 5: Verify and commit**

```powershell
bunx vitest run src/domain/random-selection.test.ts src/domain/raffle-machine.test.ts
git add src/domain
git commit -m "feat: add fair raffle state machine"
```

## Task 4: Persist and Recover Event State

**Files:**

- Create: `src/lib/persistence.ts`
- Create: `src/lib/persistence.test.ts`

**Interfaces:**

- Produces: `eventFingerprint(config: EventConfig): string`.
- Produces: `saveRaffleState(storage, config, state): SaveResult`.
- Produces: `loadRaffleState(storage, config): LoadResult`.
- Consumes: `stabilizeRestoredState()` from Task 3.

- [ ] **Step 1: Write failing persistence tests**

Test a successful round trip, schema mismatch, event fingerprint mismatch, malformed JSON, storage write failure, and stabilization of a spinning record.

Use the exact envelope:

```ts
interface PersistedEnvelope {
  readonly schemaVersion: 1;
  readonly eventFingerprint: string;
  readonly payload: RaffleState;
}
```

- [ ] **Step 2: Run and confirm the test fails**

```powershell
bunx vitest run src/lib/persistence.test.ts
```

Expected: FAIL because the persistence module is absent.

- [ ] **Step 3: Implement versioned storage**

Use the key `hutri81-raffle:v1`. Fingerprint the event ID, ordered ranges, and ordered prize IDs with a stable joined string. Return discriminated results:

```ts
type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'restored'; readonly state: RaffleState }
  | { readonly status: 'incompatible'; readonly reason: string };

type SaveResult =
  | { readonly status: 'saved' }
  | { readonly status: 'failed'; readonly reason: string };
```

Never silently discard incompatible data.

- [ ] **Step 4: Verify and commit**

```powershell
bunx vitest run src/lib/persistence.test.ts
bun run test:unit
git add src/lib
git commit -m "feat: persist and recover raffle state"
```

## Task 5: Build the Static Landing Page and Projector Markup

**Files:**

- Modify: `src/pages/index.astro`
- Create: `src/pages/draw.astro`
- Create: `src/components/OfflineStatus.astro`
- Create: `src/components/raffle/RouletteStage.astro`
- Create: `src/components/raffle/OperatorControls.astro`
- Create: `src/components/raffle/ResetDialog.astro`
- Create: `src/components/raffle/WinnerHistory.astro`
- Create: `src/styles/landing.css`
- Create: `src/styles/raffle.css`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**

- Produces: semantic `data-role` hooks consumed only by `mountRaffleApp()`.
- Produces: `/` share page and `/draw/` fullscreen route.
- Consumes: event copy from `EVENT_CONFIG`; no duplicated event constants in templates.

- [ ] **Step 1: Write a DOM contract test before markup**

Create the initial `raffle-controller.test.ts` fixture and assert that the root contains unique hooks for:

```text
data-raffle-app
data-role="wheel"
data-role="center-value"
data-role="active-count"
data-role="prize-position"
data-role="draw"
data-role="advance"
data-role="reset"
data-role="reset-dialog"
data-role="reset-confirm"
data-role="winner-history"
data-role="error"
```

Run `bunx vitest run src/client/raffle-controller.test.ts` and confirm failure because the markup fixture and controller do not yet exist.

- [ ] **Step 2: Build the shareable `/` page**

The landing page must contain the real event name, one screenshot-shaped live preview composed from HTML/CSS, a concise fairness explanation, offline instructions, and a single primary link labeled **Buka Panggung Undian** pointing to `/draw/`. It must not duplicate the full interactive draw engine.

- [ ] **Step 3: Build semantic projector components**

Use real buttons and `<dialog>`:

```astro
<button type="button" data-role="draw">Putar Sekarang</button>
<button type="button" data-role="advance" hidden>Lanjut Hadiah Berikutnya</button>
<button type="button" data-role="reset">Reset Undian</button>

<dialog data-role="reset-dialog" aria-labelledby="reset-title">
  <h2 id="reset-title">Reset seluruh undian?</h2>
  <p>Semua pemenang akan dihapus dan seluruh nomor kavling kembali masuk undian.</p>
  <button type="button" data-role="reset-cancel">Batal</button>
  <button type="button" data-role="reset-confirm">Ya, Reset Seluruh Undian</button>
</dialog>
```

Ensure all visual ornaments are `aria-hidden="true"` and the winning value has an `aria-live="polite"` text companion that updates only when the wheel locks.

- [ ] **Step 4: Translate the approved visual direction into production CSS**

Use an asymmetric 16:9 stage, a giant left-side roulette, an oblique cream field, ransom-note title blocks, angular count tickets, and a cut-paper primary action. Keep the number readout horizontal and isolated inside a cream field. Use container/query or viewport rules so the stage fits both target projector sizes without scrolling.

The CSS must include:

```css
@media (prefers-reduced-motion: reduce) {
  [data-role="wheel"] { animation-duration: 1ms !important; }
}

@media (max-aspect-ratio: 16 / 10) {
  .raffle-stage { min-height: 100svh; }
}
```

- [ ] **Step 5: Verify the static pages**

```powershell
bun run check
bun run build
```

Expected: both `dist/index.html` and `dist/draw/index.html` exist, and `rg '(src|href)="https?://' dist` returns no remote runtime asset.

- [ ] **Step 6: Commit the surfaces**

```powershell
git add src/pages src/components src/styles src/layouts
git commit -m "feat: create raffle stage and showcase"
```

## Task 6: Bind the State Machine, Motion, Keyboard Controls, and Reset

**Files:**

- Create: `src/client/roulette-motion.ts`
- Create: `src/client/roulette-motion.test.ts`
- Create: `src/client/raffle-controller.ts`
- Modify: `src/client/raffle-controller.test.ts`
- Modify: `src/pages/draw.astro`

**Interfaces:**

- Produces: `animateRoulette(options): Promise<void>`.
- Produces: `mountRaffleApp(root: HTMLElement, dependencies?: ControllerDependencies): () => void`.
- Consumes: Task 2 configuration, Task 3 selection/state machine, Task 4 persistence, and Task 5 DOM hooks.

- [ ] **Step 1: Write failing motion tests**

Inject a fake animation driver and fake clock. Assert that normal motion cycles active lot labels and resolves on the chosen winner, while reduced motion skips rapid cycling and resolves to the same winner.

Define:

```ts
interface RouletteMotionOptions {
  readonly wheel: HTMLElement;
  readonly readout: HTMLElement;
  readonly activeLots: readonly string[];
  readonly winner: string;
  readonly reducedMotion: boolean;
  readonly durationMs?: number;
}
```

- [ ] **Step 2: Implement one authored wheel animation**

Use the Web Animations API for rotation, an exponential-feeling ease-out, and a single readout timer. Default duration is 6500 ms; reduced motion uses 250 ms and no rapid intermediate labels. Always set the final readout to `winner` in `finally`.

- [ ] **Step 3: Expand controller tests around user behavior**

Test:

- draw click selects once and disables draw/reset;
- repeated click and repeated `Enter` while spinning select nothing extra;
- draw selection persists the spinning state with `pendingWinner` before animation begins;
- animation completion reveals the winner and persists the stable winner state;
- persistence write failure blocks animation/advance and shows a recovery error without selecting again;
- advance changes the prize and returns to idle;
- reset click opens the dialog without changing state;
- cancel preserves state;
- confirm resets winners and active lots;
- restored incompatible storage displays recovery copy;
- final winner changes the primary action to **Lihat Semua Pemenang**.

- [ ] **Step 4: Implement the controller with injected dependencies**

Use this dependency boundary:

```ts
interface ControllerDependencies {
  readonly config: EventConfig;
  readonly selectWinner: typeof selectWinner;
  readonly animateRoulette: typeof animateRoulette;
  readonly storage: Storage;
  readonly now: () => string;
  readonly reducedMotion: () => boolean;
}
```

Render by updating text, `hidden`, `disabled`, `aria-busy`, and phase data attributes. Do not rebuild the whole page with `innerHTML`.
After `START_DRAW`, save the spinning state containing `pendingWinner` before starting animation. After animation completes, reveal the winner and save the stable winner state. If either write fails, stop the transition and render a recoverable error without drawing another lot.

- [ ] **Step 5: Mount the controller from the Astro route**

Add one processed Astro script to `draw.astro`:

```astro
<script>
  import { mountRaffleApp } from '../client/raffle-controller';

  const root = document.querySelector<HTMLElement>('[data-raffle-app]');
  if (root) mountRaffleApp(root);
</script>
```

- [ ] **Step 6: Verify and commit**

```powershell
bunx vitest run src/client/roulette-motion.test.ts src/client/raffle-controller.test.ts
bun run test:unit
bun run check
git add src/client src/pages/draw.astro
git commit -m "feat: run and reset the interactive raffle"
```

## Task 7: Add Installable Offline PWA Behavior

**Files:**

- Create: `public/brand-icon.svg`
- Create: `scripts/generate-icons.mjs`
- Create: `src/client/offline-status.ts`
- Modify: `astro.config.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/OfflineStatus.astro`

**Interfaces:**

- Produces: `offline-ready` and `offline-update-available` browser events.
- Produces: installable manifest with `/draw/` as `start_url`.
- Produces: complete precache for HTML, JS, CSS, SVG, PNG, WOFF2, and web manifest files.

- [ ] **Step 1: Create original app icon geometry and deterministic PNG generation**

Author `brand-icon.svg` as a cream, red, black, and gold roulette-pointer mark with no text. Create `scripts/generate-icons.mjs` using `sharp` to write 192×192 and 512×512 PNG files to `public/icons/`.

Run:

```powershell
bun run icons
```

Expected: both PNG files exist and have non-zero size.

- [ ] **Step 2: Configure `@vite-pwa/astro`**

Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    AstroPWA({
      registerType: 'prompt',
      manifest: {
        name: 'Undian HUT RI 81 — Griya Shanta RT 08',
        short_name: 'Undian RT 08',
        description: 'Undian kavling offline untuk malam HUT RI ke-81.',
        start_url: '/draw/',
        scope: '/',
        display: 'standalone',
        background_color: '#09080d',
        theme_color: '#e12631',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
        navigateFallback: '/draw/index.html'
      }
    })
  ]
});
```

- [ ] **Step 3: Register readiness without surprise refreshes**

Implement `offline-status.ts` using `virtual:pwa-register`. Dispatch `offline-ready` from `onOfflineReady` and `offline-update-available` from `onNeedRefresh`; do not auto-reload during an event. `OfflineStatus.astro` displays **Belum Siap Offline**, **Siap Offline**, or **Pembaruan Tersedia** from those events and `navigator.onLine`.

- [ ] **Step 4: Verify the production service worker**

```powershell
bun run build
rg "pwa-192x192|pwa-512x512" dist
rg "woff2" dist/sw.js
```

Expected: manifest references both icons; the service-worker manifest includes font assets.

- [ ] **Step 5: Commit offline support**

```powershell
git add astro.config.mjs public scripts src/client/offline-status.ts src/components/OfflineStatus.astro src/layouts/BaseLayout.astro
git commit -m "feat: make the raffle installable offline"
```

## Task 8: Verify Complete Raffle and Offline Flows

**Files:**

- Create: `tests/raffle-flow.spec.ts`
- Create: `tests/offline.spec.ts`
- Modify: `playwright.config.ts`
- Modify: source files only when a test reveals a contract violation.

**Interfaces:**

- Consumes: production preview at `http://127.0.0.1:4321`.
- Produces: repeatable evidence that refresh, reset, completion, projector layout, and offline execution work.

- [ ] **Step 1: Configure Playwright against the production build**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run build && bun run preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4321/draw/',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'projector-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'projector-1080p', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }
  ]
});
```

- [ ] **Step 2: Write the five-prize and reset flow test**

The test must draw five winners with reduced motion emulated, assert five unique lot IDs, reload after the second selection, confirm the same second winner returns, finish the event, reset through the dialog, and assert the winner history is empty and the original active count is restored.

- [ ] **Step 3: Write the offline test**

Load `/draw/` online, wait for **Siap Offline**, close the page, create a new page in the same browser context, call `context.setOffline(true)`, reopen `/draw/`, complete one draw, reload, and assert the same winner remains visible.

- [ ] **Step 4: Run the full verification suite**

```powershell
bun run check
bun run test:unit
bun run test:e2e
bun run build
```

Expected: every command exits 0 in both projector projects.

- [ ] **Step 5: Commit verification**

```powershell
git add tests playwright.config.ts src
git commit -m "test: verify raffle recovery and offline flow"
```

## Task 9: Finish Documentation, Visual QA, GitHub, and Vercel

**Files:**

- Create: `README.md`
- Create: `docs/images/raffle-stage.png`
- Modify: `src/config/event.ts` with final lot ranges if supplied by this point.
- Modify: `PRODUCT.md` and the design spec only if implementation evidence changes a factual statement.

**Interfaces:**

- Produces: public GitHub repository `hutri81-roulette`.
- Produces: Vercel preview and production URLs.
- Produces: event-day offline runbook.

- [ ] **Step 1: Replace example ranges with final event content**

Generate the configured lots, print the count in a focused verification command or test, and compare it with the user-supplied event list. Do not publish production while final ranges contain an unintended overlap or unexpected count.

- [ ] **Step 2: Capture bounded visual evidence**

Capture `/draw/` at 1366×768 and 1920×1080, inspect both in one pass for clipping, hierarchy, projector legibility, focus visibility, and fidelity to the approved Art Deco casino × punk-collage direction. Apply one batched correction, recapture once, and stop visual polishing.

Save the approved 1920×1080 image as `docs/images/raffle-stage.png`.

- [ ] **Step 3: Write the README**

Include:

- the event and product story;
- the screenshot;
- Bun install, `bun install`, `bun run dev`, `bun run test`, and `bun run build` commands;
- how ranges and prizes are configured;
- the unbiased selection and no-repeat explanation;
- PWA installation and airplane-mode rehearsal instructions;
- architecture and module map;
- GitHub/Vercel deployment behavior;
- attribution for bundled OFL font packages.

- [ ] **Step 4: Run final local verification and commit**

```powershell
bun install --frozen-lockfile
bun run check
bun run test
bun run build
git status --short
git add README.md docs/images src/config PRODUCT.md docs/superpowers
git commit -m "docs: prepare HUT RI roulette for release"
```

Expected: tests/build pass and `git status --short` is empty after the commit.

- [ ] **Step 5: Push the reviewed implementation branch**

Verify authentication, push, and open a draft pull request:

```powershell
gh auth status
git push -u origin agent/implement-offline-roulette
gh pr create --draft --base main --head agent/implement-offline-roulette --title "Build offline HUT RI roulette" --body "Implements the approved offline raffle design, automated verification, and release documentation."
```

Expected: GitHub shows a draft pull request targeting `main`, with all local checks reported in its description.

- [ ] **Step 6: Import GitHub into Vercel**

Import the GitHub repository as a new Vercel project. Confirm detected settings:

```text
Framework Preset: Astro
Install Command: bun install
Build Command: bun run build
Output Directory: dist
Production Branch: main
```

Do not add environment variables or a server adapter.

- [ ] **Step 7: Verify the real deployment online and offline**

Open the production URL once online, wait for **Siap Offline**, install the PWA, enable airplane mode, reload `/draw/`, complete a draw, reset, and complete another draw. Re-enable networking and confirm the landing page and GitHub links are shareable.

- [ ] **Step 8: Record release URLs**

Add the production Vercel URL to the GitHub repository About section and README, commit that documentation change, and push `main`. Confirm Vercel creates the final production deployment from the pushed commit.

## Plan Self-Review Checklist

- Every design-spec requirement maps to a task: lot generation (2), fairness/no repeats (3), persistence (4), approved UI (5–6), reset (6), PWA/offline (7–8), projector testing (8–9), GitHub/Vercel (9).
- No server, database, authentication, coupon subsystem, sound system, or component library is introduced.
- State/type names are consistent: `RaffleState`, `WinnerRecord`, `pendingWinner`, `RafflePhase`, `transition`, and `stabilizeRestoredState`.
- Example event ranges are isolated in `src/config/event.ts`; domain tests use small deterministic fixtures.
- Each implementation task ends with focused tests and a commit.
