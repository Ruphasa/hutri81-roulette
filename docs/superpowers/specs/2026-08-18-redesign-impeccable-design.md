# HUT RI 81 Roulette - Impeccable Redesign Spec

## 1. Thesis
A complete visual overhaul to transform the application into a theatrical, offline-first 16:9 presentation. It refuses the generic, safe, full-screen dashboard aesthetic. Instead, it fully commits to a Persona 5-inspired casino punk/Art Deco world. The application will be merged into a single page.

## 2. Own-World
- **Colors:** Deep Crimson (`#E02626`), Cream/Beige (`#EBE5D3`), Solid Black (`#0D0D0D`), and Gold accents.
- **Typography:**
  - `Limelight` (Art Deco) for status headers and elegant labels.
  - `Bowlby One SC` (Heavy block) for the main winning number.
  - `Barlow Condensed` for supporting copy.
- **Shapes:** Diagonal splits using `clip-path`, skewed rectangles, layered "ransom note" overlapping text blocks, and sharp diamond pointers.

## 3. Architecture & Layout
- **Single Page App:** The existing `/draw` and `/` pages will be merged into a single `src/pages/index.astro`.
- **16:9 Container:** The entire UI will be wrapped in a container forced to a `16 / 9` aspect ratio, centered in the viewport with a black background (letterboxing), ensuring pixel-perfect projector display.
- **Background Split:** A stark diagonal division (Red on the left, Black on the right, Cream polygon overlay on the right-center).

## 4. Components & Motion
- **The Roulette Wheel (SVG + Anime.js):**
  - Hand-crafted SVG ensuring maximum sharpness.
  - Features an outer Art Deco ring, alternating colored slices, and a static center badge.
  - Motion is driven by `anime.js` for precise, dramatic easing (fast initial spin, high-tension slow down, elastic bounce at the stop).
- **The Center Badge:**
  - A cream-colored ticket shape fixed in the center.
  - Displays "NOMOR TERKUNCI" and the active winning number.
  - Animate using `anime.js` scale and opacity for the reveal moment.
- **Ransom Note Title:**
  - "MALAM UNDIAN MERDEKA" text constructed from skewed `span` elements with harsh solid drop shadows.
- **Controls:**
  - The "PUTAR SEKARANG" button is a red skewed parallelogram at the bottom right.

## 5. Development Strategy (Working in Existing Codebase)
- Replace existing Astro pages with the unified `index.astro`.
- Refactor `RaffleState` (domain logic) minimally, solely to bind it to the new `anime.js` animation lifecycle.
- Update `package.json` to include `animejs` as a dependency.
- Extract styling into `src/styles/global.css` using modern CSS variables for the color palette.
