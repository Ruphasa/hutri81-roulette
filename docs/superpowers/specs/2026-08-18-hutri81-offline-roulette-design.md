# HUT RI 81 Offline Roulette — Design Specification

**Status:** Approved by user  
**Date:** 2026-08-18  
**Product:** Malam HUT RI ke-81, Griya Shanta RT 08

## 1. Scope

Build a projector-first raffle application for approximately 165 property-lot numbers and 4–5 prizes. The application generates valid lot numbers from configured ranges, selects winners with browser-provided secure randomness, prevents repeat winners, survives accidental refreshes, and remains usable without internet after installation.

This specification covers only the raffle application. The bazaar-coupon workflow is a separate subsystem and is not part of this build.

## 2. Success Criteria

- An operator can run the complete event from a Windows laptop connected to a 16:9 projector.
- The current and winning lot number remains readable from across the event space.
- Each draw selects exactly one active lot number with no repeated winner.
- Refreshing or closing the application does not lose the current winner history.
- A deliberate reset restores every configured lot and clears the winner history.
- After the PWA has been installed and marked ready offline, the event does not depend on venue internet access.
- The public deployment and repository are polished enough to share as a portfolio project.

## 3. Operator Flow

1. The operator opens the installed PWA before the event and confirms the **Siap Offline** indicator.
2. The idle screen shows the event identity, prize round, active-lot count, roulette, and primary **Putar Sekarang** action.
3. The operator presses the button or `Enter` to start a draw.
4. The system chooses one winner before animation begins, then animates the wheel and center readout toward that result.
5. The wheel slows down, locks the winning lot in its center, and records the result.
6. The operator advances to the next prize; the previous winner is no longer eligible.
7. After the final prize, the screen presents the completed winner list and disables further draws.

## 4. Raffle States

### Idle

- Center of wheel: neutral prompt, **SIAP**.
- Primary action: **Putar Sekarang**.
- Header: active-lot count and current prize position, for example `164 nomor tersisa` and `Hadiah 02/05`.
- Secondary operator action: **Reset Undian**, visually subdued and separated from the primary action.

### Spinning

- The primary and reset actions are disabled.
- The roulette rotates with one authored acceleration-and-deceleration sequence.
- The center readout cycles through valid active lot numbers and slows with the wheel.
- The already-selected result remains hidden until the final lock.

### Winner Locked

- The winning lot becomes the largest stable text in the center of the wheel.
- A high-contrast `PEMENANG` label and the current prize label appear.
- The winner is persisted before celebratory motion completes.
- Primary action changes to **Lanjut Hadiah Berikutnya** or **Lihat Semua Pemenang** after the last prize.

### Event Complete

- All 4–5 winners are presented in draw order with their prize labels.
- Starting another draw is impossible until the event is reset.
- The reset control remains available.

### Reset Confirmation

**Reset Undian** means resetting the entire event, not merely stopping an animation.

- First action opens a protected confirmation dialog.
- Dialog copy states the exact effect: all winners are deleted, every configured lot becomes eligible again, and the prize round returns to the first prize.
- Buttons: **Batal** and **Ya, Reset Seluruh Undian**.
- Reset is unavailable while the wheel is spinning.
- Reset preserves the event configuration, installed PWA, and cached offline assets.

## 5. Visual Direction

The approved visual world combines Art Deco/Vegas casino structure with punk-subculture collage, ransom-note typography, and deliberately skewed or oblique composition. It takes energy and graphic-grammar inspiration from Sae Niijima’s casino palace in Persona 5 without copying game assets, logos, characters, or exact screens.

### Palette

- Ink black for the stage and high-contrast typography.
- Oxidized cream for calm reading surfaces.
- Revolt red for action and theatrical emphasis.
- Casino brass for Art Deco structure and wheel details.
- Restrained emerald used only as a secondary roulette color.

### Composition

- A giant off-center roulette owns the left two-thirds of the projector canvas.
- Ransom-note event typography and the primary action occupy the right side.
- The number readout stays in a calm cream field at the wheel’s center.
- Counts use small angular tickets in the upper corner rather than occupying the wheel center.
- Flat fields, cut-paper shapes, Deco linework, and deliberate hard offsets replace rounded cards, glassmorphism, generic glow, and decorative dashboard chrome.

### Typography and Assets

- Display fonts are self-hosted and included in the offline cache.
- Planned open-license families: Limelight for Deco display moments, Bowlby One SC for cut-paper emphasis, and Barlow Condensed for functional projector text.
- Functional numbers prioritize glyph distinction and distance legibility over stylistic distortion.
- All icons and ornaments are authored CSS/SVG geometry; no remote icon or image dependency is allowed.

### Motion

- One dominant motion event: the roulette draw.
- Ransom-note blocks may snap into the winner state, but they do not continuously float or pulse.
- A reduced-motion mode shortens the draw and removes rapid readout cycling while preserving the same winner.

## 6. Fairness and Winner Selection

- The active participant pool is the only source of eligible winners.
- Lot ranges are inclusive and expanded programmatically from typed event configuration.
- Startup validation rejects invalid bounds, empty output, and duplicate generated lot numbers.
- Winner selection uses `crypto.getRandomValues()` with rejection sampling to produce an unbiased active-array index.
- The winner is selected once. Roulette position, center readout, and winner presentation are synchronized visualizations of that one result.
- After selection, the winner is removed from the active pool before the next draw becomes available.
- Animation timing and frame rate never influence the result.

## 7. Persistence and Recovery

- A versioned local-storage record persists the event fingerprint, active lots, completed winners, current prize index, and UI state.
- Reloading restores the last stable idle, winner, or completed state; an interrupted spinning state restores as the already-selected winner state.
- Persistence is written immediately after result selection so an accidental reload cannot create a second result for the same prize.
- If stored data is malformed or belongs to a different event configuration, the application presents a recovery dialog rather than silently mixing states.
- Recovery can discard the incompatible saved draw and restart from the current event configuration only after operator confirmation.

## 8. Recommended Technical Architecture

### Stack

- Bun for dependency installation, lockfile management, and project scripts.
- Astro with static output for the shareable landing page and projector application shell.
- Vanilla TypeScript for a reducer-style client state machine and DOM bindings; no client UI framework is necessary.
- Vanilla CSS with design tokens plus authored SVG/CSS geometry; no UI component library or Tailwind dependency.
- `@vite-pwa/astro`/Workbox to precache HTML, JavaScript, CSS, fonts, icons, and the web-app manifest.
- Versioned `localStorage` persistence; no backend or online database.
- Vitest with DOM Testing Library for domain and interaction tests.
- Playwright for projector-flow, persistence, reset, and offline end-to-end verification.

### Why Astro and Bun

The product benefits from two static surfaces: `/` is a polished, shareable project landing page, while `/draw` is the full-screen event application and installed-PWA start route. Astro provides those static routes without shipping a framework runtime. The bounded raffle interactions are implemented with vanilla TypeScript, keeping the offline bundle small and avoiding a React island whose only purpose would be to recreate a single-screen application.

Bun is used as the package manager and script runner, producing `bun.lock`. The deployment remains a static Astro build; it does not depend on Vercel’s Bun server runtime or any server function.

### Module Boundaries

- `event-config`: event identity, lot ranges, and prize labels.
- `lot-generation`: expand and validate configured ranges.
- `random-selection`: unbiased index generation and winner removal.
- `raffle-machine`: pure reducer-style transitions between idle, spinning, winner, complete, and reset states.
- `persistence`: versioned serialization, restoration, and incompatibility detection.
- `offline-status`: service-worker readiness and install availability.
- `raffle-controller`: binds the state machine to semantic DOM elements and browser events.
- `roulette-stage`: projector presentation and motion only; it never selects winners.
- `operator-controls`: draw, advance, reset, and confirmation interactions.
- `winner-history`: ordered results and event-complete presentation.

## 9. Offline Contract

- The initial installation requires connectivity to the Vercel deployment.
- The application may claim **Siap Offline** only after its service worker is active and all required production assets are precached.
- No Google Fonts, CDN scripts, remote images, analytics, API calls, or runtime environment variables are permitted in the event path.
- The operator runbook requires opening the installed application once, confirming **Siap Offline**, enabling airplane mode, reloading, and completing a test draw before event day.
- A production build must pass an automated offline browser test after the first online load.

## 10. GitHub and Vercel Delivery

- Initialize a Git repository with `main` as the production branch.
- Publish the source to a public GitHub repository after the user confirms the repository name and visibility.
- Include a polished README with the product story, screenshots, offline-install instructions, fairness explanation, local development commands, and technology choices.
- Connect the GitHub repository to Vercel using the Astro framework preset and static `dist/` output.
- Each feature branch or pull request receives a preview deployment; `main` produces the production deployment.
- The deployment must include correct PWA caching headers and an SPA fallback without introducing any server function.
- GitHub publication and Vercel deployment occur only after local tests, production build, and offline verification pass.

Reference documentation:

- Vercel Git deployments: <https://vercel.com/docs/git>
- Vercel package-manager detection for `bun.lock`: <https://vercel.com/docs/package-managers>
- Astro static deployment: <https://docs.astro.build/en/guides/deploy/>
- Astro PWA integration: <https://vite-pwa-org.netlify.app/frameworks/astro>

## 11. Error Handling

- Invalid event configuration blocks drawing and lists each invalid or duplicate range precisely.
- An empty active pool blocks drawing and directs the operator to event completion or reset.
- A persistence write failure keeps the chosen winner visible but blocks advancing until the operator retries or confirms recovery.
- Missing PWA/offline readiness shows **Belum Siap Offline** without blocking local development.
- All critical state is communicated with text and shape, not color alone.

## 12. Verification

### Domain Tests

- Inclusive range expansion and prefix formatting.
- Duplicate detection across overlapping ranges.
- Random index boundaries and rejection behavior.
- Winner removal and no-repeat behavior across every prize round.
- Full reset restores the initial active pool and clears winners.
- Persistence round-trip and schema-version rejection.

### UI Tests

- Draw and reset controls are disabled while spinning.
- Reset requires explicit confirmation and preserves configuration.
- Winner and prize labels match raffle-machine state.
- Keyboard draw control cannot trigger two simultaneous draws.
- Reduced-motion mode preserves the selected result.

### End-to-End Tests

- Complete a five-prize event without duplicate winners.
- Reload immediately after selection and recover the same winner.
- Reload after event completion and retain the final winner list.
- Install/cache once, switch the browser context offline, reload, draw, reset, and finish an event.
- Verify primary content at 1366×768 and 1920×1080 projector viewports without overflow or unreadable status text.

## 13. Content Required Before Production

- Final lot-number ranges.
- Final prize count and labels; generic `Hadiah ke-1` through `Hadiah ke-5` remain valid defaults.
- Public GitHub repository name and visibility confirmation; recommended name: `hutri81-roulette`.

These content values do not change the architecture or interaction model.
