import React, { useState } from 'react';
import { Student, Transaction, KeuanganRecord, SchoolSetting } from '../../types';
import { PrintMode } from '../PrintReportView';
import { School, TrendingUp, AlertTriangle, Printer, Calendar, Wallet, Users, CreditCard, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';

interface KepsekDashboardProps {
  students: Student[];
  transactions: Transaction[];
  keuangan: KeuanganRecord[];
  setting: SchoolSetting;
  onOpenPrintReport: (mode: PrintMode) => void;
}

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({
  students = [],
  transactions = [],
  keuangan = [],
  setting,
  onOpenPrintReport
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'RINGKASAN' | 'REKAP_BAYAR' | 'LAPORAN_KAS'>('RINGKASAN');

  const activeStudents = students.filter(s => s.status_aktif);
  
  const totalBayarMasuk = transactions
    .filter(t => t.status !== 'CANCEL')
    .reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);

  const totalTunggakan = transactions
    .filter(t => t.status === 'KURANG')
    .reduce((sum, t) => sum + (t.sisa || 0), 0);

  const totalMasukKas = keuangan
    .filter(k => k.jenis === 'MASUK')
    .reduce((sum, k) => sum + (k.nominal || 0), 0);

  const totalKeluarKas = keuangan
    .filter(k => k.jenis === 'KELUAR')
    .reduce((sum, k) => sum + (k.nominal || 0), 0);

  const saldoKas = totalMasukKas - totalKeluarKas;

  // Chart Data: Pemasukan vs Pengeluaran per Kategori
  const kasCategories = Array.from(new Set(keuangan.map(k => k.kategori)));
  const chartKasByCategory = kasCategories.map(cat => ({
    kategori: cat,
    Masuk: keuangan.filter(k => k.kategori === cat && k.jenis === 'MASUK').reduce((a, b) => a + b.nominal, 0),
    Keluar: keuangan.filter(k => k.kategori === cat && k.jenis === 'KELUAR').reduce((a, b) => a + b.nominal, 0)
  }));

  const countLunas = transactions.filter(t => t.status === 'LUNAS').length;
  const countKurang = transactions.filter(t => t.status === 'KURANG').length;
  const paymentStatusData = [
    { name: 'Lunas', value: countLunas, color: '#059669' },
    { name: 'Kurang Bayar', value: countKurang, color: '#f59e0b' }
  ];

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <School className="w-4 h-4" />
            <span>Portal Eksekutif Kepala Sekolah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Monitoring & Evaluasi Keuangan Lembaga
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-xl">
            {setting.nama_sekolah} &bull; Akses laporan keuangan transparan & rekapitulasi real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-700/50 px-4 py-2 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-amber-300" />
          <span>TA {setting.tahun_ajaran}</span>
        </div>
      </div>

      {/* 4 Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Santri Aktif</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{activeStudents.length} <span className="text-xs font-medium text-slate-500">Santri</span></div>
          <p className="text-xs text-slate-500 mt-1">Tersebar di 10 rombel kelas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pembayaran Santri Masuk</span>
          <div className="text-xl font-extrabold text-emerald-800 mt-2">{formatRupiah(totalBayarMasuk)}</div>
          <p className="text-xs text-slate-500 mt-1">Akumulasi penerimaan syahriah & infaq</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tunggakan Santri</span>
          <div className="text-xl font-extrabold text-rose-700 mt-2">{formatRupiah(totalTunggakan)}</div>
          <p className="text-xs text-rose-600 mt-1 font-semibold">{countKurang} Transaksi belum tuntas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Sekolah</span>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{formatRupiah(saldoKas)}</div>
          <p className="text-xs text-sky-700 mt-1 font-semibold">Kas Masuk - Kas Keluar</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs for Kepsek */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('RINGKASAN')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'RINGKASAN' ? 'bg-amber-800 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Grafik Keuangan & Analitik
        </button>
        <button
          onClick={() => setActiveSubTab('REKAP_BAYAR')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'REKAP_BAYAR' ? 'bg-amber-800 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Rekapitulasi Pembayaran
        </button>
        <button
          onClick={() => setActiveSubTab('LAPORAN_KAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'LAPORAN_KAS' ? 'bg-amber-800 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Cetak Laporan Resmi
        </button>
      </div>

      {/* View 1: Grafik & Analitik */}
      {activeSubTab === 'RINGKASAN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">Grafik Arus Pemasukan & Pengeluaran Kas</h3>
            <p className="text-xs text-slate-500 mb-4">Laporan perbandingan biaya operasional vs penerimaan</p>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartKasByCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="kategori" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Rp${val / 1000000}M`} />
                  <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Masuk" fill="#059669" radius={[4, 4, 0, 0]} name="Uang Masuk" />
                  <Bar dataKey="Keluar" fill="#e11d48" radius={[4, 4, 0, 0]} name="Uang Keluar" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Tingkat Ketuntasan SPP</h3>
              <p className="text-xs text-slate-500 mb-2">Persentase santri lunas vs santri yang mencicil</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} Transaksi`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Lunas Selesai
                </span>
                <span className="font-bold text-slate-800">{countLunas} Transaksi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Memiliki Kekurangan
                </span>
                <span className="font-bold text-slate-800">{countKurang} Transaksi</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Rekap Pembayaran */}
      {activeSubTab === 'REKAP_BAYAR' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Rekapitulasi Setoran Pembayaran Santri</h3>
              <p className="text-xs text-slate-500">Daftar transaksi masuk real-time (Mode Baca Sah)</p>
            </div>
            <button
              onClick={() => onOpenPrintReport('REKAP_PEMBAYARAN')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Pembayaran</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nama Santri</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Jenis Pembayaran</th>
                  <th className="p-3 text-right">Nominal Bayar</th>
                  <th className="p-3 text-right">Sisa Tagihan</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {transactions.filter(t => t.status !== 'CANCEL').map(trx => (
                  <tr key={trx.id_transaksi} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{trx.tanggal}</td>
                    <td className="p-3 font-bold text-slate-900">{trx.nama_siswa}</td>
                    <td className="p-3 text-slate-600">{trx.kelas}</td>
                    <td className="p-3">{trx.jenis}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                    <td className="p-3 text-right font-bold text-rose-700">{trx.sisa > 0 ? formatRupiah(trx.sisa) : '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{trx.petugas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Laporan Cetak Khusus Kepsek */}
      {activeSubTab === 'LAPORAN_KAS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Rekapitulasi Pembayaran Santri</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">Cetak seluruh bukti pembayaran santri semester berjalan dengan kop resmi.</p>
            </div>
            <button
              onClick={() => onOpenPrintReport('REKAP_PEMBAYARAN')}
              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Pembayaran</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Rekapitulasi Tunggakan Santri</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">Daftar santri yang memiliki tunggakan untuk pertimbangan tindak lanjut.</p>
            </div>
            <button
              onClick={() => onOpenPrintReport('REKAP_TUNGGAKAN')}
              className="w-full py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Tunggakan</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Buku Kas Umum (Arus Kas)</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">Laporan uang masuk, uang keluar dan saldo akhir kas operasional sekolah.</p>
            </div>
            <button
              onClick={() => onOpenPrintReport('LAPORAN_KAS')}
              className="w-full py-2.5 text-xs font-bold text-white bg-sky-800 hover:bg-sky-900 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Buku Kas Umum</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
