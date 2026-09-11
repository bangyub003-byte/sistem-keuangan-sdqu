import React, { useState } from 'react';
import { SchoolSetting, Announcement } from '../../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../../services/gasBackendCode';
import { StorageService } from '../../services/storageService';
import { Settings, Image, Upload, Link, Check, Copy, ExternalLink, RefreshCw, ShieldCheck, HelpCircle, FileCode, CheckCircle2, AlertCircle, QrCode, CreditCard, BookOpen, Bell, Megaphone, Trash2, PlusCircle, Info } from 'lucide-react';

interface PengaturanMenuProps {
  setting: SchoolSetting;
  announcements?: Announcement[];
  onSaveSetting: (st: SchoolSetting) => void;
  onResetData: () => void;
  onPullFromSpreadsheet?: () => void;
  onAddAnnouncement?: (ann: { judul: string; isi: string; is_penting?: boolean }) => void;
  onToggleAnnouncement?: (id: string) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const PengaturanMenu: React.FC<PengaturanMenuProps> = ({
  setting,
  announcements = [],
  onSaveSetting,
  onResetData,
  onPullFromSpreadsheet,
  onAddAnnouncement,
  onToggleAnnouncement,
  onDeleteAnnouncement
}) => {
  const [formData, setFormData] = useState<SchoolSetting>({ ...setting });
  const [testStatus, setTestStatus] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: ''
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Announcement Form State
  const [annJudul, setAnnJudul] = useState('');
  const [annIsi, setAnnIsi] = useState('');
  const [annIsPenting, setAnnIsPenting] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annJudul.trim() || !annIsi.trim()) {
      alert('Judul dan isi pengumuman wajib diisi.');
      return;
    }
    if (onAddAnnouncement) {
      onAddAnnouncement({
        judul: annJudul.trim(),
        isi: annIsi.trim(),
        is_penting: annIsPenting
      });
      setAnnJudul('');
      setAnnIsi('');
      setAnnIsPenting(false);
      setAnnSuccess(true);
      setTimeout(() => setAnnSuccess(false), 3000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSetting(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, qris_image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!formData.gas_url) {
      setTestStatus({
        testing: false,
        message: 'Masukkan URL Web App Google Apps Script terlebih dahulu!',
        success: false
      });
      return;
    }

    setTestStatus({ testing: true, message: 'Menghubungi Google Apps Script Web App...' });
    const res = await StorageService.testGasConnection(formData.gas_url);
    setTestStatus({
      testing: false,
      message: res.message,
      success: res.success
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem & Spreadsheet</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
              Khusus Bendahara
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola identitas sekolah, logo realtime, integrasi Google Apps Script, Google Spreadsheet & Drive
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Logo & Branding Sekolah */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Image className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Logo & Identitas Visual Sekolah</h3>
              <p className="text-xs text-slate-500">
                Logo yang diunggah otomatis tampil di halaman Login, Dashboard Bendahara, Dashboard Wali, dan Cetakan Laporan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white p-2 border-2 border-emerald-300 shadow-sm flex items-center justify-center">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Logo Pratinjau"
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-slate-400 font-bold text-xs">Belum Ada Logo</span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 mt-2">Pratinjau Logo</span>
            </div>

            <div className="sm:col-span-9 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unggah File Logo (PNG / JPG / SVG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Atau Masukkan Tautan / URL Logo (Google Drive / Web)
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Data Lembaga & Kop Surat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Settings className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-base">Profil & Informasi Lembaga</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Sekolah
              </label>
              <input
                type="text"
                required
                value={formData.nama_sekolah}
                onChange={(e) => setFormData({ ...formData, nama_sekolah: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                required
                value={formData.tahun_ajaran}
                onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                placeholder="2026/2027"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor WhatsApp Sekolah
              </label>
              <input
                type="text"
                required
                value={formData.no_wa}
                onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nominal Standar SPP Bulanan (Rp)
              </label>
              <input
                type="number"
                required
                value={formData.spp_default_nominal}
                onChange={(e) => setFormData({ ...formData, spp_default_nominal: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-bold text-emerald-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Kepala Sekolah (Untuk Tanda Tangan Dokumen)
              </label>
              <input
                type="text"
                required
                value={formData.nama_kepsek}
                onChange={(e) => setFormData({ ...formData, nama_kepsek: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Bendahara (Petugas Keuangan)
              </label>
              <input
                type="text"
                required
                value={formData.nama_bendahara}
                onChange={(e) => setFormData({ ...formData, nama_bendahara: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Alamat Lengkap Sekolah
            </label>
            <textarea
              rows={2}
              required
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Format Teks Kop Surat Resmi
            </label>
            <textarea
              rows={3}
              value={formData.kop_surat}
              onChange={(e) => setFormData({ ...formData, kop_surat: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Section 2b: Rekening Bank & QRIS Resmi Sekolah (Tampil di Dasbor Wali) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Rekening Bank & QRIS Resmi Sekolah</h3>
              <p className="text-xs text-slate-500">
                Informasi ini otomatis muncul di halaman Wali Murid agar mudah melakukan transfer dan scan barcode QRIS.
              </p>
            </div>
          </div>

          {/* Form Rekening Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Bank
              </label>
              <input
                type="text"
                placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                value={formData.nama_bank || ''}
                onChange={(e) => setFormData({ ...formData, nama_bank: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor Rekening (Norek)
              </label>
              <input
                type="text"
                placeholder="Contoh: 7188 9922 11"
                value={formData.no_rekening || ''}
                onChange={(e) => setFormData({ ...formData, no_rekening: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono font-bold text-emerald-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Atas Nama Pemilik Rekening
              </label>
              <input
                type="text"
                placeholder="Contoh: SDQU AL-I'TISHAM PLAYEN"
                value={formData.atas_nama_rekening || ''}
                onChange={(e) => setFormData({ ...formData, atas_nama_rekening: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Form QRIS Upload & Thumbnail Preview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Upload Gambar / Barcode QRIS Resmi Sekolah
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Thumbnail QRIS */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-white p-2 border-2 border-emerald-300 shadow-sm flex items-center justify-center overflow-hidden">
                  {formData.qris_image ? (
                    <img
                      src={formData.qris_image}
                      alt="Thumbnail QRIS Sekolah"
                      className="w-full h-full object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <QrCode className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px]">Belum Ada QRIS</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold mt-1">Thumbnail di Wali</span>
              </div>

              {/* Upload Controls & Instructions */}
              <div className="grow space-y-3 w-full">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unggah File Foto QRIS (PNG / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Atau Masukkan Tautan Gambar QRIS (Drive / Web URL)
                  </label>
                  <div className="relative">
                    <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.qris_image || ''}
                      onChange={(e) => setFormData({ ...formData, qris_image: e.target.value })}
                      placeholder="https://..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>
                </div>

                {/* Brief & Easy Guide */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Cara Singkat & Mudah:</span>
                  </p>
                  <p>1. Klik tombol "Choose File" lalu pilih foto barcode QRIS sekolah Anda dari HP/laptop.</p>
                  <p>2. Foto otomatis diubah menjadi thumbnail dan langsung tampil di halaman Wali Murid.</p>
                  <p>3. Wali dapat langsung memindai dari ponsel atau mengklik untuk memperbesar gambar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2c: Pengumuman & Informasi untuk Wali Murid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pengumuman & Pemberitahuan untuk Wali Murid</h3>
                <p className="text-xs text-slate-500">
                  Pemberitahuan yang Anda buat di sini akan otomatis muncul dengan notifikasi lonceng di portal Wali Murid.
                </p>
              </div>
            </div>
            {annSuccess && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Pengumuman Berhasil Diterbitkan!
              </span>
            )}
          </div>

          {/* Form Buat Pengumuman Baru */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Buat Pengumuman Baru</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={annJudul}
                  onChange={(e) => setAnnJudul(e.target.value)}
                  placeholder="Contoh: Batas Akhir Pembayaran SPP September 2026"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Prioritas Notifikasi
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annIsPenting}
                    onChange={(e) => setAnnIsPenting(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Tandai Penting (Merah)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Isi Pengumuman / Pesan
              </label>
              <textarea
                rows={3}
                value={annIsi}
                onChange={(e) => setAnnIsi(e.target.value)}
                placeholder="Tuliskan pesan lengkap pemberitahuan kepada seluruh wali murid..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateAnnouncement}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Terbitkan Pengumuman ke Wali</span>
              </button>
            </div>
          </div>

          {/* Daftar Pengumuman Sekolah */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Kelola Pengumuman ({announcements.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Wali hanya dapat melihat pengumuman berstatus <strong>Aktif</strong>
              </span>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">
                Belum ada pengumuman yang diterbitkan.
              </p>
            ) : (
              <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden">
                {announcements.map((ann) => {
                  const annId = ann.id_pengumuman || (ann as any).id;
                  const isPenting = ann.is_penting || (ann as any).priority === 'PENTING';
                  const isAktif = ann.status_aktif !== false;
                  return (
                    <div key={annId} className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${isAktif ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/80 opacity-75'}`}>
                      <div className="space-y-1 grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPenting ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isPenting ? 'PENTING' : 'INFO'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAktif ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}>
                            {isAktif ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                          <h5 className={`font-bold text-xs ${isAktif ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{ann.judul}</h5>
                          <span className="text-[10px] text-slate-400">
                            &bull; {new Date(ann.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {ann.isi}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onToggleAnnouncement && (
                          <button
                            type="button"
                            onClick={() => onToggleAnnouncement(annId)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              isAktif
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={isAktif ? 'Nonaktifkan pengumuman ini agar tidak tampil di wali' : 'Aktifkan kembali pengumuman ini'}
                          >
                            {isAktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        )}

                        {onDeleteAnnouncement && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus permanen pengumuman "${ann.judul}"?`)) {
                                onDeleteAnnouncement(annId);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus pengumuman ini secara permanen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panduan Singkat Sinkronisasi Spreadsheet (Jawaban untuk User) */}
        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-sm">
              Cara Mengubah Data di Spreadsheet (Nama Kepala Sekolah, Murid, dll) Agar Berubah di Aplikasi
            </h3>
          </div>
          <div className="text-xs text-amber-900/90 leading-relaxed space-y-1.5 pl-7">
            <p>
              1. <strong>Buka Google Spreadsheet</strong> sekolah Anda, lalu masuk ke sheet <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-amber-950 border border-amber-300">SETTING</code>.
            </p>
            <p>
              2. Pada baris ke-2 di bawah kolom <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-amber-950 border border-amber-300">nama_kepsek</code>, ubah nama Kepala Sekolah sesuai keinginan Anda.
            </p>
            <p>
              3. Di aplikasi ini, klik tombol <strong>"Tarik / Sinkronkan Data"</strong> (ikon awan di bagian kanan atas navbar) atau tombol <strong>"Tarik Data dari Spreadsheet"</strong> di bawah.
            </p>
            <p>
              4. Sistem akan langsung mengambil data terbaru dari Spreadsheet dan memperbarui nama Kepala Sekolah di seluruh dokumen, tanda tangan kuitansi, dan laporan resmi!
            </p>
          </div>
        </div>

        {/* Section 3: Integrasi Google Apps Script, Google Spreadsheet & Drive */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Koneksi Google Spreadsheet & Google Apps Script
                </h3>
                <p className="text-xs text-slate-500">
                  Data utama tersimpan di Google Spreadsheet & file diunggah ke Google Drive
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyGasCode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Apps Script (Code.gs)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                URL Web App Google Apps Script (doGet & doPost)
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="text"
                  value={formData.gas_url || ''}
                  onChange={(e) => setFormData({ ...formData, gas_url: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="grow px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus.testing}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testStatus.testing ? 'Menguji...' : 'Tes Koneksi'}
                </button>
                {onPullFromSpreadsheet && (
                  <button
                    type="button"
                    onClick={onPullFromSpreadsheet}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white rounded-lg shadow-xs cursor-pointer shrink-0"
                    title="Ambil dan sinkronkan data santri, transaksi, dan keuangan yang baru saja Anda isi di Google Spreadsheet"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tarik Data dari Spreadsheet</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                <strong>Tips:</strong> Anda bisa menambahkan atau mengedit data santri dan transaksi langsung lewat Google Spreadsheet. Klik tombol <strong>"Tarik Data dari Spreadsheet"</strong> kapan saja untuk menyinkronkannya secara instan ke aplikasi!
              </p>
            </div>

            {testStatus.message && (
              <div className={`sm:col-span-2 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                ID Spreadsheet Google (Opsional / Container-Bound)
              </label>
              <input
                type="text"
                value={formData.spreadsheet_id || ''}
                onChange={(e) => setFormData({ ...formData, spreadsheet_id: e.target.value })}
                placeholder="1SDQ_AlItisham_Playen_Database_Keuangan"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                ID Folder Google Drive (Penyimpanan Bukti & Foto)
              </label>
              <input
                type="text"
                value={formData.drive_folder_id || ''}
                onChange={(e) => setFormData({ ...formData, drive_folder_id: e.target.value })}
                placeholder="1F_SDQ_AlItisham_Playen_Keuangan"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Tutorial Deploy Google Apps Script */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Panduan Singkat 4 Langkah Menghubungkan Google Spreadsheet:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed pl-1">
              <li>Buka Google Spreadsheet baru atau yang sudah ada di akun Google sekolah.</li>
              <li>Klik menu <strong>Ekstensi (Extensions) &rarr; Apps Script</strong>.</li>
              <li>Klik tombol <strong>"Salin Kode Apps Script"</strong> di atas, lalu tempel (paste) seluruhnya ke editor file <code>Code.gs</code>.</li>
              <li>Klik <strong>Deploy &rarr; New deployment</strong>, pilih jenis <strong>Web App</strong>, ubah <em>Execute as</em> ke <strong>"Me"</strong> dan <em>Who has access</em> ke <strong>"Anyone"</strong>, lalu salin URL Web App dan tempel ke kolom di atas.</li>
            </ol>
            <p className="text-[11px] text-emerald-800 font-semibold pt-1">
              *Script otomatis membentuk 6 Sheet resmi (<code>USER</code>, <code>SISWA</code>, <code>TRANSAKSI</code>, <code>KEUANGAN</code>, <code>SETTING</code>, <code>LOG</code>) secara otomatis!
            </p>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <button
            type="button"
            onClick={() => {
              if (confirm('Kembalikan seluruh data ke sampel awal simulasi SD Qur\'an Unggulan Al-I\'tisham Playen?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data Contoh Sekolah</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 text-xs sm:text-sm font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
