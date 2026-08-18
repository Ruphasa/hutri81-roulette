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

  it('fails fast when ranges are unsafe or impractical to generate', () => {
    expect(() =>
      generateLots([{ prefix: 'L', start: Number.MAX_SAFE_INTEGER + 1, end: 1 }]),
    ).toThrow('batas bilangan bulat aman');
    expect(() => generateLots([{ prefix: 'L', start: 1, end: 1_001 }])).toThrow(
      'melebihi batas praktis 1000 nomor',
    );
    expect(() =>
      generateLots([
        { prefix: 'L', start: 1, end: 1_000 },
        { prefix: 'K', start: 1, end: 1_000 },
        { prefix: 'M', start: 1, end: 1 },
      ]),
    ).toThrow('Total nomor kavling melebihi batas praktis 2000 nomor');
    expect(() => generateLots([{ prefix: 'L', start: 1, end: 1, padTo: 13 }])).toThrow(
      'panjang padding tidak valid',
    );
    expect(() =>
      generateLots([{ prefix: 'L', start: 1, end: 1, padTo: Number.MAX_SAFE_INTEGER + 1 }]),
    ).toThrow('panjang padding tidak valid');
    expect(() => generateLots([{ prefix: 'L', start: 0, end: 1 }])).toThrow(
      'harus memakai nomor positif',
    );
  });

  it('rejects non-canonical prefixes before generating ambiguous IDs', () => {
    expect(() => generateLots([{ prefix: 'L ', start: 1, end: 1 }])).toThrow(
      'awalan tidak kanonis',
    );
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

  it('reports prefixes with surrounding or control whitespace', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: ' L', start: 201, end: 203 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki awalan tidak kanonis.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L\n', start: 201, end: 203 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki awalan tidak kanonis.');
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

  it('reports unsafe bounds and impractical range sizes without generating them', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L', start: Number.MAX_SAFE_INTEGER + 1, end: 1 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 harus memakai batas bilangan bulat aman.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L', start: 1, end: 1_001 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 melebihi batas praktis 1000 nomor.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [
          { prefix: 'L', start: 1, end: 1_000 },
          { prefix: 'K', start: 1, end: 1_000 },
          { prefix: 'M', start: 1, end: 1 },
        ],
      }),
    ).toContain('Total nomor kavling melebihi batas praktis 2000 nomor.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L', start: 1, end: 1, padTo: 13 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki panjang padding tidak valid.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [
          { prefix: 'L', start: 1, end: 1, padTo: Number.MAX_SAFE_INTEGER + 1 },
        ],
      }),
    ).toContain('Rentang nomor kavling ke-1 memiliki panjang padding tidak valid.');
    expect(
      validateEventConfig({
        ...validConfig,
        lotRanges: [{ prefix: 'L', start: 0, end: 1 }],
      }),
    ).toContain('Rentang nomor kavling ke-1 harus memakai nomor positif.');
  });

  it('reports blank event and prize identities plus duplicate prize IDs', () => {
    expect(
      validateEventConfig({
        ...validConfig,
        id: ' ',
        title: ' ',
        neighborhood: ' ',
        prizes: [
          { id: ' ', label: ' ' },
          { id: 'hadiah-1', label: 'Hadiah A' },
          { id: 'hadiah-1', label: 'Hadiah B' },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'ID acara tidak boleh kosong.',
        'Judul acara tidak boleh kosong.',
        'Nama lingkungan tidak boleh kosong.',
        'Hadiah ke-1 memiliki ID kosong.',
        'Hadiah ke-1 memiliki label kosong.',
        'ID hadiah duplikat: hadiah-1.',
      ]),
    );
  });
});
