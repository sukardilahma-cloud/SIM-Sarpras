import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  School,
  Cloud,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  Building,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react';
import { AppSettings, UserAccount } from '../types';
import { storage } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  currentUser: UserAccount;
  onDatabaseRefreshed: () => void;
  onOpenDriveSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  currentUser,
  onDatabaseRefreshed,
  onOpenDriveSync,
}) => {
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    governmentName: settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA',
    departmentName: settings.departmentName || 'DINAS PENDIDIKAN DAERAH',
    governmentLogo: settings.governmentLogo || '',
    schoolLogo: settings.schoolLogo || '',
  });

  const [govLogoInputMode, setGovLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [govLogoUrlValue, setGovLogoUrlValue] = useState('');
  const govLogoInputRef = useRef<HTMLInputElement>(null);

  const [schoolLogoInputMode, setSchoolLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [schoolLogoUrlValue, setSchoolLogoUrlValue] = useState('');
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isClearingGoogle, setIsClearingGoogle] = useState(false);

  // Sync state whenever modal is opened with fresh settings
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        governmentName: settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA',
        departmentName: settings.departmentName || 'DINAS PENDIDIKAN DAERAH',
        governmentLogo: settings.governmentLogo || '',
        schoolLogo: settings.schoolLogo || '',
      });
      setGovLogoUrlValue(settings.governmentLogo?.startsWith('http') ? settings.governmentLogo : '');
      setSchoolLogoUrlValue(settings.schoolLogo?.startsWith('http') ? settings.schoolLogo : '');
      setErrorMsg('');
      setStatusMsg('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // --- Handlers for Government Logo ---
  const handleGovLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMsg('Ukuran file logo pemerintah maksimal 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setFormData(prev => ({ ...prev, governmentLogo: base64 }));
      setStatusMsg('Logo pemerintah daerah berhasil dimuat dari berkas.');
      setTimeout(() => setStatusMsg(''), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyGovLogoUrl = () => {
    if (!govLogoUrlValue.trim()) {
      setErrorMsg('Silakan masukkan tautan URL gambar logo pemerintah.');
      return;
    }
    setFormData(prev => ({ ...prev, governmentLogo: govLogoUrlValue.trim() }));
    setStatusMsg('Tautan URL logo pemerintah berhasil diterapkan.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const handleRemoveGovLogo = () => {
    setFormData(prev => ({ ...prev, governmentLogo: '' }));
    setGovLogoUrlValue('');
    if (govLogoInputRef.current) govLogoInputRef.current.value = '';
    setStatusMsg('Logo pemerintah telah dihapus.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  // --- Handlers for School Logo ---
  const handleSchoolLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMsg('Ukuran file logo sekolah maksimal 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setFormData(prev => ({ ...prev, schoolLogo: base64 }));
      setStatusMsg('Logo sekolah berhasil dimuat dari berkas lokal.');
      setTimeout(() => setStatusMsg(''), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySchoolLogoUrl = () => {
    if (!schoolLogoUrlValue.trim()) {
      setErrorMsg('Silakan masukkan tautan URL gambar logo sekolah.');
      return;
    }
    setFormData(prev => ({ ...prev, schoolLogo: schoolLogoUrlValue.trim() }));
    setStatusMsg('Tautan URL logo sekolah berhasil diterapkan.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const handleRemoveSchoolLogo = () => {
    setFormData(prev => ({ ...prev, schoolLogo: '' }));
    setSchoolLogoUrlValue('');
    if (schoolLogoInputRef.current) schoolLogoInputRef.current.value = '';
    setStatusMsg('Logo sekolah telah dihapus.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  // Reset Kop to defaults
  const handleResetKopDefaults = () => {
    if (currentUser.role !== 'super') return;
    setFormData(prev => ({
      ...prev,
      governmentName: 'PEMERINTAH PROVINSI SULAWESI UTARA',
      departmentName: 'DINAS PENDIDIKAN DAERAH',
    }));
    setStatusMsg('Pemerintah Daerah dan Dinas Pendidikan diatur ke standar Provinsi Sulawesi Utara.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  // Hapus Akun Google yang Terkunci
  const handleClearLockedGoogle = async () => {
    if (currentUser.role !== 'super') {
      setErrorMsg('Hanya Super Admin yang dapat menghapus kunci akun Google.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus akun Google yang telah terkunci? Sistem akan melepaskan kuncian akun Google sepenuhnya.')) {
      return;
    }

    setIsClearingGoogle(true);
    setErrorMsg('');
    try {
      const res = await storage.clearLockedGoogleAccount();
      setStatusMsg(res.message);
      onDatabaseRefreshed();
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus akun Google yang terkunci.');
    } finally {
      setIsClearingGoogle(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'super') {
      setErrorMsg('Akses ditolak: Hanya Super Admin yang memiliki hak untuk mengatur pengaturan kop surat dan identitas sekolah.');
      return;
    }
    try {
      storage.saveSettings(formData, currentUser.role);
      onSaveSettings(formData);
      setStatusMsg('Pengaturan identitas, logo pemerintah, logo sekolah, dan kop dokumen berhasil disimpan ke cloud.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan kop.');
    }
  };

  const handleExportJSON = () => {
    const jsonStr = storage.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP_SARPRAS_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('File cadangan database berhasil diunduh.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ev.target?.result as string;
        const res = await storage.importBackupJSON(content, currentUser.username);
        setStatusMsg(`Database berhasil dipulihkan! (${res.count} data).`);
        onDatabaseRefreshed();
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memulihkan database.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = () => {
    if (currentUser.role !== 'super') {
      alert('Hanya Super Admin yang dapat mengosongkan database.');
      return;
    }
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh data inventaris? Data yang sudah tersimpan akan dihapus.')) {
      storage.clearDatabase(currentUser.username);
      onDatabaseRefreshed();
      setStatusMsg('Seluruh data inventaris berhasil dibersihkan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Pengaturan Identitas & Kop Surat</h3>
              <p className="text-[11px] text-slate-500">Logo Pemerintah, Logo Sekolah, Dinas Pendidikan & Kop Resmi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs pr-1">
          {statusMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-center gap-2 animate-in fade-in">
              <X className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Drive Direct Action Banner */}
          {onOpenDriveSync && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3 shadow-md shadow-blue-500/20">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-blue-200 flex-shrink-0" />
                <div>
                  <div className="font-bold text-xs">Sinkronisasi Google Drive</div>
                  <div className="text-[10px] text-blue-100">
                    {settings.lastDriveBackupTime ? `Terakhir dicadangkan: ${settings.lastDriveBackupTime}` : 'Cadangkan basis data ke Google Drive Anda'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDriveSync();
                }}
                className="px-3 py-1.5 bg-white text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-50 transition shadow-xs flex-shrink-0"
              >
                Buka Drive
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <School className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm">Identitas Instansi & Pengaturan Kop Surat</span>
              </div>
              {currentUser.role !== 'super' ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                  Khusus Super Admin (Terkunci)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResetKopDefaults}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                  title="Terapkan teks bawaan Pemprov Sulut"
                >
                  Set Bawaan Sulut
                </button>
              )}
            </div>

            {currentUser.role !== 'super' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong>Akses Dibatasi:</strong> Admin Umum tidak dapat mengubah identitas dinas, sekolah, logo, maupun pengaturan kop surat. Bagian ini hanya dapat diatur dan disimpan oleh <strong>Super Admin</strong>.
              </div>
            )}

            {/* DUAL LOGO INPUT SECTION (LOGO PEMERINTAH & LOGO SEKOLAH) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. LOGO PEMERINTAH (KOP KIRI) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>Logo Pemerintah (Kop Kiri)</span>
                  </label>
                  <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setGovLogoInputMode('upload')}
                      className={`px-1.5 py-0.5 rounded font-semibold transition ${
                        govLogoInputMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Unggah
                    </button>
                    <button
                      type="button"
                      onClick={() => setGovLogoInputMode('url')}
                      className={`px-1.5 py-0.5 rounded font-semibold transition ${
                        govLogoInputMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {formData.governmentLogo ? (
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 shadow-2xs flex items-center justify-center">
                        <img
                          src={formData.governmentLogo}
                          alt="Logo Pemerintah"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <Building className="w-5 h-5 mb-0.5" />
                        <span className="text-[8px] font-medium leading-tight">Logo Pemda</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {govLogoInputMode === 'upload' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          ref={govLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleGovLogoFileUpload}
                          disabled={currentUser.role !== 'super'}
                          className="hidden"
                          id="gov-logo-file-input"
                        />
                        <button
                          type="button"
                          disabled={currentUser.role !== 'super'}
                          onClick={() => govLogoInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3 text-blue-600" />
                          <span>{formData.governmentLogo ? 'Ganti File' : 'Pilih Berkas'}</span>
                        </button>
                        {formData.governmentLogo && currentUser.role === 'super' && (
                          <button
                            type="button"
                            onClick={handleRemoveGovLogo}
                            className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          disabled={currentUser.role !== 'super'}
                          placeholder="https://.../logo-pemda.png"
                          value={govLogoUrlValue}
                          onChange={e => setGovLogoUrlValue(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={currentUser.role !== 'super'}
                          onClick={handleApplyGovLogoUrl}
                          className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                        >
                          Set
                        </button>
                      </div>
                    )}
                    <p className="text-[9.5px] text-slate-500">Logo Pemprov/Daerah (dicetak di sisi kiri kop).</p>
                  </div>
                </div>
              </div>

              {/* 2. LOGO SEKOLAH (KOP KANAN) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Logo Sekolah (Kop Kanan)</span>
                  </label>
                  <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setSchoolLogoInputMode('upload')}
                      className={`px-1.5 py-0.5 rounded font-semibold transition ${
                        schoolLogoInputMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Unggah
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolLogoInputMode('url')}
                      className={`px-1.5 py-0.5 rounded font-semibold transition ${
                        schoolLogoInputMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {formData.schoolLogo ? (
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 shadow-2xs flex items-center justify-center">
                        <img
                          src={formData.schoolLogo}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <ImageIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[8px] font-medium leading-tight">Logo Sekolah</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {schoolLogoInputMode === 'upload' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          ref={schoolLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSchoolLogoFileUpload}
                          disabled={currentUser.role !== 'super'}
                          className="hidden"
                          id="school-logo-file-input"
                        />
                        <button
                          type="button"
                          disabled={currentUser.role !== 'super'}
                          onClick={() => schoolLogoInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3 text-blue-600" />
                          <span>{formData.schoolLogo ? 'Ganti File' : 'Pilih Berkas'}</span>
                        </button>
                        {formData.schoolLogo && currentUser.role === 'super' && (
                          <button
                            type="button"
                            onClick={handleRemoveSchoolLogo}
                            className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          disabled={currentUser.role !== 'super'}
                          placeholder="https://.../logo-sekolah.png"
                          value={schoolLogoUrlValue}
                          onChange={e => setSchoolLogoUrlValue(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={currentUser.role !== 'super'}
                          onClick={handleApplySchoolLogoUrl}
                          className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                        >
                          Set
                        </button>
                      </div>
                    )}
                    <p className="text-[9.5px] text-slate-500">Logo Satuan Pendidikan (dicetak di sisi kanan kop).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: INPUT KOP SURAT BERJENJANG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. PEMERINTAH PROVINSI */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>1. Pemerintah Daerah / Provinsi (Kop Surat Baris 1) *</span>
                  <span className="text-[10px] font-normal text-slate-400">Huruf Kapital</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    disabled={currentUser.role !== 'super'}
                    value={formData.governmentName || ''}
                    onChange={e => setFormData({ ...formData, governmentName: e.target.value })}
                    placeholder="PEMERINTAH PROVINSI SULAWESI UTARA"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 2. DINAS PENDIDIKAN DAERAH */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>2. Dinas / Lembaga Pengampu (Kop Surat Baris 2) *</span>
                  <span className="text-[10px] font-normal text-slate-400">Huruf Kapital</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={currentUser.role !== 'super'}
                  value={formData.departmentName || ''}
                  onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                  placeholder="DINAS PENDIDIKAN DAERAH"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* 3. NAMA SATUAN PENDIDIKAN */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>3. Nama Sekolah / Satuan Pendidikan (Kop Surat Baris 3) *</span>
                  <span className="text-[10px] font-normal text-slate-400">Nama Utama Dokumen</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={currentUser.role !== 'super'}
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="SMK NEGERI 1 KOTAMOBAGU"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* 4. ALAMAT & KONTAK */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  4. Alamat Lengkap & Kontak Sekolah (Kop Surat Baris 4)
                </label>
                <textarea
                  disabled={currentUser.role !== 'super'}
                  value={formData.schoolAddress}
                  onChange={e => setFormData({ ...formData, schoolAddress: e.target.value })}
                  rows={2}
                  placeholder="Jalan Hi. Zakaria Imban, Kel. Molinow, Kec. Kotamobagu Barat, Kota Kotamobagu, Sulawesi Utara 95716"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* 5. EMAIL & WEBSITE */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email Resmi Sekolah</label>
                <input
                  type="email"
                  disabled={currentUser.role !== 'super'}
                  value={formData.schoolEmail || ''}
                  onChange={e => setFormData({ ...formData, schoolEmail: e.target.value })}
                  placeholder="smkn1kotamobagu@gmail.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Website Resmi Sekolah</label>
                <input
                  type="text"
                  disabled={currentUser.role !== 'super'}
                  value={formData.schoolWebsite || ''}
                  onChange={e => setFormData({ ...formData, schoolWebsite: e.target.value })}
                  placeholder="smkn1kotamobagu.sch.id"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* 6. KEPALA SEKOLAH & NIP */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  disabled={currentUser.role !== 'super'}
                  value={formData.principalName}
                  onChange={e => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="Drs. Sartono Paputungan, M.Pd"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  disabled={currentUser.role !== 'super'}
                  value={formData.principalNip}
                  onChange={e => setFormData({ ...formData, principalNip: e.target.value })}
                  placeholder="19680512 199303 1 008"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* LIVE PREVIEW OF KOP SURAT (DENGAN DUA LOGO: PEMDA & SEKOLAH) */}
            <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Pratinjau Langsung Kop Surat Dokumen (Real-Time)</span>
                </div>
                <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  Standar Kop Dokumen KIB
                </span>
              </div>

              {/* Paper Representation */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-300 shadow-xs">
                <div className="flex items-center justify-between gap-3 pb-3 border-b-[3px] border-double border-slate-900">
                  {/* Left Logo (Pemerintah) */}
                  {formData.governmentLogo ? (
                    <img
                      src={formData.governmentLogo}
                      alt="Logo Pemda"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0"
                    />
                  ) : formData.schoolLogo ? (
                    <div className="w-14 sm:w-16 flex-shrink-0 text-center text-[8px] text-slate-300">
                      (Logo Pemda)
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 text-[7px] text-center p-0.5 flex-shrink-0">
                      Logo Pemda
                    </div>
                  )}

                  {/* Center Text */}
                  <div className="flex-1 text-center font-serif text-slate-900">
                    <h4 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider leading-tight">
                      {formData.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA'}
                    </h4>
                    <h3 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wider leading-tight mt-0.5">
                      {formData.departmentName || 'DINAS PENDIDIKAN DAERAH'}
                    </h3>
                    <h2 className="text-[15px] sm:text-[17px] font-black uppercase tracking-wide leading-tight mt-0.5">
                      {formData.schoolName || 'SMK NEGERI 1 KOTAMOBAGU'}
                    </h2>
                    <p className="text-[9px] sm:text-[10px] font-sans text-slate-700 mt-1 leading-snug">
                      {formData.schoolAddress}
                    </p>
                    {(formData.schoolEmail || formData.schoolWebsite) && (
                      <p className="text-[8.5px] sm:text-[9.5px] font-sans text-slate-600 mt-0.5">
                        {formData.schoolEmail ? `Email: ${formData.schoolEmail}` : ''}
                        {formData.schoolEmail && formData.schoolWebsite ? ' • ' : ''}
                        {formData.schoolWebsite ? `Website: ${formData.schoolWebsite}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Right Logo (Sekolah) */}
                  {formData.schoolLogo ? (
                    <img
                      src={formData.schoolLogo}
                      alt="Logo Sekolah"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0"
                    />
                  ) : formData.governmentLogo ? (
                    <div className="w-14 sm:w-16 flex-shrink-0 text-center text-[8px] text-slate-300">
                      (Logo Sekolah)
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 text-[7px] text-center p-0.5 flex-shrink-0">
                      Logo Sekolah
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            {currentUser.role === 'super' ? (
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Pengaturan Kop Surat, Dinas & Kedua Logo</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 text-[11px] text-slate-400 italic text-center">
                Perubahan identitas sekolah & kop surat dinonaktifkan untuk peran Admin Umum.
              </div>
            )}
          </form>

          {/* SECTION 3: HAPUS AKUN GOOGLE TERKUNCI (SESUAI PERMINTAAN USER) */}
          {currentUser.role === 'super' && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <ShieldOff className="w-4 h-4 text-rose-600" />
                <span>Pengaturan Akun Google & Kuncian Sistem</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Jika sebelumnya terdapat akun Google yang terkunci atau terdaftar pada sistem, Anda dapat menghapus kuncian akun Google tersebut di bawah ini agar akses login sepenuhnya menggunakan Username & Password lokal tanpa akun Google.
              </p>
              <button
                type="button"
                onClick={handleClearLockedGoogle}
                disabled={isClearingGoogle}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingGoogle ? 'Menghapus Akun Google...' : 'Hapus Akun Google yang Telah Terkunci'}</span>
              </button>
            </div>
          )}

          {/* SECTION 4: Database Backup & Restore */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="font-bold text-slate-800">Cadangan & Pemulihan Berkas Lokal (JSON)</div>
            <p className="text-[11px] text-slate-500">
              Simpan berkas cadangan ke komputer atau ponsel Anda secara manual.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh JSON</span>
              </button>

              <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pulihkan JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>

            {currentUser.role === 'super' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClearDatabase}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Seluruh Data Inventaris</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
