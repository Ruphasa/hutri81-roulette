# Pixel-Perfect Roulette UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perfectly replicate `L:\HUTRI81\expectation.png` without any deviations, while maintaining the existing PWA and Playwright test selectors. Also fix the "Sidik jari acara tidak cocok" error by auto-resetting state.

**Global Palette:**
- Red: `#D92525`
- Black: `#0F1012`
- Cream: `#F1E8D1`
- Gold: `#C19F48`
- Green: `#1F7359`
- White: `#FFFFFF`

---

### Task 1: Auto-Reset on Hash Mismatch

**Files:**
- Modify: `src/lib/persistence.ts`

**Steps:**
- [ ] In `loadRaffleState`, if `state.configHash !== generateConfigHash(config)` is true, DO NOT throw an error. Instead, automatically call `clearRaffleState(storage)` and return `null`. This fixes the "Sidik jari acara tidak cocok" error and allows the app to spin again cleanly after config changes.
- [ ] Run `bun run test:unit` to ensure persistence tests pass (you may need to update tests that expect an error to now expect `null`).
- [ ] Commit: `fix: auto-reset state on config hash mismatch`

### Task 2: Pixel-Perfect Background & Layout

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Steps:**
- [ ] Update `:root` variables in `global.css` to match the Global Palette above.
- [ ] Update the `.stage-container` background to the Solid Black `#0F1012`.
- [ ] Update `.bg-red-split`:
  - `background: var(--color-crimson);`
  - `clip-path: polygon(0 0, 53% 0, 48% 100%, 0 100%);`
  - Width: `100%`, Height: `100%`.
- [ ] Update `.bg-cream-split`:
  - `background: var(--color-cream);`
  - `clip-path: polygon(70% 0, 100% 0, 100% 80%, 55% 100%);`
  - Width: `100%`, Height: `100%`.
- [ ] Add the Sunburst lines to the cream split. Inside `.bg-cream-split`, add SVG lines radiating from the top right to mimic the gold sunburst in `expectation.png`.
- [ ] Commit: `style: pixel-perfect background splits and sunburst`

### Task 3: Pixel-Perfect Header & Typography Elements

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Steps:**
- [ ] Top Left Badge: Add `<div class="top-left-badge">GRIYA SHANTA &middot; RT 08</div>` and a `<div class="top-left-diamond"></div>`. Style them with a cream background, black text, and skew them slightly.
- [ ] Top Right Badges: Add `<div class="top-right-stats"><span class="stat-gold">164 NOMOR TERSISA</span><span class="stat-cream">HADIAH 02/05</span></div>`. Position at top right.
- [ ] Ransom Note: Update `.ransom-title`. The colors are:
  - Block 1 (MALAM): White text on Black bg, tilted left.
  - Block 2 (UNDIAN): Black text on Gold bg, tilted right.
  - Block 3 (MERDEKA!): White text on Red bg, tilted left.
- [ ] Middle Right Text: Add `<div class="middle-right-text">PUTAR RODA. TAHAN NAPAS.<br><span class="highlight">BIARKAN NASIB MEMILIH</span> SATU<br>NOMOR KAVLING MALAM INI.</div>`.
- [ ] Bottom Left Text: Add `<div class="bottom-left-text">sekali putar, satu pemenang!</div>` tilted upwards with a white underline.
- [ ] Bottom Right Button: Update `.skew-btn` (Putar Sekarang) to be a red trapezoid pointing right. Add text `ENTER - MULAI UNDIAN` below it, and a red diamond at the far bottom right corner.
- [ ] Commit: `feat: pixel-perfect typography and badges`

### Task 4: Pixel-Perfect Roulette Wheel

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Steps:**
- [ ] Update the Wheel SVG (`[data-role="wheel"]`):
  - Replace the 4 slices with 16 slices (or a repeating conic-gradient). Colors: Black, Gold, Black, Green, Black, Red, repeating.
  - Add concentric red/gold outer rings matching the design.
- [ ] Update `.wheel-center-badge`:
  - Shape: Clipped rectangle (cut corners).
  - Background: Cream `#F1E8D1`.
  - Top text: `NOMOR TERKUNCI` (small, spaced).
  - Value text (`[data-role="winner-display"]`): Huge red font.
  - Bottom badge: Black skewed rectangle with white text `PEMENANG`.
- [ ] Update Pointer: Top center, cream diamond inside a white diamond.
- [ ] Run `bun run test:e2e` to ensure the layout didn't break functionality.
- [ ] Commit: `feat: pixel-perfect roulette wheel and center badge`
