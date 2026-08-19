# Two-Round Raffle System & Impeccable UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the iconic Persona 5 3-polygon background (Red left, Black middle-bottom, Cream top-right), eliminate button clutter by moving the Round Switch button to the header as a sleek `[ 🏆 Babak Utama ➔ ]` action, and verify the two-round flow and operator safety controls.

**Architecture:**
- `global.css`: Restores `.bg-red-split` (`clip-path: polygon(0 0, 53% 0, 48% 100%, 0 100%)`) and `.bg-cream-split` (`clip-path: polygon(70% 0, 100% 0, 100% 80%, 55% 100%)`) over the deep black canvas `#0F1012`. Primary red trapezoid buttons sit on the black polygon with maximum contrast.
- `index.astro`: Relocates `.switch-round-btn` to the header bar next to `.round-badge`, leaving bottom-right actions clean and focused solely on `PUTAR SEKARANG` / `LANJUT & PUTAR` and `HANGUS & UNDI ULANG`.
- `raffle-controller.ts`: Controls two-round transitions, intermission modal, and finale overlay.

**Tech Stack:** TypeScript, Astro, CSS (Clip-path + Skew), Anime.js, Vitest.

## Global Constraints

- Must run 100% offline without external network or remote CDN asset dependencies.
- Main prizes order is strictly: 1. Karpet, 2. Magicom, 3. Kipas Angin.
- Existing test data-roles must remain intact.
- State persistence in `localStorage` must survive browser refreshes.

---

### Task 1: Restore 3-Polygon Background & Relocate Round Switch to Header

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/layout.test.ts`

**Visual Requirements:**
1. **Background Polygons**:
   - `.stage-container`: `width: 100vw; height: 100vh; background: var(--color-black); overflow: hidden; position: relative; max-width: none;`
   - `.bg-red-split`: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-crimson); clip-path: polygon(0 0, 53% 0, 48% 100%, 0 100%); z-index: 1;`
   - `.bg-cream-split`: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-cream); clip-path: polygon(70% 0, 100% 0, 100% 80%, 55% 100%); z-index: 2; overflow: hidden;`
2. **Wheel & Badge Positioning**:
   - `.wheel-wrapper`: `position: absolute; left: 8%; top: 50%; transform: translateY(-50%); width: min(58vw, 75vh); height: min(58vw, 75vh); z-index: 4;`
3. **Clean Header & Sleek Switch Button**:
   - Move `<button type="button" class="switch-round-btn" data-role="switch-round-button" hidden>🏆 Babak Utama ➔</button>` into `.top-center-badge-group` (or next to `.round-badge`).
   - Style `.switch-round-btn` as a sleek gold pill/skewed button with black text and smooth hover.
4. **Bottom Right Controls Clean-up**:
   - Bottom-right only has `.skew-btn` (`PUTAR SEKARANG` / `LANJUT & PUTAR`) and `.forfeit-btn` (`HANGUS & UNDI ULANG`) sitting on top of the black polygon.

- [ ] **Step 1: Update layout.test.ts**
- [ ] **Step 2: Update global.css and index.astro**
- [ ] **Step 3: Run bun run check and layout tests**
- [ ] **Step 4: Commit**

---

### Task 2: Controller & Integration Verification for Header Switch Button

**Files:**
- Modify: `src/client/raffle-controller.ts`
- Modify: `src/client/raffle-controller.test.ts`

- [ ] **Step 1: Verify and update event bindings in raffle-controller.ts**
- [ ] **Step 2: Run full unit test suite (`bun run test:unit`)**
- [ ] **Step 3: Commit and Push**
