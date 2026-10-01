import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Map,
  Monitor,
  Building2,
  Route,
  BookOpen,
  Package,
  DoorOpen,
  Handshake,
  Printer,
  Plus,
  Search,
  FileSpreadsheet,
  Upload,
  QrCode,
  LogOut,
  Menu,
  X,
  TriangleAlert,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  Trash2,
  Edit,
  History,
  Users,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Eye,
  CheckCircle,
  AlertCircle,
  Cloud,
  UploadCloud,
  RefreshCw,
  HardDrive,
  Lock
} from 'lucide-react';
import { RecordType, SarprasRecord, UserAccount, LogActivity, AppSettings } from './types';
import { storage } from './services/storage';
import { signInWithGoogle, signOutGoogle } from './services/googleAuth';
import { PWAInstallButton } from './components/PWAInstallButton';
import { BarcodeModal } from './components/BarcodeModal';
import { RecordFormModal } from './components/RecordFormModal';
import { PrintModal } from './components/PrintModal';
import { UserManagementModal } from './components/UserManagementModal';
import { LogActivityModal } from './components/LogActivityModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { RegistrationPasswordModal } from './components/RegistrationPasswordModal';
import { ExportImportModal } from './components/ExportImportModal';
import { exportRecordsToExcel, parseExcelFile } from './utils/excel';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const VIEW_METADATA: Record<RecordType, { title: string; subtitle: string; columns: string[] }> = {
  tanah: {
    title: 'KIB A — Data Tanah',
    subtitle: 'Manajemen aset tanah dan lahan milik sekolah.',
    columns: ['Kode Barang', 'Nama Tanah', 'Luas', 'Lokasi', 'Status Hak', 'Tahun', 'Aksi'],
  },
  peralatan: {
    title: 'KIB B — Data Peralatan & Mesin',
    subtitle: 'Manajemen komputer, proyektor, alat laboratorium, dan mesin.',
    columns: ['Foto', 'Kode Barang', 'Nama Peralatan', 'Gedung / Ruangan', 'Jumlah', 'Kondisi', 'Tahun', 'Aksi'],
  },
  gedung: {
    title: 'KIB C — Data Gedung & Bangunan',
    subtitle: 'Fisik bangunan, ruang kelas, kantor, dan fasilitas bertingkat.',
    columns: ['Kode Barang', 'Nama Gedung', 'Lokasi', 'Luas', 'Kondisi', 'Tahun', 'Aksi'],
  },
  jalan: {
    title: 'KIB D — Jalan, Irigasi & Jaringan',
    subtitle: 'Infrastruktur jalan paving, drainase, dan jaringan instalasi fiber optic.',
    columns: ['Kode Barang', 'Nama Infrastruktur', 'Lokasi', 'Panjang', 'Kondisi', 'Tahun', 'Aksi'],
  },
  buku: {
    title: 'KIB E — Buku Perpustakaan',
    subtitle: 'Inventaris buku perpustakaan, literatur, dan bahan ajar kurikulum.',
    columns: ['Sampul', 'Kode Buku', 'Judul Buku', 'Pengarang', 'Jumlah', 'Kondisi', 'Tahun', 'Aksi'],
  },
  habis_pakai: {
    title: 'Barang Habis Pakai & ATK',
    subtitle: 'Persediaan stok perlengkapan, mutasi barang masuk, dan distribusi keluar.',
    columns: ['Kode Barang', 'Nama Barang', 'Satuan', 'Sisa Stok', 'Sumber Dana', 'Keterangan', 'Aksi'],
  },
  ruangan: {
    title: 'Data Ruangan Sekolah',
    subtitle: 'Daftar laboratorium, bengkel, ruang kelas, dan penanggung jawab.',
    columns: ['Kode Ruangan', 'Nama Ruangan', 'Gedung', 'Penanggung Jawab', 'Status', 'Aksi'],
  },
  peminjaman: {
    title: 'Peminjaman Peralatan (KIB B)',
    subtitle: 'Catatan peminjaman aktif dan pengembalian sarana prasarana.',
    columns: ['Peralatan', 'Nama Peminjam', 'Jumlah', 'Tgl Rencana Kembali', 'Status', 'Aksi'],
  },
  per_ruangan: {
    title: 'Inventaris per Ruangan',
    subtitle: 'Daftar seluruh sarana dan inventaris berdasarkan lokasi ruangan.',
    columns: ['Kode', 'Nama Aset', 'Gedung', 'Ruangan', 'Kondisi', 'Penanggung Jawab', 'Aksi'],
  },
  cetak_kib: {
    title: 'Buku Kartu Inventaris Barang (KIB)',
    subtitle: 'Pusat laporan resmi cetak KIB dan rekapitulasi sarana prasarana.',
    columns: ['Kategori KIB', 'Kode Aset', 'Nama Barang', 'Lokasi / Ruangan', 'Kondisi / Status', 'Aksi'],
  },
};

export default function App() {
  const isOnline = useOnlineStatus();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => storage.getCurrentUser());
  const [authMode, setAuthMode] = useState<'petugas' | 'google'>('petugas');
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isLocalLoggingIn, setIsLocalLoggingIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRegistrationPasswordModal, setShowRegistrationPasswordModal] = useState(false);
  const [pendingRegisteredAdmin, setPendingRegisteredAdmin] = useState<UserAccount | null>(null);
  const [showGoogleUnlock, setShowGoogleUnlock] = useState(false);

  // Application Data & Navigation State
  const [records, setRecords] = useState<SarprasRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [currentView, setCurrentView] = useState<'dashboard' | RecordType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGedung, setFilterGedung] = useState('');
  const [filterRuangan, setFilterRuangan] = useState('');
  const [filterCetakKib, setFilterCetakKib] = useState('all');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTargetRecord, setEditTargetRecord] = useState<SarprasRecord | null>(null);
  const [habisPakaiSubtype, setHabisPakaiSubtype] = useState<'master' | 'masuk' | 'keluar'>('master');

  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [selectedBarcodeRecord, setSelectedBarcodeRecord] = useState<SarprasRecord | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPeminjamanPrint, setSelectedPeminjamanPrint] = useState<SarprasRecord | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Load records on mount or when user changes, and initialize Firestore cross-device sync
  useEffect(() => {
    storage.initFirestoreSync();
    refreshData();

    const unsub = storage.subscribeDataChanges(() => {
      refreshData();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // Protect Cetak KIB route from Admin Umum
  useEffect(() => {
    if (currentUser?.role === 'umum' && currentView === 'cetak_kib') {
      setCurrentView('dashboard');
      showToast('Akses dibatasi: Admin Umum tidak memiliki hak untuk mencetak KIB.', 'error');
    }
  }, [currentUser, currentView]);

  // Protect admin-only modals from being opened by Admin Umum
  useEffect(() => {
    if (currentUser?.role === 'umum') {
      if (isDriveSyncModalOpen) setIsDriveSyncModalOpen(false);
      if (isLogModalOpen) setIsLogModalOpen(false);
      if (isSettingsModalOpen) setIsSettingsModalOpen(false);
      if (isUserModalOpen) setIsUserModalOpen(false);
    }
  }, [currentUser, isDriveSyncModalOpen, isLogModalOpen, isSettingsModalOpen, isUserModalOpen]);

  const refreshData = () => {
    const data = storage.getRecords();
    setRecords(data);
    setSettings(storage.getSettings());
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Google Sign-In & Activation Handler - STRICTLY 1 GOOGLE ACCOUNT
  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsGoogleLoggingIn(true);
    try {
      const { user: gUser } = await signInWithGoogle();
      const email = gUser.email || '';
      const name = gUser.displayName || email.split('@')[0] || 'Administrator Sekolah';
      const photoURL = gUser.photoURL || undefined;

      const { user, isNewRegistration } = await storage.registerOrLoginWithGoogle({
        email,
        name,
        photoURL,
      });

      // Update settings state immediately
      setSettings(storage.getSettings());

      if (isNewRegistration || !user.password) {
        setPendingRegisteredAdmin(user);
        setShowRegistrationPasswordModal(true);
        showToast('Akun Google terhubung! Silakan atur kata sandi administrator.', 'info');
      } else {
        setCurrentUser(user);
        showToast(`Selamat datang kembali, ${user.nama}!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Gagal masuk dengan Akun Google.');
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  // Local Login Handler (for staff credentials created by Super Admin)
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLocalLoggingIn(true);
    try {
      if (!loginUsername.trim() || !loginPassword.trim()) {
        throw new Error('Masukkan username dan password.');
      }
      const res = await storage.login(loginUsername, loginPassword);
      setCurrentUser(res.user);
      showToast(`Selamat datang, ${res.user.nama}!`, 'success');
    } catch (err: any) {
      setLoginError(err.message || 'Username atau password salah.');
    } finally {
      setIsLocalLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutGoogle();
    } catch {}
    storage.logout();
    setCurrentUser(null);
    setShowLogoutConfirm(false);
    showToast('Berhasil keluar dari akun.', 'info');
  };

  // Dropdown list options
  const gedungOptions = useMemo(() => {
    return Array.from(
      new Set(records.filter(r => r.record_type === 'gedung' || r.gedung).map(r => r.nama || r.gedung))
    ).filter(Boolean) as string[];
  }, [records]);

  const ruanganOptions = useMemo(() => {
    return Array.from(
      new Set(records.filter(r => r.record_type === 'ruangan' || r.ruangan).map(r => r.nama || r.ruangan))
    ).filter(Boolean) as string[];
  }, [records]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const asetCount = records.filter(r => r.record_type !== 'ruangan' && r.record_type !== 'peminjaman').length;
    const ruanganCount = records.filter(r => r.record_type === 'ruangan').length;
    const peminjamanAktif = records.filter(
      r => r.record_type === 'peminjaman' && String(r.status || '').toLowerCase() === 'dipinjam'
    ).length;
    const barangRusak = records.filter(
      r => String(r.kondisi || '').toLowerCase().includes('rusak')
    ).length;
    const lowStockHp = records.filter(
      r => r.record_type === 'habis_pakai' && (r.jumlah || 0) <= 5
    );

    return {
      asetCount,
      ruanganCount,
      peminjamanAktif,
      barangRusak,
      lowStockHp,
    };
  }, [records]);

  // Filtered Records for Table
  const filteredRecords = useMemo(() => {
    if (currentView === 'dashboard') return [];

    let list = records.filter(r => {
      if (currentView === 'per_ruangan') {
        return r.record_type !== 'ruangan' && r.record_type !== 'peminjaman' && (r.ruangan || r.gedung);
      }
      if (currentView === 'cetak_kib') {
        if (filterCetakKib !== 'all') {
          return r.record_type === filterCetakKib;
        }
        return true;
      }
      return r.record_type === currentView;
    });

    if (currentView === 'per_ruangan') {
      if (filterGedung) {
        list = list.filter(r => String(r.gedung || '').toLowerCase() === filterGedung.toLowerCase());
      }
      if (filterRuangan) {
        list = list.filter(r => String(r.ruangan || '').toLowerCase() === filterRuangan.toLowerCase());
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(r =>
        Object.values(r).some(val => String(val || '').toLowerCase().includes(term))
      );
    }

    return list;
  }, [records, currentView, filterGedung, filterRuangan, filterCetakKib, searchTerm]);

  // Record Form Actions
  const handleOpenAddForm = (type: RecordType, subtype: 'master' | 'masuk' | 'keluar' = 'master') => {
    setCurrentView(type);
    setEditTargetRecord(null);
    setHabisPakaiSubtype(subtype);
    setIsFormOpen(true);
  };

  const handleEditRecord = (record: SarprasRecord) => {
    if (currentUser?.role !== 'super') {
      showToast('Akses dibatasi. Hanya Super Admin yang dapat mengubah data.', 'error');
      return;
    }
    setEditTargetRecord(record);
    setIsFormOpen(true);
  };

  const handleSaveRecord = async (formData: Partial<SarprasRecord>) => {
    if (!currentUser) return;
    if (editTargetRecord) {
      storage.updateRecord(formData as SarprasRecord, currentUser.username, currentUser.role);
      showToast('Data berhasil diperbarui.', 'success');
    } else {
      storage.addRecord(formData, currentUser.username);
      showToast('Data berhasil ditambahkan.', 'success');
    }
    refreshData();
  };

  const handleDeleteRecord = (record: SarprasRecord) => {
    if (currentUser?.role !== 'super') {
      showToast('Akses dibatasi. Hanya Super Admin yang dapat menghapus data.', 'error');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus "${record.nama}" (${record.kode})?`)) {
      try {
        storage.deleteRecord(record.__backendId, currentUser.username, currentUser.role);
        showToast('Data berhasil dihapus.', 'success');
        refreshData();
      } catch (err: any) {
        showToast(err.message || 'Gagal menghapus data.', 'error');
      }
    }
  };

  const handleReturnLoan = (record: SarprasRecord) => {
    if (!currentUser) return;
    if (confirm(`Konfirmasi pengembalian peralatan "${record.nama}" oleh ${record.peminjam}?`)) {
      try {
        storage.returnLoan(record.__backendId, currentUser.username);
        showToast('Peralatan berhasil dikembalikan!', 'success');
        refreshData();
      } catch (err: any) {
        showToast(err.message || 'Gagal memproses pengembalian.', 'error');
      }
    }
  };

  // Excel Actions (Super Admin Only)
  const handleExportExcel = () => {
    if (currentUser?.role !== 'super') {
      showToast('Akses dibatasi: Admin Umum tidak memiliki hak untuk mengekspor Excel.', 'error');
      return;
    }
    if (currentView === 'dashboard') return;
    try {
      const title = VIEW_METADATA[currentView]?.title || currentView;
      exportRecordsToExcel(filteredRecords, currentView, title);
      showToast('Data berhasil diekspor ke Excel.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor data.', 'error');
    }
  };

  const handleTriggerImportExcel = () => {
    if (currentUser?.role !== 'super') {
      showToast('Akses dibatasi: Admin Umum tidak memiliki hak untuk mengimpor Excel.', 'error');
      return;
    }
    if (importInputRef.current) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || currentView === 'dashboard') return;
    if (currentUser.role !== 'super') {
      showToast('Akses dibatasi: Admin Umum tidak memiliki hak untuk mengimpor Excel.', 'error');
      return;
    }

    try {
      const parsedRecords = await parseExcelFile(file, currentView);
      let successCount = 0;
      let failCount = 0;

      for (const rec of parsedRecords) {
        try {
          storage.addRecord(rec, currentUser.username);
          successCount++;
        } catch {
          failCount++;
        }
      }

      refreshData();
      showToast(`Import selesai: ${successCount} berhasil, ${failCount} dilewati.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal membaca file Excel.', 'error');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (statusValue?: string, kondisiValue?: string) => {
    const val = (statusValue || kondisiValue || '').toLowerCase();
    if (val.includes('baik') || val.includes('tersedia') || val.includes('aktif') || val.includes('dikembalikan')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {statusValue || kondisiValue || 'Baik'}
        </span>
      );
    }
    if (val.includes('rusak berat')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Rusak Berat
        </span>
      );
    }
    if (val.includes('rusak')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {statusValue || kondisiValue}
        </span>
      );
    }
    if (val.includes('pinjam') || val.includes('proses')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {statusValue || 'Dipinjam'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
        {statusValue || kondisiValue || '-'}
      </span>
    );
  };

  /* ========================================================
     VIEW: REGISTRATION & LOGIN SCREEN (NO DEMO CODE)
  ======================================================== */
  if (!currentUser) {
    const isFirstTime = !storage.isSystemActivated();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/20 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              {settings.governmentLogo && (
                <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-md flex items-center justify-center">
                  <img src={settings.governmentLogo} alt="Logo Pemda" className="w-full h-full object-contain" />
                </div>
              )}
              {settings.schoolLogo ? (
                <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-md flex items-center justify-center">
                  <img src={settings.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-contain" />
                </div>
              ) : !settings.governmentLogo ? (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Boxes className="w-8 h-8" />
                </div>
              ) : null}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">SARPRAS</h1>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">
              {settings.schoolName}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              {settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA'} &bull; {settings.departmentName || 'DINAS PENDIDIKAN DAERAH'}
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* AKTIVASI PERTAMA KALI DENGAN AKUN GOOGLE (HANYA MUNCUL PERTAMA KALI / SEBELUM AKTIVASI) */}
          {isFirstTime && (
            <div className="mb-5 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 animate-in fade-in space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-xs font-bold text-blue-900">Aktivasi Awal: Masuk dengan Akun Google</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Khusus pertama kali pembukaan aplikasi, silakan hubungkan <strong>Akun Google Administrator Utama</strong>.
                Setelah login pertama kali berhasil, opsi akun Google akan <strong>otomatis disembunyikan</strong> dan seluruh pengguna masuk menggunakan <strong>Username & Kata Sandi</strong>.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoggingIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 shadow-xs flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-60"
              >
                {isGoogleLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Menghubungkan Akun Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Masuk Pertama Kali dengan Akun Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* FORM LOGIN PETUGAS & PENGGUNA (USERNAME & KATA SANDI) */}
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800 block mb-0.5">Akses Masuk Petugas & Pengguna:</span>
              Silakan masukkan <strong>Username</strong> dan <strong>Kata Sandi</strong> akun Anda untuk mengakses sistem.
            </div>

            <form onSubmit={handleLocalLogin} className="space-y-3.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Username / ID Pengguna *</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Masukkan username Anda (misal: admin)"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kata Sandi (Password) *</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLocalLoggingIn}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLocalLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi akun...</span>
                  </>
                ) : (
                  <span>Masuk ke Aplikasi</span>
                )}
              </button>
            </form>

            {/* HAPUS / RESET AKUN GOOGLE HANYA MUNCUL JIKA SISTEM BELUM DIAKTIVASI */}
            {isFirstTime && (
              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        'Hapus tautan akun Google yang telah terkunci dari sistem?\n\nTindakan ini akan melepaskan ikatan akun Google lama dan memunculkan kembali tombol aktivasi Google pertama kali jika Anda ingin menghubungkan akun Google baru.'
                      )
                    ) {
                      const res = await storage.clearLockedGoogleAccount();
                      setSettings(storage.getSettings());
                      setLoginError('');
                      showToast(res.message, 'success');
                    }
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition underline underline-offset-2"
                >
                  Hapus Akun Google yang Terkunci / Reset Aktivasi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================
     MAIN APPLICATION (AUTHENTICATED)
  ======================================================== */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span>Mode Offline aktif — data disimpan di penyimpanan lokal perangkat Android / Windows.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* SIDEBAR NAVIGATION (Desktop & Android Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {settings.schoolLogo ? (
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
                  <img src={settings.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
              )}
              <div className="truncate max-w-[140px]">
                <div className="text-sm font-black text-white tracking-wider">SARPRAS</div>
                <div className="text-[10px] text-slate-400 font-medium truncate">{settings.schoolName}</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Nav Links */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6 text-xs font-medium">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Utama
              </div>
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Ringkasan</span>
              </button>
            </div>

            <div>
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Kartu Inventaris Barang (KIB)
              </div>
              <div className="space-y-1">
                {[
                  { id: 'tanah', label: 'KIB A — Tanah', icon: Map },
                  { id: 'peralatan', label: 'KIB B — Peralatan & Mesin', icon: Monitor },
                  { id: 'gedung', label: 'KIB C — Gedung & Bangunan', icon: Building2 },
                  { id: 'jalan', label: 'KIB D — Jalan & Jaringan', icon: Route },
                  { id: 'buku', label: 'KIB E — Buku Perpustakaan', icon: BookOpen },
                  { id: 'habis_pakai', label: 'Barang Habis Pakai / ATK', icon: Package },
                ].map(item => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as RecordType);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                        active
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pengelolaan & Laporan
              </div>
              <div className="space-y-1">
                {[
                  { id: 'ruangan', label: 'Data Ruangan', icon: DoorOpen },
                  { id: 'peminjaman', label: 'Peminjaman Aset', icon: Handshake },
                  { id: 'per_ruangan', label: 'Aset per Ruangan', icon: Boxes },
                  ...(currentUser.role === 'super'
                    ? [{ id: 'cetak_kib', label: 'Cetak Laporan KIB', icon: Printer }]
                    : []),
                ].map(item => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as RecordType);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                        active
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Awan & Administrasi
              </div>
              <div className="space-y-1">
                {/* Barcode Scanner accessible to all */}
                <button
                  onClick={() => setIsBarcodeOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Pindai QR / Barcode</span>
                </button>

                {/* Google Drive, Log Riwayat, Kelola Pengguna, Pengaturan: Super Admin Only */}
                {currentUser.role === 'super' && (
                  <>
                    <button
                      onClick={() => setIsExportImportModalOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-950/40 transition font-semibold"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Ekspor & Impor Seluruh Data</span>
                    </button>

                    <button
                      onClick={() => setIsDriveSyncModalOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-blue-400 hover:text-white hover:bg-blue-900/30 transition font-semibold"
                    >
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span>Cadangan Google Drive</span>
                    </button>

                    <button
                      onClick={() => setIsLogModalOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                    >
                      <History className="w-4 h-4 text-indigo-400" />
                      <span>Log Riwayat Aktivitas</span>
                    </button>

                    <button
                      onClick={() => setIsUserModalOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                    >
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>Kelola Pengguna</span>
                    </button>

                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                    >
                      <SettingsIcon className="w-4 h-4 text-amber-400" />
                      <span>Pengaturan & Kop Surat</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* User Profile in Sidebar Bottom */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.nama}
                    className="w-8 h-8 rounded-full object-cover border border-slate-600 flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      currentUser.role === 'super' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {currentUser.role === 'super' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">{currentUser.nama}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {currentUser.email ? currentUser.email : currentUser.role === 'super' ? 'Super Admin' : 'Admin Sarpras'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* MAIN STAGE */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 pb-16 lg:pb-0">
          {/* TOPBAR */}
          <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                {settings.governmentLogo && (
                  <img
                    src={settings.governmentLogo}
                    alt="Logo Pemda"
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs hidden sm:block flex-shrink-0"
                  />
                )}
                {settings.schoolLogo && (
                  <img
                    src={settings.schoolLogo}
                    alt="Logo Sekolah"
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs hidden sm:block flex-shrink-0"
                  />
                )}
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>{settings.schoolName}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    {settings.governmentName || 'PEMERINTAH PROVINSI SULAWESI UTARA'} &bull; {settings.departmentName || 'DINAS PENDIDIKAN DAERAH'}
                  </p>
                </div>
              </div>
            </div>

            {/* Topbar Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Google Drive Backup Button in Topbar (Khusus Super Admin) */}
              {currentUser.role === 'super' && (
                <button
                  onClick={() => setIsDriveSyncModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                  title="Sinkronisasi Cadangan ke Google Drive"
                >
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Drive Sync</span>
                </button>
              )}

              {/* Scan Barcode Button */}
              <button
                onClick={() => setIsBarcodeOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                title="Pindai QR / Barcode"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Pindai QR</span>
              </button>

              {/* Install PWA Button (Android & Windows) */}
              <PWAInstallButton />

              {/* Settings button (Khusus Super Admin) */}
              {currentUser.role === 'super' && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                  title="Pengaturan Kop & Identitas Sekolah"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1">
            {/* VIEW: DASHBOARD */}
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard SARPRAS</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Ringkasan inventaris, ruangan, dan peminjaman aktif {settings.schoolName}.
                  </p>
                </div>

                {/* Google Drive Status Banner on Dashboard (Khusus Super Admin) */}
                {currentUser.role === 'super' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                        <Cloud className="w-6 h-6 text-blue-300" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Penyimpanan & Cadangan Awan Google Drive</div>
                        <p className="text-xs text-blue-200 mt-0.5">
                          {settings.lastDriveBackupTime
                            ? `Cadangan terakhir: ${settings.lastDriveBackupTime}`
                            : 'Basis data dapat dicadangkan langsung ke Google Drive sekolah.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsDriveSyncModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition shadow-sm flex-shrink-0"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Sinkronisasi Google Drive</span>
                    </button>
                  </div>
                )}

                {/* Ekspor & Impor Seluruh Data Banner on Dashboard (Khusus Super Admin) */}
                {currentUser.role === 'super' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Ekspor & Impor Seluruh Data Inventaris (Excel & JSON)</div>
                        <p className="text-xs text-emerald-200 mt-0.5">
                          Format ekspor dan impor dibuat sama persis agar mudah menambahkan data baru dan menyinkronkan data lama tanpa kehilangan data.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsExportImportModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition shadow-sm flex-shrink-0"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Buka Ekspor & Impor</span>
                    </button>
                  </div>
                )}

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Boxes className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Total Aset Fisik</div>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.asetCount}</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Total Ruangan</div>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.ruanganCount}</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Handshake className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Peminjaman Aktif</div>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.peminjamanAktif}</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                      <TriangleAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Barang Rusak</div>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.barangRusak}</div>
                    </div>
                  </div>
                </div>

                {/* Stock Warning Alert if any */}
                {metrics.lowStockHp.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Peringatan Stok ATK / Habis Pakai Menipis:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {metrics.lowStockHp.map(h => (
                          <span
                            key={h.__backendId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-semibold"
                          >
                            <span>{h.nama}</span>
                            <span className="text-rose-600 font-mono font-bold">({h.jumlah} {h.satuan})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Access Menu Cards */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Akses Cepat Kartu Inventaris Barang</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { id: 'tanah', title: 'KIB A — Tanah', desc: 'Data luas dan sertifikat lahan.', icon: Map, color: 'text-emerald-600 bg-emerald-50' },
                      { id: 'peralatan', title: 'KIB B — Peralatan', desc: 'Mesin, komputer & proyektor.', icon: Monitor, color: 'text-blue-600 bg-blue-50' },
                      { id: 'gedung', title: 'KIB C — Gedung', desc: 'Gedung kantor & laboratorium.', icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
                      { id: 'jalan', title: 'KIB D — Jalan', desc: 'Paving blok, drainase, fiber optic.', icon: Route, color: 'text-teal-600 bg-teal-50' },
                      { id: 'buku', title: 'KIB E — Buku', desc: 'Koleksi perpustakaan & ajar.', icon: BookOpen, color: 'text-violet-600 bg-violet-50' },
                      { id: 'habis_pakai', title: 'Habis Pakai', desc: 'Mutasi ATK & persediaan stok.', icon: Package, color: 'text-amber-600 bg-amber-50' },
                      { id: 'peminjaman', title: 'Peminjaman', desc: 'Catatan peminjam & tanda terima.', icon: Handshake, color: 'text-sky-600 bg-sky-50' },
                      ...(currentUser.role === 'super'
                        ? [{ id: 'cetak_kib', title: 'Cetak Laporan', desc: 'Cetak PDF resmi berformat dinas.', icon: Printer, color: 'text-slate-600 bg-slate-100' }]
                        : [{ id: 'ruangan', title: 'Data Ruangan', desc: 'Daftar ruangan & fasilitas.', icon: DoorOpen, color: 'text-indigo-600 bg-indigo-50' }]),
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setCurrentView(card.id as RecordType)}
                          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition cursor-pointer group active:scale-[0.98]"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition ${card.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="font-bold text-sm text-slate-800">{card.title}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{card.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: RECORD LIST TABLES */}
            {currentView !== 'dashboard' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {VIEW_METADATA[currentView]?.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {VIEW_METADATA[currentView]?.subtitle}
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ekspor & Impor Seluruh Data (Khusus Super Admin) */}
                    {currentUser.role === 'super' && (
                      <button
                        onClick={() => setIsExportImportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                        title="Ekspor & Impor Seluruh Data Inventaris (Excel & JSON)"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Ekspor / Impor Data</span>
                      </button>
                    )}

                    {/* Print / Cetak Button (Khusus Super Admin) */}
                    {currentUser.role === 'super' && (
                      <button
                        onClick={() => {
                          setSelectedPeminjamanPrint(null);
                          setIsPrintModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                        title="Cetak Laporan Inventaris KIB"
                      >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>Cetak PDF</span>
                      </button>
                    )}

                    {/* Add Buttons */}
                    {currentView === 'habis_pakai' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenAddForm('habis_pakai', 'master')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Master Baru</span>
                        </button>
                        <button
                          onClick={() => handleOpenAddForm('habis_pakai', 'masuk')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          <span>Barang Masuk</span>
                        </button>
                        <button
                          onClick={() => handleOpenAddForm('habis_pakai', 'keluar')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Barang Keluar</span>
                        </button>
                      </div>
                    ) : currentView !== 'cetak_kib' && currentView !== 'per_ruangan' ? (
                      <button
                        onClick={() => handleOpenAddForm(currentView)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Data</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-2.5 items-center">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Cari kode, nama aset, gedung, penanggung jawab..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Cetak KIB Category Filter */}
                  {currentView === 'cetak_kib' && (
                    <select
                      value={filterCetakKib}
                      onChange={e => setFilterCetakKib(e.target.value)}
                      className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    >
                      <option value="all">-- Semua Kategori KIB --</option>
                      <option value="tanah">KIB A — Tanah</option>
                      <option value="peralatan">KIB B — Peralatan & Mesin</option>
                      <option value="gedung">KIB C — Gedung & Bangunan</option>
                      <option value="jalan">KIB D — Jalan & Jaringan</option>
                      <option value="buku">KIB E — Buku Perpustakaan</option>
                      <option value="habis_pakai">Barang Habis Pakai</option>
                      <option value="ruangan">Data Ruangan</option>
                      <option value="peminjaman">Peminjaman Aset</option>
                    </select>
                  )}

                  {/* Per Ruangan Gedung & Ruangan Filter */}
                  {currentView === 'per_ruangan' && (
                    <>
                      <select
                        value={filterGedung}
                        onChange={e => setFilterGedung(e.target.value)}
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">-- Semua Gedung --</option>
                        {gedungOptions.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <select
                        value={filterRuangan}
                        onChange={e => setFilterRuangan(e.target.value)}
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">-- Semua Ruangan --</option>
                        {ruanganOptions.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                {/* Data Table Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {VIEW_METADATA[currentView]?.columns.map((col, idx) => (
                            <th key={idx} className="py-3 px-4 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={VIEW_METADATA[currentView]?.columns.length || 6} className="py-12 text-center text-slate-400">
                              <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="font-semibold">Belum ada data inventaris.</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Klik tombol "Tambah Data" atau "Import Excel" di atas untuk menambahkan aset baru.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map(record => (
                            <tr key={record.__backendId} className="hover:bg-slate-50/70 transition">
                              {/* RENDER COLUMNS BY TYPE */}
                              {currentView === 'tanah' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.luas ? `${record.luas} m²` : '-'}</td>
                                  <td className="py-3 px-4">{record.lokasi || '-'}</td>
                                  <td className="py-3 px-4">{record.status_kepemilikan || '-'}</td>
                                  <td className="py-3 px-4">{record.tahun || '-'}</td>
                                </>
                              )}

                              {currentView === 'peralatan' && (
                                <>
                                  <td className="py-3 px-4">
                                    {record.foto ? (
                                      <img
                                        src={record.foto}
                                        alt={record.nama}
                                        onClick={() => setSelectedPreviewImage(record.foto!)}
                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                        <Monitor className="w-5 h-5" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4 text-slate-600">
                                    {record.gedung || '-'} / <span className="font-medium text-slate-800">{record.ruangan || '-'}</span>
                                  </td>
                                  <td className="py-3 px-4 font-bold">{record.jumlah || 1} {record.satuan || 'Unit'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(undefined, record.kondisi)}</td>
                                  <td className="py-3 px-4">{record.tahun || '-'}</td>
                                </>
                              )}

                              {currentView === 'gedung' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.lokasi || '-'}</td>
                                  <td className="py-3 px-4">{record.luas ? `${record.luas} m²` : '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(undefined, record.kondisi)}</td>
                                  <td className="py-3 px-4">{record.tahun || '-'}</td>
                                </>
                              )}

                              {currentView === 'jalan' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.lokasi || '-'}</td>
                                  <td className="py-3 px-4">{record.luas ? `${record.luas} m` : '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(undefined, record.kondisi)}</td>
                                  <td className="py-3 px-4">{record.tahun || '-'}</td>
                                </>
                              )}

                              {currentView === 'buku' && (
                                <>
                                  <td className="py-3 px-4">
                                    {record.foto ? (
                                      <img
                                        src={record.foto}
                                        alt={record.nama}
                                        onClick={() => setSelectedPreviewImage(record.foto!)}
                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 cursor-pointer"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                        <BookOpen className="w-5 h-5" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.pengarang || '-'}</td>
                                  <td className="py-3 px-4 font-bold">{record.jumlah || 1} Eks</td>
                                  <td className="py-3 px-4">{getStatusBadge(undefined, record.kondisi)}</td>
                                  <td className="py-3 px-4">{record.tahun || '-'}</td>
                                </>
                              )}

                              {currentView === 'habis_pakai' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.satuan || 'Pcs'}</td>
                                  <td className="py-3 px-4 font-bold">
                                    <span className={`px-2 py-0.5 rounded-md ${
                                      (record.jumlah || 0) <= 5 ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-900'
                                    }`}>
                                      {record.jumlah || 0}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">{record.sumber || '-'}</td>
                                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{record.keterangan || '-'}</td>
                                </>
                              )}

                              {currentView === 'ruangan' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.gedung || '-'}</td>
                                  <td className="py-3 px-4">{record.penanggung_jawab || '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge('Aktif')}</td>
                                </>
                              )}

                              {currentView === 'peminjaman' && (
                                <>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-800">{record.nama}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{record.kode}</div>
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-900">{record.peminjam}</td>
                                  <td className="py-3 px-4 font-bold">{record.jumlah || 1} Unit</td>
                                  <td className="py-3 px-4">{record.tgl_kembali || '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(record.status || 'Dipinjam')}</td>
                                </>
                              )}

                              {currentView === 'per_ruangan' && (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">{record.nama}</td>
                                  <td className="py-3 px-4">{record.gedung || '-'}</td>
                                  <td className="py-3 px-4 font-bold text-slate-800">{record.ruangan || '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(undefined, record.kondisi)}</td>
                                  <td className="py-3 px-4">{record.penanggung_jawab || '-'}</td>
                                </>
                              )}

                              {currentView === 'cetak_kib' && (
                                <>
                                  <td className="py-3 px-4 font-semibold uppercase text-[10px] text-blue-700 bg-blue-50/50 rounded-lg">
                                    {record.record_type}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{record.kode}</td>
                                  <td className="py-3 px-4 font-semibold text-slate-900">{record.nama}</td>
                                  <td className="py-3 px-4">{record.ruangan || record.gedung || record.lokasi || '-'}</td>
                                  <td className="py-3 px-4">{getStatusBadge(record.status, record.kondisi)}</td>
                                </>
                              )}

                              {/* ACTIONS CELL */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {/* Print Label/Barcode icon */}
                                  <button
                                    onClick={() => {
                                      setSelectedBarcodeRecord(record);
                                      setIsBarcodeOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                    title="Lihat QR Code & Cetak Label"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </button>

                                  {/* Special Peminjaman Return & Tanda Terima */}
                                  {currentView === 'peminjaman' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedPeminjamanPrint(record);
                                          setIsPrintModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                        title="Cetak Bukti Tanda Terima Peminjaman"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>

                                      {String(record.status || '').toLowerCase() === 'dipinjam' && (
                                        <button
                                          onClick={() => handleReturnLoan(record)}
                                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                          title="Kembalikan Peralatan"
                                        >
                                          <PackageCheck className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {/* Super Admin Edit & Delete buttons */}
                                  {currentUser.role === 'super' && currentView !== 'cetak_kib' && (
                                    <>
                                      <button
                                        onClick={() => handleEditRecord(record)}
                                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                        title="Ubah Data (Super Admin)"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRecord(record)}
                                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                        title="Hapus Data (Super Admin)"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Optimized for Android) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 lg:hidden flex items-center justify-around h-14 shadow-lg text-[10px] font-semibold text-slate-500">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center gap-0.5 ${currentView === 'dashboard' ? 'text-blue-600' : 'hover:text-slate-800'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Beranda</span>
        </button>

        <button
          onClick={() => setCurrentView('peralatan')}
          className={`flex flex-col items-center gap-0.5 ${currentView === 'peralatan' ? 'text-blue-600' : 'hover:text-slate-800'}`}
        >
          <Monitor className="w-5 h-5" />
          <span>KIB B</span>
        </button>

        <button
          onClick={() => setIsBarcodeOpen(true)}
          className="flex flex-col items-center gap-0.5 -mt-4 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full p-2.5 shadow-md shadow-blue-500/30 active:scale-95"
        >
          <QrCode className="w-5 h-5" />
        </button>

        {currentUser.role === 'super' ? (
          <button
            onClick={() => setIsDriveSyncModalOpen(true)}
            className="flex flex-col items-center gap-0.5 hover:text-slate-800 text-blue-600 font-bold"
          >
            <Cloud className="w-5 h-5 text-blue-600" />
            <span>Drive</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentView('ruangan')}
            className={`flex flex-col items-center gap-0.5 ${currentView === 'ruangan' ? 'text-blue-600' : 'hover:text-slate-800'}`}
          >
            <DoorOpen className="w-5 h-5" />
            <span>Ruangan</span>
          </button>
        )}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 hover:text-slate-800"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* ALL MODALS */}
      {/* 1. Record Form Modal */}
      <RecordFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRecord}
        editRecord={editTargetRecord}
        activeType={currentView === 'dashboard' ? 'peralatan' : currentView}
        habisPakaiSubtype={habisPakaiSubtype}
        allRecords={records}
      />

      {/* 2. Barcode & QR Scanner Modal */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => {
          setIsBarcodeOpen(false);
          setSelectedBarcodeRecord(null);
        }}
        record={selectedBarcodeRecord}
        allRecords={records}
        settings={settings}
        onSelectRecord={rec => {
          setCurrentView(rec.record_type);
          setSearchTerm(rec.kode);
          showToast(`Aset ditemukan: ${rec.nama}`, 'success');
        }}
      />

      {/* 3. Print Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPeminjamanPrint(null);
        }}
        allRecords={records}
        settings={settings}
        initialType={currentView === 'dashboard' ? 'all' : currentView}
        selectedPeminjamanRecord={selectedPeminjamanPrint}
      />

      {/* 4. Google Drive Sync Modal (Khusus Super Admin) */}
      {currentUser.role === 'super' && (
        <GoogleDriveSyncModal
          isOpen={isDriveSyncModalOpen}
          onClose={() => setIsDriveSyncModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onDataRestored={() => {
            refreshData();
            showToast('Data berhasil disinkronkan dari Google Drive.', 'success');
          }}
        />
      )}

      {/* 4b. Export & Import All Records Modal (Khusus Super Admin) */}
      {currentUser.role === 'super' && (
        <ExportImportModal
          isOpen={isExportImportModalOpen}
          onClose={() => setIsExportImportModalOpen(false)}
          currentUser={currentUser}
          onDataChanged={() => {
            refreshData();
            showToast('Data inventaris berhasil diperbarui dan disinkronkan.', 'success');
          }}
        />
      )}

      {/* 5. User Management Modal (Khusus Super Admin) */}
      {currentUser.role === 'super' && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* 6. Activity Log Modal (Khusus Super Admin) */}
      {currentUser.role === 'super' && (
        <LogActivityModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          logs={storage.getLogs()}
        />
      )}

      {/* 7. Settings Modal (Khusus Super Admin) */}
      {currentUser.role === 'super' && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={newSet => {
            setSettings(newSet);
            showToast('Pengaturan identitas sekolah disimpan.', 'success');
          }}
          currentUser={currentUser}
          onDatabaseRefreshed={() => {
            refreshData();
            showToast('Data berhasil diperbarui.', 'success');
          }}
          onOpenDriveSync={() => setIsDriveSyncModalOpen(true)}
        />
      )}

      {/* 8. Image Zoom Preview Modal */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-w-lg w-full bg-transparent">
            <img
              src={selectedPreviewImage}
              alt="Foto Aset"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-800 p-2 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 9. Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Konfirmasi Keluar</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin keluar dari akun <strong>{currentUser.nama}</strong>?
            </p>
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border border-slate-200/80 bg-white text-slate-800 text-xs font-semibold animate-in slide-in-from-bottom">
          {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          {toastMessage.type === 'info' && <Boxes className="w-4 h-4 text-blue-600 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
