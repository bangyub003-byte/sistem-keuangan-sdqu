import React, { useState, useMemo, useEffect } from 'react';
import { Student, Transaction, SchoolSetting } from '../../types';
import { StorageService } from '../../services/storageService';
import { Search, CreditCard, Printer, CheckCircle, AlertCircle, XCircle, User, Calendar, Award, RotateCcw, FileText, Check, ShieldAlert, Plus, PenTool, MessageCircle, Phone, Trash2 } from 'lucide-react';
import { createPaymentConfirmationWaUrl, createTunggakanReminderWaUrl } from '../../utils/whatsappHelper';
import { calculateStudentSppStatus, getStandardTransactionTitle, getAcademicYearMonths, formatTransactionTimestamp } from '../../utils/sppLogic';

export interface PaymentItemRow {
  id: string;
  paymentType: string;
  isManualPayment: boolean;
  manualPaymentInput: string;
  selectedMonth: string;
  customTagihan: number;
  nominalBayar: number;
}

interface PembayaranMenuProps {
  students: Student[];
  transactions: Transaction[];
  setting: SchoolSetting;
  operatorName: string;
  onProcessPayment: (data: {
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
  }) => Transaction;
  onProcessPaymentBatch?: (items: Array<{
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
  }>, customKuitansiId?: string) => Promise<{ transactions: Transaction[]; kuitansiId: string }>;
  onCancelPayment: (trxId: string, reason: string) => void;
  onOpenReceipt: (trx: Transaction) => void;
  onVerifyPaymentStatus?: (trxId: string, newStatus: 'LUNAS' | 'KURANG' | 'CANCEL', paidAmount?: number, reason?: string) => void;
  selectedStudentFromParent?: Student | null;
}

export const PembayaranMenu: React.FC<PembayaranMenuProps> = ({
  students = [],
  transactions = [],
  setting,
  operatorName,
  onProcessPayment,
  onProcessPaymentBatch,
  onCancelPayment,
  onOpenReceipt,
  onVerifyPaymentStatus,
  selectedStudentFromParent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(selectedStudentFromParent || students[0] || null);

  const defaultMonthStr = () => {
    const startM = setting?.spp_mulai_bulan || 'Oktober';
    const startY = setting?.spp_mulai_tahun || 2026;
    return `${startM} ${startY}`;
  };

  const getStudentDefaultSpp = (st?: Student | null) => {
    return st?.spp_nominal || setting?.spp_default_nominal || 85000;
  };

  const createDefaultItem = (st?: Student | null): PaymentItemRow => ({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    paymentType: 'SPP Bulanan',
    isManualPayment: false,
    manualPaymentInput: '',
    selectedMonth: defaultMonthStr(),
    customTagihan: getStudentDefaultSpp(st),
    nominalBayar: getStudentDefaultSpp(st)
  });

  const [paymentItems, setPaymentItems] = useState<PaymentItemRow[]>([
    createDefaultItem(selectedStudentFromParent || students[0])
  ]);
  const [customPaymentTypes, setCustomPaymentTypes] = useState<string[]>([]);
  const [keterangan, setKeterangan] = useState('');

  // Cancel Transaction Modal
  const [cancelModalTrx, setCancelModalTrx] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Verifikasi Kurang Bayar Modal
  const [kurangModalTrx, setKurangModalTrx] = useState<Transaction | null>(null);
  const [kurangBayarInput, setKurangBayarInput] = useState<number>(0);

  useEffect(() => {
    if (selectedStudentFromParent) {
      setSelectedStudent(selectedStudentFromParent);
      const sppFee = getStudentDefaultSpp(selectedStudentFromParent);
      setPaymentItems(prev => {
        if (prev.length === 1 && (prev[0].paymentType.startsWith('SPP') || prev[0].paymentType === 'SPP Bulanan')) {
          return [{
            ...prev[0],
            customTagihan: sppFee,
            nominalBayar: sppFee
          }];
        }
        return prev;
      });
    }
  }, [selectedStudentFromParent, setting?.spp_default_nominal]);

  // When selected student changes, update defaults
  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    const sppFee = getStudentDefaultSpp(st);
    setPaymentItems(prev => {
      if (prev.length === 1 && (prev[0].paymentType.startsWith('SPP') || prev[0].paymentType === 'SPP Bulanan')) {
        return [{
          ...prev[0],
          customTagihan: sppFee,
          nominalBayar: sppFee
        }];
      }
      return prev;
    });
  };

  const handleAddItem = () => {
    const newItem: PaymentItemRow = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      paymentType: 'Uang Gedung / Infaq Pangkal',
      isManualPayment: false,
      manualPaymentInput: '',
      selectedMonth: '',
      customTagihan: 0,
      nominalBayar: 0
    };
    setPaymentItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (paymentItems.length <= 1) return;
    setPaymentItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<PaymentItemRow>) => {
    setPaymentItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Overall totals across all items
  const totalTagihanAll = useMemo(() => {
    return paymentItems.reduce((acc, it) => acc + (Number(it.customTagihan) || 0), 0);
  }, [paymentItems]);

  const totalBayarAll = useMemo(() => {
    return paymentItems.reduce((acc, it) => acc + (Number(it.nominalBayar) || 0), 0);
  }, [paymentItems]);

  const totalSisaAll = Math.max(0, totalTagihanAll - totalBayarAll);
  const overallStatus: 'LUNAS' | 'KURANG' = (totalBayarAll >= totalTagihanAll && totalTagihanAll > 0) ? 'LUNAS' : 'KURANG';

  // Filtered search results for students
  const searchedStudents = useMemo(() => {
    if (!searchTerm.trim()) return students.slice(0, 6);
    const lower = searchTerm.toLowerCase();
    return students.filter(s =>
      s.nama.toLowerCase().includes(lower) ||
      s.nisn.includes(lower) ||
      s.kelas.toLowerCase().includes(lower)
    );
  }, [students, searchTerm]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Pilih murid terlebih dahulu.');
      return;
    }
    if (paymentItems.length === 0) {
      alert('Tambahkan minimal 1 item pembayaran.');
      return;
    }

    // Validasi tiap baris item
    for (let i = 0; i < paymentItems.length; i++) {
      const it = paymentItems[i];
      const finalType = it.isManualPayment ? it.manualPaymentInput.trim() : it.paymentType;
      if (!finalType) {
        alert(`Item ke-${i + 1}: Harap tentukan jenis pembayaran atau ketik nama pembayaran manual.`);
        return;
      }
      if ((it.nominalBayar || 0) <= 0) {
        alert(`Item ke-${i + 1} (${finalType}): Nominal pembayaran harus lebih dari Rp 0.`);
        return;
      }

      const isSpp = finalType === 'SPP Bulanan' || finalType.toLowerCase() === 'spp' || finalType.toLowerCase().startsWith('spp bulanan');
      if (isSpp && it.selectedMonth && checkMonthIsLunas(it.selectedMonth)) {
        alert(`Item ke-${i + 1}: Bulan ${it.selectedMonth} sudah berstatus LUNAS untuk ananda ${selectedStudent.nama}. Pembayaran ganda tidak dapat dilakukan.`);
        return;
      }
    }

    // Daftarkan jenis manual baru ke customPaymentTypes
    paymentItems.forEach(it => {
      if (it.isManualPayment && it.manualPaymentInput.trim() && !customPaymentTypes.includes(it.manualPaymentInput.trim())) {
        setCustomPaymentTypes(prev => [...prev, it.manualPaymentInput.trim()]);
      }
    });

    // Buat shared ID kuitansi gabungan (KWT-YYYY-XXXXXX)
    const now = new Date();
    const sharedKuitansiId = `KWT-${now.getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Siapkan entri transaksi terpisah di TRANSAKSI sheet untuk setiap baris (Prioritas 1 & 2)
    const itemsToSave = paymentItems.map((it, idx) => {
      const finalType = it.isManualPayment ? it.manualPaymentInput.trim() : it.paymentType;
      const isSpp = finalType === 'SPP Bulanan' || finalType.toLowerCase() === 'spp' || finalType.toLowerCase().startsWith('spp bulanan');
      const itemStatus: 'LUNAS' | 'KURANG' = (it.nominalBayar >= it.customTagihan && it.customTagihan > 0) ? 'LUNAS' : 'KURANG';

      const finalJenis = finalType; // TERSIMPAN APA ADANYA! "Seragam" -> "Seragam", "SPP Bulanan" -> "SPP Bulanan"
      const finalBulan = isSpp ? it.selectedMonth : undefined;
      const finalKategori = isSpp ? 'SPP' : 'Uang Kegiatan';

      const finalKeterangan = keterangan.trim()
        ? (paymentItems.length > 1 ? `${keterangan.trim()} (Item ${idx + 1}: ${finalType})` : keterangan.trim())
        : (isSpp
            ? `SPP Bulan ${it.selectedMonth} a.n ${selectedStudent.nama} (${selectedStudent.kelas})`
            : `Pembayaran ${finalType} oleh ${selectedStudent.nama_wali || selectedStudent.nama}`);

      return {
        nisn: selectedStudent.nisn,
        nama_siswa: selectedStudent.nama,
        kelas: selectedStudent.kelas,
        jenis: finalJenis,
        kategori: finalKategori,
        bulan: finalBulan,
        nominal_tagihan: it.customTagihan,
        nominal_bayar: it.nominalBayar,
        status: itemStatus,
        petugas: operatorName,
        keterangan: finalKeterangan,
        id_kuitansi_gabungan: sharedKuitansiId
      };
    });

    let firstTrx: Transaction | undefined;

    if (onProcessPaymentBatch) {
      const res = await onProcessPaymentBatch(itemsToSave, sharedKuitansiId);
      firstTrx = res.transactions[0];
    } else {
      const res = await StorageService.processPaymentBatch(itemsToSave, sharedKuitansiId);
      firstTrx = res.transactions[0];
    }

    if (firstTrx) {
      onOpenReceipt(firstTrx);
    }

    // Reset formulir kembali ke 1 item standar
    setPaymentItems([createDefaultItem(selectedStudent)]);
    setKeterangan('');
  };

  const handleConfirmCancel = () => {
    if (!cancelModalTrx) return;
    if (!cancelReason.trim()) {
      alert('Wajib mengisi alasan pembatalan transaksi untuk pencatatan di LOG Sheet!');
      return;
    }

    onCancelPayment(cancelModalTrx.id_transaksi, cancelReason);
    setCancelModalTrx(null);
    setCancelReason('');
  };

  // Student specific transactions
  const studentTransactions = useMemo(() => {
    if (!selectedStudent) return [];
    return transactions.filter(t => t.nisn === selectedStudent.nisn);
  }, [transactions, selectedStudent]);

  // Total tunggakan/sisa murid terpilih
  const selectedStudentTunggakan = useMemo(() => {
    return studentTransactions
      .filter(t => t.status === 'KURANG')
      .reduce((a, b) => a + (b.sisa || 0), 0);
  }, [studentTransactions]);

  // WhatsApp reminder generator: Sopan, Islami & Otomatis
  const generateWhatsAppReminder = (st: Student, trx?: Transaction, totalTunggakan?: number) => {
    const rawPhone = st.no_hp || st.no_hp_wali || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : cleanPhone ? '62' + cleanPhone : '';

    const salam = `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\n` +
      `Semoga Ayah/Bunda *${st.nama_wali}* beserta keluarga senantiasa dalam limpahan taufiq, rahmat, dan keberkahan dari Allah Subhanahu wa Ta'ala. Aamiin.\n\n`;

    const dataMurid = `Kami dari Bagian Keuangan *${setting.nama_sekolah}* menyampaikan informasi administrasi pendidikan Ananda tercinta:\n` +
      `• *Nama Murid*: ${st.nama}\n` +
      `• *NISN*: ${st.nisn}\n` +
      `• *Kelas*: ${st.kelas}\n\n`;

    let rincian = '';
    if (trx) {
      rincian = `• *Jenis Tagihan*: ${trx.jenis} ${trx.bulan || ''}\n` +
        `• *Nominal Tagihan*: Rp ${(trx.nominal_tagihan || 0).toLocaleString('id-ID')}\n` +
        `• *Telah Terbayar*: Rp ${(trx.nominal_bayar || 0).toLocaleString('id-ID')}\n` +
        `• *Sisa Kekurangan*: *Rp ${(trx.sisa || 0).toLocaleString('id-ID')}*\n\n`;
    } else if (totalTunggakan && totalTunggakan > 0) {
      rincian = `• *Total Kekurangan Administrasi*: *Rp ${totalTunggakan.toLocaleString('id-ID')}*\n\n`;
    } else {
      rincian = `• *Status Administrasi*: Mengingatkan kewajiban SPP bulan berjalan sebesar *Rp ${(st.spp_nominal || setting?.spp_default_nominal || 85000).toLocaleString('id-ID')}*.\n\n`;
    }

    const rekening = (setting.no_rekening || setting.nama_bank)
      ? `Pembayaran dapat disalurkan melalui rekening resmi sekolah:\n` +
        `🏦 *${setting.nama_bank || 'BSI (Bank Syariah Indonesia)'}*\n` +
        `💳 No. Rekening: *${setting.no_rekening}*\n` +
        `👤 Atas Nama: *${setting.atas_nama_rekening || setting.nama_sekolah}*\n\n`
      : '';

    const doaPenutup = `Jazaakumullahu khairan katsiran atas amanah, perhatian, dan kerja sama Ayah/Bunda demi kelancaran proses belajar dan tholabul 'ilmi Ananda di sekolah.\n\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `_Bagian Administrasi & Keuangan_\n` +
      `*${setting.nama_sekolah}*`;

    const message = encodeURIComponent(salam + dataMurid + rincian + rekening + doaPenutup);
    return formattedPhone ? `https://wa.me/${formattedPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const monthsList = useMemo(() => {
    const startMonth = selectedStudent?.spp_mulai_bulan || setting.spp_mulai_bulan;
    const startYear = selectedStudent?.spp_mulai_tahun || setting.spp_mulai_tahun;
    const academicMonths = getAcademicYearMonths(setting.tahun_ajaran, new Date(), startMonth, startYear);
    return academicMonths.map(m => m.label);
  }, [
    setting.tahun_ajaran,
    setting.spp_mulai_bulan,
    setting.spp_mulai_tahun,
    selectedStudent?.spp_mulai_bulan,
    selectedStudent?.spp_mulai_tahun
  ]);

  // SPP Summary & Status per Bulan untuk Murid Terpilih
  const studentSppSummary = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentSppStatus(
      selectedStudent,
      transactions,
      setting.tahun_ajaran,
      new Date(),
      setting.spp_mulai_bulan,
      setting.spp_mulai_tahun
    );
  }, [
    selectedStudent,
    transactions,
    setting.tahun_ajaran,
    setting.spp_mulai_bulan,
    setting.spp_mulai_tahun
  ]);

  const checkMonthIsLunas = (monthLabel: string) => {
    if (!studentSppSummary) return false;
    const clean = monthLabel.trim().toLowerCase();
    const found = studentSppSummary.allMonths.find(
      m => m.label.toLowerCase() === clean || m.monthName.toLowerCase() === clean.split(' ')[0]
    );
    return found ? found.status === 'LUNAS' : false;
  };

  // Otomatis arahkan bulan item SPP pertama ke bulan yang belum lunas jika belum terisi
  useEffect(() => {
    if (monthsList.length === 0) return;
    const firstUnpaid = monthsList.find(m => !checkMonthIsLunas(m)) || monthsList[0];
    if (!firstUnpaid) return;

    setPaymentItems(prev => {
      let modified = false;
      const next = prev.map(item => {
        const isSpp = (!item.isManualPayment && (item.paymentType.startsWith('SPP') || item.paymentType === 'SPP Bulanan')) ||
          (item.isManualPayment && item.manualPaymentInput.toLowerCase().includes('spp'));

        if (isSpp && (!item.selectedMonth || !monthsList.includes(item.selectedMonth) || checkMonthIsLunas(item.selectedMonth))) {
          modified = true;
          return { ...item, selectedMonth: firstUnpaid };
        }
        return item;
      });
      return modified ? next : prev;
    });
  }, [selectedStudent?.nisn, transactions, monthsList, studentSppSummary]);

  const paymentTypeOptions = [
    'SPP Bulanan',
    'Daftar Ulang / Pangkal',
    'Infaq Pembangunan Mushola',
    'Seragam & Buku Mushaf',
    'Kegiatan Kemah Tahfidz',
    'Ujian Komprehensif Al-Qur\'an',
    'Lain-Lain'
  ];

  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kasir Pembayaran Santri</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Software pembayaran sekolah terpadu dengan auto-kalkulasi tunggakan & log pembatalan transaksi
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Tahun Ajaran Aktif: {setting.tahun_ajaran}</span>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Search & Student Profile Card */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Search Student */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cari Santri (Nama / NISN / Kelas)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik nama atau NISN santri..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            {/* Quick List Result */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {searchedStudents.map(s => {
                const isSelected = selectedStudent?.id_siswa === s.id_siswa;
                return (
                  <div
                    key={s.id_siswa}
                    onClick={() => handleSelectStudent(s)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{s.nama}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NISN: {s.nisn} &bull; {s.kelas}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Student Profile Badge */}
          {selectedStudent && (
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Murid Terpilih
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-snug mt-1">
                    {selectedStudent.nama}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">NISN: {selectedStudent.nisn} &bull; Kelas {selectedStudent.kelas}</p>
                </div>
              </div>

              {/* Data Detail Roster */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tingkat / Kelas:</span>
                  <span className="font-bold text-slate-800">{selectedStudent.kelas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Wali:</span>
                  <span className="font-bold text-slate-800">{selectedStudent.nama_wali}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor WhatsApp:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{selectedStudent.no_hp || selectedStudent.no_hp_wali || '-'}</span>
                </div>
                {selectedStudentTunggakan > 0 && (
                  <div className="flex justify-between items-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <span className="text-rose-700 font-bold">Total Tunggakan:</span>
                    <span className="font-black text-rose-800 font-mono">{formatRupiah(selectedStudentTunggakan)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Tarif SPP Khusus:</span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-900 text-sm">{formatRupiah(selectedStudent.spp_nominal)}</span>
                    {selectedStudent.spp_kategori !== 'REGULER' && (
                      <div className="text-[10px] text-amber-800 font-semibold flex items-center gap-1 justify-end">
                        <Award className="w-2.5 h-2.5 text-amber-600" />
                        <span>{selectedStudent.spp_catatan || selectedStudent.spp_kategori}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 1-Click WhatsApp Tagihan Sopan & Islami ke Wali */}
              <a
                href={generateWhatsAppReminder(selectedStudent, undefined, selectedStudentTunggakan)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                title="Kirim pesan tagihan otomatis berformat islami dan sopan langsung ke WhatsApp Wali"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>Kirim Tagihan WA ke Wali (Islami & Sopan)</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Payment Form Input & Status Handler */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
              <CreditCard className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-base">
                Formulir Transaksi Pembayaran
              </h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Daftar Item Pembayaran (Multi-Item Dalam Satu Kuitansi - Prioritas 2) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Rincian Item Pembayaran ({paymentItems.length} Item)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>+ Tambah Item Pembayaran</span>
                  </button>
                </div>

                {paymentItems.map((item, index) => {
                  const isSppItem = (!item.isManualPayment && (item.paymentType.startsWith('SPP') || item.paymentType === 'SPP Bulanan')) ||
                    (item.isManualPayment && item.manualPaymentInput.toLowerCase().includes('spp'));
                  const itemSisa = Math.max(0, (item.customTagihan || 0) - (item.nominalBayar || 0));

                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          Item #{index + 1}
                        </span>

                        {paymentItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                            title="Hapus baris item ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>

                      {/* Baris Jenis Pembayaran & Periode Bulan (khusus SPP) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                              Jenis Pembayaran
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(item.id, {
                                  isManualPayment: !item.isManualPayment,
                                  manualPaymentInput: ''
                                });
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              {item.isManualPayment ? (
                                <span>&larr; Pilih dari Daftar</span>
                              ) : (
                                <>
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>+ Buat Jenis Manual</span>
                                </>
                              )}
                            </button>
                          </div>

                          {item.isManualPayment ? (
                            <div className="space-y-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  required
                                  value={item.manualPaymentInput}
                                  onChange={(e) => handleUpdateItem(item.id, { manualPaymentInput: e.target.value })}
                                  placeholder="Ketik jenis pembayaran manual (cth: Seragam, Gedung)..."
                                  className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-emerald-400 ring-2 ring-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItem(item.id, { isManualPayment: false })}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                  title="Tutup mode manual"
                                >
                                  &times;
                                </button>
                              </div>
                              <p className="text-[10px] text-emerald-700 font-medium">
                                &bull; Akan disimpan & dicetak APA ADANYA (tanpa imbuhan SPP)
                              </p>
                            </div>
                          ) : (
                            <select
                              value={item.paymentType}
                              onChange={(e) => {
                                const type = e.target.value;
                                if (type === '__CUSTOM_MANUAL__') {
                                  handleUpdateItem(item.id, {
                                    isManualPayment: true,
                                    manualPaymentInput: ''
                                  });
                                  return;
                                }

                                const isNowSpp = type.startsWith('SPP') || type === 'SPP Bulanan';
                                const fee = isNowSpp ? (selectedStudent?.spp_nominal || 85000) : 0;
                                handleUpdateItem(item.id, {
                                  paymentType: type,
                                  isManualPayment: false,
                                  customTagihan: fee,
                                  nominalBayar: fee
                                });
                              }}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                            >
                              <optgroup label="Pilihan Standar">
                                {paymentTypeOptions.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </optgroup>
                              {customPaymentTypes.length > 0 && (
                                <optgroup label="Jenis Pembayaran Manual / Kustom">
                                  {customPaymentTypes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="__CUSTOM_MANUAL__" className="font-bold text-emerald-700">
                                + Buat Jenis Pembayaran Manual Lainnya...
                              </option>
                            </select>
                          )}
                        </div>

                        {/* Periode Bulan SPP (HANYA tampil jika jenis memang SPP) */}
                        {isSppItem ? (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Periode Bulan SPP
                            </label>
                            <select
                              value={item.selectedMonth}
                              onChange={(e) => handleUpdateItem(item.id, { selectedMonth: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                            >
                              {monthsList.map(m => {
                                const isLunas = checkMonthIsLunas(m);
                                return (
                                  <option
                                    key={m}
                                    value={m}
                                    disabled={isLunas}
                                    className={isLunas ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-900 font-medium'}
                                  >
                                    {m} {isLunas ? '(Sudah Lunas)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-slate-500 pt-5 italic">
                            * Non-SPP tidak memerlukan periode bulan
                          </div>
                        )}
                      </div>

                      {/* Baris Nominal Tagihan & Nominal Dibayar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 block">
                            Nominal Tagihan (Rp)
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.customTagihan}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              handleUpdateItem(item.id, { customTagihan: val });
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 uppercase">
                              Nominal Dibayar (Rp)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(item.id, { nominalBayar: item.customTagihan });
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                            >
                              Set Lunas Penuh
                            </button>
                          </div>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.nominalBayar}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              handleUpdateItem(item.id, { nominalBayar: val });
                            }}
                            className="w-full px-3 py-2 text-xs font-extrabold text-emerald-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>

                      {itemSisa > 0 && (
                        <div className="text-[11px] font-bold text-amber-700 text-right">
                          Kurang Bayar Item #{index + 1}: {formatRupiah(itemSisa)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* TOTAL KESELURUHAN & STATUS AKUMULATIF (Prioritas 2) */}
              <div className="p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between bg-slate-100/80 border-slate-300 gap-3">
                <div className="flex items-center gap-3">
                  {overallStatus === 'LUNAS' ? (
                    <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-full bg-amber-100 text-amber-800">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Pembayaran ({paymentItems.length} Item)
                    </div>
                    <div className={`text-base font-extrabold ${overallStatus === 'LUNAS' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {overallStatus === 'LUNAS' ? 'LUNAS KESELURUHAN' : 'KURANG BAYAR (CICILAN)'}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Total Tagihan: <span className="font-bold">{formatRupiah(totalTagihanAll)}</span> &bull; Total Bayar: <span className="font-extrabold text-emerald-800">{formatRupiah(totalBayarAll)}</span>
                    </div>
                  </div>
                </div>

                {totalSisaAll > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-rose-600 font-bold uppercase">Kekurangan Total:</span>
                    <div className="text-lg font-black text-rose-700">
                      Kurang {formatRupiah(totalSisaAll)}
                    </div>
                  </div>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Titip lewat wali murid / transfer BSI..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              {/* Petugas Pencatat (Selalu user login saat ini) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Petugas Pencatat
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={operatorName || 'Petugas'}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg cursor-not-allowed select-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis terisi dari nama user akun yang sedang login saat ini.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="grow bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Proses Simpan Pembayaran & Cetak Kuitansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi Murid Terpilih & Pembatalan Transaksi */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Riwayat Transaksi: {selectedStudent ? selectedStudent.nama : 'Semua Murid'}
            </h3>
            <p className="text-xs text-slate-500">
              Setiap pembatalan transaksi (SALAH TRANSAKSI) wajib menyertakan alasan dan otomatis tercatat di Sheet LOG
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-3">ID Transaksi</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jenis Pembayaran</th>
                <th className="p-3 text-right">Tagihan</th>
                <th className="p-3 text-right">Dibayar</th>
                <th className="p-3 text-right">Sisa</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Petugas</th>
                <th className="p-3 text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {studentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Belum ada riwayat transaksi untuk murid ini.
                  </td>
                </tr>
              ) : (
                studentTransactions.map(trx => {
                  const ts = formatTransactionTimestamp(trx.tanggal, trx.waktu);
                  return (
                  <tr key={trx.id_transaksi} className={`hover:bg-slate-50 ${trx.status === 'CANCEL' ? 'bg-rose-50/50 opacity-80' : ''}`}>
                    <td className="p-3 font-mono font-medium text-slate-600">{trx.id_transaksi}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      <div className="font-semibold text-slate-900">{ts.dateDisplay}</div>
                      {ts.timeDisplay && <div className="text-[10px] text-slate-400 font-mono">{ts.timeDisplay}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{getStandardTransactionTitle(trx)}</div>
                      {trx.keterangan && <div className="text-[10px] text-slate-500">{trx.keterangan}</div>}
                      {trx.alasan_batal && (
                        <div className="text-[10px] text-rose-600 font-medium italic mt-0.5">
                          Alasan Batal: {trx.alasan_batal}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">{formatRupiah(trx.nominal_tagihan)}</td>
                    <td className="p-3 text-right font-bold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      {trx.sisa > 0 ? formatRupiah(trx.sisa) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' :
                        trx.status === 'KURANG' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800 line-through'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{trx.petugas}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center flex-wrap gap-1.5">
                        {/* 1. Tombol Verifikasi LUNAS */}
                        {trx.status !== 'LUNAS' && (
                          <button
                            onClick={() => {
                              if (onVerifyPaymentStatus) {
                                onVerifyPaymentStatus(trx.id_transaksi, 'LUNAS', trx.nominal_tagihan);
                              }
                            }}
                            title="Verifikasi status transaksi menjadi LUNAS penuh"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Lunas</span>
                          </button>
                        )}

                        {/* 2. Tombol Verifikasi KURANG BAYAR */}
                        {trx.status !== 'KURANG' && (
                          <button
                            onClick={() => {
                              setKurangModalTrx(trx);
                              setKurangBayarInput(trx.nominal_bayar > 0 ? trx.nominal_bayar : Math.round((trx.nominal_tagihan || 500000) / 2));
                            }}
                            title="Verifikasi status transaksi menjadi KURANG bayar (atur nominal terbayar & sisa)"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>Kurang</span>
                          </button>
                        )}

                        {/* 3. Tombol BATAL / CANCEL bagi yang sudah terlanjur */}
                        {trx.status !== 'CANCEL' ? (
                          <button
                            onClick={() => {
                              setCancelModalTrx(trx);
                              setCancelReason('');
                            }}
                            title="Batalkan transaksi yang sudah terlanjur diinput (salah murid / salah nominal)"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (onVerifyPaymentStatus) {
                                onVerifyPaymentStatus(trx.id_transaksi, 'LUNAS', trx.nominal_tagihan);
                              }
                            }}
                            title="Pulihkan transaksi yang dibatalkan menjadi Lunas"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                            <span>Pulihkan</span>
                          </button>
                        )}

                        {/* Tombol Konfirmasi WA */}
                        {trx.status !== 'CANCEL' && (
                          <button
                            type="button"
                            onClick={() => {
                              const st = selectedStudent || students.find(s => s.nisn === trx.nisn);
                              if (!st || !st.no_hp || st.no_hp.trim() === '') {
                                alert(`Nomor WhatsApp wali untuk ananda ${trx.nama_siswa || 'murid ini'} belum terisi di sistem. Silakan lengkapi nomor HP wali di menu Data Murid terlebih dahulu.`);
                                return;
                              }
                              const waUrl = createPaymentConfirmationWaUrl(setting, st, trx);
                              window.open(waUrl, '_blank');
                            }}
                            title="Kirim Konfirmasi Pembayaran via WhatsApp ke Wali Murid"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Konfirmasi WA</span>
                          </button>
                        )}

                        {/* Kuitansi */}
                        <button
                          onClick={() => onOpenReceipt(trx)}
                          title="Cetak Kuitansi Resmi"
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-all shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Kuitansi</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALAH TRANSAKSI (Cancel Modal with Reason requirement) */}
      {cancelModalTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-base">Batalkan Transaksi (Salah Input)</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900 space-y-1">
                <p><strong>ID:</strong> {cancelModalTrx.id_transaksi}</p>
                <p><strong>Santri:</strong> {cancelModalTrx.nama_siswa} ({cancelModalTrx.nisn})</p>
                <p><strong>Nominal:</strong> {formatRupiah(cancelModalTrx.nominal_bayar)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alasan Pembatalan Transaksi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tuliskan alasan lengkap (contoh: Salah nominal, salah santri, atau duplikasi data)..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alasan ini akan tercatat secara permanen di Sheet LOG Google Spreadsheet.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalTrx(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Konfirmasi Pembatalan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFIKASI KURANG BAYAR (Atur Cicilan & Sisa Otomatis) */}
      {kurangModalTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-base">Verifikasi Kurang Bayar (Cicilan)</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-950 space-y-1.5">
                <p><strong>ID Transaksi:</strong> {kurangModalTrx.id_transaksi}</p>
                <p><strong>Santri:</strong> {kurangModalTrx.nama_siswa} ({kurangModalTrx.nisn})</p>
                <p><strong>Tagihan Pokok:</strong> {formatRupiah(kurangModalTrx.nominal_tagihan)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal yang Telah Dibayarkan (Rp) <span className="text-amber-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={kurangModalTrx.nominal_tagihan}
                  value={kurangBayarInput}
                  onChange={(e) => setKurangBayarInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setKurangBayarInput(Math.round(kurangModalTrx.nominal_tagihan / 2))}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-600"
                  >
                    50% ({formatRupiah(Math.round(kurangModalTrx.nominal_tagihan / 2))})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKurangBayarInput(Math.round(kurangModalTrx.nominal_tagihan * 0.75))}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-600"
                  >
                    75% ({formatRupiah(Math.round(kurangModalTrx.nominal_tagihan * 0.75))})
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Sisa Tunggakan Otomatis:</span>
                <span className="font-extrabold text-rose-700 text-sm">
                  {formatRupiah(Math.max(0, kurangModalTrx.nominal_tagihan - kurangBayarInput))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setKurangModalTrx(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onVerifyPaymentStatus) {
                      onVerifyPaymentStatus(kurangModalTrx.id_transaksi, 'KURANG', kurangBayarInput);
                    }
                    setKurangModalTrx(null);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Status Kurang Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
