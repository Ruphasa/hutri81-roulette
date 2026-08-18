import { describe, expect, it } from 'vitest';
import { generateLots, validateEventConfig } from './lot-generation';
import type { EventConfig } from './types';

const validConfig: EventConfig = {
  id: 'hut-ri-81',
  title: 'Undian HUT RI ke-81',
  neighborhood: 'RT 01 / RW 01',
  lotRanges: [{ prefix: 'L', start: 201, end: 203 }],
  prizes: [{ id: 'hadiah-1', label: 'Hadiah ke-1' }],
};

describe('generateLots', () => {
  it('expands inclusive ranges in their configured order', () => {
    expect(generateLots([{ prefix: 'L', start: 201, end: 203 }])).toEqual([
      'L201',
      'L202',
      'L203',
    ]);
    expect(
      generateLots([
        { prefix: 'K', start: 301, end: 302 },
        { prefix: 'L', start: 201, end: 202 },
      ]),
    ).toEqual(['K301', 'K302', 'L201', 'L202']);
  });

  it('pads numeric portions when configured', () => {
    expect(generateLots([{ prefix: 'A', start: 8, end: 10, padTo: 3 }])).toEqual([
      'A008',
      'A009',
      'A010',
    ]);
  });
});

describe('validateEventConfig', () => {
  it('accepts a valid configuration', () => {
    expect(validateEventConfig(validConfig)).toEqual([]);
  });

  it('reports reversed range bounds', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L', start: 203, end: 201 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki batas terbalik.');
  });

  it('reports blank prefixes', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: '   ', start: 201, end: 203 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki awalan kosong.');
  });

  it('reports duplicate output across ranges', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [
          { prefix: 'L', start: 201, end: 203 },
          { prefix: 'L', start: 203, end: 205 },
        ],
      }),
    ).toContain('Nomor kavling duplikat: L203.');
  });

  it('reports an empty range list', () => {
    expect(validateEventConfig({ ...validConfig, lotRanges: [] })).toContain(
      'Daftar rentang nomor kavling tidak boleh kosong.',
    );
  });

  it('reports an empty prize list', () => {
    expect(validateEventConfig({ ...validConfig, prizes: [] })).toContain(
      'Daftar hadiah tidak boleh kosong.',
    );
  });
});
