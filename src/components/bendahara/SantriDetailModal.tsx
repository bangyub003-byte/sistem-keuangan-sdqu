import React, { useState, useMemo } from 'react';
import { Student, Transaction, SchoolSetting } from '../../types';
import { calculateStudentSppStatus, getStandardTransactionTitle, formatTransactionTimestamp, isHistoricalArrearsTrx } from '../../utils/sppLogic';
import { createPaymentConfirmationWaUrl, createTunggakanReminderWaUrl } from '../../utils/whatsappHelper';
import { StorageService } from '../../services/storageService';
import { 
  X, 
  User, 
  Edit3, 
  Check, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText, 
  MessageCircle, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Save, 
  ArrowRight,
  ShieldCheck,
  Tag,
  Printer,
  History,
  Plus,
  CheckCircle
} from 'lucide-react';
import { CatatTunggakanManualModal } from './CatatTunggakanManualModal';

interface SantriDetailModalProps {
  student: Student;
  students?: Student[];
  transactions: Transaction[];
  setting: SchoolSetting;
  onClose: () => void;
  onUpdateStudent?: (updated: Student) => void;
  onNavigateToPayment?: (student: Student) => void;
  onOpenReceipt?: (trx: Transaction) => void;
  onOpenKartuSpp?: (student: Student) => void;
  operatorName?: string;
  onProcessPayment?: (data: any) => Transaction;
  onVerifyPaymentStatus?: (trxId: string, newStatus: 'LUNAS' | 'KURANG' | 'CANCEL', paidAmount?: number, reason?: string) => void;
  onBatchRecordManualArrears?: (records: any[]) => Promise<any>;
  isReadOnly?: boolean;
}

export const SantriDetailModal: React.FC<SantriDetailModalProps> = ({
  student,
  students = [],
  transactions,
  setting,
  onClose,
  onUpdateStudent,
  onNavigateToPayment,
  onOpenReceipt,
  onOpenKartuSpp,
  operatorName,
  onProcessPayment,
  onVerifyPaymentStatus,
  onBatchRecordManualArrears,
  isReadOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'REKAP' | 'TRANSAKSI' | 'EDIT_SPP' | 'EDIT_IDENTITAS'>('REKAP');
  
  // Edit Identitas Form State
  const [identitasForm, setIdentitasForm] = useState<Student>({ ...student });
  const [identitasSaved, setIdentitasSaved] = useState(false);

  // Edit SPP Form State
  const [sppForm, setSppForm] = useState<{
    spp_nominal: number;
    spp_kategori: 'REGULER' | 'BEASISWA' | 'EKONOMI' | 'YATIM' | 'KHUSUS';
    spp_catatan: string;
    spp_mulai_bulan: string;
    spp_mulai_tahun: number;
  }>({
    spp_nominal: student.spp_nominal || setting.spp_default_nominal || 85000,
    spp_kategori: student.spp_kategori || 'REGULER',
    spp_catatan: student.spp_catatan || '',
    spp_mulai_bulan: student.spp_mulai_bulan || setting.spp_mulai_bulan || 'Oktober',
    spp_mulai_tahun: student.spp_mulai_tahun || setting.spp_mulai_tahun || 2026
  });
  const [sppSaved, setSppSaved] = useState(false);

  // Calculate SPP summary specific to this student
  const sppSummary = calculateStudentSppStatus(
    student,
    transactions,
    setting.tahun_ajaran,
    new Date(),
    setting.spp_mulai_bulan,
    setting.spp_mulai_tahun
  );

  // Filter transactions for this student
  const studentTransactions = (transactions || [])
    .filter(t => t.nisn === student.nisn)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Filter tunggakan historis aktif (status KURANG)
  const activeHistoricalArrears = useMemo(() => {
    return (sppSummary.historicalTransactions || []).filter(t => t.status === 'KURANG');
  }, [sppSummary.historicalTransactions]);

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleSaveIdentitas = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateStudent) {
      onUpdateStudent(identitasForm);
    }
    setIdentitasSaved(true);
    setTimeout(() => setIdentitasSaved(false), 2500);
  };

  const handleSaveSpp = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Student = {
      ...student,
      spp_nominal: Number(sppForm.spp_nominal),
      spp_kategori: sppForm.spp_kategori,
      spp_catatan: sppForm.spp_catatan,
      spp_mulai_bulan: sppForm.spp_mulai_bulan,
      spp_mulai_tahun: Number(sppForm.spp_mulai_tahun)
    };
    if (onUpdateStudent) {
      onUpdateStudent(updated);
    }
    setSppSaved(true);
    setTimeout(() => setSppSaved(false), 2500);
  };

  const tunggakanWaUrl = createTunggakanReminderWaUrl(setting, student, sppSummary);

  // Historical / Manual Arrears Recording State
  const [showManualArrearsModal, setShowManualArrearsModal] = useState(false);
  const [showHistorisModal, setShowHistorisModal] = useState(false);
  const [bulanHistoris, setBulanHistoris] = useState<string>('Januari');
  const [tahunHistoris, setTahunHistoris] = useState<number>(new Date().getFullYear() - 1);
  const [nominalHistoris, setNominalHistoris] = useState<number>(student.spp_nominal || setting.spp_default_nominal || 85000);
  const [catatanHistoris, setCatatanHistoris] = useState<string>('');
  const [isSubmittingHistoris, setIsSubmittingHistoris] = useState(false);
  const [historisSuccess, setHistorisSuccess] = useState(false);

  // Settlement / Pelunasan State for Historical Arrears
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedTrxToSettle, setSelectedTrxToSettle] = useState<Transaction | null>(null);
  const [settleNominal, setSettleNominal] = useState<number>(0);
  const [settleNote, setSettleNote] = useState<string>('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState(false);

  const handleSaveHistoris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nominalHistoris <= 0) {
      alert('Nominal tunggakan harus lebih besar dari Rp 0');
      return;
    }
    setIsSubmittingHistoris(true);
    try {
      const operator = operatorName || 'Bendahara';
      const cleanNote = catatanHistoris ? catatanHistoris.trim() : '';
      const finalKet = cleanNote ? `[Tunggakan Historis] ${cleanNote}` : '[Tunggakan Historis]';
      const payload = {
        nisn: student.nisn,
        nama_siswa: student.nama,
        kelas: student.kelas,
        jenis: 'SPP Bulanan',
        kategori: 'SPP',
        bulan: `${bulanHistoris} ${tahunHistoris}`,
        nominal_tagihan: Number(nominalHistoris),
        nominal_bayar: 0,
        status: 'KURANG' as const,
        petugas: operator,
        keterangan: finalKet
      };

      if (onProcessPayment) {
        onProcessPayment(payload);
      } else {
        await StorageService.processPayment(payload);
      }

      setHistorisSuccess(true);
      setTimeout(() => {
        setShowHistorisModal(false);
        setHistorisSuccess(false);
        setCatatanHistoris('');
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat tunggakan historis. Silakan coba kembali.');
    } finally {
      setIsSubmittingHistoris(false);
    }
  };

  const handleSettleHistoris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrxToSettle) return;
    if (settleNominal <= 0) {
      alert('Nominal pembayaran harus lebih dari 0');
      return;
    }
    setIsSubmittingSettle(true);
    try {
      const operator = operatorName || 'Bendahara';
      const bayarSekarang = Number(settleNominal);
      const prevDibayar = selectedTrxToSettle.nominal_bayar || 0;
      const newTotalDibayar = prevDibayar + bayarSekarang;
      const tagihan = selectedTrxToSettle.nominal_tagihan || 0;
      const newSisa = Math.max(0, tagihan - newTotalDibayar);
      const newStatus = newSisa === 0 ? 'LUNAS' : 'KURANG';
      const note = settleNote.trim() || `Pelunasan tunggakan historis (${formatRupiah(bayarSekarang)})`;

      if (onVerifyPaymentStatus) {
        await onVerifyPaymentStatus(selectedTrxToSettle.id_transaksi, newStatus, newTotalDibayar, note);
      } else {
        await StorageService.verifyTransaction(selectedTrxToSettle.id_transaksi, newStatus, newTotalDibayar, note, operator);
      }

      // Catat kas masuk ke Keuangan jika ada nominal yang dibayar
      if (bayarSekarang > 0) {
        await StorageService.addKeuangan({
          tanggal: new Date().toISOString().slice(0, 10),
          waktu: new Date().toTimeString().slice(0, 8),
          jenis: 'MASUK',
          kategori: 'SPP',
          nominal: bayarSekarang,
          keterangan: `Pelunasan Tunggakan Historis ${selectedTrxToSettle.bulan} a.n ${student.nama} (${student.kelas})`,
          status: 'ACTIVE',
          id_kategori: 'KAT-SPP'
        }, operator);
      }

      setSettleSuccess(true);
      const updatedTrxForReceipt: Transaction = {
        ...selectedTrxToSettle,
        nominal_bayar: newTotalDibayar,
        sisa: newSisa,
        status: newStatus,
        keterangan: `${selectedTrxToSettle.keterangan || ''} - ${note}`
      };

      setTimeout(() => {
        setShowSettleModal(false);
        setSettleSuccess(false);
        setSelectedTrxToSettle(null);
        if (onOpenReceipt && bayarSekarang > 0) {
          onOpenReceipt(updatedTrxForReceipt);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal memproses pelunasan tunggakan historis.');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="modal-detail-murid"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Modal - Sticky */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-base text-emerald-200 shrink-0">
              {student.nama.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {student.nama}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  student.status_aktif ? 'bg-emerald-700/80 text-emerald-100' : 'bg-rose-800 text-rose-200'
                }`}>
                  {student.status_aktif ? 'Aktif' : 'Non-Aktif'}
                </span>
                {student.spp_kategori && student.spp_kategori !== 'REGULER' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950">
                    {student.spp_kategori}
                  </span>
                )}
                {isReadOnly && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-300">
                    Mode Baca Sah (Kepala Sekolah)
                  </span>
                )}
              </div>
              <div className="text-xs text-emerald-200 flex items-center gap-3 mt-0.5 font-mono">
                <span>NISN: {student.nisn}</span>
                <span>•</span>
                <span>Kelas: {student.kelas}</span>
                {student.no_hp && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300">WA: {student.no_hp}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('REKAP')}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REKAP'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Rekap SPP & Keuangan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TRANSAKSI')}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TRANSAKSI'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Riwayat Transaksi ({studentTransactions.length})
          </button>
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('EDIT_SPP')}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'EDIT_SPP'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Pengaturan Tarif SPP
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EDIT_IDENTITAS')}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'EDIT_IDENTITAS'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Identitas Murid
              </button>
            </>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: REKAP SPP & KEUANGAN */}
          {activeTab === 'REKAP' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-emerald-50/70 border border-emerald-200/90 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Total Sudah Dibayar</div>
                  <div className="text-xl font-extrabold text-emerald-900 mt-1">
                    {formatRupiah(sppSummary.grandTotalDibayar)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    SPP: {formatRupiah(sppSummary.totalDibayarDue)} • Lainnya: {formatRupiah(sppSummary.nonSppDibayar)}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  sppSummary.grandTotalSisa > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Total Akumulasi Tunggakan</div>
                  <div className={`text-xl font-extrabold mt-1 ${sppSummary.grandTotalSisa > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatRupiah(sppSummary.totalTunggakanKeseluruhan || sppSummary.grandTotalSisa)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {sppSummary.grandTotalSisa > 0 ? (
                      <span>
                        Bulan Berjalan: <strong className="text-slate-800">{formatRupiah(sppSummary.totalTunggakanSpp)}</strong> • Historis: <strong className="text-rose-700">{formatRupiah(sppSummary.tunggakanHistoris)}</strong>
                      </span>
                    ) : (
                      'Nihil tunggakan SPP'
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Status Pembayaran</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {sppSummary.isLunas ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <span className={`text-xs font-bold ${sppSummary.isLunas ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {sppSummary.statusLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Tarif SPP: {formatRupiah(student.spp_nominal || setting.spp_default_nominal)} / bln
                  </div>
                </div>
              </div>

              {/* Rincian Akumulasi Tunggakan Terpisah */}
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/90">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Rincian Akumulasi Tunggakan Murid
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Satu sumber kebenaran data</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Tunggakan Bulan Berjalan:</div>
                    <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                      {formatRupiah(sppSummary.totalTunggakanSpp)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {sppSummary.unpaidDueMonths.length > 0
                        ? `${sppSummary.unpaidDueMonths.length} bulan (${sppSummary.monthsNunggakList.join(', ')})`
                        : 'Lunas sampai bulan ini'}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Tunggakan Historis/Manual:</div>
                    <div className="font-extrabold text-sm text-amber-700 mt-0.5">
                      {formatRupiah(sppSummary.tunggakanHistoris)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {sppSummary.historicalTransactions.filter(t => t.status === 'KURANG').length} catatan tunggakan lampau
                    </div>
                  </div>

                  <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Total Keseluruhan:</div>
                    <div className="font-extrabold text-sm text-emerald-900 mt-0.5">
                      {formatRupiah(sppSummary.totalTunggakanKeseluruhan || sppSummary.grandTotalSisa)}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      {sppSummary.totalTunggakanKeseluruhan === 0 ? 'Nihil tunggakan' : 'Akumulasi seluruh kewajiban'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar for this student */}
              {!isReadOnly ? (
                <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-y border-slate-100">
                  {onNavigateToPayment && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToPayment(student);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Input Pembayaran Murid Ini
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowManualArrearsModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                    title="Catat tunggakan manual/khusus (Buku, Iuran, SPP Lampau) dengan jenis bebas dan nominal fleksibel"
                  >
                    <History className="w-3.5 h-3.5" />
                    Catat Tunggakan
                  </button>

                  {onOpenKartuSpp && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenKartuSpp(student);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Kartu SPP
                    </button>
                  )}

                  {sppSummary.grandTotalSisa > 0 && student.no_hp && (
                    <a
                      href={tunggakanWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors ml-auto shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Kirim Pengingat WA ke Wali
                    </a>
                  )}
                </div>
              ) : (
                onOpenKartuSpp && (
                  <div className="flex items-center justify-end gap-2 pt-2 pb-1 border-y border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenKartuSpp(student);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Kartu SPP
                    </button>
                  </div>
                )
              )}

              {/* Kartu Ringkasan Tunggakan dari Periode Sebelumnya (HANYA muncul jika ada tunggakan historis/manual aktif) */}
              {sppSummary.tunggakanHistoris > 0 && activeHistoricalArrears.length > 0 && (
                <div id="tunggakan-historis-summary-card" className="bg-rose-50/75 border border-rose-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-200/70 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-rose-950">
                          Tunggakan dari Periode Sebelumnya / Manual
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-rose-700/80">
                          Tunggakan SPP lampau atau tagihan khusus (Buku, Iuran, dll) yang belum terselesaikan
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-rose-200/80 text-rose-900 rounded-full border border-rose-300 shrink-0">
                      {activeHistoricalArrears.length} Catatan
                    </span>
                  </div>

                  {/* Daftar ringkas per baris: nama jenis + bulan/tahun, dan nominal tunggakan */}
                  <div className="space-y-1.5">
                    {activeHistoricalArrears.map((trx, idx) => {
                      const sisa = trx.sisa !== undefined && trx.sisa !== null
                        ? trx.sisa
                        : Math.max(0, (trx.nominal_tagihan || 0) - (trx.nominal_bayar || 0));
                      const cleanKet = (trx.keterangan || '').replace(/^\[(Tunggakan Historis|Tunggakan Manual)\]\s*/i, '');
                      return (
                        <div
                          key={trx.id_transaksi || idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/95 border border-rose-200/80 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                            <div className="truncate">
                              <span className="font-bold text-slate-800">
                                {trx.jenis || 'Tunggakan'}
                              </span>
                              {trx.bulan && (
                                <span className="text-slate-600 font-medium ml-1.5">
                                  ({trx.bulan})
                                </span>
                              )}
                              {cleanKet && (
                                <span className="text-[10px] text-slate-400 hidden sm:inline ml-1.5 truncate">
                                  - {cleanKet}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="font-extrabold font-mono text-rose-700 shrink-0">
                            {formatRupiah(sisa)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total keseluruhan tunggakan historis di bagian bawah kartu, dicetak tebal */}
                  <div className="flex items-center justify-between pt-2 border-t border-rose-200/80 px-1 text-xs">
                    <span className="font-bold text-rose-900 uppercase tracking-wide text-[11px]">
                      Total Tunggakan Periode Sebelumnya:
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-rose-700">
                      {formatRupiah(sppSummary.tunggakanHistoris)}
                    </span>
                  </div>
                </div>
              )}

              {/* Breakdown Status SPP 12 Bulan Tahun Ajaran */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    Rincian Pembayaran SPP Per Bulan (TA {setting.tahun_ajaran})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Mulai: {student.spp_mulai_bulan || setting.spp_mulai_bulan || 'Oktober'} {student.spp_mulai_tahun || setting.spp_mulai_tahun || 2026}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {sppSummary.allMonths.map((m) => {
                    let badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                    let statusText = 'Belum Tempo';

                    if (m.status === 'LUNAS') {
                      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                      statusText = 'LUNAS';
                    } else if (m.status === 'KURANG') {
                      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
                      statusText = 'KURANG';
                    } else if (m.status === 'BELUM_BAYAR') {
                      badgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
                      statusText = 'MENUNGGAK';
                    }

                    return (
                      <div
                        key={m.label}
                        className={`p-2.5 rounded-xl border transition-all ${badgeClass} ${m.isCurrentMonth ? 'ring-2 ring-emerald-600' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{m.monthName}</span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/80">
                            {statusText}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[11px] flex justify-between text-slate-600">
                          <span>Bayar:</span>
                          <span className="font-bold text-slate-800">{formatRupiah(m.dibayar)}</span>
                        </div>
                        {m.sisa > 0 && (
                          <div className="text-[11px] flex justify-between text-rose-700 font-semibold">
                            <span>Sisa:</span>
                            <span>{formatRupiah(m.sisa)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rincian Catatan Tunggakan Historis / Lampau / Manual */}
              <div className="border border-amber-200/90 bg-amber-50/25 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-600" />
                      Catatan Tunggakan Historis / Manual
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pencatatan tunggakan manual non-SPP (Buku Paket, Iuran Wisuda, dll) maupun periode SPP lampau sebelum aplikasi digunakan.
                    </p>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setShowManualArrearsModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Catat Tunggakan Baru
                    </button>
                  )}
                </div>

                {sppSummary.historicalTransactions.length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-amber-200 rounded-lg p-5 text-center text-slate-400 text-xs">
                    Belum ada catatan tunggakan historis/manual untuk murid ini.{!isReadOnly && ' Klik tombol di atas jika ada tunggakan khusus atau lampau yang perlu dicatat.'}
                  </div>
                ) : (
                  <div className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                        <tr>
                          <th className="p-2.5 text-center w-8">No</th>
                          <th className="p-2.5">Jenis & Periode</th>
                          <th className="p-2.5 text-right">Tagihan</th>
                          <th className="p-2.5 text-right">Sudah Dibayar</th>
                          <th className="p-2.5 text-right">Sisa Tunggakan</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5">Keterangan</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sppSummary.historicalTransactions.map((ht, idx) => {
                          const sisa = ht.sisa !== undefined ? ht.sisa : Math.max(0, (ht.nominal_tagihan || 0) - (ht.nominal_bayar || 0));
                          const isLunas = ht.status === 'LUNAS';
                          return (
                            <tr key={ht.id_transaksi} className="hover:bg-amber-50/30">
                              <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                                <div className="font-extrabold text-slate-900">{ht.jenis || 'Tunggakan'}</div>
                                <div className="text-[11px] text-slate-600 font-medium">{ht.bulan || '-'}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Dicatat: {ht.tanggal ? ht.tanggal.slice(0, 10) : '-'}</div>
                              </td>
                              <td className="p-2.5 text-right text-slate-700">{formatRupiah(ht.nominal_tagihan)}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-700">{formatRupiah(ht.nominal_bayar)}</td>
                              <td className="p-2.5 text-right font-extrabold text-rose-700">{formatRupiah(sisa)}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {ht.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-600 max-w-xs">
                                {ht.keterangan || '-'}
                                <div className="text-[10px] text-slate-400">Petugas: {ht.petugas || 'Bendahara'}</div>
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {!isLunas ? (
                                    !isReadOnly ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTrxToSettle(ht);
                                          setSettleNominal(sisa);
                                          setSettleNote('');
                                          setShowSettleModal(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                        title="Bayar atau lunasi tunggakan historis ini"
                                      >
                                        <CreditCard className="w-3 h-3" />
                                        <span>Bayar / Lunasi</span>
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-rose-700 font-semibold italic bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        Menunggak
                                      </span>
                                    )
                                  ) : (
                                    <>
                                      {onOpenReceipt && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenReceipt(ht)}
                                          title="Cetak Kuitansi"
                                          className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {student.no_hp && (
                                        <a
                                          href={createPaymentConfirmationWaUrl(setting, student, ht)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Kirim Konfirmasi WA"
                                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT TRANSAKSI LENGKAP */}
          {activeTab === 'TRANSAKSI' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Seluruh Transaksi Pembayaran Ananda {student.nama}
                </h4>
                <span className="text-xs text-slate-500">
                  Total: {studentTransactions.length} transaksi
                </span>
              </div>

              {studentTransactions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                  Belum ada transaksi pembayaran yang tercatat untuk murid ini.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Tanggal & Waktu</th>
                        <th className="p-2.5">Jenis / Bulan</th>
                        <th className="p-2.5 text-right">Tagihan</th>
                        <th className="p-2.5 text-right">Dibayar</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Petugas</th>
                        <th className="p-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {studentTransactions.map((trx, idx) => {
                        const waUrl = createPaymentConfirmationWaUrl(setting, student, trx);
                        const ts = formatTransactionTimestamp(trx.tanggal, trx.waktu);
                        return (
                          <tr key={trx.id_transaksi} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">{ts.dateDisplay}</div>
                              {ts.timeDisplay && (
                                <div className="text-[10px] text-slate-500 font-mono">{ts.timeDisplay}</div>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900">{getStandardTransactionTitle(trx)}</span>
                                {isHistoricalArrearsTrx(trx) && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                    [Tunggakan Historis]
                                  </span>
                                )}
                              </div>
                              {trx.keterangan && <div className="text-[10px] text-slate-500 mt-0.5">{trx.keterangan}</div>}
                            </td>
                            <td className="p-2.5 text-right text-slate-600">{formatRupiah(trx.nominal_tagihan)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">{formatRupiah(trx.nominal_bayar)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                trx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' :
                                trx.status === 'KURANG' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {trx.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">{trx.petugas}</td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isHistoricalArrearsTrx(trx) && trx.status === 'KURANG' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sisa = trx.sisa !== undefined ? trx.sisa : Math.max(0, (trx.nominal_tagihan || 0) - (trx.nominal_bayar || 0));
                                      setSelectedTrxToSettle(trx);
                                      setSettleNominal(sisa);
                                      setSettleNote('');
                                      setShowSettleModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                    title="Bayar atau lunasi tunggakan historis ini"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar</span>
                                  </button>
                                )}
                                {onOpenReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenReceipt(trx)}
                                    title="Cetak Kuitansi"
                                    className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {student.no_hp && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Kirim Konfirmasi WA ke Wali"
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENGATURAN TARIF SPP MURID */}
          {activeTab === 'EDIT_SPP' && (
            <form onSubmit={handleSaveSpp} className="space-y-4 max-w-2xl">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                Fitur ini memungkinkan penyesuaian nominal SPP khusus per murid (misalnya beasiswa, subsidi ekonomi yatim, atau murid pindahan).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nominal SPP Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={sppForm.spp_nominal}
                    onChange={(e) => setSppForm({ ...sppForm, spp_nominal: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-bold text-emerald-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Standar sekolah: {formatRupiah(setting.spp_default_nominal)}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kategori Tarif SPP
                  </label>
                  <select
                    value={sppForm.spp_kategori}
                    onChange={(e) => setSppForm({ ...sppForm, spp_kategori: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-semibold text-slate-800"
                  >
                    <option value="REGULER">REGULER (Standar Penuh)</option>
                    <option value="BEASISWA">BEASISWA (Prestasi / Tahfidz)</option>
                    <option value="EKONOMI">EKONOMI (Subsidi Dhuafa)</option>
                    <option value="YATIM">YATIM (Bebas / Khusus Yatim)</option>
                    <option value="KHUSUS">KHUSUS (Penetapan Khusus)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bulan Mulai Kewajiban SPP
                  </label>
                  <select
                    value={sppForm.spp_mulai_bulan}
                    onChange={(e) => setSppForm({ ...sppForm, spp_mulai_bulan: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    {['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Untuk murid pindahan di tengah semester.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tahun Mulai Kewajiban
                  </label>
                  <input
                    type="number"
                    value={sppForm.spp_mulai_tahun}
                    onChange={(e) => setSppForm({ ...sppForm, spp_mulai_tahun: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan / Keterangan Keringanan SPP
                </label>
                <textarea
                  rows={2}
                  value={sppForm.spp_catatan}
                  onChange={(e) => setSppForm({ ...sppForm, spp_catatan: e.target.value })}
                  placeholder="Misal: Surat Keputusan Keringanan Yayasan No. 12/2026..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Tarif SPP Murid Ini
                </button>
                {sppSaved && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Pengaturan tarif SPP berhasil disimpan!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 4: EDIT IDENTITAS MURID */}
          {activeTab === 'EDIT_IDENTITAS' && (
            <form onSubmit={handleSaveIdentitas} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Lengkap Murid
                  </label>
                  <input
                    type="text"
                    required
                    value={identitasForm.nama}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, nama: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kelas / Rombel
                  </label>
                  <input
                    type="text"
                    required
                    value={identitasForm.kelas}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    required
                    value={identitasForm.nisn}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, nisn: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NIK / Nomor KTP Anak
                  </label>
                  <input
                    type="text"
                    value={identitasForm.nik || ''}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, nik: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={identitasForm.jenis_kelamin}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, jenis_kelamin: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    <option value="L">Laki-Laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={identitasForm.tempat_lahir || ''}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, tempat_lahir: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={identitasForm.tanggal_lahir || ''}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, tanggal_lahir: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Ayah / Ibu / Wali
                  </label>
                  <input
                    type="text"
                    value={identitasForm.nama_wali || ''}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, nama_wali: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nomor WhatsApp / HP Wali Murid
                  </label>
                  <input
                    type="text"
                    value={identitasForm.no_hp || ''}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, no_hp: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  rows={2}
                  value={identitasForm.alamat || ''}
                  onChange={(e) => setIdentitasForm({ ...identitasForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identitasForm.status_aktif}
                    onChange={(e) => setIdentitasForm({ ...identitasForm, status_aktif: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Status Murid Aktif Belajar
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan Identitas Murid
                </button>
                {identitasSaved && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Identitas murid berhasil diperbarui!
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer - Sticky */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Data tersinkronisasi otomatis dengan database lokal dan Google Sheets.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* MODAL CATAT TUNGGAKAN MANUAL / FLEKSIBEL */}
      {showManualArrearsModal && (
        <CatatTunggakanManualModal
          isOpen={showManualArrearsModal}
          onClose={() => setShowManualArrearsModal(false)}
          students={students && students.length > 0 ? students : [student]}
          initialStudent={student}
          initialScope="MURID"
          operatorName={operatorName}
          setting={setting}
          existingTransactions={transactions}
          onSaveBatch={async (records) => {
            if (onBatchRecordManualArrears) {
              return onBatchRecordManualArrears(records);
            } else {
              return StorageService.recordManualArrearsBatch(records, operatorName || 'Bendahara');
            }
          }}
        />
      )}

      {/* MODAL PELUNASAN TUNGGAKAN HISTORIS */}
      {showSettleModal && selectedTrxToSettle && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-200" />
                <h3 className="text-sm font-bold">Pelunasan Tunggakan Historis</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedTrxToSettle(null);
                }}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettleHistoris} className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1 text-emerald-950">
                <div className="font-bold text-xs">{selectedTrxToSettle.bulan} - Ananda {student.nama}</div>
                <div className="flex justify-between text-[11px] text-emerald-800">
                  <span>Total Tagihan:</span>
                  <span className="font-bold">{formatRupiah(selectedTrxToSettle.nominal_tagihan)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-800">
                  <span>Sudah Pernah Dibayar:</span>
                  <span>{formatRupiah(selectedTrxToSettle.nominal_bayar)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-extrabold text-rose-700 pt-1 border-t border-emerald-200">
                  <span>Sisa Tunggakan Saat Ini:</span>
                  <span>
                    {formatRupiah(selectedTrxToSettle.sisa !== undefined ? selectedTrxToSettle.sisa : Math.max(0, (selectedTrxToSettle.nominal_tagihan || 0) - (selectedTrxToSettle.nominal_bayar || 0)))}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase">
                    Nominal yang Dibayarkan Sekarang (Rp)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const sisa = selectedTrxToSettle.sisa !== undefined 
                        ? selectedTrxToSettle.sisa 
                        : Math.max(0, (selectedTrxToSettle.nominal_tagihan || 0) - (selectedTrxToSettle.nominal_bayar || 0));
                      setSettleNominal(sisa);
                    }}
                    className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                  >
                    Bayar Lunas Penuh
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1000}
                  max={selectedTrxToSettle.sisa !== undefined ? selectedTrxToSettle.sisa : Math.max(0, (selectedTrxToSettle.nominal_tagihan || 0) - (selectedTrxToSettle.nominal_bayar || 0))}
                  value={settleNominal}
                  onChange={(e) => setSettleNominal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Catatan Pelunasan / Bukti
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="Misal: Diterima tunai oleh Bendahara di kantor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              {settleSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Pelunasan berhasil dicatat ke sistem!
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettleModal(false);
                    setSelectedTrxToSettle(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isSubmittingSettle ? 'Memproses...' : 'Konfirmasi Pelunasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
