export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * SISTEM INFORMASI KEUANGAN SD QUR'AN UNGGULAN AL-I'TISHAM PLAYEN
 * Terintegrasi Google Spreadsheet & Google Drive
 * Arsitektur: Single-Pipeline CRUD, Versioned Realtime Sync & Logging
 * =========================================================================
 */

// 1. Inisialisasi Nama Spreadsheet & Sheet
var SPREADSHEET_ID = ""; // Kosongkan jika script terpasang langsung di spreadsheet (Container-Bound)
var DRIVE_FOLDER_ID = ""; // ID Folder Google Drive untuk bukti transaksi & foto murid (Opsional)

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Versioning helper untuk sinkronisasi antar perangkat tanpa membebani spreadsheet
 */
function getVersion() {
  var props = PropertiesService.getScriptProperties();
  var ver = props.getProperty("DATA_VERSION");
  if (!ver) {
    ver = String(new Date().getTime());
    props.setProperty("DATA_VERSION", ver);
  }
  return ver;
}

function bumpVersion() {
  var ver = String(new Date().getTime());
  PropertiesService.getScriptProperties().setProperty("DATA_VERSION", ver);
  return ver;
}

/**
 * Trigger otomatis jika admin mengedit spreadsheet langsung via antarmuka Google Sheet
 */
function onEdit(e) {
  try {
    bumpVersion();
  } catch (err) {}
}

/**
 * Handler installable trigger saat ada perubahan pada spreadsheet
 */
function onEditTrigger(e) {
  try {
    bumpVersion();
    Logger.log("onEditTrigger: bumpVersion berhasil dipicu oleh perubahan di Spreadsheet.");
  } catch (err) {
    Logger.log("Gagal bumpVersion pada onEditTrigger: " + err.toString());
  }
}

/**
 * Memasang installable trigger onEdit jika belum ada
 */
function setupInstallableTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var exists = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "onEditTrigger") {
        exists = true;
        break;
      }
    }
    if (!exists) {
      var ss = getSpreadsheet();
      ScriptApp.newTrigger("onEditTrigger")
        .forSpreadsheet(ss)
        .onEdit()
        .create();
      Logger.log("Installable trigger onEditTrigger berhasil dibuat.");
    }
  } catch (e) {
    Logger.log("Peringatan saat setup trigger: " + e.toString());
  }
}

/**
 * Fungsi Perbaikan Otomatis Seluruh Header Sheet (Baris 1) & Sinkronisasi Trigger
 * Dapat dipanggil dari antarmuka Apps Script editor tanpa menghapus data yang ada.
 */
function perbaikiSemuaHeader() {
  var ss = getSpreadsheet();
  var requiredSheets = {
    "USER": ["id_user", "username", "password", "nama", "role", "id_siswa", "nisn"],
    "SISWA": ["id_siswa", "nisn", "nik", "nama", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "kelas", "nama_wali", "no_hp", "alamat", "foto", "spp_nominal", "spp_kategori", "spp_catatan", "status_aktif", "spp_mulai_bulan", "spp_mulai_tahun"],
    "TRANSAKSI": ["id_transaksi", "tanggal", "nisn", "nama_siswa", "kelas", "jenis", "kategori", "bulan", "nominal_tagihan", "nominal_bayar", "sisa", "status", "petugas", "keterangan", "alasan_batal", "waktu"],
    "KEUANGAN": ["id_keuangan", "tanggal", "jenis", "kategori", "nominal", "keterangan", "bukti", "petugas", "status", "alasan_batal", "id_kategori", "waktu"],
    "SETTING": ["nama_sekolah", "logo", "alamat", "no_wa", "kop_surat", "tahun_ajaran", "nama_kepsek", "nama_bendahara", "spp_default_nominal", "nama_bank", "no_rekening", "atas_nama_rekening", "qris_image", "spp_mulai_bulan", "spp_mulai_tahun"],
    "PENGUMUMAN": ["id_pengumuman", "tanggal", "judul", "isi", "penulis", "is_penting", "status_aktif"],
    "KATEGORI_DANA": ["id_kategori", "nama_kategori", "keterangan", "status_aktif"],
    "LOG": ["tanggal", "user", "aktivitas"]
  };

  var report = [];

  for (var sheetName in requiredSheets) {
    var sheet = ss.getSheetByName(sheetName);
    var expectedHeaders = requiredSheets[sheetName];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(expectedHeaders);
      var headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
      headerRange.setFontWeight("bold").setBackground("#047857").setFontColor("#FFFFFF");
      report.push("Sheet dibuat: " + sheetName);

      if (sheetName === "USER") {
        sheet.appendRow(["USR-001", "bendahara", "123", "Usth. Nur Khasanah (Bendahara)", "BENDAHARA", "", ""]);
        sheet.appendRow(["USR-002", "kepsek", "123", "Ust. H. Ahmad Mufid (Kepala Sekolah)", "KEPSEK", "", ""]);
      } else if (sheetName === "KATEGORI_DANA") {
        var defaultKategori = [
          ["KAT-SPP", "SPP", "Dana penerimaan syahriah / SPP bulanan santri", true],
          ["KAT-DONASI", "Donasi & Infaq", "Penerimaan donasi, infaq, dan sedekah", true],
          ["KAT-TABUNGAN", "Tabungan Siswa", "Titipan tabungan santri", true],
          ["KAT-KANTIN", "Kantin & Koperasi", "Pengelolaan kas unit kantin sekolah", true],
          ["KAT-GEDUNG", "Uang Gedung", "Pengembangan sarana & prasarana", true],
          ["KAT-BOS", "Bantuan / BOS", "Bantuan operasional sekolah", true],
          ["KAT-OPERASIONAL", "Operasional", "Biaya operasional harian sekolah", true],
          ["KAT-LAIN", "Lain-lain", "Penerimaan & pengeluaran lain-lain", true]
        ];
        defaultKategori.forEach(function(r) { sheet.appendRow(r); });
      }
    } else {
      var lastCol = Math.max(sheet.getLastColumn(), expectedHeaders.length);
      var currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      var needsUpdate = false;

      if (currentHeaders.length < expectedHeaders.length) {
        needsUpdate = true;
      } else {
        for (var h = 0; h < expectedHeaders.length; h++) {
          if (String(currentHeaders[h] || "").trim().toLowerCase() !== expectedHeaders[h].toLowerCase()) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        var headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
        headerRange.setFontWeight("bold").setBackground("#047857").setFontColor("#FFFFFF");
        report.push("Header baris 1 diperbaiki: " + sheetName);
      } else {
        report.push("Header valid: " + sheetName);
      }

      if (sheetName === "KATEGORI_DANA" && sheet.getLastRow() <= 1) {
        var defaultKategori = [
          ["KAT-SPP", "SPP", "Dana penerimaan syahriah / SPP bulanan santri", true],
          ["KAT-DONASI", "Donasi & Infaq", "Penerimaan donasi, infaq, dan sedekah", true],
          ["KAT-TABUNGAN", "Tabungan Siswa", "Titipan tabungan santri", true],
          ["KAT-KANTIN", "Kantin & Koperasi", "Pengelolaan kas unit kantin sekolah", true],
          ["KAT-GEDUNG", "Uang Gedung", "Pengembangan sarana & prasarana", true],
          ["KAT-BOS", "Bantuan / BOS", "Bantuan operasional sekolah", true],
          ["KAT-OPERASIONAL", "Operasional", "Biaya operasional harian sekolah", true],
          ["KAT-LAIN", "Lain-lain", "Penerimaan & pengeluaran lain-lain", true]
        ];
        defaultKategori.forEach(function(r) { sheet.appendRow(r); });
        report.push("Data default KATEGORI_DANA diisi");
      }
    }
  }

  setupInstallableTrigger();
  bumpVersion();
  Logger.log("Hasil perbaikiSemuaHeader:\n" + report.join("\n"));
  return { status: "success", report: report, version: getVersion() };
}

/**
 * Endpoint HTTP GET: Untuk polling getVersion (ringan), ping, & getAllData
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAllData";
  var result = {};

  try {
    if (action === "ping") {
      result = {
        status: "success",
        message: "Koneksi Google Apps Script SD Qur'an Unggulan Al-I'tisham Playen Aktif!",
        version: getVersion(),
        timestamp: new Date().toISOString()
      };
    } else if (action === "getVersion") {
      // Endpoint ringan: Hanya membaca PropertiesService tanpa menyentuh Spreadsheet
      result = {
        status: "success",
        version: getVersion()
      };
    } else if (action === "getAllData" || action === "getData") {
      var allData = fetchAllSheetsData();
      result = {
        status: "success",
        version: getVersion(),
        message: "Data seluruh sheet berhasil dimuat dari Spreadsheet!",
        students: allData.students,
        transactions: allData.transactions,
        keuangan: allData.keuangan,
        kategori_dana: allData.kategori_dana,
        setting: allData.settings,
        settings: allData.settings,
        users: allData.users,
        announcements: allData.announcements,
        logs: allData.logs,
        data: allData
      };
    } else if (action === "perbaikiSemuaHeader") {
      result = perbaikiSemuaHeader();
    } else {
      result = { status: "error", message: "Action tidak dikenal: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint HTTP POST: Menangani Seluruh Operasi Tulis (CRUD Spesifik Satu Jalur)
 */
function doPost(e) {
  var response = {};
  try {
    var rawData = e && e.postData ? e.postData.contents : "{}";
    var request = JSON.parse(rawData);
    var action = request.action;
    var payload = request.payload || {};

    // Validasi Hak Akses (RBAC): Cegah KEPSEK / WALI melakukan aksi tulis/modifikasi
    var writeActions = [
      "ADD_STUDENT", "UPDATE_STUDENT", "DELETE_STUDENT", "BULK_IMPORT_STUDENTS",
      "PROCESS_PAYMENT", "CANCEL_PAYMENT", "VERIFY_TRANSACTION", "UPDATE_TRANSACTION_STATUS",
      "ADD_KEUANGAN", "CANCEL_KEUANGAN", "UPDATE_SETTING",
      "ADD_ANNOUNCEMENT", "TOGGLE_ANNOUNCEMENT", "DELETE_ANNOUNCEMENT",
      "ADD_KATEGORI_DANA", "UPDATE_KATEGORI_DANA", "UPLOAD_DRIVE_FILE"
    ];

    var userRole = (payload.operator_role || payload.role || "").toString().toUpperCase();
    if (writeActions.indexOf(action) > -1) {
      if (userRole === "WALI" || userRole === "KEPSEK") {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Akses ditolak: Role " + userRole + " hanya memiliki akses baca (read-only) dan tidak diizinkan mengubah data!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var ss = getSpreadsheet();
    checkAndInitSheets(ss);

    switch (action) {
      case "LOGIN":
        response = handleLogin(ss, payload);
        break;

      case "ADD_STUDENT":
        response = handleAddStudent(ss, payload);
        break;

      case "UPDATE_STUDENT":
        response = handleUpdateStudent(ss, payload);
        break;

      case "UPDATE_WALI_CONTACT":
        response = handleUpdateWaliContact(ss, payload);
        break;

      case "DELETE_STUDENT":
        response = handleDeleteStudent(ss, payload);
        break;

      case "BULK_IMPORT_STUDENTS":
        response = handleBulkImportStudents(ss, payload);
        break;

      case "PROCESS_PAYMENT":
        response = handleProcessPayment(ss, payload);
        break;

      case "CANCEL_PAYMENT":
        response = handleCancelPayment(ss, payload);
        break;

      case "VERIFY_TRANSACTION":
      case "UPDATE_TRANSACTION_STATUS":
        response = handleVerifyTransaction(ss, payload);
        break;

      case "ADD_KEUANGAN":
        response = handleAddKeuangan(ss, payload);
        break;

      case "CANCEL_KEUANGAN":
        response = handleCancelKeuangan(ss, payload);
        break;

      case "ADD_KATEGORI_DANA":
        response = handleAddKategoriDana(ss, payload);
        break;

      case "UPDATE_KATEGORI_DANA":
        response = handleUpdateKategoriDana(ss, payload);
        break;

      case "UPDATE_SETTING":
        response = handleUpdateSetting(ss, payload);
        break;

      case "ADD_ANNOUNCEMENT":
        response = handleAddAnnouncement(ss, payload);
        break;

      case "TOGGLE_ANNOUNCEMENT":
        response = handleToggleAnnouncement(ss, payload);
        break;

      case "DELETE_ANNOUNCEMENT":
        response = handleDeleteAnnouncement(ss, payload);
        break;

      case "UPLOAD_DRIVE_FILE":
        response = handleUploadFile(payload);
        break;

      case "PERBAIKI_HEADER":
      case "PERBAIKI_SEMUA_HEADER":
        response = perbaikiSemuaHeader();
        break;

      case "SYNC_ALL_DATA":
      case "SYNC_ALL":
      case "PULL_DATA":
      case "GET_ALL_DATA":
        response = handleSyncAllData(ss, payload);
        break;

      default:
        response = { status: "error", message: "Action tidak didukung: " + action };
    }

  } catch (error) {
    response = { status: "error", message: error.toString() };
  }

  // Sertakan version terbaru pada setiap response sukses
  try {
    if (response && response.status === "success") {
      response.version = getVersion();
    }
  } catch (err) {}

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1. Otomatis membuat 8 Sheet resmi jika belum tersedia di Spreadsheet
 */
function checkAndInitSheets(ss) {
  var requiredSheets = {
    "USER": ["id_user", "username", "password", "nama", "role", "id_siswa", "nisn"],
    "SISWA": ["id_siswa", "nisn", "nik", "nama", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "kelas", "nama_wali", "no_hp", "alamat", "foto", "spp_nominal", "spp_kategori", "spp_catatan", "status_aktif", "spp_mulai_bulan", "spp_mulai_tahun"],
    "TRANSAKSI": ["id_transaksi", "tanggal", "nisn", "nama_siswa", "kelas", "jenis", "kategori", "bulan", "nominal_tagihan", "nominal_bayar", "sisa", "status", "petugas", "keterangan", "alasan_batal", "waktu"],
    "KEUANGAN": ["id_keuangan", "tanggal", "jenis", "kategori", "nominal", "keterangan", "bukti", "petugas", "status", "alasan_batal", "id_kategori", "waktu"],
    "SETTING": ["nama_sekolah", "logo", "alamat", "no_wa", "kop_surat", "tahun_ajaran", "nama_kepsek", "nama_bendahara", "spp_default_nominal", "nama_bank", "no_rekening", "atas_nama_rekening", "qris_image", "spp_mulai_bulan", "spp_mulai_tahun"],
    "PENGUMUMAN": ["id_pengumuman", "tanggal", "judul", "isi", "penulis", "is_penting", "status_aktif"],
    "KATEGORI_DANA": ["id_kategori", "nama_kategori", "keterangan", "status_aktif"],
    "LOG": ["tanggal", "user", "aktivitas"]
  };

  for (var sheetName in requiredSheets) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(requiredSheets[sheetName]);
      var headerRange = sheet.getRange(1, 1, 1, requiredSheets[sheetName].length);
      headerRange.setFontWeight("bold").setBackground("#047857").setFontColor("#FFFFFF");

      if (sheetName === "USER") {
        sheet.appendRow(["USR-001", "bendahara", "123", "Usth. Nur Khasanah (Bendahara)", "BENDAHARA", "", ""]);
        sheet.appendRow(["USR-002", "kepsek", "123", "Ust. H. Ahmad Mufid (Kepala Sekolah)", "KEPSEK", "", ""]);
      }
      if (sheetName === "KATEGORI_DANA") {
        var defaultKategori = [
          ["KAT-SPP", "SPP", "Dana penerimaan syahriah / SPP bulanan santri", true],
          ["KAT-DONASI", "Donasi & Infaq", "Penerimaan donasi, infaq, dan sedekah", true],
          ["KAT-TABUNGAN", "Tabungan Siswa", "Titipan tabungan santri", true],
          ["KAT-KANTIN", "Kantin & Koperasi", "Pengelolaan kas unit kantin sekolah", true],
          ["KAT-GEDUNG", "Uang Gedung", "Pengembangan sarana & prasarana", true],
          ["KAT-BOS", "Bantuan / BOS", "Bantuan operasional sekolah", true],
          ["KAT-OPERASIONAL", "Operasional", "Biaya operasional harian sekolah", true],
          ["KAT-LAIN", "Lain-lain", "Penerimaan & pengeluaran lain-lain", true]
        ];
        defaultKategori.forEach(function(r) { sheet.appendRow(r); });
      }
      if (sheetName === "SETTING") {
        sheet.appendRow([
          "SD Qur'an Unggulan Al-I'tisham Playen",
          "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80",
          "Jl. Playen - Paliyan KM 1.5, Playen, Gunungkidul, D.I. Yogyakarta 55861",
          "0812-2889-1945",
          "SD QUR'AN UNGGULAN AL-I'TISHAM PLAYEN\\nJl. Playen - Paliyan KM 1.5, Playen, Gunungkidul",
          "2026/2027",
          "Ust. H. Ahmad Mufid, M.Pd.",
          "Usth. Nur Khasanah, S.E.I.",
          500000,
          "Bank Syariah Indonesia (BSI)",
          "7188 9922 11",
          "SDQU AL-I'TISHAM PLAYEN",
          "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=SDQU_AL_ITISHAM_QRIS"
        ]);
      }
    }
  }
}

/**
 * 2. Mengambil seluruh data dari 8 Sheet
 */
function fetchAllSheetsData() {
  var ss = getSpreadsheet();
  checkAndInitSheets(ss);

  return {
    users: getSheetRows(ss, "USER"),
    students: getSheetRows(ss, "SISWA"),
    transactions: getSheetRows(ss, "TRANSAKSI"),
    keuangan: getSheetRows(ss, "KEUANGAN"),
    kategori_dana: getSheetRows(ss, "KATEGORI_DANA"),
    settings: getSheetRows(ss, "SETTING")[0] || null,
    announcements: getSheetRows(ss, "PENGUMUMAN"),
    logs: getSheetRows(ss, "LOG")
  };
}

function getSheetRows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var rawHeader = headers[j] ? headers[j].toString().trim() : "";
      if (!rawHeader) continue;

      var normalizedKey = rawHeader.toLowerCase().replace(/[\\s\\-_]+/g, "_");
      if (normalizedKey === "kepala_sekolah" || normalizedKey === "nama_kepala_sekolah" || normalizedKey === "kepsek") {
        normalizedKey = "nama_kepsek";
      } else if (normalizedKey === "bendahara" || normalizedKey === "nama_bendahara") {
        normalizedKey = "nama_bendahara";
      } else if (normalizedKey === "sekolah" || normalizedKey === "nama_sekolah") {
        normalizedKey = "nama_sekolah";
      } else if (normalizedKey === "ta" || normalizedKey === "tahun_ajaran") {
        normalizedKey = "tahun_ajaran";
      } else if (normalizedKey === "rekening" || normalizedKey === "no_rekening" || normalizedKey === "norek" || normalizedKey === "nomor_rekening") {
        normalizedKey = "no_rekening";
      } else if (normalizedKey === "bank" || normalizedKey === "nama_bank") {
        normalizedKey = "nama_bank";
      } else if (normalizedKey === "atas_nama" || normalizedKey === "atas_nama_rekening" || normalizedKey === "pemilik_rekening") {
        normalizedKey = "atas_nama_rekening";
      } else if (normalizedKey === "qris" || normalizedKey === "qris_image" || normalizedKey === "gambar_qris") {
        normalizedKey = "qris_image";
      }

      var cellVal = data[i][j];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }
      row[normalizedKey] = cellVal;
      row[rawHeader] = cellVal;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * 3. Handle Login
 */
function handleLogin(ss, payload) {
  var users = getSheetRows(ss, "USER");
  var username = String(payload.username || "").trim().toLowerCase();
  var password = String(payload.password || "").trim();

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var uName = String(u.username || "").trim().toLowerCase();
    var uPass = String(u.password || "").trim();

    if (uName === username && uPass === password) {
      appendLog(ss, u.nama, "Berhasil masuk sistem (Login) sebagai " + u.role);
      return {
        status: "success",
        user: {
          id_user: u.id_user,
          username: u.username,
          nama: u.nama,
          role: u.role,
          id_siswa: u.id_siswa,
          nisn: u.nisn || u.username
        }
      };
    }
  }
  return { status: "error", message: "Username atau Password salah!" };
}

function getSettingDefaultSpp(ss) {
  try {
    var settings = getSheetRows(ss, "SETTING");
    if (settings && settings.length > 0) {
      var s = settings[0];
      var nom = Number(s.spp_default_nominal);
      if (nom && !isNaN(nom) && nom > 0) return nom;
    }
  } catch (e) {}
  return 85000;
}

/**
 * 4. Tambah, Update, Delete & Import Murid
 */
function handleAddStudent(ss, student) {
  var sheet = ss.getSheetByName("SISWA");
  var newId = student.id_siswa || ("SISWA-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss"));

  var sppNominal = Number(student.spp_nominal);
  if (!sppNominal || isNaN(sppNominal) || sppNominal <= 0) {
    sppNominal = getSettingDefaultSpp(ss);
  }

  var cleanNisn = String(student.nisn || "").trim();
  var cleanNik = String(student.nik || "").trim();
  var loginIdentifier = cleanNisn || cleanNik;

  sheet.appendRow([
    newId,
    cleanNisn,
    cleanNik,
    student.nama,
    student.tempat_lahir || "Gunungkidul",
    student.tanggal_lahir || "2017-01-01",
    student.jenis_kelamin || "L",
    student.kelas || "1A",
    student.nama_wali || "",
    student.no_hp || "",
    student.alamat || "",
    student.foto || "",
    student.spp_nominal ? sppNominal : getSettingDefaultSpp(ss),
    student.spp_kategori || "REGULER",
    student.spp_catatan || "",
    student.status_aktif !== false,
    student.spp_mulai_bulan || "",
    student.spp_mulai_tahun || ""
  ]);

  // Otomatis buat akun wali di sheet USER jika belum ada (gunakan NISN, fallback ke NIK)
  var userSheet = ss.getSheetByName("USER");
  if (userSheet && loginIdentifier) {
    var users = getSheetRows(ss, "USER");
    var exists = false;
    for (var u = 0; u < users.length; u++) {
      var uName = String(users[u].username || "").trim().toLowerCase();
      if (uName === loginIdentifier.toLowerCase()) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      userSheet.appendRow([
        "USR-" + loginIdentifier,
        loginIdentifier,
        loginIdentifier,
        (student.nama_wali || "Wali") + " (Wali " + student.nama + ")",
        "WALI",
        newId,
        cleanNisn
      ]);
    }
  }

  appendLog(ss, student.petugas || "Bendahara", "Menambah murid baru: " + student.nama + " (" + (cleanNisn ? "NISN: " + cleanNisn : "NIK: " + cleanNik) + ")");
  bumpVersion();

  return { status: "success", id_siswa: newId, message: "Data murid dan akun wali berhasil disimpan ke Spreadsheet!" };
}

function handleUpdateStudent(ss, student) {
  var sheet = ss.getSheetByName("SISWA");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(student.id_siswa).trim() || String(data[i][1]).trim() === String(student.nisn).trim() || (student.nik && String(data[i][2]).trim() === String(student.nik).trim())) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 3).setValue(student.nik || "");
      sheet.getRange(rowIdx, 4).setValue(student.nama);
      sheet.getRange(rowIdx, 5).setValue(student.tempat_lahir || "");
      sheet.getRange(rowIdx, 6).setValue(student.tanggal_lahir || "");
      sheet.getRange(rowIdx, 7).setValue(student.jenis_kelamin || "L");
      sheet.getRange(rowIdx, 8).setValue(student.kelas || "");
      sheet.getRange(rowIdx, 9).setValue(student.nama_wali || "");
      sheet.getRange(rowIdx, 10).setValue(student.no_hp || "");
      sheet.getRange(rowIdx, 11).setValue(student.alamat || "");
      if (student.foto) sheet.getRange(rowIdx, 12).setValue(student.foto);
      sheet.getRange(rowIdx, 13).setValue(Number(student.spp_nominal) || getSettingDefaultSpp(ss));
      sheet.getRange(rowIdx, 14).setValue(student.spp_kategori || "REGULER");
      sheet.getRange(rowIdx, 15).setValue(student.spp_catatan || "");
      if (student.status_aktif !== undefined) sheet.getRange(rowIdx, 16).setValue(student.status_aktif);
      if (student.spp_mulai_bulan !== undefined) sheet.getRange(rowIdx, 17).setValue(student.spp_mulai_bulan || "");
      if (student.spp_mulai_tahun !== undefined) sheet.getRange(rowIdx, 18).setValue(student.spp_mulai_tahun || "");

      appendLog(ss, student.petugas || "Bendahara", "Memperbarui data murid: " + student.nama);
      bumpVersion();
      return { status: "success", message: "Data murid berhasil diperbarui di Spreadsheet!" };
    }
  }
  return { status: "error", message: "Data murid tidak ditemukan di Spreadsheet" };
}

function handleDeleteStudent(ss, payload) {
  var sheet = ss.getSheetByName("SISWA");
  var data = sheet.getDataRange().getValues();
  var target = String(payload.id_siswa || payload.nisn || payload.nik || "").trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === target || String(data[i][1]).trim() === target || String(data[i][2]).trim() === target) {
      var studentName = data[i][3];
      var studentNisn = data[i][1];
      var studentNik = data[i][2];
      sheet.deleteRow(i + 1);

      // Hapus juga akun wali dari USER (cek nisn dan nik)
      var userSheet = ss.getSheetByName("USER");
      if (userSheet) {
        var uData = userSheet.getDataRange().getValues();
        for (var u = 1; u < uData.length; u++) {
          var uN = String(uData[u][1]).trim();
          if ((studentNisn && uN === String(studentNisn).trim()) || (studentNik && uN === String(studentNik).trim())) {
            userSheet.deleteRow(u + 1);
            break;
          }
        }
      }

      appendLog(ss, payload.petugas || "Bendahara", "Menghapus murid: " + studentName + " (" + (studentNisn ? "NISN: " + studentNisn : "NIK: " + studentNik) + ")");
      bumpVersion();
      return { status: "success", message: "Murid berhasil dihapus dari Spreadsheet!" };
    }
  }
  return { status: "error", message: "Murid tidak ditemukan di Sheet SISWA" };
}

function handleBulkImportStudents(ss, payload) {
  var sheet = ss.getSheetByName("SISWA");
  var userSheet = ss.getSheetByName("USER");
  var list = payload.students || [];
  if (!list.length) return { status: "error", message: "Daftar murid kosong" };

  var defaultSpp = getSettingDefaultSpp(ss);

  var existing = sheet.getDataRange().getValues();
  var existingIdentifiers = {};
  for (var i = 1; i < existing.length; i++) {
    var exNisn = String(existing[i][1] || "").trim().toLowerCase();
    var exNik = String(existing[i][2] || "").trim().toLowerCase();
    if (exNisn) existingIdentifiers[exNisn] = true;
    if (exNik) existingIdentifiers[exNik] = true;
  }

  var count = 0;
  for (var j = 0; j < list.length; j++) {
    var st = list[j];
    var cleanNisn = String(st.nisn || "").trim();
    var cleanNik = String(st.nik || "").trim();
    var loginIdentifier = cleanNisn || cleanNik;
    if (!loginIdentifier) continue;

    var idLower = loginIdentifier.toLowerCase();
    if (existingIdentifiers[idLower]) continue;
    existingIdentifiers[idLower] = true;

    var sppNominal = Number(st.spp_nominal);
    if (!sppNominal || isNaN(sppNominal) || sppNominal <= 0) {
      sppNominal = defaultSpp;
    }

    var newId = st.id_siswa || ("SISWA-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss") + "-" + j);
    sheet.appendRow([
      newId,
      cleanNisn,
      cleanNik,
      st.nama || "",
      st.tempat_lahir || "Gunungkidul",
      st.tanggal_lahir || "2017-01-01",
      st.jenis_kelamin || "L",
      st.kelas || "1A",
      st.nama_wali || "",
      st.no_hp || "",
      st.alamat || "",
      st.foto || "",
      sppNominal,
      st.spp_kategori || "REGULER",
      st.spp_catatan || "",
      true
    ]);

    if (userSheet) {
      userSheet.appendRow([
        "USR-" + loginIdentifier,
        loginIdentifier,
        loginIdentifier,
        (st.nama_wali || "Wali") + " (Wali " + (st.nama || "Murid") + ")",
        "WALI",
        newId,
        cleanNisn
      ]);
    }
    count++;
  }

  appendLog(ss, payload.petugas || "Bendahara", "Import massal " + count + " murid baru");
  bumpVersion();
  return { status: "success", count: count, message: "Berhasil import " + count + " murid ke Spreadsheet!" };
}

/**
 * 5. Handle Pembayaran Murid (Menulis ke TRANSAKSI & KEUANGAN)
 */
function handleProcessPayment(ss, trx) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var now = new Date();
  var newTrxId = trx.id_transaksi || ("TRX-" + Utilities.formatDate(now, "GMT+7", "yyyyMMddHHmmss"));
  var defaultTimestamp = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
  var defaultTime = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");

  var dateStr = trx.tanggal || defaultTimestamp;
  if (dateStr.length === 10) {
    dateStr = dateStr + " " + (trx.waktu || defaultTime);
  }
  var timeStr = trx.waktu || (dateStr.length > 10 ? dateStr.substring(11).trim() : defaultTime);

  sheet.appendRow([
    newTrxId,
    dateStr,
    trx.nisn,
    trx.nama_siswa || "",
    trx.kelas || "",
    trx.jenis || "SPP",
    trx.kategori || "SPP",
    trx.bulan || "",
    Number(trx.nominal_tagihan) || 0,
    Number(trx.nominal_bayar) || 0,
    Number(trx.sisa) || 0,
    trx.status || "LUNAS",
    trx.petugas || "Bendahara",
    trx.keterangan || "",
    "",
    timeStr
  ]);

  // Otomatis catat juga ke Sheet KEUANGAN sebagai kas masuk jika nominal_bayar > 0
  if (Number(trx.nominal_bayar) > 0) {
    var kSheet = ss.getSheetByName("KEUANGAN");
    if (kSheet) {
      var kId = "KUG-" + Utilities.formatDate(now, "GMT+7", "yyyyMMddHHmmss");
      var ket = (trx.jenis || "SPP") + " " + (trx.bulan || "") + " a.n " + (trx.nama_siswa || trx.nisn) + " (" + (trx.kelas || "") + ")";
      kSheet.appendRow([
        kId,
        dateStr,
        "MASUK",
        trx.kategori || "SPP",
        Number(trx.nominal_bayar),
        ket,
        "",
        trx.petugas || "Bendahara",
        "ACTIVE",
        "",
        "KAT-SPP",
        timeStr
      ]);
    }
  }

  appendLog(ss, trx.petugas || "Bendahara", "Input transaksi " + trx.jenis + " Murid " + (trx.nama_siswa || trx.nisn) + " senilai Rp" + trx.nominal_bayar + " (" + trx.status + ")");
  bumpVersion();

  return { status: "success", id_transaksi: newTrxId, message: "Pembayaran berhasil dicatat permanen di Spreadsheet!" };
}

/**
 * 6. Handle Pembatalan Transaksi
 */
function handleCancelPayment(ss, payload) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var data = sheet.getDataRange().getValues();
  var trxId = String(payload.id_transaksi || "").trim();
  var reason = payload.alasan_batal || "Dibatalkan oleh Bendahara";

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === trxId) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 12).setValue("CANCEL");
      sheet.getRange(rowIdx, 15).setValue(reason);

      appendLog(ss, payload.petugas || "Bendahara", "MEMBATALKAN transaksi " + trxId + ". Alasan: " + reason);
      bumpVersion();
      return { status: "success", message: "Transaksi berhasil dibatalkan dan tercatat di Spreadsheet!" };
    }
  }
  return { status: "error", message: "ID Transaksi " + trxId + " tidak ditemukan di Sheet TRANSAKSI" };
}

/**
 * 7. Handle Verifikasi Status Transaksi
 */
function handleVerifyTransaction(ss, payload) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var data = sheet.getDataRange().getValues();
  var trxId = String(payload.id_transaksi || "").trim();
  var newStatus = payload.status;
  var nominalBayar = payload.nominal_bayar;
  var sisa = payload.sisa;
  var reason = payload.alasan_batal || "";

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === trxId) {
      var rowIdx = i + 1;
      if (nominalBayar !== undefined && nominalBayar !== null) {
        sheet.getRange(rowIdx, 10).setValue(Number(nominalBayar));
      }
      if (sisa !== undefined && sisa !== null) {
        sheet.getRange(rowIdx, 11).setValue(Number(sisa));
      }
      sheet.getRange(rowIdx, 12).setValue(newStatus);
      if (reason) {
        sheet.getRange(rowIdx, 15).setValue(reason);
      }

      appendLog(ss, payload.petugas || "Bendahara", "Verifikasi transaksi " + trxId + " menjadi " + newStatus + (reason ? " [" + reason + "]" : ""));
      bumpVersion();
      return { status: "success", message: "Transaksi " + trxId + " berhasil diverifikasi menjadi " + newStatus + "!" };
    }
  }
  return { status: "error", message: "ID Transaksi " + trxId + " tidak ditemukan di Sheet TRANSAKSI" };
}

/**
 * 8. Handle Keuangan Masuk / Keluar (Kas Lembaga) & Pembatalan Transaksi Kas
 */
function handleAddKeuangan(ss, k) {
  var sheet = ss.getSheetByName("KEUANGAN");
  var now = new Date();
  var newId = k.id_keuangan || ("KUG-" + Utilities.formatDate(now, "GMT+7", "yyyyMMddHHmmss"));
  var defaultTimestamp = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
  var defaultTime = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");

  var dateStr = k.tanggal || defaultTimestamp;
  if (dateStr.length === 10) {
    dateStr = dateStr + " " + (k.waktu || defaultTime);
  }
  var timeStr = k.waktu || (dateStr.length > 10 ? dateStr.substring(11).trim() : defaultTime);

  sheet.appendRow([
    newId,
    dateStr,
    k.jenis || "MASUK",
    k.kategori || "Operasional",
    Number(k.nominal) || 0,
    k.keterangan || "",
    k.bukti || "",
    k.petugas || "Bendahara",
    k.status || "ACTIVE",
    k.alasan_batal || "",
    k.id_kategori || "",
    timeStr
  ]);

  appendLog(ss, k.petugas || "Bendahara", "Input Kas " + k.jenis + " [" + k.kategori + "] Rp" + k.nominal + " - " + k.keterangan);
  bumpVersion();
  return { status: "success", id_keuangan: newId, message: "Catatan keuangan kas berhasil disimpan ke Spreadsheet!" };
}

function handleCancelKeuangan(ss, payload) {
  var sheet = ss.getSheetByName("KEUANGAN");
  if (!sheet) return { status: "error", message: "Sheet KEUANGAN tidak ditemukan" };
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id_keuangan || "").trim();
  var reason = String(payload.reason || payload.alasan_batal || "Dibatalkan").trim();
  var operator = payload.operator || payload.petugas || "Bendahara";

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 9).setValue("CANCEL");
      sheet.getRange(rowIdx, 10).setValue(reason);

      appendLog(ss, operator, "MEMBATALKAN Catatan Kas " + id + ". Alasan: " + reason);
      bumpVersion();
      return { status: "success", message: "Catatan keuangan berhasil dibatalkan!" };
    }
  }
  return { status: "error", message: "Catatan keuangan ID " + id + " tidak ditemukan" };
}

/**
 * 8b. Handle Kategori Sumber Dana
 */
function handleAddKategoriDana(ss, payload) {
  var sheet = ss.getSheetByName("KATEGORI_DANA");
  if (!sheet) {
    checkAndInitSheets(ss);
    sheet = ss.getSheetByName("KATEGORI_DANA");
  }
  var newId = payload.id_kategori || ("KAT-" + new Date().getTime());
  var nama = String(payload.nama_kategori || "").trim();
  var ket = String(payload.keterangan || "").trim();
  var aktif = payload.status_aktif !== false;

  sheet.appendRow([newId, nama, ket, aktif]);
  appendLog(ss, payload.operator || "Bendahara", "Menambah Kategori Sumber Dana: " + nama);
  bumpVersion();
  return { status: "success", id_kategori: newId, message: "Kategori sumber dana berhasil ditambahkan!" };
}

function handleUpdateKategoriDana(ss, payload) {
  var sheet = ss.getSheetByName("KATEGORI_DANA");
  if (!sheet) return { status: "error", message: "Sheet KATEGORI_DANA tidak ditemukan" };
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id_kategori || "").trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      var rowIdx = i + 1;
      if (payload.nama_kategori) sheet.getRange(rowIdx, 2).setValue(payload.nama_kategori);
      if (payload.keterangan !== undefined) sheet.getRange(rowIdx, 3).setValue(payload.keterangan);
      if (payload.status_aktif !== undefined) sheet.getRange(rowIdx, 4).setValue(payload.status_aktif);

      appendLog(ss, payload.operator || "Bendahara", "Memperbarui Kategori Dana: " + (payload.nama_kategori || id));
      bumpVersion();
      return { status: "success", message: "Kategori sumber dana berhasil diperbarui!" };
    }
  }
  return { status: "error", message: "Kategori ID " + id + " tidak ditemukan" };
}

/**
 * 9. Handle Update Profil Lembaga & Pengaturan di Sheet SETTING
 */
function handleUpdateSetting(ss, s) {
  var sheet = ss.getSheetByName("SETTING");
  if (!sheet) {
    checkAndInitSheets(ss);
    sheet = ss.getSheetByName("SETTING");
  }
  if (!sheet) return { status: "error", message: "Sheet SETTING tidak ditemukan" };

  var headers = ["nama_sekolah", "logo", "alamat", "no_wa", "kop_surat", "tahun_ajaran", "nama_kepsek", "nama_bendahara", "spp_default_nominal", "nama_bank", "no_rekening", "atas_nama_rekening", "qris_image", "spp_mulai_bulan", "spp_mulai_tahun"];

  var rowData = [
    s.nama_sekolah || "",
    s.logo || "",
    s.alamat || "",
    s.no_wa || "",
    s.kop_surat || "",
    s.tahun_ajaran || "",
    s.nama_kepsek || "",
    s.nama_bendahara || "",
    Number(s.spp_default_nominal) || getSettingDefaultSpp(ss),
    s.nama_bank || "",
    s.no_rekening || "",
    s.atas_nama_rekening || "",
    s.qris_image || "",
    s.spp_mulai_bulan || "",
    s.spp_mulai_tahun || ""
  ];

  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  appendLog(ss, s.nama_bendahara || "Bendahara", "Memperbarui Profil Sekolah / Nama Kepala Sekolah: " + (s.nama_kepsek || ""));
  bumpVersion();
  return { status: "success", message: "Pengaturan profil sekolah berhasil diperbarui di Spreadsheet!" };
}

function handleUpdateWaliContact(ss, payload) {
  var sheet = ss.getSheetByName("SISWA");
  if (!sheet) return { status: "error", message: "Sheet SISWA tidak ditemukan" };
  var data = sheet.getDataRange().getValues();
  var targetNisn = String(payload.nisn || "").trim();
  var targetId = String(payload.id_siswa || "").trim();
  var targetNik = String(payload.nik || "").trim();
  var newPhone = String(payload.no_hp || "").trim();

  for (var i = 1; i < data.length; i++) {
    var rowId = String(data[i][0]).trim();
    var rowNisn = String(data[i][1]).trim();
    var rowNik = String(data[i][2]).trim();

    if ((targetNisn && rowNisn === targetNisn) || (targetId && rowId === targetId) || (targetNik && rowNik === targetNik)) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 10).setValue(newPhone); // Kolom 10: no_hp

      var studentName = data[i][3] || targetNisn;
      appendLog(ss, payload.petugas || "Wali Murid", "Wali memperbarui nomor WhatsApp murid " + studentName + ": " + newPhone);
      bumpVersion();
      return {
        status: "success",
        message: "Nomor WhatsApp Wali berhasil diperbarui dan tersimpan di Spreadsheet!",
        no_hp: newPhone
      };
    }
  }
  return { status: "error", message: "Data murid tidak ditemukan di Sheet SISWA" };
}

/**
 * 10. Handle Pengumuman Sekolah
 */
function handleAddAnnouncement(ss, payload) {
  var sheet = ss.getSheetByName("PENGUMUMAN");
  if (!sheet) {
    checkAndInitSheets(ss);
    sheet = ss.getSheetByName("PENGUMUMAN");
  }
  var newId = payload.id_pengumuman || ("ANN-" + new Date().getTime());
  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

  sheet.appendRow([
    newId,
    dateStr,
    payload.judul || "",
    payload.isi || "",
    payload.penulis || "Bendahara",
    payload.is_penting ? true : false,
    payload.status_aktif !== false
  ]);

  appendLog(ss, payload.penulis || "Bendahara", "Menerbitkan Pengumuman: " + payload.judul);
  bumpVersion();
  return { status: "success", id_pengumuman: newId, message: "Pengumuman berhasil disimpan ke Spreadsheet!" };
}

function handleToggleAnnouncement(ss, payload) {
  var sheet = ss.getSheetByName("PENGUMUMAN");
  if (!sheet) return { status: "error", message: "Sheet PENGUMUMAN tidak ditemukan" };
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id_pengumuman || "").trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      var rowIdx = i + 1;
      var cur = data[i][6];
      var nextState = payload.status_aktif !== undefined ? payload.status_aktif : (cur === false);
      sheet.getRange(rowIdx, 7).setValue(nextState);

      appendLog(ss, payload.petugas || "Bendahara", "Mengubah status aktif pengumuman ID " + id + " ke " + nextState);
      bumpVersion();
      return { status: "success", status_aktif: nextState, message: "Status aktif pengumuman berhasil diubah!" };
    }
  }
  return { status: "error", message: "Pengumuman ID " + id + " tidak ditemukan" };
}

function handleDeleteAnnouncement(ss, payload) {
  var sheet = ss.getSheetByName("PENGUMUMAN");
  if (!sheet) return { status: "error", message: "Sheet PENGUMUMAN tidak ditemukan" };
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id_pengumuman || "").trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 1);
      appendLog(ss, payload.petugas || "Bendahara", "Menghapus pengumuman ID " + id);
      bumpVersion();
      return { status: "success", message: "Pengumuman berhasil dihapus dari Spreadsheet!" };
    }
  }
  return { status: "error", message: "Pengumuman ID " + id + " tidak ditemukan" };
}

/**
 * 11. Handle Upload File ke Google Drive (Menghasilkan URL Publik Langsung)
 */
function handleUploadFile(payload) {
  try {
    var folder;
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.trim() !== "") {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
      folder = DriveApp.getRootFolder();
    }

    var contentType = payload.contentType || "image/jpeg";
    var base64Data = payload.base64.indexOf(",") > -1 ? payload.base64.split(",")[1] : payload.base64;
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, contentType, payload.fileName || ("upload_" + new Date().getTime() + ".jpg"));
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var directPublicUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return {
      status: "success",
      id: fileId,
      fileUrl: directPublicUrl,
      directUrl: directPublicUrl
    };
  } catch (err) {
    return { status: "error", message: "Gagal upload Google Drive: " + err.toString() };
  }
}

/**
 * 12. Handle Sinkronisasi Penuh Dua Arah (Pull & Sync Data)
 */
function handleSyncAllData(ss, payload) {
  checkAndInitSheets(ss);
  var allData = fetchAllSheetsData();

  return {
    status: "success",
    version: getVersion(),
    message: "Sinkronisasi data Google Spreadsheet berhasil!",
    students: allData.students,
    transactions: allData.transactions,
    keuangan: allData.keuangan,
    kategori_dana: allData.kategori_dana,
    setting: allData.settings,
    settings: allData.settings,
    users: allData.users,
    announcements: allData.announcements,
    logs: allData.logs,
    data: allData
  };
}

/**
 * 13. Helper Log
 */
function appendLog(ss, user, aktivitas) {
  var sheet = ss.getSheetByName("LOG");
  if (sheet) {
    var timeStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timeStr, user, aktivitas]);
  }
}
`;

