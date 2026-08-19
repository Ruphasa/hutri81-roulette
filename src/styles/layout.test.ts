import { describe, it, expect } from 'vitest';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';

describe('Global Styles and Stage Mode 70/30 Layout', () => {
  // @ts-ignore
  const globalCssPath = path.resolve(process.cwd(), 'src/styles/global.css');
  // @ts-ignore
  const indexAstroPath = path.resolve(process.cwd(), 'src/pages/index.astro');

  it('defines custom properties in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('--color-crimson: #D92525;');
    expect(css).toContain('--color-cream: #F1E8D1;');
    expect(css).toContain('--color-black: #0F1012;');
    expect(css).toContain('--color-gold: #C19F48;');
    expect(css).toContain('--color-green: #1F7359;');
    expect(css).toContain('--color-white: #FFFFFF;');
    expect(css).toContain("--font-deco: 'Limelight', sans-serif;");
    expect(css).toContain("--font-heavy: 'Bowlby One SC', sans-serif;");
    expect(css).toContain("--font-condensed: 'Barlow Condensed', sans-serif;");
  });

  it('configures 16:9 stage-container styling in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*aspect-ratio:\s*16\s*\/\s*9;/);
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*max-width:\s*calc\(100vh\s*\*\s*\(16\s*\/\s*9\)\);/);
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*background:\s*(#0F1012|var\(--color-black\));/);
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*overflow:\s*hidden;/);
  });

  it('configures Stage Mode 70/30 split dimensions in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*background:\s*var\(--color-crimson\);/);
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*width:\s*70vw;/);
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*height:\s*100vh;/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*background:\s*var\(--color-cream\);/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*width:\s*30vw;/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*height:\s*100vh;/);
  });

  it('includes sunburst svg lines in .bg-cream-split in index.astro and global.css', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(astro).toContain('class="sunburst-svg"');
    expect(astro).toContain('<line');
    expect(css).toContain('.sunburst-svg');
  });

  it('configures ransom note typography, colors, and tilted blocks in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.ransom-title');
    expect(css).toMatch(/\.ransom-title\s*\{[\s\S]*position:\s*absolute;/);
    expect(css).toMatch(/\.ransom-title\s+\.word\s*\{[\s\S]*font-family:\s*var\(--font-heavy\);/);
    
    // Block 1: White text on Black bg, tilted left
    expect(css).toMatch(/\.block-1\s*\{[\s\S]*background:\s*var\(--color-black\);[\s\S]*color:\s*var\(--color-white\);[\s\S]*transform:\s*rotate\(-/);
    
    // Block 2: Black text on Gold bg, tilted right
    expect(css).toMatch(/\.block-2\s*\{[\s\S]*background:\s*var\(--color-gold\);[\s\S]*color:\s*var\(--color-black\);[\s\S]*transform:\s*rotate\([0-9]/);
    
    // Block 3: White text on Red bg, tilted left
    expect(css).toMatch(/\.block-3\s*\{[\s\S]*background:\s*var\(--color-crimson\);[\s\S]*color:\s*var\(--color-white\);[\s\S]*transform:\s*rotate\(-/);
  });

  it('configures top-left badge and secret reset diamond in global.css and index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');

    expect(astro).toContain('class="top-left-badge"');
    expect(astro).toContain('GRIYA SHANTA &middot; RT 08');
    expect(astro).toContain('class="top-left-diamond"');
    expect(astro).toContain('data-role="secret-reset"');

    expect(css).toContain('.top-left-badge');
    expect(css).toMatch(/\.top-left-badge\s*\{[\s\S]*background:\s*var\(--color-cream\);/);
    expect(css).toMatch(/\.top-left-badge\s*\{[\s\S]*color:\s*var\(--color-black\);/);
    expect(css).toMatch(/\.top-left-badge\s*\{[\s\S]*transform:\s*skewX\(-/);

    expect(css).toContain('.top-left-diamond');
    expect(css).toMatch(/\.top-left-diamond\s*\{[\s\S]*border:\s*2px\s+solid\s+var\(--color-gold\);/);
    expect(css).toMatch(/\.top-left-diamond\s*\{[\s\S]*transform:\s*rotate\(45deg\);/);
    expect(css).toMatch(/\.top-left-diamond\s*\{[\s\S]*cursor:\s*pointer;/);
    expect(css).toMatch(/\.top-left-diamond:hover\s*\{[\s\S]*filter:\s*drop-shadow/);
  });

  it('configures top-right stats badges and mute button in global.css and index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');

    expect(astro).toContain('class="top-right-stats"');
    expect(astro).toContain('class="stat-gold"');
    expect(astro).toContain('164 NOMOR TERSISA');
    expect(astro).toContain('class="stat-cream"');
    expect(astro).toContain('HADIAH 02/05');
    expect(astro).toContain('class="mute-toggle-btn"');
    expect(astro).toContain('data-role="mute-button"');

    expect(css).toContain('.top-right-stats');
    expect(css).toMatch(/\.stat-gold\s*\{[\s\S]*background:\s*var\(--color-gold\);/);
    expect(css).toMatch(/\.stat-gold\s*\{[\s\S]*color:\s*var\(--color-black\);/);
    expect(css).toContain('.stat-cream');
    expect(css).toContain('.mute-toggle-btn');
    expect(css).toMatch(/\.mute-toggle-btn\s*\{[\s\S]*cursor:\s*pointer;/);
  });

  it('configures middle-right text with highlight in global.css and index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');

    expect(astro).toContain('class="middle-right-text"');
    expect(astro).toContain('PUTAR RODA. TAHAN NAPAS.');
    expect(astro).toContain('class="highlight"');
    expect(astro).toContain('BIARKAN NASIB MEMILIH');
    expect(astro).toContain('NOMOR KAVLING MALAM INI.');

    expect(css).toContain('.middle-right-text');
    expect(css).toMatch(/\.middle-right-text\s+\.highlight\s*\{[\s\S]*background:\s*var\(--color-crimson\);/);
  });

  it('configures bottom-left tilted text with white underline in global.css and index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');

    expect(astro).toContain('class="bottom-left-text"');
    expect(astro).toContain('sekali putar, satu pemenang!');

    expect(css).toContain('.bottom-left-text');
    expect(css).toMatch(/\.bottom-left-text\s*\{[\s\S]*transform:\s*rotate\(-/);
    expect(css).toMatch(/\.bottom-left-text\s*\{[\s\S]*(border-bottom:\s*2px\s+solid\s+var\(--color-white\)|text-decoration:\s*underline)/);
  });

  it('configures bottom-right button trapezoid, subtext, and red diamond in global.css and index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');

    expect(astro).toContain('ENTER - MULAI UNDIAN');
    expect(astro).toContain('class="bottom-right-diamond"');

    expect(css).toContain('.skew-btn');
    expect(css).toContain('.bottom-right-diamond');
    expect(css).toMatch(/\.bottom-right-diamond\s*\{[\s\S]*border:\s*3px\s+solid\s+var\(--color-crimson\);/);
    expect(css).toMatch(/\.bottom-right-diamond\s*\{[\s\S]*transform:\s*rotate\(45deg\);/);
  });

  it('configures wheel wrapper, SVG wheel, center badge hero typography, and diamond pointer in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.wheel-wrapper');
    expect(css).toMatch(/\.wheel-wrapper\s*\{[\s\S]*width:\s*min\(65vw,\s*85vh\);/);
    expect(css).toContain('.wheel-svg');
    expect(css).toContain('.wheel-center-badge');
    expect(css).toMatch(/\.wheel-center-badge\s*\{[\s\S]*clip-path:\s*polygon\(/);
    expect(css).toMatch(/\.wheel-center-badge\s*\{[\s\S]*background:\s*var\(--color-cream\);/);
    expect(css).toContain('.badge-label');
    expect(css).toContain('.badge-value');
    expect(css).toMatch(/\.wheel-center-badge\s+\.badge-value\s*\{[\s\S]*font-size:\s*min\(8vw,\s*16vh\);/);
    expect(css).toContain('.badge-footer');
    expect(css).toMatch(/\.badge-footer\s*\{[\s\S]*background:\s*var\(--color-black\);/);
    expect(css).toMatch(/\.badge-footer\s*\{[\s\S]*color:\s*var\(--color-white\);/);
    expect(css).toMatch(/\.badge-footer\s*\{[\s\S]*transform:\s*skewX\(-/);
    expect(css).toContain('.diamond-pointer');
  });

  it('configures forfeit flash, confetti canvas, and grand finale overlay in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.forfeit-flash');
    expect(css).toMatch(/\.forfeit-flash\s*\{[\s\S]*position:\s*fixed;/);
    expect(css).toMatch(/\.forfeit-flash\s*\{[\s\S]*pointer-events:\s*none;/);

    expect(css).toContain('.confetti-canvas');
    expect(css).toMatch(/\.confetti-canvas\s*\{[\s\S]*position:\s*absolute;/);
    expect(css).toMatch(/\.confetti-canvas\s*\{[\s\S]*pointer-events:\s*none;/);

    expect(css).toContain('.finale-overlay');
    expect(css).toContain('.finale-title');
    expect(css).toContain('.finale-winners-list');
  });

  it('includes diagonal split elements inside .stage-container in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('class="stage-container"');
    expect(astro).toContain('class="bg-red-split"');
    expect(astro).toContain('class="bg-cream-split"');
  });

  it('includes ransom note header in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('class="ransom-title"');
    expect(astro).toContain('MALAM');
    expect(astro).toContain('UNDIAN');
    expect(astro).toContain('MERDEKA!');
    expect(astro).toContain('class="word block-1"');
    expect(astro).toContain('class="word block-2"');
    expect(astro).toContain('class="word block-3"');
  });

  it('includes SVG roulette wheel structure with 16 slices, concentric rings, winner badge, and pointer in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('class="wheel-wrapper"');
    expect(astro).toContain('data-role="wheel"');
    expect(astro).toContain('viewBox="0 0 500 500"');
    
    // Check 16 slice paths inside wheel-slices
    const pathMatches = astro.match(/<path[^>]+fill="var\(--color-(black|gold|crimson|green)\)"/g);
    expect(pathMatches).not.toBeNull();
    expect(pathMatches!.length).toBe(16);

    // Check concentric rings (gold and crimson)
    expect(astro).toContain('stroke="var(--color-crimson)"');
    expect(astro).toContain('stroke="var(--color-gold)"');

    // Check center badge and pointer
    expect(astro).toContain('class="wheel-center-badge"');
    expect(astro).toContain('NOMOR TERKUNCI');
    expect(astro).toContain('data-role="winner-display"');
    expect(astro).toContain('PEMENANG');
    expect(astro).toContain('class="diamond-pointer"');
  });

  it('includes control buttons, fx elements, and reset dialog with expected data-role attributes in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('data-role="spin-button"');
    expect(astro).toContain('data-role="forfeit-button"');
    expect(astro).toContain('data-role="reset-button"');
    expect(astro).toContain('data-role="secret-reset"');
    expect(astro).toContain('data-role="mute-button"');
    expect(astro).toContain('data-role="confetti-canvas"');
    expect(astro).toContain('data-role="forfeit-flash"');
    expect(astro).toContain('data-role="finale-overlay"');
    expect(astro).toContain('data-role="active-count"');
    expect(astro).toContain('data-role="prize-position"');
    expect(astro).toContain('data-role="reset-dialog"');
    expect(astro).toContain('data-role="reset-confirm"');
    expect(astro).toContain('data-role="reset-cancel"');
  });
});
