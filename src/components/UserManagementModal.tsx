import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, Shield, ShieldAlert, Key } from 'lucide-react';
import { UserAccount } from '../types';
import { storage } from '../services/storage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(storage.getUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newRole, setNewRole] = useState<'super' | 'umum'>('umum');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (!newUsername.trim() || !newPassword.trim() || !newNama.trim()) {
        throw new Error('Semua kolom data pengguna wajib diisi.');
      }

      await storage.addUser(
        {
          username: newUsername.trim(),
          password: newPassword.trim(),
          nama: newNama.trim(),
          role: newRole,
        },
        currentUser.username
      );

      setUsers(storage.getUsers());
      setSuccessMsg(`Petugas "${newNama.trim()}" berhasil didaftarkan dan dapat langsung login dari komputer atau laptop lain.`);
      setNewUsername('');
      setNewPassword('');
      setNewNama('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Yakin ingin menghapus pengguna "${username}"?`)) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await storage.deleteUser(username, currentUser.username);
      setUsers(storage.getUsers());
      setSuccessMsg(`Pengguna "${username}" berhasil dihapus.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus pengguna.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Kelola Pengguna Sistem</h3>
              <p className="text-[11px] text-slate-500">Khusus Akses Super Admin</p>
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
          {errorMsg && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              {successMsg}
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Akses Petugas & Pengguna Lokal</span>
            </div>
            <p className="text-[11px] text-blue-700">
              Petugas atau staf yang ditambahkan di sini dapat langsung masuk ke aplikasi menggunakan <strong>Username</strong> dan <strong>Password</strong> tanpa perlu memiliki atau login akun Google.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-slate-700">Daftar Akun Pengguna / Petugas:</span>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Petugas Baru</span>
              </button>
            )}
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-800">Form Tambah Petugas / Pengguna Baru</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500">Username Petugas *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="misal: petugas1, operator_lab"
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Kata sandi untuk login"
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Nama Lengkap Petugas & Gelar *</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={e => setNewNama(e.target.value)}
                  placeholder="misal: Wahyu Paputungan, S.Pd"
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Peran / Hak Akses *</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="umum">Petugas / Admin Umum (Input Data, Lihat Aset, Pengembalian — Tanpa Hak Cetak KIB, Excel, Cadangan Drive, Log & Pengaturan)</option>
                  <option value="super">Super Admin (Hak Akses Penuh: Cetak KIB, Excel, Cadangan Google Drive, Log Riwayat, Pengaturan & Kelola Pengguna)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun Petugas'}
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          <div className="space-y-2">
            {users.map(u => (
              <div
                key={u.username}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    u.role === 'super' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role === 'super' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{u.nama}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'super' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {u.role === 'super' ? 'Super Admin' : 'Admin Umum'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      @{u.username} {u.email ? `• ${u.email}` : ''}
                    </div>
                  </div>
                </div>

                {u.username !== currentUser.username && (
                  <button
                    onClick={() => handleDeleteUser(u.username)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Hapus Pengguna"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Clear Locked Google Account */}
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                if (confirm('Hapus akun Google yang telah terkunci dari sistem?')) {
                  const res = await storage.clearLockedGoogleAccount();
                  setUsers(storage.getUsers());
                  setSuccessMsg(res.message);
                }
              }}
              className="w-full py-2 px-3 text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Kuncian Akun Google</span>
            </button>
          </div>
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
