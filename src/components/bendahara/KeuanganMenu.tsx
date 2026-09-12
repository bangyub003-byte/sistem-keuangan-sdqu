import React, { useState } from 'react';
import { KeuanganRecord, KeuanganType, KategoriDana } from '../../types';
import { Plus, ArrowDownLeft, ArrowUpRight, Filter, Search, FileText, Image, Calendar, Tag, Wallet, Check, AlertTriangle, X } from 'lucide-react';

interface KeuanganMenuProps {
  keuangan: KeuanganRecord[];
  operatorName: string;
  onAddKeuangan: (rec: Omit<KeuanganRecord, 'id_keuangan'>) => void;
  onCancelKeuangan?: (id: string, reason: string) => void;
  kategoriDana?: KategoriDana[];
  onAddKategoriDana?: (cat: { nama_kategori: string; keterangan?: string }) => void;
}

export const KeuanganMenu: React.FC<KeuanganMenuProps> = ({
  keuangan = [],
  operatorName,
  onAddKeuangan,
  onCancelKeuangan,
  kategoriDana = [],
  onAddKategoriDana
}) => {
  const [activeTab, setActiveTab] = useState<KeuanganType>('MASUK');
  const [filterKategori, setFilterKategori] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cancellation modal state
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    id: string;
    keterangan: string;
    reason: string;
  }>({
    isOpen: false,
    id: '',
    keterangan: '',
    reason: ''
  });

  // Form input state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formTanggal, setFormTanggal] = useState(todayStr);
  const [formKategori, setFormKategori] = useState('');
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [customKategoriInput, setCustomKategoriInput] = useState('');
  const [formNominal, setFormNominal] = useState<number>(0);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formBukti, setFormBukti] = useState('');

  // Default preset categories
  const defaultMasukCategories = ['SPP', 'Donasi', 'Infaq', 'Bantuan', 'Pendapatan lain'];
  const defaultKeluarCategories = ['Gaji', 'Operasional', 'ATK', 'Kegiatan', 'Perawatan'];

  // Categories from KategoriDana sheet/state
  const dynamicKatNames = kategoriDana
    .filter(kd => kd.status_aktif !== false)
    .map(kd => kd.nama_kategori);

  // Aggregated existing categories from records
  const existingCategories = Array.from(new Set(
    keuangan.filter(k => k.jenis === activeTab).map(k => k.kategori)
  ));
  const availableCategories = Array.from(new Set([
    ...(activeTab === 'MASUK' ? defaultMasukCategories : defaultKeluarCategories),
    ...dynamicKatNames,
    ...existingCategories
  ]));

  const openAddModal = (type: KeuanganType) => {
    setActiveTab(type);
    setFormTanggal(todayStr);
    const defaultCat = type === 'MASUK' ? 'Donasi' : 'Operasional';
    setFormKategori(defaultCat);
    setIsCustomKategori(false);
    setCustomKategoriInput('');
    setFormNominal(0);
    setFormKeterangan('');
    setFormBukti('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalKategori = isCustomKategori ? customKategoriInput.trim() : formKategori;
    if (!finalKategori) {
      alert('Pilih atau buat kategori keuangan.');
      return;
    }
    if (formNominal <= 0) {
      alert('Nominal harus lebih dari Rp 0');
      return;
    }

    if (isCustomKategori && onAddKategoriDana && !dynamicKatNames.includes(finalKategori)) {
      onAddKategoriDana({
        nama_kategori: finalKategori,
        keterangan: `Dibuat via form kas ${activeTab.toLowerCase()}`
      });
    }

    onAddKeuangan({
      tanggal: formTanggal,
      jenis: activeTab,
      kategori: finalKategori,
      nominal: formNominal,
      keterangan: formKeterangan,
      bukti: formBukti,
      petugas: operatorName
    });

    setIsModalOpen(false);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModal.reason.trim()) {
      alert('Tuliskan alasan pembatalan transaksi!');
      return;
    }

    if (onCancelKeuangan && cancelModal.id) {
      onCancelKeuangan(cancelModal.id, cancelModal.reason.trim());
    }

    setCancelModal({ isOpen: false, id: '', keterangan: '', reason: '' });
  };

  // Filtered List
  const filteredList = keuangan.filter(k => {
    const matchType = k.jenis === activeTab;
    const matchKat = filterKategori ? k.kategori === filterKategori : true;
    const matchSearch = searchTerm ? k.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) || k.kategori.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchType && matchKat && matchSearch;
  });

  const totalFiltered = filteredList.filter(k => k.status !== 'CANCEL').reduce((a, b) => a + b.nominal, 0);

  // Overall totals (EXCLUDING cancelled records for true balance)
  const validKeuangan = keuangan.filter(k => k.status !== 'CANCEL');
  const totalMasukAll = validKeuangan.filter(k => k.jenis === 'MASUK').reduce((a, b) => a + b.nominal, 0);
  const totalKeluarAll = validKeuangan.filter(k => k.jenis === 'KELUAR').reduce((a, b) => a + b.nominal, 0);
  const saldoKas = totalMasukAll - totalKeluarAll;

  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Buku Kas & Keuangan Sekolah</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kas masuk dan kas keluar dengan custom kategori mandiri & arsip bukti transaksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal('MASUK')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Input Uang Masuk</span>
          </button>
          <button
            onClick={() => openAddModal('KELUAR')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Input Uang Keluar</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase">
            <span>Total Kas Masuk</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-2">{formatRupiah(totalMasukAll)}</div>
          <p className="text-[11px] text-emerald-700 mt-1">SPP, Donasi, Infaq & Bantuan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-gradient-to-br from-rose-50/50 to-white">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase">
            <span>Total Kas Keluar</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-800 mt-2">{formatRupiah(totalKeluarAll)}</div>
          <p className="text-[11px] text-rose-600 mt-1">Gaji, Operasional, ATK & Kegiatan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-xs bg-gradient-to-br from-sky-50/50 to-white">
          <div className="flex items-center justify-between text-xs font-bold text-sky-800 uppercase">
            <span>Saldo Kas Bersih</span>
            <Wallet className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{formatRupiah(saldoKas)}</div>
          <p className="text-[11px] text-sky-700 mt-1">Dana siap operasional sekolah</p>
        </div>
      </div>

      {/* Tab Switcher & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('MASUK'); setFilterKategori(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MASUK'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Kas Masuk (Pemasukan)</span>
            </button>
            <button
              onClick={() => { setActiveTab('KELUAR'); setFilterKategori(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'KELUAR'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Kas Keluar (Pengeluaran)</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Subtotal Aktif: <strong className="text-slate-900">{formatRupiah(totalFiltered)}</strong>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari uraian keterangan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            >
              <option value="">Semua Kategori {activeTab === 'MASUK' ? 'Pemasukan' : 'Pengeluaran'}</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 w-28">Tanggal</th>
                <th className="p-3 w-36">Kategori</th>
                <th className="p-3">Uraian / Keterangan</th>
                <th className="p-3 text-right w-36">Nominal</th>
                <th className="p-3 text-center w-28">Bukti</th>
                <th className="p-3 w-32">Petugas</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Belum ada data kas {activeTab === 'MASUK' ? 'masuk' : 'keluar'} pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec, idx) => (
                  <tr key={rec.id_keuangan} className={`hover:bg-slate-50 transition-colors ${rec.status === 'CANCEL' ? 'bg-slate-50/60 opacity-70' : ''}`}>
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{rec.tanggal}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          rec.jenis === 'MASUK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.kategori}
                        </span>
                        {rec.status === 'CANCEL' && (
                          <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[9px] bg-rose-100 text-rose-700 border border-rose-200">
                            BATAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={rec.status === 'CANCEL' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                        {rec.keterangan}
                      </div>
                      {rec.status === 'CANCEL' && rec.alasan_batal && (
                        <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                          Alasan: {rec.alasan_batal}
                        </div>
                      )}
                    </td>
                    <td className={`p-3 text-right font-extrabold ${
                      rec.status === 'CANCEL'
                        ? 'line-through text-slate-400'
                        : rec.jenis === 'MASUK'
                        ? 'text-emerald-800'
                        : 'text-rose-700'
                    }`}>
                      {formatRupiah(rec.nominal)}
                    </td>
                    <td className="p-3 text-center">
                      {rec.bukti ? (
                        <a
                          href={rec.bukti}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:underline font-semibold"
                        >
                          <Image className="w-3.5 h-3.5" />
                          <span>Lihat File</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Tanpa File</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{rec.petugas || operatorName}</td>
                    <td className="p-3 text-center">
                      {rec.status === 'CANCEL' ? (
                        <span className="text-[10px] text-slate-400 italic">Batal</span>
                      ) : onCancelKeuangan ? (
                        <button
                          type="button"
                          onClick={() => setCancelModal({
                            isOpen: true,
                            id: rec.id_keuangan,
                            keterangan: rec.keterangan,
                            reason: ''
                          })}
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Batalkan transaksi kas ini dengan mencantumkan alasan"
                        >
                          Batalkan
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-5 text-white flex items-center justify-between ${
              activeTab === 'MASUK' ? 'bg-emerald-800' : 'bg-rose-800'
            }`}>
              <div>
                <h3 className="font-bold text-base">
                  {activeTab === 'MASUK' ? 'Input Kas Masuk (Pemasukan)' : 'Input Kas Keluar (Pengeluaran)'}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Bendahara dapat memilih kategori yang ada atau membuat kategori sendiri
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formNominal || ''}
                    onChange={(e) => setFormNominal(Number(e.target.value))}
                    placeholder="Contoh: 1500000"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Kategori with Custom Category feature */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Kategori {activeTab === 'MASUK' ? 'Pemasukan' : 'Pengeluaran'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomKategori(!isCustomKategori)}
                    className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {isCustomKategori ? 'Pilih dari Kategori Ada' : '+ Buat Kategori Baru'}
                  </button>
                </div>

                {isCustomKategori ? (
                  <input
                    type="text"
                    required
                    value={customKategoriInput}
                    onChange={(e) => setCustomKategoriInput(e.target.value)}
                    placeholder="Tulis nama kategori baru..."
                    className="w-full px-3 py-2 text-xs bg-white border border-emerald-500 ring-1 ring-emerald-500 rounded-lg focus:outline-hidden"
                  />
                ) : (
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Uraian / Keterangan Transaksi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Rincian tujuan transaksi / nama donatur / keperluan..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              {/* Bukti Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bukti Transaksi (Link URL / Google Drive)
                </label>
                <input
                  type="text"
                  value={formBukti}
                  onChange={(e) => setFormBukti(e.target.value)}
                  placeholder="https://drive.google.com/... atau link foto nota"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  File tersimpan di Google Drive terhubung & tautan tercatat di Sheet KEUANGAN.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    activeTab === 'MASUK' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Batalkan Transaksi Kas</h3>
              </div>
              <button
                onClick={() => setCancelModal({ isOpen: false, id: '', keterangan: '', reason: '' })}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">Transaksi yang dibatalkan:</p>
                <p className="italic text-slate-600">{cancelModal.keterangan}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">ID: {cancelModal.id}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  placeholder="Contoh: Salah input nominal / nota dibatalkan / transaksi duplikat..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Status akan diubah menjadi CANCEL dan tidak lagi dihitung dalam total kas masuk/keluar.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, id: '', keterangan: '', reason: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Konfirmasi Pembatalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
