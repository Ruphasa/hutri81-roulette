import anime from 'animejs';
import { createInitialState, transition } from '../domain/raffle-machine';
import { generateLots } from '../domain/lot-generation';
import { loadRaffleState, saveRaffleState, clearRaffleState } from '../lib/persistence';
import type { EventConfig, RaffleState } from '../domain/types';
import { EVENT_CONFIG } from '../config/event';
import { selectWinner as defaultSelectWinner } from '../domain/random-selection';
import { animateRoulette as defaultAnimateRoulette, resetCurrentRotation } from './roulette-motion';

export interface ControllerDependencies {
  readonly config?: EventConfig | undefined;
  readonly selectWinner?: ((activeLots: readonly string[]) => string) | undefined;
  readonly animateRoulette?: ((options: any) => Promise<void>) | undefined;
  readonly storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined;
  readonly now?: (() => string) | undefined;
  readonly reducedMotion?: (() => boolean) | undefined;
}

export function mountRaffleApp(root: HTMLElement, deps?: ControllerDependencies | undefined): () => void {
  const config = deps?.config || EVENT_CONFIG;
  const selectWinner = deps?.selectWinner || defaultSelectWinner;
  const animateRoulette = deps?.animateRoulette || defaultAnimateRoulette;
  const storage = deps?.storage || window.localStorage;
  const now = deps?.now || (() => new Date().toISOString());
  const reducedMotion = deps?.reducedMotion || (() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const els = {
    wheel: (root.querySelector('[data-role="wheel"]') || root.querySelector('.wheel-svg')) as HTMLElement | null,
    centerValue: (root.querySelector('[data-role="winner-display"]') || root.querySelector('[data-role="center-value"]')) as HTMLElement | null,
    activeCount: root.querySelector('[data-role="active-count"]') as HTMLElement | null,
    prizePosition: root.querySelector('[data-role="prize-position"]') as HTMLElement | null,
    drawBtn: (root.querySelector('[data-role="spin-button"]') || root.querySelector('[data-role="draw"]')) as HTMLButtonElement | null,
    forfeitBtn: root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement | null,
    advanceBtn: root.querySelector('[data-role="advance"]') as HTMLButtonElement | null,
    resetBtn: (root.querySelector('[data-role="reset-button"]') || root.querySelector('[data-role="reset"]')) as HTMLButtonElement | null,
    resetDialog: root.querySelector('[data-role="reset-dialog"]') as HTMLDialogElement | null,
    resetCancelBtn: root.querySelector('[data-role="reset-cancel"]') as HTMLButtonElement | null,
    resetConfirmBtn: root.querySelector('[data-role="reset-confirm"]') as HTMLButtonElement | null,
    winnerHistory: root.querySelector('[data-role="winner-history"]') as HTMLElement | null,
    errorPanel: root.querySelector('[data-role="error"]') as HTMLElement | null,
  };

  const fullPool = generateLots(config.lotRanges);
  let state: RaffleState;
  let currentUiPhase: 'IDLE' | 'SPINNING' | 'REVEAL_WINNER' | 'ERROR' | 'COMPLETE' = 'IDLE';
  let errorMessage = '';
  
  const loadRes = loadRaffleState(storage, config);
  if (loadRes.status === 'restored') {
    state = loadRes.state;
  } else {
    state = createInitialState(config, fullPool);
    if (loadRes.status === 'incompatible') {
      currentUiPhase = 'ERROR';
      errorMessage = loadRes.reason;
    }
  }

  function updatePhase() {
    if (currentUiPhase === 'ERROR') return;
    switch (state.phase) {
      case 'idle': currentUiPhase = 'IDLE'; break;
      case 'spinning': currentUiPhase = 'SPINNING'; break;
      case 'winner': currentUiPhase = 'REVEAL_WINNER'; break;
      case 'complete': currentUiPhase = 'COMPLETE'; break;
    }
  }

  function render() {
    root.setAttribute('data-phase', currentUiPhase);
    root.setAttribute('aria-busy', String(currentUiPhase === 'SPINNING'));
    
    // Error state
    if (currentUiPhase === 'ERROR') {
      if (els.errorPanel) {
        els.errorPanel.textContent = errorMessage;
        els.errorPanel.hidden = false;
      }
      if (els.drawBtn) els.drawBtn.disabled = true;
      if (els.forfeitBtn) els.forfeitBtn.disabled = true;
      if (els.advanceBtn) els.advanceBtn.disabled = true;
      if (els.resetBtn) els.resetBtn.disabled = true;
      return;
    } else {
      if (els.errorPanel) {
        els.errorPanel.hidden = true;
        els.errorPanel.textContent = '';
      }
    }

    // Active count
    if (els.activeCount) {
      els.activeCount.textContent = state.activeLots.length.toString();
    }

    // Prize Position
    if (els.prizePosition && state.prizeIndex < config.prizes.length) {
      const p = config.prizes[state.prizeIndex];
      els.prizePosition.textContent = p?.label || '';
    }

    // Buttons
    if (els.drawBtn) {
      if (els.advanceBtn) {
        els.drawBtn.disabled = currentUiPhase !== 'IDLE';
        els.drawBtn.hidden = currentUiPhase === 'REVEAL_WINNER' || currentUiPhase === 'COMPLETE';
        if (els.forfeitBtn) {
          els.forfeitBtn.hidden = currentUiPhase !== 'REVEAL_WINNER';
          els.forfeitBtn.disabled = currentUiPhase !== 'REVEAL_WINNER';
        }
      } else {
        if (currentUiPhase === 'IDLE') {
          els.drawBtn.textContent = 'PUTAR SEKARANG';
          els.drawBtn.disabled = false;
          els.drawBtn.hidden = false;
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        } else if (currentUiPhase === 'SPINNING') {
          els.drawBtn.textContent = 'MEMUTAR...';
          els.drawBtn.disabled = true;
          els.drawBtn.hidden = false;
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        } else if (currentUiPhase === 'REVEAL_WINNER') {
          els.drawBtn.textContent = state.prizeIndex >= config.prizes.length - 1 ? 'LIHAT SEMUA PEMENANG' : 'LANJUT & PUTAR';
          els.drawBtn.disabled = false;
          els.drawBtn.hidden = false;
          if (els.forfeitBtn) {
            els.forfeitBtn.hidden = false;
            els.forfeitBtn.disabled = false;
          }
        } else if (currentUiPhase === 'COMPLETE') {
          els.drawBtn.textContent = 'SEMUA PEMENANG SELESAI';
          els.drawBtn.disabled = true;
          els.drawBtn.hidden = false;
          if (els.forfeitBtn) els.forfeitBtn.hidden = true;
        }
      }
    }

    if (els.advanceBtn) {
      els.advanceBtn.disabled = currentUiPhase !== 'REVEAL_WINNER';
      els.advanceBtn.hidden = currentUiPhase !== 'REVEAL_WINNER' && currentUiPhase !== 'COMPLETE';
      els.advanceBtn.textContent = state.prizeIndex >= config.prizes.length - 1 ? 'Lihat Semua Pemenang' : 'Lanjut Hadiah Berikutnya';
    }

    if (els.resetBtn) {
      els.resetBtn.disabled = currentUiPhase === 'SPINNING';
    }

    // Winner readout
    if (els.centerValue) {
      if (currentUiPhase === 'REVEAL_WINNER' && state.winners.length > 0) {
        els.centerValue.textContent = state.winners[state.winners.length - 1]?.lotId || '';
      } else if (currentUiPhase === 'IDLE' || currentUiPhase === 'COMPLETE') {
        if (state.winners.length === 0) {
          els.centerValue.textContent = els.centerValue.getAttribute('data-role') === 'center-value' ? '' : '???';
        }
      }
    }
    
    // History
    if (els.winnerHistory) {
      els.winnerHistory.replaceChildren();
      for (const w of [...state.winners].reverse()) {
        const d = document.createElement('div');
        d.textContent = `${w.lotId} - ${w.prizeLabel}`;
        els.winnerHistory.appendChild(d);
      }
    }
  }

  function saveAndRender(): boolean {
    const res = saveRaffleState(storage, config, state);
    if (res.status === 'failed') {
      currentUiPhase = 'ERROR';
      errorMessage = res.reason;
      render();
      return false;
    }
    updatePhase();
    render();
    return true;
  }

  async function handleDraw() {
    if (currentUiPhase !== 'IDLE') return;

    const winner = selectWinner(state.activeLots);
    try {
      state = transition(state, { type: 'START_DRAW', lotId: winner, drawnAt: now() }, config.prizes);
    } catch (e: any) {
      currentUiPhase = 'ERROR';
      errorMessage = e.message;
      render();
      return;
    }

    if (!saveAndRender()) return;

    await animateRoulette({
      wheel: els.wheel,
      readout: els.centerValue,
      activeLots: state.activeLots,
      fullPool: fullPool,
      winner: winner,
      reducedMotion: reducedMotion()
    });

    try {
      state = transition(state, { type: 'REVEAL_WINNER' }, config.prizes);
    } catch (e: any) {
      currentUiPhase = 'ERROR';
      errorMessage = e.message;
      render();
      return;
    }
    
    saveAndRender();
  }

  function handleAdvance() {
    if (currentUiPhase !== 'REVEAL_WINNER') return;
    try {
      state = transition(state, { type: 'ADVANCE' }, config.prizes);
      saveAndRender();
    } catch (e: any) {
      currentUiPhase = 'ERROR';
      errorMessage = e.message;
      render();
    }
  }

  async function handleForfeit() {
    if (currentUiPhase !== 'REVEAL_WINNER') return;
    try {
      state = transition(state, { type: 'FORFEIT' }, config.prizes);
    } catch (e: any) {
      currentUiPhase = 'ERROR';
      errorMessage = e.message;
      render();
      return;
    }
    
    if (!saveAndRender()) return;
    
    // Automatically trigger next draw for the same prize
    if ((currentUiPhase as string) === 'IDLE') {
      await handleDraw();
    }
  }

  async function handleMainClick() {
    if (currentUiPhase === 'IDLE') {
      await handleDraw();
    } else if (currentUiPhase === 'REVEAL_WINNER' && !els.advanceBtn) {
      handleAdvance();
      if ((currentUiPhase as string) === 'IDLE') {
        await handleDraw();
      }
    }
  }

  function handleResetClick() {
    if (els.resetDialog && typeof els.resetDialog.showModal === 'function') {
      els.resetDialog.showModal();
    } else {
      handleResetConfirm();
    }
  }

  function handleResetCancel() {
    if (els.resetDialog && typeof els.resetDialog.close === 'function') {
      els.resetDialog.close();
    }
  }

  function handleResetConfirm() {
    if (els.resetDialog && typeof els.resetDialog.close === 'function') {
      els.resetDialog.close();
    }
    clearRaffleState(storage);
    state = createInitialState(config, fullPool);
    currentUiPhase = 'IDLE';
    if (els.wheel) {
      anime.remove(els.wheel);
      els.wheel.style.transform = 'rotate(0deg)';
    }
    if (els.centerValue) {
      anime.remove(els.centerValue);
      els.centerValue.style.transform = '';
      els.centerValue.style.opacity = '';
    }
    resetCurrentRotation();
    render();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (els.resetDialog && els.resetDialog.open) return;
    if (e.key === 'Enter') {
      if (currentUiPhase === 'IDLE') {
        handleDraw();
      } else if (currentUiPhase === 'REVEAL_WINNER') {
        handleAdvance();
      }
    }
  }

  if (els.drawBtn) {
    if (els.advanceBtn) {
      els.drawBtn.addEventListener('click', handleDraw);
      els.advanceBtn.addEventListener('click', handleAdvance);
    } else {
      els.drawBtn.addEventListener('click', handleMainClick);
    }
  }
  if (els.forfeitBtn) els.forfeitBtn.addEventListener('click', handleForfeit);
  if (els.resetBtn) els.resetBtn.addEventListener('click', handleResetClick);
  if (els.resetCancelBtn) els.resetCancelBtn.addEventListener('click', handleResetCancel);
  if (els.resetConfirmBtn) els.resetConfirmBtn.addEventListener('click', handleResetConfirm);
  document.addEventListener('keydown', handleKeyDown);

  updatePhase();
  render();

  return () => {
    if (els.drawBtn) {
      if (els.advanceBtn) {
        els.drawBtn.removeEventListener('click', handleDraw);
        els.advanceBtn.removeEventListener('click', handleAdvance);
      } else {
        els.drawBtn.removeEventListener('click', handleMainClick);
      }
    }
    if (els.forfeitBtn) els.forfeitBtn.removeEventListener('click', handleForfeit);
    if (els.resetBtn) els.resetBtn.removeEventListener('click', handleResetClick);
    if (els.resetCancelBtn) els.resetCancelBtn.removeEventListener('click', handleResetCancel);
    if (els.resetConfirmBtn) els.resetConfirmBtn.removeEventListener('click', handleResetConfirm);
    document.removeEventListener('keydown', handleKeyDown);
  };
}

if (typeof window !== 'undefined') {
  const init = () => {
    const root = document.querySelector<HTMLElement>('[data-raffle-app]') || document.querySelector<HTMLElement>('[data-role="stage"]');
    if (root && !(root as any).__raffleMounted) {
      (root as any).__raffleMounted = true;
      mountRaffleApp(root, { config: EVENT_CONFIG });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

