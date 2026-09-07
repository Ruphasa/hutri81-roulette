# Seamless Raffle Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the frontend roulette animation to pre-roll a sequence of random lots that accurately ends on the winner, ensuring physics-synced seamless visual text changes without abruptly swapping the final string.

**Architecture:** We will modify `src/client/roulette-motion.ts` to calculate the final `targetAngle`, derive `totalTicks` (how many 45-degree chunks the angle spans), and construct an array where `sequence[totalTicks]` is strictly the winner. The `anime` update loop will render `sequence[tick]`.

**Tech Stack:** TypeScript, animejs

## Global Constraints

- Must run offline (PWA)
- Existing data-roles must be preserved.
- No unrelated visual changes.

---

### Task 1: Implement Pre-Rolled Sequence Animation

**Files:**
- Modify: `src/client/roulette-motion.ts:35-65`
- Test: `src/client/roulette-motion.test.ts`

**Interfaces:**
- Consumes: `RouletteMotionOptions`
- Produces: Seamlessly updated `readout.textContent` ending on `winner`.

- [ ] **Step 1: Baseline Verification**

Since this is a visual refactor that doesn't change API signatures, verify existing tests pass as a baseline.
Run: `bunx vitest run src/client/roulette-motion.test.ts`
Expected: PASS

- [ ] **Step 2: Write minimal implementation**

Modify `src/client/roulette-motion.ts`. Replace the proxy update block:

```typescript
        const targetAngle = currentRotation + 1440 + (Math.random() * 360);
        
        let proxy = { angle: 0 };
        let lastIndex = -1;
        
        const deltaAngle = targetAngle - currentRotation;
        const totalTicks = Math.floor(deltaAngle / 45);
        const sequence: string[] = [];
        
        // Build pre-rolled sequence
        for (let i = 0; i <= totalTicks + 20; i++) {
          if (i >= totalTicks) {
            sequence.push(winner);
          } else {
            sequence.push(activeLots[Math.floor(Math.random() * activeLots.length)]);
          }
        }
        
        // We run a parallel proxy animation with the exact same easing and duration
        // to sync the text randomization speed with the wheel's physical momentum.
        if (activeLots.length > 0 && readout) {
          anime({
            targets: proxy,
            angle: deltaAngle,
            duration: duration,
            easing: 'easeOutElastic(1, .8)',
            update: () => {
              // The text updates every 45 "degrees" of momentum.
              // As the wheel slows down and bounces, the text will naturally follow.
              let tick = Math.max(0, Math.floor(proxy.angle / 45));
              if (tick !== lastIndex) {
                readout.textContent = sequence[tick] ?? winner;
                lastIndex = tick;
              }
            }
          });
        }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bunx vitest run src/client/roulette-motion.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/roulette-motion.ts
git commit -m "feat: implement physics-synced pre-rolled animation sequence"
```
