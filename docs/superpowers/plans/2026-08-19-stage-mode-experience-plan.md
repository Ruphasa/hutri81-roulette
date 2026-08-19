# Stage Mode Experience & Enhanced Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the roulette app into a high-visibility, TV/projector-ready "Stage Mode" experience featuring 70/30 split layout, giant hero numbers, 7-second suspenseful spin timing, confetti popper particles, 100% offline Web Audio sound effects, secret diamond reset, and full event flow (Standby -> Reveal -> Finale).

**Architecture:** 
- `sound-effects.ts`: Synthesized Web Audio API sound generator (ticking, lock impact, fanfare, forfeit dissonance) with localStorage mute persistence.
- `confetti.ts`: Native HTML5 canvas party popper / confetti physics engine with Red/White/Gold/Green palette.
- `roulette-motion.ts`: Extended 7000ms decelerating monotonic spin with physical wheel elastic bounce and tick callbacks.
- `global.css` & `index.astro`: 70vw / 30vw stage layout, hero typography scaling (>=25vh), hidden diamond trigger, red flash vignette, and grand finale celebration overlay.
- `raffle-controller.ts`: State machine choreography connecting audio, particles, secret reset, and UI flow.

**Tech Stack:** TypeScript, Astro, CSS (Variables + Skew transforms), Anime.js, Web Audio API, Canvas 2D.

## Global Constraints

- Must run 100% offline without external network or remote CDN asset dependencies.
- Existing test data-roles (`data-role="wheel"`, `data-role="spin-button"`, `data-role="winner-display"`, `data-role="forfeit-button"`, `data-role="active-count"`, `data-role="prize-position"`) must remain intact.
- State persistence in `localStorage` must survive browser refreshes.

---

### Task 1: Offline Web Audio Engine

**Files:**
- Create: `src/client/sound-effects.ts`
- Test: `src/client/sound-effects.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface SoundEngine {
    playTick(rate?: number): void;
    playLockImpact(): void;
    playFanfare(): void;
    playForfeit(): void;
    toggleMute(): boolean;
    isMuted(): boolean;
    setMuted(muted: boolean): void;
  }
  export function createSoundEngine(storage?: Pick<Storage, 'getItem' | 'setItem'>): SoundEngine;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/client/sound-effects.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSoundEngine } from './sound-effects';

describe('SoundEngine', () => {
  let mockStorage: Record<string, string>;
  let storage: Pick<Storage, 'getItem' | 'setItem'>;

  beforeEach(() => {
    mockStorage = {};
    storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; }
    };
  });

  it('initializes with unmuted by default and persists mute toggle', () => {
    const engine = createSoundEngine(storage);
    expect(engine.isMuted()).toBe(false);

    const nowMuted = engine.toggleMute();
    expect(nowMuted).toBe(true);
    expect(engine.isMuted()).toBe(true);
    expect(storage.getItem('raffle_muted')).toBe('true');

    const nowUnmuted = engine.toggleMute();
    expect(nowUnmuted).toBe(false);
    expect(engine.isMuted()).toBe(false);
  });

  it('safely triggers sound methods without throwing even if AudioContext is mocked or absent', () => {
    const engine = createSoundEngine(storage);
    expect(() => {
      engine.playTick(1.0);
      engine.playLockImpact();
      engine.playFanfare();
      engine.playForfeit();
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/client/sound-effects.test.ts`
Expected: FAIL (module `sound-effects` not found).

- [ ] **Step 3: Implement sound-effects.ts**

Create `src/client/sound-effects.ts`:
```typescript
export interface SoundEngine {
  playTick(rate?: number): void;
  playLockImpact(): void;
  playFanfare(): void;
  playForfeit(): void;
  toggleMute(): boolean;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
}

export function createSoundEngine(
  storage: Pick<Storage, 'getItem' | 'setItem'> = typeof localStorage !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => {} }
): SoundEngine {
  let muted = storage.getItem('raffle_muted') === 'true';
  let ctx: AudioContext | null = null;

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq: number, type: OscillatorType, duration: number, startGain = 0.15, endGain = 0.001) {
    if (muted) return;
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), now + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio play failure ignored in restricted environments
    }
  }

  return {
    isMuted(): boolean {
      return muted;
    },
    setMuted(value: boolean): void {
      muted = value;
      storage.setItem('raffle_muted', String(muted));
    },
    toggleMute(): boolean {
      muted = !muted;
      storage.setItem('raffle_muted', String(muted));
      return muted;
    },
    playTick(rate = 1.0): void {
      const freq = 600 + Math.min(rate * 200, 600);
      playTone(freq, 'triangle', 0.04, 0.1, 0.001);
    },
    playLockImpact(): void {
      if (muted) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        
        // Deep bass thud
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // High metallic ping
        const ping = audioCtx.createOscillator();
        const pingGain = audioCtx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(880, now);
        pingGain.gain.setValueAtTime(0.2, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        ping.connect(pingGain);
        pingGain.connect(audioCtx.destination);
        ping.start(now);
        ping.stop(now + 0.3);
      } catch {
        // Safe catch
      }
    },
    playFanfare(): void {
      if (muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        setTimeout(() => {
          playTone(freq, 'square', 0.25, 0.12, 0.001);
        }, index * 90);
      });
    },
    playForfeit(): void {
      if (muted) return;
      // Dissonant buzz down
      playTone(220, 'sawtooth', 0.35, 0.25, 0.01);
      setTimeout(() => {
        playTone(180, 'sawtooth', 0.4, 0.25, 0.01);
      }, 80);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/client/sound-effects.test.ts`
Expected: PASS (2/2 passing).

- [ ] **Step 5: Commit**

```bash
git add src/client/sound-effects.ts src/client/sound-effects.test.ts
git commit -m "feat: add synthesized offline Web Audio engine"
```

---

### Task 2: Confetti Popper Particle System

**Files:**
- Create: `src/client/confetti.ts`
- Test: `src/client/confetti.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ConfettiManager {
    fire(options?: { count?: number }): void;
    stop(): void;
  }
  export function createConfetti(canvas: HTMLCanvasElement): ConfettiManager;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/client/confetti.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfetti } from './confetti';

describe('ConfettiManager', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    // Mock getContext for jsdom
    canvas.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    });
  });

  it('initializes and triggers confetti particle animation without error', () => {
    const confetti = createConfetti(canvas);
    expect(() => confetti.fire({ count: 50 })).not.toThrow();
    expect(() => confetti.stop()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/client/confetti.test.ts`
Expected: FAIL (module `confetti` not found).

- [ ] **Step 3: Implement confetti.ts**

Create `src/client/confetti.ts`:
```typescript
export interface ConfettiManager {
  fire(options?: { count?: number }): void;
  stop(): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  opacity: number;
}

const COLORS = [
  '#dc2626', // Crimson Red
  '#ffffff', // Pure White
  '#facc15', // Vibrant Gold
  '#10b981', // Emerald Green
  '#ef4444', // Red-500
];

export function createConfetti(canvas: HTMLCanvasElement): ConfettiManager {
  let ctx = canvas.getContext('2d');
  let particles: Particle[] = [];
  let animId: number | null = null;

  function resize() {
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }

  function loop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.vRot;
      p.opacity -= 0.008;

      if (p.opacity <= 0 || p.y > canvas.height + 50) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      ctx.restore();
    }

    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      animId = null;
    }
  }

  return {
    fire(options = { count: 80 }): void {
      resize();
      const count = options.count ?? 80;
      
      // Spawn two bursts: left and right
      for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        particles.push({
          x: fromLeft ? canvas.width * 0.2 : canvas.width * 0.8,
          y: canvas.height * 0.85,
          vx: (fromLeft ? 1 : -1) * (Math.random() * 12 + 4) + (Math.random() - 0.5) * 6,
          vy: -(Math.random() * 16 + 10),
          size: Math.random() * 10 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] || '#facc15',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
          opacity: 1.0,
        });
      }

      if (!animId) {
        animId = requestAnimationFrame(loop);
      }
    },
    stop(): void {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      particles = [];
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/client/confetti.test.ts`
Expected: PASS (1/1 passing).

- [ ] **Step 5: Commit**

```bash
git add src/client/confetti.ts src/client/confetti.test.ts
git commit -m "feat: add confetti party popper canvas particle system"
```

---

### Task 3: Extended Suspense Timing & Motion Refinement

**Files:**
- Modify: `src/client/roulette-motion.ts`
- Test: `src/client/roulette-motion.test.ts`

**Interfaces:**
- Consumes: `options.onTick?: (rate: number) => void`
- Produces: 7000ms default suspense duration, monotonic easeOutCubic text loop, tick trigger for sound.

- [ ] **Step 1: Write the updated test in roulette-motion.test.ts**

Update `src/client/roulette-motion.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { animateRoulette, getCurrentRotation, resetCurrentRotation } from './roulette-motion';

describe('animateRoulette', () => {
  let wheel: HTMLElement;
  let readout: HTMLElement;
  
  beforeEach(() => {
    resetCurrentRotation();
    wheel = document.createElement('div');
    readout = document.createElement('div');
  });

  it('cycles through pool and triggers onTick callback for sounds', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    const winner = 'A2';
    const onTick = vi.fn();
    
    await animateRoulette({
      wheel,
      readout,
      activeLots,
      winner,
      reducedMotion: false,
      durationMs: 50,
      onTick
    });
    
    expect(readout.textContent).toBe(winner);
    expect(getCurrentRotation()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Update roulette-motion.ts**

Modify `src/client/roulette-motion.ts`:
- Extend `RouletteMotionOptions` with `readonly onTick?: ((rate: number) => void) | undefined;`.
- Change default `durationMs` to `7000`.
- Trigger `options.onTick?.(Math.min(1.0, (deltaAngle - proxy.angle) / deltaAngle))` inside the proxy update callback whenever tick changes.

- [ ] **Step 3: Run test to verify it passes**

Run: `bunx vitest run src/client/roulette-motion.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/client/roulette-motion.ts src/client/roulette-motion.test.ts
git commit -m "feat: extend roulette duration to 7s suspense timing with audio tick callbacks"
```

---

### Task 4: Stage Mode Layout, CSS & Secret Reset Trigger

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Visual Requirements:**
- Layout: 70vw arena on left (huge wheel), 30vw control panel on right.
- Typography: Center readout `font-size: min(8vw, 16vh)`.
- Confetti canvas layer positioned over the stage.
- `.top-left-diamond` styled with pointer cursor and subtle hover glow as the secret operator reset trigger.
- Fullscreen `.flash-overlay` for forfeit animation.
- Mute button styling in `.top-right-stats`.
- Grand Finale modal container for `COMPLETE` phase.

- [ ] **Step 1: Update src/styles/global.css**

Add and refine styles:
```css
/* Stage Mode 70/30 Dimensions */
.bg-red-split {
  position: absolute;
  top: 0;
  left: 0;
  width: 70vw;
  height: 100vh;
  background: var(--color-crimson);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.wheel-wrapper {
  position: relative;
  width: min(65vw, 85vh);
  height: min(65vw, 85vh);
  display: flex;
  justify-content: center;
  align-items: center;
}

.wheel-center-badge .badge-value {
  font-family: var(--font-heavy);
  font-size: min(8vw, 16vh);
  color: var(--color-white);
  line-height: 1;
  letter-spacing: -1px;
}

/* Secret Reset Diamond */
.top-left-diamond {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}
.top-left-diamond:hover {
  transform: rotate(45deg) scale(1.2);
  filter: drop-shadow(0 0 8px var(--color-gold));
}

/* Red Flash Vignette for Forfeit */
.forfeit-flash {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle, transparent 30%, rgba(220, 38, 38, 0.8) 100%);
  pointer-events: none;
  z-index: 99;
  opacity: 0;
  transition: opacity 0.15s ease-out;
}
.forfeit-flash.active {
  opacity: 1;
}

/* Audio Mute Button */
.mute-toggle-btn {
  background: var(--color-black);
  color: var(--color-gold);
  border: 2px solid var(--color-gold);
  padding: 4px 10px;
  font-family: var(--font-condensed);
  font-weight: bold;
  font-size: 0.9vw;
  cursor: pointer;
  transform: skew(-6deg);
  transition: filter 0.2s;
}
.mute-toggle-btn:hover {
  filter: brightness(1.2);
}

/* Confetti Canvas */
.confetti-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}
```

- [ ] **Step 2: Update src/pages/index.astro**

Insert:
- `<canvas class="confetti-canvas" data-role="confetti-canvas"></canvas>` inside `.stage-container`.
- `<div class="forfeit-flash" data-role="forfeit-flash"></div>`
- `<button type="button" class="mute-toggle-btn" data-role="mute-button" title="Toggle Suara (M)">🔊 SUARA AKTIF</button>` in `.top-right-stats`.
- Connect `.top-left-diamond` with tooltip or accessible role for secret reset.
- Add Grand Finale template container `data-role="finale-overlay"`.

- [ ] **Step 3: Run astro check**

Run: `bun run check`
Expected: PASS (0 errors).

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "style: implement Stage Mode 70/30 layout, giant typography, and fx layers"
```

---

### Task 5: Controller Integration, Flow States & Polish

**Files:**
- Modify: `src/client/raffle-controller.ts`
- Modify: `src/client/raffle-controller.test.ts`

**Integration:**
- Bind `createSoundEngine` and `createConfetti`.
- Bind `.top-left-diamond` click to trigger `resetDialog.showModal()`.
- Keyboard shortcuts: `Enter` for draw/advance, `KeyM` for mute toggle.
- On `REVEAL_WINNER`: trigger `confetti.fire()`, `sound.playLockImpact()`, `sound.playFanfare()`.
- On `FORFEIT`: flash `.forfeit-flash`, trigger `sound.playForfeit()`, immediate auto-spin draw.
- On `COMPLETE`: show Grand Finale recap overlay with Dirgahayu RT 08 greeting.

- [ ] **Step 1: Write integration tests in raffle-controller.test.ts**

Add tests checking:
- Secret diamond click opens reset modal.
- Mute toggle updates button label and engine state.
- Keyboard 'M' toggles mute.

- [ ] **Step 2: Implement controller integration in raffle-controller.ts**

Update `mountRaffleApp` to wire up `soundEngine`, `confettiManager`, diamond reset handler, and state listeners.

- [ ] **Step 3: Run full test suite and check**

Run: `bun test` and `bun run check`
Expected: PASS (all tests green).

- [ ] **Step 4: Commit and Push**

```bash
git add src/client/raffle-controller.ts src/client/raffle-controller.test.ts
git commit -m "feat: integrate Stage Mode choreography, audio engine, confetti, and secret reset"
```
