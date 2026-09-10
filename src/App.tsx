import React, { useState, useEffect, useCallback } from 'react';
import {
  UserAccount,
  Student,
  Transaction,
  KeuanganRecord,
  SchoolSetting,
  SyncStatus,
  UserRole,
  Announcement
} from './types';
import { StorageService } from './services/storageService';
import { NavbarHeader, BendaharaTab } from './components/NavbarHeader';
import { LoginView } from './components/LoginView';
import { PrintReportView, PrintMode } from './components/PrintReportView';
import { AlertCircle } from 'lucide-react';

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
  
  // App Data
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [keuangan, setKeuangan] = useState<KeuanganRecord[]>(() => StorageService.getKeuangan());
  const [setting, setSetting] = useState<SchoolSetting>(() => StorageService.getSetting());
  const [users, setUsers] = useState<UserAccount[]>(() => StorageService.getUsers());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => StorageService.getAnnouncements());

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

  // Announcements Handlers
  const handleAddAnnouncement = (data: { judul: string; isi: string; is_penting?: boolean }) => {
    const author = currentUser?.nama || 'Bendahara Sekolah';
    const newAnn = StorageService.addAnnouncement(data, author);
    setAnnouncements(prev => [newAnn, ...prev]);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const operator = currentUser?.nama || 'Bendahara Sekolah';
    StorageService.deleteAnnouncement(id, operator);
    setAnnouncements(prev => prev.filter(a => a.id_pengumuman !== id));
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
  }>({
    isOpen: false,
    mode: 'REKAP_PEMBAYARAN'
  });

  // Sync to GAS trigger
  const triggerGasSync = useCallback(async (
    updatedStudents?: Student[],
    updatedTrx?: Transaction[],
    updatedKeuangan?: KeuanganRecord[],
    updatedSetting?: SchoolSetting
  ) => {
    const curSetting = updatedSetting || setting;
    if (!curSetting.gas_url) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    const res = await StorageService.syncAllToGAS({
      students: updatedStudents || students,
      transactions: updatedTrx || transactions,
      keuangan: updatedKeuangan || keuangan,
      setting: curSetting,
      users
    });

    if (res.success) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
      setSyncError(res.message);
    }
  }, [setting, students, transactions, keuangan, users]);

  // Handle Login
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    StorageService.saveCurrentUser(user);
    setActiveBendaharaTab('DASHBOARD');
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    StorageService.saveCurrentUser(null);
  };

  // Manual Sync Button (Sync to Spreadsheet)
  const handleManualSync = async () => {
    await triggerGasSync();
  };

  // Pull All Data directly from Google Spreadsheet
  const handlePullFromSpreadsheet = async () => {
    if (!setting.gas_url) {
      alert('URL Web App Google Apps Script belum diatur di menu Pengaturan.');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    const res = await StorageService.pullFromSpreadsheet(setting.gas_url);
    if (res.success) {
      if (res.students && res.students.length > 0) {
        setStudents(res.students);
        StorageService.saveStudents(res.students);
      }
      if (res.transactions && res.transactions.length > 0) {
        setTransactions(res.transactions);
        StorageService.saveTransactions(res.transactions);
      }
      if (res.keuangan && res.keuangan.length > 0) {
        setKeuangan(res.keuangan);
        StorageService.saveKeuangan(res.keuangan);
      }
      setSyncStatus('synced');
      alert(`Sinkronisasi Berhasil!\nData terbaru berhasil ditarik dari Google Spreadsheet:\n- ${res.students?.length || 0} Data Santri\n- ${res.transactions?.length || 0} Data Transaksi\n- ${res.keuangan?.length || 0} Data Keuangan`);
    } else {
      setSyncStatus('error');
      setSyncError(res.message);
      alert(`Gagal menarik data dari Google Spreadsheet:\n${res.message}`);
    }
  };

  // Student CRUD Operations
  const handleAddStudent = (newStudentData: Omit<Student, 'id_siswa'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id_siswa: 'S' + Date.now().toString().slice(-5)
    };
    const updated = [newStudent, ...students];
    setStudents(updated);
    StorageService.saveStudents(updated);

    // Also create or link a Wali user account so they can login immediately with their NISN!
    const newWaliAccount: UserAccount = {
      id_user: 'U_WALI_' + newStudent.nisn,
      username: newStudent.nisn,
      password: newStudent.nisn,
      nama: newStudent.nama_wali || `Wali dari ${newStudent.nama}`,
      role: 'WALI',
      nisn: newStudent.nisn
    };
    const updatedUsers = [...users.filter(u => u.nisn !== newStudent.nisn), newWaliAccount];
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers);

    triggerGasSync(updated);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id_siswa === updatedStudent.id_siswa ? updatedStudent : s);
    setStudents(updated);
    StorageService.saveStudents(updated);
    triggerGasSync(updated);
  };

  const handleDeleteStudent = (id_siswa: string) => {
    const target = (students || []).find(s => s.id_siswa === id_siswa);
    const updated = (students || []).filter(s => s.id_siswa !== id_siswa);
    setStudents(updated);
    StorageService.saveStudents(updated);

    if (target) {
      const updatedUsers = (users || []).filter(u => u.nisn !== target.nisn);
      setUsers(updatedUsers);
      StorageService.saveUsers(updatedUsers);
    }

    triggerGasSync(updated);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    const updated = [...students, ...newStudents];
    setStudents(updated);
    StorageService.saveStudents(updated);

    // Register wali accounts for imported students
    const newWaliUsers: UserAccount[] = newStudents.map(st => ({
      id_user: 'U_WALI_' + st.nisn,
      username: st.nisn,
      password: st.nisn,
      nama: st.nama_wali || `Wali dari ${st.nama}`,
      role: 'WALI',
      nisn: st.nisn
    }));
    const updatedUsers = [...users, ...newWaliUsers];
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers);

    triggerGasSync(updated);
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
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const sisa = Math.max(0, data.nominal_tagihan - data.nominal_bayar);

    const newTrx: Transaction = {
      id_transaksi: 'TRX-' + now.getFullYear() + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
      tanggal: dateStr,
      nisn: data.nisn,
      nama_siswa: data.nama_siswa,
      kelas: data.kelas,
      jenis: data.jenis,
      kategori: data.kategori,
      bulan: data.bulan,
      nominal_tagihan: data.nominal_tagihan,
      nominal_bayar: data.nominal_bayar,
      sisa: sisa,
      status: data.status,
      petugas: data.petugas,
      keterangan: data.keterangan
    };

    const updatedTrx = [newTrx, ...transactions];
    setTransactions(updatedTrx);
    StorageService.saveTransactions(updatedTrx);

    // Also mirror to KEUANGAN Sheet as Pemasukan automatically!
    const mirroredKeuangan: KeuanganRecord = {
      id_keuangan: 'K' + Date.now().toString().slice(-6),
      tanggal: dateStr,
      jenis: 'MASUK',
      kategori: 'SPP',
      nominal: data.nominal_bayar,
      keterangan: `${data.jenis} ${data.bulan || ''} a.n ${data.nama_siswa} (${data.kelas})`,
      petugas: data.petugas
    };
    const updatedKeuangan = [mirroredKeuangan, ...keuangan];
    setKeuangan(updatedKeuangan);
    StorageService.saveKeuangan(updatedKeuangan);

    triggerGasSync(undefined, updatedTrx, updatedKeuangan);

    return newTrx;
  };

  // Cancel Payment (Salah Transaksi with Reason)
  const handleCancelPayment = (trxId: string, reason: string) => {
    const updated = transactions.map(t => {
      if (t.id_transaksi === trxId) {
        return {
          ...t,
          status: 'CANCEL' as const,
          alasan_batal: reason
        };
      }
      return t;
    });

    setTransactions(updated);
    StorageService.saveTransactions(updated);
    triggerGasSync(undefined, updated);
  };

  // Verifikasi Pembayaran Murid (Lunas, Kurang Bayar, atau Cancel yang sudah terlanjur)
  const handleVerifyPaymentStatus = (
    trxId: string,
    newStatus: 'LUNAS' | 'KURANG' | 'CANCEL',
    paidAmount?: number,
    reason?: string
  ) => {
    const updated = transactions.map(t => {
      if (t.id_transaksi === trxId) {
        const tagihan = t.nominal_tagihan || 0;
        let bayar = paidAmount !== undefined ? paidAmount : t.nominal_bayar;
        if (newStatus === 'LUNAS') {
          bayar = tagihan;
        }
        const sisa = Math.max(0, tagihan - bayar);
        return {
          ...t,
          status: newStatus,
          nominal_bayar: bayar,
          sisa: newStatus === 'LUNAS' ? 0 : sisa,
          alasan_batal: newStatus === 'CANCEL' ? (reason || 'Dibatalkan oleh Bendahara') : undefined
        };
      }
      return t;
    });

    setTransactions(updated);
    StorageService.saveTransactions(updated);

    StorageService.addLog(
      currentUser?.nama || 'Bendahara',
      `Verifikasi status transaksi ${trxId} menjadi ${newStatus}${reason ? ' [Alasan: ' + reason + ']' : ''}`
    );

    // Otomatis tersimpan ke Google Spreadsheet backend
    triggerGasSync(undefined, updated);
  };

  // Keuangan Add
  const handleAddKeuangan = (rec: Omit<KeuanganRecord, 'id_keuangan'>) => {
    const newRec: KeuanganRecord = {
      ...rec,
      id_keuangan: 'K' + Date.now().toString().slice(-6)
    };
    const updated = [newRec, ...keuangan];
    setKeuangan(updated);
    StorageService.saveKeuangan(updated);
    triggerGasSync(undefined, undefined, updated);
  };

  // Save Settings
  const handleSaveSetting = (newSetting: SchoolSetting) => {
    setSetting(newSetting);
    StorageService.saveSetting(newSetting);
    triggerGasSync(undefined, undefined, undefined, newSetting);
  };

  // Reset Demo Data
  const handleResetData = () => {
    StorageService.resetToDemo();
    setStudents(StorageService.getStudents());
    setTransactions(StorageService.getTransactions());
    setKeuangan(StorageService.getKeuangan());
    setSetting(StorageService.getSetting());
    setUsers(StorageService.getUsers());
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

  // Student linked to logged-in Wali: ONLY match exact NISN or id_siswa, NEVER fall back to another student
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
            announcementCount={announcements.length}
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
                    setting={setting}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onImportStudents={handleImportStudents}
                    onOpenKartuSpp={handleOpenKartuSpp}
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
                  />
                )}

                {activeBendaharaTab === 'LAPORAN' && (
                  <LaporanMenu
                    transactions={transactions}
                    students={students}
                    keuangan={keuangan}
                    setting={setting}
                    onOpenPrintReport={handleOpenPrintReport}
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
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="font-medium text-slate-700">
                &copy; {new Date().getFullYear()} {setting.nama_sekolah} &bull; Sistem Informasi Keuangan Sekolah
              </span>
              <span className="text-[11px] text-slate-400">
                Terhubung dengan Google Spreadsheet &bull; Google Drive &bull; Google Apps Script
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
              onClose={() => setPrintConfig({ isOpen: false, mode: 'REKAP_PEMBAYARAN' })}
            />
          )}
        </>
      )}
    </div>
  );
}
