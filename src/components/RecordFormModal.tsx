import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Camera, AlertCircle } from 'lucide-react';
import { SarprasRecord, RecordType } from '../types';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Partial<SarprasRecord>) => Promise<void>;
  editRecord?: SarprasRecord | null;
  activeType: RecordType;
  habisPakaiSubtype: 'master' | 'masuk' | 'keluar';
  allRecords: SarprasRecord[];
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editRecord,
  activeType,
  habisPakaiSubtype,
  allRecords,
}) => {
  const [formData, setFormData] = useState<Partial<SarprasRecord>>({});
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isEdit = !!editRecord;

  // Filter dropdown options
  const gedungList = Array.from(
    new Set(allRecords.filter(r => r.record_type === 'gedung' || r.gedung).map(r => r.nama || r.gedung))
  ).filter(Boolean) as string[];

  const ruanganList = Array.from(
    new Set(allRecords.filter(r => r.record_type === 'ruangan' || r.ruangan).map(r => r.nama || r.ruangan))
  ).filter(Boolean) as string[];

  const kibBList = allRecords.filter(r => r.record_type === 'peralatan');
  const hpMasterList = allRecords.filter(r => r.record_type === 'habis_pakai');

  useEffect(() => {
    if (editRecord) {
      setFormData({ ...editRecord });
      setPhotoPreview(editRecord.foto || '');
    } else {
      setFormData({
        record_type: (activeType === 'cetak_kib' || activeType === 'per_ruangan') ? 'peralatan' : (activeType as any),
        sub_type: activeType === 'habis_pakai' ? habisPakaiSubtype : '',
        jumlah: 1,
        kondisi: 'Baik',
        tahun: new Date().getFullYear(),
        status: activeType === 'peminjaman' ? 'Dipinjam' : 'Aktif',
      });
      setPhotoPreview('');
    }
    setErrorMessage('');
  }, [editRecord, activeType, habisPakaiSubtype, isOpen]);

  const handleFieldChange = (field: keyof SarprasRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setPhotoPreview(base64);
      setFormData(prev => ({ ...prev, foto: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Validate
      if (activeType === 'habis_pakai' && habisPakaiSubtype !== 'master') {
        if (!formData.kode) {
          throw new Error('Pilih barang habis pakai terlebih dahulu.');
        }
        if (!formData.jumlah || Number(formData.jumlah) <= 0) {
          throw new Error('Jumlah mutasi harus lebih besar dari 0.');
        }
      } else if (activeType === 'peminjaman') {
        if (!formData.kode) {
          throw new Error('Pilih peralatan KIB B yang ingin dipinjam.');
        }
        if (!formData.peminjam) {
          throw new Error('Nama peminjam wajib diisi.');
        }
      } else {
        if (!formData.kode?.trim()) {
          throw new Error('Kode data wajib diisi.');
        }
        if (!formData.nama?.trim()) {
          throw new Error('Nama aset wajib diisi.');
        }
      }

      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentType = (activeType === 'cetak_kib' || activeType === 'per_ruangan') ? 'peralatan' : activeType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isEdit ? 'Ubah Data' : 'Tambah Data'} —{' '}
              {currentType === 'tanah' && 'KIB A (Tanah)'}
              {currentType === 'peralatan' && 'KIB B (Peralatan & Mesin)'}
              {currentType === 'gedung' && 'KIB C (Gedung & Bangunan)'}
              {currentType === 'jalan' && 'KIB D (Jalan & Jaringan)'}
              {currentType === 'buku' && 'KIB E (Buku Perpustakaan)'}
              {currentType === 'habis_pakai' && (
                habisPakaiSubtype === 'master' ? 'Master Barang Habis Pakai' :
                habisPakaiSubtype === 'masuk' ? 'Transaksi Barang Masuk' : 'Transaksi Barang Keluar'
              )}
              {currentType === 'ruangan' && 'Data Ruangan'}
              {currentType === 'peminjaman' && 'Form Peminjaman Peralatan'}
            </h3>
            <p className="text-xs text-slate-500">
              Isi formulir dengan data yang valid dan lengkap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* HABIS PAKAI SELECT (for Masuk / Keluar) */}
              {currentType === 'habis_pakai' && habisPakaiSubtype !== 'master' && (
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pilih Barang Habis Pakai *</label>
                  <select
                    value={formData.kode || ''}
                    onChange={e => {
                      const sel = hpMasterList.find(h => h.kode === e.target.value);
                      handleFieldChange('kode', e.target.value);
                      if (sel) {
                        handleFieldChange('nama', sel.nama);
                        handleFieldChange('satuan', sel.satuan);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {hpMasterList.map(h => (
                      <option key={h.__backendId} value={h.kode}>
                        {h.kode} - {h.nama} (Sisa Stok: {h.jumlah || 0} {h.satuan || ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PEMINJAMAN SELECT PERALATAN */}
              {currentType === 'peminjaman' && (
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pilih Peralatan (KIB B) *</label>
                  <select
                    value={formData.kode || ''}
                    onChange={e => {
                      const sel = kibBList.find(b => b.kode === e.target.value);
                      handleFieldChange('kode', e.target.value);
                      if (sel) handleFieldChange('nama', sel.nama);
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Peralatan KIB B --</option>
                    {kibBList.map(b => (
                      <option key={b.__backendId} value={b.kode}>
                        {b.kode} - {b.nama} (Ruangan: {b.ruangan || '-'}, Kondisi: {b.kondisi})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* KODE BARANG */}
              {!(currentType === 'habis_pakai' && habisPakaiSubtype !== 'master') && currentType !== 'peminjaman' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {currentType === 'ruangan' ? 'Kode Ruangan *' : currentType === 'buku' ? 'Kode Buku *' : 'Kode Barang *'}
                  </label>
                  <input
                    type="text"
                    value={formData.kode || ''}
                    onChange={e => handleFieldChange('kode', e.target.value)}
                    placeholder="Contoh: TNH-001, PC-01..."
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* NAMA BARANG */}
              {!(currentType === 'habis_pakai' && habisPakaiSubtype !== 'master') && currentType !== 'peminjaman' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {currentType === 'ruangan' ? 'Nama Ruangan *' : currentType === 'buku' ? 'Judul Buku *' : 'Nama Aset *'}
                  </label>
                  <input
                    type="text"
                    value={formData.nama || ''}
                    onChange={e => handleFieldChange('nama', e.target.value)}
                    placeholder="Nama lengkap barang..."
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* LUAS / PANJANG */}
              {(currentType === 'tanah' || currentType === 'gedung') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Luas (m²)</label>
                  <input
                    type="number"
                    value={formData.luas || ''}
                    onChange={e => handleFieldChange('luas', e.target.value)}
                    placeholder="Contoh: 1200"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {currentType === 'jalan' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Panjang (meter)</label>
                  <input
                    type="number"
                    value={formData.luas || ''}
                    onChange={e => handleFieldChange('luas', e.target.value)}
                    placeholder="Contoh: 450"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* LOKASI */}
              {(currentType === 'tanah' || currentType === 'gedung' || currentType === 'jalan') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Lokasi / Alamat</label>
                  <input
                    type="text"
                    value={formData.lokasi || ''}
                    onChange={e => handleFieldChange('lokasi', e.target.value)}
                    placeholder="Kelurahan / Zona kompleks..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* STATUS HAK (KIB A) */}
              {currentType === 'tanah' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status Kepemilikan</label>
                  <select
                    value={formData.status_kepemilikan || ''}
                    onChange={e => handleFieldChange('status_kepemilikan', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Status Hak --</option>
                    <option value="Sertifikat Hak Milik (SHM)">Sertifikat Hak Milik (SHM)</option>
                    <option value="Hak Guna Bangunan (HGB)">Hak Guna Bangunan (HGB)</option>
                    <option value="Hak Pakai">Hak Pakai</option>
                    <option value="Sewa">Sewa</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              )}

              {/* GEDUNG (DROPDOWN) */}
              {(currentType === 'peralatan' || currentType === 'ruangan') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Gedung</label>
                  <input
                    type="text"
                    list="gedungOptions"
                    value={formData.gedung || ''}
                    onChange={e => handleFieldChange('gedung', e.target.value)}
                    placeholder="Pilih atau ketik gedung..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="gedungOptions">
                    {gedungList.map(g => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* RUANGAN (DROPDOWN) */}
              {currentType === 'peralatan' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ruangan</label>
                  <input
                    type="text"
                    list="ruanganOptions"
                    value={formData.ruangan || ''}
                    onChange={e => handleFieldChange('ruangan', e.target.value)}
                    placeholder="Pilih atau ketik ruangan..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="ruanganOptions">
                    {ruanganList.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* PENGARANG (BUKU) */}
              {currentType === 'buku' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pengarang / Penulis</label>
                  <input
                    type="text"
                    value={formData.pengarang || ''}
                    onChange={e => handleFieldChange('pengarang', e.target.value)}
                    placeholder="Nama pengarang buku..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* SATUAN (HABIS PAKAI) */}
              {currentType === 'habis_pakai' && habisPakaiSubtype === 'master' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Satuan *</label>
                  <input
                    type="text"
                    value={formData.satuan || ''}
                    onChange={e => handleFieldChange('satuan', e.target.value)}
                    placeholder="Rim, Box, Pcs, Roll, Lusin..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* JUMLAH */}
              {(currentType === 'peralatan' || currentType === 'buku' || currentType === 'habis_pakai' || currentType === 'peminjaman') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {currentType === 'habis_pakai'
                      ? habisPakaiSubtype === 'master'
                        ? 'Stok Awal'
                        : habisPakaiSubtype === 'masuk'
                        ? 'Jumlah Masuk *'
                        : 'Jumlah Keluar *'
                      : currentType === 'peminjaman'
                      ? 'Jumlah Dipinjam *'
                      : 'Jumlah Unit'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.jumlah || 1}
                    onChange={e => handleFieldChange('jumlah', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* KONDISI */}
              {(currentType === 'peralatan' || currentType === 'gedung' || currentType === 'jalan' || currentType === 'buku') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kondisi Fisik</label>
                  <select
                    value={formData.kondisi || 'Baik'}
                    onChange={e => handleFieldChange('kondisi', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              )}

              {/* TAHUN */}
              {currentType !== 'ruangan' && currentType !== 'habis_pakai' && currentType !== 'peminjaman' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {currentType === 'buku' ? 'Tahun Terbit' : 'Tahun Perolehan'}
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2099"
                    value={formData.tahun || ''}
                    onChange={e => handleFieldChange('tahun', e.target.value)}
                    placeholder="YYYY"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* SUMBER DANA */}
              {(currentType === 'peralatan' || currentType === 'buku' || (currentType === 'habis_pakai' && habisPakaiSubtype === 'masuk')) && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sumber Barang / Dana</label>
                  <input
                    type="text"
                    value={formData.sumber || ''}
                    onChange={e => handleFieldChange('sumber', e.target.value)}
                    placeholder="BOS Reguler, Hibah, APBD, DAK..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* PENGGUNA & KEPERLUAN (BARANG KELUAR) */}
              {currentType === 'habis_pakai' && habisPakaiSubtype === 'keluar' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nama Penerima / Pengguna *</label>
                    <input
                      type="text"
                      value={formData.pengguna || ''}
                      onChange={e => handleFieldChange('pengguna', e.target.value)}
                      placeholder="Nama guru / staf / unit kerja..."
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Keperluan Penggunaan</label>
                    <input
                      type="text"
                      value={formData.keperluan || ''}
                      onChange={e => handleFieldChange('keperluan', e.target.value)}
                      placeholder="Untuk ujian, KBM, administrasi TU..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* PENANGGUNG JAWAB */}
              {(currentType === 'peralatan' || currentType === 'gedung' || currentType === 'ruangan') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={formData.penanggung_jawab || ''}
                    onChange={e => handleFieldChange('penanggung_jawab', e.target.value)}
                    placeholder="Nama guru / kepala lab..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* PEMINJAM (PEMINJAMAN) */}
              {currentType === 'peminjaman' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nama Peminjam *</label>
                    <input
                      type="text"
                      value={formData.peminjam || ''}
                      onChange={e => handleFieldChange('peminjam', e.target.value)}
                      placeholder="Nama guru, siswa, atau staf..."
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Rencana Tanggal Pengembalian</label>
                    <input
                      type="date"
                      value={formData.tgl_kembali || ''}
                      onChange={e => handleFieldChange('tgl_kembali', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* FOTO UNGGAH (PERALATAN & BUKU) */}
              {(currentType === 'peralatan' || currentType === 'buku') && (
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {currentType === 'buku' ? 'Foto Sampul Buku' : 'Foto Aset / Fisik Barang'}
                  </label>
                  <div className="flex items-center gap-3">
                    {photoPreview ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreview('');
                            handleFieldChange('foto', '');
                          }}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200/80 transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{photoPreview ? 'Ganti Foto' : 'Unggah / Ambil Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* KETERANGAN */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Keterangan / Catatan Tambahan</label>
                <textarea
                  value={formData.keterangan || ''}
                  onChange={e => handleFieldChange('keterangan', e.target.value)}
                  placeholder="Catatan kondisi, nomor seri, kelengkapan, dll..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Data'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
