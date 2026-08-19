import type { EventConfig, Prize } from '../domain/types';

export const MAIN_PRIZES: readonly Prize[] = [
  { id: 'main-karpet', label: 'Karpet' },
  { id: 'main-magicom', label: 'Magicom' },
  { id: 'main-kipas', label: 'Kipas Angin' },
];

export const EVENT_CONFIG: EventConfig = {
  id: 'hutri81-griya-shanta-rt08',
  title: 'Malam HUT RI ke-81',
  neighborhood: 'Griya Shanta RT 08',
  // Replace only this list with the final ranges before production.
  lotRanges: [
    { prefix: 'Lc-', start: 1, end: 14 },
    { prefix: 'L-', start: 101, end: 143 },
    { prefix: 'L-', start: 201, end: 240 },
    { prefix: 'L-', start: 242, end: 257 },
    { prefix: 'K-', start: 333, end: 412 },
    { prefix: 'L-', start: 301, end: 315 },
  ],
  prizes: MAIN_PRIZES,
};
