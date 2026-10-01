import { SarprasRecord, UserAccount, LogActivity, AppSettings } from '../types';
import { db } from './firebaseDb';
import { auth } from './googleAuth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_RECORDS = 'sarpras_records_prod_v2';
const STORAGE_KEY_USERS = 'sarpras_users_prod_v2';
const STORAGE_KEY_LOGS = 'sarpras_logs_prod_v2';
const STORAGE_KEY_SESSION = 'sarpras_session_prod_v2';
const STORAGE_KEY_SETTINGS = 'sarpras_settings_prod_v2';

const DEFAULT_SETTINGS: AppSettings = {
  governmentName: 'PEMERINTAH PROVINSI SULAWESI UTARA',
  departmentName: 'DINAS PENDIDIKAN DAERAH',
  governmentLogo: '',
  schoolName: 'SMK NEGERI 1 KOTAMOBAGU',
  schoolSubtitle: 'Sistem Informasi Sarana & Prasarana (SARPRAS)',
  schoolAddress: 'Jalan Hi. Zakaria Imban, Kel. Molinow, Kec. Kotamobagu Barat, Kota Kotamobagu, Sulawesi Utara 95716',
  principalName: 'Drs. Sartono Paputungan, M.Pd',
  principalNip: '19680512 199303 1 008',
  schoolLogo: '',
  schoolEmail: 'smkn1kotamobagu@gmail.com',
  schoolWebsite: 'smkn1kotamobagu.sch.id',
  offlineMode: false,
};

const DEFAULT_USERS: UserAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    nama: 'Super Administrator',
    role: 'super',
    provider: 'local',
    isActivated: true,
  },
  {
    username: 'petugas',
    password: 'petugas123',
    nama: 'Petugas Sarpras',
    role: 'umum',
    provider: 'local',
    isActivated: true,
  },
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

class StorageService {
  private firestoreListenersUnsub: (() => void)[] = [];
  private onDataChangedCallbacks: (() => void)[] = [];

  // Register listener for data changes
  subscribeDataChanges(cb: () => void) {
    this.onDataChangedCallbacks.push(cb);
    return () => {
      this.onDataChangedCallbacks = this.onDataChangedCallbacks.filter(c => c !== cb);
    };
  }

  private notifyDataChanged() {
    this.onDataChangedCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Initialize central Firestore sync across computers/devices
  async initFirestoreSync() {
    try {
      // Immediate one-time sync so any new laptop/computer gets the latest database immediately
      await this.syncInitialDataFromFirestore();

      // 1. Listen to Settings
      const settingsDocRef = doc(db, 'settings', 'config');
      const unsubSettings = onSnapshot(
        settingsDocRef,
        snap => {
          if (snap.exists()) {
            const data = snap.data() as AppSettings;
            const merged = { ...this.getSettings(), ...data };
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
            if (data.schoolAdminGoogleEmail) {
              localStorage.setItem('sarpras_google_activated_flag', 'true');
              localStorage.setItem('sarpras_admin_google_email', data.schoolAdminGoogleEmail);
            }
            this.notifyDataChanged();
          }
        },
        error => {
          handleFirestoreError(error, OperationType.GET, 'settings/config');
        }
      );
      this.firestoreListenersUnsub.push(unsubSettings);

      // 2. Listen to Users Collection (Officers added from any computer)
      const usersColRef = collection(db, 'users');
      const unsubUsers = onSnapshot(
        usersColRef,
        snapshot => {
          if (!snapshot.empty) {
            const cloudUsers: UserAccount[] = [];
            snapshot.forEach(docSnap => {
              cloudUsers.push(docSnap.data() as UserAccount);
            });
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cloudUsers));
            const gUser = cloudUsers.find(u => u.provider === 'google' || (u.email && u.email.includes('@')));
            if (gUser && gUser.email) {
              localStorage.setItem('sarpras_google_activated_flag', 'true');
              localStorage.setItem('sarpras_admin_google_email', gUser.email);
            }
            this.notifyDataChanged();
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
      this.firestoreListenersUnsub.push(unsubUsers);

      // 3. Listen to Records Collection (Assets added from any computer)
      const recordsColRef = collection(db, 'records');
      const unsubRecords = onSnapshot(
        recordsColRef,
        snapshot => {
          if (!snapshot.empty) {
            const cloudRecords: SarprasRecord[] = [];
            snapshot.forEach(docSnap => {
              cloudRecords.push(docSnap.data() as SarprasRecord);
            });
            localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(cloudRecords));
            this.notifyDataChanged();
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, 'records');
        }
      );
      this.firestoreListenersUnsub.push(unsubRecords);
    } catch (err) {
      console.warn('Could not initialize realtime Firestore sync, falling back to local storage:', err);
    }
  }

  // Immediate pull from Firestore for cross-computer synchronization
  async syncInitialDataFromFirestore() {
    try {
      const setDocSnap = await getDoc(doc(db, 'settings', 'config'));
      if (setDocSnap.exists()) {
        const data = setDocSnap.data() as AppSettings;
        const merged = { ...this.getSettings(), ...data };
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
        if (data.schoolAdminGoogleEmail) {
          localStorage.setItem('sarpras_google_activated_flag', 'true');
          localStorage.setItem('sarpras_admin_google_email', data.schoolAdminGoogleEmail);
        }
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      if (!usersSnap.empty) {
        const cloudUsers: UserAccount[] = [];
        usersSnap.forEach(d => cloudUsers.push(d.data() as UserAccount));
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cloudUsers));
        const gUser = cloudUsers.find(u => u.provider === 'google' || (u.email && u.email.includes('@')));
        if (gUser && gUser.email) {
          localStorage.setItem('sarpras_google_activated_flag', 'true');
          localStorage.setItem('sarpras_admin_google_email', gUser.email);
        }
      }

      const recsSnap = await getDocs(collection(db, 'records'));
      if (!recsSnap.empty) {
        const cloudRecords: SarprasRecord[] = [];
        recsSnap.forEach(d => cloudRecords.push(d.data() as SarprasRecord));
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(cloudRecords));
      }

      this.notifyDataChanged();
    } catch (e) {
      console.warn('Initial Firestore fetch notice:', e);
    }
  }

  // Records
  getRecords(): SarprasRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveRecords(records: SarprasRecord[]) {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }

  // Users
  getUsers(): UserAccount[] {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      this.saveUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveUsers(DEFAULT_USERS);
        return DEFAULT_USERS;
      }
      // Ensure there is at least one super admin
      if (!parsed.some((u: UserAccount) => u.role === 'super')) {
        parsed.unshift(DEFAULT_USERS[0]);
        this.saveUsers(parsed);
      }
      return parsed;
    } catch {
      return DEFAULT_USERS;
    }
  }

  saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  // Check if system is activated with an administrator Google account (first time login)
  isSystemActivated(): boolean {
    if (localStorage.getItem('sarpras_google_activated_flag') === 'true') return true;
    if (localStorage.getItem('sarpras_admin_google_email')) return true;

    const settings = this.getSettings();
    if (settings.schoolAdminGoogleEmail && settings.schoolAdminGoogleEmail.trim().length > 0) return true;

    // Check if any user account is linked to Google or has an administrator email
    const users = this.getUsers();
    const gUser = users.find(u => u.provider === 'google' || (u.email && u.email.includes('@')));
    if (gUser && gUser.email) {
      settings.schoolAdminGoogleEmail = gUser.email;
      settings.schoolAdminGoogleName = gUser.nama;
      this.saveSettings(settings);
      localStorage.setItem('sarpras_google_activated_flag', 'true');
      localStorage.setItem('sarpras_admin_google_email', gUser.email);
      return true;
    }

    return false;
  }

  // Import & Merge Records (Adds new records and updates old ones, without losing existing data!)
  async importRecords(
    incomingRecords: Partial<SarprasRecord>[],
    currentUser: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ added: number; updated: number; total: number }> {
    let existingRecords = mode === 'replace' ? [] : this.getRecords();
    let added = 0;
    let updated = 0;

    for (const rec of incomingRecords) {
      if (!rec.nama) continue;
      const recType = rec.record_type || 'peralatan';
      const kodeNormal = (rec.kode || '').trim().toLowerCase();

      // Check if existing record matches by backendId or (kode + record_type)
      const existingIdx = existingRecords.findIndex(r => {
        if (rec.__backendId && r.__backendId === rec.__backendId) return true;
        if (kodeNormal && r.kode.trim().toLowerCase() === kodeNormal && r.record_type === recType) return true;
        return false;
      });

      if (existingIdx >= 0 && mode === 'merge') {
        // UPDATE existing record
        const old = existingRecords[existingIdx];
        const merged: SarprasRecord = {
          ...old,
          ...rec,
          __backendId: old.__backendId,
          record_type: old.record_type,
          tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
        existingRecords[existingIdx] = merged;
        updated++;
        try {
          await setDoc(doc(db, 'records', merged.__backendId), merged, { merge: true });
        } catch (e) {
          console.warn(e);
        }
      } else {
        // ADD new record
        const id = rec.__backendId || ('SAR-' + Math.random().toString(36).substring(2, 9).toUpperCase());
        const newRec: SarprasRecord = {
          __backendId: id,
          tanggal: rec.tanggal || new Date().toISOString().replace('T', ' ').substring(0, 19),
          record_type: recType,
          sub_type: (rec.sub_type as any) || (recType === 'habis_pakai' ? 'master' : ''),
          kode: rec.kode || ('KOD-' + Math.random().toString(36).substring(2, 7).toUpperCase()),
          nama: rec.nama || '',
          lokasi: rec.lokasi || '',
          gedung: rec.gedung || '',
          ruangan: rec.ruangan || '',
          penanggung_jawab: rec.penanggung_jawab || '',
          jumlah: rec.jumlah !== undefined ? Number(rec.jumlah) : 1,
          satuan: rec.satuan || (recType === 'habis_pakai' ? 'Pcs' : 'Unit'),
          kondisi: rec.kondisi || 'Baik',
          sumber: rec.sumber || '',
          pengarang: rec.pengarang || '',
          peminjam: rec.peminjam || '',
          status: rec.status || 'Aktif',
          keterangan: rec.keterangan || '',
          foto: rec.foto || '',
          luas: rec.luas || '',
          status_kepemilikan: rec.status_kepemilikan || '',
          tahun: rec.tahun || '',
          tgl_kembali: rec.tgl_kembali || '',
          pengguna: rec.pengguna || '',
          keperluan: rec.keperluan || '',
        };
        existingRecords.unshift(newRec);
        added++;
        try {
          await setDoc(doc(db, 'records', newRec.__backendId), newRec);
        } catch (e) {
          console.warn(e);
        }
      }
    }

    this.saveRecords(existingRecords);
    this.addLog(
      currentUser,
      'MASUK',
      'IMPORT_EXCEL',
      `Impor data selesai: ${added} aset baru ditambahkan, ${updated} aset lama diperbarui.`
    );
    this.notifyDataChanged();
    return { added, updated, total: added + updated };
  }

  // Hapus akun Google yang telah terkunci secara permanen dari sistem & Firestore
  async clearLockedGoogleAccount(): Promise<{ success: boolean; message: string }> {
    const settings = this.getSettings();
    const oldEmail = settings.schoolAdminGoogleEmail || localStorage.getItem('sarpras_admin_google_email');
    delete settings.schoolAdminGoogleEmail;
    delete settings.schoolAdminGoogleName;
    this.saveSettings(settings);

    localStorage.removeItem('sarpras_google_activated_flag');
    localStorage.removeItem('sarpras_admin_google_email');

    try {
      await setDoc(
        doc(db, 'settings', 'config'),
        {
          schoolAdminGoogleEmail: '',
          schoolAdminGoogleName: '',
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not clear Google account in Firestore:', e);
    }

    // Convert or retain existing users as local so they can login with password
    let users = this.getUsers();
    users = users.map(u => {
      if (u.provider === 'google' || (oldEmail && u.email?.toLowerCase() === oldEmail.toLowerCase())) {
        return {
          ...u,
          provider: 'local' as const,
          email: '',
          password: u.password || 'admin123',
        };
      }
      return u;
    });
    this.saveUsers(users);

    this.notifyDataChanged();
    return { success: true, message: 'Akun Google yang terkunci berhasil dihapus dan dilepaskan dari sistem.' };
  }

  // Register or Login via Google Account — STRICTLY ENFORCE ONLY 1 GOOGLE ACCOUNT
  async registerOrLoginWithGoogle(googleUser: {
    email: string;
    name: string;
    photoURL?: string;
  }): Promise<{ user: UserAccount; isNewRegistration: boolean }> {
    const users = this.getUsers();
    let settings = this.getSettings();

    // Verify remote Firestore settings first so no second computer can register another Google account
    try {
      const remoteSetDoc = await getDoc(doc(db, 'settings', 'config'));
      if (remoteSetDoc.exists()) {
        const cloudSet = remoteSetDoc.data() as AppSettings;
        if (cloudSet.schoolAdminGoogleEmail) {
          settings.schoolAdminGoogleEmail = cloudSet.schoolAdminGoogleEmail;
          if (cloudSet.schoolAdminGoogleName) settings.schoolAdminGoogleName = cloudSet.schoolAdminGoogleName;
          this.saveSettings(settings);
          localStorage.setItem('sarpras_google_activated_flag', 'true');
          localStorage.setItem('sarpras_admin_google_email', cloudSet.schoolAdminGoogleEmail);
        }
      }
    } catch (e) {
      console.warn('Checking remote settings notice:', e);
    }

    // Check if a Master Google Account is already registered
    const registeredMasterEmail = settings.schoolAdminGoogleEmail?.trim().toLowerCase();
    const currentGoogleEmail = googleUser.email.trim().toLowerCase();

    if (registeredMasterEmail && registeredMasterEmail !== currentGoogleEmail) {
      throw new Error(
        `Akses Ditolak: Hanya 1 Akun Google yang terdaftar sebagai Administrator Utama (${settings.schoolAdminGoogleEmail}). Petugas atau admin lain silakan masuk menggunakan Username & Password di tab 'Petugas / Pengguna' tanpa perlu akun Google.`
      );
    }

    const existingIndex = users.findIndex(
      u => u.email?.toLowerCase() === currentGoogleEmail ||
           u.username.toLowerCase() === currentGoogleEmail
    );

    let sessionUser: UserAccount;
    let isNewRegistration = false;

    if (existingIndex >= 0) {
      // Existing Google admin logging in
      sessionUser = {
        ...users[existingIndex],
        nama: googleUser.name || users[existingIndex].nama,
        photoURL: googleUser.photoURL || users[existingIndex].photoURL,
        provider: 'google',
        role: 'super', // Google account is always Master Super Admin
      };
      users[existingIndex] = sessionUser;
      this.saveUsers(users);
      this.addLog(
        sessionUser.username,
        'LOGIN',
        'AUTENTIKASI_GOOGLE',
        `User Google Administrator ${sessionUser.nama} (${sessionUser.email}) berhasil masuk ke sistem.`
      );
    } else {
      // First-time Google account registration (Only 1 allowed)
      isNewRegistration = true;

      sessionUser = {
        username: googleUser.email.split('@')[0],
        email: googleUser.email,
        nama: googleUser.name || googleUser.email.split('@')[0],
        photoURL: googleUser.photoURL,
        role: 'super', // Master Super Admin
        provider: 'google',
        isActivated: true,
      };

      users.push(sessionUser);
      this.saveUsers(users);

      this.addLog(
        sessionUser.username,
        'TAMBAH',
        'AKTIVASI_GOOGLE',
        `Sistem SARPRAS resmi diaktivasi oleh Akun Google Administrator: ${sessionUser.nama} (${sessionUser.email}) sebagai Super Administrator Utama.`
      );
    }

    // Persist as the master Google cloud storage administrator & mark activated
    settings.schoolAdminGoogleEmail = sessionUser.email;
    settings.schoolAdminGoogleName = sessionUser.nama;
    this.saveSettings(settings);
    localStorage.setItem('sarpras_google_activated_flag', 'true');
    if (sessionUser.email) {
      localStorage.setItem('sarpras_admin_google_email', sessionUser.email);
    }

    // Sync settings to Firestore
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        schoolAdminGoogleEmail: sessionUser.email,
        schoolAdminGoogleName: sessionUser.nama,
      }, { merge: true });
    } catch (err) {
      console.warn('Sync google settings to firestore:', err);
    }

    // Save to Firestore users collection so other computers can recognize it
    try {
      await setDoc(doc(db, 'users', sessionUser.username), sessionUser, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${sessionUser.username}`);
    }

    this.setCurrentUser(sessionUser);
    return { user: sessionUser, isNewRegistration };
  }

  // Set master administrator password upon Google registration
  async setMasterAdminPassword(usernameOrEmail: string, password: string): Promise<UserAccount> {
    const users = this.getUsers();
    const idx = users.findIndex(
      u => u.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() ||
           u.email?.toLowerCase() === usernameOrEmail.trim().toLowerCase()
    );
    if (idx < 0) {
      throw new Error('Akun administrator tidak ditemukan.');
    }
    users[idx].password = password.trim();
    this.saveUsers(users);

    try {
      await setDoc(doc(db, 'users', users[idx].username), { password: password.trim() }, { merge: true });
    } catch (e) {
      console.warn('Could not save password to Firestore:', e);
    }

    const updated = users[idx];
    this.setCurrentUser(updated);
    this.addLog(
      updated.username,
      'EDIT',
      'PENGATURAN_PASSWORD',
      `Administrator ${updated.nama} (${updated.email || updated.username}) telah berhasil mengatur kata sandi akun.`
    );
    return updated;
  }

  // Add User (Officers created by Admin can log in from ANY computer/laptop)
  async addUser(user: UserAccount, currentUser: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    if (
      users.some(
        u => u.username.toLowerCase() === user.username.trim().toLowerCase() ||
             (user.email && u.email?.toLowerCase() === user.email.trim().toLowerCase())
      )
    ) {
      throw new Error(`Username atau email '${user.username}' sudah terdaftar.`);
    }

    const newUser: UserAccount = {
      ...user,
      provider: 'local',
      isActivated: true,
    };

    users.push(newUser);
    this.saveUsers(users);

    // Save to centralized Firestore database
    try {
      await setDoc(doc(db, 'users', newUser.username), newUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.username}`);
    }

    this.addLog(currentUser, 'TAMBAH', 'USERS', `Menambahkan petugas baru: ${newUser.nama} (${newUser.role})`);
    return { success: true, message: 'Petugas berhasil ditambahkan dan dapat langsung login dari perangkat mana pun.' };
  }

  // Delete User
  async deleteUser(username: string, currentUser: string): Promise<{ success: boolean; message: string }> {
    let users = this.getUsers();
    const target = users.find(u => u.username === username);
    if (!target) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    users = users.filter(u => u.username !== username);
    this.saveUsers(users);

    // If target had locked Google email, clear it as well
    const settings = this.getSettings();
    if (target.email && settings.schoolAdminGoogleEmail?.toLowerCase() === target.email.toLowerCase()) {
      delete settings.schoolAdminGoogleEmail;
      delete settings.schoolAdminGoogleName;
      this.saveSettings(settings);
      setDoc(doc(db, 'settings', 'config'), {
        schoolAdminGoogleEmail: '',
        schoolAdminGoogleName: '',
      }, { merge: true }).catch(console.warn);
    }

    // Remove from Firestore
    try {
      await deleteDoc(doc(db, 'users', username));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${username}`);
    }

    this.addLog(currentUser, 'HAPUS', 'USERS', `Menghapus pengguna: ${target.nama} (${username})`);
    return { success: true, message: `Pengguna '${username}' berhasil dihapus.` };
  }

  // Logs
  getLogs(): LogActivity[] {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  addLog(user: string, aksi: LogActivity['aksi'], jenisData: string, keterangan: string) {
    const logs = this.getLogs();
    const newLog: LogActivity = {
      id: 'LOG-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: user || 'SYSTEM',
      aksi,
      jenisData,
      keterangan,
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));

    // Save to Firestore logs async
    try {
      setDoc(doc(db, 'logs', newLog.id), newLog).catch(e => console.warn(e));
    } catch (e) {
      console.warn(e);
    }
  }

  // Settings
  getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: AppSettings, userRole?: string) {
    if (userRole && userRole !== 'super') {
      throw new Error('Akses ditolak: Hanya Super Admin yang berhak mengatur pengaturan kop surat dan identitas sekolah.');
    }
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    try {
      setDoc(doc(db, 'settings', 'config'), settings, { merge: true }).catch(e => console.warn(e));
    } catch (e) {
      console.warn(e);
    }
  }

  updateLastDriveBackupTime(timeStr: string) {
    const settings = this.getSettings();
    settings.lastDriveBackupTime = timeStr;
    this.saveSettings(settings);
  }

  // Session
  getCurrentUser(): UserAccount | null {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  setCurrentUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  // Local login for officers / users without Google (accessible from ANY computer or laptop)
  async login(username: string, pass: string): Promise<{ success: boolean; user: UserAccount }> {
    let users = this.getUsers();
    let found = users.find(
      u =>
        (u.username.toLowerCase() === username.trim().toLowerCase() ||
          u.email?.toLowerCase() === username.trim().toLowerCase()) &&
        u.password === pass.trim()
    );

    // If not found in localStorage (e.g. newly opened on another computer/laptop), query Firestore directly!
    if (!found) {
      try {
        const uDoc = await getDoc(doc(db, 'users', username.trim()));
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserAccount;
          if (uData.password === pass.trim()) {
            found = uData;
            const updatedUsers = users.filter(u => u.username !== uData.username);
            updatedUsers.push(uData);
            this.saveUsers(updatedUsers);
          }
        } else {
          // Check query by username case-insensitively or email in Firestore
          const allDocs = await getDocs(collection(db, 'users'));
          allDocs.forEach(d => {
            const uData = d.data() as UserAccount;
            if (
              (uData.username.toLowerCase() === username.trim().toLowerCase() ||
                uData.email?.toLowerCase() === username.trim().toLowerCase()) &&
              uData.password === pass.trim()
            ) {
              found = uData;
            }
          });
          if (found) {
            const updatedUsers = users.filter(u => u.username !== (found as UserAccount).username);
            updatedUsers.push(found);
            this.saveUsers(updatedUsers);
          }
        }
      } catch (err) {
        console.warn('Firestore fallback check failed:', err);
      }
    }

    if (!found) {
      throw new Error('Username atau Password salah.');
    }

    const sessionUser: UserAccount = {
      username: found.username,
      email: found.email,
      nama: found.nama,
      role: found.role,
      photoURL: found.photoURL,
      provider: found.provider || 'local',
      isActivated: true,
    };

    this.setCurrentUser(sessionUser);
    this.addLog(found.username, 'LOGIN', 'AUTENTIKASI', `User ${found.nama} berhasil masuk ke aplikasi.`);
    return { success: true, user: sessionUser };
  }

  logout() {
    const curr = this.getCurrentUser();
    if (curr) {
      this.addLog(curr.username, 'LOGIN', 'AUTENTIKASI', `User ${curr.nama} keluar dari aplikasi.`);
    }
    this.setCurrentUser(null);
  }

  // Check duplicate code
  checkDuplicateCode(kode: string, jenisData: string, excludeId?: string): boolean {
    if (!kode) return false;
    const records = this.getRecords();
    const kNormal = kode.trim().toLowerCase();
    const jNormal = jenisData.trim().toLowerCase();

    return records.some(r => {
      if (excludeId && r.__backendId === excludeId) return false;
      return (
        String(r.kode || '').trim().toLowerCase() === kNormal &&
        String(r.record_type || '').trim().toLowerCase() === jNormal
      );
    });
  }

  // Add Record (Syncs to Firestore & local)
  async addRecord(record: Partial<SarprasRecord>, currentUser: string): Promise<{ success: boolean; record: SarprasRecord }> {
    if (!record.kode && record.record_type !== 'peminjaman') {
      throw new Error('Kode data wajib diisi.');
    }

    const records = this.getRecords();

    // Mutasi barang habis pakai (masuk / keluar)
    if (record.record_type === 'habis_pakai' && record.sub_type && record.sub_type !== 'master') {
      const target = records.find(
        r => r.record_type === 'habis_pakai' && r.kode.toLowerCase() === (record.kode || '').toLowerCase()
      );
      if (!target) {
        throw new Error(`Barang habis pakai dengan kode '${record.kode}' tidak ditemukan.`);
      }

      let currentStock = Number(target.jumlah) || 0;
      const delta = Number(record.jumlah) || 0;

      if (record.sub_type === 'masuk') {
        currentStock += delta;
        target.jumlah = currentStock;
        target.tanggal = new Date().toISOString().replace('T', ' ').substring(0, 19);
        this.saveRecords(records);
        // Sync to Firestore
        try {
          await setDoc(doc(db, 'records', target.__backendId), target, { merge: true });
        } catch (e) {
          console.warn(e);
        }
        this.addLog(currentUser, 'MASUK', 'habis_pakai', `Barang masuk '${target.nama}': +${delta}. Stok baru: ${currentStock}`);
        return { success: true, record: target };
      } else if (record.sub_type === 'keluar') {
        if (currentStock < delta) {
          throw new Error(`Stok barang tidak mencukupi! Stok saat ini: ${currentStock}, diminta: ${delta}.`);
        }
        currentStock -= delta;
        target.jumlah = currentStock;
        target.tanggal = new Date().toISOString().replace('T', ' ').substring(0, 19);
        this.saveRecords(records);
        // Sync to Firestore
        try {
          await setDoc(doc(db, 'records', target.__backendId), target, { merge: true });
        } catch (e) {
          console.warn(e);
        }
        this.addLog(currentUser, 'KELUAR', 'habis_pakai', `Barang keluar '${target.nama}': -${delta} untuk ${record.pengguna || '-'}. Sisa stok: ${currentStock}`);
        return { success: true, record: target };
      }
    }

    // Check duplicate code
    if (record.record_type !== 'habis_pakai' || record.sub_type === 'master') {
      if (this.checkDuplicateCode(record.kode!, record.record_type!)) {
        throw new Error(`Kode '${record.kode}' sudah digunakan pada kategori ${record.record_type}.`);
      }
    }

    const id = 'SAR-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const newRecord: SarprasRecord = {
      __backendId: id,
      tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
      record_type: record.record_type as any,
      sub_type: (record.sub_type as any) || '',
      kode: record.kode || '',
      nama: record.nama || '',
      lokasi: record.lokasi || '',
      gedung: record.gedung || '',
      ruangan: record.ruangan || '',
      penanggung_jawab: record.penanggung_jawab || '',
      jumlah: record.jumlah !== undefined ? Number(record.jumlah) : 1,
      satuan: record.satuan || '',
      kondisi: record.kondisi || 'Baik',
      sumber: record.sumber || '',
      pengarang: record.pengarang || '',
      peminjam: record.peminjam || '',
      status: record.status || 'Aktif',
      keterangan: record.keterangan || '',
      foto: record.foto || '',
      luas: record.luas || '',
      status_kepemilikan: record.status_kepemilikan || '',
      tahun: record.tahun || '',
      tgl_kembali: record.tgl_kembali || '',
      pengguna: record.pengguna || '',
      keperluan: record.keperluan || '',
    };

    records.unshift(newRecord);
    this.saveRecords(records);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'records', newRecord.__backendId), newRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `records/${newRecord.__backendId}`);
    }

    this.addLog(currentUser, 'TAMBAH', record.record_type || '', `Menambahkan aset baru: ${newRecord.nama} (ID: ${id})`);
    return { success: true, record: newRecord };
  }

  // Update Record
  async updateRecord(record: SarprasRecord, currentUser: string, userRole: string): Promise<{ success: boolean; record: SarprasRecord }> {
    if (userRole !== 'super') {
      throw new Error('Akses ditolak. Hanya peran Super Admin yang memiliki hak untuk mengubah data.');
    }
    if (!record.__backendId) {
      throw new Error('ID aset tidak ditemukan.');
    }

    const records = this.getRecords();
    const index = records.findIndex(r => r.__backendId === record.__backendId);
    if (index === -1) {
      throw new Error('Data aset tidak ditemukan dalam database.');
    }

    if (this.checkDuplicateCode(record.kode, record.record_type, record.__backendId)) {
      throw new Error(`Kode '${record.kode}' sudah digunakan oleh item lain.`);
    }

    record.tanggal = new Date().toISOString().replace('T', ' ').substring(0, 19);
    records[index] = { ...records[index], ...record };
    this.saveRecords(records);

    // Update in Firestore
    try {
      await setDoc(doc(db, 'records', record.__backendId), records[index], { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `records/${record.__backendId}`);
    }

    this.addLog(currentUser, 'EDIT', record.record_type, `Memperbarui aset ID: ${record.__backendId} (${record.nama})`);
    return { success: true, record: records[index] };
  }

  // Delete Record
  async deleteRecord(id: string, currentUser: string, userRole: string): Promise<{ success: boolean }> {
    if (userRole !== 'super') {
      throw new Error('Akses ditolak. Hanya peran Super Admin yang memiliki hak untuk menghapus data.');
    }

    const records = this.getRecords();
    const target = records.find(r => r.__backendId === id);
    if (!target) {
      throw new Error('Data tidak ditemukan.');
    }

    const filtered = records.filter(r => r.__backendId !== id);
    this.saveRecords(filtered);

    // Delete in Firestore
    try {
      await deleteDoc(doc(db, 'records', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `records/${id}`);
    }

    this.addLog(currentUser, 'HAPUS', target.record_type, `Menghapus aset ID: ${id} (${target.nama})`);
    return { success: true };
  }

  // Return Loan
  async returnLoan(id: string, currentUser: string): Promise<{ success: boolean; message: string }> {
    const records = this.getRecords();
    const item = records.find(r => r.__backendId === id);
    if (!item) {
      throw new Error('Data peminjaman tidak ditemukan.');
    }

    item.status = 'Dikembalikan';
    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    item.keterangan = (item.keterangan ? item.keterangan + ' | ' : '') + `Dikembalikan pada ${nowStr}`;

    this.saveRecords(records);

    // Update in Firestore
    try {
      await setDoc(doc(db, 'records', item.__backendId), item, { merge: true });
    } catch (e) {
      console.warn(e);
    }

    this.addLog(currentUser, 'KEMBALI', 'peminjaman', `Peminjaman aset '${item.nama}' oleh '${item.peminjam}' berhasil dikembalikan.`);
    return { success: true, message: 'Peralatan berhasil dikembalikan.' };
  }

  // Clear database to clean empty state
  async clearDatabase(currentUser: string) {
    const records = this.getRecords();
    this.saveRecords([]);

    // Clear records in Firestore
    for (const r of records) {
      try {
        await deleteDoc(doc(db, 'records', r.__backendId));
      } catch (e) {
        console.warn(e);
      }
    }

    this.addLog(currentUser, 'HAPUS', 'DATABASE', 'Membersihkan seluruh data inventaris.');
  }

  // Export full JSON backup
  exportBackupJSON(): string {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      school: this.getSettings().schoolName,
      records: this.getRecords(),
      users: this.getUsers().map(u => ({ username: u.username, email: u.email, nama: u.nama, role: u.role, provider: u.provider })),
      logs: this.getLogs(),
    };
    return JSON.stringify(data, null, 2);
  }

  // Import JSON backup
  async importBackupJSON(jsonStr: string, currentUser: string): Promise<{ success: boolean; count: number }> {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data.records)) {
        throw new Error('Format file cadangan tidak valid (tidak ada array records).');
      }
      this.saveRecords(data.records);

      // Push all to Firestore
      for (const r of data.records) {
        if (r.__backendId) {
          try {
            await setDoc(doc(db, 'records', r.__backendId), r);
          } catch (e) {
            console.warn(e);
          }
        }
      }

      if (Array.isArray(data.users) && data.users.length > 0) {
        this.saveUsers(data.users);
        for (const u of data.users) {
          if (u.username) {
            try {
              await setDoc(doc(db, 'users', u.username), u);
            } catch (e) {
              console.warn(e);
            }
          }
        }
      }

      this.addLog(currentUser, 'TAMBAH', 'BACKUP', `Memulihkan database dari file cadangan (${data.records.length} data).`);
      return { success: true, count: data.records.length };
    } catch (err: any) {
      throw new Error('Gagal memproses file cadangan: ' + err.message);
    }
  }
}

export const storage = new StorageService();
