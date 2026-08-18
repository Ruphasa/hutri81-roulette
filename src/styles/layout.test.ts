import { describe, it, expect } from 'vitest';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';

describe('Global Styles and 16:9 Layout', () => {
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

  it('configures diagonal split background classes in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*background:\s*var\(--color-crimson\);/);
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*clip-path:\s*polygon\(0\s+0,\s*53%\s+0,\s*48%\s+100%,\s*0\s+100%\);/);
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*width:\s*100%;/);
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*height:\s*100%;/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*background:\s*var\(--color-cream\);/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*clip-path:\s*polygon\(70%\s+0,\s*100%\s+0,\s*100%\s+80%,\s*55%\s+100%\);/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*width:\s*100%;/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*height:\s*100%;/);
  });

  it('includes sunburst svg lines in .bg-cream-split in index.astro and global.css', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(astro).toContain('class="sunburst-svg"');
    expect(astro).toContain('<line');
    expect(css).toContain('.sunburst-svg');
  });

  it('configures ransom note typography and skewed blocks in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.ransom-title');
    expect(css).toMatch(/\.ransom-title\s*\{[\s\S]*position:\s*absolute;/);
    expect(css).toMatch(/\.ransom-title\s+\.word\s*\{[\s\S]*font-family:\s*var\(--font-heavy\);/);
    expect(css).toContain('.block-1');
    expect(css).toContain('.block-2');
    expect(css).toContain('.block-3');
  });

  it('configures wheel wrapper, SVG wheel, center badge, and diamond pointer in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.wheel-wrapper');
    expect(css).toContain('.wheel-svg');
    expect(css).toContain('.wheel-center-badge');
    expect(css).toContain('.badge-label');
    expect(css).toContain('.badge-value');
    expect(css).toContain('.badge-footer');
    expect(css).toContain('.diamond-pointer');
  });

  it('configures skewed control buttons and status bar in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toContain('.skew-btn');
    expect(css).toContain('.skew-btn-secondary');
    expect(css).toContain('.status-bar');
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

  it('includes SVG roulette wheel structure, winner badge, and pointer in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('class="wheel-wrapper"');
    expect(astro).toContain('data-role="wheel"');
    expect(astro).toContain('viewBox="0 0 500 500"');
    expect(astro).toContain('class="wheel-center-badge"');
    expect(astro).toContain('data-role="winner-display"');
    expect(astro).toContain('class="diamond-pointer"');
  });

  it('includes control buttons and status bar with expected data-role attributes in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('data-role="status-message"');
    expect(astro).toContain('data-role="spin-button"');
    expect(astro).toContain('data-role="reset-button"');
    expect(astro).toContain('PUTAR SEKARANG');
    expect(astro).toContain('RESET');
    expect(astro).toContain('SIAP OFFLINE');
  });
});
