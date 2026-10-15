const fs = require('fs');
const vm = require('vm');

console.log("=== PEMERIKSAAN SINTAKS OTOMATIS KODE GOOGLE APPS SCRIPT (Code.gs) ===");

// 1. Ekstrak teks GOOGLE_APPS_SCRIPT_CODE dari src/services/gasBackendCode.ts
const content = fs.readFileSync('src/services/gasBackendCode.ts', 'utf8');
const startIdx = content.indexOf('export const GOOGLE_APPS_SCRIPT_CODE = `');
if (startIdx === -1) {
  console.error("FATAL: GOOGLE_APPS_SCRIPT_CODE tidak ditemukan di src/services/gasBackendCode.ts");
  process.exit(1);
}

const snippet = content.substring(startIdx).replace('export const GOOGLE_APPS_SCRIPT_CODE', 'var GOOGLE_APPS_SCRIPT_CODE');
let code = '';
try {
  eval(snippet);
  code = GOOGLE_APPS_SCRIPT_CODE;
} catch (err) {
  console.error("FATAL: Gagal mengevaluasi template literal:", err);
  process.exit(1);
}

let hasError = false;

console.log(`- Ukuran kode yang akan disalin: ${code.length} karakter`);
const lines = code.split('\n');
console.log(`- Jumlah baris kode Apps Script: ${lines.length} baris`);

// 2. Uji dengan new vm.Script (Deteksi SyntaxError global, termasuk "return" di luar fungsi)
try {
  new vm.Script(code, { filename: 'Code.gs' });
  console.log("✓ [1/3] new vm.Script(code): LULUS (Tidak ada SyntaxError global / return nyasar di luar fungsi)");
} catch (err) {
  hasError = true;
  console.error("✗ [1/3] new vm.Script(code) GAGAL:");
  console.error(err.stack || err.message);
}

// 3. Uji dengan new Function(code) (Persis seperti yang dijalankan browser saat tombol 'Salin' diklik)
try {
  new Function(code);
  console.log("✓ [2/3] new Function(code): LULUS (Lolos parsing JavaScript standar browser)");
} catch (err) {
  hasError = true;
  console.error("✗ [2/3] new Function(code) GAGAL:");
  console.error(err.stack || err.message);
}

// 4. Verifikasi fungsi-fungsi kritis dan tidak ada baris string rusak
const requiredFunctions = [
  'function perbaikiSemuaHeader',
  'function doGet',
  'function doPost',
  'function checkAndInitSheets',
  'function handleProcessPayment',
  'function handleSyncAllData'
];

let missingFuncs = [];
for (const fn of requiredFunctions) {
  if (!code.includes(fn)) {
    missingFuncs.push(fn);
  }
}

if (missingFuncs.length > 0) {
  hasError = true;
  console.error("✗ [3/3] Fungsi kritis hilang:", missingFuncs);
} else {
  console.log("✓ [3/3] Integritas fungsi backend: LULUS (Semua fungsi utama terdefinisi)");
}

// 5. Cek baris perbaikiSemuaHeader Logger.log
const pshIdx = lines.findIndex(l => l.includes("Hasil perbaikiSemuaHeader"));
if (pshIdx !== -1) {
  console.log(`- Format baris Logger.log perbaikiSemuaHeader (baris ${pshIdx + 1}):`);
  console.log(`  "${lines[pshIdx]}"`);
  if (lines[pshIdx].includes("\n") || lines[pshIdx + 1].includes("report.join")) {
    hasError = true;
    console.error("✗ Terdeteksi pemisah baris di tengah string perbaikiSemuaHeader!");
  } else {
    console.log("✓ Baris Logger.log perbaikiSemuaHeader utuh dalam 1 baris!");
  }
}

if (hasError) {
  console.error("\n[GAGAL] Kode Apps Script memiliki kesalahan sintaks. JANGAN deploy atau salin!");
  process.exit(1);
} else {
  console.log("\n[SUKSES] Seluruh pemeriksaan sintaks BERHASIL tanpa error!");
  process.exit(0);
}
