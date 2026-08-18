# Spec: Seamless Raffle Animation

## 1. Purpose
The frontend animation currently displays random lots during the "spinning" phase and then abruptly jumps to the final winning number when the animation finishes. This creates a jarring visual transition. The goal is to synchronize the central text animation with the physics of the wheel's rotation, so the text naturally and seamlessly lands on the final winner as the wheel slows down.

## 2. Approach: "Physics-Synced Pre-Rolled Sequence"
Instead of rendering the exact index of a lot array sequentially, we will pre-calculate a spin sequence matching the exact number of animation ticks the wheel will produce.

1. **Calculate Animation Ticks**:
   - The total rotation `targetAngle = currentRotation + 1440 + Math.random() * 360`.
   - The text updates every 45 degrees.
   - The total number of updates (ticks) during the spin is `T = Math.floor((targetAngle - currentRotation) / 45)`.

2. **Generate the Spin Sequence**:
   - Create an array `sequence` of size `T + 10` (the +10 accounts for the `easeOutElastic` bounce effect, ensuring we don't read out of bounds when the wheel overshoots before settling).
   - Fill indices `0` to `T - 1` with random active lots to simulate shuffling.
   - Set the crucial settling point `sequence[T] = winner`.
   - Fill all indices `> T` with `winner` as well, so if the wheel bounces past `T`, the text remains locked on the winner to avoid flickering.

3. **Animation Loop Update**:
   - The proxy object animates its angle.
   - Calculate current tick: `let index = Math.abs(Math.floor(proxy.angle / 45))`.
   - Update text: `readout.textContent = sequence[index] || winner`.

## 3. Component Details

### `src/client/roulette-motion.ts`
- **Modify `animateRoulette`**:
  - Keep the existing `easeOutElastic` wheel physics.
  - Before starting the animation, calculate `targetAngle`, the delta `deltaAngle = targetAngle - currentRotation`, and total ticks `totalTicks = Math.floor(deltaAngle / 45)`.
  - Build the `sequence` array:
    - Loop `i` from `0` to `totalTicks + 10`.
    - If `i < totalTicks`, select a random string from `activeLots`.
    - If `i >= totalTicks`, assign the `winner`.
  - In the `anime` `update` callback, map the current `proxy.angle / 45` to an index in the `sequence` array and display it.

## 4. Visual Assets
No changes to existing UI layouts, SVGs, or CSS required. The wheel remains unnumbered and acts purely as a dramatic prop.

## 5. Backward Compatibility
The `reducedMotion` flow remains unaffected (it skips the animation and jumps directly to the winner). No data models or backend logic need changing.
