/**
 * Code.gs — Backend Google Apps Script
 * Aplikasi Generator Soal — Bank Soal SD
 *
 * File ini bersama index.html dan data-bab.html membentuk satu
 * project Apps Script. JANGAN menyimpan API key di sini.
 */

// =========================================================================
// KONSTANTA
// =========================================================================

const SHEET_ID = 'PASTE_SHEET_ID_HERE'; // diganti saat deploy (Langkah 2)
const SHEET_NAME = 'Antrean';

const HEADER_ROW = [
  'tanggal',
  'jenjang',
  'mapel',
  'bab',
  'sub_bab',
  'pertanyaan',
  'pilihan_a',
  'pilihan_b',
  'pilihan_c',
  'pilihan_d',
  'jawaban_benar',
  'pembahasan',
  'rujukan',
  'sumber',
  'pembuat',
  'kontak',
  'status',
  'catatan_peninjau'
];

const FIELD_WAJIB = [
  'pertanyaan',
  'pilihan',
  'jawaban_benar',
  'pembahasan',
  'rujukan',
  'jenjang',
  'mapel',
  'bab',
  'sub_bab',
  'sumber',
  'status',
  'pembuat',
  'tanggal'
];

// =========================================================================
// PROMPT_TEMPLATE — terkunci di server, diserahkan ke klien via getPromptTemplate()
// =========================================================================

const PROMPT_TEMPLATE = `Anda adalah penyusun soal untuk Bank Soal SD. Tugas Anda: buatkan TEPAT 5 (lima) soal pilihan ganda untuk sub-bab berikut.

KONTEKS
- Jenjang: {{JENJANG}}
- Mata Pelajaran: {{MAPEL}}
- Bab: {{BAB}}
- Sub-bab: {{SUB_BAB}}
- Kontributor: {{NAMA}}
- Tanggal: {{TANGGAL}}

ATURAN WAJIB
1. Buatkan TEPAT 5 soal pilihan ganda. Jangan lebih, jangan kurang.
2. Setiap soal adalah objek JSON dengan TEPAT 14 field berikut (nama field persis sama, huruf kecil, pakai underscore):
   - "pertanyaan": string berisi teks soal DITAMBAH keempat pilihan tertulis A–D di dalamnya. Format persis seperti ini (pakai tanda newline):
       "Bilangan 4.805 dibaca ....\nA. empat ribu delapan ratus lima\nB. empat ribu delapan ratus lima puluh\nC. empat ribu delapan ratus lima belas\nD. empat ribu delapan ratus"
   - "pilihan": array berisi TEPAT 4 string (opsi tanpa label A/B/C/D — label hanya ada di dalam "pertanyaan"). Urutan array HARUS sesuai A, B, C, D.
   - "jawaban_benar": tepat satu huruf kapital: "A", "B", "C", atau "D".
   - "pembahasan": string singkat (1–3 kalimat) menjelaskan mengapa jawaban benar.
   - "rujukan": string berisi rujukan buku + bab + sub-bab (contoh: "Buku Matematika Kelas 4, Bab 1, Sub-bab Membaca Bilangan").
   - "jenjang": isi persis "{{JENJANG}}".
   - "mapel": isi persis "{{MAPEL}}".
   - "bab": isi persis "{{BAB}}".
   - "sub_bab": isi persis "{{SUB_BAB}}".
   - "sumber": isi persis "{{NAMA}}".
   - "status": isi persis "menunggu tinjauan".
   - "pembuat": isi persis "{{NAMA}}".
   - "tanggal": isi persis "{{TANGGAL}}".
3. Variasi kuat: gunakan topik buku sebagai bahan, tetapi soal HARUS menuntut anak menalar, membandingkan, menilai, atau menerapkan konsep — BUKAN hafalan definisi. Minimal 3 dari 5 soal adalah variasi kuat. Maksimal 1 soal berbentuk definisi/hafalan per sub-bab.
4. Larangan menyalin: JANGAN menyalin kata-per-kata dari sumber online mana pun. Soal HARUS original.
5. Jika mapel adalah PAI: hanya kutip terjemahan Bahasa Indonesia ayat/hadis yang terverifikasi. Teks Arab TIDAK boleh dikutip.
6. Bahasa: gunakan Bahasa Indonesia. Pengecualian: jika mapel adalah Bahasa Inggris, seluruh isi soal ditulis dalam Bahasa Inggris (field "pertanyaan", "pilihan", "pembahasan", "rujukan").
7. Distribusi jawaban benar harus bervariasi (jangan semua A, jangan semua B, dst.).
8. Output HANYA array JSON valid berisi 5 soal. TANPA markdown fence, TANPA penjelasan, TANPA teks lain di luar array JSON.`;

// =========================================================================
// doGet + include
// =========================================================================

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  return template
    .evaluate()
    .setTitle('Generator Soal — Bank Soal SD');
}

function include(namaFile) {
  return HtmlService.createHtmlOutputFromFile(namaFile).getContent();
}

// =========================================================================
// getPromptTemplate — dipanggil klien via google.script.run
// =========================================================================

function getPromptTemplate() {
  return PROMPT_TEMPLATE;
}

// =========================================================================
// submitSoal — validasi + tulis ke sheet Antrean
// =========================================================================

function submitSoal(payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Payload tidak valid.' };
    }

    // --- Validasi lisensi ---
    if (payload.lisensi !== true) {
      return { ok: false, error: 'Lisensi harus disetujui (lisensi: true).' };
    }

    // --- Validasi kontributor ---
    const kontributor = payload.kontributor || {};
    const nama = (kontributor.nama || '').toString().trim();
    const kontak = (kontributor.kontak || '').toString().trim();
    const media = (kontributor.media || '').toString().trim();

    if (!nama) {
      return { ok: false, error: 'Nama kontributor wajib diisi.' };
    }
    if (!kontak) {
      return { ok: false, error: 'Kontak kontributor wajib diisi.' };
    }
    if (media && media !== 'WA' && media !== 'email' && media !== 'keduanya') {
      return { ok: false, error: 'Media kontak harus "WA", "email", atau "keduanya".' };
    }

    // --- Validasi array soal ---
    const soalArr = payload.soal;
    if (!Array.isArray(soalArr) || soalArr.length === 0) {
      return { ok: false, error: 'Daftar soal kosong atau tidak valid.' };
    }

    // --- Validasi tiap soal ---
    for (let i = 0; i < soalArr.length; i++) {
      const s = soalArr[i];
      const idx = i + 1;
      if (!s || typeof s !== 'object') {
        return { ok: false, error: 'Soal ke-' + idx + ' bukan objek valid.' };
      }
      for (let f = 0; f < FIELD_WAJIB.length; f++) {
        const key = FIELD_WAJIB[f];
        if (!(key in s)) {
          return { ok: false, error: 'Soal ke-' + idx + ' tidak memiliki field "' + key + '".' };
        }
      }
      if (!Array.isArray(s.pilihan) || s.pilihan.length !== 4) {
        return { ok: false, error: 'Soal ke-' + idx + ': "pilihan" harus berisi tepat 4 opsi.' };
      }
      for (let p = 0; p < 4; p++) {
        if (typeof s.pilihan[p] !== 'string' || !s.pilihan[p].trim()) {
          return { ok: false, error: 'Soal ke-' + idx + ': opsi ke-' + (p + 1) + ' kosong.' };
        }
      }
      const jb = (s.jawaban_benar || '').toString().trim();
      if (!/^[A-D]$/.test(jb)) {
        return { ok: false, error: 'Soal ke-' + idx + ': "jawaban_benar" harus satu huruf A/B/C/D.' };
      }
    }

    // --- Persiapan sheet ---
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADER_ROW);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADER_ROW);
    }

    // --- Bangun baris (nilai server-side override) ---
    const rows = soalArr.map(function (s) {
      return [
        s.tanggal || '',
        s.jenjang || '',
        s.mapel || '',
        s.bab || '',
        s.sub_bab || '',
        s.pertanyaan || '',
        s.pilihan[0],
        s.pilihan[1],
        s.pilihan[2],
        s.pilihan[3],
        (s.jawaban_benar || '').toString().trim(),
        s.pembahasan || '',
        s.rujukan || '',
        nama,                 // sumber: override server
        nama,                 // pembuat: override server
        kontak + (media ? ' (' + media + ')' : ''),
        'menunggu tinjauan',  // status: override server
        ''                    // catatan_peninjau kosong saat submit
      ];
    });

    // --- Tulis dengan LockService (satu baris per soal) ---
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, HEADER_ROW.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }

    return { ok: true, jumlah: rows.length };
  } catch (err) {
    return { ok: false, error: 'Kesalahan server: ' + (err && err.message ? err.message : String(err)) };
  }
}

// =========================================================================
// setupAntrean — jalankan sekali manual saat deploy
// =========================================================================

function setupAntrean() {
  try {
    if (!SHEET_ID || SHEET_ID === 'PASTE_SHEET_ID_HERE') {
      return 'Gagal: SHEET_ID belum diisi. Ganti konstanta SHEET_ID dengan ID spreadsheet.';
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    let dibuat = false;

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      dibuat = true;
    }

    const firstRow = sheet.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
    const perluHeader = !firstRow[0] || firstRow[0] === '';

    if (perluHeader) {
      sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    }

    const pesan = [];
    pesan.push(dibuat ? 'Sheet "' + SHEET_NAME + '" dibuat.' : 'Sheet "' + SHEET_NAME + '" sudah ada.');
    pesan.push(perluHeader ? 'Header ditulis.' : 'Header sudah ada.');
    return pesan.join(' ');
  } catch (err) {
    return 'Gagal setup: ' + (err && err.message ? err.message : String(err));
  }
}