# 2/3 Stage Wheel Scale, Confetti Positioning & Mechanical Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 2/3 stage red split proportion to enlarge the roulette wheel, position confetti cannons at the left/right flanks of the wheel, synchronize wheel & text easing with mechanical easeOutCubic deceleration, and style the finale/intermission scrollbars in gold Persona 5 theme.

**Architecture:**
- `global.css`: Updates `.bg-red-split` (`clip-path: polygon(0 0, 68% 0, 62% 100%, 0 100%)`), `.wheel-wrapper` (`width: min(62vw, 84vh); left: 5%;`), right elements compaction (`right: 3%`), and custom gold scrollbars.
- `confetti.ts`: Enhances `fire({ count, originEl })` to calculate element bounding rect and shoot upward from the wheel's left and right flanks.
- `roulette-motion.ts`: Unifies wheel rotation and text stepping with matching `easeOutCubic` easing for frame-accurate mechanical lock synchronization and triggers badge impact pulse.
- `raffle-controller.ts`: Passes `wheel` element to `confetti.fire({ originEl: els.wheel })`.

**Tech Stack:** TypeScript, Astro, CSS, Anime.js, Canvas 2D, Vitest.

## Global Constraints

- Must run 100% offline without external network or remote CDN asset dependencies.
- Main prizes order is strictly: 1. Karpet, 2. Magicom, 3. Kipas Angin.
- Existing test data-roles must remain intact.
- State persistence in `localStorage` must survive browser refreshes.

---

### Task 1: 2/3 Stage Proportions, Large Wheel & Custom Stylized Scrollbar

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/layout.test.ts`

- [ ] **Step 1: Update layout.test.ts with 2/3 proportions and scrollbar rules**
- [ ] **Step 2: Update global.css**
- [ ] **Step 3: Run layout tests and bun run check**
- [ ] **Step 4: Commit**

---

### Task 2: Flanked Confetti Cannons & Mechanical Easing Synchronization

**Files:**
- Modify: `src/client/confetti.ts`
- Modify: `src/client/confetti.test.ts`
- Modify: `src/client/roulette-motion.ts`
- Modify: `src/client/roulette-motion.test.ts`
- Modify: `src/client/raffle-controller.ts`

- [ ] **Step 1: Update confetti.ts and tests to support originEl flanks**
- [ ] **Step 2: Update roulette-motion.ts to use easeOutCubic for wheel & impact pulse**
- [ ] **Step 3: Connect originEl in raffle-controller.ts**
- [ ] **Step 4: Run full unit test suite (`bun run test:unit`) and check**
- [ ] **Step 5: Commit and Deploy**
