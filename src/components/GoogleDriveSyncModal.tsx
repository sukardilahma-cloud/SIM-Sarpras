import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  HardDrive
} from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { storage } from '../services/storage';
import { getAccessToken, signInWithGoogle } from '../services/googleAuth';
import {
  uploadBackupToDrive,
  listBackupsFromDrive,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  DriveBackupFile,
} from '../services/googleDrive';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  settings: AppSettings;
  onDataRestored: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onDataRestored,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthAndFetchFiles();
    }
  }, [isOpen]);

  const checkAuthAndFetchFiles = async () => {
    const token = await getAccessToken();
    if (token) {
      setHasGoogleAuth(true);
      fetchDriveFiles();
    } else {
      setHasGoogleAuth(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setStatusMessage({ text: 'Menghubungkan ke Akun Google...', type: 'info' });
      const res = await signInWithGoogle();
      setHasGoogleAuth(true);
      setStatusMessage({ text: `Terhubung dengan Google: ${res.user.email}`, type: 'success' });
      fetchDriveFiles();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Gagal menghubungkan Akun Google.', type: 'error' });
    }
  };

  const fetchDriveFiles = async () => {
    setLoadingList(true);
    try {
      const files = await listBackupsFromDrive();
      setDriveFiles(files);
    } catch (err: any) {
      console.warn(err);
      setStatusMessage({ text: err.message || 'Gagal mengambil daftar cadangan dari Google Drive.', type: 'error' });
    } finally {
      setLoadingList(false);
    }
  };

  // Upload Backup to Google Drive
  const handleBackupNow = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const jsonBackup = storage.exportBackupJSON();
      const nowStr = new Date().toISOString().slice(0, 10);
      const fileName = `SARPRAS_BACKUP_SMKN1_KOTAMOBAGU_${nowStr}_${Date.now().toString().slice(-4)}.json`;

      const result = await uploadBackupToDrive(jsonBackup, fileName);
      const timeStr = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      storage.updateLastDriveBackupTime(timeStr);
      storage.addLog(
        currentUser.username,
        'TAMBAH',
        'GOOGLE_DRIVE',
        `Berhasil mencadangkan seluruh data SARPRAS ke Google Drive (${result.name}).`
      );

      setStatusMessage({
        text: `Basis data berhasil dicadangkan ke Google Drive! (${result.name})`,
        type: 'success',
      });

      await fetchDriveFiles();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Gagal mencadangkan data ke Google Drive.', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Restore Database from selected file
  const handleRestoreFile = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin memulihkan basis data dari cadangan "${file.name}"? Data di aplikasi akan diperbarui dengan berkas ini.`
    );
    if (!confirmed) return;

    setRestoringId(file.id);
    setStatusMessage(null);
    try {
      const jsonContent = await downloadBackupFromDrive(file.id);
      const result = await storage.importBackupJSON(jsonContent, currentUser.username);

      storage.addLog(
        currentUser.username,
        'TAMBAH',
        'GOOGLE_DRIVE',
        `Memulihkan basis data dari file cadangan Google Drive (${file.name}).`
      );

      setStatusMessage({
        text: `Basis data berhasil dipulihkan dari Google Drive (${result.count} data)!`,
        type: 'success',
      });

      onDataRestored();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Gagal memulihkan file dari Google Drive.', type: 'error' });
    } finally {
      setRestoringId(null);
    }
  };

  // Delete Backup File with confirmation
  const handleDeleteFile = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus file cadangan "${file.name}" dari Google Drive Anda? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      await deleteBackupFromDrive(file.id);
      setStatusMessage({ text: `File "${file.name}" berhasil dihapus dari Google Drive.`, type: 'success' });
      storage.addLog(
        currentUser.username,
        'HAPUS',
        'GOOGLE_DRIVE',
        `Menghapus file cadangan dari Google Drive (${file.name}).`
      );
      setDriveFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Gagal menghapus file dari Google Drive.', type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Sinkronisasi Basis Data ke Google Drive</h3>
              <p className="text-[11px] text-slate-500">Penyimpanan Cadangan Awan Aman untuk Admin Sekolah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin text-blue-600" />}
              <span className="text-[11px] font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Google Auth Status Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-blue-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  {currentUser.email ? currentUser.email : 'Akun Google Sekolah'}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>
                    {hasGoogleAuth
                      ? 'Terhubung dengan Google Drive API (drive.file)'
                      : 'Perlu konfirmasi otentikasi Google'}
                  </span>
                </div>
              </div>
            </div>

            {!hasGoogleAuth && (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Hubungkan
              </button>
            )}
          </div>

          {/* Action: Backup Now */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-xs">Cadangkan Data Saat Ini</div>
                <p className="text-[11px] text-slate-500">
                  Simpan seluruh data aset, ruangan, peminjaman, dan log ke file JSON aman di Google Drive Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={syncing || !hasGoogleAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{syncing ? 'Mengunggah...' : 'Cadangkan ke Drive'}</span>
              </button>
            </div>
            {settings.lastDriveBackupTime && (
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Pencadangan terakhir: <span className="font-semibold text-slate-700">{settings.lastDriveBackupTime}</span>
              </div>
            )}
          </div>

          {/* Drive Backups List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Riwayat Berkas Cadangan di Google Drive</span>
              </span>
              <button
                type="button"
                onClick={fetchDriveFiles}
                disabled={loadingList || !hasGoogleAuth}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                <span>Muat Ulang</span>
              </button>
            </div>

            {loadingList ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
                <p>Memuat daftar cadangan dari Google Drive...</p>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Cloud className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="font-semibold">Belum ada file cadangan SARPRAS di Google Drive.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Klik tombol "Cadangkan ke Drive" di atas untuk membuat cadangan pertama Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {driveFiles.map(file => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-800 truncate text-xs" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(file.createdTime).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {file.size && <span>&bull; {file.size}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition"
                          title="Buka di Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRestoreFile(file)}
                        disabled={restoringId === file.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition text-[11px]"
                        title="Pulihkan basis data dari file ini"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{restoringId === file.id ? 'Memulihkan...' : 'Pulihkan'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus dari Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
