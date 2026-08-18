import type { EventConfig } from '../domain/types';

export const EVENT_CONFIG: EventConfig = {
  id: 'hutri81-griya-shanta-rt08',
  title: 'Malam HUT RI ke-81',
  neighborhood: 'Griya Shanta RT 08',
  // Replace only this list with the final ranges before production.
  lotRanges: [
    { prefix: 'L', start: 201, end: 250 },
    { prefix: 'K', start: 301, end: 450 },
  ],
  prizes: [
    { id: 'hadiah-1', label: 'Hadiah ke-1' },
    { id: 'hadiah-2', label: 'Hadiah ke-2' },
    { id: 'hadiah-3', label: 'Hadiah ke-3' },
    { id: 'hadiah-4', label: 'Hadiah ke-4' },
    { id: 'hadiah-5', label: 'Hadiah ke-5' },
  ],
};
