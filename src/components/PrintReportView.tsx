import React, { useState, useMemo } from 'react';
import { SchoolSetting, Transaction, KeuanganRecord, Student } from '../types';
import { calculateStudentSppStatus, calculateAllStudentsSppSummary } from '../utils/sppLogic';
import { createTunggakanReminderWaUrl } from '../utils/whatsappHelper';
import { Printer, X, Download, FileText, CheckCircle2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export type PrintMode = 'KUITANSI_TRANSAKSI' | 'KUITANSI' | 'REKAP_PEMBAYARAN' | 'REKAP_TUNGGAKAN' | 'LAPORAN_MASUK' | 'LAPORAN_KELUAR' | 'LAPORAN_KAS' | 'KARTU_SPP';

interface PrintReportViewProps {
  mode: PrintMode | string;
  setting: SchoolSetting;
  onClose: () => void;
  // Dynamic payloads
  transaction?: Transaction | null;
  student?: Student | null;
  data?: any;
  month?: string;
  transactions?: Transaction[];
  students?: Student[];
  keuangan?: KeuanganRecord[];
  filterMonth?: string;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  mode,
  setting,
  onClose,
  transaction: propTransaction,
  student: propStudent,
  data,
  month,
  transactions = [],
  students = [],
  keuangan = [],
  filterMonth = ''
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const transaction = propTransaction || ((mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI') ? (data as Transaction) : null);
  const student = propStudent || (mode === 'KARTU_SPP' ? (data as Student) : null);
  const effectiveMonth = filterMonth || month || '';
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeKeuangan = Array.isArray(keuangan) ? keuangan : [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const element = document.getElementById('printable-document');
      if (!element) {
        window.print();
        return;
      }

      let docName = 'Dokumen_AlItisham';
      if (mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI') {
        docName = `Kuitansi_${transaction?.id_transaksi || 'Resmi'}_${(transaction?.nama_siswa || 'Murid').replace(/\s+/g, '_')}`;
      } else if (mode === 'KARTU_SPP') {
        docName = `Kartu_SPP_${(student?.nama || 'Murid').replace(/\s+/g, '_')}_${student?.nisn || ''}`;
      } else if (mode === 'REKAP_PEMBAYARAN') {
        docName = `Rekap_Pembayaran_${effectiveMonth || 'Semua'}_SDQ_AlItisham`;
      } else if (mode === 'REKAP_TUNGGAKAN') {
        docName = `Rekap_Tunggakan_${effectiveMonth || 'Semua'}_SDQ_AlItisham`;
      } else if (mode === 'LAPORAN_MASUK' || mode === 'LAPORAN_KELUAR' || mode === 'LAPORAN_KAS') {
        docName = `Laporan_Keuangan_${mode}_SDQ_AlItisham`;
      }

      const isLandscape = mode === 'REKAP_PEMBAYARAN' || mode === 'REKAP_TUNGGAKAN';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${docName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.warn('html2pdf fallback to window.print():', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6">
      {/* Top Action Bar - Hidden in print */}
      <div className="no-print w-full max-w-4xl bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">Pratinjau Cetak & Simpan Dokumen Resmi</h3>
            {downloadSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Diunduh!
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            KOP Surat Resmi Yayasan Al-I'tisham Playen Gunungkidul &bull; Siap Download / Cetak
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {/* Tombol Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer text-xs sm:text-sm"
            title="Download file PDF langsung ke memori komputer atau HP"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Mengunduh...' : 'Download PDF (.pdf)'}</span>
          </button>

          {/* Tombol Cetak / Simpan PDF Browser */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition-all shadow-xs cursor-pointer text-xs sm:text-sm"
            title="Buka dialog cetak printer atau Simpan PDF browser"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak / Print</span>
          </button>

          {/* Tombol Tutup */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Tutup Pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div 
        id="printable-document" 
        className="w-full max-w-4xl bg-white border border-slate-200 shadow-xl rounded-xl p-8 sm:p-12 mb-10 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
      >
        
        {/* KOP SURAT RESMI */}
        <div className="flex items-center border-b-4 border-double border-emerald-800 pb-4 mb-6">
          <div className="w-24 h-24 shrink-0 flex items-center justify-center p-1 bg-emerald-50 rounded-lg border border-emerald-200 mr-5">
            {setting.logo ? (
              <img
                src={setting.logo}
                alt="Logo Sekolah"
                className="max-h-20 max-w-20 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-emerald-800 font-bold text-xs text-center font-arabic text-xl">الإعتصام</div>
            )}
          </div>
          <div className="grow text-center">
            <h4 className="text-sm font-semibold tracking-wider text-slate-600 uppercase">YAYASAN AL-I'TISHAM PLAYEN GUNUNGKIDUL</h4>
            <h1 className="text-xl sm:text-2xl font-extrabold text-emerald-900 uppercase tracking-wide">
              {setting.nama_sekolah}
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
              {setting.alamat}
            </p>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5">
              NPSN: 69987123 | Terakreditasi A | Kontak WhatsApp: {setting.no_wa}
            </p>
          </div>
        </div>

        {/* 1. KUITANSI PEMBAYARAN SATUAN */}
        {(mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI') && transaction && (
          <div className="print-break-inside-avoid">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                BUKTI PEMBAYARAN MURID (KUITANSI)
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">No. Registrasi: {transaction.id_transaksi}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500 w-32">Nama Murid</td>
                      <td className="py-1 font-bold text-slate-900">: {transaction.nama_siswa || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">NISN</td>
                      <td className="py-1 font-mono font-medium">: {transaction.nisn}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Tingkat / Kelas</td>
                      <td className="py-1">: {transaction.kelas || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Asal Lembaga</td>
                      <td className="py-1">: {setting.nama_sekolah}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500 w-32">Tanggal Transaksi</td>
                      <td className="py-1 font-bold text-slate-900">: {transaction.tanggal} {transaction.waktu ? `(${transaction.waktu} WIB)` : ''}</td>
                    </tr>
                    {transaction.bulan ? (
                      <tr className="bg-emerald-50/70">
                        <td className="py-1 text-emerald-900 font-bold w-32">Bulan Dibayar</td>
                        <td className="py-1 font-extrabold text-emerald-900">: {transaction.bulan}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-1 text-slate-500 w-32">Periode / Bulan</td>
                        <td className="py-1 text-slate-600">: Sesuai Jenis Tagihan</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-1 text-slate-500">Tahun Ajaran</td>
                      <td className="py-1">: {setting.tahun_ajaran}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Status Pembayaran</td>
                      <td className="py-1">
                        : <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                          transaction.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' :
                          transaction.status === 'KURANG' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Petugas Penerima</td>
                      <td className="py-1 font-medium">: {transaction.petugas || 'Petugas Keuangan'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rincian Finansial */}
            <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm mb-6">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="border border-slate-300 p-2 text-center w-12">No</th>
                  <th className="border border-slate-300 p-2 text-left">Uraian / Jenis Pembayaran</th>
                  <th className="border border-slate-300 p-2 text-right w-36">Nominal Tagihan</th>
                  <th className="border border-slate-300 p-2 text-right w-36">Jumlah Dibayar</th>
                  <th className="border border-slate-300 p-2 text-right w-36">Sisa Tunggakan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-3 text-center">1</td>
                  <td className="border border-slate-300 p-3">
                    <div className="font-semibold text-slate-900">{transaction.jenis}</div>
                    {transaction.bulan && <div className="text-xs text-slate-500">Periode: {transaction.bulan}</div>}
                    {transaction.keterangan && <div className="text-xs italic text-slate-500 mt-1">{transaction.keterangan}</div>}
                    {transaction.status === 'CANCEL' && transaction.alasan_batal && (
                      <div className="text-xs text-rose-600 font-medium mt-1">Dibatalkan: {transaction.alasan_batal}</div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-3 text-right font-medium">{formatRupiah(transaction.nominal_tagihan)}</td>
                  <td className="border border-slate-300 p-3 text-right font-bold text-emerald-800">{formatRupiah(transaction.nominal_bayar)}</td>
                  <td className="border border-slate-300 p-3 text-right font-bold text-rose-700">{formatRupiah(transaction.sisa)}</td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase">Total Pembayaran Masuk</td>
                  <td className="border border-slate-300 p-2 text-right text-emerald-800 font-extrabold">{formatRupiah(transaction.nominal_bayar)}</td>
                  <td className="border border-slate-300 p-2 text-right text-rose-700">{formatRupiah(transaction.sisa)}</td>
                </tr>
              </tbody>
            </table>

            {transaction.status === 'KURANG' && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                <strong>Catatan Tagihan:</strong> Masih terdapat kekurangan sebesar <strong>{formatRupiah(transaction.sisa)}</strong>. Harap menyelesaikan kekurangan sebelum akhir bulan berjalan. Jazakumullahu Khairan.
              </div>
            )}
          </div>
        )}

        {/* 2. REKAP PEMBAYARAN MURID */}
        {mode === 'REKAP_PEMBAYARAN' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                LAPORAN REKAPITULASI PEMBAYARAN MURID
              </h2>
              <p className="text-xs text-slate-600 mt-1">Tahun Ajaran: {setting.tahun_ajaran} {filterMonth ? `| Periode: ${filterMonth}` : ''}</p>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="border border-slate-300 p-2 text-center w-10">No</th>
                  <th className="border border-slate-300 p-2 text-center">Tanggal</th>
                  <th className="border border-slate-300 p-2 text-left">NISN & Nama Siswa</th>
                  <th className="border border-slate-300 p-2 text-left">Kelas</th>
                  <th className="border border-slate-300 p-2 text-left">Jenis Pembayaran</th>
                  <th className="border border-slate-300 p-2 text-right">Nominal Bayar</th>
                  <th className="border border-slate-300 p-2 text-center">Status</th>
                  <th className="border border-slate-300 p-2 text-left">Petugas</th>
                </tr>
              </thead>
              <tbody>
                {transactions.filter(t => t.status !== 'CANCEL').map((trx, idx) => (
                  <tr key={trx.id_transaksi} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">{trx.tanggal}</td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-semibold text-slate-900">{trx.nama_siswa || '-'}</div>
                      <div className="text-slate-500 font-mono text-[10px]">{trx.nisn}</div>
                    </td>
                    <td className="border border-slate-300 p-2">{trx.kelas || '-'}</td>
                    <td className="border border-slate-300 p-2">{trx.jenis}</td>
                    <td className="border border-slate-300 p-2 text-right font-bold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                    <td className="border border-slate-300 p-2 text-center font-semibold text-[11px]">{trx.status}</td>
                    <td className="border border-slate-300 p-2 text-slate-600">{trx.petugas}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-100 font-bold text-slate-900">
                  <td colSpan={5} className="border border-slate-300 p-2 text-right uppercase">Total Kas Pembayaran Diterima</td>
                  <td className="border border-slate-300 p-2 text-right text-emerald-900 font-extrabold">
                    {formatRupiah(transactions.filter(t => t.status !== 'CANCEL').reduce((acc, c) => acc + (c.nominal_bayar || 0), 0))}
                  </td>
                  <td colSpan={2} className="border border-slate-300 p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3. REKAP TUNGGAKAN */}
        {mode === 'REKAP_TUNGGAKAN' && (() => {
          const sppSummaryAll = calculateAllStudentsSppSummary(safeStudents, safeTransactions, setting.tahun_ajaran);
          const listTunggakan = sppSummaryAll.studentsWithTunggakan;

          return (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide text-rose-900">
                  LAPORAN REKAPITULASI TUNGGAKAN MURID
                </h2>
                <p className="text-xs text-slate-600 mt-1">Daftar Murid yang Memiliki Tunggakan Sampai Bulan Berjalan | TA {setting.tahun_ajaran}</p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Murid & NISN</th>
                    <th className="border border-slate-300 p-2 text-left">Kelas</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Wali / No. WA</th>
                    <th className="border border-slate-300 p-2 text-left">Uraian Kewajiban / Tunggakan</th>
                    <th className="border border-slate-300 p-2 text-right">Tagihan</th>
                    <th className="border border-slate-300 p-2 text-right">Sudah Bayar</th>
                    <th className="border border-slate-300 p-2 text-right text-rose-300">Sisa Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {listTunggakan.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-slate-300 p-6 text-center text-slate-500 font-medium">
                        Alhamdulillah, seluruh murid telah lunas sampai bulan berjalan.
                      </td>
                    </tr>
                  ) : (
                    listTunggakan.map((item, idx) => {
                      const st = item.student;
                      const uraianParts: string[] = [];
                      if (item.unpaidDueMonths.length > 0) {
                        uraianParts.push(`SPP (${item.monthsNunggakFullLabels.join(', ')})`);
                      }
                      if (item.nonSppSisa > 0) {
                        uraianParts.push(`Tagihan Lainnya`);
                      }
                      const uraian = uraianParts.join(' + ') || 'SPP Bulanan';

                      return (
                        <tr key={st.id_siswa || st.nisn} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{st.nama}</div>
                            <div className="text-slate-500 font-mono text-[10px]">NISN: {st.nisn}</div>
                          </td>
                          <td className="border border-slate-300 p-2">{st.kelas}</td>
                          <td className="border border-slate-300 p-2">
                            <div>{st.nama_wali || '-'}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-emerald-700 text-[10px]">{st.no_hp || '-'}</span>
                              {st.no_hp && (
                                <a
                                  href={createTunggakanReminderWaUrl(setting, st, item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Kirim Pengingat Tunggakan WA ke Wali"
                                  className="print:hidden px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                                >
                                  Kirim WA
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 p-2 font-medium text-slate-800">{uraian}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatRupiah(item.grandTotalTagihan)}</td>
                          <td className="border border-slate-300 p-2 text-right text-emerald-800">{formatRupiah(item.grandTotalDibayar)}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">{formatRupiah(item.grandTotalSisa)}</td>
                        </tr>
                      );
                    })
                  )}
                  <tr className="bg-rose-50 font-bold text-slate-900">
                    <td colSpan={7} className="border border-slate-300 p-2 text-right uppercase text-rose-900">Total Akumulasi Tunggakan</td>
                    <td className="border border-slate-300 p-2 text-right text-rose-800 font-extrabold">
                      {formatRupiah(sppSummaryAll.totalTunggakanAll)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* 4. LAPORAN UANG MASUK & KELUAR */}
        {(mode === 'LAPORAN_MASUK' || mode === 'LAPORAN_KELUAR' || mode === 'LAPORAN_KAS') && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                {mode === 'LAPORAN_MASUK' ? 'LAPORAN ARUS KAS MASUK' :
                 mode === 'LAPORAN_KELUAR' ? 'LAPORAN ARUS KAS KELUAR / PENGELUARAN' :
                 'BUKU KAS UMUM (LAPORAN KAS MASUK & KELUAR)'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">SD Qur'an Unggulan Al-I'tisham Playen | TA {setting.tahun_ajaran}</p>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-emerald-900 text-white">
                  <th className="border border-slate-300 p-2 text-center w-10">No</th>
                  <th className="border border-slate-300 p-2 text-center w-24">Tanggal</th>
                  <th className="border border-slate-300 p-2 text-center w-20">Jenis</th>
                  <th className="border border-slate-300 p-2 text-left w-28">Kategori</th>
                  <th className="border border-slate-300 p-2 text-left">Uraian / Keterangan</th>
                  <th className="border border-slate-300 p-2 text-right w-28">Masuk (Debit)</th>
                  <th className="border border-slate-300 p-2 text-right w-28">Keluar (Kredit)</th>
                </tr>
              </thead>
              <tbody>
                {keuangan
                  .filter(k => {
                    if (mode === 'LAPORAN_MASUK') return k.jenis === 'MASUK';
                    if (mode === 'LAPORAN_KELUAR') return k.jenis === 'KELUAR';
                    return true;
                  })
                  .map((k, idx) => (
                    <tr key={k.id_keuangan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center">{k.tanggal}</td>
                      <td className="border border-slate-300 p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          k.jenis === 'MASUK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {k.jenis}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-2 font-medium">{k.kategori}</td>
                      <td className="border border-slate-300 p-2">{k.keterangan}</td>
                      <td className="border border-slate-300 p-2 text-right font-medium text-emerald-800">
                        {k.jenis === 'MASUK' ? formatRupiah(k.nominal) : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-medium text-rose-700">
                        {k.jenis === 'KELUAR' ? formatRupiah(k.nominal) : '-'}
                      </td>
                    </tr>
                  ))}
                {/* Summary Row */}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="border border-slate-300 p-2 text-right uppercase">Total Mutasi</td>
                  <td className="border border-slate-300 p-2 text-right text-emerald-900 font-bold">
                    {formatRupiah(keuangan.filter(k => k.jenis === 'MASUK').reduce((a, b) => a + b.nominal, 0))}
                  </td>
                  <td className="border border-slate-300 p-2 text-right text-rose-900 font-bold">
                    {formatRupiah(keuangan.filter(k => k.jenis === 'KELUAR').reduce((a, b) => a + b.nominal, 0))}
                  </td>
                </tr>
                {mode === 'LAPORAN_KAS' && (
                  <tr className="bg-emerald-200 font-extrabold text-emerald-950">
                    <td colSpan={5} className="border border-slate-300 p-2 text-right uppercase">Saldo Kas Akhir Berjalan</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-right text-base">
                      {formatRupiah(
                        keuangan.filter(k => k.jenis === 'MASUK').reduce((a, b) => a + b.nominal, 0) -
                        keuangan.filter(k => k.jenis === 'KELUAR').reduce((a, b) => a + b.nominal, 0)
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. KARTU SPP MURID (UNTUK WALI MURID) */}
        {mode === 'KARTU_SPP' && student && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                KARTU PEMBAYARAN SYAHRIAH / SPP MURID
              </h2>
              <p className="text-xs text-slate-600 mt-1">Tahun Ajaran: {setting.tahun_ajaran}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <p><span className="text-slate-500 w-28 inline-block">Nama Murid</span>: <strong>{student.nama}</strong></p>
                <p><span className="text-slate-500 w-28 inline-block">NISN / NIK</span>: {student.nisn} / {student.nik}</p>
                <p><span className="text-slate-500 w-28 inline-block">Kelas</span>: {student.kelas}</p>
              </div>
              <div>
                <p><span className="text-slate-500 w-28 inline-block">Nama Orang Tua</span>: {student.nama_wali}</p>
                <p><span className="text-slate-500 w-28 inline-block">Nominal SPP</span>: <strong>{formatRupiah(student.spp_nominal)}</strong>/bln</p>
                {student.spp_kategori !== 'REGULER' && (
                  <p><span className="text-slate-500 w-28 inline-block">Kategori Khusus</span>: <span className="text-emerald-700 font-semibold">{student.spp_catatan || student.spp_kategori}</span></p>
                )}
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="border border-slate-300 p-2 text-center w-12">No</th>
                  <th className="border border-slate-300 p-2 text-left">Bulan / Periode</th>
                  <th className="border border-slate-300 p-2 text-center w-28">Tanggal Bayar</th>
                  <th className="border border-slate-300 p-2 text-right w-28">Nominal Bayar</th>
                  <th className="border border-slate-300 p-2 text-center w-24">Status</th>
                  <th className="border border-slate-300 p-2 text-center w-28">Paraf Petugas</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sppStatus = calculateStudentSppStatus(student, safeTransactions, setting.tahun_ajaran);
                  return sppStatus.allMonths.map((m, i) => {
                    const match = m.transactions[0];
                    return (
                      <tr key={m.label} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-2 text-center">{i + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">{m.label}</td>
                        <td className="border border-slate-300 p-2 text-center">{match?.tanggal || '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-semibold">
                          {m.dibayar > 0 ? formatRupiah(m.dibayar) : '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {m.status === 'LUNAS' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              LUNAS
                            </span>
                          )}
                          {m.status === 'KURANG' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              KURANG ({formatRupiah(m.sisa)})
                            </span>
                          )}
                          {m.status === 'BELUM_BAYAR' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              MENUNGGAK
                            </span>
                          )}
                          {m.status === 'BELUM_JATUH_TEMPO' && (
                            <span className="text-slate-400 italic">Belum Jatuh Tempo</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-[10px] text-slate-500 font-mono">
                          {m.dibayar > 0 ? (match?.petugas ? 'VALID' : 'LUNAS') : '-'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* TANDA TANGAN RESMI */}
        {mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI' ? (
          <div className="print-break-inside-avoid mt-8 pt-4 border-t border-slate-200 flex justify-end text-xs sm:text-sm text-center">
            <div className="w-64">
              <p className="text-slate-600 mb-1">Playen, {currentDate}</p>
              <p className="font-bold text-slate-800">Bendahara Sekolah</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">[Tanda Tangan Petugas Keuangan]</span>
              </div>
              <p className="font-bold text-slate-900 underline">{setting.nama_bendahara}</p>
              <p className="text-[11px] text-slate-500">NIPY. 19880922 201203 2 011</p>
            </div>
          </div>
        ) : (
          <div className="print-break-inside-avoid mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-xs sm:text-sm text-center">
            <div>
              <p className="text-slate-600 mb-1">Mengetahui,</p>
              <p className="font-bold text-slate-800">Kepala Sekolah</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">[Tanda Tangan & Cap Lembaga]</span>
              </div>
              <p className="font-bold text-slate-900 underline">{setting.nama_kepsek}</p>
              <p className="text-[11px] text-slate-500">NIPY. 19820514 201001 1 004</p>
            </div>
            <div>
              <p className="text-slate-600 mb-1">Playen, {currentDate}</p>
              <p className="font-bold text-slate-800">Bendahara Sekolah</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">[Tanda Tangan Petugas Keuangan]</span>
              </div>
              <p className="font-bold text-slate-900 underline">{setting.nama_bendahara}</p>
              <p className="text-[11px] text-slate-500">NIPY. 19880922 201203 2 011</p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 pt-3 border-t border-dotted border-slate-300 flex justify-between items-center text-[10px] text-slate-400">
          <div>Dokumen Sah Diterbitkan oleh Sistem Administrasi Keuangan SD Qur'an Unggulan Al-I'tisham Playen</div>
          <div className="font-mono">Waktu Cetak: {new Date().toLocaleTimeString('id-ID')} WIB</div>
        </div>
      </div>
    </div>
  );
};
