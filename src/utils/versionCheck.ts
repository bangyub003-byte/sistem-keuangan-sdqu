import { APP_BUILD_VERSION } from '../config';
import { StorageService } from '../services/storageService';

/**
 * =========================================================================
 * DETEKSI OTOMATIS VERSI FRONTEND BARU (AUTO CACHE-BUSTING)
 * =========================================================================
 * Memeriksa apakah versi kode frontend yang sedang berjalan (APP_BUILD_VERSION)
 * berbeda dengan versi yang tersimpan di localStorage dari kunjungan sebelumnya.
 *
 * Jika terdeteksi versi baru:
 * 1. Simpan versi baru ke localStorage agar tidak terjadi perulangan (loop).
 * 2. Paksa reload SEKALI melewati cache browser dengan menambahkan query
 *    string timestamp unik (?_v=...) dan window.location.replace.
 * 3. Jika versi sudah sama dan URL masih memiliki param ?_v=..., bersihkan
 *    URL kembali tanpa me-refresh halaman.
 *
 * @returns {boolean} true jika reload sedang dipicu, false jika versi sudah cocok.
 */
export function checkFrontendBuildVersion(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const storedVersion = StorageService.getAppBuildVersion();

    // Jika versi kode saat ini berbeda dengan versi yang tersimpan di browser
    if (storedVersion !== APP_BUILD_VERSION) {
      console.log(
        `[Frontend Update] Versi frontend baru terdeteksi: "${APP_BUILD_VERSION}" (versi sebelumnya: "${storedVersion || 'kunjungan awal'}").`
      );

      // Simpan versi baru terlebih dahulu ke localStorage sebelum reload agar reload hanya terjadi SEKALI
      StorageService.setAppBuildVersion(APP_BUILD_VERSION);

      // Deteksi apakah perangkat ini pernah mengunjungi aplikasi sebelumnya
      const hasPreviousVisit = Boolean(
        storedVersion ||
        localStorage.getItem('sdq_setting_v1') ||
        localStorage.getItem('sdq_users_v1') ||
        localStorage.getItem('sdq_students_v1')
      );

      // Jika pernah berkunjung, lakukan reload bypass cache
      if (hasPreviousVisit) {
        const targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set('_v', Date.now().toString());
        window.location.replace(targetUrl.toString());
        return true;
      }
    } else {
      // Jika versi sudah cocok, rapikan URL jika terdapat query parameter cache-buster (_v)
      if (window.location.search.includes('_v=')) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('_v');
        window.history.replaceState(
          {},
          document.title,
          cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : '') + cleanUrl.hash
        );
      }
    }
  } catch (err) {
    console.warn('[Frontend Update] Gagal memeriksa versi build frontend:', err);
  }

  return false;
}
