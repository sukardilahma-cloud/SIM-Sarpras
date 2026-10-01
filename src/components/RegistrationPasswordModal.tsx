import React, { useState } from 'react';
import { ShieldCheck, Mail, Key, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { storage } from '../services/storage';

interface RegistrationPasswordModalProps {
  isOpen: boolean;
  adminUser: UserAccount;
  settings: AppSettings;
  onComplete: (user: UserAccount) => void;
}

export const RegistrationPasswordModal: React.FC<RegistrationPasswordModalProps> = ({
  isOpen,
  adminUser,
  settings,
  onComplete,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await storage.setMasterAdminPassword(adminUser.username, password);

      // Trigger email notification simulation & notification dispatch
      setNotificationSent(true);

      // Send mailto notification trigger if email exists
      if (adminUser.email) {
        const subject = encodeURIComponent(`[SARPRAS] Akun Administrator Terdaftar - ${settings.schoolName}`);
        const appUrl = window.location.origin;
        const body = encodeURIComponent(
          `Halo ${adminUser.nama},\n\n` +
          `Selamat! Akun Administrator Anda telah berhasil diaktivasi pada Sistem Informasi Sarana & Prasarana (SARPRAS) ${settings.schoolName}.\n\n` +
          `Rincian Kredensial Login Anda:\n` +
          `- Tautan Aplikasi: ${appUrl}\n` +
          `- Username: ${adminUser.username}\n` +
          `- Email Terdaftar: ${adminUser.email}\n` +
          `- Peran: Super Administrator\n\n` +
          `Catatan Keamanan:\n` +
          `Akses login Google kini telah dikunci. Anda dan seluruh staf/petugas dapat masuk menggunakan Username & Kata Sandi melalui antarmuka 'Petugas / Pengguna'.\n\n` +
          `Salam,\n${settings.schoolName}`
        );

        // Offer automatic mailto dispatch
        try {
          const mailtoLink = `mailto:${adminUser.email}?subject=${subject}&body=${body}`;
          const a = document.createElement('a');
          a.href = mailtoLink;
          a.target = '_blank';
          a.click();
        } catch (e) {
          console.warn('Mailto link notice:', e);
        }
      }

      setTimeout(() => {
        onComplete(updatedUser);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan kata sandi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            Aktivasi Akun Berhasil!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Langkah Terakhir: Buat Kata Sandi Administrator & Kirim Notifikasi Email
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
            {errorMsg}
          </div>
        )}

        {notificationSent ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-600" />
            <div className="font-bold text-sm">Notifikasi Terkirim ke Email!</div>
            <p className="text-xs text-emerald-700">
              Notifikasi kredensial login dan tautan akses telah disiapkan ke <strong>{adminUser.email}</strong>. Mengarahkan Anda ke Dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email info banner */}
            <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-2xl text-blue-900 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-blue-800">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Akun Google Terdaftar:</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Email: <strong className="text-blue-950">{adminUser.email}</strong>
              </p>
              <p className="text-[10.5px] text-blue-600/90 flex items-center gap-1 mt-1">
                <Lock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Setelah menyimpan sandi, akses login Google akan terkunci dan Anda login menggunakan Username & Sandi.</span>
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Username Login Administrator</label>
              <input
                type="text"
                value={adminUser.username}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Anda juga dapat login menggunakan alamat email Google Anda.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Buat Kata Sandi (Password) *</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ulangi Kata Sandi (Konfirmasi) *</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi di atas"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Menyimpan & Mengirim Notifikasi...' : 'Simpan Sandi & Masuk ke Aplikasi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
