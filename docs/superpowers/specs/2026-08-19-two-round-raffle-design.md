# Design Specification: Two-Round Raffle System & Impeccable UI Overhaul

**Date:** 2026-08-19  
**Event:** Malam Puncak HUT RI ke-81 Griya Shanta RT 08  
**Design Standards:** High-Contrast Stage Display, Persona 5 / Merdeka Vintage Aesthetic, Impeccable UI/UX  

---

## 1. Executive Summary & Goals

Transformasi sistem pengundian menjadi format **Dua Babak (Two-Round Game Show)** dan perbaikan total tata letak visual (*Impeccable UI*) agar memenuhi 100% layar (bebas pilar/border hitam) dan tidak mengunci operator di akhir acara.

### Key Objectives
1. **True 100% Fullscreen (Bebas Pilar Hitam)**: Menghapus batasan `max-width` dan pilar hitam `#000`. Kontainer panggung adaptif memenuhi monitor laptop maupun TV/proyektor 16:9 secara penuh dengan proporsi 70% (kiri: arena roda) dan 30% (kanan: panel kontrol).
2. **Babak 1 — Hadiah Hiburan (Dinamis & Fleksibel)**:
   - Menampilkan badge **`BABAK HADIAH HIBURAN`**.
   - Penomoran otomatis bertambah (`HADIAH HIBURAN #1`, `#2`, `#3`, ...).
   - Tombol transisi: **`🏆 SELESAIKAN HIBURAN & MASUK BABAK UTAMA`**.
3. **Transisi Babak & Reset Kavling Otomatis**:
   - Layar pop-up transisi menampilkan rangkuman pemenang hadiah hiburan.
   - Tombol **`🔥 MULAI BABAK HADIAH UTAMA`** yang secara otomatis **mereset seluruh nomor kavling** (seluruh warga kembali berhak memperebutkan hadiah utama).
4. **Babak 2 — Hadiah Utama (Tepat 3 Hadiah Sesuai Urutan Baku)**:
   - Menampilkan badge emas menyala: **`BABAK HADIAH UTAMA`**.
   - Urutan hadiah mutlak:
     1. **HADIAH UTAMA 1: KARPET**
     2. **HADIAH UTAMA 2: MAGICOM**
     3. **HADIAH UTAMA 3: KIPAS ANGIN**
   - Kavling yang menang hadiah utama tidak dapat menang kembali di hadiah utama berikutnya.
5. **Grand Finale Screen & Kontrol Operator Aman**:
   - Rangkuman pemenang lengkap yang terorganisir per babak (Hadiah Hiburan & Hadiah Utama).
   - Tombol operator yang jelas: **`🔄 RESET SELURUH ACARA`** dan **`📋 TUTUP RINGKASAN`** sehingga operator tidak terkunci.

---

## 2. Layout & UI Polish (Impeccable Visual Standards)

```
+---------------------------------------------------------------------------------------------------+
| [♦] (Reset Rahasia)  GRIYA SHANTA RT 08                           [ 🔊 SUARA: ON ] [164 NOMOR]    |
+-------------------------------------------------------------------+-------------------------------+
|                                                                   |  MALAM UNDIAN MERDEKA         |
|                                                                   |                               |
|                         ROULETTE ARENA                            |  [ BABAK HADIAH UTAMA ]       |
|                             (70%)                                 |  HADIAH #01: KARPET           |
|                                                                   |                               |
|                       +-----------------+                         |  PUTAR RODA. TAHAN NAPAS.     |
|                       |                 |                         |                               |
|                       |     L - 123     | (min(8vw, 16vh) Hero)   |  +-------------------------+  |
|                       |                 |                         |  |   PUTAR SEKARANG (▶)    |  |
|                       +-----------------+                         |  +-------------------------+  |
|                                                                   |  | [🏆 KE BABAK UTAMA]     |  |
|                                                                   |  +-------------------------+  |
|                                                                   |  [Enter - Kontrol Utama]      |
|                                                                   |                               |
|  sekali putar, satu pemenang!                                     |  [Status Offline Ready ✓]     |
+-------------------------------------------------------------------+-------------------------------+
```

### 2.1. Fullscreen CSS Refactor
- `.stage-container`: `width: 100vw; height: 100vh; max-width: none; overflow: hidden; background: var(--color-black);`
- `.bg-red-split`: `position: absolute; top: 0; left: 0; width: 70%; height: 100%;`
- `.bg-cream-split`: `position: absolute; top: 0; right: 0; width: 30%; height: 100%;`
- Wheel scale: `width: min(60vw, 82vh); height: min(60vw, 82vh);`
- Center readout: `font-size: min(8vw, 16vh); line-height: 1; letter-spacing: -1px;`

### 2.2. Round Badges & Action Buttons
- **Round Badge**: 
  - Babak Hiburan: Badge hitam garis merah `BABAK HADIAH HIBURAN`.
  - Babak Utama: Badge emas berkilau `BABAK HADIAH UTAMA`.
- **Primary Actions**:
  - `PUTAR SEKARANG` / `LANJUT & PUTAR` (Skew button hitam aksen merah/emas).
  - `HANGUS & UNDI ULANG` (Garis merah berkedip saat pemenang aktif).
  - `🏆 SELESAIKAN HIBURAN & MASUK BABAK UTAMA` (Tombol transisi babak berwarna emas elegan).

---

## 3. State Machine & Domain Logic

### 3.1. State Structure (`RaffleState`)
```typescript
export type RaffleRound = 'small' | 'main';

export interface WinnerRecord {
  readonly lotId: string;
  readonly prizeId: string;
  readonly prizeLabel: string;
  readonly round: RaffleRound;
  readonly drawnAt: string;
}

export interface RaffleState {
  readonly phase: 'idle' | 'spinning' | 'winner' | 'intermission' | 'complete';
  readonly round: RaffleRound;
  readonly activeLots: readonly string[];
  readonly winners: readonly WinnerRecord[];
  readonly smallPrizeCount: number;
  readonly mainPrizeIndex: number;
  readonly pendingWinner: WinnerRecord | null;
}
```

### 3.2. Main Prizes Configuration
```typescript
export const MAIN_PRIZES: readonly Prize[] = [
  { id: 'main-karpet', label: 'Karpet' },
  { id: 'main-magicom', label: 'Magicom' },
  { id: 'main-kipas', label: 'Kipas Angin' },
];
```

### 3.3. Round Transitions
1. **Babak Hiburan (`round: 'small'`)**:
   - `START_DRAW`: Mengundi pemenang `HADIAH HIBURAN #(smallPrizeCount + 1)`.
   - `REVEAL_WINNER`: Menyimpan pemenang dengan `round: 'small'`.
   - `SWITCH_TO_MAIN_ROUND`: 
     - Mengubah phase ke `'intermission'`.
     - Mereset `activeLots` kembali ke seluruh kavling (`fullPool`).
     - Mengubah `round` ke `'main'` dan `mainPrizeIndex = 0`.
2. **Babak Utama (`round: 'main'`)**:
   - Mengundi tepat 3 hadiah: Karpet ➔ Magicom ➔ Kipas Angin.
   - Pemenang disimpan dengan `round: 'main'`.
   - Setelah Kipas Angin selesai, phase berubah ke `'complete'`.

---

## 4. Modal Overlays & Operator Interactions

### 4.1. Intermission Modal (Rekap Hadiah Hiburan)
- Menampilkan daftar nomor kavling pemenang hadiah hiburan.
- Teks info: *"Seluruh kavling akan di-reset untuk memperebutkan 3 Hadiah Utama."*
- Tombol: **`🔥 MULAI BABAK HADIAH UTAMA (ENTER)`**.

### 4.2. Grand Finale Overlay
- Menampilkan dua kolom rekap:
  - Kolom Kiri: Pemenang Hadiah Hiburan.
  - Kolom Kanan: Pemenang Hadiah Utama (Karpet, Magicom, Kipas Angin) dengan lencana emas.
- Footer Controls:
  - **`🔄 RESET ACARA`**: Memicu dialog konfirmasi reset.
  - **`👁️ TUTUP OVERLAY`**: Menutup overlay untuk melihat panggung roda.

---

## 5. Offline Safety & Verification
- Seluruh logika, audio sintetis, canvas confetti, dan persistensi `localStorage` berjalan 100% offline.
- Unit test mencakup transisi babak, reset pool pada babak utama, urutan hadiah 3 utama, dan bebas error tipe TypeScript.
