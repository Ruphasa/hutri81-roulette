# Two-Round Raffle System & Impeccable UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dynamic two-round raffle system (Round 1: Unlimited Small Prizes, Round 2: Exactly 3 Main Prizes: Karpet -> Magicom -> Kipas Angin with automatic pool reset on transition), true 100% fullscreen layout without black sidebars, and safe operator controls on the Grand Finale overlay.

**Architecture:**
- `types.ts`, `event.ts`, `raffle-machine.ts`: Domain state machine supporting `round: 'small' | 'main'`, dynamic small prize counting, 3 fixed main prizes (`MAIN_PRIZES = ['Karpet', 'Magicom', 'Kipas Angin']`), and `SWITCH_TO_MAIN_ROUND` action that restores `fullPool`.
- `persistence.ts`: Versioned envelope state persistence ensuring crash recovery preserves round status and winners.
- `global.css`, `index.astro`: True fullscreen 100% viewport container without letterboxing (70% left arena, 30% right panel), Intermission modal, and Grand Finale overlay with round-grouped winner recap and operator restart controls.
- `raffle-controller.ts`: Orchestrates audio, poppers, round transitions, pool resets, and overlay interactions.

**Tech Stack:** TypeScript, Astro, CSS Variables, Anime.js, Web Audio API, Vitest.

## Global Constraints

- Must run 100% offline without external network or remote CDN asset dependencies.
- Main prizes order is strictly: 1. Karpet, 2. Magicom, 3. Kipas Angin.
- Existing test data-roles (`data-role="wheel"`, `data-role="spin-button"`, `data-role="winner-display"`, `data-role="forfeit-button"`, `data-role="active-count"`, `data-role="prize-position"`, `data-role="reset-button"`, `data-role="reset-dialog"`, `data-role="reset-confirm"`, `data-role="reset-cancel"`, `data-role="winner-history"`, `data-role="error"`, `data-role="confetti-canvas"`, `data-role="forfeit-flash"`, `data-role="mute-button"`, `data-role="finale-overlay"`) must remain intact.
- State persistence in `localStorage` must survive browser refreshes.

---

### Task 1: Domain State Machine & Types for Two-Round System

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/config/event.ts`
- Modify: `src/domain/raffle-machine.ts`
- Modify: `src/lib/persistence.ts`
- Test: `src/domain/raffle-machine.test.ts`
- Test: `src/lib/persistence.test.ts`

**Interfaces & Types:**
```typescript
export type RaffleRound = 'small' | 'main';

export interface WinnerRecord {
  readonly lotId: string;
  readonly prizeId: string;
  readonly prizeLabel: string;
  readonly round: RaffleRound;
  readonly drawnAt: string;
}

export interface RaffleState {
  readonly phase: 'idle' | 'spinning' | 'winner' | 'complete';
  readonly round: RaffleRound;
  readonly activeLots: readonly string[];
  readonly winners: readonly WinnerRecord[];
  readonly smallPrizeCount: number;
  readonly mainPrizeIndex: number;
  readonly pendingWinner: WinnerRecord | null;
}

export type RaffleAction =
  | { readonly type: 'START_DRAW'; readonly lotId: string; readonly drawnAt: string }
  | { readonly type: 'REVEAL_WINNER' }
  | { readonly type: 'ADVANCE' }
  | { readonly type: 'FORFEIT' }
  | { readonly type: 'SWITCH_TO_MAIN_ROUND'; readonly fullPool: readonly string[] }
  | { readonly type: 'RESET'; readonly fullPool: readonly string[] };

export const MAIN_PRIZES: readonly Prize[] = [
  { id: 'main-karpet', label: 'Karpet' },
  { id: 'main-magicom', label: 'Magicom' },
  { id: 'main-kipas', label: 'Kipas Angin' },
];
```

- [ ] **Step 1: Write failing tests in raffle-machine.test.ts**

Add tests to `src/domain/raffle-machine.test.ts`:
```typescript
it('handles small prize draw and dynamic count progression', () => {
  let state = createInitialState(EVENT_CONFIG, ['L101', 'L102', 'L103']);
  expect(state.round).toBe('small');
  expect(state.smallPrizeCount).toBe(0);

  state = transition(state, { type: 'START_DRAW', lotId: 'L101', drawnAt: '2026-08-19' }, MAIN_PRIZES);
  expect(state.pendingWinner?.prizeLabel).toBe('Hadiah Hiburan #1');
  expect(state.pendingWinner?.round).toBe('small');

  state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
  expect(state.winners).toHaveLength(1);
  expect(state.smallPrizeCount).toBe(1);

  state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
  expect(state.phase).toBe('idle');
  expect(state.round).toBe('small');
});

it('switches to main round, resets activeLots to fullPool, and sequences 3 main prizes strictly', () => {
  let state = createInitialState(EVENT_CONFIG, ['L101', 'L102', 'L103']);
  state = transition(state, { type: 'START_DRAW', lotId: 'L101', drawnAt: '2026-08-19' }, MAIN_PRIZES);
  state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
  state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);

  // Switch to main round with full pool reset
  state = transition(state, { type: 'SWITCH_TO_MAIN_ROUND', fullPool: ['L101', 'L102', 'L103'] }, MAIN_PRIZES);
  expect(state.round).toBe('main');
  expect(state.activeLots).toEqual(['L101', 'L102', 'L103']);
  expect(state.mainPrizeIndex).toBe(0);

  // Main Prize 1: Karpet
  state = transition(state, { type: 'START_DRAW', lotId: 'L101', drawnAt: '2026-08-19' }, MAIN_PRIZES);
  expect(state.pendingWinner?.prizeLabel).toBe('Karpet');
  state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
  state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
  expect(state.mainPrizeIndex).toBe(1);

  // Main Prize 2: Magicom
  state = transition(state, { type: 'START_DRAW', lotId: 'L102', drawnAt: '2026-08-19' }, MAIN_PRIZES);
  expect(state.pendingWinner?.prizeLabel).toBe('Magicom');
  state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
  state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
  expect(state.mainPrizeIndex).toBe(2);

  // Main Prize 3: Kipas Angin
  state = transition(state, { type: 'START_DRAW', lotId: 'L103', drawnAt: '2026-08-19' }, MAIN_PRIZES);
  expect(state.pendingWinner?.prizeLabel).toBe('Kipas Angin');
  state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
  state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
  expect(state.phase).toBe('complete');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/domain/raffle-machine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update types.ts, config/event.ts, raffle-machine.ts, and persistence.ts**

Update `src/domain/types.ts`:
- Add `RaffleRound = 'small' | 'main'`.
- Update `WinnerRecord`, `RaffleState`, `RaffleAction`.

Update `src/config/event.ts`:
- Export `MAIN_PRIZES`:
  ```typescript
  export const MAIN_PRIZES: readonly Prize[] = [
    { id: 'main-karpet', label: 'Karpet' },
    { id: 'main-magicom', label: 'Magicom' },
    { id: 'main-kipas', label: 'Kipas Angin' },
  ];
  ```

Update `src/domain/raffle-machine.ts`:
- Handle `round: 'small'` vs `round: 'main'` in state freezing, draw starting, advancing, forfeiting, and `SWITCH_TO_MAIN_ROUND`.

Update `src/lib/persistence.ts`:
- Serialize and restore `round`, `smallPrizeCount`, and `mainPrizeIndex`.

- [ ] **Step 4: Run domain & persistence unit tests**

Run: `bunx vitest run src/domain/raffle-machine.test.ts src/lib/persistence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/config/event.ts src/domain/raffle-machine.ts src/lib/persistence.ts src/domain/raffle-machine.test.ts src/lib/persistence.test.ts
git commit -m "feat: implement two-round raffle domain logic and state machine"
```

---

### Task 2: True Fullscreen 100% Layout & UI Overhaul

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Modify: `src/styles/layout.test.ts`

**UI Overhaul Requirements:**
1. **Fullscreen Layout:**
   - Remove `max-width: calc(100vh * (16 / 9))` on `.stage-container`.
   - Set `.stage-container` to `width: 100vw; height: 100vh; overflow: hidden;`.
   - Set `.bg-red-split` to `width: 70%;` and `.bg-cream-split` to `width: 30%;`.
2. **Round Badge:**
   - Add `<div class="round-badge" data-role="round-badge">BABAK HADIAH HIBURAN</div>` in the header.
   - Dynamic class for `round-main` with shimmering gold styling.
3. **Round Switch CTA:**
   - Add `<button type="button" class="switch-round-btn" data-role="switch-round-button" hidden>🏆 SELESAIKAN HIBURAN & KE HADIAH UTAMA</button>`.
4. **Intermission Modal Dialog:**
   - Add `<dialog data-role="intermission-dialog" class="intermission-dialog">...<button data-role="start-main-round-btn">🔥 MULAI BABAK HADIAH UTAMA</button></dialog>`.
5. **Grand Finale Overlay & Operator Controls:**
   - Two column layout: Small Prize Winners (`data-role="finale-small-winners"`) and Main Prize Winners (`data-role="finale-main-winners"`).
   - Operator Action Buttons in Finale:
     - `<button class="skew-btn-secondary" data-role="finale-reset-btn">🔄 RESET SELURUH ACARA</button>`
     - `<button class="skew-btn" data-role="finale-close-btn">👁️ TUTUP OVERLAY</button>`

- [ ] **Step 1: Write test in layout.test.ts**

Update `src/styles/layout.test.ts` to test:
- Fullscreen dimensions (`100vw` / `100vh` without `max-width`).
- Presence of `data-role="round-badge"`, `data-role="switch-round-button"`, `data-role="intermission-dialog"`, `data-role="finale-small-winners"`, `data-role="finale-main-winners"`, `data-role="finale-reset-btn"`, `data-role="finale-close-btn"`.

- [ ] **Step 2: Update src/styles/global.css and src/pages/index.astro**

Implement the CSS styles and Astro template markup.

- [ ] **Step 3: Run astro check and layout tests**

Run: `bun run check && bunx vitest run src/styles/layout.test.ts`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/pages/index.astro src/styles/layout.test.ts
git commit -m "style: implement true fullscreen 100% layout and two-round stage UI"
```

---

### Task 3: Controller Integration for Two-Round Flow & Intermission

**Files:**
- Modify: `src/client/raffle-controller.ts`
- Modify: `src/client/raffle-controller.test.ts`

**Choreography Details:**
1. **Rendering by Round:**
   - If `state.round === 'small'`:
     - Round badge displays `BABAK HADIAH HIBURAN`.
     - Prize title displays `HADIAH HIBURAN #(state.smallPrizeCount + 1)`.
     - `switchRoundBtn` is visible during `IDLE` or `REVEAL_WINNER`.
   - If `state.round === 'main'`:
     - Round badge displays `BABAK HADIAH UTAMA` (adds `gold` class).
     - Prize title displays `HADIAH UTAMA #(state.mainPrizeIndex + 1): ${MAIN_PRIZES[state.mainPrizeIndex].label}`.
     - `switchRoundBtn` is hidden.
2. **Switching Round Interaction:**
   - Clicking `switchRoundBtn`:
     - Opens `intermissionDialog` showing recap of all small prize winners.
   - Clicking `startMainRoundBtn` inside dialog:
     - Dispatches `SWITCH_TO_MAIN_ROUND` with `fullPool`.
     - Closes intermission dialog.
     - Plays fanfare / celebratory sound.
     - Updates UI to Round 2 (Karpet).
3. **Grand Finale Operator Controls:**
   - In `COMPLETE` phase, populates small prize winners and main prize winners in separate sections.
   - Clicking `finaleResetBtn`: opens `resetDialog` for safe reset confirmation.
   - Clicking `finaleCloseBtn`: hides `finaleOverlay` allowing operator to view the stage.

- [ ] **Step 1: Write integration tests in raffle-controller.test.ts**

Add comprehensive test cases in `src/client/raffle-controller.test.ts`:
- Round badge & prize label updates during small prize draws.
- Switch round button opens intermission modal and renders small winners.
- Confirming intermission resets active lots and transitions to Round 2 with Karpet.
- Sequencing Karpet -> Magicom -> Kipas Angin -> Grand Finale.
- Finale Reset and Finale Close button interactions.

- [ ] **Step 2: Implement controller integration in raffle-controller.ts**

Update `mountRaffleApp` to wire up two-round state machine, intermission dialog, round-switching, and finale overlay controls.

- [ ] **Step 3: Run all unit tests and check**

Run: `bun run test:unit && bun run check`
Expected: PASS (100% tests passing, 0 type errors).

- [ ] **Step 4: Commit and Push**

```bash
git add src/client/raffle-controller.ts src/client/raffle-controller.test.ts
git commit -m "feat: complete two-round raffle controller choreography and finale controls"
```
