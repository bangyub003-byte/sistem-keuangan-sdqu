import { Student, Transaction, KeuanganRecord, SchoolSetting, UserAccount, ActivityLog, Announcement } from '../types';
import { INITIAL_SETTING, INITIAL_USERS, INITIAL_STUDENTS, INITIAL_TRANSACTIONS, INITIAL_KEUANGAN, INITIAL_LOGS, INITIAL_ANNOUNCEMENTS } from '../data/initialData';

const STORAGE_KEYS = {
  SETTING: 'sdq_setting_v1',
  USERS: 'sdq_users_v1',
  STUDENTS: 'sdq_students_v1',
  TRANSACTIONS: 'sdq_transactions_v1',
  KEUANGAN: 'sdq_keuangan_v1',
  LOGS: 'sdq_logs_v1',
  CURRENT_USER: 'sdq_current_user_v1',
  ANNOUNCEMENTS: 'sdq_announcements_v1',
  DATA_VERSION: 'sdq_data_version_v1'
};

/**
 * Format Google Drive URL agar selalu menjadi URL publik langsung:
 * https://drive.google.com/uc?export=view&id=FILE_ID
 */
export function formatDriveUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:image')) return url; // Base64 image
  
  // Format /file/d/FILE_ID/view
  const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return `https://drive.google.com/uc?export=view&id=${matchD[1]}`;
  }

  // Format id=FILE_ID
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/uc?export=view&id=${matchId[1]}`;
  }

  return url;
}

export class StorageService {
  // --- Version Tracking ---
  static getDataVersion(): string {
    return localStorage.getItem(STORAGE_KEYS.DATA_VERSION) || '';
  }

  static setDataVersion(version: string) {
    if (version) {
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, String(version));
    }
  }

  // --- Read Methods (Local Cache) ---
  static getSetting(): SchoolSetting {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTING);
      if (!data) return INITIAL_SETTING;
      const parsed = JSON.parse(data);
      return {
        ...INITIAL_SETTING,
        ...parsed,
        logo: formatDriveUrl(parsed.logo || INITIAL_SETTING.logo),
        qris_image: formatDriveUrl(parsed.qris_image || INITIAL_SETTING.qris_image)
      };
    } catch {
      return INITIAL_SETTING;
    }
  }

  static getAnnouncements(): Announcement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (!data) return INITIAL_ANNOUNCEMENTS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ANNOUNCEMENTS;
    } catch {
      return INITIAL_ANNOUNCEMENTS;
    }
  }

  static saveAnnouncements(announcements: Announcement[]) {
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
  }

  static getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) return INITIAL_USERS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) return INITIAL_STUDENTS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed.map(s => ({ ...s, foto: formatDriveUrl(s.foto) }))
        : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
  }

  static saveStudents(students: Student[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  static getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return INITIAL_TRANSACTIONS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  static saveTransactions(transactions: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static getKeuangan(): KeuanganRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KEUANGAN);
      if (!data) return INITIAL_KEUANGAN;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed)
        ? parsed.map(k => ({ ...k, bukti: formatDriveUrl(k.bukti) }))
        : INITIAL_KEUANGAN;
    } catch {
      return INITIAL_KEUANGAN;
    }
  }

  static saveKeuangan(keuangan: KeuanganRecord[]) {
    localStorage.setItem(STORAGE_KEYS.KEUANGAN, JSON.stringify(keuangan));
  }

  static getLogs(): ActivityLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (!data) return INITIAL_LOGS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  }

  static saveLogs(logs: ActivityLog[]) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  static getCurrentUser(): UserAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static saveCurrentUser(user: UserAccount | null) {
    this.setCurrentUser(user);
  }

  static addLog(user: string, aktivitas: string) {
    const logs = this.getLogs();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog: ActivityLog = {
      id_log: `LOG-${Date.now()}`,
      tanggal: dateStr,
      user,
      aktivitas
    };
    
    const updated = [newLog, ...logs.slice(0, 100)];
    this.saveLogs(updated);
  }

  // --- Remote Google Apps Script Bridge ---
  static async callGasApi(url: string, action: string, payload: any = {}): Promise<any> {
    if (!url || !url.startsWith('http')) {
      return { status: 'error', message: 'URL Apps Script belum diisi atau tidak valid' };
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Apps Script CORS friendly
        },
        body: JSON.stringify({ action, payload })
      });
      const data = await response.json();
      if (data && data.version) {
        this.setDataVersion(String(data.version));
      }
      return data;
    } catch (err: any) {
      console.warn(`[GAS API Error] action: ${action}`, err);
      return { status: 'error', message: err.message || 'Koneksi ke Apps Script gagal. Periksa koneksi internet dan izin deployment "Anyone".' };
    }
  }

  /**
   * Cek versi data terkini ke Google Apps Script (GET ?action=getVersion)
   * Respons sangat cepat (<100ms) karena tidak menyentuh Spreadsheet langsung
   */
  static async checkVersion(gasUrl: string): Promise<{ success: boolean; version?: string }> {
    if (!gasUrl || !gasUrl.startsWith('http')) return { success: false };
    try {
      const checkUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getVersion&_t=${Date.now()}`;
      const res = await fetch(checkUrl, { method: 'GET' });
      const data = await res.json();
      if (data && data.status === 'success' && data.version) {
        return { success: true, version: String(data.version) };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  static async testGasConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const pingUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
      const res = await fetch(pingUrl, { method: 'GET' });
      const data = await res.json();
      if (data && data.status === 'success') {
        if (data.version) this.setDataVersion(data.version);
        return { success: true, message: data.message || 'Koneksi Google Apps Script Aktif!' };
      }
      return { success: false, message: data.message || 'Respon Apps Script tidak sesuai format' };
    } catch (err: any) {
      return { success: false, message: `Gagal menghubungi Apps Script: ${err.message || 'Periksa URL dan izin akses Anyone'}` };
    }
  }

  // --- Authoritative Single Pipeline CRUD Operations ---

  static async addStudent(studentData: Omit<Student, 'id_siswa'>, operator: string): Promise<{
    student: Student;
    userAccount: UserAccount;
    gasResult?: any;
  }> {
    const students = this.getStudents();
    const newId = `SISWA-${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id_siswa: newId,
      foto: formatDriveUrl(studentData.foto)
    };

    const updatedStudents = [newStudent, ...students];
    this.saveStudents(updatedStudents);

    // Akun Wali
    const users = this.getUsers();
    const newWaliUser: UserAccount = {
      id_user: `USR-${studentData.nisn}`,
      username: studentData.nisn,
      password: studentData.nisn,
      nama: `${studentData.nama_wali} (Wali ${studentData.nama})`,
      role: 'WALI',
      id_siswa: newId,
      nisn: studentData.nisn
    };
    const updatedUsers = [...users.filter(u => u.username !== studentData.nisn), newWaliUser];
    this.saveUsers(updatedUsers);

    this.addLog(operator, `Menambahkan murid baru: ${studentData.nama} (NISN: ${studentData.nisn}) Kelas ${studentData.kelas}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'ADD_STUDENT', { ...newStudent, petugas: operator });
    }

    return { student: newStudent, userAccount: newWaliUser, gasResult };
  }

  static async updateStudent(student: Student, operator: string): Promise<{
    student: Student;
    gasResult?: any;
  }> {
    const formatted: Student = {
      ...student,
      foto: formatDriveUrl(student.foto)
    };
    const students = this.getStudents();
    const updated = students.map(s => s.id_siswa === formatted.id_siswa ? formatted : s);
    this.saveStudents(updated);
    this.addLog(operator, `Memperbarui data murid: ${formatted.nama} (NISN: ${formatted.nisn})`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'UPDATE_STUDENT', { ...formatted, petugas: operator });
    }

    return { student: formatted, gasResult };
  }

  static async deleteStudent(studentId: string, operator: string): Promise<{
    gasResult?: any;
  }> {
    const students = this.getStudents();
    const target = students.find(s => s.id_siswa === studentId);
    if (!target) return { gasResult: { status: 'error', message: 'Murid tidak ditemukan' } };

    const updated = students.filter(s => s.id_siswa !== studentId);
    this.saveStudents(updated);

    // Hapus juga user wali terkait
    const users = this.getUsers().filter(u => u.username !== target.nisn && u.id_siswa !== studentId);
    this.saveUsers(users);

    this.addLog(operator, `Menghapus data murid: ${target.nama} (NISN: ${target.nisn})`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'DELETE_STUDENT', { id_siswa: studentId, nisn: target.nisn, petugas: operator });
    }

    return { gasResult };
  }

  static async bulkImportStudents(newStudents: Omit<Student, 'id_siswa'>[], operator: string): Promise<{
    added: Student[];
    gasResult?: any;
  }> {
    const students = this.getStudents();
    const users = this.getUsers();
    const added: Student[] = [];
    const newUsers: UserAccount[] = [];

    const existingNisns = new Set(students.map(s => s.nisn));

    newStudents.forEach((st, idx) => {
      if (existingNisns.has(st.nisn)) return;
      existingNisns.add(st.nisn);

      const newId = `SISWA-${Date.now()}-${idx}`;
      const studentObj: Student = {
        ...st,
        id_siswa: newId,
        foto: formatDriveUrl(st.foto)
      };
      added.push(studentObj);

      newUsers.push({
        id_user: `USR-${st.nisn}`,
        username: st.nisn,
        password: st.nisn,
        nama: `${st.nama_wali} (Wali ${st.nama})`,
        role: 'WALI',
        id_siswa: newId,
        nisn: st.nisn
      });
    });

    if (added.length > 0) {
      this.saveStudents([...added, ...students]);
      this.saveUsers([...newUsers, ...users]);
      this.addLog(operator, `Import massal ${added.length} murid baru`);
    }

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url && added.length > 0) {
      gasResult = await this.callGasApi(setting.gas_url, 'BULK_IMPORT_STUDENTS', { students: added, petugas: operator });
    }

    return { added, gasResult };
  }

  static async processPayment(data: {
    nisn: string;
    nama_siswa: string;
    kelas: string;
    jenis: string;
    kategori: string;
    bulan?: string;
    nominal_tagihan: number;
    nominal_bayar: number;
    status: 'LUNAS' | 'KURANG';
    petugas: string;
    keterangan?: string;
  }): Promise<{
    transaction: Transaction;
    keuangan: KeuanganRecord;
    gasResult?: any;
  }> {
    const transactions = this.getTransactions();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    
    const sisa = Math.max(0, data.nominal_tagihan - data.nominal_bayar);
    const newTrx: Transaction = {
      id_transaksi: `TRX-${now.getFullYear()}-${Date.now().toString().slice(-6)}`,
      tanggal: dateStr,
      nisn: data.nisn,
      nama_siswa: data.nama_siswa,
      kelas: data.kelas,
      jenis: data.jenis,
      kategori: data.kategori,
      bulan: data.bulan,
      nominal_tagihan: data.nominal_tagihan,
      nominal_bayar: data.nominal_bayar,
      sisa,
      status: data.status,
      petugas: data.petugas,
      keterangan: data.keterangan
    };

    const updatedTrx = [newTrx, ...transactions];
    this.saveTransactions(updatedTrx);

    // Sinkronkan ke Kas Keuangan MASUK
    const keuangan = this.getKeuangan();
    const newKeuangan: KeuanganRecord = {
      id_keuangan: `KUG-${Date.now()}`,
      tanggal: dateStr,
      jenis: 'MASUK',
      kategori: data.kategori || 'SPP',
      nominal: data.nominal_bayar,
      keterangan: `Pembayaran ${data.jenis} ${data.bulan || ''} a.n ${data.nama_siswa} (${data.kelas})`,
      petugas: data.petugas
    };
    this.saveKeuangan([newKeuangan, ...keuangan]);

    this.addLog(data.petugas, `Input transaksi ${data.jenis} murid ${data.nama_siswa} Rp${data.nominal_bayar.toLocaleString('id-ID')} (${data.status})`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'PROCESS_PAYMENT', newTrx);
    }

    return { transaction: newTrx, keuangan: newKeuangan, gasResult };
  }

  static async cancelPayment(trxId: string, reason: string, operator: string): Promise<{
    gasResult?: any;
  }> {
    const transactions = this.getTransactions();
    let foundTrx: Transaction | undefined;
    const updated = transactions.map(t => {
      if (t.id_transaksi === trxId) {
        foundTrx = t;
        return {
          ...t,
          status: 'CANCEL' as const,
          alasan_batal: reason
        };
      }
      return t;
    });

    this.saveTransactions(updated);
    this.addLog(operator, `MEMBATALKAN Transaksi ${trxId} (${foundTrx?.nama_siswa || ''}). Alasan: ${reason}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'CANCEL_PAYMENT', { id_transaksi: trxId, alasan_batal: reason, petugas: operator });
    }

    return { gasResult };
  }

  static async verifyTransaction(
    trxId: string,
    newStatus: 'LUNAS' | 'KURANG' | 'CANCEL',
    paidAmount?: number,
    reason?: string,
    operator: string = 'Bendahara'
  ): Promise<{
    gasResult?: any;
  }> {
    const transactions = this.getTransactions();
    let updatedTrx: Transaction | undefined;
    const updated = transactions.map(t => {
      if (t.id_transaksi === trxId) {
        const nominalBayar = paidAmount !== undefined ? paidAmount : t.nominal_bayar;
        const sisa = Math.max(0, t.nominal_tagihan - nominalBayar);
        updatedTrx = {
          ...t,
          status: newStatus,
          nominal_bayar: nominalBayar,
          sisa,
          alasan_batal: reason || t.alasan_batal
        };
        return updatedTrx;
      }
      return t;
    });

    this.saveTransactions(updated);
    this.addLog(operator, `Verifikasi transaksi ${trxId} status: ${newStatus}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'VERIFY_TRANSACTION', {
        id_transaksi: trxId,
        status: newStatus,
        nominal_bayar: paidAmount,
        sisa: updatedTrx?.sisa,
        alasan_batal: reason,
        petugas: operator
      });
    }

    return { gasResult };
  }

  static async addKeuangan(record: Omit<KeuanganRecord, 'id_keuangan'>, operator: string): Promise<{
    record: KeuanganRecord;
    gasResult?: any;
  }> {
    const keuangan = this.getKeuangan();
    const newRec: KeuanganRecord = {
      ...record,
      id_keuangan: `KUG-${Date.now()}`,
      petugas: operator,
      bukti: formatDriveUrl(record.bukti)
    };

    this.saveKeuangan([newRec, ...keuangan]);
    this.addLog(operator, `Input Kas ${record.jenis} [${record.kategori}] Rp${record.nominal.toLocaleString('id-ID')} - ${record.keterangan}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'ADD_KEUANGAN', newRec);
    }

    return { record: newRec, gasResult };
  }

  static async saveSetting(setting: SchoolSetting, currentUser: string = 'Bendahara'): Promise<{
    gasResult?: any;
  }> {
    const formattedSetting: SchoolSetting = {
      ...setting,
      logo: formatDriveUrl(setting.logo),
      qris_image: formatDriveUrl(setting.qris_image)
    };
    localStorage.setItem(STORAGE_KEYS.SETTING, JSON.stringify(formattedSetting));
    this.addLog(currentUser, 'Memperbarui konfigurasi & profil sekolah');

    let gasResult: any = null;
    if (formattedSetting.gas_url) {
      gasResult = await this.callGasApi(formattedSetting.gas_url, 'UPDATE_SETTING', formattedSetting);
    }

    return { gasResult };
  }

  static async addAnnouncement(announcement: { judul: string; isi: string; is_penting?: boolean; penulis?: string }, author: string = 'Bendahara'): Promise<{
    announcement: Announcement;
    gasResult?: any;
  }> {
    const list = this.getAnnouncements();
    const newAnn: Announcement = {
      judul: announcement.judul,
      isi: announcement.isi,
      is_penting: !!announcement.is_penting,
      id_pengumuman: `ANN-${Date.now()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      penulis: announcement.penulis || author,
      status_aktif: true
    };
    const updated = [newAnn, ...list];
    this.saveAnnouncements(updated);
    this.addLog(author, `Membuat Pengumuman: ${newAnn.judul}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'ADD_ANNOUNCEMENT', newAnn);
    }

    return { announcement: newAnn, gasResult };
  }

  static async toggleAnnouncement(id: string, operator: string = 'Bendahara'): Promise<{
    announcement?: Announcement;
    gasResult?: any;
  }> {
    const list = this.getAnnouncements();
    let targetAnn: Announcement | undefined;
    const updated = list.map(a => {
      const aId = a.id_pengumuman || (a as any).id;
      if (aId === id) {
        const cur = a.status_aktif !== false;
        targetAnn = { ...a, status_aktif: !cur };
        return targetAnn;
      }
      return a;
    });

    this.saveAnnouncements(updated);
    this.addLog(operator, `Mengubah status aktif pengumuman ID: ${id}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url && targetAnn) {
      gasResult = await this.callGasApi(setting.gas_url, 'TOGGLE_ANNOUNCEMENT', {
        id_pengumuman: id,
        status_aktif: targetAnn.status_aktif,
        petugas: operator
      });
    }

    return { announcement: targetAnn, gasResult };
  }

  static async deleteAnnouncement(id: string, operator: string = 'Bendahara'): Promise<{
    gasResult?: any;
  }> {
    const list = this.getAnnouncements();
    const filtered = list.filter(a => (a.id_pengumuman || (a as any).id) !== id);
    this.saveAnnouncements(filtered);
    this.addLog(operator, `Menghapus Pengumuman ID: ${id}`);

    const setting = this.getSetting();
    let gasResult: any = null;
    if (setting.gas_url) {
      gasResult = await this.callGasApi(setting.gas_url, 'DELETE_ANNOUNCEMENT', { id_pengumuman: id, petugas: operator });
    }

    return { gasResult };
  }

  static resetToDemo() {
    localStorage.setItem(STORAGE_KEYS.SETTING, JSON.stringify(INITIAL_SETTING));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.KEUANGAN, JSON.stringify(INITIAL_KEUANGAN));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
    localStorage.removeItem(STORAGE_KEYS.DATA_VERSION);
  }

  /**
   * Tarik Data Lengkap Langsung dari Google Spreadsheet (7 Sheet)
   * Menyegarkan cache lokal dan mengembalikan data terbaru ke React state
   */
  static async pullFromSpreadsheet(gasUrl: string): Promise<{
    success: boolean;
    message: string;
    version?: string;
    students?: Student[];
    transactions?: Transaction[];
    keuangan?: KeuanganRecord[];
    setting?: SchoolSetting;
    users?: UserAccount[];
    announcements?: Announcement[];
  }> {
    if (!gasUrl || !gasUrl.startsWith('http')) {
      return { success: false, message: 'URL Apps Script belum diisi di Pengaturan' };
    }

    try {
      let data: any = null;
      let remoteVersion: string = '';

      // 1. Coba request GET ?action=getAllData
      try {
        const fetchUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getAllData&_t=${Date.now()}`;
        const res = await fetch(fetchUrl, { method: 'GET' });
        const json = await res.json();
        if (json && json.status === 'success' && json.data) {
          data = json.data;
          remoteVersion = json.version || '';
        }
      } catch (e) {
        console.warn('GET getAllData fallback to POST:', e);
      }

      // 2. Jika GET gagal, coba POST GET_ALL_DATA
      if (!data) {
        const postRes = await this.callGasApi(gasUrl, 'GET_ALL_DATA');
        if (postRes && postRes.status === 'success' && postRes.data) {
          data = postRes.data;
          remoteVersion = postRes.version || '';
        }
      }

      if (!data) {
        return { 
          success: false, 
          message: 'Tidak dapat mengambil data dari Spreadsheet. Pastikan Web App di-deploy dengan akses "Anyone".' 
        };
      }

      if (remoteVersion) {
        this.setDataVersion(remoteVersion);
      }

      // Parse Siswa
      const parsedStudents: Student[] = Array.isArray(data.students) ? data.students.filter((s: any) => s.nisn || s.nama).map((s: any) => ({
        id_siswa: String(s.id_siswa || `S-${s.nisn || Date.now()}`),
        nisn: String(s.nisn || ''),
        nik: String(s.nik || ''),
        nama: String(s.nama || ''),
        tempat_lahir: String(s.tempat_lahir || ''),
        tanggal_lahir: String(s.tanggal_lahir || ''),
        jenis_kelamin: (s.jenis_kelamin === 'P' || s.jenis_kelamin === 'Perempuan') ? 'P' : 'L',
        kelas: String(s.kelas || '1-A'),
        nama_wali: String(s.nama_wali || ''),
        no_hp: String(s.no_hp || ''),
        alamat: String(s.alamat || ''),
        foto: formatDriveUrl(s.foto),
        status_aktif: s.status_aktif !== false && s.status_aktif !== 'false' && s.status_aktif !== 0,
        spp_nominal: Number(s.spp_nominal) || 500000,
        spp_kategori: String(s.spp_kategori || 'REGULER'),
        spp_catatan: String(s.spp_catatan || '')
      })) : [];

      // Parse Transaksi
      const parsedTransactions: Transaction[] = Array.isArray(data.transactions) ? data.transactions.filter((t: any) => t.id_transaksi || t.nisn).map((t: any) => ({
        id_transaksi: String(t.id_transaksi || `TRX-${Date.now()}`),
        tanggal: String(t.tanggal || new Date().toISOString().slice(0, 10)),
        nisn: String(t.nisn || ''),
        nama_siswa: String(t.nama_siswa || parsedStudents.find(s => s.nisn === String(t.nisn))?.nama || ''),
        kelas: String(t.kelas || parsedStudents.find(s => s.nisn === String(t.nisn))?.kelas || ''),
        jenis: String(t.jenis || 'SPP'),
        kategori: String(t.kategori || 'SPP'),
        bulan: t.bulan ? String(t.bulan) : undefined,
        nominal_tagihan: Number(t.nominal_tagihan) || 0,
        nominal_bayar: Number(t.nominal_bayar) || 0,
        sisa: Number(t.sisa) || 0,
        status: (t.status === 'LUNAS' || t.status === 'KURANG' || t.status === 'CANCEL') ? t.status : 'LUNAS',
        petugas: String(t.petugas || 'Bendahara'),
        keterangan: t.keterangan ? String(t.keterangan) : undefined,
        alasan_batal: t.alasan_batal ? String(t.alasan_batal) : undefined
      })) : [];

      // Parse Keuangan Kas
      const parsedKeuangan: KeuanganRecord[] = Array.isArray(data.keuangan) ? data.keuangan.filter((k: any) => k.nominal || k.keterangan).map((k: any) => ({
        id_keuangan: String(k.id_keuangan || `KAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        tanggal: String(k.tanggal || new Date().toISOString().slice(0, 10)),
        jenis: k.jenis === 'KELUAR' ? 'KELUAR' : 'MASUK',
        kategori: String(k.kategori || 'Operasional'),
        nominal: Number(k.nominal) || 0,
        keterangan: String(k.keterangan || ''),
        bukti: formatDriveUrl(k.bukti),
        petugas: String(k.petugas || 'Bendahara')
      })) : [];

      // Parse Users
      const parsedUsers: UserAccount[] = Array.isArray(data.users) ? data.users.filter((u: any) => u.username).map((u: any) => ({
        id_user: String(u.id_user || `USR-${u.username}`),
        username: String(u.username),
        password: String(u.password || u.username),
        nama: String(u.nama || u.username),
        role: (u.role === 'BENDAHARA' || u.role === 'KEPSEK' || u.role === 'WALI') ? u.role : 'WALI',
        id_siswa: u.id_siswa ? String(u.id_siswa) : undefined,
        nisn: u.nisn ? String(u.nisn) : undefined
      })) : [];

      // Parse Pengumuman
      const parsedAnnouncements: Announcement[] = Array.isArray(data.announcements) ? data.announcements.filter((a: any) => a.judul || a.isi).map((a: any) => ({
        id_pengumuman: String(a.id_pengumuman || `ANN-${Date.now()}`),
        tanggal: String(a.tanggal || new Date().toISOString().slice(0, 10)),
        judul: String(a.judul || ''),
        isi: String(a.isi || ''),
        penulis: String(a.penulis || 'Bendahara'),
        is_penting: a.is_penting === true || a.is_penting === 'true' || a.is_penting === 1,
        status_aktif: a.status_aktif !== false && a.status_aktif !== 'false' && a.status_aktif !== 0
      })) : [];

      // Parse Setting (Profil Sekolah, Kepala Sekolah, Rekening)
      let parsedSetting: SchoolSetting | undefined = undefined;
      const rawSetting = data.settings || data.setting || data.pengaturan;
      if (rawSetting && typeof rawSetting === 'object') {
        const cur = this.getSetting();
        parsedSetting = {
          ...cur,
          nama_sekolah: String(rawSetting.nama_sekolah || rawSetting.sekolah || cur.nama_sekolah),
          logo: formatDriveUrl(rawSetting.logo || cur.logo),
          alamat: String(rawSetting.alamat || cur.alamat),
          no_wa: String(rawSetting.no_wa || rawSetting.whatsapp || cur.no_wa),
          kop_surat: String(rawSetting.kop_surat || cur.kop_surat),
          tahun_ajaran: String(rawSetting.tahun_ajaran || rawSetting.ta || cur.tahun_ajaran),
          nama_kepsek: String(rawSetting.nama_kepsek || rawSetting.nama_kepala_sekolah || rawSetting.kepala_sekolah || rawSetting.kepsek || cur.nama_kepsek),
          nama_bendahara: String(rawSetting.nama_bendahara || rawSetting.bendahara || cur.nama_bendahara),
          spp_default_nominal: Number(rawSetting.spp_default_nominal) || cur.spp_default_nominal,
          nama_bank: String(rawSetting.nama_bank || rawSetting.bank || cur.nama_bank || ''),
          no_rekening: String(rawSetting.no_rekening || rawSetting.rekening || rawSetting.norek || cur.no_rekening || ''),
          atas_nama_rekening: String(rawSetting.atas_nama_rekening || rawSetting.atas_nama || cur.atas_nama_rekening || ''),
          qris_image: formatDriveUrl(rawSetting.qris_image || rawSetting.qris || cur.qris_image || '')
        };
        localStorage.setItem(STORAGE_KEYS.SETTING, JSON.stringify(parsedSetting));
      }

      // Update penyimpanan lokal
      if (parsedStudents.length > 0) this.saveStudents(parsedStudents);
      if (parsedTransactions.length > 0) this.saveTransactions(parsedTransactions);
      if (parsedKeuangan.length > 0) this.saveKeuangan(parsedKeuangan);
      if (parsedUsers.length > 0) this.saveUsers(parsedUsers);
      if (parsedAnnouncements.length > 0) this.saveAnnouncements(parsedAnnouncements);

      return {
        success: true,
        version: remoteVersion,
        message: `Berhasil memuat ${parsedStudents.length} murid, ${parsedTransactions.length} transaksi, ${parsedKeuangan.length} kas ${parsedSetting ? '& profil lembaga' : ''} langsung dari Google Spreadsheet!`,
        students: parsedStudents.length > 0 ? parsedStudents : undefined,
        transactions: parsedTransactions.length > 0 ? parsedTransactions : undefined,
        keuangan: parsedKeuangan.length > 0 ? parsedKeuangan : undefined,
        setting: parsedSetting,
        users: parsedUsers.length > 0 ? parsedUsers : undefined,
        announcements: parsedAnnouncements.length > 0 ? parsedAnnouncements : undefined
      };
    } catch (err: any) {
      return { success: false, message: `Gagal membaca Google Spreadsheet: ${err.message}` };
    }
  }
}
