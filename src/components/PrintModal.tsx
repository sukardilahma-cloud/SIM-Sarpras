import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { SarprasRecord, AppSettings, RecordType } from '../types';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRecords: SarprasRecord[];
  settings: AppSettings;
  initialType?: string;
  selectedPeminjamanRecord?: SarprasRecord | null;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  allRecords,
  settings,
  initialType = 'all',
  selectedPeminjamanRecord = null,
}) => {
  const [printType, setPrintType] = useState<string>(initialType);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up terblokir. Izinkan pop-up pada browser Anda untuk mencetak.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const escape = (str?: any) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Handle single Bukti Peminjaman
    if (selectedPeminjamanRecord) {
      const rec = selectedPeminjamanRecord;
      const tglPinjamFormatted = new Date(rec.tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const tglKembaliFormatted = rec.tgl_kembali
        ? new Date(rec.tgl_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Bukti Peminjaman Aset - ${escape(rec.kode)}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 25px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.4; }
            .kop { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
            .kop-logo { width: 75px; height: 75px; object-fit: contain; flex-shrink: 0; }
            .kop-placeholder { width: 75px; flex-shrink: 0; }
            .kop-content { flex: 1; text-align: center; }
            .kop-content h3 { margin: 0; font-size: 12.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-content h2 { margin: 2px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-content h1 { margin: 2px 0; font-size: 16pt; font-weight: 900; text-transform: uppercase; }
            .kop-content p { margin: 2px 0 0; font-size: 9pt; color: #222; }
            .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 18px 0; text-transform: uppercase; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 5px 4px; font-size: 11pt; vertical-align: top; }
            .info-table td.label { width: 30%; font-weight: bold; }
            .info-table td.colon { width: 3%; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 8px 10px; font-size: 10.5pt; }
            .items-table th { background: #f3f4f6; text-transform: uppercase; font-weight: bold; }
            .terms { font-size: 9.5pt; margin: 15px 0 25px 0; background: #fafafa; padding: 10px 14px; border: 1px solid #ddd; border-radius: 4px; }
            .terms ol { margin: 4px 0 0 16px; padding: 0; }
            .sig-table { width: 100%; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
            .sig-table td { width: 50%; text-align: center; vertical-align: top; font-size: 11pt; }
            .sig-space { height: 75px; }
            @media print { body { padding: 0; } @page { size: A4 portrait; margin: 1.5cm; } }
          </style>
        </head>
        <body>
          <div class="kop">
            ${settings.governmentLogo 
              ? `<img src="${settings.governmentLogo}" class="kop-logo" alt="Logo Pemda" />` 
              : (settings.schoolLogo ? `<img src="${settings.schoolLogo}" class="kop-logo" alt="Logo Sekolah" />` : '<div class="kop-placeholder"></div>')}
            <div class="kop-content">
              <h3>${escape(settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA')}</h3>
              <h2>${escape(settings.departmentName || 'DINAS PENDIDIKAN DAERAH')}</h2>
              <h1>${escape(settings.schoolName)}</h1>
              <p>${escape(settings.schoolAddress)}</p>
              ${(settings.schoolEmail || settings.schoolWebsite) ? `<p style="font-size: 8.5pt; margin-top: 1px;">${settings.schoolEmail ? `Email: ${escape(settings.schoolEmail)}` : ''} ${settings.schoolWebsite ? `&bull; Website: ${escape(settings.schoolWebsite)}` : ''}</p>` : ''}
            </div>
            ${settings.governmentLogo && settings.schoolLogo 
              ? `<img src="${settings.schoolLogo}" class="kop-logo" alt="Logo Sekolah" />` 
              : '<div class="kop-placeholder"></div>'}
          </div>
          <div class="doc-title">BUKTI TANDA TERIMA PEMINJAMAN SARANA & PRASARANA</div>
          <table class="info-table">
            <tr><td class="label">Nomor Dokumen</td><td class="colon">:</td><td>${escape(rec.__backendId)}</td></tr>
            <tr><td class="label">Tanggal Peminjaman</td><td class="colon">:</td><td>${escape(tglPinjamFormatted)}</td></tr>
            <tr><td class="label">Nama Peminjam</td><td class="colon">:</td><td><strong>${escape(rec.peminjam)}</strong></td></tr>
            <tr><td class="label">Rencana Pengembalian</td><td class="colon">:</td><td>${escape(tglKembaliFormatted)}</td></tr>
            <tr><td class="label">Status Saat Ini</td><td class="colon">:</td><td><strong>${escape(rec.status || 'Dipinjam')}</strong></td></tr>
          </table>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">No</th>
                <th style="width: 140px;">Kode Barang</th>
                <th>Nama Peralatan / Aset</th>
                <th style="width: 100px; text-align: center;">Jumlah</th>
                <th>Kondisi Saat Dipinjam</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td><strong>${escape(rec.kode)}</strong></td>
                <td>${escape(rec.nama)}</td>
                <td style="text-align: center;">${escape(rec.jumlah || 1)} Unit</td>
                <td>${escape(rec.kondisi || 'Baik')}</td>
              </tr>
            </tbody>
          </table>
          ${rec.keterangan ? `<p style="font-size: 10pt; margin-bottom: 15px;"><strong>Catatan Tambahan:</strong> ${escape(rec.keterangan)}</p>` : ''}
          <div class="terms">
            <strong>Ketentuan Peminjaman:</strong>
            <ol>
              <li>Peminjam bertanggung jawab penuh atas keutuhan, kebersihan, dan keselamatan peralatan.</li>
              <li>Peralatan harus dikembalikan tepat waktu sesuai tanggal rencana pengembalian.</li>
              <li>Kerusakan atau kehilangan wajib diganti sesuai dengan spesifikasi barang semula.</li>
            </ol>
          </div>
          <table class="sig-table">
            <tr>
              <td>
                <p>Peminjam,</p>
                <div class="sig-space"></div>
                <p><strong>( ${escape(rec.peminjam)} )</strong></p>
              </td>
              <td>
                <p>Kotamobagu, ${dateStr}<br>Pengelola Sarpras,</p>
                <div class="sig-space"></div>
                <p><strong>( ........................................ )</strong></p>
              </td>
            </tr>
          </table>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
      `);
      printWin.document.close();
      onClose();
      return;
    }

    // Handle KIB Reports
    const typesToRender = printType === 'all'
      ? ['tanah', 'peralatan', 'gedung', 'jalan', 'buku', 'habis_pakai', 'ruangan', 'peminjaman']
      : [printType];

    const renderSection = (typeKey: string) => {
      const list = allRecords.filter(r => r.record_type === typeKey);

      if (typeKey === 'tanah') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${r.luas ? escape(r.luas) + ' m²' : '-'}</td>
            <td>${escape(r.lokasi)}</td>
            <td>${escape(r.status_kepemilikan)}</td>
            <td style="text-align:center;">${escape(r.tahun)}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="7" class="empty-row">Tidak ada data tanah</td></tr>`;
        return `
          <div class="section-title">KARTU INVENTARIS BARANG (KIB A) — TANAH</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode</th><th>Nama Tanah</th><th>Luas</th><th>Lokasi</th><th>Status Hak</th><th>Tahun</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'peralatan') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${escape(r.gedung || '-')} / ${escape(r.ruangan || '-')}</td>
            <td style="text-align:center;">${escape(r.jumlah || 1)}</td>
            <td style="text-align:center;">${escape(r.kondisi || 'Baik')}</td>
            <td style="text-align:center;">${escape(r.tahun)}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="7" class="empty-row">Tidak ada data peralatan</td></tr>`;
        return `
          <div class="section-title">KARTU INVENTARIS BARANG (KIB B) — PERALATAN & MESIN</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode</th><th>Nama Peralatan</th><th>Gedung / Ruangan</th><th>Jumlah</th><th>Kondisi</th><th>Tahun</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'gedung') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${escape(r.lokasi)}</td>
            <td>${r.luas ? escape(r.luas) + ' m²' : '-'}</td>
            <td style="text-align:center;">${escape(r.kondisi || 'Baik')}</td>
            <td style="text-align:center;">${escape(r.tahun)}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="7" class="empty-row">Tidak ada data gedung</td></tr>`;
        return `
          <div class="section-title">KARTU INVENTARIS BARANG (KIB C) — GEDUNG & BANGUNAN</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode</th><th>Nama Gedung</th><th>Lokasi</th><th>Luas Bangunan</th><th>Kondisi</th><th>Tahun</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'jalan') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${escape(r.lokasi)}</td>
            <td>${r.luas ? escape(r.luas) + ' m' : '-'}</td>
            <td style="text-align:center;">${escape(r.kondisi || 'Baik')}</td>
            <td style="text-align:center;">${escape(r.tahun)}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="7" class="empty-row">Tidak ada data jalan/jaringan</td></tr>`;
        return `
          <div class="section-title">KARTU INVENTARIS BARANG (KIB D) — JALAN, IRIGASI & JARINGAN</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode</th><th>Nama Infrastruktur</th><th>Lokasi</th><th>Panjang</th><th>Kondisi</th><th>Tahun</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'buku') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${escape(r.pengarang || '-')}</td>
            <td style="text-align:center;">${escape(r.jumlah || 1)}</td>
            <td style="text-align:center;">${escape(r.kondisi || 'Baik')}</td>
            <td style="text-align:center;">${escape(r.tahun)}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="7" class="empty-row">Tidak ada data buku perpustakaan</td></tr>`;
        return `
          <div class="section-title">KARTU INVENTARIS BARANG (KIB E) — BUKU PERPUSTAKAAN</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode Buku</th><th>Judul Buku</th><th>Pengarang</th><th>Jumlah</th><th>Kondisi</th><th>Tahun Terbit</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'habis_pakai') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td style="text-align:center;">${escape(r.jumlah || 0)} ${escape(r.satuan || '')}</td>
            <td>${escape(r.sumber || '-')}</td>
            <td>${escape(r.keterangan || '-')}</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="6" class="empty-row">Tidak ada data barang habis pakai</td></tr>`;
        return `
          <div class="section-title">PERSEDIAAN BARANG HABIS PAKAI</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode</th><th>Nama Barang</th><th>Sisa Stok</th><th>Sumber</th><th>Keterangan</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'ruangan') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escape(r.kode)}</strong></td>
            <td>${escape(r.nama)}</td>
            <td>${escape(r.gedung || '-')}</td>
            <td>${escape(r.penanggung_jawab || '-')}</td>
            <td style="text-align:center;">Aktif</td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="6" class="empty-row">Tidak ada data ruangan</td></tr>`;
        return `
          <div class="section-title">DAFTAR RUANGAN SEKOLAH</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Kode Ruangan</th><th>Nama Ruangan</th><th>Gedung</th><th>Penanggung Jawab</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      if (typeKey === 'peminjaman') {
        let rows = list.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${escape(r.nama)}</td>
            <td><strong>${escape(r.peminjam)}</strong></td>
            <td style="text-align:center;">${escape(r.jumlah || 1)}</td>
            <td style="text-align:center;">${r.tgl_kembali ? escape(r.tgl_kembali) : '-'}</td>
            <td style="text-align:center;"><strong>${escape(r.status || 'Dipinjam')}</strong></td>
          </tr>
        `).join('');
        if (!rows) rows = `<tr><td colspan="6" class="empty-row">Tidak ada riwayat peminjaman</td></tr>`;
        return `
          <div class="section-title">DAFTAR PEMINJAMAN ASET SEKOLAH</div>
          <table>
            <thead><tr><th style="width:30px;">No</th><th>Peralatan</th><th>Nama Peminjam</th><th>Jumlah</th><th>Tgl Kembali Rencana</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      return '';
    };

    const bodySections = typesToRender.map(renderSection).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan KIB & Inventaris - ${settings.schoolName}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000; padding: 20px; margin: 0; }
          .kop { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 14px; }
          .kop-logo { width: 75px; height: 75px; object-fit: contain; flex-shrink: 0; }
          .kop-placeholder { width: 75px; flex-shrink: 0; }
          .kop-text { flex: 1; text-align: center; }
          .kop-text h3 { margin: 0; font-size: 12.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .kop-text h2 { margin: 2px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .kop-text h1 { margin: 2px 0; font-size: 16pt; font-weight: 900; text-transform: uppercase; }
          .kop-text p { margin: 2px 0 0; font-size: 8.5pt; color: #222; }
          .report-header { text-align: center; margin: 15px 0 20px 0; }
          .report-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .report-date { font-size: 8.5pt; color: #555; margin-top: 4px; }
          .section-title { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; background: #e5e7eb; padding: 4px 8px; border: 1px solid #000; margin-top: 15px; margin-bottom: 0; border-bottom: none; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9.5pt; }
          th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: middle; }
          th { background-color: #f3f4f6; font-weight: bold; font-size: 9pt; text-transform: uppercase; }
          .empty-row { text-align: center; color: #666; font-style: italic; padding: 8px; }
          .footer-sig { width: 100%; border-collapse: collapse; border: none; margin-top: 25px; page-break-inside: avoid; }
          .footer-sig td { border: none; padding: 0; text-align: center; vertical-align: top; }
          .sig-box { width: 280px; float: right; text-align: center; font-size: 9.5pt; }
          .sig-space { height: 65px; }
          @media print { body { padding: 0; } @page { size: A4 portrait; margin: 1.5cm; } }
        </style>
      </head>
      <body>
        <div class="kop">
          ${settings.governmentLogo 
            ? `<img src="${settings.governmentLogo}" class="kop-logo" alt="Logo Pemda" />` 
            : (settings.schoolLogo ? `<img src="${settings.schoolLogo}" class="kop-logo" alt="Logo Sekolah" />` : '<div class="kop-placeholder"></div>')}
          <div class="kop-text">
            <h3>${escape(settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA')}</h3>
            <h2>${escape(settings.departmentName || 'DINAS PENDIDIKAN DAERAH')}</h2>
            <h1>${escape(settings.schoolName)}</h1>
            <p>${escape(settings.schoolAddress)}</p>
            ${(settings.schoolEmail || settings.schoolWebsite) ? `<p style="font-size: 8.5pt; margin-top: 1px;">${settings.schoolEmail ? `Email: ${escape(settings.schoolEmail)}` : ''} ${settings.schoolWebsite ? `&bull; Website: ${escape(settings.schoolWebsite)}` : ''}</p>` : ''}
          </div>
          ${settings.governmentLogo && settings.schoolLogo 
            ? `<img src="${settings.schoolLogo}" class="kop-logo" alt="Logo Sekolah" />` 
            : '<div class="kop-placeholder"></div>'}
        </div>
        <div class="report-header">
          <div class="report-title">LAPORAN BUKU INVENTARIS SARANA & PRASARANA</div>
          <div class="report-date">Dicetak pada: ${dateStr} pukul ${timeStr}</div>
        </div>
        ${bodySections}
        <table class="footer-sig">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%;">
              <div class="sig-box">
                <p>Kotamobagu, ${dateStr}<br>Mengetahui,<br><strong>Kepala ${escape(settings.schoolName)}</strong></p>
                <div class="sig-space"></div>
                <p><strong>${escape(settings.principalName)}</strong><br>NIP. ${escape(settings.principalNip)}</p>
              </div>
            </td>
          </tr>
        </table>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWin.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {selectedPeminjamanRecord ? 'Cetak Tanda Terima Peminjaman' : 'Pilih Laporan KIB untuk Dicetak'}
              </h3>
              <p className="text-[11px] text-slate-500">Format Resmi Dokumen Dinas Pendidikan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {selectedPeminjamanRecord ? (
            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl space-y-1.5 text-blue-900">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Siap Cetak Bukti Tanda Terima</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Peminjam: <strong>{selectedPeminjamanRecord.peminjam}</strong><br />
                Aset: <strong>{selectedPeminjamanRecord.nama}</strong> ({selectedPeminjamanRecord.jumlah} Unit)
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Pilih Jenis Kartu / Laporan:</label>
              <select
                value={printType}
                onChange={e => setPrintType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Semua KIB (Laporan Rekapitulasi Lengkap)</option>
                <option value="tanah">KIB A — Tanah</option>
                <option value="peralatan">KIB B — Peralatan & Mesin</option>
                <option value="gedung">KIB C — Gedung & Bangunan</option>
                <option value="jalan">KIB D — Jalan, Irigasi & Jaringan</option>
                <option value="buku">KIB E — Buku Perpustakaan</option>
                <option value="habis_pakai">Barang Habis Pakai</option>
                <option value="ruangan">Data Ruangan</option>
                <option value="peminjaman">Peminjaman Aset</option>
              </select>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Petunjuk Cetak:</div>
            <p className="text-[11px] leading-relaxed">
              Jendela pratinjau cetak browser akan terbuka. Anda dapat langsung mencetak ke printer kertas atau memilih <strong>"Save as PDF"</strong> untuk menyimpan berkas digital.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
          >
            Batal
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Buka & Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
