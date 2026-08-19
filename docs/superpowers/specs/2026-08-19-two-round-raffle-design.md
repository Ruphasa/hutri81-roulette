# Design Specification: Two-Round Raffle System & Impeccable UI Overhaul

**Date:** 2026-08-19  
**Event:** Malam Puncak HUT RI ke-81 Griya Shanta RT 08  
**Design Reference:** Persona 5 / Merdeka High-Contrast Polygonal Layout (`expectation.png`)  

---

## 1. Executive Summary & Goals

Transformasi sistem pengundian menjadi format **Dua Babak (Two-Round Game Show)** dan restorasi penuh tata letak visual **3-Polygon Persona 5 Aesthetic** sesuai [expectation.png](file:///L:/HUTRI81/expectation.png).

### Key Objectives
1. **Restorasi 3-Polygon High-Contrast Background**:
   - **Kanvas Dasar (`#0F1012`)**: Warna hitam pekat panggung yang membelah tengah hingga kanan bawah.
   - **Red Split (Kiri)**: `clip-path: polygon(0 0, 53% 0, 48% 100%, 0 100%)` dengan Crimson `#D92525`.
   - **Cream Split (Kanan Atas)**: `clip-path: polygon(70% 0, 100% 0, 100% 80%, 55% 100%)` dengan Cream `#F1E8D1` dan sunburst lines.
   - **Tombol Merah Kontras Tinggi**: Tombol aksi utama (`PUTAR SEKARANG` / `LANJUT & PUTAR`) duduk di atas bidang hitam dengan bentuk trapezoid miring bersudut tajam.
2. **Pembersihan Barisan Tombol Bawah (Anti-Clutter)**:
   - Area kanan bawah dikembalikan bersih: hanya tombol utama (`PUTAR SEKARANG` / `LANJUT & PUTAR`) dan tombol `HANGUS & UNDI ULANG` saat pemenang aktif.
   - Tombol ganti babak dipindahkan ke **Header Bar Atas** menjadi tombol panah/pill yang ramping dan elegan: **`[ 🏆 Babak Utama ➔ ]`**.
3. **Babak 1 — Hadiah Hiburan (Dinamis & Fleksibel)**:
   - Menampilkan badge **`BABAK HADIAH HIBURAN`**.
   - Penomoran otomatis bertambah (`HADIAH HIBURAN #1`, `#2`, `#3`, ...).
   - Tombol transisi di header atas: **`[ 🏆 Babak Utama ➔ ]`**.
4. **Transisi Babak & Reset Kavling Otomatis**:
   - Layar pop-up transisi menampilkan rangkuman pemenang hadiah hiburan.
   - Tombol **`🔥 MULAI BABAK HADIAH UTAMA`** yang secara otomatis **mereset seluruh nomor kavling** (seluruh warga kembali berhak memperebutkan hadiah utama).
5. **Babak 2 — Hadiah Utama (Tepat 3 Hadiah Sesuai Urutan Baku)**:
   - Menampilkan badge emas menyala: **`BABAK HADIAH UTAMA`**.
   - Urutan hadiah mutlak:
     1. **HADIAH UTAMA 1: KARPET**
     2. **HADIAH UTAMA 2: MAGICOM**
     3. **HADIAH UTAMA 3: KIPAS ANGIN**
   - Kavling yang menang hadiah utama tidak dapat menang kembali di hadiah utama berikutnya.
6. **Grand Finale Screen & Kontrol Operator Aman**:
   - Rangkuman pemenang lengkap yang terorganisir per babak (Hadiah Hiburan & Hadiah Utama).
   - Tombol operator yang jelas: **`🔄 RESET SELURUH ACARA`** dan **`📋 TUTUP RINGKASAN`** sehingga operator tidak terkunci.

---

## 2. Layout & Visual Architecture

```
+---------------------------------------------------------------------------------------------------+
| [♦] GRIYA SHANTA · RT 08       [BABAK HADIAH HIBURAN] [ ➔ Babak Utama ]   [🔊] [164 NOMOR TERSISA] |
+-------------------------------------------------------------------+-------------------------------+
|                                                                   |  MALAM                        |
|                     ROULETTE WHEEL                                |  UNDIAN                       |
|                 (Di atas Polygon Merah)                           |  MERDEKA! (Di atas Krem)      |
|                                                                   |                               |
|                  +--------------------+                           |                               |
|                  |   NOMOR TERKUNCI   |                           |  PUTAR RODA. TAHAN NAPAS...   |
|                  |      L - 309       |                           |  (Di atas Polygon Hitam)      |
|                  |      PEMENANG      |                           |                               |
|                  +--------------------+                           |  +-------------------------+  |
|                                                                   |  |  PUTAR SEKARANG       ▶ |  |
|                                                                   |  +-------------------------+  |
|                                                                   |  [ HANGUS & UNDI ULANG ]      |
|  sekali putar, satu pemenang!                                     |  ENTER - MULAI UNDIAN         |
+-------------------------------------------------------------------+-------------------------------+
```

### 2.1. Polygonal Clipping Rules
- `.stage-container`: `width: 100vw; height: 100vh; background: var(--color-black); overflow: hidden; position: relative;`
- `.bg-red-split`: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-crimson); clip-path: polygon(0 0, 53% 0, 48% 100%, 0 100%); z-index: 1;`
- `.bg-cream-split`: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-cream); clip-path: polygon(70% 0, 100% 0, 100% 80%, 55% 100%); z-index: 2; overflow: hidden;`
- `.wheel-wrapper`: `position: absolute; left: 8%; top: 50%; transform: translateY(-50%); width: min(58vw, 75vh); height: min(58vw, 75vh); z-index: 4;`
- Primary button: Positioned at bottom-right inside the black zone (`position: absolute; bottom: 8%; right: 5%;`), retaining high-contrast red trapezoid shape on black background.

### 2.2. Header Bar Elements
- Left: `.top-left-badge` (`GRIYA SHANTA · RT 08`) and `.top-left-diamond` (Secret reset).
- Center: `.round-badge` (`BABAK HADIAH HIBURAN` / `BABAK HADIAH UTAMA`) + `.switch-round-btn` (`🏆 Babak Utama ➔`).
- Right: `.mute-toggle-btn` + `.stat-gold` (`164 NOMOR TERSISA`) + `.stat-cream` (`Hadiah Hiburan #1`).
