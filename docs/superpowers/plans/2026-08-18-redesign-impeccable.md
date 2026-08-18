# Impeccable UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the UI into a single-page, 16:9 pixel-perfect, Persona 5 casino punk/Art Deco aesthetic using SVG and anime.js, while maintaining existing PWA and offline behavior.

**Architecture:** We will replace the current simple DOM with a heavily stylized CSS clip-path layout. The wheel will become a dynamic SVG rotated by `anime.js`. The state logic (`RaffleState`) remains identical, but the DOM controller (`raffle-controller.ts`) will be updated to trigger `anime.js` instead of CSS transitions. Existing `data-role` selectors must be preserved for E2E tests.

**Tech Stack:** Astro, Vanilla CSS, TypeScript, `animejs`.

## Global Constraints

- Must run offline (PWA).
- Must preserve existing data-roles for Playwright tests (`data-role="wheel"`, `data-role="spin-button"`, `data-role="winner-display"`, `data-role="status-message"`).
- Exact 16:9 container aspect ratio.
- Colors: Deep Crimson `#E02626`, Cream `#EBE5D3`, Solid Black `#0D0D0D`, Gold accents.
- Fonts: `Limelight`, `Bowlby One SC`, `Barlow Condensed`.

---

### Task 1: Setup Dependencies & Unify Page

**Files:**
- Modify: `package.json`
- Modify: `src/pages/index.astro`
- Delete: `src/pages/draw/index.astro`

**Interfaces:**
- Consumes: N/A
- Produces: A unified single-page route at `/`.

- [ ] **Step 1: Install `animejs` and its types**
```bash
bun add animejs
bun add -d @types/animejs
```

- [ ] **Step 2: Remove old draw page**
```bash
rm src/pages/draw/index.astro
```

- [ ] **Step 3: Scaffold Unified `index.astro`**
```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Malam Undian Merdeka">
  <div class="stage-container" data-role="stage">
    <!-- UI goes here -->
  </div>
  <script src="../client/raffle-controller.ts"></script>
</Layout>
```

- [ ] **Step 4: Commit**
```bash
git add package.json bun.lockb src/pages/index.astro src/pages/draw/index.astro
git commit -m "chore: setup single page architecture and add animejs"
```

### Task 2: Implement Global Styles & 16:9 Layout

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: N/A
- Produces: CSS variables and the diagonal split layout.

- [ ] **Step 1: Define Custom Properties in global.css**
Update `:root` in `global.css`:
```css
:root {
  --color-crimson: #E02626;
  --color-cream: #EBE5D3;
  --color-black: #0D0D0D;
  --color-gold: #F2C94C;
  --font-deco: 'Limelight', sans-serif;
  --font-heavy: 'Bowlby One SC', sans-serif;
  --font-condensed: 'Barlow Condensed', sans-serif;
}
body { background: #000; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
```

- [ ] **Step 2: Create 16:9 Stage Container**
```css
.stage-container {
  position: relative;
  width: 100vw;
  max-width: calc(100vh * (16 / 9));
  aspect-ratio: 16 / 9;
  background: var(--color-black);
  overflow: hidden;
}
```

- [ ] **Step 3: Implement Diagonal Split**
Add to `index.astro` inside `.stage-container`:
```html
<div class="bg-red-split"></div>
<div class="bg-cream-split"></div>
```
Add to `global.css`:
```css
.bg-red-split {
  position: absolute; top: 0; left: 0; width: 60%; height: 100%;
  background: var(--color-crimson);
  clip-path: polygon(0 0, 100% 0, 80% 100%, 0 100%);
  z-index: 1;
}
.bg-cream-split {
  position: absolute; top: 0; right: 0; width: 50%; height: 100%;
  background: var(--color-cream);
  clip-path: polygon(20% 0, 100% 0, 100% 100%, 0 100%);
  z-index: 2;
}
```

- [ ] **Step 4: Commit**
```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "style: implement 16:9 aspect ratio and diagonal split background"
```

### Task 3: SVG Roulette Wheel & Ransom Note Typography

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: The `bg-red-split` layout.
- Produces: The SVG wheel node `[data-role="wheel"]` and Ransom Note Header.

- [ ] **Step 1: Add Ransom Note Title**
Add inside `.bg-cream-split`:
```html
<div class="ransom-title">
  <span class="word block-1">MALAM</span>
  <span class="word block-2">UNDIAN</span>
  <span class="word block-3">MERDEKA!</span>
</div>
```
Add CSS:
```css
.ransom-title { position: absolute; top: 20%; right: 10%; display: flex; flex-direction: column; align-items: flex-end; z-index: 5; }
.ransom-title .word {
  font-family: var(--font-heavy); font-size: 4vw; padding: 0.2em 0.5em;
  box-shadow: 8px 8px 0px rgba(0,0,0,0.8); margin-bottom: -10px;
}
.block-1 { background: var(--color-black); color: var(--color-cream); transform: rotate(-2deg); }
.block-2 { background: var(--color-gold); color: var(--color-black); transform: rotate(3deg); }
.block-3 { background: var(--color-crimson); color: var(--color-cream); transform: rotate(-4deg); }
```

- [ ] **Step 2: Add SVG Wheel Structure**
Add inside `.bg-red-split` (centered):
```html
<div class="wheel-wrapper">
  <svg class="wheel-svg" viewBox="0 0 500 500" data-role="wheel">
    <circle cx="250" cy="250" r="240" fill="var(--color-black)" stroke="var(--color-gold)" stroke-width="10"/>
    <!-- Outer ring Deco layer -->
    <path d="M 250 10 A 240 240 0 0 1 490 250 L 250 250 Z" fill="var(--color-crimson)"/>
    <path d="M 490 250 A 240 240 0 0 1 250 490 L 250 250 Z" fill="#117964"/>
    <path d="M 250 490 A 240 240 0 0 1 10 250 L 250 250 Z" fill="var(--color-gold)"/>
    <path d="M 10 250 A 240 240 0 0 1 250 10 L 250 250 Z" fill="var(--color-black)"/>
  </svg>
  
  <div class="wheel-center-badge">
    <div class="badge-label">NOMOR TERKUNCI</div>
    <div class="badge-value" data-role="winner-display">???</div>
    <div class="badge-footer">PEMENANG</div>
  </div>
  <div class="diamond-pointer"></div>
</div>
```

- [ ] **Step 3: Style the Wheel & Badge**
```css
.wheel-wrapper { position: absolute; left: 10%; top: 50%; transform: translateY(-50%); width: 60vh; height: 60vh; z-index: 4; }
.wheel-svg { width: 100%; height: 100%; }
.wheel-center-badge {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: var(--color-cream); border: 4px solid var(--color-gold);
  border-radius: 12px; padding: 10px 20px; text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 5;
}
.badge-label, .badge-footer { font-family: var(--font-condensed); font-weight: 700; color: var(--color-black); font-size: 1.5vh; letter-spacing: 2px;}
.badge-value { font-family: var(--font-heavy); font-size: 6vh; color: var(--color-crimson); line-height: 1; margin: 5px 0;}
.diamond-pointer {
  position: absolute; top: -20px; left: 50%; transform: translateX(-50%) rotate(45deg);
  width: 40px; height: 40px; background: var(--color-cream);
  border: 4px solid var(--color-black); z-index: 6;
}
```

- [ ] **Step 4: Add Controls and Status**
Add under `.bg-cream-split`:
```html
<div class="status-bar" data-role="status-message">SIAP OFFLINE</div>
<button class="skew-btn" data-role="spin-button">PUTAR SEKARANG</button>
<button class="skew-btn-secondary" data-role="reset-button">RESET</button>
```
```css
.skew-btn { position: absolute; bottom: 10%; right: 5%; background: var(--color-crimson); color: white; border: none; padding: 15px 40px; font-family: var(--font-heavy); font-size: 2vw; transform: skewX(-15deg); cursor: pointer; z-index: 6; box-shadow: 5px 5px 0 #000; }
.skew-btn-secondary { position: absolute; bottom: 2%; right: 5%; background: var(--color-black); color: white; border: none; padding: 5px 20px; font-family: var(--font-condensed); transform: skewX(-15deg); cursor: pointer; z-index: 6; }
.status-bar { position: absolute; top: 5%; left: 5%; font-family: var(--font-deco); color: var(--color-black); background: var(--color-cream); padding: 5px 15px; border: 2px solid #000; z-index: 6; font-size: 1.5vw; }
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/index.astro src/styles/global.css
git commit -m "feat: implement SVG wheel, ransom note, and skewed buttons"
```

### Task 4: Connect Anime.js to Controller

**Files:**
- Modify: `src/client/raffle-controller.ts`

**Interfaces:**
- Consumes: The `data-role="wheel"` element.
- Produces: Precise rotation logic using `anime.js` instead of CSS transitions.

- [ ] **Step 1: Import Anime.js and update spin animation**
In `raffle-controller.ts`, import anime:
```typescript
import anime from 'animejs';
```
Find the rotation logic inside `handleStateChange` (specifically `case 'SPINNING':` and `case 'DONE':`).
Instead of `wheelEl.style.transform = ...` and CSS transitions, use anime:

```typescript
// Replace CSS transition logic with anime.js
let currentRotation = 0; // Keep track globally in file or class

// When state is SPINNING
if (newState.status === 'SPINNING') {
  anime({
    targets: wheelEl,
    rotate: currentRotation + 1080 + Math.random() * 360, // Spin fast indefinitely
    duration: 5000,
    easing: 'easeInQuad',
    update: function(anim) {
      currentRotation = parseFloat(anim.animations[0].currentValue);
    }
  });
}

// When state is DONE
if (newState.status === 'DONE') {
  anime.remove(wheelEl);
  const targetAngle = currentRotation + 1440 + (Math.random() * 360); // 4 extra spins + random slice
  anime({
    targets: wheelEl,
    rotate: targetAngle,
    duration: 4000,
    easing: 'easeOutElastic(1, .8)', // Dramatic Persona 5 bounce
    complete: () => {
      currentRotation = targetAngle;
    }
  });
  
  // Animate the badge value pop
  anime({
    targets: winnerDisplay,
    scale: [0, 1.2, 1],
    opacity: [0, 1],
    duration: 800,
    easing: 'easeOutElastic(1, .5)',
    delay: 4000 // wait for wheel to stop
  });
}
```

- [ ] **Step 2: Ensure E2E Tests Pass**
Run `bun run test:e2e`. Since we preserved the `data-role` selectors, the offline flow and draw lifecycle should still work.
If tests fail because anime.js animation takes longer, adjust the Playwright timeouts or mock the animations in test mode.

- [ ] **Step 3: Commit**
```bash
git add src/client/raffle-controller.ts
git commit -m "feat: integrate anime.js for theatrical wheel animation"
```
