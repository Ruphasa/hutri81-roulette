import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

// Mock virtual:pwa-register
let capturedOptions: RegisterSWOptions | undefined;
const mockUpdateSW = vi.fn().mockResolvedValue(undefined);

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((opts?: RegisterSWOptions) => {
    capturedOptions = opts;
    return mockUpdateSW;
  })
}));

import {
  initPWARegistration,
  getInitialOfflineState,
  bindOfflineStatus,
  OFFLINE_MESSAGES,
  _resetRegistrationForTesting
} from './offline-status';

describe('offline-status client module', () => {
  beforeEach(() => {
    capturedOptions = undefined;
    mockUpdateSW.mockClear();
    _resetRegistrationForTesting();
    document.body.innerHTML = '';

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: null,
        register: vi.fn()
      },
      configurable: true,
      writable: true
    });
  });

  describe('initPWARegistration', () => {
    it('registers service worker with default immediate flag', () => {
      const updateFn = initPWARegistration();
      expect(updateFn).toBe(mockUpdateSW);
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions?.immediate).toBe(true);
    });

    it('dispatches offline-ready event on onOfflineReady callback', () => {
      const onOfflineReadyCallback = vi.fn();
      const readyListener = vi.fn();
      window.addEventListener('offline-ready', readyListener);

      initPWARegistration({ onOfflineReady: onOfflineReadyCallback });
      capturedOptions?.onOfflineReady?.();

      expect(readyListener).toHaveBeenCalledTimes(1);
      expect(onOfflineReadyCallback).toHaveBeenCalledTimes(1);

      window.removeEventListener('offline-ready', readyListener);
    });

    it('dispatches offline-update-available event on onNeedRefresh callback without auto-reloading', () => {
      const onNeedRefreshCallback = vi.fn();
      const updateListener = vi.fn();
      window.addEventListener('offline-update-available', updateListener);

      initPWARegistration({ onNeedRefresh: onNeedRefreshCallback });
      capturedOptions?.onNeedRefresh?.();

      expect(updateListener).toHaveBeenCalledTimes(1);
      expect(onNeedRefreshCallback).toHaveBeenCalledTimes(1);
      // Ensure updateSW was not automatically called to reload page
      expect(mockUpdateSW).not.toHaveBeenCalled();

      window.removeEventListener('offline-update-available', updateListener);
    });

    it('is idempotent and ignores secondary registration calls', () => {
      const first = initPWARegistration();
      const second = initPWARegistration();

      expect(first).toBe(mockUpdateSW);
      expect(second).toBeUndefined();
    });

    it('returns undefined when navigator has no serviceWorker support', () => {
      // @ts-expect-error simulating legacy browser without SW
      delete navigator.serviceWorker;
      const res = initPWARegistration();
      expect(res).toBeUndefined();
    });
  });

  describe('getInitialOfflineState', () => {
    it('returns unready when no controller is present', () => {
      expect(getInitialOfflineState({ serviceWorker: { controller: null } })).toBe('unready');
    });

    it('returns ready when controller is present', () => {
      expect(getInitialOfflineState({ serviceWorker: { controller: {} } })).toBe('ready');
    });
  });

  describe('bindOfflineStatus DOM binding', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.setAttribute('data-role', 'offline-status');
      container.innerHTML = '<span data-role="offline-status-text">Initial</span>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('initializes with unready state when no controller', () => {
      const unbind = bindOfflineStatus(container);
      const textEl = container.querySelector('[data-role="offline-status-text"]');

      expect(container.getAttribute('data-state')).toBe('unready');
      expect(textEl?.textContent).toBe(OFFLINE_MESSAGES.unready);
      unbind();
    });

    it('updates text and data-state when offline-ready event fires', () => {
      const unbind = bindOfflineStatus(container);
      const textEl = container.querySelector('[data-role="offline-status-text"]');

      window.dispatchEvent(new CustomEvent('offline-ready'));

      expect(container.getAttribute('data-state')).toBe('ready');
      expect(textEl?.textContent).toBe('Siap Offline');
      unbind();
    });

    it('updates text and data-state when offline-update-available event fires', () => {
      const unbind = bindOfflineStatus(container);
      const textEl = container.querySelector('[data-role="offline-status-text"]');

      window.dispatchEvent(new CustomEvent('offline-update-available'));

      expect(container.getAttribute('data-state')).toBe('update-available');
      expect(textEl?.textContent).toBe('Pembaruan Tersedia');
      unbind();
    });

    it('cleans up event listeners when unbound', () => {
      const unbind = bindOfflineStatus(container);
      const textEl = container.querySelector('[data-role="offline-status-text"]');

      unbind();

      window.dispatchEvent(new CustomEvent('offline-ready'));
      expect(textEl?.textContent).toBe(OFFLINE_MESSAGES.unready);
    });
  });
});
