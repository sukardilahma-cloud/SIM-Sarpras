import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, Smartphone, CheckCircle, Info, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isWindows, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone
  if (isInstalled) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>Aplikasi Terpasang</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition active:scale-95"
        title="Pasang aplikasi ini di Android atau Windows"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span className="hidden sm:inline">Pasang di {isWindows ? 'Windows' : isAndroid ? 'Android' : 'Perangkat'}</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Guide Modal for Windows & Android if beforeinstallprompt not yet triggered or on iOS */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pasang Aplikasi SARPRAS</h3>
                  <p className="text-xs text-slate-500">Dukungan penuh untuk Windows & Android</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-600 leading-relaxed">
              {/* Android Guide */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Di HP Android (Google Chrome):</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Buka menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser Chrome.</li>
                  <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                  <li>Ikon SARPRAS akan muncul di beranda HP Anda layaknya aplikasi Play Store.</li>
                </ol>
              </div>

              {/* Windows Guide */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>Di Laptop / PC Windows (Chrome / Edge):</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Lihat di bilah alamat URL (Address bar) di atas, klik ikon <strong>Install SARPRAS</strong> (ikon monitor dengan panah bawah).</li>
                  <li>Atau buka Menu titik tiga (<strong>⋮</strong>) &rarr; <strong>"Install SARPRAS..."</strong>.</li>
                  <li>Aplikasi akan berjalan di jendela mandiri tanpa bilah browser dan dapat disematkan ke Taskbar Windows.</li>
                </ol>
              </div>

              {/* iOS Safari Guide if accessed on Apple device */}
              {isIOS && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Di iPhone / iPad (Safari):</span>
                  </div>
                  <p>Tekan tombol <strong>Share</strong> (kotak panah ke atas) lalu pilih <strong>"Add to Home Screen"</strong>.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {installSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top">
          <CheckCircle className="w-4 h-4" />
          <span>Aplikasi SARPRAS berhasil dipasang!</span>
        </div>
      )}
    </>
  );
};
