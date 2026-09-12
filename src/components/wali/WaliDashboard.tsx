import React, { useState, useMemo } from 'react';
import { Student, Transaction, SchoolSetting, UserAccount, Announcement } from '../../types';
import { PrintMode } from '../PrintReportView';
import { calculateStudentSppStatus } from '../../utils/sppLogic';
import { createPaymentConfirmationWaUrl } from '../../utils/whatsappHelper';
import {
  GraduationCap,
  Heart,
  CheckCircle,
  AlertTriangle,
  Printer,
  Phone,
  Calendar,
  Award,
  Sparkles,
  Bell,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Maximize2,
  X,
  Megaphone,
  Info,
  MessageCircle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface WaliDashboardProps {
  currentUser: UserAccount;
  student: Student;
  transactions: Transaction[];
  setting: SchoolSetting;
  announcements?: Announcement[];
  onOpenReceipt: (trx: Transaction) => void;
  onOpenKartuSpp: (student: Student) => void;
}

export const WaliDashboard: React.FC<WaliDashboardProps> = ({
  currentUser,
  student,
  transactions = [],
  setting,
  announcements = [],
  onOpenReceipt,
  onOpenKartuSpp
}) => {
  const [copiedNorek, setCopiedNorek] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);

  // Strict filter: transactions exclusively for this student's NISN
  const myTransactions = (transactions || []).filter(t => student && t.nisn === student.nisn && t.status !== 'CANCEL');

  // Automatic dynamic SPP calculation following the current calendar month
  const sppSummary = useMemo(() => {
    return calculateStudentSppStatus(student, transactions, setting.tahun_ajaran);
  }, [student, transactions, setting.tahun_ajaran]);

  // Calculations
  const totalTagihan = sppSummary.grandTotalTagihan;
  const totalDibayar = sppSummary.grandTotalDibayar;
  const totalKekurangan = sppSummary.grandTotalSisa;

  // Status breakdown
  const countLunas = sppSummary.paidMonths.length;
  const countKurang = sppSummary.unpaidDueMonths.length;

  const paymentRatioData = [
    { name: 'Sudah Dibayar', value: totalDibayar, color: '#059669' },
    { name: 'Kekurangan', value: totalKekurangan, color: '#e11d48' }
  ];

  // Monthly breakdown for progress bar
  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  const handleCopyNorek = () => {
    if (!setting.no_rekening) return;
    navigator.clipboard.writeText(setting.no_rekening);
    setCopiedNorek(true);
    setTimeout(() => setCopiedNorek(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Profil Anak Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
          <div className="text-left grow space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/60 border border-emerald-500/40 text-emerald-200">
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
              <span>Portal Wali Murid SD Qur'an Unggulan Al-I'tisham</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {student.nama}
            </h2>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs text-emerald-100 font-medium">
              <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/15">
                <span className="text-emerald-300">NISN:</span> <strong className="font-mono text-white">{student.nisn}</strong>
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/15">
                <span className="text-emerald-300">Kelas:</span> <strong className="text-white">{student.kelas}</strong>
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/15">
                <span className="text-emerald-300">Wali:</span> <strong className="text-white">{student.nama_wali}</strong>
              </span>
              <span className={`px-3 py-1 rounded-lg border ${
                sppSummary.isLunas
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
              }`}>
                <span className={sppSummary.isLunas ? 'text-emerald-300' : 'text-rose-300'}>Status SPP:</span>{' '}
                <strong className="text-white">{sppSummary.statusLabel}</strong>
              </span>
            </div>

            {/* Special SPP Tag if applicable */}
            {student.spp_kategori !== 'REGULER' && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-400/20 border border-amber-300/40 rounded-xl text-xs text-amber-200 font-semibold">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Kategori Khusus: {student.spp_catatan || student.spp_kategori} (SPP: {formatRupiah(student.spp_nominal)}/bln)</span>
              </div>
            )}
          </div>

          {/* Quick Print Kartu SPP */}
          <div className="shrink-0 mt-2 sm:mt-0">
            <button
              onClick={() => onOpenKartuSpp(student)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu SPP Murid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pengumuman & Informasi dari Bendahara Sekolah */}
      {(() => {
        const activeAnnouncements = (announcements || []).filter(a => a.status_aktif !== false);
        if (activeAnnouncements.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs overflow-hidden">
            <div className="bg-emerald-50/80 px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-4 h-4 text-emerald-700 animate-bounce" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                </div>
                <h3 className="font-bold text-sm text-emerald-950">
                  Informasi & Pengumuman Bendahara Sekolah
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-700 text-white rounded-full">
                {activeAnnouncements.length} Pemberitahuan
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeAnnouncements.map((ann) => {
                const annId = ann.id_pengumuman || (ann as any).id;
                const isPenting = ann.is_penting || (ann as any).priority === 'PENTING';
                return (
                  <div key={annId} className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isPenting
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isPenting ? <Megaphone className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    </div>
                  <div className="grow min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {ann.judul}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(ann.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {ann.isi}
                    </p>
                    <p className="text-[10px] text-slate-400 italic">
                      Diterbitkan oleh: {ann.penulis || 'Bendahara Sekolah'}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        );
      })()}

      {/* Kanal Resmi Pembayaran: Rekening Bank & QRIS */}
      {(setting.no_rekening || setting.qris_image) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Rekening Bank */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 mb-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider">
                  Rekening Bank Resmi Sekolah
                </h4>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Silakan transfer biaya administrasi/SPP murid ke rekening resmi sekolah berikut:
              </p>
              
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                <div className="text-[11px] text-slate-500 font-medium">
                  Bank: <strong className="text-slate-800">{setting.nama_bank || 'Bank Syariah Indonesia (BSI)'}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-black font-mono tracking-wider text-emerald-900">
                    {setting.no_rekening || '-'}
                  </span>
                  {setting.no_rekening && (
                    <button
                      onClick={handleCopyNorek}
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      {copiedNorek ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{copiedNorek ? 'Tersalin!' : 'Salin Norek'}</span>
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Atas Nama: <strong className="text-slate-800">{setting.atas_nama_rekening || setting.nama_sekolah}</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              *Harap sertakan nama murid dan NISN pada berita transfer.
            </p>
          </div>

          {/* Card 2: QRIS Sekolah dengan Thumbnail & Modal Zoom */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div
                onClick={() => setShowQrisModal(true)}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-white p-2 border-2 border-emerald-300 shadow-sm flex items-center justify-center cursor-pointer overflow-hidden transition-transform group-hover:scale-105"
                title="Klik untuk memperbesar gambar QRIS"
              >
                {setting.qris_image ? (
                  <img
                    src={setting.qris_image}
                    alt="Thumbnail QRIS Sekolah"
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <QrCode className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowQrisModal(true)}
                className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity cursor-pointer text-white text-[10px] font-bold gap-1"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Perbesar</span>
              </button>
            </div>

            <div className="space-y-2 grow text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-800">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider">
                  Scan QRIS Resmi Sekolah
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dapat dibayar melalui semua aplikasi M-Banking (BSI, BCA, Mandiri, BRI, dll) serta E-Wallet (Gopay, OVO, Dana, ShopeePay).
              </p>
              <button
                type="button"
                onClick={() => setShowQrisModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Lihat Barcode Penuh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pesan Afektif Otomatis jika terdapat tunggakan */}
      {totalKekurangan > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm">
              Untaian Doa & Apresiasi Sekolah untuk Ayah/Bunda
            </h4>
            <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed mt-1 font-medium italic">
              "Terima kasih Ayah/Bunda sudah terus mendampingi pendidikan Ananda. Sedikit demi sedikit pembayaran akan membantu perjalanan belajar Ananda menjadi lebih baik."
            </p>
            <div className="mt-2 text-xs font-semibold text-amber-900">
              {sppSummary.unpaidDueMonths.length > 0 && (
                <span className="mr-2">
                  Bulan menunggak:{' '}
                  <span className="font-extrabold text-rose-700">
                    {sppSummary.monthsNunggakFullLabels.join(', ')}
                  </span>{' '}
                  &bull;
                </span>
              )}
              Sisa kekurangan saat ini: <span className="font-extrabold text-rose-700">{formatRupiah(totalKekurangan)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Metric Cards Finansial Anak */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tagihan Terbit</span>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{formatRupiah(totalTagihan)}</div>
          <p className="text-xs text-slate-500 mt-1">
            SPP ({sppSummary.dueMonths.length} bulan berjalan) & program
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sudah Terbayar</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-2">{formatRupiah(totalDibayar)}</div>
          <p className="text-xs text-emerald-600 mt-1 font-semibold">{countLunas} Bulan SPP lunas tuntas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Sisa Kekurangan</span>
          <div className="text-xl font-extrabold text-rose-700 mt-2">{formatRupiah(totalKekurangan)}</div>
          <p className="text-xs text-slate-500 mt-1">
            {totalKekurangan === 0 ? 'Lunas sampai bulan berjalan' : sppSummary.statusLabel}
          </p>
        </div>
      </div>

      {/* Charts: Perkembangan Pembayaran & Status Lunas/Tunggakan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Riwayat Mutasi (7 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Riwayat Pembayaran Ananda</h3>
              <p className="text-xs text-slate-500">Kuitansi sah yang diterbitkan oleh Bendahara Sekolah</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                sppSummary.isLunas
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {sppSummary.statusLabel}
              </span>
            </div>
          </div>

          {/* Status SPP per Bulan dalam Tahun Ajaran */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>Status Kewajiban SPP per Bulan (TA {sppSummary.academicYear})</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">update otomatis per bulan berjalan</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {sppSummary.allMonths.map((m) => (
                <div
                  key={m.label}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    m.status === 'LUNAS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : m.status === 'KURANG'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : m.status === 'BELUM_BAYAR'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{m.monthName}</div>
                  <div className="text-[9px] font-medium mt-0.5">
                    {m.status === 'LUNAS'
                      ? 'LUNAS'
                      : m.status === 'KURANG'
                      ? `Kurang Rp${(m.sisa / 1000).toFixed(0)}rb`
                      : m.status === 'BELUM_BAYAR'
                      ? 'MENUNGGAK'
                      : 'Belum Tempo'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Jenis Pembayaran</th>
                  <th className="p-3 text-right">Tagihan</th>
                  <th className="p-3 text-right">Dibayar</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-28">Kuitansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {myTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Belum ada catatan pembayaran yang tercatat di sistem.
                    </td>
                  </tr>
                ) : (
                  myTransactions.map(trx => (
                    <tr key={trx.id_transaksi} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{trx.tanggal}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{trx.jenis}</div>
                        {trx.bulan && <div className="text-[10px] text-slate-500">{trx.bulan}</div>}
                      </td>
                      <td className="p-3 text-right">{formatRupiah(trx.nominal_tagihan)}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {trx.status}
                        </span>
                        {trx.status === 'KURANG' && trx.sisa > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            Sisa: {formatRupiah(trx.sisa)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenReceipt(trx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Kuitansi</span>
                          </button>
                          {trx.status !== 'CANCEL' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!student.no_hp || student.no_hp.trim() === '') {
                                  alert('Nomor WhatsApp wali belum tercatat di data murid. Silakan hubungi bendahara sekolah.');
                                  return;
                                }
                                const waUrl = createPaymentConfirmationWaUrl(setting, student, trx);
                                window.open(waUrl, '_blank');
                              }}
                              title="Kirim Konfirmasi WA"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WA</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut Chart Rasio Pembayaran (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Rasio Pembayaran</h3>
            <p className="text-xs text-slate-500 mb-2">Perbandingan dana yang sudah disetorkan vs sisa</p>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-slate-600">Sudah Dibayar</span>
              </div>
              <span className="font-bold text-emerald-800">{formatRupiah(totalDibayar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span className="text-slate-600">Sisa Tunggakan</span>
              </div>
              <span className="font-bold text-rose-700">{formatRupiah(totalKekurangan)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informasi Layanan Bendahara */}
      <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>Informasi atau konfirmasi transfer pembayaran: Hubungi Kantor Keuangan SDQ Al-I'tisham Playen</span>
        <a
          href={`https://wa.me/${setting.no_wa.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:underline"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-700" />
          <span>WhatsApp: {setting.no_wa}</span>
        </a>
      </div>

      {/* Modal QRIS Barcode Full Screen Zoom */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">QRIS Resmi Sekolah</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrisModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-64 h-64 bg-white p-2 rounded-xl flex items-center justify-center border shadow-xs overflow-hidden">
                {setting.qris_image ? (
                  <img
                    src={setting.qris_image}
                    alt="QRIS Sekolah Penuh"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <QrCode className="w-24 h-24 text-slate-300" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 mt-2">{setting.nama_sekolah}</p>
              <p className="text-[10px] text-slate-500">NMID: ID1020039281001 &bull; Cetak / Scan dari HP</p>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              <p className="font-bold text-emerald-900">Petunjuk Pembayaran:</p>
              <p>1. Buka aplikasi Mobile Banking atau Dompet Digital Anda.</p>
              <p>2. Pilih menu "Scan QRIS" lalu arahkan kamera ke barcode di atas.</p>
              <p>3. Masukkan nominal pembayaran dan selesaikan transaksi.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrisModal(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
