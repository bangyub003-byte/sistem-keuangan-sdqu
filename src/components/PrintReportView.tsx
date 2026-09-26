import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SchoolSetting, Transaction, KeuanganRecord, Student } from '../types';
import {
  calculateStudentSppStatus,
  calculateAllStudentsSppSummary,
  getStandardTransactionTitle,
  formatTransactionTimestamp,
  cleanTransactionTime
} from '../utils/sppLogic';
import { createTunggakanReminderWaUrl } from '../utils/whatsappHelper';
import { Printer, X, FileText, AlertCircle } from 'lucide-react';

export type PrintMode =
  | 'KUITANSI_TRANSAKSI'
  | 'KUITANSI'
  | 'REKAP_PEMBAYARAN'
  | 'REKAP_TUNGGAKAN'
  | 'LAPORAN_MASUK'
  | 'LAPORAN_KELUAR'
  | 'LAPORAN_KAS'
  | 'KARTU_SPP';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeKeuangan = Array.isArray(keuangan) ? keuangan : [];

  const isReceipt = mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI';

  const transaction = propTransaction || (isReceipt ? (data as Transaction) : null);
  const linkedStudent = transaction ? safeStudents.find(s => s.nisn === transaction.nisn) : null;
  const student = propStudent || (mode === 'KARTU_SPP' ? (data as Student) : null) || linkedStudent;
  const effectiveMonth = filterMonth || month || '';

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage(null);

    // Validasi data nyata sebelum proses cetak
    if (isReceipt) {
      if (!transaction || !transaction.id_transaksi) {
        setErrorMessage('Data transaksi kuitansi belum siap atau belum dimuat, mohon tunggu sebentar.');
        return;
      }
      if (!transaction.nama_siswa && !transaction.nisn && !linkedStudent?.nama) {
        setErrorMessage('Data nama atau NISN murid pada transaksi ini tidak lengkap. Mohon tunggu sebentar.');
        return;
      }
    } else if (mode === 'KARTU_SPP') {
      if (!student || !student.id_siswa) {
        setErrorMessage('Data murid untuk kartu SPP belum siap atau belum dipilih, mohon tunggu sebentar.');
        return;
      }
    } else if (mode === 'REKAP_PEMBAYARAN' || mode === 'REKAP_TUNGGAKAN') {
      if (safeStudents.length === 0) {
        setErrorMessage('Data murid untuk laporan belum siap atau masih kosong, mohon tunggu sebentar.');
        return;
      }
    } else if (mode === 'LAPORAN_MASUK' || mode === 'LAPORAN_KELUAR' || mode === 'LAPORAN_KAS') {
      if (safeKeuangan.length === 0 && safeTransactions.length === 0) {
        setErrorMessage('Data pembukuan keuangan belum siap atau masih kosong, mohon tunggu sebentar.');
        return;
      }
    }

    try {
      window.focus();
      window.print();
    } catch (err: any) {
      console.error('Print execution error:', err);
      setErrorMessage(
        `Dialog cetak tidak dapat dibuka otomatis (${err?.message || err}). Silakan gunakan pintasan keyboard Ctrl + P (atau Cmd + P di Mac) untuk mencetak atau menyimpan dokumen sebagai PDF.`
      );
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

  // Render konten isi lembar dokumen
  const renderDocumentContent = () => {
    const trxTs = transaction
      ? formatTransactionTimestamp(transaction.tanggal, transaction.waktu)
      : { dateDisplay: '', timeDisplay: '', fullDisplay: '' };

    const studentName = transaction?.nama_siswa || linkedStudent?.nama || student?.nama || '-';
    const studentClass = transaction?.kelas || linkedStudent?.kelas || student?.kelas || '-';
    const studentNisn = transaction?.nisn || linkedStudent?.nisn || student?.nisn || '-';

    return (
      <div className="relative">
        {/* WATERMARK LOGO SEKOLAH (Transparan & Samar di Latar Belakang) */}
        <div className="watermark-bg pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0">
          {setting.logo ? (
            <img
              src={setting.logo}
              alt=""
              className="w-72 h-72 sm:w-88 sm:h-88 object-contain opacity-[0.08] grayscale contrast-125 filter"
              style={{ opacity: 0.08 }}
            />
          ) : (
            <div
              className="text-8xl sm:text-9xl font-bold font-arabic select-none text-slate-900"
              style={{ opacity: 0.06 }}
            >
              الإعتصام
            </div>
          )}
        </div>

        {/* KONTEN DOKUMEN RESMI STANDAR A4/A5 */}
        <div className="relative z-10">
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
                <div className="text-emerald-800 font-bold text-center font-arabic text-xl">الإعتصام</div>
              )}
            </div>
            <div className="grow text-center">
              <h4 className="text-sm font-semibold tracking-wider text-slate-600 uppercase">
                YAYASAN AL-I'TISHAM PLAYEN GUNUNGKIDUL
              </h4>
              <h1 className="text-xl sm:text-2xl font-extrabold text-emerald-900 uppercase tracking-wide">
                {setting.nama_sekolah}
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">{setting.alamat}</p>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                NPSN: 69987123 | Terakreditasi A | Kontak WhatsApp: {setting.no_wa}
              </p>
            </div>
          </div>

          {/* 1. KUITANSI PEMBAYARAN SATUAN FORMAL */}
          {isReceipt && transaction && (
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
                        <td className="py-1 font-bold text-slate-900">: {studentName}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">NISN</td>
                        <td className="py-1 font-mono font-medium">: {studentNisn}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Tingkat / Kelas</td>
                        <td className="py-1">: {studentClass}</td>
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
                        <td className="py-1 font-bold text-slate-900">
                          : {trxTs.dateDisplay}{' '}
                          {trxTs.timeDisplay ? `(${trxTs.timeDisplay} WIB)` : ''}
                        </td>
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
                          :{' '}
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-xs ${
                              transaction.status === 'LUNAS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : transaction.status === 'KURANG'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
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
                    <th className="border border-slate-300 p-2 text-right w-36">Sisa Kekurangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 text-center">1</td>
                    <td className="border border-slate-300 p-2 font-medium">
                      {getStandardTransactionTitle(transaction)}
                      {transaction.keterangan && (
                        <div className="text-xs text-slate-500 italic mt-0.5">{transaction.keterangan}</div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-medium">
                      {formatRupiah(transaction.nominal_tagihan)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-bold text-emerald-800">
                      {formatRupiah(transaction.nominal_bayar)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-medium text-rose-700">
                      {formatRupiah(transaction.sisa)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={3} className="border border-slate-300 p-2 text-right">
                      TOTAL DITERIMA:
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-base text-emerald-900">
                      {formatRupiah(transaction.nominal_bayar)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-rose-800">
                      {formatRupiah(transaction.sisa)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 2. REKAP PEMBAYARAN SPP */}
          {mode === 'REKAP_PEMBAYARAN' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                  LAPORAN PEMBAYARAN SPP MURID
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Periode: {effectiveMonth || 'Semua Periode'} &bull; Tahun Ajaran: {setting.tahun_ajaran}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Tanggal</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Murid</th>
                    <th className="border border-slate-300 p-2 text-center">Kelas</th>
                    <th className="border border-slate-300 p-2 text-center">Bulan</th>
                    <th className="border border-slate-300 p-2 text-right">Nominal</th>
                    <th className="border border-slate-300 p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTransactions
                    .filter(t => t.status !== 'CANCEL' && (!effectiveMonth || t.bulan === effectiveMonth))
                    .map((t, idx) => (
                      <tr key={t.id_transaksi} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono">{t.tanggal}</td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-800">{t.nama_siswa}</td>
                        <td className="border border-slate-300 p-2 text-center">{t.kelas}</td>
                        <td className="border border-slate-300 p-2 text-center font-medium">{t.bulan || '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-medium text-emerald-800">
                          {formatRupiah(t.nominal_bayar)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-[10px]">
                          {t.status}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. REKAP TUNGGAKAN */}
          {mode === 'REKAP_TUNGGAKAN' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                  LAPORAN TUNGGAKAN SPP MURID
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Kompilasi Kewajiban Belum Terselesaikan &bull; Tahun Ajaran: {setting.tahun_ajaran}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Murid</th>
                    <th className="border border-slate-300 p-2 text-center">Kelas</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Wali</th>
                    <th className="border border-slate-300 p-2 text-center">Kontak Wali</th>
                    <th className="border border-slate-300 p-2 text-left">Bulan Tunggakan</th>
                    <th className="border border-slate-300 p-2 text-right">Total Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allSum = calculateAllStudentsSppSummary(
                      safeStudents,
                      safeTransactions,
                      setting.tahun_ajaran,
                      new Date(),
                      setting.spp_mulai_bulan,
                      setting.spp_mulai_tahun
                    );
                    const nunggakList = (allSum.studentsWithTunggakan || allSum.summaries.filter(s => s.totalTunggakanKeseluruhan > 0));

                    return nunggakList.map((item, idx) => (
                      <tr key={item.student.id_siswa} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-800">{item.student.nama}</td>
                        <td className="border border-slate-300 p-2 text-center">{item.student.kelas}</td>
                        <td className="border border-slate-300 p-2">{item.student.nama_wali}</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">
                          {item.student.no_hp || item.student.no_hp_wali || '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-rose-700">
                          {item.monthsNunggakList.join(', ') || 'Tagihan Lain / Historis'}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">
                          {formatRupiah(item.totalTunggakanKeseluruhan)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. LAPORAN KEUANGAN KAS UMUM */}
          {(mode === 'LAPORAN_MASUK' || mode === 'LAPORAN_KELUAR' || mode === 'LAPORAN_KAS') && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                  BUKU KAS & KEUANGAN SEKOLAH
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Jenis: {mode === 'LAPORAN_MASUK' ? 'Pemasukan Kas' : mode === 'LAPORAN_KELUAR' ? 'Pengeluaran Kas' : 'Arus Kas Lengkap (Masuk & Keluar)'}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Tanggal</th>
                    <th className="border border-slate-300 p-2 text-left">Kategori & Uraian</th>
                    <th className="border border-slate-300 p-2 text-right">Pemasukan (Rp)</th>
                    <th className="border border-slate-300 p-2 text-right">Pengeluaran (Rp)</th>
                    <th className="border border-slate-300 p-2 text-left">Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {safeKeuangan
                    .filter(k => k.status !== 'CANCEL' && (mode === 'LAPORAN_KAS' ? true : k.jenis === (mode === 'LAPORAN_MASUK' ? 'MASUK' : 'KELUAR')))
                    .map((item, idx) => (
                      <tr key={item.id_keuangan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono">{item.tanggal}</td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-bold text-slate-900">[{item.kategori}]</span> {item.keterangan}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-medium text-emerald-800">
                          {item.jenis === 'MASUK' ? formatRupiah(item.nominal) : '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-medium text-rose-700">
                          {item.jenis === 'KELUAR' ? formatRupiah(item.nominal) : '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-600">{item.petugas}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. KARTU SPP DIGITAL */}
          {mode === 'KARTU_SPP' && student && (
            <div className="print-break-inside-avoid">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                  KARTU PEMBAYARAN SPP MURID
                </h2>
                <p className="text-xs text-slate-600 mt-1">Tahun Ajaran: {setting.tahun_ajaran}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs sm:text-sm grid grid-cols-2 gap-4">
                <div>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 text-slate-500 w-32">Nama Murid</td>
                        <td className="py-1 font-bold text-slate-900">: {student.nama}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">NISN</td>
                        <td className="py-1 font-mono font-medium">: {student.nisn}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Tingkat / Kelas</td>
                        <td className="py-1">: {student.kelas}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 text-slate-500 w-32">Nama Wali</td>
                        <td className="py-1">: {student.nama_wali}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Kontak Wali</td>
                        <td className="py-1 font-mono">: {student.no_hp || student.no_hp_wali || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Kategori SPP</td>
                        <td className="py-1 font-bold text-emerald-800">
                          : {formatRupiah(student.spp_nominal)}{' '}
                          {student.spp_kategori !== 'REGULER' ? `(${student.spp_kategori})` : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Bulan Kewajiban</th>
                    <th className="border border-slate-300 p-2 text-right">Nominal Tagihan</th>
                    <th className="border border-slate-300 p-2 text-right">Jumlah Dibayar</th>
                    <th className="border border-slate-300 p-2 text-center">Tanggal Bayar</th>
                    <th className="border border-slate-300 p-2 text-center">Status</th>
                    <th className="border border-slate-300 p-2 text-center">Paraf / Validasi</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sppData = calculateStudentSppStatus(
                      student,
                      safeTransactions,
                      setting.tahun_ajaran,
                      new Date(),
                      setting.spp_mulai_bulan,
                      setting.spp_mulai_tahun
                    );
                    return sppData.allMonths.map((m, idx) => {
                      const match = safeTransactions.find(
                        t =>
                          t.nisn === student.nisn &&
                          t.status !== 'CANCEL' &&
                          t.bulan === m.monthName
                      );

                      return (
                        <tr key={m.monthName} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{m.monthName}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatRupiah(m.tagihan)}</td>
                          <td className="border border-slate-300 p-2 text-right font-medium text-emerald-800">
                            {m.dibayar > 0 ? formatRupiah(m.dibayar) : '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center text-slate-600">
                            {match?.tanggal || '-'}
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

          {/* TANDA TANGAN RESMI DOKUMEN STANDAR */}
          {isReceipt ? (
            <div className="print-break-inside-avoid mt-8 pt-4 border-t border-slate-200 flex justify-end text-xs sm:text-sm text-center">
              <div className="w-64">
                <p className="text-slate-600 mb-1">Playen, {currentDate}</p>
                <p className="font-bold text-slate-800">Bendahara Sekolah</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 italic">[Tanda Tangan Petugas Keuangan]</span>
                </div>
                <p className="font-bold text-slate-900 underline">{setting.nama_bendahara}</p>
                {setting.nipy_bendahara && setting.nipy_bendahara.trim() ? (
                  <p className="text-[11px] text-slate-500">NIPY. {setting.nipy_bendahara.trim()}</p>
                ) : null}
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
                {setting.nipy_kepala_sekolah && setting.nipy_kepala_sekolah.trim() ? (
                  <p className="text-[11px] text-slate-500">NIPY. {setting.nipy_kepala_sekolah.trim()}</p>
                ) : null}
              </div>
              <div>
                <p className="text-slate-600 mb-1">Playen, {currentDate}</p>
                <p className="font-bold text-slate-800">Bendahara Sekolah</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 italic">[Tanda Tangan Petugas Keuangan]</span>
                </div>
                <p className="font-bold text-slate-900 underline">{setting.nama_bendahara}</p>
                {setting.nipy_bendahara && setting.nipy_bendahara.trim() ? (
                  <p className="text-[11px] text-slate-500">NIPY. {setting.nipy_bendahara.trim()}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-8 pt-3 border-t border-dotted border-slate-300 flex justify-between items-center text-[10px] text-slate-400">
            <div>Dokumen Sah Diterbitkan oleh Sistem Administrasi Keuangan {setting.nama_sekolah}</div>
            <div className="font-mono">Waktu Cetak: {new Date().toLocaleTimeString('id-ID')} WIB</div>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <>
      {/* 1. MODAL DIALOG PRATINJAU DI LAYAR (no-print) */}
      <div
        id="printable-report-modal"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header - Fixed at Top */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 px-5 sm:px-6 py-3.5 flex items-center justify-between text-white shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">Pratinjau Cetak & Dokumen Resmi</h3>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                KOP Surat Resmi {setting.nama_sekolah} &bull; Siap Dicetak / Disimpan sebagai PDF (Format Standar A4/A5)
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                title="Buka jendela cetak atau Simpan sebagai PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner Error jika data belum siap */}
          {errorMessage && (
            <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 text-rose-500 hover:text-rose-800 rounded-md cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {/* Body Pratinjau: Area scrollable yang dapat digulir penuh dari kop sampai tanda tangan */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 grow flex justify-center">
            <div className="w-full max-w-4xl bg-white border border-slate-200 shadow-xl rounded-xl p-6 sm:p-10 text-slate-900 relative">
              {renderDocumentContent()}
            </div>
          </div>

          {/* Footer Bar - Fixed at Bottom */}
          <div className="bg-white border-t border-slate-200 p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 text-center sm:text-left">
              Gunakan pilihan <strong>'Simpan sebagai PDF'</strong> pada jendela cetak untuk mengunduh dokumen.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ELEMEN CETAK KHUSUS BROWSER (print:block) */}
      <div id="printable-document" className="hidden print:block print:w-full print:p-0 print:m-0">
        <div className="bg-white text-slate-900 relative p-4 sm:p-6 print-break-inside-avoid">
          {renderDocumentContent()}
        </div>
      </div>
    </>,
    document.body
  );
};
