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
      sheet.getRange(startRow, 1, rows.length, HEADER_ROW.length).setNumberFormat('@');
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

// D-035: Pasang fungsi di bawah pada skrip TERIKAT Sheet antrean,
// bukan pada project Apps Script web app generator standalone.

// =========================================================================
// D-035 — Checklist tinjauan + approve bulk
// =========================================================================

// Checklist tinjauan D-035 (dokumentasi; bukan header kolom):
// 1. Jawaban benar — kunci cocok dengan pembahasan.
// 2. Pembahasan benar dan nyambung dengan soal.
// 3. Materi sesuai bab/sub-bab yang dipilih kontributor.
// 4. Bahasa sesuai jenjang.
// 5. Soal original — bukan salinan kata-per-kata dari satu sumber.
// 6. Variasi kuat — bukan hafalan murni.
// 7. Empat pilihan masuk akal, tepat 1 yang benar.
const CHECKLIST_TINJAUAN_D035 = [
  'Jawaban benar',
  'Pembahasan nyambung',
  'Sesuai bab/sub-bab',
  'Bahasa sesuai jenjang',
  'Original',
  'Variasi kuat',
  '4 pilihan, 1 benar'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tinjauan')
    .addItem('Pasang kolom checklist', 'setupChecklistTinjauan')
    .addItem('Approve bulk (semua butir lolos)', 'approveBulkTinjauan')
    .addToUi();
}

/*
 * setupChecklistTinjauan — idempotent.
 * Menambah 7 kolom checkbox tinjauan setelah kolom terakhir, mencari kolom
 * catatan berdasarkan nama header yang mengandung "catat", dan memasang
 * validasi checkbox pada 7 kolom checklist.
 */
function setupChecklistTinjauan() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan.');
    }
    if (sheet.getLastRow() < 1) {
      throw new Error('Header sheet "' + SHEET_NAME + '" belum ada. Jalankan setupAntrean dulu.');
    }

    const lastColAwal = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastColAwal).getValues()[0];
    let lastCol = lastColAwal;

    const ditambah = [];
    const sudahAda = [];

    // Tambah 7 kolom checklist jika belum ada. Header dicek berdasarkan nama.
    for (let i = 0; i < CHECKLIST_TINJAUAN_D035.length; i++) {
      const nama = CHECKLIST_TINJAUAN_D035[i];
      const idx = cariIndexHeaderD035_(headers, nama);
      if (idx !== -1) {
        sudahAda.push(headers[idx - 1]);
      } else {
        lastCol++;
        sheet.getRange(1, lastCol).setValue(nama);
        headers[lastCol - 1] = nama;
        ditambah.push(nama);
      }
    }

    // Cari kolom catatan berdasarkan nama header yang mengandung "catat".
    let idxCatatan = cariIndexHeaderMengandungD035_(headers, 'catat');
    if (idxCatatan !== -1) {
      sudahAda.push(headers[idxCatatan - 1]);
    } else {
      lastCol++;
      const namaCatatan = 'Catatan tinjauan';
      sheet.getRange(1, lastCol).setValue(namaCatatan);
      headers[lastCol - 1] = namaCatatan;
      ditambah.push(namaCatatan);
      idxCatatan = lastCol;
    }

    // Pasang checkbox pada 7 kolom checklist.
    // Diterapkan sampai getMaxRows() agar baris baru di area sheet ikut
    // mendapat validasi. Jika sheet tumbuh melewati getMaxRows(), perlu
    // diperluas manual atau jalankan ulang fungsi ini.
    const validation = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    const maxRows = Math.max(sheet.getMaxRows(), 2);

    for (let c = 0; c < CHECKLIST_TINJAUAN_D035.length; c++) {
      const idx = cariIndexHeaderD035_(headers, CHECKLIST_TINJAUAN_D035[c]);
      if (idx === -1) {
        throw new Error('Kolom checklist tidak ditemukan: ' + CHECKLIST_TINJAUAN_D035[c]);
      }
      sheet.getRange(2, idx, maxRows - 1, 1).setDataValidation(validation);
    }

    const ringkasan = { ditambah: ditambah, sudahAda: sudahAda };
    Logger.log('setupChecklistTinjauan: ' + JSON.stringify(ringkasan));
    return ringkasan;
  } catch (err) {
    const pesan = err && err.message ? err.message : String(err);
    Logger.log('setupChecklistTinjauan gagal: ' + pesan);
    return { ditambah: [], sudahAda: [], error: pesan };
  }
}

/*
 * approveBulkTinjauan — approve baris berstatus "menunggu tinjauan" hanya
 * jika KE-7 checklist bernilai TRUE. Tidak menghapus baris, tidak mengubah
 * isi soal, dan tidak menyentuh baris yang sudah "lolos"/"ditolak".
 */
function approveBulkTinjauan() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan.');
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      const kosong = { disetujui: 0, masihMenunggu: 0, total: 0 };
      Logger.log('approveBulkTinjauan: ' + JSON.stringify(kosong));
      return kosong;
    }

    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    const idxStatus = cariIndexHeaderD035_(headers, 'status');
    if (idxStatus === -1) {
      throw new Error('Header "status" tidak ditemukan di baris 1.');
    }

    const idxChecklist = [];
    const checklistHilang = [];
    for (let i = 0; i < CHECKLIST_TINJAUAN_D035.length; i++) {
      const idx = cariIndexHeaderD035_(headers, CHECKLIST_TINJAUAN_D035[i]);
      idxChecklist.push(idx);
      if (idx === -1) {
        checklistHilang.push(CHECKLIST_TINJAUAN_D035[i]);
      }
    }
    if (checklistHilang.length > 0) {
      throw new Error(
        'Kolom checklist belum lengkap: ' + checklistHilang.join(', ') +
        '. Jalankan setupChecklistTinjauan dulu.'
      );
    }

    // Kolom tanggal tinjauan hanya dipakai jika header-nya jelas.
    // Header "tanggal" biasa TIDAK dipakai karena itu tanggal submit.
    const idxTanggalTinjauan = cariIndexTanggalTinjauanD035_(headers);

    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let disetujui = 0;
    let masihMenunggu = 0;

    for (let r = 0; r < data.length; r++) {
      const status = normalisasiHeaderD035_(data[r][idxStatus - 1]);
      if (status !== 'menunggu tinjauan') {
        continue;
      }

      let semuaLolos = true;
      for (let c = 0; c < idxChecklist.length; c++) {
        if (!nilaiCheckboxTrueD035_(data[r][idxChecklist[c] - 1])) {
          semuaLolos = false;
          break;
        }
      }

      if (semuaLolos) {
        const nomorBaris = r + 2;
        sheet.getRange(nomorBaris, idxStatus).setValue('lolos');
        if (idxTanggalTinjauan !== -1) {
          sheet.getRange(nomorBaris, idxTanggalTinjauan).setValue(new Date());
        }
        disetujui++;
      } else {
        masihMenunggu++;
      }
    }

    const ringkasan = {
      disetujui: disetujui,
      masihMenunggu: masihMenunggu,
      total: data.length
    };

    const infoTanggal = idxTanggalTinjauan !== -1
      ? 'tanggal tinjauan: ' + headers[idxTanggalTinjauan - 1]
      : 'tidak ada kolom tanggal tinjauan; hanya status yang diubah';

    Logger.log('approveBulkTinjauan: ' + JSON.stringify(ringkasan) + ' | ' + infoTanggal);
    return ringkasan;
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// Helper internal D-035
// =========================================================================

function normalisasiHeaderD035_(nilai) {
  if (nilai === null || nilai === undefined) {
    return '';
  }
  return nilai.toString().trim().toLowerCase();
}

function cariIndexHeaderD035_(headers, nama) {
  const target = normalisasiHeaderD035_(nama);
  for (let i = 0; i < headers.length; i++) {
    if (normalisasiHeaderD035_(headers[i]) === target) {
      return i + 1;
    }
  }
  return -1;
}

function cariIndexHeaderMengandungD035_(headers, kata) {
  const target = normalisasiHeaderD035_(kata);
  for (let i = 0; i < headers.length; i++) {
    if (normalisasiHeaderD035_(headers[i]).indexOf(target) !== -1) {
      return i + 1;
    }
  }
  return -1;
}

function cariIndexTanggalTinjauanD035_(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = normalisasiHeaderD035_(headers[i]);
    const adaTanggal = h.indexOf('tanggal') !== -1;
    const adaTinjau =
      h.indexOf('tinjau') !== -1 ||
      h.indexOf('peninjau') !== -1 ||
      h.indexOf('review') !== -1;

    if (adaTanggal && adaTinjau) {
      return i + 1;
    }
  }
  return -1;
}

function nilaiCheckboxTrueD035_(nilai) {
  if (nilai === true) {
    return true;
  }
  if (nilai === false || nilai === null || nilai === undefined || nilai === '') {
    return false;
  }
  return nilai.toString().trim().toUpperCase() === 'TRUE';
}
