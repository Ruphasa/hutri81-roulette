import type { EventConfig, LotRange } from './types';

const MAX_LOTS_PER_RANGE = 1_000;
const MAX_TOTAL_LOTS = 2_000;
const MAX_PAD_LENGTH = 12;
const CANONICAL_PREFIX = /^[^\s\x00-\x1F\x7F]+$/u;

function lotId(range: LotRange, number: number): string {
  const numericPart = range.padTo === undefined
    ? String(number)
    : String(number).padStart(range.padTo, '0');

  return `${range.prefix}${numericPart}`;
}

function generateValidatedLots(ranges: readonly LotRange[]): string[] {
  const lots: string[] = [];

  for (const range of ranges) {
    for (let number = range.start; number <= range.end; number += 1) {
      lots.push(lotId(range, number));
    }
  }

  return lots;
}

interface LotRangeValidation {
  readonly errors: readonly string[];
  readonly validRanges: readonly LotRange[];
}

function validateLotRanges(ranges: readonly LotRange[]): LotRangeValidation {
  const errors: string[] = [];
  const validRanges: LotRange[] = [];
  let totalLots = 0;

  for (const [index, range] of ranges.entries()) {
    if (isValidRange(range, index, errors, totalLots)) {
      totalLots += range.end - range.start + 1;
      validRanges.push(range);
    }
  }

  return { errors, validRanges };
}

function isValidRange(
  range: LotRange,
  index: number,
  errors: string[],
  totalLots: number,
): boolean {
  const position = index + 1;
  let valid = true;

  if (range.prefix.trim() === '') {
    errors.push(`Rentang nomor kavling ke-${position} memiliki awalan kosong.`);
    valid = false;
  } else if (range.prefix !== range.prefix.trim() || !CANONICAL_PREFIX.test(range.prefix)) {
    errors.push(`Rentang nomor kavling ke-${position} memiliki awalan tidak kanonis.`);
    valid = false;
  }

  if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end)) {
    errors.push(`Rentang nomor kavling ke-${position} harus memakai batas bilangan bulat aman.`);
    valid = false;
  } else if (range.start < 1 || range.end < 1) {
    errors.push(`Rentang nomor kavling ke-${position} harus memakai nomor positif.`);
    valid = false;
  } else if (range.start > range.end) {
    errors.push(`Rentang nomor kavling ke-${position} memiliki batas terbalik.`);
    valid = false;
  }

  if (
    range.padTo !== undefined
    && (!Number.isSafeInteger(range.padTo) || range.padTo < 1 || range.padTo > MAX_PAD_LENGTH)
  ) {
    errors.push(`Rentang nomor kavling ke-${position} memiliki panjang padding tidak valid.`);
    valid = false;
  }

  if (!valid) {
    return false;
  }

  const span = range.end - range.start + 1;

  if (span > MAX_LOTS_PER_RANGE) {
    errors.push(
      `Rentang nomor kavling ke-${position} melebihi batas praktis ${MAX_LOTS_PER_RANGE} nomor.`,
    );
    return false;
  }

  if (totalLots + span > MAX_TOTAL_LOTS) {
    errors.push(`Total nomor kavling melebihi batas praktis ${MAX_TOTAL_LOTS} nomor.`);
    return false;
  }

  return valid;
}

export function generateLots(ranges: readonly LotRange[]): string[] {
  const { errors } = validateLotRanges(ranges);

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return generateValidatedLots(ranges);
}

export function validateEventConfig(config: EventConfig): readonly string[] {
  const errors: string[] = [];

  if (config.id.trim() === '') {
    errors.push('ID acara tidak boleh kosong.');
  }

  if (config.title.trim() === '') {
    errors.push('Judul acara tidak boleh kosong.');
  }

  if (config.neighborhood.trim() === '') {
    errors.push('Nama lingkungan tidak boleh kosong.');
  }

  if (config.lotRanges.length === 0) {
    errors.push('Daftar rentang nomor kavling tidak boleh kosong.');
  }

  const rangeValidation = validateLotRanges(config.lotRanges);
  errors.push(...rangeValidation.errors);
  const seenLots = new Set<string>();

  for (const lot of generateValidatedLots(rangeValidation.validRanges)) {
    if (seenLots.has(lot)) {
      errors.push(`Nomor kavling duplikat: ${lot}.`);
      continue;
    }

    seenLots.add(lot);
  }

  if (config.prizes.length === 0) {
    errors.push('Daftar hadiah tidak boleh kosong.');
  }

  const prizeIds = new Set<string>();

  for (const [index, prize] of config.prizes.entries()) {
    const position = index + 1;

    if (prize.id.trim() === '') {
      errors.push(`Hadiah ke-${position} memiliki ID kosong.`);
    } else if (prizeIds.has(prize.id)) {
      errors.push(`ID hadiah duplikat: ${prize.id}.`);
    } else {
      prizeIds.add(prize.id);
    }

    if (prize.label.trim() === '') {
      errors.push(`Hadiah ke-${position} memiliki label kosong.`);
    }
  }

  return errors;
}
