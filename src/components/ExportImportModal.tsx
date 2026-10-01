import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Layers,
  ArrowRight,
  Database,
  FileText,
  Sparkles,
} from 'lucide-react';
import { SarprasRecord, UserRole } from '../types';
import { storage } from '../services/storage';
import {
  exportAllRecordsToExcel,
  exportAllRecordsToJSON,
  parseAllRecordsExcelFile,
  parseJSONFile,
  downloadExcelTemplate,
} from '../utils/excel';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    username: string;
    role: UserRole;
  };
  onDataChanged: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRecords, setPreviewRecords] = useState<Partial<SarprasRecord>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const records = storage.getRecords();

  const handleExportExcel = () => {
    try {
      exportAllRecordsToExcel(records);
      setStatusMsg({
        type: 'success',
        text: `Berhasil mengekspor ${records.length} data inventaris ke berkas Excel (.xlsx).`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal mengekspor data ke Excel.',
      });
    }
  };

  const handleExportJSON = () => {
    try {
      exportAllRecordsToJSON(records);
      setStatusMsg({
        type: 'success',
        text: `Berhasil mengekspor cadangan lengkap ${records.length} data inventaris ke berkas JSON (.json).`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal mengekspor data ke JSON.',
      });
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setStatusMsg(null);
    setIsParsing(true);

    try {
      let parsed: Partial<SarprasRecord>[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        parsed = await parseJSONFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        parsed = await parseAllRecordsExcelFile(file);
      } else {
        throw new Error('Format berkas tidak didukung. Harap pilih berkas .xlsx, .xls, atau .json.');
      }

      setPreviewRecords(parsed);
      setStatusMsg({
        type: 'info',
        text: `Berkas terdeteksi: ${parsed.length} baris data inventaris siap diimpor. Silakan periksa rincian di bawah lalu klik "Mulai Impor Data".`,
      });
    } catch (err: any) {
      setPreviewRecords([]);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal membaca berkas.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewRecords.length) return;

    if (
      importMode === 'replace' &&
      !confirm(
        'PERINGATAN: Mode Timpa Bersih akan MENGHAPUS seluruh data inventaris saat ini dan menggantinya dengan berkas yang diimpor. Apakah Anda yakin ingin melanjutkan?'
      )
    ) {
      return;
    }

    setIsImporting(true);
    setStatusMsg(null);

    try {
      const res = await storage.importRecords(previewRecords, currentUser.username, importMode);
      onDataChanged();
      setStatusMsg({
        type: 'success',
        text: `Impor Berhasil! ${res.added} data baru ditambahkan, ${res.updated} data lama diperbarui. Total ${res.total} data tersinkronisasi.`,
      });
      setSelectedFile(null);
      setPreviewRecords([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat memproses impor data.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Preview breakdown statistics
  const categoryCounts = previewRecords.reduce((acc, curr) => {
    const type = curr.record_type || 'peralatan';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Ekspor & Impor Seluruh Data Sarpras</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Sinkronisasi
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Format ekspor dan impor sama persis agar mudah menambahkan atau memperbarui data lama dan baru.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('export');
              setStatusMsg(null);
            }}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Seluruh Data ({records.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setStatusMsg(null);
            }}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Impor & Sinkron Data</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : statusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">{statusMsg.text}</div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'export' ? (
            /* TAB: EKSPOR SELURUH DATA */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Status Data Saat Ini</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Total data tersimpan di sistem: <strong>{records.length} item</strong> mencakup KIB A (Tanah), KIB B
                  (Peralatan & Mesin), KIB C (Gedung & Bangunan), KIB D (Jalan & Jaringan), KIB E (Buku), Barang Habis Pakai / ATK,
                  Ruangan, dan Peminjaman.
                </p>
              </div>

              {/* Card Ekspor Excel */}
              <div className="p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 transition space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Buku Kerja Excel Seluruh Data (.xlsx)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Format lengkap dengan lembar utama <code className="text-emerald-700 bg-emerald-100 px-1 rounded">SEMUA_DATA</code> serta lembar kategori KIB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Excel Seluruh Data ({records.length} Item)</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadExcelTemplate();
                      setStatusMsg({
                        type: 'info',
                        text: 'Template berkas Excel kosong dengan baris contoh berhasil diunduh.',
                      });
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs shadow-2xs transition"
                  >
                    <FileDown className="w-4 h-4 text-slate-500" />
                    <span>Unduh Template Format Kosong</span>
                  </button>
                </div>
              </div>

              {/* Card Ekspor Cadangan JSON */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Cadangan Penuh JSON (.json)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pencadangan murni 100% data mentah inventaris tanpa batasan sel ataupun rumus.
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleExportJSON}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan JSON</span>
                  </button>
                </div>
              </div>

              {/* Tips Singkronisasi */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Prinsip Singkronisasi Data:</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-800">
                  File Excel hasil ekspor ini memiliki struktur yang sama persis dengan yang dibaca oleh pengimpor data.
                  Anda dapat menambahkan baris baru di Excel atau mengedit nilai lama, lalu mengunggahnya kembali lewat tab <strong>"Impor & Sinkron Data"</strong>.
                  Data lama yang telah ada akan tetap terjaga dan data baru akan otomatis ditambahkan ke sistem.
                </p>
              </div>
            </div>
          ) : (
            /* TAB: IMPOR & SINKRON DATA */
            <div className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Pilih Cara Penggabungan Data:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                      importMode === 'merge'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Gabungkan (Merge)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Direkomendasikan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong>Tambah data baru & perbarui data lama.</strong> Data lain yang sudah tersimpan di aplikasi tetap aman dan tidak akan terhapus.
                    </p>
                  </div>

                  <div
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                      importMode === 'replace'
                        ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Timpa Bersih (Replace)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Hapus & Ganti
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mengosongkan basis data saat ini dan menggantinya sepenuhnya dengan data dari berkas impor.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Unggah Berkas Excel (.xlsx, .xls) atau JSON (.json):
                </label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:scale-105 transition shadow-2xs">
                    {isParsing ? <RefreshCw className="w-6 h-6 animate-spin text-blue-600" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      {selectedFile ? selectedFile.name : 'Klik untuk memilih berkas atau seret berkas ke sini'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Mendukung format .xlsx, .xls, .csv, dan .json
                    </span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                />
              </div>

              {/* Preview of Parsed Data */}
              {previewRecords.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Rincian Berkas yang Ditemukan ({previewRecords.length} Data)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(categoryCounts).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-700"
                      >
                        <span className="capitalize">{cat.replace('_', ' ')}</span>
                        <span className="font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Memproses sinkronisasi data...</span>
                        </>
                      ) : (
                        <>
                          <span>Mulai Impor & Sinkronisasi ({previewRecords.length} Data)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Hak Akses: <strong>Super Administrator</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
