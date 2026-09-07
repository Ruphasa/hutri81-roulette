# Hangus UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Hangus & Undi Ulang" (Forfeit) feature to handle drawn winners who are absent/disqualified, allowing an immediate redraw for the same prize.

**Architecture:** We add a `FORFEIT` action to `raffle-machine.ts` that removes the pending/latest winner from the winners array without consuming the prize index, permanently discarding the lot. Then we expose this via a new button in `index.astro` and `raffle-controller.ts`.

**Tech Stack:** TypeScript, Astro, Vitest

## Global Constraints

- Must run offline (PWA)
- Existing data-roles must be preserved.
- No unrelated visual changes.

---

### Task 1: Domain Logic for FORFEIT

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/raffle-machine.ts`
- Modify: `src/domain/raffle-machine.test.ts`

**Interfaces:**
- Consumes: `RaffleState`, `Prize`
- Produces: `FORFEIT` action type, `forfeit()` transition handling

- [ ] **Step 1: Write the failing tests**

```typescript
// Append to src/domain/raffle-machine.test.ts

test('forfeits the current winner and does not increment prizeIndex', () => {
  const prizes = [{ id: '1', label: 'Hadiah 1' }, { id: '2', label: 'Hadiah 2' }];
  let state = createInitialState({ prizes, lotRanges: [] }, ['A1', 'A2', 'A3']);
  state = transition(state, { type: 'START_DRAW', lotId: 'A2', drawnAt: '2026-08-18' }, prizes);
  state = transition(state, { type: 'REVEAL_WINNER' }, prizes);
  
  expect(state.phase).toBe('winner');
  expect(state.winners.length).toBe(1);
  expect(state.prizeIndex).toBe(0);
  expect(state.activeLots).not.toContain('A2');
  
  state = transition(state, { type: 'FORFEIT' }, prizes);
  
  expect(state.phase).toBe('idle');
  expect(state.winners.length).toBe(0);
  expect(state.prizeIndex).toBe(0);
  expect(state.activeLots).not.toContain('A2'); // Permanently discarded
});

test('throws error if FORFEIT is called outside winner phase', () => {
  const prizes = [{ id: '1', label: 'Hadiah 1' }];
  let state = createInitialState({ prizes, lotRanges: [] }, ['A1']);
  
  expect(() => transition(state, { type: 'FORFEIT' }, prizes)).toThrowError('Hanya bisa hangus setelah pemenang muncul.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/domain/raffle-machine.test.ts`
Expected: FAIL with "Aksi pengundian tidak dikenal: FORFEIT"

- [ ] **Step 3: Write minimal implementation**

In `src/domain/types.ts`, add to `RaffleAction` type union:
```typescript
  | { readonly type: 'FORFEIT' }
```

In `src/domain/raffle-machine.ts`, add the `forfeit` function:
```typescript
function forfeit(state: RaffleState): RaffleState {
  if (state.phase !== 'winner') {
    throw new Error('Hanya bisa hangus setelah pemenang muncul.');
  }

  return freezeState(
    'idle',
    state.activeLots,
    state.winners.slice(0, -1),
    state.prizeIndex,
    null
  );
}
```

In `transition()` inside `src/domain/raffle-machine.ts`:
```typescript
    case 'FORFEIT':
      return forfeit(state);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/domain/raffle-machine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/raffle-machine.ts src/domain/raffle-machine.test.ts
git commit -m "feat: add FORFEIT action to raffle machine"
```

### Task 2: Controller and UI Integration

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/client/raffle-controller.ts`

**Interfaces:**
- Consumes: `FORFEIT` action
- Produces: UI behavior where "HANGUS & UNDI ULANG" cancels the winner and re-spins

- [ ] **Step 1: Add the Forfeit Button to Astro**

In `src/pages/index.astro`, inside `.bottom-right-controls`, below `.drawBtn` and above `.btn-subtext`:
```html
      <button class="skew-btn-secondary" data-role="forfeit-button" hidden>HANGUS & UNDI ULANG</button>
```

- [ ] **Step 2: Update Controller Logic**

In `src/client/raffle-controller.ts`, add `forfeitBtn` to `els`:
```typescript
    forfeitBtn: root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement | null,
```

In `render()`:
```typescript
        } else if (currentUiPhase === 'REVEAL_WINNER') {
          els.drawBtn.textContent = state.prizeIndex >= config.prizes.length - 1 ? 'LIHAT SEMUA PEMENANG' : 'LANJUT & PUTAR';
          els.drawBtn.disabled = false;
          els.drawBtn.hidden = false;
          if (els.forfeitBtn) {
            els.forfeitBtn.hidden = false;
            els.forfeitBtn.disabled = false;
          }
        } else if (currentUiPhase === 'COMPLETE') {
```
Also in `render()`, ensure `.forfeitBtn` is hidden in `IDLE`, `SPINNING`, `COMPLETE`, and `ERROR` phases. Find where `.drawBtn` properties are set in these phases, and hide `.forfeitBtn` there.
```typescript
        if (currentUiPhase === 'IDLE') {
          // ...
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        } else if (currentUiPhase === 'SPINNING') {
          // ...
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        } else if (currentUiPhase === 'COMPLETE') {
          // ...
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        }
```
And hide it in `ERROR` state at the top of `render()`:
```typescript
    // Error state
    if (currentUiPhase === 'ERROR') {
      // ...
      if (els.forfeitBtn) els.forfeitBtn.disabled = true;
      return;
    }
```

Add handler `handleForfeit`:
```typescript
  async function handleForfeit() {
    if (currentUiPhase !== 'REVEAL_WINNER') return;
    try {
      state = transition(state, { type: 'FORFEIT' }, config.prizes);
    } catch (e: any) {
      currentUiPhase = 'ERROR';
      errorMessage = e.message;
      render();
      return;
    }
    
    if (!saveAndRender()) return;
    
    // Automatically trigger next draw for the same prize
    if (currentUiPhase === 'IDLE') {
      await handleDraw();
    }
  }
```

Bind and unbind listener:
```typescript
  if (els.forfeitBtn) els.forfeitBtn.addEventListener('click', handleForfeit);
  
  // inside return cleanup function
  if (els.forfeitBtn) els.forfeitBtn.removeEventListener('click', handleForfeit);
```

- [ ] **Step 3: Run project check**

Run: `bun run check`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/client/raffle-controller.ts
git commit -m "feat: integrate forfeit button into UI and controller"
```
