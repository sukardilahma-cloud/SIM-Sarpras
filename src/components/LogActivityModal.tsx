import React from 'react';
import { X, History, Activity, ShieldCheck, ArrowDownLeft, ArrowUpRight, Plus, Trash2, Edit } from 'lucide-react';
import { LogActivity } from '../types';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogActivity[];
}

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  const getActionBadge = (aksi: LogActivity['aksi']) => {
    switch (aksi) {
      case 'TAMBAH':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"><Plus className="w-3 h-3" /> Tambah</span>;
      case 'EDIT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"><Edit className="w-3 h-3" /> Ubah</span>;
      case 'HAPUS':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"><Trash2 className="w-3 h-3" /> Hapus</span>;
      case 'MASUK':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800"><ArrowDownLeft className="w-3 h-3" /> Masuk</span>;
      case 'KELUAR':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"><ArrowUpRight className="w-3 h-3" /> Keluar</span>;
      case 'KEMBALI':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800"><ShieldCheck className="w-3 h-3" /> Kembali</span>;
      case 'LOGIN':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">Login</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{aksi}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Log Aktivitas & Riwayat Audit</h3>
              <p className="text-[11px] text-slate-500">Catatan transaksi data dan mutasi sarana prasarana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of logs */}
        <div className="py-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Belum ada riwayat aktivitas.</div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/60 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.aksi)}
                    <span className="font-semibold text-slate-700">@{log.user}</span>
                    <span className="text-[11px] text-slate-400 font-mono">[{log.jenisData}]</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{log.tanggal}</span>
                </div>
                <p className="text-slate-600 pl-1">{log.keterangan}</p>
              </div>
            ))
          )}
        </div>

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
