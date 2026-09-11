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
  ANNOUNCEMENTS: 'sdq_announcements_v1'
};

export class StorageService {
  // --- Read Methods ---
  static getSetting(): SchoolSetting {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTING);
      return data ? JSON.parse(data) : INITIAL_SETTING;
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

  static addAnnouncement(announcement: { judul: string; isi: string; is_penting?: boolean; penulis?: string }, author?: string): Announcement {
    const list = this.getAnnouncements();
    const newAnn: Announcement = {
      judul: announcement.judul,
      isi: announcement.isi,
      is_penting: !!announcement.is_penting,
      id_pengumuman: `ANN-${Date.now()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      penulis: announcement.penulis || author || 'Bendahara'
    };
    const updated = [newAnn, ...list];
    this.saveAnnouncements(updated);
    this.addLog(author || 'Bendahara', `Membuat Pengumuman: ${newAnn.judul}`);
    return newAnn;
  }

  static deleteAnnouncement(id: string, operator: string) {
    const list = this.getAnnouncements();
    const filtered = list.filter(a => a.id_pengumuman !== id);
    this.saveAnnouncements(filtered);
    this.addLog(operator || 'Bendahara', `Menghapus Pengumuman ID: ${id}`);
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

  static getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) return INITIAL_STUDENTS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
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

  static getKeuangan(): KeuanganRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KEUANGAN);
      if (!data) return INITIAL_KEUANGAN;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_KEUANGAN;
    } catch {
      return INITIAL_KEUANGAN;
    }
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

  static getCurrentUser(): UserAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // --- Write Methods ---
  static saveSetting(setting: SchoolSetting, currentUser?: string) {
    localStorage.setItem(STORAGE_KEYS.SETTING, JSON.stringify(setting));
    this.addLog(currentUser || "Bendahara", "Memperbarui konfigurasi & logo sekolah");
    
    // Background sync to GAS if configured
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "UPDATE_SETTING", setting).catch(() => {});
    }
  }

  static saveStudents(students: Student[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  static saveTransactions(transactions: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static saveKeuangan(keuangan: KeuanganRecord[]) {
    localStorage.setItem(STORAGE_KEYS.KEUANGAN, JSON.stringify(keuangan));
  }

  static setCurrentUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
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
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  }

  // --- Operations ---
  static addStudent(student: Omit<Student, 'id_siswa'>, operator: string): { student: Student; userAccount: UserAccount } {
    const students = this.getStudents();
    const newId = `SISWA-${Date.now()}`;
    const newStudent: Student = {
      ...student,
      id_siswa: newId
    };

    const updatedStudents = [newStudent, ...students];
    this.saveStudents(updatedStudents);

    // Otomatis buat akun User Wali
    const users = this.getUsers();
    const newWaliUser: UserAccount = {
      id_user: `USR-${student.nisn}`,
      username: student.nisn,
      password: student.nisn, // default password NISN
      nama: `${student.nama_wali} (Wali ${student.nama})`,
      role: 'WALI',
      id_siswa: newId
    };
    const updatedUsers = [...users.filter(u => u.username !== student.nisn), newWaliUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

    this.addLog(operator, `Menambahkan murid baru: ${student.nama} (NISN: ${student.nisn}) Kelas ${student.kelas}`);

    const setting = this.getSetting();
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "ADD_STUDENT", { ...newStudent, petugas: operator }).catch(() => {});
    }

    return { student: newStudent, userAccount: newWaliUser };
  }

  static updateStudent(student: Student, operator: string): Student {
    const students = this.getStudents();
    const updated = students.map(s => s.id_siswa === student.id_siswa ? student : s);
    this.saveStudents(updated);
    this.addLog(operator, `Memperbarui data murid: ${student.nama} (NISN: ${student.nisn})`);

    const setting = this.getSetting();
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "UPDATE_STUDENT", { ...student, petugas: operator }).catch(() => {});
    }

    return student;
  }

  static deleteStudent(studentId: string, operator: string) {
    const students = this.getStudents();
    const target = students.find(s => s.id_siswa === studentId);
    if (!target) return;

    const updated = students.filter(s => s.id_siswa !== studentId);
    this.saveStudents(updated);
    this.addLog(operator, `Menghapus data murid: ${target.nama} (NISN: ${target.nisn})`);
  }

  static processPayment(data: {
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
  }): Transaction {
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

    const updated = [newTrx, ...transactions];
    this.saveTransactions(updated);

    // Also auto add to Keuangan MASUK as income
    const keuangan = this.getKeuangan();
    const newKeuangan: KeuanganRecord = {
      id_keuangan: `KUG-${Date.now()}`,
      tanggal: dateStr,
      jenis: 'MASUK',
      kategori: data.kategori || 'SPP',
      nominal: data.nominal_bayar,
      keterangan: `Pembayaran ${data.jenis} an. ${data.nama_siswa} (${data.kelas})`,
      petugas: data.petugas
    };
    this.saveKeuangan([newKeuangan, ...keuangan]);

    this.addLog(data.petugas, `Input transaksi ${data.jenis} murid ${data.nama_siswa} Rp${data.nominal_bayar.toLocaleString('id-ID')} (${data.status})`);

    const setting = this.getSetting();
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "PROCESS_PAYMENT", newTrx).catch(() => {});
    }

    return newTrx;
  }

  static cancelPayment(trxId: string, reason: string, operator: string) {
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
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "CANCEL_PAYMENT", { id_transaksi: trxId, alasan_batal: reason, petugas: operator }).catch(() => {});
    }
  }

  // storageService.ts — method baru
static async verifyPayment(
  trxId: string,
  newStatus: 'LUNAS' | 'KURANG' | 'CANCEL',
  paidAmount: number,
  sisa: number,
  reason: string | undefined,
  operator: string
) {
  const transactions = this.getTransactions();
  const updated = transactions.map(t => t.id_transaksi === trxId
    ? { ...t, status: newStatus, nominal_bayar: paidAmount, sisa, alasan_batal: reason }
    : t
  );
  this.saveTransactions(updated);
  this.addLog(operator, `Verifikasi status transaksi ${trxId} menjadi ${newStatus}`);

  const setting = this.getSetting();
  if (setting.gas_url) {
    return this.callGasApi(setting.gas_url, "VERIFY_TRANSACTION", {
      id_transaksi: trxId, status: newStatus,
      nominal_bayar: paidAmount, sisa, alasan_batal: reason, petugas: operator
    });
  }
}
  static addKeuangan(record: Omit<KeuanganRecord, 'id_keuangan'>, operator: string): KeuanganRecord {
    const keuangan = this.getKeuangan();
    const newRec: KeuanganRecord = {
      ...record,
      id_keuangan: `KUG-${Date.now()}`,
      petugas: operator
    };

    this.saveKeuangan([newRec, ...keuangan]);
    this.addLog(operator, `Input Kas ${record.jenis} [${record.kategori}] Rp${record.nominal.toLocaleString('id-ID')} - ${record.keterangan}`);

    const setting = this.getSetting();
    if (setting.gas_url) {
      this.callGasApi(setting.gas_url, "ADD_KEUANGAN", newRec).catch(() => {});
    }

    return newRec;
  }

  // --- Remote Google Apps Script Bridge ---
  static async callGasApi(url: string, action: string, payload: any = {}) {
    if (!url || !url.startsWith('http')) return { status: 'error', message: 'URL Apps Script tidak valid' };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Apps Script CORS friendly
        },
        body: JSON.stringify({ action, payload })
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.warn("GAS Sync notice:", err);
      return { status: 'error', message: err.message || 'Koneksi ke Apps Script gagal' };
    }
  }

  static async testGasConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const pingUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(pingUrl, { method: 'GET' });
      const data = await res.json();
      if (data && data.status === 'success') {
        return { success: true, message: data.message || 'Koneksi Spreadsheet Aktif' };
      }
      return { success: false, message: data.message || 'Respon Apps Script tidak sesuai format' };
    } catch (err: any) {
      return { success: false, message: `Gagal menghubungi Apps Script: ${err.message || 'Periksa URL dan izin akses siapapun (Anyone)'}` };
    }
  }

  static saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static saveCurrentUser(user: UserAccount | null) {
    this.setCurrentUser(user);
  }

  static resetToDemo() {
    localStorage.setItem(STORAGE_KEYS.SETTING, JSON.stringify(INITIAL_SETTING));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.KEUANGAN, JSON.stringify(INITIAL_KEUANGAN));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
  }

  static async syncAllToGAS(data: {
    students: Student[];
    transactions: Transaction[];
    keuangan: KeuanganRecord[];
    setting: SchoolSetting;
    users: UserAccount[];
  }): Promise<{ success: boolean; message: string; remoteData?: any }> {
    if (!data.setting.gas_url) {
      return { success: false, message: 'URL Apps Script belum diisi' };
    }

    try {
      // First try SYNC_ALL which is supported in the currently deployed Apps Script code
      let res = await this.callGasApi(data.setting.gas_url, 'SYNC_ALL', data);
      
      // If error indicates action not supported, try SYNC_ALL_DATA
      if (res && res.status === 'error' && String(res.message).includes('Action tidak didukung')) {
        res = await this.callGasApi(data.setting.gas_url, 'SYNC_ALL_DATA', data);
      }

      if (res && res.status === 'success') {
        return { 
          success: true, 
          message: res.message || 'Sinkronisasi ke Spreadsheet berhasil!',
          remoteData: res.data 
        };
      }
      return { success: false, message: res?.message || 'Gagal sinkronisasi' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Koneksi terputus' };
    }
  }

  // Tarik Data Lengkap Langsung dari Google Spreadsheet
  static async pullFromSpreadsheet(gasUrl: string): Promise<{
    success: boolean;
    message: string;
    students?: Student[];
    transactions?: Transaction[];
    keuangan?: KeuanganRecord[];
    setting?: SchoolSetting;
    users?: UserAccount[];
  }> {
    if (!gasUrl) {
      return { success: false, message: 'URL Apps Script belum diisi di Pengaturan' };
    }

    try {
      let data: any = null;
      // 1. Coba request GET ?action=getAllData
      try {
        const pingUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getAllData`;
        const res = await fetch(pingUrl, { method: 'GET' });
        const json = await res.json();
        if (json && json.status === 'success' && json.data) {
          data = json.data;
        }
      } catch (e) {
        console.warn('GET getAllData fallback:', e);
      }

      // 2. Jika GET gagal, coba POST SYNC_ALL
      if (!data) {
        const postRes = await this.callGasApi(gasUrl, 'SYNC_ALL');
        if (postRes && postRes.status === 'success' && postRes.data) {
          data = postRes.data;
        } else {
          // 3. Coba POST SYNC_ALL_DATA
          const postRes2 = await this.callGasApi(gasUrl, 'SYNC_ALL_DATA');
          if (postRes2 && postRes2.status === 'success' && postRes2.data) {
            data = postRes2.data;
          }
        }
      }

      if (!data) {
        return { 
          success: false, 
          message: 'Tidak dapat mengambil data dari Spreadsheet. Pastikan Web App di-deploy dengan akses "Anyone".' 
        };
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
        status_aktif: s.status_aktif !== false && s.status_aktif !== 'false',
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

      // Parse Keuangan
      const parsedKeuangan: KeuanganRecord[] = Array.isArray(data.keuangan) ? data.keuangan.filter((k: any) => k.nominal || k.keterangan).map((k: any) => ({
        id_keuangan: String(k.id_keuangan || `KAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        tanggal: String(k.tanggal || new Date().toISOString().slice(0, 10)),
        jenis: k.jenis === 'KELUAR' ? 'KELUAR' : 'MASUK',
        kategori: String(k.kategori || 'Operasional'),
        nominal: Number(k.nominal) || 0,
        keterangan: String(k.keterangan || ''),
        bukti: k.bukti ? String(k.bukti) : undefined,
        petugas: String(k.petugas || 'Bendahara')
      })) : [];

      // Parse Setting / Pengaturan (termasuk Nama Kepala Sekolah, Bendahara, Rekening, QRIS)
      let parsedSetting: SchoolSetting | undefined = undefined;
      const rawSetting = data.settings || data.setting || data.pengaturan;
      if (rawSetting && typeof rawSetting === 'object') {
        const cur = this.getSetting();
        parsedSetting = {
          ...cur,
          nama_sekolah: String(rawSetting.nama_sekolah || rawSetting.sekolah || cur.nama_sekolah),
          logo: String(rawSetting.logo || cur.logo),
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
          qris_image: String(rawSetting.qris_image || rawSetting.qris || cur.qris_image || '')
        };
        this.saveSetting(parsedSetting, "Sinkronisasi Spreadsheet");
      }

      // Update penyimpanan lokal jika data ditemukan
      if (parsedStudents.length > 0) this.saveStudents(parsedStudents);
      if (parsedTransactions.length > 0) this.saveTransactions(parsedTransactions);
      if (parsedKeuangan.length > 0) this.saveKeuangan(parsedKeuangan);

      return {
        success: true,
        message: `Berhasil memuat ${parsedStudents.length} murid, ${parsedTransactions.length} transaksi, ${parsedKeuangan.length} data kas ${parsedSetting ? '& profil lembaga (Kepala Sekolah)' : ''} langsung dari Google Spreadsheet!`,
        students: parsedStudents.length > 0 ? parsedStudents : undefined,
        transactions: parsedTransactions.length > 0 ? parsedTransactions : undefined,
        keuangan: parsedKeuangan.length > 0 ? parsedKeuangan : undefined,
        setting: parsedSetting
      };
    } catch (err: any) {
      return { success: false, message: `Gagal membaca Google Spreadsheet: ${err.message}` };
    }
  }
}
