export interface LotRange {
  readonly prefix: string;
  readonly start: number;
  readonly end: number;
  readonly padTo?: number;
}

export interface Prize {
  readonly id: string;
  readonly label: string;
}

export interface EventConfig {
  readonly id: string;
  readonly title: string;
  readonly neighborhood: string;
  readonly lotRanges: readonly LotRange[];
  readonly prizes: readonly Prize[];
}

export type RafflePhase = 'idle' | 'spinning' | 'winner' | 'complete';

export interface WinnerRecord {
  readonly lotId: string;
  readonly prizeId: string;
  readonly prizeLabel: string;
  readonly drawnAt: string;
}

export interface RaffleState {
  readonly phase: RafflePhase;
  readonly activeLots: readonly string[];
  readonly winners: readonly WinnerRecord[];
  readonly prizeIndex: number;
  readonly pendingWinner: WinnerRecord | null;
}
