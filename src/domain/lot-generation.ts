import type { EventConfig, LotRange } from './types';

function lotId(range: LotRange, number: number): string {
  const numericPart = range.padTo === undefined
    ? String(number)
    : String(number).padStart(range.padTo, '0');

  return `${range.prefix}${numericPart}`;
}

export function generateLots(ranges: readonly LotRange[]): string[] {
  const lots: string[] = [];

  for (const range of ranges) {
    for (let number = range.start; number <= range.end; number += 1) {
      lots.push(lotId(range, number));
    }
  }

  return lots;
}

function isValidRange(range: LotRange, index: number, errors: string[]): boolean {
  const position = index + 1;
  let valid = true;

  if (range.prefix.trim() === '') {
    errors.push(`Rentang nomor kavling ke-${position} memiliki awalan kosong.`);
    valid = false;
  }

  if (!Number.isInteger(range.start) || !Number.isInteger(range.end)) {
    errors.push(`Rentang nomor kavling ke-${position} harus memakai batas bilangan bulat.`);
    valid = false;
  } else if (range.start > range.end) {
    errors.push(`Rentang nomor kavling ke-${position} memiliki batas terbalik.`);
    valid = false;
  }

  if (range.padTo !== undefined && (!Number.isInteger(range.padTo) || range.padTo < 1)) {
    errors.push(`Rentang nomor kavling ke-${position} memiliki panjang padding tidak valid.`);
    valid = false;
  }

  return valid;
}

export function validateEventConfig(config: EventConfig): readonly string[] {
  const errors: string[] = [];

  if (config.lotRanges.length === 0) {
    errors.push('Daftar rentang nomor kavling tidak boleh kosong.');
  }

  const validRanges = config.lotRanges.filter((range, index) => isValidRange(range, index, errors));
  const seenLots = new Set<string>();

  for (const lot of generateLots(validRanges)) {
    if (seenLots.has(lot)) {
      errors.push(`Nomor kavling duplikat: ${lot}.`);
      continue;
    }

    seenLots.add(lot);
  }

  if (config.prizes.length === 0) {
    errors.push('Daftar hadiah tidak boleh kosong.');
  }

  return errors;
}
