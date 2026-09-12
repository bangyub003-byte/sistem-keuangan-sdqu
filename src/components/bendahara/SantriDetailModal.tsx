import React, { useState } from 'react';
import { Student, Transaction, SchoolSetting } from '../../types';
import { calculateStudentSppStatus, getStandardTransactionTitle, formatTransactionTimestamp } from '../../utils/sppLogic';
import { createPaymentConfirmationWaUrl, createTunggakanReminderWaUrl } from '../../utils/whatsappHelper';
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
  Printer
} from 'lucide-react';

interface SantriDetailModalProps {
  student: Student;
  transactions: Transaction[];
  setting: SchoolSetting;
  onClose: () => void;
  onUpdateStudent: (updated: Student) => void;
  onNavigateToPayment?: (student: Student) => void;
  onOpenReceipt?: (trx: Transaction) => void;
  onOpenKartuSpp?: (student: Student) => void;
}

export const SantriDetailModal: React.FC<SantriDetailModalProps> = ({
  student,
  transactions,
  setting,
  onClose,
  onUpdateStudent,
  onNavigateToPayment,
  onOpenReceipt,
  onOpenKartuSpp
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
    spp_mulai_bulan: student.spp_mulai_bulan || setting.spp_mulai_bulan || 'Juli',
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

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleSaveIdentitas = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStudent(identitasForm);
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
    onUpdateStudent(updated);
    setSppSaved(true);
    setTimeout(() => setSppSaved(false), 2500);
  };

  const tunggakanWaUrl = createTunggakanReminderWaUrl(setting, student, sppSummary);

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
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Total Tunggakan</div>
                  <div className={`text-xl font-extrabold mt-1 ${sppSummary.grandTotalSisa > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatRupiah(sppSummary.grandTotalSisa)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {sppSummary.unpaidDueMonths.length > 0 
                      ? `${sppSummary.unpaidDueMonths.length} bulan belum lunas`
                      : 'Nihil tunggakan SPP'}
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

              {/* Action Toolbar for this student */}
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

              {/* Breakdown Status SPP 12 Bulan Tahun Ajaran */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    Rincian Pembayaran SPP Per Bulan (TA {setting.tahun_ajaran})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Mulai: {student.spp_mulai_bulan || setting.spp_mulai_bulan || 'Juli'} {student.spp_mulai_tahun || setting.spp_mulai_tahun || 2026}
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
                              <div className="font-semibold text-slate-900">{getStandardTransactionTitle(trx)}</div>
                              {trx.keterangan && <div className="text-[10px] text-slate-500">{trx.keterangan}</div>}
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
    </div>
  );
};
