export type RecordType = 
  | 'tanah'
  | 'peralatan'
  | 'gedung'
  | 'jalan'
  | 'buku'
  | 'habis_pakai'
  | 'ruangan'
  | 'peminjaman'
  | 'per_ruangan'
  | 'cetak_kib';

export type UserRole = 'super' | 'umum';

export interface UserAccount {
  username: string;
  email?: string;
  password?: string;
  nama: string;
  photoURL?: string;
  role: UserRole;
  provider?: 'google' | 'local';
  isActivated?: boolean;
}

export interface SarprasRecord {
  __backendId: string;
  tanggal: string;
  record_type: 'tanah' | 'peralatan' | 'gedung' | 'jalan' | 'buku' | 'habis_pakai' | 'ruangan' | 'peminjaman';
  sub_type?: 'master' | 'masuk' | 'keluar' | '';
  kode: string;
  nama: string;
  lokasi?: string;
  gedung?: string;
  ruangan?: string;
  penanggung_jawab?: string;
  jumlah?: number;
  satuan?: string;
  kondisi?: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | string;
  sumber?: string;
  pengarang?: string;
  peminjam?: string;
  status?: string;
  keterangan?: string;
  foto?: string;
  luas?: number | string;
  status_kepemilikan?: string;
  tahun?: number | string;
  tgl_kembali?: string;
  pengguna?: string;
  keperluan?: string;
}

export interface LogActivity {
  id: string;
  tanggal: string;
  user: string;
  aksi: 'LOGIN' | 'TAMBAH' | 'EDIT' | 'HAPUS' | 'MASUK' | 'KELUAR' | 'KEMBALI';
  jenisData: string;
  keterangan: string;
}

export interface AppSettings {
  governmentName?: string; // PEMERINTAH PROVINSI SULAWESI UTARA
  departmentName?: string; // DINAS PENDIDIKAN DAERAH
  governmentLogo?: string; // Data URL or URL of Government / Pemprov Logo
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  principalName: string;
  principalNip: string;
  schoolLogo?: string; // Data URL or URL of School Logo
  schoolEmail?: string;
  schoolWebsite?: string;
  gasEndpointUrl?: string; // Optional Google Apps Script web app URL
  offlineMode: boolean;
  lastDriveBackupTime?: string;
  autoDriveSync?: boolean;
  schoolAdminGoogleEmail?: string;
  schoolAdminGoogleName?: string;
}
