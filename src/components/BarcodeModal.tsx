import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, X, Printer, Search, Check, AlertCircle } from 'lucide-react';
import { SarprasRecord, AppSettings } from '../types';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: SarprasRecord | null;
  onSelectRecord?: (record: SarprasRecord) => void;
  allRecords: SarprasRecord[];
  settings?: AppSettings;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  record,
  onSelectRecord,
  allRecords,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'scan'>('view');
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (record) {
      setActiveTab('view');
    } else {
      setActiveTab('scan');
    }
  }, [record, isOpen]);

  useEffect(() => {
    if (activeTab === 'scan' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak didukung pada browser ini.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleManualSearch = (codeToFind?: string) => {
    const code = (codeToFind || manualCode).trim().toLowerCase();
    if (!code) return;
    const found = allRecords.find(
      r => r.kode.toLowerCase() === code || r.__backendId.toLowerCase() === code || r.nama.toLowerCase().includes(code)
    );
    if (found && onSelectRecord) {
      onSelectRecord(found);
      stopCamera();
      onClose();
    } else {
      alert(`Aset dengan kode atau kata kunci "${manualCode}" tidak ditemukan.`);
    }
  };

  const printLabel = () => {
    if (!record) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label Inventaris - ${record.kode}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
          .label-box {
            width: 75mm;
            height: 45mm;
            border: 2px solid #000;
            border-radius: 6px;
            padding: 8px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header { font-size: 8pt; font-weight: bold; text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 3px; }
          .body-content { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
          .qr-placeholder {
            width: 25mm;
            height: 25mm;
            background: #fff;
            border: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .details { font-size: 7.5pt; line-height: 1.25; flex: 1; }
          .code { font-size: 9pt; font-weight: bold; color: #000; margin-bottom: 2px; }
          .footer { font-size: 6pt; text-align: center; color: #444; border-top: 1px dashed #666; padding-top: 2px; }
        </style>
      </head>
      <body>
        <div class="label-box">
          <div class="header">
            ${settings?.schoolLogo ? `<img src="${settings.schoolLogo}" style="height: 18px; max-width: 30px; object-fit: contain; vertical-align: middle; margin-right: 4px;" />` : ''}
            <span>${settings?.schoolName || 'SMK NEGERI 1 KOTAMOBAGU'}</span><br>
            <span style="font-weight: normal; font-size: 6.5pt; color: #333;">${settings?.departmentName || 'DINAS PENDIDIKAN DAERAH'} &bull; SARPRAS</span>
          </div>
          <div class="body-content">
            <div class="qr-placeholder">
              <svg viewBox="0 0 100 100" width="80" height="80">
                <rect width="100" height="100" fill="#fff"/>
                <!-- Simple High-Contrast QR simulation -->
                <rect x="5" y="5" width="30" height="30" fill="#000"/>
                <rect x="10" y="10" width="20" height="20" fill="#fff"/>
                <rect x="15" y="15" width="10" height="10" fill="#000"/>
                <rect x="65" y="5" width="30" height="30" fill="#000"/>
                <rect x="70" y="10" width="20" height="20" fill="#fff"/>
                <rect x="75" y="15" width="10" height="10" fill="#000"/>
                <rect x="5" y="65" width="30" height="30" fill="#000"/>
                <rect x="10" y="70" width="20" height="20" fill="#fff"/>
                <rect x="15" y="75" width="10" height="10" fill="#000"/>
                <rect x="42" y="20" width="15" height="15" fill="#000"/>
                <rect x="45" y="45" width="12" height="12" fill="#000"/>
                <rect x="65" y="65" width="25" height="25" fill="#000"/>
                <rect x="72" y="72" width="10" height="10" fill="#fff"/>
              </svg>
            </div>
            <div class="details">
              <div class="code">${record.kode}</div>
              <strong>${record.nama}</strong><br>
              Lokasi: ${record.ruangan || record.gedung || record.lokasi || '-'}<br>
              Tahun: ${record.tahun || '-'}<br>
              Kondisi: ${record.kondisi || 'Baik'}
            </div>
          </div>
          <div class="footer">Dilarang merusak atau memindahkan label ini tanpa izin Sarpras.</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {activeTab === 'view' ? 'Barcode & Label Inventaris' : 'Pindai Barcode / QR Aset'}
              </h3>
              <p className="text-[11px] text-slate-500">SMK Negeri 1 Kotamobagu</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('view')}
            disabled={!record}
            className={`flex-1 py-2.5 text-center transition ${
              activeTab === 'view'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 disabled:opacity-40'
            }`}
          >
            Label Aset
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2.5 text-center transition ${
              activeTab === 'scan'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pindai Kamera / Cari Cepat
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'view' && record ? (
            <div className="space-y-4 text-center">
              {/* Simulated Label Card */}
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 max-w-sm mx-auto text-left">
                <div className="text-center pb-2 border-b border-slate-200">
                  <div className="text-[11px] font-bold text-slate-800">SMK NEGERI 1 KOTAMOBAGU</div>
                  <div className="text-[9px] text-slate-500">SISTEM SARPRAS INVENTARIS</div>
                </div>

                <div className="flex items-center gap-4 my-3">
                  {/* Generated QR pattern */}
                  <div className="w-24 h-24 bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                      <rect x="5" y="5" width="28" height="28" fill="currentColor"/>
                      <rect x="10" y="10" width="18" height="18" fill="#fff"/>
                      <rect x="14" y="14" width="10" height="10" fill="currentColor"/>

                      <rect x="67" y="5" width="28" height="28" fill="currentColor"/>
                      <rect x="72" y="10" width="18" height="18" fill="#fff"/>
                      <rect x="76" y="14" width="10" height="10" fill="currentColor"/>

                      <rect x="5" y="67" width="28" height="28" fill="currentColor"/>
                      <rect x="10" y="72" width="18" height="18" fill="#fff"/>
                      <rect x="14" y="76" width="10" height="10" fill="currentColor"/>

                      <rect x="40" y="15" width="12" height="12" fill="currentColor"/>
                      <rect x="42" y="42" width="16" height="16" fill="currentColor"/>
                      <rect x="68" y="42" width="10" height="10" fill="currentColor"/>
                      <rect x="42" y="68" width="10" height="14" fill="currentColor"/>
                      <rect x="65" y="65" width="25" height="25" fill="currentColor"/>
                      <rect x="72" y="72" width="11" height="11" fill="#fff"/>
                    </svg>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-mono font-bold text-blue-700 text-sm">{record.kode}</div>
                    <div className="font-semibold text-slate-800 line-clamp-2">{record.nama}</div>
                    <div className="text-[10px] text-slate-500">
                      Lokasi: {record.ruangan || record.gedung || record.lokasi || '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Kondisi: <span className="font-medium text-slate-700">{record.kondisi || 'Baik'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[8px] text-center text-slate-400 pt-1 border-t border-slate-200">
                  ID: {record.__backendId} &bull; Tgl: {record.tanggal.substring(0, 10)}
                </div>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={printLabel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Stiker Label Inventaris</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera Scanner View */}
              <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-emerald-400 rounded-xl relative animate-pulse">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400/80 shadow-md"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-500" />
                    <p className="text-xs text-slate-300">
                      {cameraError || 'Kamera sedang tidak aktif.'}
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Buka Kamera HP / Webcam
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Search Bar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Atau masukkan Kode Barang / Barcode:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                      placeholder="Contoh: PC-TKJ-01, PRJ-EPS-01..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleManualSearch()}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
                  >
                    Cari Aset
                  </button>
                </div>
              </div>

              {/* Quick sample chips */}
              <div className="pt-2">
                <span className="text-[11px] font-medium text-slate-400">Contoh kode yang tersedia:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {allRecords.slice(0, 5).map(r => (
                    <button
                      key={r.__backendId}
                      onClick={() => handleManualSearch(r.kode)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-mono border border-slate-200/60 transition"
                    >
                      {r.kode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
