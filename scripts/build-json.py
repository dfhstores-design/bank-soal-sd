#!/usr/bin/env python3
"""Build JSON bank soal NaraNusa dari modul Markdown kelas-4.

Mengubah semua modul-*.md di kelas-4/<mapel>/ menjadi satu file JSON per mapel
di json/kelas-4/<mapel>.json. Hanya memakai standard library.

Jalankan dari mana saja; path di-resolve relatif terhadap root repo
(parent dari folder scripts/).
"""

import json
import re
import sys
from pathlib import Path

# --- Konfigurasi ----------------------------------------------------------

# Jumlah soal yang WAJIB cocok per mapel. Kalau meleset sedikit saja, build gagal.
EXPECTED_COUNTS = {
    "mtk": 135,
    "tik": 155,
    "pjok": 85,
    "seni": 105,
    "inggris": 75,
    "pai": 195,
}

MAPEL_ORDER = ["mtk", "tik", "pjok", "seni", "inggris", "pai"]

JENJANG = "kelas-4"
TANGGAL = "2026-11-25"

ROOT = Path(__file__).resolve().parent.parent
KELAS_DIR = ROOT / "kelas-4"
OUT_DIR = ROOT / "json" / JENJANG

HURUF = ["A", "B", "C", "D"]

# --- Regex ----------------------------------------------------------------

# Header modul: "# Modul MTK — Bab 2: Pecahan (Cluster Erlangga)"
RE_MODUL_BAB = re.compile(r"^#\s+Modul\s+.*?—\s*(Bab\s+[^:\n]+:\s*[^\(\n]+?)\s*(?:\(|$)", re.MULTILINE)

# Header sub-bab: "## Sub-bab A: ..." atau "## Unit 1: ..."
RE_SUB_BAB = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)

# Awal soal: "### Soal 1"
RE_SOAL = re.compile(r"^###\s+Soal\s+(\d+)\s*$", re.MULTILINE)

# Field soal (baris pertama). Nilai bisa lanjut di baris berikutnya.
RE_FIELD_PERTANYAAN = re.compile(r"^\*\*Pertanyaan:\*\*\s*(.*)$", re.MULTILINE)
RE_FIELD_JAWABAN = re.compile(r"^\*\*Jawaban benar:\*\*\s*(.*)$", re.MULTILINE)
RE_FIELD_PEMBAHASAN = re.compile(r"^\*\*Pembahasan:\*\*\s*(.*)$", re.MULTILINE)
RE_FIELD_RUJUKAN = re.compile(r"^\*\*Rujukan:\*\*\s*(.*)$", re.MULTILINE)

# Baris pilihan ganda: "A. ..." di awal baris.
RE_PILIHAN = re.compile(r"^([A-D])\.\s+(.*)$")

# Metadata opsional per soal ditulis sebagai komentar HTML JSON di modul.
# Hanya empat field provenance/status ini yang boleh dioverride.
RE_METADATA = re.compile(r"^<!-- Metadata soal: (\{.*\}) -->$", re.MULTILINE)
METADATA_FIELDS = {"sumber", "status", "pembuat", "tanggal"}


def die(msg):
    """Cetak error ke stderr lalu keluar dengan kode non-zero."""
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def split_lines(text):
    return text.replace("\r\n", "\n").replace("\r", "\n").split("\n")


def parse_bab(text):
    """Ambil nama bab dari header modul. Headernya di abaikan sebagai soal."""
    m = RE_MODUL_BAB.search(text)
    if not m:
        return None
    # Rapikan spasi ganda.
    return re.sub(r"\s+", " ", m.group(1)).strip()


def _collect_until(text, start_idx, stop_patterns):
    """Kumpulkan teks mulai start_idx (setelah baris field) sampai salah satu
    penanda stop (field baru, baris pemisah "---", atau "### Soal") muncul.

    Mengembalikan (string_isi, indeks_baris_penanda). Baris penanda tidak
    dikonsumsi; pemanggil yang memutuskan lanjut ke mana.
    """
    lines = text.split("\n")
    out = []
    i = start_idx
    while i < len(lines):
        line = lines[i]
        if any(p.match(line) for p in stop_patterns):
            break
        out.append(line)
        i += 1
    return "\n".join(out).strip(), i


def parse_soal_block(block, fpath, soal_no):
    """Parse satu blok soal (isi setelah "### Soal N").

    block: teks mentah blok, sudah dipotong sampai sebelum "### Soal" berikutnya.
    fpath, soal_no: dipakai untuk pesan error.

    Return dict dengan field mentah (tanpa metadata mapel/bab).
    """
    pertanyaan = None
    jawaban = None
    pembahasan = None
    rujukan = None
    pilihan = {}

    patterns = [
        RE_FIELD_JAWABAN,
        RE_FIELD_PEMBAHASAN,
        RE_FIELD_RUJUKAN,
        RE_FIELD_PERTANYAAN,
    ]

    # Ambil nilai untuk tiap field, tangkap multi-baris sampai penanda berikutnya.
    fields = {
        "pertanyaan": RE_FIELD_PERTANYAAN,
        "jawaban": RE_FIELD_JAWABAN,
        "pembahasan": RE_FIELD_PEMBAHASAN,
        "rujukan": RE_FIELD_RUJUKAN,
    }

    values = {}
    for name, pat in fields.items():
        m = pat.search(block)
        if not m:
            die(
                f"{fpath}: soal {soal_no} tidak punya field '{name}' "
                f"(penanda '{pat.pattern.split(chr(92))[0]}...')"
            )
        # Cari posisi baris setelah baris penanda field.
        start_line = block[: m.start()].count("\n") + 1
        body, _ = _collect_until(block, start_line, patterns + [re.compile(r"^---\s*$"), RE_SOAL])
        # Nilai sudah termasuk isi di kanan penanda pada baris pertama.
        first = m.group(1).strip()
        full = (first + ("\n" + body if body else "")).strip() if body else first
        if not full:
            die(f"{fpath}: soal {soal_no} field '{name}' kosong")
        values[name] = full

    # Ambil pilihan A-D: baris yang dimulai "A. ", dst.
    cur = None
    for line in block.split("\n"):
        pm = RE_PILIHAN.match(line)
        if pm:
            cur = pm.group(1)
            pilihan[cur] = pm.group(2).strip()
        elif cur is not None and line.strip() and not line.startswith(" "):
            # Lanjutan baris pilihan (rare) — tambahkan ke pilihan terakhir.
            if RE_FIELD_PERTANYAAN.match(line) or RE_FIELD_JAWABAN.match(line):
                cur = None
            elif RE_FIELD_PEMBAHASAN.match(line) or RE_FIELD_RUJUKAN.match(line):
                cur = None
            elif line.strip() == "---":
                cur = None
            else:
                # Bukan pilihan baru, bukan field -> abaikan.
                pass

    jawaban = values["jawaban"].strip().upper()

    # Metadata per soal opsional; tanpa metadata, default generator tetap berlaku.
    metadata_matches = RE_METADATA.findall(block)
    if len(metadata_matches) > 1:
        die(f"{fpath}: soal {soal_no} memiliki lebih dari satu komentar metadata")
    metadata = {}
    if metadata_matches:
        try:
            metadata = json.loads(metadata_matches[0])
        except json.JSONDecodeError as exc:
            die(f"{fpath}: metadata soal {soal_no} bukan JSON valid: {exc}")
        if not isinstance(metadata, dict):
            die(f"{fpath}: metadata soal {soal_no} harus berupa objek JSON")
        unknown_fields = set(metadata) - METADATA_FIELDS
        if unknown_fields:
            die(
                f"{fpath}: metadata soal {soal_no} memiliki field yang tidak diizinkan: "
                f"{sorted(unknown_fields)}"
            )
        for key, value in metadata.items():
            if not isinstance(value, str) or not value.strip():
                die(f"{fpath}: metadata soal {soal_no} field '{key}' harus berupa teks non-kosong")

    # Validasi jawaban.
    if jawaban not in HURUF:
        die(f"{fpath}: soal {soal_no} jawaban benar '{jawaban}' bukan A-D")

    # Validasi pilihan.
    if len(pilihan) != 4 or set(pilihan.keys()) != set(HURUF):
        die(
            f"{fpath}: soal {soal_no} harus punya tepat 4 pilihan (A-D), "
            f"ditemukan {sorted(pilihan.keys())}"
        )
    for h in HURUF:
        if not pilihan[h]:
            die(f"{fpath}: soal {soal_no} pilihan {h} kosong")

    return {
        "pertanyaan": values["pertanyaan"],
        "pilihan": [pilihan[h] for h in HURUF],
        "jawaban_benar": jawaban,
        "pembahasan": values["pembahasan"],
        "rujukan": values["rujukan"],
        "metadata": metadata,
    }


def parse_modul(path):
    """Parse satu file modul. Return (bab, list_of_soal_dict)."""
    text = path.read_text(encoding="utf-8")
    lines = split_lines(text)

    if not text.strip():
        return None, []

    bab = parse_bab(text)

    # Cari semua sub-bab dan posisi barisnya.
    sub_bab_positions = []
    for idx, line in enumerate(lines):
        if RE_SUB_BAB.match(line):
            m = RE_SUB_BAB.match(line)
            sub_bab_positions.append((idx, m.group(1).strip()))

    # Cari posisi semua "### Soal N".
    soal_positions = []
    for idx, line in enumerate(lines):
        m = RE_SOAL.match(line)
        if m:
            soal_positions.append((idx, int(m.group(1)), line))

    soal_list = []
    for si, (line_idx, soal_no, _raw) in enumerate(soal_positions):
        # Tentukan akhir blok: baris sebelum "### Soal" berikutnya, atau EOF.
        if si + 1 < len(soal_positions):
            end_idx = soal_positions[si + 1][0]
        else:
            end_idx = len(lines)
        block = "\n".join(lines[line_idx + 1 : end_idx])

        # Sub-bab yang berlaku = sub-bab terakhir sebelum soal ini.
        sub_bab = ""
        for pos, name in sub_bab_positions:
            if pos < line_idx:
                sub_bab = name
            else:
                break
        if not sub_bab:
            die(f"{path}: soal {soal_no} tidak berada di bawah sub-bab mana pun")

        # Ubah header sub-bab jadi format "A: Pembilang Satu" atau
        # "Unit 1: Where Are You From?".
        # Sub-bab "## Sub-bab A: ..." -> "A: ..." ; "## Unit 1: ..." -> "Unit 1: ...".
        m = re.match(r"^Sub-bab\s+(.+)$", sub_bab)
        if m:
            sub_bab_norm = m.group(1).strip()
        else:
            sub_bab_norm = sub_bab

        try:
            data = parse_soal_block(block, path, soal_no)
        except SystemExit:
            raise
        except Exception as exc:  # jaring pengaman
            die(f"{path}: gagal parse soal {soal_no}: {exc}")

        data["sub_bab"] = sub_bab_norm
        soal_list.append(data)

    return bab, soal_list


def main():
    if not KELAS_DIR.is_dir():
        die(f"Folder input tidak ditemukan: {KELAS_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    ringkasan = {}

    for mapel in MAPEL_ORDER:
        folder = KELAS_DIR / mapel
        if not folder.is_dir():
            die(f"Folder mapel tidak ditemukan: {folder}")

        modul_files = sorted(folder.glob("modul-*.md"))
        if not modul_files:
            die(f"Tidak ada file modul-*.md di {folder}")

        semua_soal = []
        for path in modul_files:
            bab, soal_list = parse_modul(path)
            if not soal_list:
                # Modul tanpa soal: lewati (tidak menambah hitungan).
                continue
            if bab is None:
                # Tidak ada header modul tapi ada soal -> gagal.
                die(f"{path}: tidak menemukan header modul '# Modul ... — Bab ...'")
            for s in soal_list:
                item = {
                    "pertanyaan": s["pertanyaan"],
                    "pilihan": s["pilihan"],
                    "jawaban_benar": s["jawaban_benar"],
                    "pembahasan": s["pembahasan"],
                    "rujukan": s["rujukan"],
                    "jenjang": JENJANG,
                    "mapel": mapel,
                    "bab": bab,
                    "sub_bab": s["sub_bab"],
                    "sumber": "Kurasi internal",
                    "status": "draf",
                    "pembuat": "Kurasi internal",
                    "tanggal": TANGGAL,
                }
                item.update(s["metadata"])
                semua_soal.append(item)

        expected = EXPECTED_COUNTS[mapel]
        got = len(semua_soal)
        if got != expected:
            die(
                f"Mapel '{mapel}': jumlah soal {got}, seharusnya {expected} "
                f"(selisih {got - expected}). Periksa file di {folder}"
            )

        # Tulis JSON (idempotent: timpa, format stabil).
        out_path = OUT_DIR / f"{mapel}.json"
        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(semua_soal, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

        ringkasan[mapel] = got
        total += got

    # Ringkasan.
    print("Build selesai:")
    for mapel in MAPEL_ORDER:
        print(f"  {mapel:8s}: {ringkasan[mapel]:4d} soal")
    print(f"  {'total':8s}: {total:4d} soal")
    print(f"Output: {OUT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
