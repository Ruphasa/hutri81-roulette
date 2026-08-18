import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DOM Contract for Raffle Controller', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-raffle-app>
        <div data-role="wheel"></div>
        <div data-role="center-value"></div>
        <div data-role="active-count"></div>
        <div data-role="prize-position"></div>
        <button data-role="draw"></button>
        <button data-role="advance"></button>
        <button data-role="reset"></button>
        <dialog data-role="reset-dialog">
          <button data-role="reset-confirm"></button>
        </dialog>
        <div data-role="winner-history"></div>
        <div data-role="error"></div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('contains all required data-role hooks in the fixture', () => {
    const root = document.querySelector('[data-raffle-app]');
    expect(root).not.toBeNull();
    
    const requiredRoles = [
      'wheel',
      'center-value',
      'active-count',
      'prize-position',
      'draw',
      'advance',
      'reset',
      'reset-dialog',
      'reset-confirm',
      'winner-history',
      'error'
    ];

    for (const role of requiredRoles) {
      const el = root?.querySelector(`[data-role="${role}"]`);
      expect(el, `Expected to find data-role="${role}"`).not.toBeNull();
    }
  });
});
