import React, { useState, useMemo, useEffect } from 'react';
import { Student, Transaction, SchoolSetting } from '../../types';
import {
  X,
  History,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  DollarSign,
  ArrowRight,
  Check,
  Calendar,
  FileText,
  Star
} from 'lucide-react';
import { INDONESIAN_MONTHS } from '../../utils/sppLogic';

interface CatatTunggakanManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  initialScope?: 'MURID' | 'KELAS' | 'SEMUA';
  operatorName?: string;
  setting: SchoolSetting;
  existingTransactions?: Transaction[];
  onSaveBatch: (
    records: Array<{
      nisn: string;
      nama_siswa: string;
      kelas: string;
      jenis: string;
      kategori?: string;
      bulan?: string;
      nominal: number;
      keterangan?: string;
    }>
  ) => Promise<any>;
}

interface StudentRowItem {
  student: Student;
  nominal: number;
  included: boolean;
}

const COMMON_SUGGESTIONS = [
  'Buku Paket',
  'Iuran Wisuda',
  'Seragam & Atribut',
  'SPP Lampau',
  'Uang Gedung',
  'Uang Pangkal',
  'Kegiatan Santri',
  'Ekstrakurikuler'
];

export const CatatTunggakanManualModal: React.FC<CatatTunggakanManualModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  initialScope = 'MURID',
  operatorName = 'Bendahara',
  setting,
  existingTransactions = [],
  onSaveBatch
}) => {
  // 1. Jenis Tunggakan & Autocomplete State
  const [jenisTunggakan, setJenisTunggakan] = useState<string>('Buku Paket');
  const [catatan, setCatatan] = useState<string>('');

  // Periode State
  const [bulanTunggakan, setBulanTunggakan] = useState<string>(
    INDONESIAN_MONTHS[new Date().getMonth()] || 'Januari'
  );
  const [tahunTunggakan, setTahunTunggakan] = useState<number>(new Date().getFullYear());
  const [useCustomPeriode, setUseCustomPeriode] = useState<boolean>(false);
  const [customPeriodeText, setCustomPeriodeText] = useState<string>('');

  // 2. Scope State: 'MURID' | 'KELAS' | 'SEMUA'
  const [scope, setScope] = useState<'MURID' | 'KELAS' | 'SEMUA'>(
    initialStudent ? 'MURID' : initialScope
  );
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // 3. Nominal State & Items
  const defaultNominal = setting.spp_default_nominal || 150000;
  const [nominalDefaultInput, setNominalDefaultInput] = useState<number>(defaultNominal);
  const [items, setItems] = useState<StudentRowItem[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');

  // 4. Confirmation View State
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
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

  // Extract suggestion types from existing transactions
  const dynamicSuggestions = useMemo(() => {
    const types = new Set<string>(COMMON_SUGGESTIONS);
    (existingTransactions || []).forEach(t => {
      if (t.jenis && t.jenis.trim() && !t.jenis.toLowerCase().includes('spp bulanan')) {
        types.add(t.jenis.trim());
      }
    });
    return Array.from(types).slice(0, 10);
  }, [existingTransactions]);

  // Initial class selection
  useEffect(() => {
    if (dynamicClasses.length > 0 && !selectedClass) {
      if (initialStudent?.kelas) {
        setSelectedClass(initialStudent.kelas);
      } else {
        setSelectedClass(dynamicClasses[0]);
      }
    }
  }, [dynamicClasses, initialStudent, selectedClass]);

  // Reset table search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTableSearch('');
    }
  }, [isOpen]);

  const prevScopeRef = React.useRef<string>(scope);
  const prevClassRef = React.useRef<string>(selectedClass);
  const prevIsOpenRef = React.useRef<boolean>(isOpen);

  // Initialize or update items when scope or target selection changes
  useEffect(() => {
    if (!isOpen) return;

    const isScopeChanged = prevScopeRef.current !== scope;
    const isClassChanged = prevClassRef.current !== selectedClass;
    const isJustOpened = !prevIsOpenRef.current && isOpen;

    prevScopeRef.current = scope;
    prevClassRef.current = selectedClass;
    prevIsOpenRef.current = isOpen;

    if (scope === 'MURID') {
      setItems(prevItems => {
        return activeStudents.map(s => {
          const isInitial = initialStudent ? s.id_siswa === initialStudent.id_siswa : false;
          const existing = prevItems.find(i => i.student.id_siswa === s.id_siswa);
          const shouldBeIncluded = (isScopeChanged || isJustOpened)
            ? isInitial
            : (existing ? existing.included : isInitial);
          return {
            student: s,
            nominal: existing ? existing.nominal : nominalDefaultInput,
            included: shouldBeIncluded
          };
        });
      });
    } else if (scope === 'KELAS') {
      if (selectedClass) {
        const classStudents = activeStudents.filter(
          s => (s.kelas || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
        );
        setItems(prevItems => {
          return classStudents.map(s => {
            const existing = prevItems.find(i => i.student.id_siswa === s.id_siswa);
            const shouldBeIncluded = (isScopeChanged || isClassChanged || isJustOpened)
              ? true
              : (existing ? existing.included : true);
            return {
              student: s,
              nominal: existing ? existing.nominal : nominalDefaultInput,
              included: shouldBeIncluded
            };
          });
        });
      }
    } else if (scope === 'SEMUA') {
      setItems(prevItems => {
        return activeStudents.map(s => {
          const existing = prevItems.find(i => i.student.id_siswa === s.id_siswa);
          const shouldBeIncluded = (isScopeChanged || isJustOpened)
            ? true
            : (existing ? existing.included : true);
          return {
            student: s,
            nominal: existing ? existing.nominal : nominalDefaultInput,
            included: shouldBeIncluded
          };
        });
      });
    }
  }, [scope, selectedClass, isOpen, activeStudents, initialStudent, nominalDefaultInput]);

  // Apply default nominal to all currently included rows
  const handleApplyDefaultNominal = () => {
    if (nominalDefaultInput < 0) return;
    setItems(prev => prev.map(item => ({
      ...item,
      nominal: item.included ? nominalDefaultInput : item.nominal
    })));
  };

  // Toggle student selection in 'MURID' scope
  const handleToggleSpecificStudent = (student: Student) => {
    handleToggleIncludeItem(student.id_siswa);
  };

  // Update nominal for a specific student
  const handleUpdateItemNominal = (studentId: string, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.student.id_siswa === studentId) {
        return { ...item, nominal: Math.max(0, value) };
      }
      return item;
    }));
  };

  // Toggle included status for a student row
  const handleToggleIncludeItem = (studentId: string) => {
    setItems(prev => prev.map(item => {
      if (item.student.id_siswa === studentId) {
        return { ...item, included: !item.included };
      }
      return item;
    }));
  };

  // Filtered student list for search in 'MURID' mode
  const searchFilteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return activeStudents.slice(0, 15);
    const q = studentSearch.toLowerCase();
    return activeStudents.filter(
      s =>
        s.nama.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        (s.kelas || '').toLowerCase().includes(q) ||
        (s.nik || '').toLowerCase().includes(q)
    );
  }, [activeStudents, studentSearch]);

  // Filtered items in Section 3 Table (Pencarian Rincian Murid & Nominal)
  const displayedItems = useMemo(() => {
    if (!tableSearch.trim()) return items;
    const q = tableSearch.toLowerCase().trim();
    return items.filter(
      item =>
        item.student.nama.toLowerCase().includes(q) ||
        (item.student.nisn || '').toLowerCase().includes(q) ||
        (item.student.kelas || '').toLowerCase().includes(q)
    );
  }, [items, tableSearch]);

  // Final effective period string
  const effectivePeriode = useCustomPeriode
    ? (customPeriodeText.trim() || `${bulanTunggakan} ${tahunTunggakan}`)
    : `${bulanTunggakan} ${tahunTunggakan}`;

  // Included items ready to be recorded
  const includedItems = useMemo(() => {
    return items.filter(item => item.included && item.nominal > 0);
  }, [items]);

  const totalAkumulasiNominal = useMemo(() => {
    return includedItems.reduce((sum, item) => sum + item.nominal, 0);
  }, [includedItems]);

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  // Validation before confirmation
  const handleProceedToConfirmation = () => {
    setErrorMessage(null);
    if (!jenisTunggakan.trim()) {
      setErrorMessage('Harap isi atau pilih Nama Jenis Tunggakan.');
      return;
    }
    if (includedItems.length === 0) {
      setErrorMessage('Harap pilih minimal 1 murid dengan nominal lebih dari Rp 0.');
      return;
    }
    setShowConfirmation(true);
  };

  // Final execution of batch recording
  const handleExecuteSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const records = includedItems.map(item => ({
        nisn: item.student.nisn,
        nama_siswa: item.student.nama,
        kelas: item.student.kelas,
        jenis: jenisTunggakan.trim(),
        kategori: 'SPP',
        bulan: effectivePeriode,
        nominal: item.nominal,
        keterangan: catatan.trim() ? catatan.trim() : undefined
      }));

      await onSaveBatch(records);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setShowConfirmation(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyimpan catatan tunggakan manual. Coba lagi.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-amber-700 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-800/80 text-amber-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Catat Tunggakan Manual / Khusus
              </h3>
              <p className="text-[11px] text-amber-200">
                Pencatatan tunggakan dengan cakupan fleksibel & nominal dapat diedit per santri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grow space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!showConfirmation ? (
            <>
              {/* BAGIAN 1: JENIS TUNGGAKAN & PERIODE */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>1. Jenis Tunggakan & Periode Waktu</span>
                </div>

                {/* Input Jenis Tunggakan Bebas + Autocomplete Suggestions */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis Tunggakan (Ketik Bebas atau Pilih Rekomendasi) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={jenisTunggakan}
                      onChange={(e) => setJenisTunggakan(e.target.value)}
                      placeholder="Contoh: Buku Paket Kelas 3, Iuran Wisuda, Seragam, dll..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 text-sm"
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-500 font-medium">Saran Cepat:</span>
                    {dynamicSuggestions.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setJenisTunggakan(sug)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                          jenisTunggakan.toLowerCase() === sug.toLowerCase()
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Periode & Keterangan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Periode / Bulan & Tahun</span>
                      <button
                        type="button"
                        onClick={() => setUseCustomPeriode(!useCustomPeriode)}
                        className="text-[10px] text-amber-700 hover:underline cursor-pointer"
                      >
                        {useCustomPeriode ? 'Pilih Bulan/Tahun' : 'Ketik Teks Kustom'}
                      </button>
                    </label>

                    {useCustomPeriode ? (
                      <input
                        type="text"
                        value={customPeriodeText}
                        onChange={(e) => setCustomPeriodeText(e.target.value)}
                        placeholder="Contoh: TA 2025/2026 atau Semester 1"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={bulanTunggakan}
                          onChange={(e) => setBulanTunggakan(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                        >
                          {INDONESIAN_MONTHS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={tahunTunggakan}
                          onChange={(e) => setTahunTunggakan(Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Contoh: Paket 4 Buku Tematik & LKS"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: PILIHAN CAKUPAN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>2. Pilihan Cakupan Sasaran</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScope('MURID')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scope === 'MURID'
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/40'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span>Murid Tertentu</span>
                      {scope === 'MURID' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pilih satu atau beberapa murid spesifik (misal buku yang hanya dibeli sebagian anak)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('KELAS')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scope === 'KELAS'
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/40'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span>Satu Kelas Penuh</span>
                      {scope === 'KELAS' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Otomatis terapkan ke seluruh murid di kelas yang dipilih
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('SEMUA')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scope === 'SEMUA'
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/40'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span>Semua Murid</span>
                      {scope === 'SEMUA' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Otomatis terapkan ke seluruh {activeStudents.length} murid aktif di sistem
                    </p>
                  </button>
                </div>

                {/* Sub-selector sesuai Scope */}
                {scope === 'KELAS' && (
                  <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <label className="font-bold text-slate-700 shrink-0">Pilih Kelas:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-amber-900 text-xs focus:ring-2 focus:ring-amber-500 grow max-w-xs"
                    >
                      {dynamicClasses.map(c => (
                        <option key={c} value={c}>
                          Kelas {c} ({activeStudents.filter(s => (s.kelas || '').trim().toLowerCase() === c.trim().toLowerCase()).length} santri)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === 'MURID' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-700">Pilih Santri Sasaran:</span>
                      <span className="text-[11px] font-bold text-amber-800">
                        {items.filter(i => i.included).length} santri dipilih
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Cari nama santri, NISN, atau kelas..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                      {searchFilteredStudents.length === 0 ? (
                        <div className="p-3 text-center text-slate-400">Tidak ada data santri</div>
                      ) : (
                        searchFilteredStudents.map(st => {
                          const isSelected = items.some(i => i.student.id_siswa === st.id_siswa && i.included);
                          return (
                            <div
                              key={st.id_siswa}
                              onClick={() => handleToggleSpecificStudent(st)}
                              className={`p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-50/60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by parent onClick
                                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{st.nama}</div>
                                  <div className="text-[10px] text-slate-500">
                                    NISN: {st.nisn} &bull; Kelas: {st.kelas}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {isSelected ? 'Terpilih' : '+ Pilih'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BAGIAN 3: TABEL DAFTAR MURID DENGAN NOMINAL PER-MURID */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span>3. Rincian Murid & Nominal (Dapat Diedit Per Santri)</span>
                  </div>

                  {/* Input Nominal Default & Tombol Terapkan */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-600 font-semibold">Nominal Default:</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={nominalDefaultInput}
                      onChange={(e) => setNominalDefaultInput(Number(e.target.value))}
                      className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDefaultNominal}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="Terapkan nominal default ini ke semua baris di tabel bawah"
                    >
                      Terapkan ke Semua
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Gunakan kolom <strong>Nominal Tunggakan</strong> pada tabel di bawah untuk menyesuaikan harga per-anak jika ada murid yang mendapat nominal berbeda (diskon/subsidi/beda paket).
                </p>

                {/* Kolom Pencarian Cepat di Tabel Rincian Murid */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Cari nama atau NISN untuk ubah nominal khusus..."
                    className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-2xs"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Bersihkan pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-10 text-center">Ikut</th>
                          <th className="p-2.5 w-8 text-center">No</th>
                          <th className="p-2.5">Nama Santri & NISN</th>
                          <th className="p-2.5 w-24">Kelas</th>
                          <th className="p-2.5 w-44 text-right">Nominal Tunggakan (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Belum ada murid yang dipilih dalam cakupan ini.
                            </td>
                          </tr>
                        ) : displayedItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">
                              Tidak ada santri yang cocok dengan pencarian "{tableSearch}".
                              <button
                                type="button"
                                onClick={() => setTableSearch('')}
                                className="ml-2 font-bold text-amber-700 hover:underline cursor-pointer"
                              >
                                Hapus Pencarian
                              </button>
                            </td>
                          </tr>
                        ) : (
                          displayedItems.map((item, idx) => {
                            const isDifferent = item.nominal !== nominalDefaultInput;
                            const originalIndex = items.findIndex(i => i.student.id_siswa === item.student.id_siswa) + 1;
                            return (
                              <tr
                                key={item.student.id_siswa}
                                className={`hover:bg-slate-50 transition-colors ${
                                  !item.included
                                    ? 'opacity-40 bg-slate-100'
                                    : isDifferent
                                    ? 'bg-amber-50/40'
                                    : ''
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.included}
                                    onChange={() => handleToggleIncludeItem(item.student.id_siswa)}
                                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                                  {originalIndex > 0 ? originalIndex : idx + 1}
                                </td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900">{item.student.nama}</span>
                                    {isDifferent && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0"
                                        title={`Nominal khusus: ${formatRupiah(item.nominal)} (Default: ${formatRupiah(nominalDefaultInput)})`}
                                      >
                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                        <span>Beda dari default</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    NISN: {item.student.nisn || '-'}
                                  </div>
                                </td>
                                <td className="p-2.5 font-semibold text-slate-700">
                                  {item.student.kelas}
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    <span className="text-[10px] text-slate-400 font-semibold">Rp</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      disabled={!item.included}
                                      value={item.nominal}
                                      onChange={(e) =>
                                        handleUpdateItemNominal(item.student.id_siswa, Number(e.target.value))
                                      }
                                      className={`w-32 px-2 py-1 bg-white border rounded-lg text-right font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 ${
                                        isDifferent
                                          ? 'border-amber-400 bg-amber-50/60 text-amber-950 font-extrabold'
                                          : 'border-slate-300 text-slate-900'
                                      }`}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar Under Table */}
                  <div className="bg-amber-50/70 border-t border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-slate-700">
                      Total Sasaran Aktif:{' '}
                      <strong className="text-amber-900 font-bold">{includedItems.length} Santri</strong>{' '}
                      dari {items.length} terdaftar
                    </div>
                    <div className="text-right">
                      <span className="text-slate-600 mr-2">Total Akumulasi Nominal:</span>
                      <span className="text-sm font-black font-mono text-emerald-800">
                        {formatRupiah(totalAkumulasiNominal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* KONFIRMASI SEBELUM PROSES (POIN 4) */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Konfirmasi Pencatatan Tunggakan Manual
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed mt-1">
                    Pastikan rincian berikut sudah benar. Setiap murid akan dibuatkan <strong>1 catatan tunggakan mandiri</strong> di sistem dengan status <strong>KURANG</strong> yang dapat dilunasi kapan saja secara terpisah oleh Bendahara.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Jenis Tunggakan:</span>
                    <strong className="text-slate-900 text-sm font-bold">{jenisTunggakan}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Periode / Waktu:</span>
                    <strong className="text-slate-900 text-sm font-bold">{effectivePeriode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jumlah Murid Terkena:</span>
                    <strong className="text-amber-900 text-sm font-extrabold">{includedItems.length} Santri</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Nominal Gabungan:</span>
                    <strong className="text-emerald-800 text-base font-black font-mono">
                      {formatRupiah(totalAkumulasiNominal)}
                    </strong>
                  </div>
                </div>

                {catatan && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 block">Catatan / Keterangan:</span>
                    <span className="text-slate-700 italic">{catatan}</span>
                  </div>
                )}
              </div>

              {/* Ringkasan Daftar Murid & Nominal Terkena */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1.5">
                  Daftar Santri & Rincian Nominal Masing-Masing:
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-150 bg-slate-50">
                  {includedItems.map((item, idx) => (
                    <div key={item.student.id_siswa} className="px-3 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] w-5 text-right">{idx + 1}.</span>
                        <div>
                          <span className="font-bold text-slate-900">{item.student.nama}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({item.student.kelas})</span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-800">
                        {formatRupiah(item.nominal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isSuccess && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Catatan tunggakan manual berhasil disimpan ke sistem dan tersinkronisasi!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          {!showConfirmation ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProceedToConfirmation}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer text-xs"
              >
                <span>Tinjau & Konfirmasi ({includedItems.length} Santri)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                Kembali & Koreksi Data
              </button>
              <button
                type="button"
                disabled={isSubmitting || isSuccess}
                onClick={handleExecuteSave}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer text-xs disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Memproses Penyimpanan...' : 'Ya, Simpan Catatan Tunggakan Sekarang'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
