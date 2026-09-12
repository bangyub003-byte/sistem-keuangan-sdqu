import { Student, Transaction, KeuanganRecord, SchoolSetting, UserAccount, ActivityLog, Announcement, KategoriDana } from '../types';
import { APP_CONFIG } from '../config';

export const INITIAL_SETTING: SchoolSetting = {
  nama_sekolah: "SD Qur'an Unggulan Al-I'tisham Playen",
  logo: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80",
  alamat: "Jl. Playen - Paliyan KM 1.5, Padukuhan Playen I, Kalurahan Playen, Kapanewon Playen, Kab. Gunungkidul, D.I. Yogyakarta 55861",
  no_wa: "0812-2889-1945",
  kop_surat: "YAYASAN AL-I'TISHAM PLAYEN GUNUNGKIDUL\nSD QUR'AN UNGGULAN AL-I'tisham PLAYEN\nNPSN: 69987123 | Terakreditasi A\nJl. Playen - Paliyan KM 1.5, Playen, Gunungkidul, DIY 55861 | Telp/WA: 0812-2889-1945",
  tahun_ajaran: "2026/2027",
  nama_kepsek: "Ust. H. Ahmad Mufid, M.Pd.",
  nama_bendahara: "Usth. Nur Khasanah, S.E.I.",
  spp_default_nominal: 500000,
  gas_url: APP_CONFIG.DEFAULT_GAS_URL,
  drive_folder_id: APP_CONFIG.DEFAULT_DRIVE_FOLDER_ID,
  spreadsheet_id: APP_CONFIG.DEFAULT_SPREADSHEET_ID,
  // Rekening & QRIS Resmi Sekolah
  nama_bank: "Bank Syariah Indonesia (BSI)",
  no_rekening: "7188 9922 11",
  atas_nama_rekening: "SDQU AL-I'TISHAM PLAYEN",
  qris_image: "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=00020101021126600016ID.CO.QRIS.WWW011893600000000000000002150000000000000005204581253033605802ID5925SDQU%20AL-ITISHAM%20PLAYEN6012GUNUNGKIDUL6105558616304ABCD"
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id_user: "USR-001",
    username: "bendahara",
    password: "123",
    nama: "Usth. Nur Khasanah, S.E.I. (Bendahara)",
    role: "BENDAHARA"
  },
  {
    id_user: "USR-002",
    username: "kepsek",
    password: "123",
    nama: "Ust. H. Ahmad Mufid, M.Pd. (Kepala Sekolah)",
    role: "KEPSEK"
  },
  {
    id_user: "USR-WALI-01",
    username: "0015678901",
    password: "123",
    nama: "H. Bambang Sulistyo (Wali Murid)",
    role: "WALI",
    nisn: "0015678901",
    id_siswa: "SISWA-001"
  },
  {
    id_user: "USR-WALI-02",
    username: "0015678902",
    password: "123",
    nama: "Ir. Hendra Gunawan (Wali Murid)",
    role: "WALI",
    nisn: "0015678902",
    id_siswa: "SISWA-002"
  },
  {
    id_user: "USR-WALI-03",
    username: "0015678903",
    password: "123",
    nama: "Siti Rahmawati, S.Pd. (Wali Murid)",
    role: "WALI",
    nisn: "0015678903",
    id_siswa: "SISWA-003"
  },
  {
    id_user: "USR-WALI-04",
    username: "0015678904",
    password: "123",
    nama: "Agus Prasetyo (Wali Murid)",
    role: "WALI",
    nisn: "0015678904",
    id_siswa: "SISWA-004"
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id_siswa: "SISWA-001",
    nisn: "0015678901",
    nik: "3403011205160001",
    nama: "Muhammad Fatih Al-Farisi",
    tempat_lahir: "Gunungkidul",
    tanggal_lahir: "2016-05-12",
    jenis_kelamin: "L",
    kelas: "4A - Ali bin Abi Thalib",
    nama_wali: "H. Bambang Sulistyo",
    no_hp: "081234567801",
    alamat: "RT 03 / RW 01, Playen I, Playen, Gunungkidul",
    foto: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 500000,
    spp_kategori: "REGULER",
    spp_catatan: "SPP Reguler Standar Sekolah"
  },
  {
    id_siswa: "SISWA-002",
    nisn: "0015678902",
    nik: "3403015409170002",
    nama: "Aisyah Humaira Putri",
    tempat_lahir: "Yogyakarta",
    tanggal_lahir: "2017-09-14",
    jenis_kelamin: "P",
    kelas: "3B - Khadijah",
    nama_wali: "Ir. Hendra Gunawan",
    no_hp: "081398765402",
    alamat: "Logandeng, Playen, Gunungkidul",
    foto: "https://images.unsplash.com/photo-1595454223600-91fbdd774786?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 300000,
    spp_kategori: "BEASISWA",
    spp_catatan: "Beasiswa Prestasi Tahfidz 5 Juz (Keringanan Rp200.000/bln)"
  },
  {
    id_siswa: "SISWA-003",
    nisn: "0015678903",
    nik: "3403012201180003",
    nama: "Zaid Abdurrahman",
    tempat_lahir: "Wonosari",
    tanggal_lahir: "2018-01-22",
    jenis_kelamin: "L",
    kelas: "2A - Umar bin Khattab",
    nama_wali: "Siti Rahmawati, S.Pd.",
    no_hp: "081578912303",
    alamat: "Paliyan Tengah, Paliyan, Gunungkidul",
    foto: "https://images.unsplash.com/photo-1519456264917-42d0aa2e0625?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 500000,
    spp_kategori: "REGULER",
    spp_catatan: "SPP Reguler"
  },
  {
    id_siswa: "SISWA-004",
    nisn: "0015678904",
    nik: "3403016503190004",
    nama: "Fathimah Az-Zahra",
    tempat_lahir: "Sleman",
    tanggal_lahir: "2019-03-25",
    jenis_kelamin: "P",
    kelas: "1A - Abu Bakar Ash-Shiddiq",
    nama_wali: "Agus Prasetyo",
    no_hp: "081745678904",
    alamat: "Siyono Wetan, Logandeng, Playen",
    foto: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 250000,
    spp_kategori: "EKONOMI",
    spp_catatan: "Subsidi Khusus Du'afa & Yatim"
  },
  {
    id_siswa: "SISWA-005",
    nisn: "0015678905",
    nik: "3403011406150005",
    nama: "Ibrahim Al-Ghifari",
    tempat_lahir: "Gunungkidul",
    tanggal_lahir: "2015-06-14",
    jenis_kelamin: "L",
    kelas: "5A - Khalid bin Walid",
    nama_wali: "Drs. Joko Suwandi",
    no_hp: "081809123405",
    alamat: "Gading, Playen, Gunungkidul",
    foto: "https://images.unsplash.com/photo-1485290334039-a3c69043e517?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 500000,
    spp_kategori: "REGULER",
    spp_catatan: "SPP Reguler"
  },
  {
    id_siswa: "SISWA-006",
    nisn: "0015678906",
    nik: "3403012908140006",
    nama: "Maryam Salsabila",
    tempat_lahir: "Bantul",
    tanggal_lahir: "2014-08-29",
    jenis_kelamin: "P",
    kelas: "6A - Thariq bin Ziyad",
    nama_wali: "K.H. Mustofa",
    no_hp: "081328901206",
    alamat: "Nglipar, Gunungkidul",
    foto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status_aktif: true,
    spp_nominal: 500000,
    spp_kategori: "REGULER",
    spp_catatan: "SPP Reguler"
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id_transaksi: "TRX-2026-001",
    tanggal: "2026-09-02",
    nisn: "0015678901",
    nama_siswa: "Muhammad Fatih Al-Farisi",
    kelas: "4A - Ali bin Abi Thalib",
    jenis: "SPP Bulanan",
    kategori: "SPP",
    bulan: "September 2026",
    nominal_tagihan: 500000,
    nominal_bayar: 500000,
    sisa: 0,
    status: "LUNAS",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Pembayaran SPP September 2026 via Tunai di Kantor Bendahara"
  },
  {
    id_transaksi: "TRX-2026-002",
    tanggal: "2026-09-03",
    nisn: "0015678902",
    nama_siswa: "Aisyah Humaira Putri",
    kelas: "3B - Khadijah",
    jenis: "SPP Bulanan (SPP Khusus Beasiswa)",
    kategori: "SPP",
    bulan: "September 2026",
    nominal_tagihan: 300000,
    nominal_bayar: 300000,
    sisa: 0,
    status: "LUNAS",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Lunas SPP Khusus Beasiswa Tahfidz"
  },
  {
    id_transaksi: "TRX-2026-003",
    tanggal: "2026-09-05",
    nisn: "0015678903",
    nama_siswa: "Zaid Abdurrahman",
    kelas: "2A - Umar bin Khattab",
    jenis: "SPP Bulanan",
    kategori: "SPP",
    bulan: "September 2026",
    nominal_tagihan: 500000,
    nominal_bayar: 200000,
    sisa: 300000,
    status: "KURANG",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Cicilan 1 SPP September 2026, sisa Rp300.000 rencana akhir bulan"
  },
  {
    id_transaksi: "TRX-2026-004",
    tanggal: "2026-08-28",
    nisn: "0015678905",
    nama_siswa: "Ibrahim Al-Ghifari",
    kelas: "5A - Khalid bin Walid",
    jenis: "Infaq Pembangunan Mushola",
    kategori: "Infaq",
    nominal_tagihan: 1000000,
    nominal_bayar: 1000000,
    sisa: 0,
    status: "LUNAS",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Infaq Pembangunan Wakaf Mushola Tahfidz"
  },
  {
    id_transaksi: "TRX-2026-005",
    tanggal: "2026-09-01",
    nisn: "0015678904",
    nama_siswa: "Fathimah Az-Zahra",
    kelas: "1A - Abu Bakar Ash-Shiddiq",
    jenis: "SPP Bulanan (SPP Khusus Ekonomi)",
    kategori: "SPP",
    bulan: "September 2026",
    nominal_tagihan: 250000,
    nominal_bayar: 250000,
    sisa: 0,
    status: "LUNAS",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Lunas SPP Khusus Subsidi Ekonomi"
  },
  {
    id_transaksi: "TRX-2026-006",
    tanggal: "2026-08-30",
    nisn: "0015678903",
    nama_siswa: "Zaid Abdurrahman",
    kelas: "2A - Umar bin Khattab",
    jenis: "SPP Bulanan",
    kategori: "SPP",
    bulan: "Agustus 2026",
    nominal_tagihan: 500000,
    nominal_bayar: 500000,
    sisa: 0,
    status: "CANCEL",
    petugas: "Usth. Nur Khasanah",
    keterangan: "Pembatalan transaksi",
    alasan_batal: "Salah input nama murid, dana sebenarnya milik murid kelas sebelah"
  }
];

export const INITIAL_KEUANGAN: KeuanganRecord[] = [
  {
    id_keuangan: "KUG-001",
    tanggal: "2026-09-01",
    jenis: "MASUK",
    kategori: "Donasi",
    nominal: 5000000,
    keterangan: "Donasi Hamba Allah untuk Operasional Tahfidz Qur'an",
    bukti: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=150&auto=format&fit=crop&q=80",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-002",
    tanggal: "2026-09-02",
    jenis: "MASUK",
    kategori: "Infaq",
    nominal: 3500000,
    keterangan: "Infaq Jum'at Berkah Pengajian Wali Murid",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-003",
    tanggal: "2026-09-03",
    jenis: "MASUK",
    kategori: "Bantuan",
    nominal: 7500000,
    keterangan: "Bantuan Hibah Sarana Kitab Suci Al-Qur'an & Tajwid",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-004",
    tanggal: "2026-09-04",
    jenis: "KELUAR",
    kategori: "Gaji",
    nominal: 12000000,
    keterangan: "Honor Mengajar Ustadz/Ustadzah Tahfidz & Pengajar Bulan Berjalan",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-005",
    tanggal: "2026-09-06",
    jenis: "KELUAR",
    kategori: "Operasional",
    nominal: 1850000,
    keterangan: "Biaya Listrik PLN, Air PDAM, dan Internet Indihome Sekolah",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-006",
    tanggal: "2026-09-07",
    jenis: "KELUAR",
    kategori: "ATK",
    nominal: 850000,
    keterangan: "Pengadaan Kertas Ujian Tahfidz, Spidol Boardmarker, dan Buku Mutaba'ah",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  },
  {
    id_keuangan: "KUG-007",
    tanggal: "2026-09-08",
    jenis: "KELUAR",
    kategori: "Perawatan",
    nominal: 600000,
    keterangan: "Service & Cuci AC Ruang Kelas Tahfidz 1A dan 2A",
    bukti: "",
    petugas: "Usth. Nur Khasanah"
  }
];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id_log: "LOG-001",
    tanggal: "2026-09-02 08:35:10",
    user: "Usth. Nur Khasanah",
    aktivitas: "Input pembayaran SPP Murid M. Fatih Al-Farisi (NISN: 0015678901) senilai Rp500.000 (LUNAS)"
  },
  {
    id_log: "LOG-002",
    tanggal: "2026-09-03 10:14:22",
    user: "Usth. Nur Khasanah",
    aktivitas: "Input SPP Khusus Beasiswa Tahfidz Aisyah Humaira Putri senilai Rp300.000 (LUNAS)"
  },
  {
    id_log: "LOG-003",
    tanggal: "2026-09-05 13:40:05",
    user: "Usth. Nur Khasanah",
    aktivitas: "Input pembayaran cicilan SPP Zaid Abdurrahman Rp200.000, sisa tagihan Rp300.000 (KURANG)"
  },
  {
    id_log: "LOG-004",
    tanggal: "2026-09-06 09:20:00",
    user: "Usth. Nur Khasanah",
    aktivitas: "Input kas keluar kategori Operasional (Listrik/Air) senilai Rp1.850.000"
  },
  {
    id_log: "LOG-005",
    tanggal: "2026-09-07 14:12:45",
    user: "Ust. H. Ahmad Mufid, M.Pd.",
    aktivitas: "Kepala Sekolah login dan meninjau Laporan Rekapitulasi Keuangan Bulanan"
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id_pengumuman: "ANN-001",
    tanggal: "2026-09-08",
    judul: "Pemberitahuan Batas Pembayaran SPP Bulan September 2026",
    isi: "Assalamu'alaikum Warahmatullahi Wabarakatuh. Diberitahukan kepada seluruh Ayah/Bunda wali murid bahwa batas akhir penyetoran SPP bulan berjalan adalah tanggal 10 setiap bulannya. Pembayaran dapat melalui transfer BSI atau QRIS resmi sekolah. Jazakumullahu khairan.",
    penulis: "Bendahara Sekolah",
    is_penting: true
  },
  {
    id_pengumuman: "ANN-002",
    tanggal: "2026-09-05",
    judul: "Jadwal Evaluasi Tahfidz Qur'an Pekan Depan",
    isi: "Kegiatan Munaqasyah & Tasmi' Juz 30 dan Juz 29 akan dilaksanakan pada hari Senin-Rabu pekan depan. Mohon Ayah/Bunda senantiasa memotivasi muraja'ah ananda di rumah.",
    penulis: "Koordinator Tahfidz & Keuangan",
    is_penting: false
  }
];

export const INITIAL_KATEGORI_DANA: KategoriDana[] = [
  { id_kategori: "KAT-SPP", nama_kategori: "SPP", keterangan: "Dana penerimaan syahriah / SPP bulanan santri", status_aktif: true },
  { id_kategori: "KAT-DONASI", nama_kategori: "Donasi & Infaq", keterangan: "Penerimaan donasi, infaq, dan sedekah", status_aktif: true },
  { id_kategori: "KAT-TABUNGAN", nama_kategori: "Tabungan Siswa", keterangan: "Titipan tabungan santri", status_aktif: true },
  { id_kategori: "KAT-KANTIN", nama_kategori: "Kantin & Koperasi", keterangan: "Pengelolaan kas unit kantin sekolah", status_aktif: true },
  { id_kategori: "KAT-GEDUNG", nama_kategori: "Uang Gedung", keterangan: "Pengembangan sarana & prasarana", status_aktif: true },
  { id_kategori: "KAT-BOS", nama_kategori: "Bantuan / BOS", keterangan: "Bantuan operasional sekolah", status_aktif: true },
  { id_kategori: "KAT-OPERASIONAL", nama_kategori: "Operasional", keterangan: "Biaya operasional harian sekolah", status_aktif: true },
  { id_kategori: "KAT-LAIN", nama_kategori: "Lain-lain", keterangan: "Penerimaan & pengeluaran lain-lain", status_aktif: true }
];
