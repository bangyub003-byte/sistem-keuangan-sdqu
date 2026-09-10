import React from 'react';
import { Student, Transaction, KeuanganRecord, ActivityLog, SchoolSetting } from '../../types';
import { Users, CreditCard, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet, Calendar, Bell, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';

interface DashboardMenuProps {
  students: Student[];
  transactions: Transaction[];
  keuangan: KeuanganRecord[];
  logs: ActivityLog[];
  setting: SchoolSetting;
  onNavigateTo: (menuKey: string) => void;
}

export const DashboardMenu: React.FC<DashboardMenuProps> = ({
  students = [],
  transactions = [],
  keuangan = [],
  logs = [],
  setting,
  onNavigateTo
}) => {
  const activeStudents = students.filter(s => s.status_aktif);
  
  // Total Pembayaran Masuk (from Transactions)
  const totalBayarMasuk = transactions
    .filter(t => t.status !== 'CANCEL')
    .reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);

  // Jumlah Tunggakan (transactions with status KURANG)
  const totalTunggakan = transactions
    .filter(t => t.status === 'KURANG')
    .reduce((sum, t) => sum + (t.sisa || 0), 0);

  // Keuangan Kas Total
  const totalMasukKas = keuangan
    .filter(k => k.jenis === 'MASUK')
    .reduce((sum, k) => sum + (k.nominal || 0), 0);
  const totalKeluarKas = keuangan
    .filter(k => k.jenis === 'KELUAR')
    .reduce((sum, k) => sum + (k.nominal || 0), 0);
  const saldoKas = totalMasukKas - totalKeluarKas;

  // Chart Data 1: Pemasukan vs Pengeluaran per Kategori
  const kasCategories = Array.from(new Set(keuangan.map(k => k.kategori)));
  const chartKasByCategory = kasCategories.map(cat => {
    const masuk = keuangan
      .filter(k => k.kategori === cat && k.jenis === 'MASUK')
      .reduce((a, b) => a + b.nominal, 0);
    const keluar = keuangan
      .filter(k => k.kategori === cat && k.jenis === 'KELUAR')
      .reduce((a, b) => a + b.nominal, 0);
    return {
      kategori: cat,
      Masuk: masuk,
      Keluar: keluar
    };
  });

  // Chart Data 2: Status Pembayaran Santri
  const countLunas = transactions.filter(t => t.status === 'LUNAS').length;
  const countKurang = transactions.filter(t => t.status === 'KURANG').length;
  const countCancel = transactions.filter(t => t.status === 'CANCEL').length;
  const paymentStatusData = [
    { name: 'Lunas', value: countLunas, color: '#059669' },
    { name: 'Kurang Bayar', value: countKurang, color: '#f59e0b' },
    { name: 'Dibatalkan', value: countCancel, color: '#f43f5e' }
  ];

  // Rekap Bulan Berjalan
  const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const currentMonthIso = new Date().toISOString().slice(0, 7);
  const trxThisMonth = transactions.filter(t => t.tanggal.startsWith(currentMonthIso) && t.status !== 'CANCEL');
  const bayarThisMonth = trxThisMonth.reduce((a, b) => a + (b.nominal_bayar || 0), 0);

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Dashboard Keuangan Terintegrasi
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Selamat Datang di Panel Bendahara
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
            {setting.nama_sekolah} &bull; Sinkronisasi langsung ke Google Spreadsheet & Google Drive.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/50 px-4 py-2.5 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-amber-300" />
          <span>Bulan Berjalan: <strong>{currentMonthName}</strong></span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onNavigateTo('santri')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Siswa</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeStudents.length} <span className="text-sm font-medium text-slate-500">Santri</span></div>
          <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <span>Terdaftar di Spreadsheet</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => onNavigateTo('pembayaran')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Masuk (Santri)</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-700">{formatRupiah(totalBayarMasuk)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Bulan ini: <strong className="text-slate-700">{formatRupiah(bayarThisMonth)}</strong>
          </p>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onNavigateTo('laporan')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Tunggakan</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-700">{formatRupiah(totalTunggakan)}</div>
          <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
            <span>{countKurang} Transaksi belum lunas</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onNavigateTo('keuangan')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Sekolah</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">{formatRupiah(saldoKas)}</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="text-emerald-700 flex items-center"><ArrowUpRight className="w-3 h-3" /> Masuk</span>
            <span className="text-rose-700 flex items-center"><ArrowDownRight className="w-3 h-3" /> Keluar</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Arus Keuangan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Grafik Pemasukan & Pengeluaran Kas</h3>
              <p className="text-xs text-slate-500">Perbandingan arus kas berdasarkan kategori keuangan</p>
            </div>
            <button
              onClick={() => onNavigateTo('keuangan')}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Lihat Kas &rarr;
            </button>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartKasByCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="kategori" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Rp${val / 1000000}M`} />
                <Tooltip
                  formatter={(value: any) => formatRupiah(Number(value))}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Masuk" fill="#059669" radius={[4, 4, 0, 0]} name="Uang Masuk" />
                <Bar dataKey="Keluar" fill="#e11d48" radius={[4, 4, 0, 0]} name="Uang Keluar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Komposisi Status Pembayaran */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Grafik Status Pembayaran</h3>
            <p className="text-xs text-slate-500 mb-2">Persentase status pembayaran santri</p>
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

          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rekap Bulan Berjalan & Notifikasi Aktivitas Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rekap Bulan Berjalan (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Transaksi Terakhir Masuk</h3>
              <p className="text-xs text-slate-500">Daftar setoran pembayaran santri terbaru</p>
            </div>
            <button
              onClick={() => onNavigateTo('pembayaran')}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Semua Pembayaran &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Nama Santri</th>
                  <th className="p-2.5">Kelas</th>
                  <th className="p-2.5">Jenis</th>
                  <th className="p-2.5 text-right">Nominal</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 5).map((trx) => (
                  <tr key={trx.id_transaksi} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">{trx.tanggal}</td>
                    <td className="p-2.5 font-bold text-slate-900">{trx.nama_siswa}</td>
                    <td className="p-2.5 text-slate-600">{trx.kelas}</td>
                    <td className="p-2.5 text-slate-700">{trx.jenis}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' :
                        trx.status === 'KURANG' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifikasi Aktivitas Terbaru (Logs) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-base">Notifikasi Log Aktivitas</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Pencatatan real-time perubahan data (Sheet LOG)</p>

            <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
              {logs.slice(0, 7).map((log) => (
                <div key={log.id_log} className="p-2.5 rounded-lg bg-slate-50 border border-slate-150 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span className="font-bold text-slate-600">{log.user}</span>
                    <span>{log.tanggal}</span>
                  </div>
                  <p className="text-slate-700 leading-snug">{log.aktivitas}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-emerald-700 font-medium">
              Tercatat permanen di Google Spreadsheet &bull; Sheet LOG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
