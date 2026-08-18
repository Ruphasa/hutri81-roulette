# Design Spec: Hangus (Forfeit) UX Flow
Date: 2026-08-18

## 1. Overview
The user wants a mechanism to handle situations where a drawn winner is not present or disqualified ("Hangus"). The requirement is to discard the winner permanently from the pool, but NOT consume the current prize, allowing an immediate redraw for the same prize without requiring multiple manual clicks.

## 2. Architecture & Logic Changes

### `src/domain/types.ts`
- Add a new action to `RaffleAction`: `{ readonly type: 'FORFEIT' }`.

### `src/domain/raffle-machine.ts`
- Implement a `forfeit` function that transitions the state when `FORFEIT` is dispatched.
- **Constraints**:
  - Can only be called during the `winner` phase (when a pending winner has just been revealed).
  - Removes the last winner from `state.winners`.
  - Does NOT increment `state.prizeIndex`.
  - The `lotId` remains absent from `state.activeLots` (it is permanently discarded).
  - Transitions `state.phase` back to `idle`.

### `src/client/raffle-controller.ts`
- In `render()`:
  - When `currentUiPhase === 'REVEAL_WINNER'`:
    - Show `.advance-btn` ("LANJUT & PUTAR" - if merged into `.drawBtn` or as a separate button). We will keep `.drawBtn` as "LANJUT & PUTAR".
    - Show `.forfeitBtn` ("HANGUS & UNDI ULANG").
- In event listeners:
  - Add `handleForfeit()` which dispatches `FORFEIT` to the state machine, calls `saveAndRender()`, and immediately `await handleDraw()` to start the redraw.

## 3. UI/UX Changes

### `src/pages/index.astro`
- Add a secondary button inside `.bottom-right-controls` next to `.drawBtn`.
- `<button class="skew-btn-secondary" data-role="forfeit-button" hidden>HANGUS & UNDI ULANG</button>`
- Ensure it uses the secondary button style (outline) to avoid accidental clicks and establish visual hierarchy.

## 4. Error Handling & Invariants
- `assertStoredStateInvariants` must still hold true.
- Since `FORFEIT` modifies `winners` by removing the last entry but keeps `prizeIndex` the same, the invariant `state.winners.length === state.prizeIndex` (when in `idle` phase) will remain perfectly intact.

## 5. Scope & Status
- The scope is strictly limited to the Hangus flow. No other layout or visual changes will be made.
