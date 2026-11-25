# bank-soal-sd

Satu bank soal Kelas 1–6 untuk aplikasi belajar **NaraNusa**. Soal ditulis
dalam Markdown (sumber kanonis), lalu di-build menjadi JSON untuk dikonsumsi
aplikasi.

## Struktur folder

```
bank-soal-sd/
├── kelas-4/
│   ├── mtk/       (6 modul)
│   ├── tik/       (8 modul)
│   ├── pjok/      (5 modul)
│   ├── seni/      (8 modul)
│   ├── inggris/   (8 modul)
│   ├── pai/       (11 modul)
│   ├── bi/        (kosong — menunggu daftar isi)
│   ├── ipas/      (kosong — menunggu daftar isi)
│   └── pp/        (kosong — menunggu daftar isi)
├── scripts/
│   └── build-json.py
└── json/
    └── kelas-4/   (hasil build)
```

## Status saat ini

- **Kelas 4**: 745 soal **draf** — MTK 135, TIK 155, PJOK 85, Seni 105,
  Inggris 75, PAI 190.
- **BI, IPAS, PP**: menunggu foto daftar isi, belum ada soal.
- **Kelas 1–3 dan 5–6**: masih kosong.

## Status draf

Semua soal berstatus `draf` dan **wajib tinjauan guru** (D-014) sebelum
dipakai aplikasi. Saat ini belum ada soal yang lolos tinjauan.

## Alur

```
singgah/  →  tinjauan guru (batas 14 hari)  →  bank
```

Soal yang belum ditinjau dalam 14 hari dikembalikan ke Andri untuk
diputuskan (terima / tolak / ingatkan peninjau).

## Format kanonis

- **Markdown** = sumber. Tiap modul berisi header bab, sub-bab, dan blok
  `### Soal N` dengan field `Pertanyaan`, pilihan A–D, `Jawaban benar`,
  `Pembahasan`, dan `Rujukan`.
- **JSON** = hasil build. Satu file per mapel di `json/kelas-4/<mapel>.json`.

## Build

Jalankan dari root repo:

```bash
python3 scripts/build-json.py
```

Skrip memvalidasi keras jumlah soal per mapel (harus persis total 745).
Kalau ada yang tidak cocok, build gagal dengan pesan error menyebut file
dan nomor soal.

Contoh output ringkasan:

```
Build selesai:
  mtk     :  135 soal
  tik     :  155 soal
  pjok    :   85 soal
  seni    :  105 soal
  inggris :   75 soal
  pai     :  190 soal
  total   :  745 soal
Output: json/kelas-4/
```

## Keputusan kunci

| Kode  | Keputusan |
|-------|-----------|
| D-026 | Repo terpisah, publik |
| D-027 | Markdown sebagai sumber + JSON sebagai hasil build |
| D-028 | Peninjau = guru D-014 yang sama; batas tinjauan 14 hari — lewat batas, Andri yang putuskan |
| D-029 | Generator form + Google Apps Script (GAS) |
| D-032 | Fokus Kelas 4 dulu, mapel lain menyusul |
