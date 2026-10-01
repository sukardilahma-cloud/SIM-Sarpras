import * as XLSX from 'xlsx';
import { SarprasRecord, RecordType } from '../types';

export const RECORD_TYPE_LABELS: Record<string, string> = {
  tanah: 'KIB A — Tanah',
  peralatan: 'KIB B — Peralatan & Mesin',
  gedung: 'KIB C — Gedung & Bangunan',
  jalan: 'KIB D — Jalan, Irigasi & Jaringan',
  buku: 'KIB E — Buku Perpustakaan',
  habis_pakai: 'Barang Habis Pakai / ATK',
  ruangan: 'Data Ruangan',
  peminjaman: 'Peminjaman Aset',
};

// Standard unified column format for both Export and Import to guarantee perfect sync
export function recordToRow(r: SarprasRecord): Record<string, any> {
  return {
    'ID Sistem': r.__backendId || '',
    'Kategori KIB': RECORD_TYPE_LABELS[r.record_type] || r.record_type,
    'Sub Tipe': r.sub_type || '',
    'Kode Barang / Aset': r.kode || '',
    'Nama Barang / Aset': r.nama || '',
    'Jumlah': r.jumlah !== undefined && r.jumlah !== null ? Number(r.jumlah) : 1,
    'Satuan': r.satuan || (r.record_type === 'habis_pakai' ? 'Pcs' : 'Unit'),
    'Kondisi': r.kondisi || 'Baik',
    'Tahun': r.tahun || '',
    'Gedung': r.gedung || '',
    'Ruangan': r.ruangan || '',
    'Lokasi': r.lokasi || '',
    'Penanggung Jawab': r.penanggung_jawab || '',
    'Pengguna': r.pengguna || '',
    'Peminjam': r.peminjam || '',
    'Keperluan': r.keperluan || '',
    'Sumber Dana': r.sumber || '',
    'Pengarang Buku': r.pengarang || '',
    'Status': r.status || 'Aktif',
    'Luas': r.luas || '',
    'Status Hak / Sertifikat': r.status_kepemilikan || '',
    'Tgl Kembali': r.tgl_kembali || '',
    'Keterangan': r.keterangan || '',
    'Tanggal Catat': r.tanggal || '',
  };
}

export function rowToRecord(row: Record<string, any>, fallbackType?: RecordType): Partial<SarprasRecord> | null {
  const backendId = String(
    row['ID Sistem'] ||
    row['ID'] ||
    row['id'] ||
    row['__backendId'] ||
    ''
  ).trim();

  const kode = String(
    row['Kode Barang / Aset'] ||
    row['Kode Barang'] ||
    row['Kode Buku'] ||
    row['Kode Ruangan'] ||
    row['Kode'] ||
    row['kode'] ||
    ''
  ).trim();

  const nama = String(
    row['Nama Barang / Aset'] ||
    row['Nama Peralatan'] ||
    row['Judul Buku'] ||
    row['Nama Tanah'] ||
    row['Nama Gedung'] ||
    row['Nama Infrastruktur'] ||
    row['Nama Ruangan'] ||
    row['Nama Barang'] ||
    row['Nama'] ||
    row['nama'] ||
    ''
  ).trim();

  if (!nama && !kode) return null;

  // Determine category
  const rawKat = String(
    row['Kategori KIB'] ||
    row['Kategori'] ||
    row['Jenis Data'] ||
    row['record_type'] ||
    ''
  ).toLowerCase();

  let recType: SarprasRecord['record_type'] = fallbackType && fallbackType !== 'cetak_kib' && fallbackType !== 'per_ruangan' ? fallbackType : 'peralatan';

  if (rawKat.includes('tanah') || rawKat.includes('kib a')) recType = 'tanah';
  else if (rawKat.includes('alat') || rawKat.includes('mesin') || rawKat.includes('kib b')) recType = 'peralatan';
  else if (rawKat.includes('gedung') || rawKat.includes('bangunan') || rawKat.includes('kib c')) recType = 'gedung';
  else if (rawKat.includes('jalan') || rawKat.includes('jaringan') || rawKat.includes('irigasi') || rawKat.includes('kib d')) recType = 'jalan';
  else if (rawKat.includes('buku') || rawKat.includes('perpustakaan') || rawKat.includes('kib e')) recType = 'buku';
  else if (rawKat.includes('habis') || rawKat.includes('atk')) recType = 'habis_pakai';
  else if (rawKat.includes('ruang')) recType = 'ruangan';
  else if (rawKat.includes('pinjam')) recType = 'peminjaman';

  return {
    ...(backendId ? { __backendId: backendId } : {}),
    record_type: recType,
    sub_type: (row['Sub Tipe'] as any) || (recType === 'habis_pakai' ? 'master' : ''),
    kode: kode || ('KOD-' + Math.random().toString(36).substring(2, 7).toUpperCase()),
    nama: nama || 'Tanpa Nama',
    jumlah: row['Jumlah'] !== undefined && row['Jumlah'] !== '' ? Number(row['Jumlah']) : (row['Sisa Stok'] ? Number(row['Sisa Stok']) : 1),
    satuan: String(row['Satuan'] || (recType === 'habis_pakai' ? 'Pcs' : 'Unit')).trim(),
    kondisi: String(row['Kondisi'] || 'Baik').trim(),
    tahun: row['Tahun'] || row['Tahun Pengadaan'] || row['Tahun Terbit'] || '',
    gedung: String(row['Gedung'] || '').trim(),
    ruangan: String(row['Ruangan'] || '').trim(),
    lokasi: String(row['Lokasi'] || '').trim(),
    penanggung_jawab: String(row['Penanggung Jawab'] || '').trim(),
    pengguna: String(row['Pengguna'] || '').trim(),
    peminjam: String(row['Peminjam'] || '').trim(),
    keperluan: String(row['Keperluan'] || '').trim(),
    sumber: String(row['Sumber Dana'] || row['Sumber'] || '').trim(),
    pengarang: String(row['Pengarang Buku'] || row['Pengarang'] || '').trim(),
    status: String(row['Status'] || 'Aktif').trim(),
    luas: row['Luas'] || '',
    status_kepemilikan: String(row['Status Hak / Sertifikat'] || row['Status Hak'] || '').trim(),
    tgl_kembali: String(row['Tgl Kembali'] || '').trim(),
    keterangan: String(row['Keterangan'] || '').trim(),
    tanggal: String(row['Tanggal Catat'] || row['Tanggal'] || new Date().toISOString().slice(0, 10)).trim(),
  };
}

/**
 * EKSPOR SELURUH DATA KE DALAM 1 BUKU KERJA EXCEL LENGKAP (.xlsx)
 * Format sama persis dengan yang dibaca oleh pengimpor data aplikasi!
 */
export function exportAllRecordsToExcel(records: SarprasRecord[]) {
  if (!records.length) {
    throw new Error('Tidak ada data inventaris yang dapat diekspor.');
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Master SEMUA_DATA (Master sheet for direct bidirectional synchronization)
  const allRows = records.map(recordToRow);
  const masterSheet = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(workbook, masterSheet, 'SEMUA_DATA');

  // Sheet per Kategori untuk kemudahan rekap
  const categories: Array<{ id: SarprasRecord['record_type']; sheetName: string }> = [
    { id: 'tanah', sheetName: 'KIB_A_Tanah' },
    { id: 'peralatan', sheetName: 'KIB_B_Peralatan' },
    { id: 'gedung', sheetName: 'KIB_C_Gedung' },
    { id: 'jalan', sheetName: 'KIB_D_Jalan' },
    { id: 'buku', sheetName: 'KIB_E_Buku' },
    { id: 'habis_pakai', sheetName: 'Barang_Habis_Pakai' },
    { id: 'ruangan', sheetName: 'Data_Ruangan' },
    { id: 'peminjaman', sheetName: 'Peminjaman_Aset' },
  ];

  for (const cat of categories) {
    const subset = records.filter(r => r.record_type === cat.id);
    if (subset.length > 0) {
      const catRows = subset.map(recordToRow);
      const catSheet = XLSX.utils.json_to_sheet(catRows);
      XLSX.utils.book_append_sheet(workbook, catSheet, cat.sheetName);
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `SARPRAS_SEMUA_DATA_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * EKSPOR SELURUH DATA KE DALAM FILE JSON LENGKAP (.json)
 */
export function exportAllRecordsToJSON(records: SarprasRecord[]) {
  if (!records.length) {
    throw new Error('Tidak ada data inventaris yang dapat diekspor.');
  }
  const jsonStr = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `SARPRAS_BACKUP_SEMUA_DATA_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * IMPOR SELURUH DATA DARI FILE EXCEL (.xlsx / .xls)
 * Mendukung format SEMUA_DATA maupun per sheet kategori.
 */
export async function parseAllRecordsExcelFile(file: File): Promise<Partial<SarprasRecord>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || !workbook.SheetNames.length) {
          throw new Error('Berkas Excel tidak memiliki lembar kerja (sheet).');
        }

        const parsed: Partial<SarprasRecord>[] = [];

        // 1. Jika ada sheet SEMUA_DATA, utamakan membaca sheet tersebut untuk menghindari duplikasi
        if (workbook.SheetNames.includes('SEMUA_DATA')) {
          const sheet = workbook.Sheets['SEMUA_DATA'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          for (const row of rows) {
            const rec = rowToRecord(row);
            if (rec && rec.nama) parsed.push(rec);
          }
        } else {
          // 2. Baca seluruh sheet yang ada
          for (const sName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sName];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            // Infer category from sheet name if possible
            let sType: RecordType | undefined;
            const snLower = sName.toLowerCase();
            if (snLower.includes('tanah')) sType = 'tanah';
            else if (snLower.includes('alat') || snLower.includes('mesin')) sType = 'peralatan';
            else if (snLower.includes('gedung') || snLower.includes('bangunan')) sType = 'gedung';
            else if (snLower.includes('jalan') || snLower.includes('jaringan')) sType = 'jalan';
            else if (snLower.includes('buku')) sType = 'buku';
            else if (snLower.includes('habis') || snLower.includes('atk')) sType = 'habis_pakai';
            else if (snLower.includes('ruang')) sType = 'ruangan';
            else if (snLower.includes('pinjam')) sType = 'peminjaman';

            for (const row of rows) {
              const rec = rowToRecord(row, sType);
              if (rec && rec.nama) parsed.push(rec);
            }
          }
        }

        if (!parsed.length) {
          throw new Error('Tidak ditemukan baris data yang valid pada berkas Excel yang diunggah.');
        }

        resolve(parsed);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * IMPOR SELURUH DATA DARI FILE JSON (.json)
 */
export async function parseJSONFile(file: File): Promise<Partial<SarprasRecord>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error('Format berkas JSON harus berupa daftar (array) data inventaris.');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error('Berkas JSON tidak valid: ' + err.message));
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsText(file);
  });
}

/**
 * UNDUH TEMPLATE EXCEL KOSONG DENGAN CONTOH LENGKAP
 */
export function downloadExcelTemplate() {
  const sampleData: SarprasRecord[] = [
    {
      __backendId: '',
      tanggal: new Date().toISOString().slice(0, 10),
      record_type: 'tanah',
      kode: '01.01.01.01.001',
      nama: 'Tanah Bangunan Sekolah SMK Negeri 1',
      luas: '15000 m²',
      status_kepemilikan: 'Sertifikat Hak Pakai No. 12',
      lokasi: 'Jl. Hi. Zakaria Imban, Molinow',
      tahun: 1985,
      jumlah: 1,
      satuan: 'Bidang',
      kondisi: 'Baik',
      keterangan: 'Aset Lahan Induk Sekolah',
    },
    {
      __backendId: '',
      tanggal: new Date().toISOString().slice(0, 10),
      record_type: 'peralatan',
      kode: '02.06.01.02.001',
      nama: 'Laptop ASUS ExpertBook B1400',
      jumlah: 15,
      satuan: 'Unit',
      kondisi: 'Baik',
      gedung: 'Gedung Lab Komputer',
      ruangan: 'Lab RPL 1',
      penanggung_jawab: 'Drs. Sartono Paputungan',
      tahun: 2023,
      sumber: 'BOS Reguler',
      keterangan: 'Inventaris Lab RPL',
    },
    {
      __backendId: '',
      tanggal: new Date().toISOString().slice(0, 10),
      record_type: 'gedung',
      kode: '03.11.01.01.002',
      nama: 'Gedung Laboratorium Praktik Kejuruan',
      luas: '450 m²',
      lokasi: 'Sayap Barat Sekolah',
      kondisi: 'Baik',
      tahun: 2018,
      jumlah: 1,
      satuan: 'Gedung',
      keterangan: 'Bangunan 2 Lantai',
    },
    {
      __backendId: '',
      tanggal: new Date().toISOString().slice(0, 10),
      record_type: 'buku',
      kode: '05.17.01.03.045',
      nama: 'Pemrograman Web dan Perangkat Bergerak SMK/MAK XI',
      pengarang: 'Patwiyanto, M.Kom',
      jumlah: 36,
      satuan: 'Buku',
      kondisi: 'Baik',
      tahun: 2022,
      gedung: 'Perpustakaan',
      ruangan: 'Ruang Baca',
      keterangan: 'Buku Paket Kurikulum Merdeka',
    },
    {
      __backendId: '',
      tanggal: new Date().toISOString().slice(0, 10),
      record_type: 'habis_pakai',
      sub_type: 'master',
      kode: '06.01.001',
      nama: 'Kertas HVS A4 75 GSM SiDU',
      jumlah: 50,
      satuan: 'Rim',
      kondisi: 'Baik',
      sumber: 'BOS',
      keterangan: 'Stok ATK Ruang Tata Usaha',
    },
  ];

  const workbook = XLSX.utils.book_new();
  const rows = sampleData.map(recordToRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'SEMUA_DATA');

  XLSX.writeFile(workbook, 'TEMPLATE_SARPRAS_INVENTARIS.xlsx');
}

/**
 * Ekspor Data Kategori Tertentu
 */
export function exportRecordsToExcel(records: SarprasRecord[], currentType: RecordType, typeTitle: string) {
  if (!records.length) {
    throw new Error('Tidak ada data yang dapat diekspor.');
  }

  const formattedData = records.map(recordToRow);
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  const sheetName = typeTitle.substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `SARPRAS_${currentType.toUpperCase()}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Impor Data Kategori Tertentu
 */
export async function parseExcelFile(file: File, targetType: RecordType): Promise<Partial<SarprasRecord>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || !jsonRows.length) {
          throw new Error('File Excel kosong atau tidak memiliki baris data.');
        }

        const parsed: Partial<SarprasRecord>[] = [];

        for (const row of jsonRows) {
          const rec = rowToRecord(row, targetType);
          if (rec && rec.nama) {
            parsed.push(rec);
          }
        }

        resolve(parsed);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
