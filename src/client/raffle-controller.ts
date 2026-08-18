import { createInitialState, transition } from '../domain/raffle-machine';
import { generateLots } from '../domain/lot-generation';
import { loadRaffleState, saveRaffleState, clearRaffleState } from '../lib/persistence';
import type { EventConfig, RaffleState } from '../domain/types';

export interface ControllerDependencies {
  readonly config: EventConfig;
  readonly selectWinner: (activeLots: readonly string[]) => string;
  readonly animateRoulette: (options: any) => Promise<void>;
  readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  readonly now: () => string;
  readonly reducedMotion: () => boolean;
}

export function mountRaffleApp(root: HTMLElement, deps: ControllerDependencies): () => void {
  const { config, selectWinner, animateRoulette, storage, now, reducedMotion } = deps;
  
  const els = {
    wheel: root.querySelector('[data-role="wheel"]') as HTMLElement,
    centerValue: root.querySelector('[data-role="center-value"]') as HTMLElement,
    activeCount: root.querySelector('[data-role="active-count"]') as HTMLElement,
    prizePosition: root.querySelector('[data-role="prize-position"]') as HTMLElement,
    drawBtn: root.querySelector('[data-role="draw"]') as HTMLButtonElement,
    advanceBtn: root.querySelector('[data-role="advance"]') as HTMLButtonElement,
    resetBtn: root.querySelector('[data-role="reset"]') as HTMLButtonElement,
    resetDialog: root.querySelector('[data-role="reset-dialog"]') as HTMLDialogElement,
    resetCancelBtn: root.querySelector('[data-role="reset-cancel"]') as HTMLButtonElement,
    resetConfirmBtn: root.querySelector('[data-role="reset-confirm"]') as HTMLButtonElement,
    winnerHistory: root.querySelector('[data-role="winner-history"]') as HTMLElement,
    errorPanel: root.querySelector('[data-role="error"]') as HTMLElement,
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
    
    // Error state
    if (currentUiPhase === 'ERROR') {
      els.errorPanel.textContent = errorMessage;
      els.errorPanel.hidden = false;
      els.drawBtn.disabled = true;
      els.advanceBtn.disabled = true;
      els.resetBtn.disabled = true;
      return;
    } else {
      els.errorPanel.hidden = true;
      els.errorPanel.textContent = '';
    }

    // Active count
    els.activeCount.textContent = state.activeLots.length.toString();

    // Prize Position
    if (state.prizeIndex < config.prizes.length) {
      const p = config.prizes[state.prizeIndex];
      els.prizePosition.textContent = p?.label || '';
    }

    // Buttons
    els.drawBtn.disabled = currentUiPhase !== 'IDLE';
    els.advanceBtn.disabled = currentUiPhase !== 'REVEAL_WINNER';
    els.resetBtn.disabled = currentUiPhase === 'SPINNING';

    // Advance button text
    if (currentUiPhase === 'REVEAL_WINNER' && state.prizeIndex >= config.prizes.length - 1) {
      els.advanceBtn.textContent = 'Lihat Semua Pemenang';
    }

    // Winner readout
    if (currentUiPhase === 'REVEAL_WINNER' && state.winners.length > 0) {
      els.centerValue.textContent = state.winners[state.winners.length - 1]?.lotId || '';
    } else if (currentUiPhase === 'IDLE' || currentUiPhase === 'COMPLETE') {
      els.centerValue.textContent = '';
    }
    
    // History
    els.winnerHistory.innerHTML = '';
    for (const w of [...state.winners].reverse()) {
      const d = document.createElement('div');
      d.textContent = `${w.lotId} - ${w.prizeLabel}`;
      els.winnerHistory.appendChild(d);
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

  function handleResetClick() {
    els.resetDialog.showModal();
  }

  function handleResetCancel() {
    els.resetDialog.close();
  }

  function handleResetConfirm() {
    els.resetDialog.close();
    clearRaffleState(storage);
    state = createInitialState(config, fullPool);
    currentUiPhase = 'IDLE';
    render();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (currentUiPhase === 'IDLE') {
        handleDraw();
      } else if (currentUiPhase === 'REVEAL_WINNER') {
        handleAdvance();
      }
    }
  }

  els.drawBtn.addEventListener('click', handleDraw);
  els.advanceBtn.addEventListener('click', handleAdvance);
  els.resetBtn.addEventListener('click', handleResetClick);
  els.resetCancelBtn.addEventListener('click', handleResetCancel);
  els.resetConfirmBtn.addEventListener('click', handleResetConfirm);
  document.addEventListener('keydown', handleKeyDown);

  updatePhase();
  render();

  return () => {
    els.drawBtn.removeEventListener('click', handleDraw);
    els.advanceBtn.removeEventListener('click', handleAdvance);
    els.resetBtn.removeEventListener('click', handleResetClick);
    els.resetCancelBtn.removeEventListener('click', handleResetCancel);
    els.resetConfirmBtn.removeEventListener('click', handleResetConfirm);
    document.removeEventListener('keydown', handleKeyDown);
  };
}
