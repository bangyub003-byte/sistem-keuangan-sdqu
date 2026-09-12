import React, { useState, useMemo } from 'react';
import { Transaction, Student, KeuanganRecord, SchoolSetting } from '../../types';
import { PrintMode } from '../PrintReportView';
import { calculateAllStudentsSppSummary } from '../../utils/sppLogic';
import { Printer, FileSpreadsheet, AlertTriangle, ArrowDownLeft, ArrowUpRight, BookOpen, Calendar, Filter } from 'lucide-react';

interface LaporanMenuProps {
  transactions: Transaction[];
  students: Student[];
  keuangan: KeuanganRecord[];
  setting: SchoolSetting;
  onOpenPrintReport: (mode: PrintMode, month?: string) => void;
}

export const LaporanMenu: React.FC<LaporanMenuProps> = ({
  transactions = [],
  students = [],
  keuangan = [],
  setting,
  onOpenPrintReport
}) => {
  const [selectedMonth, setSelectedMonth] = useState('');

  // Stats calculation
  const totalPembayaranMasuk = transactions
    .filter(t => t.status !== 'CANCEL')
    .reduce((a, b) => a + (b.nominal_bayar || 0), 0);

  const sppAllSummary = useMemo(() => {
    return calculateAllStudentsSppSummary(
      students,
      transactions,
      setting.tahun_ajaran,
      new Date(),
      setting.spp_mulai_bulan,
      setting.spp_mulai_tahun
    );
  }, [students, transactions, setting.tahun_ajaran, setting.spp_mulai_bulan, setting.spp_mulai_tahun]);

  const totalTunggakan = sppAllSummary.totalTunggakanAll;
  const countSantriNunggak = sppAllSummary.countSantriNunggak;

  const totalKasMasuk = keuangan
    .filter(k => k.jenis === 'MASUK')
    .reduce((a, b) => a + b.nominal, 0);

  const totalKasKeluar = keuangan
    .filter(k => k.jenis === 'KELUAR')
    .reduce((a, b) => a + b.nominal, 0);

  const saldoKas = totalKasMasuk - totalKasKeluar;

  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  const reportCards: {
    title: string;
    description: string;
    mode: PrintMode;
    icon: any;
    metricLabel: string;
    metricValue: string;
    accentColor: string;
    btnColor: string;
  }[] = [
    {
      title: 'Rekap Pembayaran Siswa',
      description: 'Laporan seluruh transaksi pembayaran santri yang telah lunas & cicilan diterima.',
      mode: 'REKAP_PEMBAYARAN',
      icon: FileSpreadsheet,
      metricLabel: 'Total Kas Pembayaran Masuk',
      metricValue: formatRupiah(totalPembayaranMasuk),
      accentColor: 'border-emerald-200 bg-emerald-50/40',
      btnColor: 'bg-emerald-700 hover:bg-emerald-800'
    },
    {
      title: 'Rekap Tunggakan Santri',
      description: 'Daftar santri yang masih memiliki kekurangan pembayaran beserta kontak wali murid.',
      mode: 'REKAP_TUNGGAKAN',
      icon: AlertTriangle,
      metricLabel: 'Total Akumulasi Tunggakan',
      metricValue: `${formatRupiah(totalTunggakan)} (${countSantriNunggak} Santri)`,
      accentColor: 'border-rose-200 bg-rose-50/40',
      btnColor: 'bg-rose-700 hover:bg-rose-800'
    },
    {
      title: 'Laporan Uang Masuk',
      description: 'Rincian penerimaan kas sekolah: SPP, donasi yayasan, infaq wali murid, & bantuan.',
      mode: 'LAPORAN_MASUK',
      icon: ArrowDownLeft,
      metricLabel: 'Total Penerimaan Kas',
      metricValue: formatRupiah(totalKasMasuk),
      accentColor: 'border-teal-200 bg-teal-50/40',
      btnColor: 'bg-teal-700 hover:bg-teal-800'
    },
    {
      title: 'Laporan Uang Keluar',
      description: 'Rincian pengeluaran operasional: honor guru tahfidz, listrik, air, ATK, & perawatan.',
      mode: 'LAPORAN_KELUAR',
      icon: ArrowUpRight,
      metricLabel: 'Total Pengeluaran Kas',
      metricValue: formatRupiah(totalKasKeluar),
      accentColor: 'border-amber-200 bg-amber-50/40',
      btnColor: 'bg-amber-700 hover:bg-amber-800'
    },
    {
      title: 'Laporan Kas (Buku Kas Umum)',
      description: 'Arus kas masuk vs kas keluar lengkap dengan rekap saldo akhir berjalan.',
      mode: 'LAPORAN_KAS',
      icon: BookOpen,
      metricLabel: 'Saldo Kas Akhir Berjalan',
      metricValue: formatRupiah(saldoKas),
      accentColor: 'border-sky-200 bg-sky-50/40',
      btnColor: 'bg-sky-800 hover:bg-sky-900'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pusat Cetak & Laporan Keuangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semua tombol cetak aktif dengan KOP SURAT resmi SD Qur'an Unggulan Al-I'tisham Playen
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span>Tahun Ajaran: {setting.tahun_ajaran}</span>
        </div>
      </div>

      {/* Grid of Printable Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.mode}
              className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${card.accentColor}`}
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 rounded-xl bg-white shadow-xs">
                    <IconComp className="w-5 h-5 text-slate-800" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">{card.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {card.description}
                </p>
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 mb-4">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    {card.metricLabel}
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {card.metricValue}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenPrintReport(card.mode, selectedMonth)}
                className={`w-full py-2.5 px-4 text-xs font-extrabold text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${card.btnColor}`}
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen Resmi</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Standard Specifications Notice */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <span>Ketentuan Cetak Dokumen Sah Sekolah:</span>
        </h4>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
          <li>Setiap cetakan memuat <strong>KOP SURAT RESMI</strong> SD Qur'an Unggulan Al-I'tisham Playen dan logo sekolah terkini.</li>
          <li>Memuat tanggal cetak realtime, asal sekolah, nama petugas keuangan, dan tanda tangan Kepala Sekolah & Bendahara.</li>
          <li>Dapat langsung dicetak ke printer fisik (kertas A4) atau disimpan sebagai file PDF.</li>
        </ul>
      </div>
    </div>
  );
};
