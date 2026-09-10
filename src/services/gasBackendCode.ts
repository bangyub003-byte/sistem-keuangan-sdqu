export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * SISTEM INFORMASI KEUANGAN SD QUR'AN UNGGULAN AL-I'TISHAM PLAYEN
 * Terintegrasi Google Spreadsheet & Google Drive
 * =========================================================================
 */

// 1. Inisialisasi Nama Spreadsheet & Sheet
var SPREADSHEET_ID = ""; // Kosongkan jika script terpasang langsung di spreadsheet (Container-Bound)
var DRIVE_FOLDER_ID = ""; // ID Folder Google Drive untuk bukti transaksi & foto siswa (Opsional)

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Endpoint HTTP GET: Untuk pengujian koneksi & mengambil seluruh data
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAllData";
  var result = {};
  
  try {
    if (action === "ping") {
      result = { status: "success", message: "Koneksi Google Apps Script SD Qur'an Unggulan Al-I'tisham Playen Aktif!", timestamp: new Date() };
    } else if (action === "getAllData") {
      result = {
        status: "success",
        data: fetchAllSheetsData()
      };
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
 * Endpoint HTTP POST: Menangani Login, Tambah/Edit Siswa, Pembayaran, Keuangan & Upload Drive
 */
function doPost(e) {
  var response = {};
  try {
    var rawData = e.postData.contents;
    var request = JSON.parse(rawData);
    var action = request.action;
    var payload = request.payload || {};

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

      case "PROCESS_PAYMENT":
        response = handleProcessPayment(ss, payload);
        break;

      case "CANCEL_PAYMENT":
        response = handleCancelPayment(ss, payload);
        break;

      case "ADD_KEUANGAN":
        response = handleAddKeuangan(ss, payload);
        break;

      case "UPDATE_SETTING":
        response = handleUpdateSetting(ss, payload);
        break;

      case "UPLOAD_DRIVE_FILE":
        response = handleUploadFile(payload);
        break;

      case "SYNC_ALL_DATA":
      case "SYNC_ALL":
      case "PULL_DATA":
      case "GET_ALL_DATA":
        response = handleSyncAllData(ss, payload);
        break;

      case "VERIFY_TRANSACTION":
      case "UPDATE_TRANSACTION_STATUS":
        response = handleVerifyTransaction(ss, payload);
        break;

      default:
        response = { status: "error", message: "Action tidak didukung: " + action };
    }

  } catch (error) {
    response = { status: "error", message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1. Otomatis membuat 6 Sheet jika belum tersedia di Spreadsheet
 */
function checkAndInitSheets(ss) {
  var requiredSheets = {
    "USER": ["id_user", "username", "password", "nama", "role", "id_siswa"],
    "SISWA": ["id_siswa", "nisn", "nik", "nama", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "kelas", "nama_wali", "no_hp", "alamat", "foto", "spp_nominal", "spp_kategori", "spp_catatan"],
    "TRANSAKSI": ["id_transaksi", "tanggal", "nisn", "jenis", "kategori", "nominal_tagihan", "nominal_bayar", "sisa", "status", "petugas", "alasan_batal"],
    "KEUANGAN": ["tanggal", "jenis", "kategori", "nominal", "keterangan", "bukti"],
    "SETTING": ["nama_sekolah", "logo", "alamat", "no_wa", "kop_surat", "tahun_ajaran", "nama_kepsek", "nama_bendahara", "spp_default_nominal", "nama_bank", "no_rekening", "atas_nama_rekening", "qris_image"],
    "LOG": ["tanggal", "user", "aktivitas"]
  };

  for (var sheetName in requiredSheets) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(requiredSheets[sheetName]);
      // Format Header
      var headerRange = sheet.getRange(1, 1, 1, requiredSheets[sheetName].length);
      headerRange.setFontWeight("bold").setBackground("#047857").setFontColor("#FFFFFF");
      
      // Data Default jika USER sheet baru dibuat
      if (sheetName === "USER") {
        sheet.appendRow(["USR-001", "bendahara", "123", "Usth. Nur Khasanah (Bendahara)", "BENDAHARA", ""]);
        sheet.appendRow(["USR-002", "kepsek", "123", "Ust. H. Ahmad Mufid (Kepala Sekolah)", "KEPSEK", ""]);
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
 * 2. Mengambil seluruh data dari 6 Sheet
 */
function fetchAllSheetsData() {
  var ss = getSpreadsheet();
  checkAndInitSheets(ss);

  return {
    users: getSheetRows(ss, "USER"),
    students: getSheetRows(ss, "SISWA"),
    transactions: getSheetRows(ss, "TRANSAKSI"),
    keuangan: getSheetRows(ss, "KEUANGAN"),
    settings: getSheetRows(ss, "SETTING")[0] || null,
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
      
      // Normalisasi header agar jika di Spreadsheet tertulis "Nama Kepala Sekolah" tetap terbaca "nama_kepsek"
      var normalizedKey = rawHeader.toLowerCase().replace(/[\s\-_]+/g, "_");
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
      // Tetap sediakan rawHeader juga
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
  var username = (payload.username || "").trim();
  var password = (payload.password || "").trim();

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.username).trim() === username && String(u.password).trim() === password) {
      appendLog(ss, u.nama, "Berhasil masuk sistem (Login) sebagai " + u.role);
      return {
        status: "success",
        user: {
          id_user: u.id_user,
          username: u.username,
          nama: u.nama,
          role: u.role,
          id_siswa: u.id_siswa
        }
      };
    }
  }
  return { status: "error", message: "Username atau Password salah!" };
}

/**
 * 4. Tambah & Update Siswa
 */
function handleAddStudent(ss, student) {
  var sheet = ss.getSheetByName("SISWA");
  var newId = "SISWA-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
  
  sheet.appendRow([
    newId,
    student.nisn,
    student.nik,
    student.nama,
    student.tempat_lahir,
    student.tanggal_lahir,
    student.jenis_kelamin,
    student.kelas,
    student.nama_wali,
    student.no_hp,
    student.alamat,
    student.foto || "",
    student.spp_nominal || 500000,
    student.spp_kategori || "REGULER",
    student.spp_catatan || ""
  ]);

  // Otomatis buat akun wali jika belum ada
  var userSheet = ss.getSheetByName("USER");
  userSheet.appendRow([
    "USR-" + student.nisn,
    student.nisn,
    student.nisn, // password default adalah NISN
    student.nama_wali + " (Wali " + student.nama + ")",
    "WALI",
    newId
  ]);

  appendLog(ss, student.petugas || "Bendahara", "Menambah murid baru: " + student.nama + " (NISN: " + student.nisn + ")");

  return { status: "success", id_siswa: newId, message: "Data murid dan akun wali berhasil disimpan ke Spreadsheet!" };
}

function handleUpdateStudent(ss, student) {
  var sheet = ss.getSheetByName("SISWA");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(student.id_siswa) || String(data[i][1]) === String(student.nisn)) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 3).setValue(student.nik);
      sheet.getRange(rowIdx, 4).setValue(student.nama);
      sheet.getRange(rowIdx, 5).setValue(student.tempat_lahir);
      sheet.getRange(rowIdx, 6).setValue(student.tanggal_lahir);
      sheet.getRange(rowIdx, 7).setValue(student.jenis_kelamin);
      sheet.getRange(rowIdx, 8).setValue(student.kelas);
      sheet.getRange(rowIdx, 9).setValue(student.nama_wali);
      sheet.getRange(rowIdx, 10).setValue(student.no_hp);
      sheet.getRange(rowIdx, 11).setValue(student.alamat);
      if (student.foto) sheet.getRange(rowIdx, 12).setValue(student.foto);
      sheet.getRange(rowIdx, 13).setValue(student.spp_nominal);
      sheet.getRange(rowIdx, 14).setValue(student.spp_kategori || "REGULER");
      sheet.getRange(rowIdx, 15).setValue(student.spp_catatan || "");
      
      appendLog(ss, student.petugas || "Bendahara", "Memperbarui data murid: " + student.nama);
      return { status: "success", message: "Data murid berhasil diperbarui!" };
    }
  }
  return { status: "error", message: "Murid tidak ditemukan di Spreadsheet" };
}

/**
 * 5. Handle Pembayaran Murid
 */
function handleProcessPayment(ss, trx) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var newTrxId = "TRX-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

  sheet.appendRow([
    newTrxId,
    dateStr,
    trx.nisn,
    trx.jenis,
    trx.kategori || "SPP",
    trx.nominal_tagihan,
    trx.nominal_bayar,
    trx.sisa,
    trx.status,
    trx.petugas,
    ""
  ]);

  appendLog(ss, trx.petugas, "Input transaksi " + trx.jenis + " Murid NISN: " + trx.nisn + " Senilai Rp" + trx.nominal_bayar + " (" + trx.status + ")");

  return { status: "success", id_transaksi: newTrxId, message: "Pembayaran berhasil dicatat di Spreadsheet!" };
}

/**
 * 6. Handle Pembatalan Transaksi
 */
function handleCancelPayment(ss, payload) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var data = sheet.getDataRange().getValues();
  var trxId = payload.id_transaksi;
  var reason = payload.alasan_batal;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(trxId)) {
      var rowIdx = i + 1;
      sheet.getRange(rowIdx, 9).setValue("CANCEL");
      sheet.getRange(rowIdx, 11).setValue(reason);

      appendLog(ss, payload.petugas || "Bendahara", "MEMBATALKAN transaksi " + trxId + ". Alasan: " + reason);
      return { status: "success", message: "Transaksi berhasil dibatalkan dan tercatat di LOG!" };
    }
  }
  return { status: "error", message: "ID Transaksi tidak ditemukan" };
}

/**
 * 7. Handle Keuangan Masuk / Keluar
 */
function handleAddKeuangan(ss, k) {
  var sheet = ss.getSheetByName("KEUANGAN");
  var dateStr = k.tanggal || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

  sheet.appendRow([
    dateStr,
    k.jenis,
    k.kategori,
    k.nominal,
    k.keterangan,
    k.bukti || ""
  ]);

  appendLog(ss, k.petugas || "Bendahara", "Input Kas " + k.jenis + " kategori " + k.kategori + " senilai Rp" + k.nominal);
  return { status: "success", message: "Kas " + k.jenis + " berhasil disimpan!" };
}

/**
 * 7b. Handle Update Profil Lembaga & Kepala Sekolah di Sheet SETTING
 */
function handleUpdateSetting(ss, s) {
  var sheet = ss.getSheetByName("SETTING");
  if (!sheet) {
    checkAndInitSheets(ss);
    sheet = ss.getSheetByName("SETTING");
  }
  if (!sheet) return { status: "error", message: "Sheet SETTING tidak ditemukan" };

  var headers = ["nama_sekolah", "logo", "alamat", "no_wa", "kop_surat", "tahun_ajaran", "nama_kepsek", "nama_bendahara", "spp_default_nominal", "nama_bank", "no_rekening", "atas_nama_rekening", "qris_image"];
  
  var rowData = [
    s.nama_sekolah || "",
    s.logo || "",
    s.alamat || "",
    s.no_wa || "",
    s.kop_surat || "",
    s.tahun_ajaran || "",
    s.nama_kepsek || "",
    s.nama_bendahara || "",
    Number(s.spp_default_nominal) || 500000,
    s.nama_bank || "",
    s.no_rekening || "",
    s.atas_nama_rekening || "",
    s.qris_image || ""
  ];

  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  appendLog(ss, s.nama_bendahara || "Bendahara", "Memperbarui Profil Sekolah / Kepala Sekolah: " + (s.nama_kepsek || ""));
  return { status: "success", message: "Pengaturan & Nama Kepala Sekolah berhasil diperbarui di Spreadsheet!" };
}

/**
 * 8. Handle Upload File ke Google Drive
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
    var base64Data = payload.base64.split(",")[1] || payload.base64;
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, contentType, payload.fileName || "bukti_" + new Date().getTime() + ".jpg");
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      status: "success",
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      id: file.getId()
    };
  } catch (err) {
    return { status: "error", message: "Gagal upload Google Drive: " + err.toString() };
  }
}

/**
 * 9. Handle Verifikasi Status Transaksi (Lunas / Kurang / Cancel)
 */
function handleVerifyTransaction(ss, payload) {
  var sheet = ss.getSheetByName("TRANSAKSI");
  var data = sheet.getDataRange().getValues();
  var trxId = payload.id_transaksi;
  var newStatus = payload.status; // 'LUNAS' | 'KURANG' | 'CANCEL'
  var nominalBayar = payload.nominal_bayar;
  var sisa = payload.sisa;
  var reason = payload.alasan_batal || "";

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(trxId)) {
      var rowIdx = i + 1;
      if (nominalBayar !== undefined && nominalBayar !== null) {
        sheet.getRange(rowIdx, 7).setValue(Number(nominalBayar));
      }
      if (sisa !== undefined && sisa !== null) {
        sheet.getRange(rowIdx, 8).setValue(Number(sisa));
      }
      sheet.getRange(rowIdx, 9).setValue(newStatus);
      if (reason) {
        sheet.getRange(rowIdx, 11).setValue(reason);
      }

      appendLog(ss, payload.petugas || "Bendahara", "Verifikasi status transaksi " + trxId + " menjadi " + newStatus + (reason ? " [Alasan: " + reason + "]" : ""));
      return { status: "success", message: "Transaksi " + trxId + " berhasil diverifikasi menjadi " + newStatus + "!" };
    }
  }
  return { status: "error", message: "ID Transaksi " + trxId + " tidak ditemukan di Sheet TRANSAKSI" };
}

/**
 * 10. Handle Sinkronisasi Penuh Dua Arah (Sync / Pull / Push)
 */
function handleSyncAllData(ss, payload) {
  checkAndInitSheets(ss);

  // Jika payload menyertakan data untuk diperbarui ke sheet
  if (payload && payload.overwrite === true && payload.students && payload.students.length > 0) {
    var studentSheet = ss.getSheetByName("SISWA");
    var existingStudents = studentSheet.getDataRange().getValues();
    // Simpan siswa baru yang belum tercatat
    var existingNisns = {};
    for (var i = 1; i < existingStudents.length; i++) {
      existingNisns[String(existingStudents[i][1])] = true;
    }
    for (var s = 0; s < payload.students.length; s++) {
      var st = payload.students[s];
      if (!existingNisns[String(st.nisn)]) {
        studentSheet.appendRow([
          st.id_siswa, st.nisn, st.nik, st.nama, st.tempat_lahir,
          st.tanggal_lahir, st.jenis_kelamin, st.kelas, st.nama_wali,
          st.no_hp, st.alamat, st.foto || "", st.spp_nominal || 500000,
          st.spp_kategori || "REGULER", st.spp_catatan || ""
        ]);
      }
    }
  }

  return {
    status: "success",
    message: "Sinkronisasi Google Spreadsheet berhasil!",
    data: fetchAllSheetsData()
  };
}

/**
 * 11. Helper Log
 */
function appendLog(ss, user, aktivitas) {
  var sheet = ss.getSheetByName("LOG");
  if (sheet) {
    var timeStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timeStr, user, aktivitas]);
  }
}
`;
