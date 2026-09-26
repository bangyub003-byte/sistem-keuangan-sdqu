import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Student, Transaction, SchoolSetting } from '../../types';
import { calculateStudentSppStatus } from '../../utils/sppLogic';
import {
  X,
  Printer,
  Search,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Building,
  Eye,
  ListChecks,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Filter
} from 'lucide-react';

export const ACADEMIC_MONTHS = [
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
];

export interface SuratTagihanMuridData {
  student: Student;
  summary: ReturnType<typeof calculateStudentSppStatus>;
  tunggakanItems: Array<{
    jenis: string;
    periode: string;
    nominal: number;
    keterangan?: string;
  }>;
  totalTunggakan: number;
}

export type SuratTagihanSantriData = SuratTagihanMuridData;

interface CetakSuratTagihanMassalModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  transactions: Transaction[];
  setting: SchoolSetting;
  initialClass?: string;
  onUpdateSetting?: (updated: SchoolSetting) => void;
}

export const CetakSuratTagihanMassalModal: React.FC<CetakSuratTagihanMassalModalProps> = ({
  isOpen,
  onClose,
  students = [],
  transactions = [],
  setting,
  initialClass = '',
  onUpdateSetting
}) => {
  // Mode pemilihan cakupan: 'KELAS' | 'MANUAL'
  const [scopeMode, setScopeMode] = useState<'KELAS' | 'MANUAL'>('KELAS');
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || '');
  const [searchManual, setSearchManual] = useState<string>('');
  
  // Tab view di dalam modal: 'DAFTAR' (seleksi murid) atau 'PRATINJAU' (lihat hasil surat di layar)
  const [activeTab, setActiveTab] = useState<'DAFTAR' | 'PRATINJAU'>('DAFTAR');
  const [previewStudentId, setPreviewStudentId] = useState<string>('');

  // Selected student IDs set for printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Filter option: hanya yang punya tunggakan aktif atau semua
  const [onlyWithArrears, setOnlyWithArrears] = useState<boolean>(false);

  // Filter option: Tunggakan bulan apa saja yang disertakan (empty = Semua Bulan/Tahun)
  const [selectedFilterMonths, setSelectedFilterMonths] = useState<string[]>([]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);
  const monthFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthFilterRef.current && !monthFilterRef.current.contains(e.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    if (isMonthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthDropdownOpen]);

  // Status aksi cetak
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active students only
  const activeStudents = useMemo(() => {
    return (students || []).filter(s => s.status_aktif !== false);
  }, [students]);

  // Extract dynamic classes
  const dynamicClasses = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach(s => {
      const cls = (s.kelas || '').trim();
      if (cls) set.add(cls);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeStudents]);

  // Set default selected class on mount / class list load
  useEffect(() => {
    if (!selectedClass && dynamicClasses.length > 0) {
      setSelectedClass(dynamicClasses[0]);
    }
  }, [dynamicClasses, selectedClass]);

  // Format rupiah helper
  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  // Compute detailed tunggakan items for a student
  const getStudentSuratData = (st: Student): SuratTagihanMuridData => {
    const summary = calculateStudentSppStatus(
      st,
      transactions,
      setting.tahun_ajaran || '2025/2026',
      new Date(),
      setting.spp_mulai_bulan,
      setting.spp_mulai_tahun
    );

    const items: Array<{
      jenis: string;
      periode: string;
      nominal: number;
      keterangan?: string;
    }> = [];

    // 1. Tunggakan SPP bulan berjalan yang sudah jatuh tempo & belum lunas
    if (summary.unpaidDueMonths && summary.unpaidDueMonths.length > 0) {
      summary.unpaidDueMonths.forEach(m => {
        // Jika filter bulan aktif, hanya sertakan jika bulan ini dipilih
        if (selectedFilterMonths.length > 0 && !selectedFilterMonths.includes(m.monthName)) {
          return;
        }
        const sisaNominal = m.sisa > 0 ? m.sisa : m.tagihan;
        items.push({
          jenis: 'SPP Bulanan',
          periode: m.label || `${m.monthName} ${m.year}`,
          nominal: sisaNominal,
          keterangan: m.status === 'KURANG' ? `Kekurangan pembayaran (Sudah bayar: ${formatRupiah(m.dibayar)})` : 'Belum dibayar'
        });
      });
    }

    // 2. Tunggakan Manual / Historis yang masih aktif (status 'KURANG')
    const historicalUnpaid = (summary.historicalTransactions || []).filter(t => t.status === 'KURANG');
    historicalUnpaid.forEach(t => {
      // Jika filter bulan aktif, hanya sertakan jika keterangan/bulan memuat salah satu bulan terpilih
      if (selectedFilterMonths.length > 0) {
        const tBulan = (t.bulan || '').toLowerCase();
        const matchesMonth = selectedFilterMonths.some(sm => tBulan.includes(sm.toLowerCase()));
        if (!matchesMonth) return;
      }
      const sisaNominal = t.sisa !== undefined && t.sisa !== null ? t.sisa : Math.max(0, (t.nominal_tagihan || 0) - (t.nominal_bayar || 0));
      // Tentukan nama jenis tagihan
      let cleanJenis = (t.jenis || '').trim();
      if (!cleanJenis || cleanJenis.toLowerCase().includes('tunggakan historis') || cleanJenis.toLowerCase().includes('tunggakan manual')) {
        cleanJenis = t.kategori || 'Tunggakan Khusus';
      }

      items.push({
        jenis: cleanJenis,
        periode: t.bulan || 'Lampau / Khusus',
        nominal: sisaNominal,
        keterangan: t.keterangan || (t.nominal_bayar > 0 ? `Kekurangan cicilan (Terbayar: ${formatRupiah(t.nominal_bayar)})` : undefined)
      });
    });

    // 3. Tunggakan non-SPP lainnya yang berstatus 'KURANG' (hanya bila filter bulan tidak aktif)
    if (selectedFilterMonths.length === 0) {
      const studentTrxs = transactions.filter(
        t => ((st.nisn && t.nisn === st.nisn) || (st.nik && t.nisn === st.nik)) && t.status === 'KURANG'
      );
      studentTrxs.forEach(t => {
        const isHistorical = (summary.historicalTransactions || []).some(h => h.id_transaksi === t.id_transaksi);
        const isSpp = (t.jenis || '').toLowerCase().includes('spp') || Boolean(t.bulan);
        if (!isHistorical && !isSpp) {
          const sisaNominal = t.sisa !== undefined && t.sisa !== null ? t.sisa : Math.max(0, (t.nominal_tagihan || 0) - (t.nominal_bayar || 0));
          items.push({
            jenis: t.jenis || 'Tagihan Lainnya',
            periode: t.tanggal || '-',
            nominal: sisaNominal,
            keterangan: t.keterangan
          });
        }
      });
    }

    const totalTunggakan = items.reduce((sum, item) => sum + item.nominal, 0);

    return {
      student: st,
      summary,
      tunggakanItems: items,
      totalTunggakan
    };
  };

  // Pre-calculate data for active students to show status in table
  const allSuratDataMap = useMemo(() => {
    const map = new Map<string, SuratTagihanMuridData>();
    activeStudents.forEach(st => {
      map.set(st.id_siswa, getStudentSuratData(st));
    });
    return map;
  }, [activeStudents, transactions, setting, selectedFilterMonths]);

  // Students list to display in table according to scopeMode and filters
  const displayedStudents = useMemo(() => {
    let list: Student[] = [];
    if (scopeMode === 'KELAS') {
      list = activeStudents.filter(s => s.kelas === selectedClass);
    } else {
      // MANUAL
      if (!searchManual.trim()) {
        list = activeStudents;
      } else {
        const q = searchManual.toLowerCase().trim();
        list = activeStudents.filter(s =>
          s.nama.toLowerCase().includes(q) ||
          (s.nisn || '').toLowerCase().includes(q) ||
          (s.kelas || '').toLowerCase().includes(q)
        );
      }
    }

    // PENYEMPURNAAN 1: Filter Otomatis "Hanya yang ada tunggakan"
    if (onlyWithArrears) {
      list = list.filter(st => {
        const data = allSuratDataMap.get(st.id_siswa);
        return data && data.totalTunggakan > 0;
      });
    }

    return list;
  }, [scopeMode, selectedClass, searchManual, activeStudents, onlyWithArrears, allSuratDataMap]);

  // Sinkronisasi otomatis checked murid saat kelas berubah atau filter toggle berubah
  useEffect(() => {
    if (scopeMode === 'KELAS' && selectedClass) {
      const classStudents = activeStudents.filter(s => s.kelas === selectedClass);
      const targetList = onlyWithArrears
        ? classStudents.filter(s => (allSuratDataMap.get(s.id_siswa)?.totalTunggakan || 0) > 0)
        : classStudents;
      setSelectedStudentIds(new Set(targetList.map(s => s.id_siswa)));
    } else if (scopeMode === 'MANUAL' && onlyWithArrears) {
      // Prune murid yang tidak ada tunggakan jika toggle aktif
      setSelectedStudentIds(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          const data = allSuratDataMap.get(id);
          if (data && data.totalTunggakan > 0) next.add(id);
        });
        return next;
      });
    }
  }, [scopeMode, selectedClass, onlyWithArrears, activeStudents, allSuratDataMap]);

  // PENYEMPURNAAN 3: Murid terpilih yang BENAR-BENAR akan dicetak harus merupakan irisan murid yang tercentang & lolos filter aktif
  const selectedStudentsToPrint = useMemo(() => {
    return displayedStudents.filter(s => selectedStudentIds.has(s.id_siswa));
  }, [displayedStudents, selectedStudentIds]);

  // Set default preview student
  useEffect(() => {
    if (selectedStudentsToPrint.length > 0 && (!previewStudentId || !selectedStudentIds.has(previewStudentId))) {
      setPreviewStudentId(selectedStudentsToPrint[0].id_siswa);
    }
  }, [selectedStudentsToPrint, previewStudentId, selectedStudentIds]);

  // Checkbox handlers
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllDisplayed = () => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      displayedStudents.forEach(s => next.add(s.id_siswa));
      return next;
    });
  };

  const handleDeselectAllDisplayed = () => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      displayedStudents.forEach(s => next.delete(s.id_siswa));
      return next;
    });
  };

  // Toggle filter hanya yang ada tunggakan
  const handleToggleOnlyWithArrears = (checked: boolean) => {
    setOnlyWithArrears(checked);
    setErrorMessage(null);
  };

  // Execution: trigger browser window.print() selaras dengan kuitansi individual
  const handlePrintBatch = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!students || students.length === 0) {
      setErrorMessage('Data murid belum dimuat atau masih kosong, mohon tunggu sebentar.');
      return;
    }

    if (selectedStudentsToPrint.length === 0) {
      setErrorMessage('Pilih minimal satu murid yang tercentang untuk dicetak surat tagihannya.');
      return;
    }

    // Pastikan rincian data surat sudah siap
    const hasIncompleteData = selectedStudentsToPrint.some(st => {
      const data = allSuratDataMap.get(st.id_siswa);
      return !data;
    });

    if (hasIncompleteData) {
      setErrorMessage('Data rincian tagihan murid sedang disiapkan, mohon tunggu 1 detik.');
      return;
    }

    setErrorMessage(null);

    // Otomatis majukan nomor surat berikutnya jika fitur penomoran aktif
    if (onUpdateSetting && setting.enable_nomor_surat !== false) {
      const nextNumber = (setting.nomor_surat_berikutnya ?? 1) + selectedStudentsToPrint.length;
      onUpdateSetting({
        ...setting,
        nomor_surat_berikutnya: nextNumber
      });
    }

    try {
      window.focus();
      window.print();
    } catch (printErr: any) {
      console.error('Error saat memanggil window.print():', printErr);
      setErrorMessage(
        `Dialog cetak tidak dapat dibuka otomatis (${printErr?.message || printErr}). Silakan gunakan pintasan keyboard Ctrl + P (atau Cmd + P di Mac) untuk mencetak atau menyimpan dokumen sebagai PDF.`
      );
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (!isOpen) return null;

  // Murid yang sedang dipratinjau di tab 'PRATINJAU'
  const previewStudent = activeStudents.find(s => s.id_siswa === previewStudentId) || selectedStudentsToPrint[0] || activeStudents[0];
  const previewSuratData = previewStudent ? (allSuratDataMap.get(previewStudent.id_siswa) || getStudentSuratData(previewStudent)) : null;

  // Gunakan createPortal ke document.body agar modal tampil paling atas di z-index tertinggi tanpa terpengaruh hierarki CSS parent
  return createPortal(
    <>
      {/* =========================================================================
          MODAL OVERLAY DIALOG UTAMA (Z-INDEX TERTINGGI & PENUTUP PENUH / NO PRINT)
          ========================================================================= */}
      <div 
        id="printable-surat-massal-modal" 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-hidden no-print print:hidden"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Modal */}
          <div className="bg-emerald-900 text-white px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-emerald-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                  Cetak Surat Tagihan Massal untuk Wali Murid
                </h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">
                  Format surat resmi 1 halaman penuh per murid &bull; Dilengkapi Kop Resmi, Rincian Tunggakan & TTD Sah
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader Navigation: Tab Daftar Murid vs Pratinjau Surat */}
          <div className="bg-slate-100 border-b border-slate-200 px-5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('DAFTAR')}
                className={`py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'DAFTAR'
                    ? 'border-emerald-800 text-emerald-900 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>Pilih Sasaran ({selectedStudentsToPrint.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PRATINJAU')}
                className={`py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'PRATINJAU'
                    ? 'border-emerald-800 text-emerald-900 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Pratinjau Lembar Surat</span>
              </button>
            </div>

            <div className="text-[11px] font-semibold text-slate-600 hidden sm:block">
              Tahun Ajaran: <strong className="text-slate-800">{setting.tahun_ajaran}</strong>
            </div>
          </div>

          {/* Error Banner jika ada kendala print / download */}
          {errorMessage && (
            <div className="mx-5 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start justify-between gap-2 animate-in fade-in duration-200 shrink-0">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Modal Body: TAB 1 - DAFTAR & PENGATURAN SASARAN */}
          {activeTab === 'DAFTAR' && (
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 grow">
              {/* 1. Pengaturan Cakupan Sasaran */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span>Pilih Cakupan Cetak Surat</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Opsi Satu Kelas */}
                  <button
                    type="button"
                    onClick={() => setScopeMode('KELAS')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      scopeMode === 'KELAS'
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <Building className={`w-5 h-5 mt-0.5 ${scopeMode === 'KELAS' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-slate-900">Per Satu Kelas Penuh</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Memuat otomatis semua murid di kelas terpilih (misal untuk diselipkan saat penerimaan rapor).
                      </p>
                    </div>
                  </button>

                  {/* Opsi Pilih Murid Manual */}
                  <button
                    type="button"
                    onClick={() => setScopeMode('MANUAL')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      scopeMode === 'MANUAL'
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <Users className={`w-5 h-5 mt-0.5 ${scopeMode === 'MANUAL' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-slate-900">Pilih Murid Bebas / Lintas Kelas</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Cari nama/NISN bebas dan centang murid-murid tertentu yang membutuhkan surat fisik.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Kontrol dinamis berdasarkan cakupan */}
                {scopeMode === 'KELAS' ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 shrink-0">Pilih Kelas:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {dynamicClasses.map(cls => {
                        const count = activeStudents.filter(s => s.kelas === cls).length;
                        return (
                          <option key={cls} value={cls}>
                            Kelas {cls} ({count} Murid)
                          </option>
                        );
                      })}
                    </select>
                    <span className="text-[11px] text-slate-500 italic">
                      Semua murid di kelas ini otomatis tercentang sesuai filter. Anda dapat membatalkan centang murid tertentu di tabel bawah.
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchManual}
                      onChange={(e) => setSearchManual(e.target.value)}
                      placeholder="Ketik nama murid, NISN, atau kelas untuk mencari..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 2. Daftar Murid & Status Tunggakan */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">2</span>
                      <span>Daftar Murid Sasaran</span>
                    </h4>
                    
                    {/* PENYEMPURNAAN 2: Ringkasan jumlah akurat mengikuti filter toggle */}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {selectedStudentsToPrint.length} dari {displayedStudents.length} murid tercentang
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Bulan Tunggakan Multi-Pilih */}
                    <div className="relative" ref={monthFilterRef}>
                      <button
                        type="button"
                        onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all border font-bold ${
                          selectedFilterMonths.length > 0
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-400 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Tunggakan Bulan Apa Saja yang Disertakan?"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-[11px]">
                          {selectedFilterMonths.length === 0
                            ? 'Bulan: Semua Bulan/Tahun'
                            : `Bulan: ${selectedFilterMonths.length} Bulan (${selectedFilterMonths.join(', ')})`}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>

                      {isMonthDropdownOpen && (
                        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2.5 animate-in fade-in zoom-in-95 duration-150">
                          <div className="text-[11px] font-bold text-slate-800 mb-2 px-1 flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span>Tunggakan Bulan Apa Saja?</span>
                            {selectedFilterMonths.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedFilterMonths([])}
                                className="text-[10px] text-emerald-700 hover:underline cursor-pointer font-bold"
                              >
                                Reset (Semua)
                              </button>
                            )}
                          </div>

                          {/* Opsi Semua Bulan / Tahun (Default) */}
                          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer font-bold text-xs text-slate-800 border-b border-slate-100 mb-1">
                            <input
                              type="checkbox"
                              checked={selectedFilterMonths.length === 0}
                              onChange={() => setSelectedFilterMonths([])}
                              className="rounded text-emerald-700 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Semua Bulan / Tahun (Default)</span>
                          </label>

                          {/* 12 Bulan Tahun Ajaran */}
                          <div className="max-h-48 overflow-y-auto space-y-0.5 pt-0.5">
                            {ACADEMIC_MONTHS.map(monthName => {
                              const isChecked = selectedFilterMonths.includes(monthName);
                              return (
                                <label
                                  key={monthName}
                                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedFilterMonths(prev => [...prev, monthName]);
                                      } else {
                                        setSelectedFilterMonths(prev => prev.filter(m => m !== monthName));
                                      }
                                    }}
                                    className="rounded text-emerald-700 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className={isChecked ? 'font-bold text-emerald-900' : ''}>
                                    {monthName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PENYEMPURNAAN 1: Filter Otomatis "Hanya yang ada tunggakan" */}
                    <label className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all border font-bold ${
                      onlyWithArrears
                        ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={onlyWithArrears}
                        onChange={(e) => handleToggleOnlyWithArrears(e.target.checked)}
                        className="rounded text-amber-700 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-[11px]">Hanya yang ada tunggakan</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSelectAllDisplayed}
                      className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Centang Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllDisplayed}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Kosongkan Centang
                    </button>
                  </div>
                </div>

                {/* Tabel Seleksi Murid */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-2.5 w-10 text-center">Pilih</th>
                          <th className="p-2.5 w-10 text-center">No</th>
                          <th className="p-2.5">Nama Murid & NISN</th>
                          <th className="p-2.5 w-24">Kelas</th>
                          <th className="p-2.5 w-32">Status Tagihan</th>
                          <th className="p-2.5 text-right w-36">Total Tunggakan</th>
                          <th className="p-2.5 text-center w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {displayedStudents.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              {onlyWithArrears
                                ? 'Alhamdulillah, tidak ada murid yang memiliki tunggakan pada kriteria ini (Semua Lunas).'
                                : 'Tidak ada murid yang sesuai dengan filter atau kata kunci.'}
                            </td>
                          </tr>
                        ) : (
                          displayedStudents.map((st, idx) => {
                            const isSelected = selectedStudentIds.has(st.id_siswa);
                            const stData = allSuratDataMap.get(st.id_siswa);
                            const totalTunggakan = stData ? stData.totalTunggakan : 0;
                            const hasTunggakan = totalTunggakan > 0;

                            return (
                              <tr
                                key={st.id_siswa}
                                className={`hover:bg-slate-50 transition-colors ${
                                  !isSelected ? 'opacity-50 bg-slate-50/50' : hasTunggakan ? 'bg-amber-50/20' : ''
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleStudent(st.id_siswa)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900">{st.nama}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    NISN: {st.nisn || '-'} &bull; Wali: {st.nama_wali || '-'}
                                  </div>
                                </td>
                                <td className="p-2.5 font-semibold text-slate-700">{st.kelas}</td>
                                <td className="p-2.5">
                                  {hasTunggakan ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <AlertCircle className="w-2.5 h-2.5" /> Ada Tunggakan
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Lunas / Nihil
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold">
                                  {hasTunggakan ? (
                                    <span className="text-amber-900">{formatRupiah(totalTunggakan)}</span>
                                  ) : (
                                    <span className="text-emerald-700 font-medium">Rp 0 (Lunas)</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewStudentId(st.id_siswa);
                                      setActiveTab('PRATINJAU');
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Lihat Pratinjau Surat Murid Ini"
                                  >
                                    Pratinjau
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Informasi Format Surat */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                <Building className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Ketentuan Lembar Surat Tagihan:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-emerald-800">
                    <li>Setiap murid yang dicentang akan otomatis dibuatkan <strong>1 halaman surat terpisah (A4)</strong> lengkap dengan KOP resmi dan rincian seluruh tagihan aktif.</li>
                    <li>Surat menggabungkan tunggakan SPP berjalan serta tunggakan khusus (buku, seragam, gedung, iuran kegiatan).</li>
                    <li>Surat hanya ditandatangani sah oleh <strong>Bendahara Sekolah ({setting.nama_bendahara})</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Modal Body: TAB 2 - PRATINJAU SURAT DI LAYAR */}
          {activeTab === 'PRATINJAU' && (
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 grow bg-slate-100/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-800">Pilih Murid yang Dipratinjau:</label>
                  <select
                    value={previewStudentId}
                    onChange={(e) => setPreviewStudentId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 max-w-xs"
                  >
                    {displayedStudents.map(st => (
                      <option key={st.id_siswa} value={st.id_siswa}>
                        {st.nama} ({st.kelas}) {selectedStudentIds.has(st.id_siswa) ? '✓ Tercentang' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-slate-500">
                  Pratinjau tampilan 1 halaman A4 sebelum dicetak fisik ke printer
                </div>
              </div>

              {/* Preview Sheet Card */}
              {previewStudent && previewSuratData ? (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 max-w-3xl mx-auto text-slate-900 relative overflow-hidden">
                  {/* WATERMARK LOGO SEKOLAH (Transparan di Latar Belakang) */}
                  <div className="watermark-bg pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0">
                    {setting.logo ? (
                      <img
                        src={setting.logo}
                        alt=""
                        className="w-72 h-72 object-contain opacity-[0.08] grayscale contrast-125 filter"
                        style={{ opacity: 0.08 }}
                      />
                    ) : (
                      <div className="text-8xl font-bold font-arabic select-none text-slate-900" style={{ opacity: 0.06 }}>
                        الإعتصام
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    {/* KOP SURAT */}
                  <div className="flex items-center border-b-4 border-double border-emerald-800 pb-3 mb-5">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-emerald-50 rounded-lg border border-emerald-200 mr-4">
                      {setting.logo ? (
                        <img
                          src={setting.logo}
                          alt="Logo Sekolah"
                          className="max-h-14 max-w-14 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-emerald-800 font-bold text-center font-arabic text-lg">الإعتصام</div>
                      )}
                    </div>
                    <div className="grow text-center">
                      <h4 className="text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
                        YAYASAN AL-I'TISHAM PLAYEN GUNUNGKIDUL
                      </h4>
                      <h1 className="text-base sm:text-lg font-extrabold text-emerald-900 uppercase tracking-wide">
                        {setting.nama_sekolah}
                      </h1>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                        {setting.alamat}
                      </p>
                      <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                        NPSN: 69987123 | Terakreditasi A | Kontak WhatsApp: {setting.no_wa}
                      </p>
                    </div>
                  </div>

                  {/* JUDUL */}
                  <div className="text-center mb-4">
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide underline underline-offset-4">
                      SURAT PEMBERITAHUAN TAGIHAN PEMBAYARAN
                    </h2>
                    {setting.enable_nomor_surat !== false && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Nomor: {(setting.format_awalan_surat || '')}{String((setting.nomor_surat_berikutnya ?? 1) + Math.max(0, selectedStudentsToPrint.findIndex(s => s.id_siswa === previewStudent.id_siswa))).padStart(3, '0')}
                      </p>
                    )}
                  </div>

                  {/* TUJUAN */}
                  <div className="mb-4 text-xs leading-relaxed">
                    <p className="text-slate-800 mb-1">
                      Kepada Yth.<br />
                      <strong>Bapak / Ibu Wali dari Ananda {previewStudent.nama}</strong><br />
                      di Tempat
                    </p>
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg grid grid-cols-2 gap-2 text-[10px] mt-1.5">
                      <div><span className="text-slate-500">Nama Murid:</span> <strong>{previewStudent.nama}</strong></div>
                      <div><span className="text-slate-500">Kelas / Tingkat:</span> <strong>{previewStudent.kelas}</strong></div>
                      <div><span className="text-slate-500">NISN:</span> <strong className="font-mono">{previewStudent.nisn || '-'}</strong></div>
                      <div><span className="text-slate-500">Tahun Ajaran:</span> <strong>{setting.tahun_ajaran}</strong></div>
                    </div>
                  </div>

                  {/* PEMBUKA */}
                  <div className="text-xs text-slate-800 mb-3 leading-relaxed">
                    <p className="mb-1.5"><em>Assalamu’alaikum Warahmatullahi Wabarakatuh,</em></p>
                    <p className="text-[11px]">
                      Semoga Bapak/Ibu wali murid senantiasa dalam limpahan taufiq dan kesehatan dari Allah SWT. 
                      Sehubungan dengan tertib administrasi keuangan sekolah dan evaluasi berkala kegiatan belajar mengajar ananda di <strong>{setting.nama_sekolah}</strong>, 
                      bersama surat ini kami sampaikan rincian kewajiban administrasi pendidikan ananda sebagai berikut:
                    </p>
                  </div>

                  {/* TABEL / KARTU LUNAS */}
                  {previewSuratData.totalTunggakan > 0 ? (
                    <div className="mb-4">
                      <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                        <thead className="bg-emerald-800 text-white font-bold text-[11px]">
                          <tr>
                            <th className="border border-slate-300 p-2 text-center w-8">No</th>
                            <th className="border border-slate-300 p-2">Jenis Kewajiban / Tagihan</th>
                            <th className="border border-slate-300 p-2 w-32">Periode / Keterangan</th>
                            <th className="border border-slate-300 p-2 text-right w-32">Nominal Tunggakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {previewSuratData.tunggakanItems.map((item, iIdx) => (
                            <tr key={iIdx}>
                              <td className="border border-slate-300 p-2 text-center font-mono">{iIdx + 1}</td>
                              <td className="border border-slate-300 p-2">
                                <div className="font-bold text-slate-900">{item.jenis}</div>
                                {item.keterangan && <div className="text-[10px] text-slate-500 italic mt-0.5">{item.keterangan}</div>}
                              </td>
                              <td className="border border-slate-300 p-2 text-slate-700">{item.periode}</td>
                              <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                                {formatRupiah(item.nominal)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                            <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase tracking-wider text-[10px]">
                              TOTAL KESELURUHAN YANG HARUS DIBAYAR:
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-mono text-emerald-950 font-bold">
                              {formatRupiah(previewSuratData.totalTunggakan)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="my-4 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 text-emerald-950 text-center space-y-1.5">
                      <div className="inline-flex p-1.5 bg-emerald-100 rounded-full text-emerald-800">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-extrabold tracking-wide uppercase text-emerald-900">
                        Status Kewajiban: Lunas Sepenuhnya
                      </h3>
                      <p className="text-[11px] text-emerald-800 max-w-md mx-auto leading-relaxed">
                        <em>Alhamdulillah</em>, seluruh kewajiban administrasi pembayaran ananda tercatat <strong>LUNAS</strong>. 
                        Jazakumullahu khairan katsiran atas kedisiplinan dan amanah Bapak/Ibu.
                      </p>
                    </div>
                  )}

                  {/* PENUTUP */}
                  <div className="text-[11px] text-slate-800 mb-3 leading-relaxed">
                    <p className="mb-1.5">
                      Dukungan dan kedisiplinan Bapak/Ibu wali murid merupakan pilar utama kelancaran operasional pendidikan ananda. 
                      Kami memohon kesediaan Bapak/Ibu untuk berkenan menyelesaikan kewajiban tersebut dalam waktu dekat.
                    </p>
                    <p>
                      Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.<br />
                      <em>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</em>
                    </p>
                  </div>

                  {/* INFORMASI PEMBAYARAN */}
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] mb-4">
                    <div className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[9px]">
                      Informasi Saluran Pembayaran Resmi:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        Bank: <strong>{setting.nama_bank || 'BSI'}</strong> &bull; Rekening: <strong className="font-mono text-emerald-900">{setting.no_rekening || '-'}</strong>
                        <div className="text-slate-500">a.n {setting.atas_nama_rekening || setting.nama_sekolah}</div>
                      </div>
                      <div>
                        Konfirmasi / WhatsApp: <strong className="font-mono text-emerald-900">{setting.no_wa}</strong>
                        <div className="text-slate-500">Bendahara: {setting.nama_bendahara}</div>
                      </div>
                    </div>
                  </div>

                  {/* TANDA TANGAN BENDAHARA */}
                  <div className="flex justify-end text-xs text-center">
                    <div className="w-56">
                      <p className="text-slate-600 mb-0.5 text-[11px]">Playen, {currentDateFormatted}</p>
                      <p className="font-bold text-slate-800 text-xs">Bendahara Sekolah</p>
                      <div className="h-12 flex items-center justify-center">
                        <span className="text-[9px] text-slate-300 italic">[Tanda Tangan & Cap Sah]</span>
                      </div>
                      <p className="font-bold text-slate-900 underline text-xs">{setting.nama_bendahara}</p>
                      {setting.nipy_bendahara && setting.nipy_bendahara.trim() ? (
                        <p className="text-[9px] text-slate-500 font-mono">NIPY. {setting.nipy_bendahara.trim()}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              ) : null}
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
              Total Tercentang Siap Cetak:{' '}
              <strong className="text-slate-900 text-sm font-bold">
                {selectedStudentsToPrint.length} Halaman Surat
              </strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer text-xs"
              >
                Tutup
              </button>

              {/* Tombol Utama: Cetak / Simpan PDF */}
              <div className="flex flex-col items-end sm:items-start gap-1">
                <button
                  type="button"
                  disabled={selectedStudentsToPrint.length === 0}
                  onClick={handlePrintBatch}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  title="Buka jendela cetak atau Simpan sebagai PDF"
                >
                  <Printer className="w-4 h-4 text-emerald-200" />
                  <span>
                    Cetak / Simpan PDF ({selectedStudentsToPrint.length} Murid)
                  </span>
                </button>
                <span className="text-[10px] text-slate-500 max-w-xs text-right sm:text-left leading-tight">
                  Gunakan pilihan 'Simpan sebagai PDF' pada jendela cetak untuk mengunduh sebagai file PDF
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ELEMEN CETAK DOKUMEN BATCH (TERSEMBUNYI DARI TAMPILAN LAYAR & HANYA MUNCUL
          SAAT DIALOG CETAK / SIMPAN PDF BROWSER AKTIF)
          ========================================================================= */}
      <div 
        id="printable-surat-massal" 
        className="hidden print:block print:w-full print:p-0 print:m-0"
      >
        {selectedStudentsToPrint.map((st, studentIndex) => {
          const suratData = allSuratDataMap.get(st.id_siswa) || getStudentSuratData(st);
          const hasArrears = suratData.totalTunggakan > 0;
          const isLastStudent = studentIndex === selectedStudentsToPrint.length - 1;

          return (
            <div
              key={st.id_siswa}
              className={`p-6 sm:p-8 bg-white text-slate-900 relative overflow-hidden print-break-inside-avoid ${
                !isLastStudent ? 'print-page-break' : ''
              }`}
            >
              {/* WATERMARK LOGO SEKOLAH (Transparan di Latar Belakang Setiap Lembar) */}
              <div className="watermark-bg pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0">
                {setting.logo ? (
                  <img
                    src={setting.logo}
                    alt=""
                    className="w-80 h-80 object-contain opacity-[0.08] grayscale contrast-125 filter"
                    style={{ opacity: 0.08 }}
                  />
                ) : (
                  <div className="text-9xl font-bold font-arabic select-none text-slate-900" style={{ opacity: 0.06 }}>
                    الإعتصام
                  </div>
                )}
              </div>

              <div className="relative z-10">
                {/* KOP SURAT RESMI */}
              <div className="flex items-center border-b-4 border-double border-emerald-800 pb-3 mb-5">
                <div className="w-20 h-20 shrink-0 flex items-center justify-center p-1 bg-emerald-50 rounded-lg border border-emerald-200 mr-4">
                  {setting.logo ? (
                    <img
                      src={setting.logo}
                      alt="Logo Sekolah"
                      className="max-h-16 max-w-16 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-emerald-800 font-bold text-center font-arabic text-xl">الإعتصام</div>
                  )}
                </div>
                <div className="grow text-center">
                  <h4 className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
                    YAYASAN AL-I'TISHAM PLAYEN GUNUNGKIDUL
                  </h4>
                  <h1 className="text-lg sm:text-xl font-extrabold text-emerald-900 uppercase tracking-wide">
                    {setting.nama_sekolah}
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-relaxed">
                    {setting.alamat}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    NPSN: 69987123 | Terakreditasi A | Kontak WhatsApp: {setting.no_wa}
                  </p>
                </div>
              </div>

              {/* JUDUL SURAT RESMI */}
              <div className="text-center mb-5">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide underline underline-offset-4">
                  SURAT PEMBERITAHUAN TAGIHAN PEMBAYARAN
                </h2>
                {setting.enable_nomor_surat !== false && (
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Nomor: {(setting.format_awalan_surat || '')}{String((setting.nomor_surat_berikutnya ?? 1) + studentIndex).padStart(3, '0')}
                  </p>
                )}
              </div>

              {/* SALAM & IDENTITAS TUJUAN */}
              <div className="mb-4 text-xs leading-relaxed">
                <p className="text-slate-800 mb-1.5">
                  Kepada Yth.<br />
                  <strong>Bapak / Ibu Wali dari Ananda {st.nama}</strong><br />
                  di Tempat
                </p>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg grid grid-cols-2 gap-2 text-[11px] mt-2">
                  <div>
                    <span className="text-slate-500">Nama Murid:</span> <strong>{st.nama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Kelas / Tingkat:</span> <strong>{st.kelas}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">NISN:</span> <strong className="font-mono">{st.nisn || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tahun Ajaran:</span> <strong>{setting.tahun_ajaran}</strong>
                  </div>
                </div>
              </div>

              {/* PARAGRAF PEMBUKA */}
              <div className="text-xs text-slate-800 mb-3 leading-relaxed">
                <p className="mb-2">
                  <em>Assalamu’alaikum Warahmatullahi Wabarakatuh,</em>
                </p>
                {hasArrears ? (
                  <p>
                    Semoga Bapak/Ibu wali murid senantiasa dalam limpahan taufiq dan kesehatan dari Allah SWT. 
                    Sehubungan dengan tertib administrasi keuangan sekolah dan evaluasi berkala kegiatan belajar mengajar ananda di <strong>{setting.nama_sekolah}</strong>, 
                    bersama surat ini kami sampaikan rincian kewajiban administrasi pendidikan ananda yang saat ini masih tercatat belum terselesaikan sebagai berikut:
                  </p>
                ) : (
                  <p>
                    Semoga Bapak/Ibu wali murid senantiasa dalam limpahan taufiq dan kesehatan dari Allah SWT. 
                    Sehubungan dengan tertib administrasi keuangan sekolah pada <strong>{setting.nama_sekolah}</strong>, 
                    kami menyampaikan laporan status kewajiban administrasi pendidikan ananda tercinta:
                  </p>
                )}
              </div>

              {/* KONTEN UTAMA: TABEL TUNGGAKAN ATAU PESAN LUNAS */}
              {hasArrears ? (
                <div className="mb-4">
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead className="bg-emerald-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">No</th>
                        <th className="border border-slate-300 p-2">Jenis Kewajiban / Tagihan</th>
                        <th className="border border-slate-300 p-2 w-36">Periode / Keterangan</th>
                        <th className="border border-slate-300 p-2 text-right w-36">Nominal Tunggakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {suratData.tunggakanItems.map((item, iIdx) => (
                        <tr key={iIdx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2 text-center font-mono">{iIdx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{item.jenis}</div>
                            {item.keterangan && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">{item.keterangan}</div>
                            )}
                          </td>
                          <td className="border border-slate-300 p-2 font-medium text-slate-700">{item.periode}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.nominal)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                        <td colSpan={3} className="border border-slate-300 p-2.5 text-right uppercase tracking-wider">
                          TOTAL KESELURUHAN YANG HARUS DIBAYAR:
                        </td>
                        <td className="border border-slate-300 p-2.5 text-right font-mono text-emerald-950 text-sm">
                          {formatRupiah(suratData.totalTunggakan)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ALTERNATIF POSITIF: SEMUA LUNAS */
                <div className="my-6 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 text-emerald-950 text-center space-y-2">
                  <div className="inline-flex p-2 bg-emerald-100 rounded-full text-emerald-800">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold tracking-wide uppercase text-emerald-900">
                    Status Kewajiban: Lunas Sepenuhnya
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
                    <em>Alhamdulillah</em>, seluruh kewajiban administrasi pembayaran ananda tercatat <strong>LUNAS</strong>. 
                    Jazakumullahu khairan katsiran atas kedisiplinan dan amanah Bapak/Ibu dalam mendukung pendidikan ananda tercinta.
                  </p>
                </div>
              )}

              {/* MOTIVASI & PENUTUP */}
              <div className="text-xs text-slate-800 mb-4 leading-relaxed">
                {hasArrears ? (
                  <p className="mb-2">
                    Dukungan dan kedisiplinan Bapak/Ibu wali murid merupakan pilar utama kelancaran operasional kegiatan belajar mengajar serta fasilitas terbaik bagi ananda. 
                    Oleh karena itu, kami memohon kesediaan Bapak/Ibu untuk berkenan menyelesaikan kewajiban tersebut dalam waktu dekat.
                  </p>
                ) : (
                  <p className="mb-2">
                    Semoga Allah SWT senantiasa melimpahkan keberkahan rezeki kepada keluarga Bapak/Ibu serta menjadikan ananda generasi Qur'ani yang berakhlak mulia dan membanggakan umat.
                  </p>
                )}
                <p>
                  Atas perhatian, kerjasama, dan dukungan penuh Bapak/Ibu, kami ucapkan terima kasih.<br />
                  <em>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</em>
                </p>
              </div>

              {/* INFORMASI PEMBAYARAN & KONTAK RESMI */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] mb-5">
                <div className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[10px]">
                  Informasi Saluran Pembayaran Resmi:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    {setting.nama_bank && setting.no_rekening ? (
                      <div>
                        Bank: <strong>{setting.nama_bank}</strong> &bull; No. Rekening:{' '}
                        <strong className="font-mono text-emerald-900">{setting.no_rekening}</strong>
                        <div className="text-[10px] text-slate-500">a.n {setting.atas_nama_rekening || setting.nama_sekolah}</div>
                      </div>
                    ) : (
                      <div>Pembayaran tunai langsung melalui loket Bendahara Sekolah.</div>
                    )}
                  </div>
                  <div>
                    Konfirmasi Bukti Transfer / WhatsApp:{' '}
                    <strong className="font-mono text-emerald-900">{setting.no_wa}</strong>
                    <div className="text-[10px] text-slate-500">Petugas Keuangan: {setting.nama_bendahara}</div>
                  </div>
                </div>
              </div>

              {/* KOLOM TANDA TANGAN (HANYA BENDAHARA RESMI) */}
              <div className="print-break-inside-avoid pt-2 flex justify-end text-xs text-center">
                <div className="w-64">
                  <p className="text-slate-600 mb-1">Playen, {currentDateFormatted}</p>
                  <p className="font-bold text-slate-800">Bendahara Sekolah</p>
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] text-slate-300 italic">[Tanda Tangan & Cap Sah]</span>
                  </div>
                  <p className="font-bold text-slate-900 underline">{setting.nama_bendahara}</p>
                  {setting.nipy_bendahara && setting.nipy_bendahara.trim() ? (
                    <p className="text-[10px] text-slate-500">NIPY. {setting.nipy_bendahara.trim()}</p>
                  ) : null}
                </div>
              </div>

              {/* FOOTER KECIL */}
              <div className="mt-6 pt-2 border-t border-dotted border-slate-300 flex justify-between items-center text-[9px] text-slate-400">
                <div>Surat Pemberitahuan Resmi &bull; SD Qur'an Unggulan Al-I'tisham Playen Gunungkidul</div>
                <div className="font-mono">Dicetak pada: {currentDateFormatted}</div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </>,
    document.body
  );
};
