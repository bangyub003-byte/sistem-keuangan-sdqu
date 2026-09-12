export type UserRole = 'BENDAHARA' | 'KEPSEK' | 'WALI';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface UserAccount {
  id_user: string;
  username: string;
  password: string;
  nama: string;
  role: UserRole;
  id_siswa?: string; // for WALI, links to their child
  nisn?: string; // for WALI, links to child's NISN
  nik?: string; // for WALI, fallback to child's NIK if NISN is empty
}

export interface Student {
  id_siswa: string;
  nisn: string;
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  kelas: string;
  nama_wali: string;
  no_hp: string;
  no_hp_wali?: string;
  alamat: string;
  foto?: string;
  status_aktif: boolean;
  // SPP Khusus Siswa
  spp_nominal: number; // custom SPP nominal (default or custom)
  spp_kategori?: 'REGULER' | 'BEASISWA' | 'EKONOMI' | 'YATIM' | 'KHUSUS';
  spp_catatan?: string;
  spp_mulai_bulan?: string; // custom start month e.g. "September" (for transfer students)
  spp_mulai_tahun?: number; // custom start year e.g. 2026
}

export type TransactionStatus = 'LUNAS' | 'KURANG' | 'CANCEL';

export interface Transaction {
  id_transaksi: string;
  tanggal: string; // ISO or YYYY-MM-DD
  waktu?: string; // Real-time timestamp HH:mm:ss
  nisn: string;
  nama_siswa?: string;
  kelas?: string;
  jenis: string; // e.g. "SPP Bulanan", "Uang Gedung / Infaq Pangkal", "Seragam & Kitab", "Kegiatan Qur'an"
  kategori: string; // e.g. "SPP", "Uang Masuk", "Uang Kegiatan"
  bulan?: string; // e.g. "Juli 2026", "Agustus 2026"
  nominal_tagihan: number;
  nominal_bayar: number;
  sisa: number;
  status: TransactionStatus;
  petugas: string;
  keterangan?: string;
  alasan_batal?: string;
}

export type KeuanganType = 'MASUK' | 'KELUAR';
export type KeuanganStatus = 'ACTIVE' | 'CANCEL';

export interface KategoriDana {
  id_kategori: string;
  nama_kategori: string;
  keterangan?: string;
  status_aktif?: boolean;
}

export interface KeuanganRecord {
  id_keuangan: string;
  tanggal: string;
  waktu?: string; // Real-time timestamp HH:mm:ss
  jenis: KeuanganType;
  kategori: string; // Masuk: SPP, Donasi, Infaq, Bantuan, Pendapatan lain; Keluar: Gaji, Operasional, ATK, Kegiatan, Perawatan
  nominal: number;
  keterangan: string;
  bukti?: string; // Drive URL or base64
  petugas?: string;
  status?: KeuanganStatus;
  alasan_batal?: string;
  id_kategori?: string;
}

export interface SchoolSetting {
  nama_sekolah: string;
  logo: string;
  alamat: string;
  no_wa: string;
  kop_surat: string;
  tahun_ajaran: string;
  nama_kepsek: string;
  nama_bendahara: string;
  spp_default_nominal: number;
  spp_mulai_bulan?: string; // e.g. "Juli"
  spp_mulai_tahun?: number; // e.g. 2026
  gas_url?: string;
  drive_folder_id?: string;
  spreadsheet_id?: string;
  // Pembayaran Rekening & QRIS
  qris_image?: string;
  nama_bank?: string;
  no_rekening?: string;
  atas_nama_rekening?: string;
}

export interface Announcement {
  id_pengumuman: string;
  tanggal: string;
  judul: string;
  isi: string;
  penulis: string;
  is_penting?: boolean;
  status_aktif?: boolean;
}

export interface ActivityLog {
  id_log: string;
  tanggal: string;
  user: string;
  aktivitas: string;
}
