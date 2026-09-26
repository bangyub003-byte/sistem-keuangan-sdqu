import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserAccount,
  Student,
  Transaction,
  KeuanganRecord,
  SchoolSetting,
  SyncStatus,
  UserRole,
  Announcement,
  KategoriDana
} from './types';
import { StorageService } from './services/storageService';
import { checkFrontendBuildVersion } from './utils/versionCheck';
import { APP_BUILD_VERSION } from './config';
import { NavbarHeader, BendaharaTab } from './components/NavbarHeader';
import { LoginView } from './components/LoginView';
import { PrintReportView, PrintMode } from './components/PrintReportView';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Role Dashboards & Menus
import { DashboardMenu } from './components/bendahara/DashboardMenu';
import { SantriMenu } from './components/bendahara/SantriMenu';
import { PembayaranMenu } from './components/bendahara/PembayaranMenu';
import { KeuanganMenu } from './components/bendahara/KeuanganMenu';
import { LaporanMenu } from './components/bendahara/LaporanMenu';
import { PengaturanMenu } from './components/bendahara/PengaturanMenu';
import { KepsekDashboard } from './components/kepsek/KepsekDashboard';
import { WaliDashboard } from './components/wali/WaliDashboard';

export default function App() {
  // Session & User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => StorageService.getCurrentUser());
  
  // App Data (Initialized from local cache, immediately refreshed from Google Spreadsheet)
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [keuangan, setKeuangan] = useState<KeuanganRecord[]>(() => StorageService.getKeuangan());
  const [setting, setSetting] = useState<SchoolSetting>(() => StorageService.getSetting());
  const [users, setUsers] = useState<UserAccount[]>(() => StorageService.getUsers());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => StorageService.getAnnouncements());
  const [kategoriDana, setKategoriDana] = useState<KategoriDana[]>(() => StorageService.getKategoriDana());

  // Version tracking
  const [dataVersion, setDataVersion] = useState<string>(() => StorageService.getDataVersion());
  const isFetchingRef = useRef(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sdq_dark_theme') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('sdq_dark_theme', isDarkMode ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Navigation
  const [activeBendaharaTab, setActiveBendaharaTab] = useState<BendaharaTab>('DASHBOARD');
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Print modal state
  const [printConfig, setPrintConfig] = useState<{
    isOpen: boolean;
    mode: PrintMode;
    data?: any;
    month?: string;
    hideWatermark?: boolean;
  }>({
    isOpen: false,
    mode: 'REKAP_PEMBAYARAN'
  });

  /**
   * Universal pull data function:
   * Mengambil data terbaru 7 Sheet dari Google Apps Script
   */
  const executePullData = useCallback(async (isSilent = false) => {
    if (!setting.gas_url || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    if (!isSilent) {
      setSyncStatus('syncing');
      setSyncError(null);
    }

    try {
      const res = await StorageService.pullFromSpreadsheet(setting.gas_url);
      if (res.success) {
        if (res.students !== undefined) setStudents(res.students);
        if (res.transactions !== undefined) setTransactions(res.transactions);
        if (res.keuangan !== undefined) setKeuangan(res.keuangan);
        if (res.kategori_dana !== undefined) setKategoriDana(res.kategori_dana);
        if (res.setting) setSetting(res.setting);
        if (res.users !== undefined) setUsers(res.users);
        if (res.announcements !== undefined) setAnnouncements(res.announcements);
        if (res.version) setDataVersion(res.version);
        setSyncStatus('synced');
        setSyncError(null);
      } else if (!isSilent) {
        setSyncStatus('error');
        setSyncError(res.message);
      }
    } catch (err: any) {
      if (!isSilent) {
        setSyncStatus('error');
        setSyncError(err.message || 'Gagal terhubung ke Google Apps Script');
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [setting.gas_url]);

  /**
   * DETEKSI VERSI FRONTEND (AUTO CACHE-BUSTER):
   * Membandingkan APP_BUILD_VERSION dengan versi yang tersimpan di localStorage.
   * Jika terdeteksi versi baru yang ter-deploy, browser akan otomatis reload SEKALI
   * dengan query cache buster sehingga pengguna tidak perlu hapus cache manual.
   */
  useEffect(() => {
    checkFrontendBuildVersion();
  }, []);

  /**
   * SINKRONISASI OTOMATIS:
   * 1. Saat dashboard dibuka / aplikasi dimuat: langsung ambil data fresh dari Google Apps Script.
   * 2. Setiap 10 detik: cek DATA_VERSION ke Google Apps Script (endpoint ringan).
   * 3. Jika DATA_VERSION berubah, otomatis tarik data terbaru tanpa membebani browser.
   * 4. Saat tab kembali aktif (visibilitychange), langsung cek versi.
   */
  useEffect(() => {
    if (!setting.gas_url) return;

    // 1. Initial fresh fetch on mount
    executePullData(true);

    // 2. Polling setiap 10 detik
    const interval = setInterval(async () => {
      if (isFetchingRef.current) return;
      try {
        const vRes = await StorageService.checkVersion(setting.gas_url!);
        if (vRes.success && vRes.version && vRes.version !== StorageService.getDataVersion()) {
          console.log(`[Auto-Sync] Versi data berubah dari ${StorageService.getDataVersion()} ke ${vRes.version}, memuat ulang data...`);
          await executePullData(true);
        }
      } catch {
        // silent polling error
      }
    }, 10000);

    // 3. Tab visibility check
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && setting.gas_url && !isFetchingRef.current) {
        try {
          const vRes = await StorageService.checkVersion(setting.gas_url);
          if (vRes.success && vRes.version && vRes.version !== StorageService.getDataVersion()) {
            await executePullData(true);
          }
        } catch {
          // silent
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setting.gas_url, executePullData]);

  // Announcements Handlers
  const handleAddAnnouncement = async (data: { judul: string; isi: string; is_penting?: boolean }) => {
    const author = currentUser?.nama || 'Bendahara Sekolah';
    setSyncStatus('syncing');
    const res = await StorageService.addAnnouncement(data, author);
    setAnnouncements(StorageService.getAnnouncements());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleToggleAnnouncement = async (id: string) => {
    const operator = currentUser?.nama || 'Bendahara Sekolah';
    setSyncStatus('syncing');
    const res = await StorageService.toggleAnnouncement(id, operator);
    setAnnouncements(StorageService.getAnnouncements());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const operator = currentUser?.nama || 'Bendahara Sekolah';
    setSyncStatus('syncing');
    const res = await StorageService.deleteAnnouncement(id, operator);
    setAnnouncements(StorageService.getAnnouncements());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Handle Login
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    StorageService.saveCurrentUser(user);
    setActiveBendaharaTab('DASHBOARD');
    // Ambil data terbaru saat login
    if (setting.gas_url) {
      executePullData(true);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    StorageService.saveCurrentUser(null);
  };

  // Manual Sync Button (Tarik dari Spreadsheet)
  const handlePullFromSpreadsheet = async () => {
    if (!setting.gas_url) {
      alert('URL Web App Google Apps Script belum diatur di menu Pengaturan.');
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.pullFromSpreadsheet(setting.gas_url);
    if (res.success) {
      if (res.students) setStudents(res.students);
      if (res.transactions) setTransactions(res.transactions);
      if (res.keuangan) setKeuangan(res.keuangan);
      if (res.setting) setSetting(res.setting);
      if (res.users) setUsers(res.users);
      if (res.announcements) setAnnouncements(res.announcements);
      if (res.version) setDataVersion(res.version);
      setSyncStatus('synced');
      alert(`Sinkronisasi Berhasil!\nData terbaru berhasil ditarik dari Google Spreadsheet:\n- ${res.students?.length || 0} Data Santri\n- ${res.transactions?.length || 0} Data Transaksi\n- ${res.keuangan?.length || 0} Data Kas`);
    } else {
      setSyncStatus('error');
      setSyncError(res.message);
      alert(`Gagal menarik data dari Google Spreadsheet:\n${res.message}`);
    }
  };

  // Student CRUD Operations
  const handleAddStudent = async (newStudentData: Omit<Student, 'id_siswa'>) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.addStudent(newStudentData, currentUser?.nama || 'Bendahara');
    setStudents(StorageService.getStudents());
    setUsers(StorageService.getUsers());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.updateStudent(updatedStudent, currentUser?.nama || 'Bendahara');
    setStudents(StorageService.getStudents());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleUpdateWaliContact = async (no_hp: string) => {
    if (!currentWaliStudent) return;
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.updateWaliContact(
      { nisn: currentWaliStudent.nisn, id_siswa: currentWaliStudent.id_siswa, nik: currentWaliStudent.nik },
      no_hp,
      currentUser?.nama || 'Wali Murid'
    );
    setStudents(StorageService.getStudents());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleDeleteStudent = async (id_siswa: string) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.deleteStudent(id_siswa, currentUser?.nama || 'Bendahara');
    setStudents(StorageService.getStudents());
    setUsers(StorageService.getUsers());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  const handleImportStudents = async (newStudentsList: Student[]) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.bulkImportStudents(newStudentsList, currentUser?.nama || 'Bendahara');
    setStudents(StorageService.getStudents());
    setUsers(StorageService.getUsers());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Payment Operations
  const handleProcessPayment = (data: {
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
  }): Transaction => {
    setSyncStatus('syncing');
    setSyncError(null);

    // Call asynchronous StorageService to execute single pipeline
    StorageService.processPayment(data).then(res => {
      setTransactions(StorageService.getTransactions());
      setKeuangan(StorageService.getKeuangan());
      if (res.gasResult && res.gasResult.status === 'error') {
        setSyncStatus('error');
        setSyncError(res.gasResult.message);
      } else {
        setSyncStatus('synced');
        if (res.gasResult?.version) setDataVersion(res.gasResult.version);
      }
    });

    // Immediate reactive state update for UI responsiveness
    const curTrx = StorageService.getTransactions();
    const curK = StorageService.getKeuangan();
    setTransactions(curTrx);
    setKeuangan(curK);

    return curTrx[0] || ({
      id_transaksi: `TRX-${Date.now()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      nisn: data.nisn,
      nama_siswa: data.nama_siswa,
      kelas: data.kelas,
      jenis: data.jenis,
      kategori: data.kategori,
      bulan: data.bulan,
      nominal_tagihan: data.nominal_tagihan,
      nominal_bayar: data.nominal_bayar,
      sisa: Math.max(0, data.nominal_tagihan - data.nominal_bayar),
      status: data.status,
      petugas: data.petugas,
      keterangan: data.keterangan
    });
  };

  // Batch Record Manual Arrears
  const handleBatchRecordManualArrears = async (
    records: Array<{
      nisn: string;
      nama_siswa: string;
      kelas: string;
      jenis: string;
      kategori?: string;
      bulan?: string;
      nominal: number;
      keterangan?: string;
    }>
  ) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.recordManualArrearsBatch(records, currentUser?.nama || 'Bendahara');
    setTransactions(StorageService.getTransactions());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
    return res.added;
  };

  // Cancel Payment
  const handleCancelPayment = async (trxId: string, reason: string) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.cancelPayment(trxId, reason, currentUser?.nama || 'Bendahara');
    setTransactions(StorageService.getTransactions());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Verify Payment Status
  const handleVerifyPaymentStatus = async (
    trxId: string,
    newStatus: 'LUNAS' | 'KURANG' | 'CANCEL',
    paidAmount?: number,
    reason?: string
  ) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.verifyTransaction(trxId, newStatus, paidAmount, reason, currentUser?.nama || 'Bendahara');
    setTransactions(StorageService.getTransactions());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Keuangan Add (Field Petugas SELALU dari currentUser.nama)
  const handleAddKeuangan = async (rec: Omit<KeuanganRecord, 'id_keuangan'>) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const petugasName = currentUser?.nama || 'Bendahara';
    const recWithPetugas = {
      ...rec,
      petugas: petugasName
    };
    const res = await StorageService.addKeuangan(recWithPetugas, petugasName);
    setKeuangan(StorageService.getKeuangan());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Keuangan Cancel
  const handleCancelKeuangan = async (id_keuangan: string, reason: string) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const operatorName = currentUser?.nama || 'Bendahara';
    const res = await StorageService.cancelKeuangan(id_keuangan, reason, operatorName);
    setKeuangan(StorageService.getKeuangan());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Kategori Dana Add
  const handleAddKategoriDana = async (cat: { nama_kategori: string; keterangan?: string }) => {
    setSyncStatus('syncing');
    setSyncError(null);
    const operatorName = currentUser?.nama || 'Bendahara';
    const res = await StorageService.addKategoriDana(cat.nama_kategori, cat.keterangan || '', operatorName);
    setKategoriDana(StorageService.getKategoriDana());
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Save Settings
  const handleSaveSetting = async (newSetting: SchoolSetting) => {
    setSetting(newSetting);
    setSyncStatus('syncing');
    setSyncError(null);
    const res = await StorageService.saveSetting(newSetting, currentUser?.nama || 'Bendahara');
    if (res.gasResult && res.gasResult.status === 'error') {
      setSyncStatus('error');
      setSyncError(res.gasResult.message);
    } else {
      setSyncStatus('synced');
      if (res.gasResult?.version) setDataVersion(res.gasResult.version);
    }
  };

  // Reset Demo Data
  const handleResetData = () => {
    StorageService.resetToDemo();
    setStudents(StorageService.getStudents());
    setTransactions(StorageService.getTransactions());
    setKeuangan(StorageService.getKeuangan());
    setKategoriDana(StorageService.getKategoriDana());
    setSetting(StorageService.getSetting());
    setUsers(StorageService.getUsers());
    setAnnouncements(StorageService.getAnnouncements());
    setDataVersion('');
  };

  // Print Handlers
  const handleOpenReceipt = (trx: Transaction) => {
    setPrintConfig({
      isOpen: true,
      mode: 'KUITANSI',
      data: trx
    });
  };

  const handleOpenPrintReport = (mode: PrintMode, month?: string) => {
    setPrintConfig({
      isOpen: true,
      mode: mode,
      month: month
    });
  };

  const handleOpenKartuSpp = (st: Student) => {
    setPrintConfig({
      isOpen: true,
      mode: 'KARTU_SPP',
      data: st
    });
  };

  // Student linked to logged-in Wali
  const currentWaliStudent = currentUser?.role === 'WALI'
    ? (students || []).find(s => {
        const userNisn = (currentUser.nisn || currentUser.username || '').toLowerCase().trim();
        return (
          s.nisn.toLowerCase().trim() === userNisn ||
          (currentUser.id_siswa && s.id_siswa === currentUser.id_siswa)
        );
      }) || null
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-600 selection:text-white">
      {/* If not logged in, show Login Screen */}
      {!currentUser ? (
        <LoginView setting={setting} users={users} students={students} onLoginSuccess={handleLogin} />
      ) : (
        <>
          {/* Top Navbar */}
          <NavbarHeader
            currentUser={currentUser}
            setting={setting}
            activeTab={activeBendaharaTab}
            syncStatus={syncStatus}
            isDarkMode={isDarkMode}
            announcementCount={announcements.filter(a => a.status_aktif !== false).length}
            onToggleDarkMode={handleToggleDarkMode}
            onTabChange={setActiveBendaharaTab}
            onLogout={handleLogout}
            onSyncClick={handlePullFromSpreadsheet}
          />

          {/* Main Content Area */}
          <main className="grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {/* Sync Error Alert if any */}
            {syncError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
                <span><strong>Gagal Sinkronisasi ke Spreadsheet:</strong> {syncError}</span>
                <button
                  onClick={handlePullFromSpreadsheet}
                  className="px-3 py-1 font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg cursor-pointer"
                >
                  Coba Tarik Ulang
                </button>
              </div>
            )}

            {/* ROLE: BENDAHARA */}
            {currentUser.role === 'BENDAHARA' && (
              <>
                {activeBendaharaTab === 'DASHBOARD' && (
                  <DashboardMenu
                    students={students}
                    transactions={transactions}
                    keuangan={keuangan}
                    setting={setting}
                    onNavigateTab={setActiveBendaharaTab}
                  />
                )}

                {activeBendaharaTab === 'SANTRI' && (
                  <SantriMenu
                    students={students}
                    transactions={transactions}
                    setting={setting}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onImportStudents={handleImportStudents}
                    onOpenKartuSpp={handleOpenKartuSpp}
                    onOpenReceipt={handleOpenReceipt}
                    operatorName={currentUser?.nama || 'Bendahara'}
                    onProcessPayment={handleProcessPayment}
                    onVerifyPaymentStatus={handleVerifyPaymentStatus}
                    onBatchRecordManualArrears={handleBatchRecordManualArrears}
                    onNavigateToPayment={(st) => {
                      setSelectedStudentForPayment(st);
                      setActiveBendaharaTab('PEMBAYARAN');
                    }}
                  />
                )}

                {activeBendaharaTab === 'PEMBAYARAN' && (
                  <PembayaranMenu
                    students={students}
                    transactions={transactions}
                    setting={setting}
                    operatorName={currentUser.nama}
                    onProcessPayment={handleProcessPayment}
                    onCancelPayment={handleCancelPayment}
                    onOpenReceipt={handleOpenReceipt}
                    onVerifyPaymentStatus={handleVerifyPaymentStatus}
                    selectedStudentFromParent={selectedStudentForPayment}
                  />
                )}

                {activeBendaharaTab === 'KEUANGAN' && (
                  <KeuanganMenu
                    keuangan={keuangan}
                    operatorName={currentUser.nama}
                    onAddKeuangan={handleAddKeuangan}
                    onCancelKeuangan={handleCancelKeuangan}
                    kategoriDana={kategoriDana}
                    onAddKategoriDana={handleAddKategoriDana}
                  />
                )}

                {activeBendaharaTab === 'LAPORAN' && (
                  <LaporanMenu
                    transactions={transactions}
                    students={students}
                    keuangan={keuangan}
                    setting={setting}
                    onOpenPrintReport={handleOpenPrintReport}
                    onUpdateSetting={handleSaveSetting}
                  />
                )}

                {activeBendaharaTab === 'PENGATURAN' && (
                  <PengaturanMenu
                    setting={setting}
                    announcements={announcements}
                    onSaveSetting={handleSaveSetting}
                    onResetData={handleResetData}
                    onPullFromSpreadsheet={handlePullFromSpreadsheet}
                    onAddAnnouncement={handleAddAnnouncement}
                    onToggleAnnouncement={handleToggleAnnouncement}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                  />
                )}
              </>
            )}

            {/* ROLE: KEPSEK (Kepala Sekolah) */}
            {currentUser.role === 'KEPSEK' && (
              <KepsekDashboard
                students={students}
                transactions={transactions}
                keuangan={keuangan}
                setting={setting}
                onOpenPrintReport={handleOpenPrintReport}
                onOpenKartuSpp={handleOpenKartuSpp}
                onOpenReceipt={handleOpenReceipt}
              />
            )}

            {/* ROLE: WALI (Wali Murid) */}
            {currentUser.role === 'WALI' && (
              currentWaliStudent ? (
                <WaliDashboard
                  currentUser={currentUser}
                  student={currentWaliStudent}
                  transactions={transactions}
                  setting={setting}
                  announcements={announcements}
                  onOpenReceipt={handleOpenReceipt}
                  onOpenKartuSpp={handleOpenKartuSpp}
                  onUpdateWaliContact={handleUpdateWaliContact}
                />
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Data Murid Belum Ditemukan</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sistem tidak menemukan data murid dengan NISN <strong>{currentUser.nisn || currentUser.username}</strong> dalam pangkalan data sekolah saat ini.
                  </p>
                  <p className="text-xs text-slate-500">
                    Pastikan NISN telah terdaftar dengan benar oleh Bendahara atau klik tombol keluar untuk masuk kembali.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Kembali ke Halaman Masuk</span>
                  </button>
                </div>
              )
            )}
          </main>

          {/* Footer */}
          <footer className="mt-auto bg-white border-t border-slate-200/90 py-4 px-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex justify-center items-center">
              <span className="font-medium text-slate-700">
                &copy; {new Date().getFullYear()} {setting.nama_sekolah} &bull; Sistem Informasi Keuangan Sekolah
              </span>
            </div>
          </footer>

          {/* Global Print Overlay / Modal */}
          {printConfig.isOpen && (
            <PrintReportView
              mode={printConfig.mode}
              data={printConfig.data}
              month={printConfig.month}
              transactions={transactions}
              students={students}
              keuangan={keuangan}
              setting={setting}
              hideWatermark={currentUser?.role === 'WALI' || Boolean(printConfig.hideWatermark)}
              onClose={() => setPrintConfig({ isOpen: false, mode: 'REKAP_PEMBAYARAN' })}
            />
          )}
        </>
      )}
    </div>
  );
}
