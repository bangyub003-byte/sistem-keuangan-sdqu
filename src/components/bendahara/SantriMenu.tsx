import React, { useState } from 'react';
import { Student, Transaction, SchoolSetting } from '../../types';
import { Plus, Search, Edit3, Trash2, Download, Upload, Filter, Tag, Check, X, UserPlus, Phone, MapPin, Award, CreditCard, Eye, MessageCircle } from 'lucide-react';
import { SantriDetailModal } from './SantriDetailModal';
import { INITIAL_SETTING } from '../../data/initialData';

interface SantriMenuProps {
  students: Student[];
  transactions?: Transaction[];
  setting?: SchoolSetting;
  onAddStudent: (st: Omit<Student, 'id_siswa'>) => void;
  onUpdateStudent: (st: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkImport?: (newStudents: Omit<Student, 'id_siswa'>[]) => void;
  onImportStudents?: (newStudents: Omit<Student, 'id_siswa'>[]) => void;
  onNavigateToPayment?: (st: Student) => void;
  onOpenReceipt?: (trx: Transaction) => void;
  onOpenKartuSpp?: (st: Student) => void;
}

export const SantriMenu: React.FC<SantriMenuProps> = ({
  students = [],
  transactions = [],
  setting = INITIAL_SETTING,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkImport,
  onImportStudents,
  onNavigateToPayment,
  onOpenReceipt,
  onOpenKartuSpp
}) => {
  const handleBulk = onImportStudents || onBulkImport;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Ekstrak nama kelas polos tanpa embel-embel (misal: "1A" dari "1A - Abu Bakar Ash-Shiddiq" atau "1A")
  const getPlainClassName = (kelasStr: string = ''): string => {
    const trimmed = (kelasStr || '').trim();
    if (!trimmed) return '';
    if (trimmed.includes('-')) {
      return trimmed.split('-')[0].trim();
    }
    if (trimmed.includes('(')) {
      return trimmed.split('(')[0].trim();
    }
    const match = trimmed.match(/^([1-6][A-Za-z]?)/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return trimmed;
  };

  // Daftar kelas dinamis diambil langsung dari data santri aktual di sistem
  const dynamicClasses = React.useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach(s => {
      const plain = getPlainClassName(s.kelas);
      if (plain) set.add(plain);
    });
    // Fallback kelas standar jika data santri belum ada
    if (set.size === 0) {
      ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '6A'].forEach(c => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  const defaultSppNominal = setting?.spp_default_nominal || 85000;

  // Form State
  const initialFormState: Omit<Student, 'id_siswa'> = {
    nisn: '',
    nik: '',
    nama: '',
    tempat_lahir: 'Gunungkidul',
    tanggal_lahir: '2017-01-01',
    jenis_kelamin: 'L',
    kelas: dynamicClasses[0] || '1A',
    nama_wali: '',
    no_hp: '',
    alamat: '',
    foto: '',
    status_aktif: true,
    spp_nominal: defaultSppNominal,
    spp_kategori: 'REGULER',
    spp_catatan: ''
  };

  const [formData, setFormData] = useState<Omit<Student, 'id_siswa'>>(initialFormState);

  const filteredStudents = students.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      (s.nama || '').toLowerCase().includes(searchLower) ||
      (s.nisn || '').includes(searchTerm) ||
      (s.nik || '').includes(searchTerm) ||
      (s.nama_wali || '').toLowerCase().includes(searchLower);

    if (!matchSearch) return false;
    if (!filterKelas) return true;

    // Pencocokan fleksibel agar tidak 0 murid jika ada format nama kelas berbeda
    const plain = getPlainClassName(s.kelas).toLowerCase();
    const raw = (s.kelas || '').trim().toLowerCase();
    const target = filterKelas.trim().toLowerCase();

    return plain === target || raw === target || raw.startsWith(target + ' ') || raw.startsWith(target + '-');
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      ...initialFormState,
      spp_nominal: setting?.spp_default_nominal || 85000,
      kelas: dynamicClasses[0] || '1A'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nisn: student.nisn,
      nik: student.nik,
      nama: student.nama,
      tempat_lahir: student.tempat_lahir,
      tanggal_lahir: student.tanggal_lahir,
      jenis_kelamin: student.jenis_kelamin,
      kelas: student.kelas,
      nama_wali: student.nama_wali,
      no_hp: student.no_hp,
      alamat: student.alamat,
      foto: student.foto || '',
      status_aktif: student.status_aktif,
      spp_nominal: student.spp_nominal || setting?.spp_default_nominal || 85000,
      spp_kategori: student.spp_kategori || 'REGULER',
      spp_catatan: student.spp_catatan || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = (formData.nama || '').trim();
    const cleanNisn = (formData.nisn || '').trim();
    const cleanNik = (formData.nik || '').trim();

    if (!cleanNama) {
      alert('Mohon isi Nama Lengkap Santri.');
      return;
    }

    if (!cleanNisn && !cleanNik) {
      alert('Mohon isi minimal salah satu antara NISN atau NIK Santri.');
      return;
    }

    const currentDefault = setting?.spp_default_nominal || 85000;
    const finalNominal = (formData.spp_nominal && Number(formData.spp_nominal) > 0)
      ? Number(formData.spp_nominal)
      : currentDefault;

    const payload = {
      ...formData,
      nama: cleanNama,
      nisn: cleanNisn,
      nik: cleanNik,
      spp_nominal: finalNominal
    };

    if (editingStudent) {
      onUpdateStudent({
        ...payload,
        id_siswa: editingStudent.id_siswa
      });
    } else {
      onAddStudent(payload);
    }
    setIsAddModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ["ID Siswa", "NISN", "NIK", "Nama Lengkap", "Tempat Lahir", "Tanggal Lahir", "L/P", "Kelas", "Nama Wali", "No WA", "Alamat", "SPP Nominal", "Kategori SPP", "Catatan SPP"];
    const rows = students.map(s => [
      s.id_siswa,
      s.nisn,
      s.nik,
      `"${s.nama}"`,
      s.tempat_lahir,
      s.tanggal_lahir,
      s.jenis_kelamin,
      `"${s.kelas}"`,
      `"${s.nama_wali}"`,
      s.no_hp,
      `"${s.alamat}"`,
      s.spp_nominal,
      s.spp_kategori || 'REGULER',
      `"${s.spp_catatan || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Santri_SDQ_AlItisham_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImport = () => {
    try {
      const currentDefault = setting?.spp_default_nominal || 85000;

      // Try JSON first
      if (importText.trim().startsWith('[')) {
        const parsed = JSON.parse(importText);
        if (Array.isArray(parsed)) {
          const formatted = parsed.map((p: any) => ({
            ...p,
            spp_nominal: (p.spp_nominal && Number(p.spp_nominal) > 0) ? Number(p.spp_nominal) : currentDefault
          }));
          if (handleBulk) handleBulk(formatted);
          setIsImportModalOpen(false);
          setImportText('');
          return;
        }
      }
      
      // Try CSV lines: NISN,NIK,Nama,Tempat,Tanggal,JK,Kelas,Wali,NoHP,Alamat,SPP
      const lines = importText.trim().split('\n');
      const newItems: Omit<Student, 'id_siswa'>[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('nisn')) return; // skip header
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const rawNisn = cols[0] || '';
        const rawNik = cols[1] || '';
        const rawNama = cols[2] || '';

        if (rawNama && (rawNisn || rawNik)) {
          const customSpp = Number(cols[10]);
          newItems.push({
            nisn: rawNisn,
            nik: rawNik || rawNisn,
            nama: rawNama,
            tempat_lahir: cols[3] || 'Gunungkidul',
            tanggal_lahir: cols[4] || '2017-01-01',
            jenis_kelamin: (cols[5]?.toUpperCase() === 'P' ? 'P' : 'L'),
            kelas: cols[6] ? getPlainClassName(cols[6]) : '1A',
            nama_wali: cols[7] || 'Wali Santri',
            no_hp: cols[8] || '0812-0000-0000',
            alamat: cols[9] || 'Playen, Gunungkidul',
            foto: '',
            status_aktif: true,
            spp_nominal: (customSpp && !isNaN(customSpp) && customSpp > 0) ? customSpp : currentDefault,
            spp_kategori: 'REGULER',
            spp_catatan: ''
          });
        }
      });

      if (newItems.length > 0) {
        if (handleBulk) handleBulk(newItems);
        setIsImportModalOpen(false);
        setImportText('');
      } else {
        alert('Data import tidak valid atau kosong. Format minimal: NISN/NIK,Nama');
      }
    } catch (err: any) {
      alert('Gagal memproses data import: ' + err.message);
    }
  };

  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Santri & SPP Khusus</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen data induk santri, tarif SPP per siswa, dan sinkronisasi akun login wali murid
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Spreadsheet</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Santri Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="relative grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan Nama Santri, NISN, NIK, atau Nama Wali..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="">Semua Tingkat / Kelas</option>
            {dynamicClasses.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Data Table - Following Requested Format */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">NISN</th>
                <th className="p-3">NIK / No. Passport</th>
                <th className="p-3">Nama Lengkap Santri</th>
                <th className="p-3">Tempat Lahir</th>
                <th className="p-3">Tanggal Lahir</th>
                <th className="p-3 text-center">L/P</th>
                <th className="p-3">Tingkat / Kelas</th>
                <th className="p-3">SPP Siswa</th>
                <th className="p-3">Wali & Kontak</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Tidak ditemukan data santri yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id_siswa} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-emerald-800">{s.nisn}</td>
                    <td className="p-3 font-mono text-slate-600">{s.nik}</td>
                    <td className="p-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailStudent(s)}
                          className="font-bold text-slate-900 text-[13px] hover:text-emerald-700 hover:underline text-left cursor-pointer transition-colors"
                          title="Klik untuk melihat rekap riwayat SPP & edit data murid ini"
                        >
                          {s.nama}
                        </button>
                        <div className="text-[10px] text-slate-400 font-mono">{s.id_siswa}</div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{s.tempat_lahir}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{s.tanggal_lahir}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        s.jenis_kelamin === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        {s.jenis_kelamin}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{getPlainClassName(s.kelas) || s.kelas}</td>
                    <td className="p-3">
                      <div className="font-extrabold text-emerald-900">{formatRupiah(s.spp_nominal)}</div>
                      {s.spp_kategori && s.spp_kategori !== 'REGULER' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold mt-0.5">
                          <Award className="w-2.5 h-2.5 text-amber-600" />
                          {s.spp_kategori}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Reguler</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{s.nama_wali}</div>
                      <div className="text-slate-500 font-mono text-[10px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{s.no_hp || '-'}</span>
                        {s.no_hp && s.no_hp !== '-' && (
                          <a
                            href={`https://wa.me/${s.no_hp.replace(/\D/g, '').startsWith('0') ? '62' + s.no_hp.replace(/\D/g, '').slice(1) : s.no_hp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat WhatsApp Wali Murid"
                            className="text-emerald-700 hover:text-emerald-900 ml-1 inline-flex items-center cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onNavigateToPayment && (
                          <button
                            onClick={() => onNavigateToPayment(s)}
                            title="Verifikasi / Kelola Pembayaran Santri Ini"
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Santri & SPP Khusus"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus santri ${s.nama} (${s.nisn})?`)) {
                              onDeleteStudent(s.id_siswa);
                            }
                          }}
                          title="Hapus Santri"
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> dari total {students.length} santri</span>
          <span className="text-emerald-700 font-medium">Akun login wali murid otomatis menggunakan NISN</span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingStudent ? 'Edit Data Santri & SPP Khusus' : 'Tambah Data Santri Baru'}
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Lengkapi identitas santri & atur nominal SPP khusus jika berlaku
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: NISN & NIK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NISN Santri
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0015678901"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Username login wali murid (jika kosong otomatis menggunakan NIK)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NIK / No. Passport <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="Contoh: 3403011205160001"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Identitas kependudukan & username login jika NISN kosong</p>
                </div>
              </div>

              {/* Row 2: Nama & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Lengkap Santri <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama lengkap santri..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Tempat & Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.tempat_lahir}
                    onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                    placeholder="Contoh: Gunungkidul"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 4: Kelas & Nama Wali */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tingkat / Kelas
                  </label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    {dynamicClasses.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_wali}
                    onChange={(e) => setFormData({ ...formData, nama_wali: e.target.value })}
                    placeholder="Nama orang tua/wali..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 5: Kontak & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nomor WhatsApp Wali
                  </label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alamat Lengkap Santri
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="RT/RW, Padukuhan, Kalurahan, Kapanewon..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              {/* SECTION KHUSUS: SPP KHUSUS SISWA */}
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Pengaturan SPP Khusus Siswa</span>
                </div>
                <p className="text-xs text-amber-800">
                  Bendahara dapat menetapkan nominal SPP berbeda untuk santri ini (misal: beasiswa, kondisi ekonomi keluarga, anak guru/karyawan, dsb).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nominal SPP per Bulan (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.spp_nominal}
                      onChange={(e) => setFormData({ ...formData, spp_nominal: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm font-bold text-emerald-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Standar umum sekolah saat ini: {formatRupiah(defaultSppNominal)}/bulan</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Kategori Kebijakan
                    </label>
                    <select
                      value={formData.spp_kategori || 'REGULER'}
                      onChange={(e) => setFormData({ ...formData, spp_kategori: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="REGULER">SPP Standar (Reguler)</option>
                      <option value="BEASISWA">Beasiswa Tahfidz / Prestasi</option>
                      <option value="EKONOMI">Keringanan Kondisi Ekonomi</option>
                      <option value="YATIM">Santri Yatim / Dhuafa (Gratis/Subsidi)</option>
                      <option value="KHUSUS">Kebijakan Khusus Yayasan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Alasan / Catatan SPP Khusus
                  </label>
                  <input
                    type="text"
                    value={formData.spp_catatan || ''}
                    onChange={(e) => setFormData({ ...formData, spp_catatan: e.target.value })}
                    placeholder="Contoh: Beasiswa Tahfidz 5 Juz (Keringanan Rp200.000)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Simpan Santri Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Spreadsheet Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Import Data dari Google Spreadsheet</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tempel data baris CSV atau format JSON santri dari spreadsheet
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">Format urutan CSV per baris:</span>
                <p className="font-mono mt-1 text-[11px] text-slate-700">NISN,NIK,Nama Lengkap,Tempat Lahir,Tanggal Lahir,L/P,Kelas,Nama Wali,No WA,Alamat,SPP Nominal</p>
                <p className="text-[11px] text-emerald-700 mt-1.5">
                  * Catatan: Jika SPP Nominal kosong/0, sistem otomatis menerapkan SPP Standar ({formatRupiah(defaultSppNominal)}) dari Pengaturan. Jika NISN kosong, login wali otomatis menggunakan NIK.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tempel (Paste) Data di Sini:
                </label>
                <textarea
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="0015678907,3403011111110007,Ahmad Fauzan,Gunungkidul,2017-02-15,L,1A,Budi Santoso,081234567890,Playen,500000"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Proses Import ke Sistem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail & Rekap Khusus Murid */}
      {selectedDetailStudent && (
        <SantriDetailModal
          student={selectedDetailStudent}
          transactions={transactions}
          setting={setting}
          onClose={() => setSelectedDetailStudent(null)}
          onUpdateStudent={(updated) => {
            onUpdateStudent(updated);
            setSelectedDetailStudent(updated);
          }}
          onNavigateToPayment={onNavigateToPayment}
          onOpenReceipt={onOpenReceipt}
          onOpenKartuSpp={onOpenKartuSpp}
        />
      )}
    </div>
  );
};
