/**
 * =========================================================================
 * KONFIGURASI SISTEM INFORMASI KEUANGAN SEKOLAH
 * SD QUR'AN UNGGULAN AL-I'TISHAM PLAYEN GUNUNGKIDUL
 * =========================================================================
 * Nilai konstanta ini memastikan setiap perangkat baru (laptop bendahara,
 * HP wali murid, laptop kepala sekolah) langsung otomatis terhubung ke
 * Google Apps Script dan Google Spreadsheet tanpa perlu mengetik manual
 * URL Web App atau ID Spreadsheet di menu Pengaturan.
 */

/**
 * VERSI BUILD FRONTEND:
 * Timestamp versi deployment kode frontend (format: "YYYY-MM-DD-HHmm").
 * Update konstanta ini setiap kali Anda merilis perubahan frontend penting.
 * Sistem akan membandingkan nilai ini dengan versi di localStorage setiap
 * pengunjung. Jika berbeda, browser akan otomatis me-reload halaman SEKALI
 * dengan cache-bypass sehingga pengguna langsung menerima kode terbaru.
 */
export const APP_BUILD_VERSION = "2026-09-13-1530";

export const APP_CONFIG = {
  BUILD_VERSION: APP_BUILD_VERSION,
  NAMA_SEKOLAH: "SD Qur'an Unggulan Al-I'tisham Playen",
  TAHUN_AJARAN: "2026/2027",

  DEFAULT_GAS_URL:
    ((import.meta as any).env?.VITE_GAS_URL as string) ||
    "https://script.google.com/macros/s/AKfycbwRzcHdPa72RpjzIzYemkYn69pxSygxF2V4N1VekKNiJINXbO5Ps8gm2o-C9bOs6xdGOg/exec",

  DEFAULT_SPREADSHEET_ID:
    ((import.meta as any).env?.VITE_SPREADSHEET_ID as string) ||
    "1aY7rraSzxK6SWYnAed197jsQMSZN6vlN-RvasU48-lk",

  DEFAULT_DRIVE_FOLDER_ID:
    ((import.meta as any).env?.VITE_DRIVE_FOLDER_ID as string) ||
    "10URYW8mPFqgnO0z2Ox1DUwz9Uc1q-enw",

  POLLING_INTERVAL_MS: 12000,
};
