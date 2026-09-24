import React, { useState } from 'react';
import { SchoolSetting, Transaction, KeuanganRecord, Student } from '../types';
import { calculateStudentSppStatus, calculateAllStudentsSppSummary, getStandardTransactionTitle } from '../utils/sppLogic';
import { createTunggakanReminderWaUrl } from '../utils/whatsappHelper';
import { Printer, X, FileText, AlertCircle } from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReceipt = mode === 'KUITANSI_TRANSAKSI' || mode === 'KUITANSI';

  const transaction = propTransaction || (isReceipt ? (data as Transaction) : null);
  const student = propStudent || (mode === 'KARTU_SPP' ? (data as Student) : null);
  const effectiveMonth = filterMonth || month || '';
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeKeuangan = Array.isArray(keuangan) ? keuangan : [];

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
      if (!transaction.nama_siswa && !transaction.nisn) {
        setErrorMessage('Data nama atau NISN murid pada transaksi ini tidak lengkap. Mohon tunggu sebentar.');
        return;
      }
    } else if (mode === 'KARTU_SPP') {
      if (!student || !student.id_siswa) {
        setErrorMessage('Data santri untuk kartu SPP belum siap atau belum dipilih, mohon tunggu sebentar.');
        return;
      }
    } else if (mode === 'REKAP_PEMBAYARAN' || mode === 'REKAP_TUNGGAKAN') {
      if (safeStudents.length === 0) {
        setErrorMessage('Data santri untuk laporan belum siap atau masih kosong, mohon tunggu sebentar.');
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

  return (
    <div
      id="printable-report-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6"
    >
      {/* Top Action Bar - Hidden in print */}
      <div className="no-print w-full max-w-4xl bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">Pratinjau Cetak & Dokumen Resmi</h3>
          </div>
          <p className="text-xs text-slate-500">
            KOP Surat Resmi Yayasan Al-I'tisham Playen Gunungkidul &bull; Siap Dicetak atau Disimpan sebagai PDF (Format Standar A4/A5)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
          {/* Tombol Tunggal Utama: Cetak / Simpan PDF */}
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer text-xs sm:text-sm"
              title="Buka jendela cetak atau Simpan sebagai PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <span className="text-[10px] text-slate-500 font-medium text-right max-w-xs leading-tight">
              Gunakan pilihan 'Simpan sebagai PDF' pada jendela cetak untuk mengunduh sebagai file PDF
            </span>
          </div>

          {/* Tombol Tutup */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Tutup Pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pesan Error jika PDF atau Cetak Mengalami Kendala */}
      {errorMessage && (
        <div className="no-print w-full max-w-4xl mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="p-1 text-rose-500 hover:text-rose-800 rounded-md cursor-pointer"
            title="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Printable Sheet Container - SELALU UKURAN STANDAR A4/A5 PENUH DI LAYAR & HASIL CETAK */}
      <div 
        id="printable-document" 
        className="bg-white border border-slate-200 shadow-xl rounded-xl mb-10 text-slate-900 relative overflow-hidden w-full max-w-4xl p-8 sm:p-12 print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none"
      >
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

        {/* KONTEN DOKUMEN RESMI STANDAR A4/A5 (Z-10 agar berada di atas watermark) */}
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
                          <div className="font-semibold text-slate-900">{getStandardTransactionTitle(transaction)}</div>
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
                      {safeTransactions.filter(t => t.status !== 'CANCEL').map((trx, idx) => (
                        <tr key={trx.id_transaksi} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 text-center whitespace-nowrap">{trx.tanggal}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-semibold text-slate-900">{trx.nama_siswa || '-'}</div>
                            <div className="text-slate-500 font-mono text-[10px]">{trx.nisn}</div>
                          </td>
                          <td className="border border-slate-300 p-2">{trx.kelas || '-'}</td>
                          <td className="border border-slate-300 p-2">{getStandardTransactionTitle(trx)}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-emerald-800">{formatRupiah(trx.nominal_bayar)}</td>
                          <td className="border border-slate-300 p-2 text-center font-semibold text-[11px]">{trx.status}</td>
                          <td className="border border-slate-300 p-2 text-slate-600">{trx.petugas}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-100 font-bold text-slate-900">
                        <td colSpan={5} className="border border-slate-300 p-2 text-right uppercase">Total Kas Pembayaran Diterima</td>
                        <td className="border border-slate-300 p-2 text-right text-emerald-900 font-extrabold">
                          {formatRupiah(safeTransactions.filter(t => t.status !== 'CANCEL').reduce((acc, c) => acc + (c.nominal_bayar || 0), 0))}
                        </td>
                        <td colSpan={2} className="border border-slate-300 p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. REKAP TUNGGAKAN MURID */}
              {mode === 'REKAP_TUNGGAKAN' && (
                <div>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                      LAPORAN REKAPITULASI TUNGGAKAN SPP MURID
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">Tahun Ajaran: {setting.tahun_ajaran} {filterMonth ? `| Perhitungan s.d Bulan: ${filterMonth}` : ''}</p>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                    <thead>
                      <tr className="bg-emerald-800 text-white">
                        <th className="border border-slate-300 p-2 text-center w-10">No</th>
                        <th className="border border-slate-300 p-2 text-left">NISN & Nama Murid</th>
                        <th className="border border-slate-300 p-2 text-left">Kelas</th>
                        <th className="border border-slate-300 p-2 text-left">Nama Wali & Kontak WA</th>
                        <th className="border border-slate-300 p-2 text-left">Rincian Bulan Tertunggak</th>
                        <th className="border border-slate-300 p-2 text-right">Total Tunggakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const result = calculateAllStudentsSppSummary(safeStudents, safeTransactions, filterMonth, setting);
                        const arrearsList = result.studentsWithTunggakan;

                        if (arrearsList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                                Alhamdulillah, tidak ada santri yang memiliki tunggakan SPP pada periode ini.
                              </td>
                            </tr>
                          );
                        }

                        return arrearsList.map((item, idx) => {
                          const st = item.student;
                          return (
                            <tr key={st.nisn} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                              <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                              <td className="border border-slate-300 p-2">
                                <div className="font-semibold text-slate-900">{st.nama}</div>
                                <div className="text-slate-500 font-mono text-[10px]">{st.nisn}</div>
                              </td>
                              <td className="border border-slate-300 p-2">{st.kelas}</td>
                              <td className="border border-slate-300 p-2">
                                <div className="font-medium text-slate-800">{st?.nama_wali || '-'}</div>
                                <div className="text-slate-500 text-[10px]">{st?.no_hp || st?.no_hp_wali || '-'}</div>
                              </td>
                              <td className="border border-slate-300 p-2 text-rose-700">
                                {item.monthsNunggakList.length > 0 ? (
                                  <div>
                                    <span className="font-medium">{item.monthsNunggakList.join(', ')}</span>
                                    <span className="text-[10px] text-slate-500 block">({item.monthsNunggakList.length} bulan belum lunas)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">
                                {formatRupiah(item.totalTunggakanKeseluruhan)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. LAPORAN ARUS KAS / KEUANGAN UMUM */}
              {(mode === 'LAPORAN_MASUK' || mode === 'LAPORAN_KELUAR' || mode === 'LAPORAN_KAS') && (
                <div>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                      {mode === 'LAPORAN_MASUK' && 'LAPORAN REKAPITULASI DANA MASUK'}
                      {mode === 'LAPORAN_KELUAR' && 'LAPORAN REKAPITULASI PENGELUARAN DANA'}
                      {mode === 'LAPORAN_KAS' && 'LAPORAN BUKU KAS UMUM SEKOLAH'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">Tahun Ajaran: {setting.tahun_ajaran}</p>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
                    <thead>
                      <tr className="bg-emerald-800 text-white">
                        <th className="border border-slate-300 p-2 text-center w-10">No</th>
                        <th className="border border-slate-300 p-2 text-center">Tanggal</th>
                        <th className="border border-slate-300 p-2 text-left">Uraian / Keterangan</th>
                        <th className="border border-slate-300 p-2 text-left">Kategori Dana</th>
                        <th className="border border-slate-300 p-2 text-right">Debit (Masuk)</th>
                        <th className="border border-slate-300 p-2 text-right">Kredit (Keluar)</th>
                        <th className="border border-slate-300 p-2 text-left">Penanggung Jawab</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeKeuangan
                        .filter(k => {
                          if (mode === 'LAPORAN_MASUK') return k.jenis === 'MASUK';
                          if (mode === 'LAPORAN_KELUAR') return k.jenis === 'KELUAR';
                          return true;
                        })
                        .map((item, idx) => (
                          <tr key={item.id_keuangan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-2 text-center whitespace-nowrap">{item.tanggal}</td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-semibold text-slate-900">{item.keterangan}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {item.id_keuangan}</div>
                            </td>
                            <td className="border border-slate-300 p-2">{item.kategori}</td>
                            <td className="border border-slate-300 p-2 text-right font-medium text-emerald-800">
                              {item.jenis === 'MASUK' ? formatRupiah(item.nominal) : '-'}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-medium text-rose-700">
                              {item.jenis === 'KELUAR' ? formatRupiah(item.nominal) : '-'}
                            </td>
                            <td className="border border-slate-300 p-2 text-slate-600">{item.pj}</td>
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
                      KARTU PEMBAYARAN SPP SANTRI
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
                              : {formatRupiah(student.spp_nominal)} {student.spp_kategori !== 'REGULER' ? `(${student.spp_kategori})` : ''}
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
                        const sppData = calculateStudentSppStatus(student, safeTransactions, undefined, setting);
                        return sppData.allMonths.map((m, idx) => {
                          const match = safeTransactions.find(t =>
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
                <div>Dokumen Sah Diterbitkan oleh Sistem Administrasi Keuangan SD Qur'an Unggulan Al-I'tisham Playen</div>
                <div className="font-mono">Waktu Cetak: {new Date().toLocaleTimeString('id-ID')} WIB</div>
              </div>
        </div>
      </div>
    </div>
  );
};
