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
    expect(css).toContain('--color-crimson: #E02626;');
    expect(css).toContain('--color-cream: #EBE5D3;');
    expect(css).toContain('--color-black: #0D0D0D;');
    expect(css).toContain('--color-gold: #F2C94C;');
    expect(css).toContain("--font-deco: 'Limelight', sans-serif;");
    expect(css).toContain("--font-heavy: 'Bowlby One SC', sans-serif;");
    expect(css).toContain("--font-condensed: 'Barlow Condensed', sans-serif;");
  });

  it('configures 16:9 stage-container styling in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*aspect-ratio:\s*16\s*\/\s*9;/);
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*max-width:\s*calc\(100vh\s*\*\s*\(16\s*\/\s*9\)\);/);
    expect(css).toMatch(/\.stage-container\s*\{[\s\S]*overflow:\s*hidden;/);
  });

  it('configures diagonal split background classes in global.css', () => {
    const css = fs.readFileSync(globalCssPath, 'utf-8');
    expect(css).toMatch(/\.bg-red-split\s*\{[\s\S]*clip-path:\s*polygon\(0\s+0,\s*100%\s+0,\s*80%\s+100%,\s*0\s+100%\);/);
    expect(css).toMatch(/\.bg-cream-split\s*\{[\s\S]*clip-path:\s*polygon\(20%\s+0,\s*100%\s+0,\s*100%\s+100%,\s*0\s+100%\);/);
  });

  it('includes diagonal split elements inside .stage-container in index.astro', () => {
    const astro = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(astro).toContain('class="stage-container"');
    expect(astro).toContain('<div class="bg-red-split"></div>');
    expect(astro).toContain('<div class="bg-cream-split"></div>');
  });
});
