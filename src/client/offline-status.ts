import { registerSW } from 'virtual:pwa-register';

export type OfflineState = 'unready' | 'ready' | 'update-available';

export const OFFLINE_MESSAGES: Record<OfflineState, string> = {
  unready: 'Belum Siap Offline',
  ready: 'Siap Offline',
  'update-available': 'Pembaruan Tersedia'
};

let isRegistered = false;

export interface PWARegistrationOptions {
  immediate?: boolean;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
}

/**
 * Registers the PWA service worker and dispatches custom browser events
 * for offline readiness and update availability.
 * Note: Never auto-reloads the page on update to protect in-progress raffle events.
 */
export function initPWARegistration(
  options: PWARegistrationOptions = {}
): ((reloadPage?: boolean) => Promise<void>) | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (!('serviceWorker' in navigator)) {
    return undefined;
  }

  if (isRegistered) {
    return undefined;
  }
  isRegistered = true;

  try {
    return registerSW({
      immediate: options.immediate ?? true,
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('offline-ready'));
        options.onOfflineReady?.();
      },
      onNeedRefresh() {
        // Dispatch event without auto-reloading to avoid disrupting a live raffle
        window.dispatchEvent(new CustomEvent('offline-update-available'));
        options.onNeedRefresh?.();
      }
    });
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return undefined;
  }
}

export function getInitialOfflineState(
  nav: { serviceWorker?: { controller?: unknown } } = typeof navigator !== 'undefined' ? navigator : {}
): OfflineState {
  if (nav.serviceWorker?.controller) {
    return 'ready';
  }
  return 'unready';
}

/**
 * Binds an OfflineStatus DOM container element to service worker lifecycle events.
 */
export function bindOfflineStatus(rootElement: HTMLElement): () => void {
  const textElement =
    rootElement.querySelector<HTMLElement>('[data-role="offline-status-text"]') || rootElement;

  function updateStatus(state: OfflineState) {
    rootElement.setAttribute('data-state', state);
    textElement.textContent = OFFLINE_MESSAGES[state];
  }

  // Determine initial state
  const initialState = getInitialOfflineState();
  updateStatus(initialState);

  const handleOfflineReady = () => {
    updateStatus('ready');
  };

  const handleUpdateAvailable = () => {
    updateStatus('update-available');
  };

  const handleNetworkChange = () => {
    if (navigator.serviceWorker?.controller) {
      updateStatus('ready');
    }
  };

  window.addEventListener('offline-ready', handleOfflineReady);
  window.addEventListener('offline-update-available', handleUpdateAvailable);
  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);

  return () => {
    window.removeEventListener('offline-ready', handleOfflineReady);
    window.removeEventListener('offline-update-available', handleUpdateAvailable);
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
  };
}

export function _resetRegistrationForTesting() {
  isRegistered = false;
}
