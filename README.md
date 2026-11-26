# bank-soal-sd

Bank soal untuk Kelas 1-6 SD yang dipakai aplikasi belajar (saat ini dipakai NaraNusa, tetapi terbuka untuk siapa saja yang ingin membangun aplikasi belajar sendiri).

## Apa isi repo ini

Repo ini berisi soal-soal SD dalam bentuk file Markdown dan hasil build-nya berupa JSON.

Saat ini yang tersedia baru **Kelas 4**, sebanyak **58 modul Markdown** dengan total **975 soal**: 970 berstatus **draf** dan 5 soal PAI Bab 4 berstatus **lolos** tinjauan. Rincian per mata pelajaran:

| Mata pelajaran | Jumlah soal | Modul |
|---|---|---|
| MTK | 135 | 6 |
| TIK | 155 | 8 |
| PJOK | 85 | 5 |
| Seni | 105 | 8 |
| Inggris | 75 | 8 |
| PAI | 195 | 11 |
| BI | 80 | 4 |
| PP | 70 | 4 |
| IPAS | 75 | 4 |

Yang masih kosong:
- **Kelas 1-3 dan Kelas 5-6** — belum diisi.

Soal dikurasi dari buku Erlangga Kelas 4 (mengacu daftar isi buku) dan dibuat dengan variasi yang kuat, bukan sekadar hafalan. Semua soal wajib ditinjau guru sebelum dipakai aplikasi.

## Untuk siapa repo ini

**a. Developer / pembuat aplikasi belajar.** Kamu bisa memakai soal-soal ini di aplikasimu sendiri — selama bukan untuk tujuan komersial (lihat [Lisensi](#lisensi)). Datanya tersedia dalam bentuk JSON siap konsumsi, sehingga tidak perlu menyusun soal dari nol. Cukup ambil file JSON yang dibutuhkan dan tampilkan di aplikasimu.

**b. Guru, orang tua, atau kontributor.** Kamu bisa menyumbang soal baru dengan menulis modul Markdown lalu mengirimkannya ke folder `singgah/`. Setiap kiriman akan ditinjau guru sebelum masuk ke bank soal. Identitas kontributor (nama + kontak) hanya dicatat di pengiriman, tidak ikut tampil di modul publik.

**c. Tim NaraNusa.** Repo ini adalah sumber soal utama untuk aplikasi NaraNusa. Fokus saat ini pada Kelas 4 sampai tuntas, baru kemudian kelas lain.

## Cara memakai soal ini di aplikasimu sendiri

1. **Clone atau unduh repo ini.**

   ```
   git clone https://github.com/dfhstores-design/bank-soal-sd.git
   ```

   Atau unduh sebagai ZIP lewat tombol Code di GitHub.

2. **Ambil file JSON langsung, atau build sendiri.**
   - Langsung ambil hasil build, misalnya:
     ```
     https://raw.githubusercontent.com/dfhstores-design/bank-soal-sd/main/json/kelas-4/mtk.json
     ```
   - Atau build ulang dari Markdown dengan menjalankan perintah ini dari root repo:
     ```
     python3 scripts/build-json.py
     ```
     Script ini memvalidasi jumlah soal per mapel secara ketat (harus persis 975 total). Jika tidak cocok, build gagal.

3. **Baca satu soal dari JSON.** Setiap soal punya 14 field. Contoh field penting:

   ```json
   {
     "pertanyaan": "Berapakah hasil dari 63 : 7?\nA. 7\nB. 8\nC. 9\nD. 10",
     "pilihan": ["7", "8", "9", "10"],
     "jawaban_benar": "C",
     "pembahasan": "7 × 9 = 63, jadi 63 : 7 = 9. Pembagian adalah kebalikan dari perkalian.",
     "rujukan": "Matematika Erlangga Kelas 4, Bab 1, Sub-bab H",
     "jenjang": "kelas-4",
     "mapel": "mtk",
     "bab": "Bab 1: Bilangan Cacah sampai 10.000",
     "sub_bab": "H: Pembagian Bilangan Cacah sampai 100",
     "sumber": "Kurasi internal",
     "status": "draf",
     "pembuat": "Kurasi internal",
     "tanggal": "2026-11-25"
   }
   ```

   Contoh di atas adalah soal sungguhan dari bank ini (MTK Bab 1). Perhatikan: pilihan A-D juga tertulis di dalam field `pertanyaan`, selain tersimpan terpisah di array `pilihan`.

   Field yang perlu diperhatikan saat menampilkan soal: `pertanyaan`, `pilihan` (array 4 string, A-D), `jawaban_benar` (A/B/C/D), `pembahasan`, dan `status`.

4. **Catatan penting:** 970 soal berstatus **draf**; lima soal PAI Bab 4 yang sudah lolos tinjauan berstatus **lolos**. Periksa field `status` sebelum memakai soal ke anak dan jangan menganggap soal draf sebagai soal final.

## Cara menyumbang soal

1. Tulis modul Markdown mengikuti format berikut:
   - Header: `# Modul <MAPEL> — Bab N: <judul>`
   - Sub-bab: `## Sub-bab X: ...`
   - Soal: blok `### Soal N` berisi field `Pertanyaan`, pilihan `A-D`, `Jawaban benar`, `Pembahasan`, dan `Rujukan`.

2. Kirim file ke folder `singgah/` pada mapel yang sesuai, misalnya `kelas-4/mtk/singgah/`. Kiriman belum masuk bank soal sampai lolos tinjauan.

3. Sertakan nama dan kontak (WA atau email) di catatan pengiriman. Data ini hanya dipakai untuk komunikasi, tidak ikut ke modul publik.

4. Peninjau guru akan meninjau kiriman maksimal **14 hari**. Jika lewat batas, Andri yang memutuskan: terima, tolak, atau ingatkan peninjau.

## Status & keputusan

| Kode | Keputusan |
|---|---|
| D-026 | Repo terpisah dan publik. |
| D-027 | Markdown sebagai sumber, JSON sebagai hasil build. |
| D-028 | Peninjau guru yang sama (D-014), batas tinjauan 14 hari. |
| D-029 | Generator soal berupa form + Google Apps Script. |
| D-030 | Provider API terbuka; kontributor memakai kunci sendiri per sesi, tidak disimpan. |
| D-031 | Identitas kontributor (nama + kontak WA/email) hanya di catatan pengiriman, tidak ikut ke modul publik. |
| D-032 | Fokus Kelas 4 dulu sampai tuntas, baru kelas lain. |
| D-033 | Lisensi CC BY-NC 4.0 — boleh dipakai pribadi dan kalangan terbatas, tidak boleh untuk fungsi komersial, wajib cantumkan sumber. |

## Lisensi

Hak cipta © 2026 dfhstores-design. Soal-soal di repo ini dilisensikan di bawah **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**. Teks lengkap lisensinya ada di file [LICENSE](LICENSE), dan versi ringkasnya di https://creativecommons.org/licenses/by-nc/4.0/.

Artinya, dalam bahasa sederhana:

- **Boleh:** dipakai untuk keperluan pribadi dan kalangan terbatas (belajar sendiri, di kelas, di keluarga, di komunitas belajar non-komersial). Boleh dibagikan dan diubah/diadaptasi.
- **Tidak boleh:** dipakai untuk fungsi komersial — tidak boleh dijual, tidak boleh dipakai di aplikasi berbayar, dan tidak boleh dipakai untuk keuntungan komersial.
- **Wajib:** cantumkan sumbernya setiap kali memakai atau membagikan soal dari repo ini. Contoh pencantuman sumber:

  > Soal dari bank-soal-sd (github.com/dfhstores-design/bank-soal-sd), lisensi CC BY-NC 4.0.

## Rencana ke depan

Yang belum dilakukan — README ini akan diperbarui mengikuti perkembangan bank soal:

- **BI, IPAS, PP Kelas 4** — menunggu foto daftar isi buku dari Andri.
- **Kelas 1-3 dan Kelas 5-6** — belum diisi; dikerjakan setelah Kelas 4 tuntas (D-032).
- **Tinjauan guru** — 745 soal draf Kelas 4 masih menunggu ditinjau guru (D-014, batas 14 hari, D-028).
- **Generator soal** — aplikasi form + Google Apps Script untuk guru/orang tua membuat soal sendiri (D-029), belum dibangun.
- **Kiriman kontributor** — folder `singgah/` sudah siap menerima kiriman; proses tinjauannya berjalan mengikuti D-028.
