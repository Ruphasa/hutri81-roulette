# Design Specification: 2/3 Stage Wheel Scale, Confetti Positioning, Mechanical Sync & Stylized Finale

**Date:** 2026-08-20  
**Event:** Malam Puncak HUT RI ke-81 Griya Shanta RT 08  
**Design Polish:** 2/3 Split Stage Wheel, Flanked Confetti Cannons, Monotonic Mechanical Easing, Stylized Finale UI  

---

## 1. Executive Summary & Goals

Penyempurnaan tata letak visual panggung dan mekanika sinkronisasi roda undian:
1. **Proporsi Panggung 2/3 Merah & 1/3 Kanan**:
   - Area merah diperlebar memenuhi 2/3 layar (`clip-path: polygon(0 0, 68% 0, 62% 100%, 0 100%)`).
   - Roda roulette diperbesar masif (`min(62vw, 84vh)`) dengan nomor tiket raksasa (`min(8.5vw, 17vh)`).
   - Elemen kanan (judul ransom, deskripsi, tombol putar) dipadatkan dan dirapatkan ke sisi 1/3 kanan (`right: 3%`).
2. **Confetti / Popper Flanked dari Sisi Kiri & Kanan Roda**:
   - Mengambil posisi koordinat bounding box roda (`wheel-wrapper`) untuk menembakkan partikel confetti tepat dari sisi kiri dan kanan bawah roda, membingkai pemenang saat angka terkunci.
3. **Penyelarasan Mutlak Easing Roda & Nomor (Mechanical Precision)**:
   - Roda dan teks angka menggunakan kurva deselerasi sinkron yang sama (`easeOutCubic`).
   - Keduanya melambat bersamaan dan mengunci tepat di frame yang sama persis pada nomor pemenang, diiringi *Impact Slam Badge Animation* (`scale: [1, 1.25, 1]`) dan audio lock boom.
4. **Stylized Persona 5 Scrollbar & Grand Finale Visuals**:
   - Custom scrollbar emas-hitam bergaya Persona 5 pada kolom rekap pemenang di layar akhir.
   - Kartu pemenang dengan border emas, bayangan skewed, dan tipografi jelas.

---

## 2. Technical & Visual Architecture

### 2.1. CSS Proportions & Layout (`global.css`)
- `.bg-red-split`: `clip-path: polygon(0 0, 68% 0, 62% 100%, 0 100%);`
- `.bg-cream-split`: `clip-path: polygon(78% 0, 100% 0, 100% 80%, 65% 100%);`
- `.wheel-wrapper`: `position: absolute; left: 5%; top: 50%; transform: translateY(-50%); width: min(62vw, 84vh); height: min(62vw, 84vh); z-index: 4;`
- `.ransom-title`: `right: 4%; top: 16%;`
- `.middle-right-text`: `right: 4%;`
- `.bottom-right-controls`: `right: 4%; bottom: 6%;`

### 2.2. Confetti Origin Positioning (`confetti.ts`)
- `fire(options?: { count?: number; originEl?: HTMLElement | null })`:
  - Jika `originEl` diberikan, hitung koordinat kanvas relatif:
    - Left cannon: `x = rect.left, y = rect.bottom`
    - Right cannon: `x = rect.right, y = rect.bottom`
  - Partikel melesat ke atas diagonal melengkung membingkai roda.

### 2.3. Wheel Motion Sync (`roulette-motion.ts`)
- Roda dan proxy text keduanya memakai `easing: 'easeOutCubic'`.
- Mengeliminasi desinkronisasi atau efek roda bablas sendirian.
- Saat animasi selesai, trigger sentakan badge: `anime({ targets: readoutBadge, scale: [1, 1.2, 1], duration: 400, easing: 'easeOutBack' })`.

### 2.4. Custom Scrollbar (`global.css`)
```css
.finale-winners-list::-webkit-scrollbar,
.intermission-winners-list::-webkit-scrollbar {
  width: 8px;
}
.finale-winners-list::-webkit-scrollbar-track,
.intermission-winners-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-gold);
  border-radius: 4px;
}
.finale-winners-list::-webkit-scrollbar-thumb,
.intermission-winners-list::-webkit-scrollbar-thumb {
  background: var(--color-gold);
  border-radius: 4px;
}
```
