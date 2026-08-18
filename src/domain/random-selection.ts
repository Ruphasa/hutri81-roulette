const UINT32_RANGE = 2 ** 32;
const MAX_REJECTION_ATTEMPTS = 128;

type NextUint32 = () => number;

function cryptoUint32(): number {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Web Crypto tidak tersedia untuk pengundian.');
  }

  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  const value = values[0];

  if (value === undefined) {
    throw new Error('Web Crypto tidak menghasilkan nilai acak.');
  }

  return value;
}

function assertUint32(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
    throw new Error('Sumber acak harus menghasilkan bilangan uint32.');
  }
}

export function randomIndex(length: number, nextUint32: NextUint32 = cryptoUint32): number {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new Error('Panjang kumpulan harus lebih dari nol.');
  }

  if (length > UINT32_RANGE) {
    throw new Error('Panjang kumpulan melebihi rentang uint32.');
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % length);

  for (let attempt = 0; attempt < MAX_REJECTION_ATTEMPTS; attempt += 1) {
    const value = nextUint32();
    assertUint32(value);

    if (value < limit) {
      return value % length;
    }
  }

  throw new Error('Sumber acak terlalu sering menghasilkan nilai yang ditolak.');
}

export function selectWinner(activeLots: readonly string[], nextUint32?: NextUint32): string {
  const selected = activeLots[randomIndex(activeLots.length, nextUint32)];

  if (selected === undefined) {
    throw new Error('Nomor kavling terpilih tidak tersedia.');
  }

  return selected;
}
