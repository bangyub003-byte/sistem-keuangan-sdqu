import { Student, Transaction } from '../types';
import { StorageService } from '../services/storageService';

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface AcademicMonth {
  indexInYear: number; // 0 to 11 (0 = Juli, 11 = Juni)
  calendarMonthIndex: number; // 0 (Jan) to 11 (Dec)
  monthName: string; // e.g. "Juli"
  year: number; // e.g. 2026
  label: string; // e.g. "Juli 2026"
  isDue: boolean; // whether this month has arrived based on system date
  isCurrentMonth: boolean; // is this the current system month
}

export interface StudentSppMonthStatus extends AcademicMonth {
  status: 'LUNAS' | 'KURANG' | 'BELUM_BAYAR' | 'BELUM_JATUH_TEMPO';
  tagihan: number;
  dibayar: number;
  sisa: number;
  transactions: Transaction[];
}

export interface StudentSppSummary {
  student: Student;
  academicYear: string; // e.g. "2026/2027"
  allMonths: StudentSppMonthStatus[];
  dueMonths: StudentSppMonthStatus[];
  paidMonths: StudentSppMonthStatus[];
  unpaidDueMonths: StudentSppMonthStatus[]; // due months that are KURANG or BELUM_BAYAR
  totalTagihanDue: number;
  totalDibayarDue: number;
  totalTunggakanSpp: number; // Tunggakan bulan berjalan (periode 12 bulan)
  tunggakanHistoris: number; // Tunggakan dari catatan manual/historis
  totalTunggakanKeseluruhan: number; // totalTunggakanSpp + tunggakanHistoris
  historicalTransactions: Transaction[]; // Transaksi berlabel [Tunggakan Historis]
  isLunas: boolean; // unpaidDueMonths.length === 0 && grandTotalSisa === 0
  statusLabel: string; // "Lunas sampai bulan berjalan" OR "Menunggak X bulan..."
  monthsNunggakList: string[]; // e.g. ["Agustus", "September"]
  monthsNunggakFullLabels: string[]; // e.g. ["Agustus 2026", "September 2026"]
  // Non-SPP transactions summary for comprehensive financial reporting
  nonSppTagihan: number;
  nonSppDibayar: number;
  nonSppSisa: number;
  // Grand totals
  grandTotalTagihan: number;
  grandTotalDibayar: number;
  grandTotalSisa: number;
}

/**
 * Determines academic start year based on setting.tahun_ajaran (e.g. "2026/2027" -> 2026)
 * or dynamically from the current date (Indonesian academic year starts in July).
 */
export function getAcademicStartYear(settingTahunAjaran?: string, referenceDate: Date = new Date()): number {
  if (settingTahunAjaran && settingTahunAjaran.includes('/')) {
    const parts = settingTahunAjaran.split('/');
    const parsed = parseInt(parts[0], 10);
    if (!isNaN(parsed) && parsed > 2000 && parsed < 2100) {
      return parsed;
    }
  }
  const calMonth = referenceDate.getMonth();
  const calYear = referenceDate.getFullYear();
  return calMonth >= 6 ? calYear : calYear - 1;
}

/**
 * Generates all 12 calendar months for an Indonesian academic year (Juli to Juni).
 */
export function getAllAcademicYearMonths(settingTahunAjaran?: string, referenceDate: Date = new Date()): AcademicMonth[] {
  const startYear = getAcademicStartYear(settingTahunAjaran, referenceDate);
  const curCalYear = referenceDate.getFullYear();
  const curCalMonth = referenceDate.getMonth();
  const curAbsolute = curCalYear * 12 + curCalMonth;

  // Indonesian academic calendar order: Juli (idx 6) to Juni (idx 5)
  const monthCalendarIndices = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];

  return monthCalendarIndices.map((calIdx, idxInYear) => {
    const year = idxInYear < 6 ? startYear : startYear + 1;
    const absValue = year * 12 + calIdx;
    const isDue = absValue <= curAbsolute;
    const isCurrentMonth = absValue === curAbsolute;
    const monthName = INDONESIAN_MONTHS[calIdx];
    const label = `${monthName} ${year}`;

    return {
      indexInYear: idxInYear,
      calendarMonthIndex: calIdx,
      monthName,
      year,
      label,
      isDue,
      isCurrentMonth
    };
  });
}

/**
 * Generates exactly 12 consecutive SPP obligation months sequence,
 * starting from the configured start month and year (titik awal kewajiban SPP),
 * handling year rollovers seamlessly (e.g. Oktober 2026 ... September 2027 = exactly 12 consecutive months).
 * If startMonthName or startYearOverride is not provided, reads the latest configuration from StorageService.
 */
export function getAcademicYearMonths(
  settingTahunAjaran?: string,
  referenceDate: Date = new Date(),
  startMonthName?: string,
  startYearOverride?: number
): AcademicMonth[] {
  // Ambil titik awal kewajiban SPP: prioritas parameter, lalu setting tersimpan di StorageService, lalu default 'Oktober'
  const currentSetting = StorageService.getSetting();
  const effectiveStartMonthName = startMonthName || currentSetting.spp_mulai_bulan || 'Oktober';
  const defaultStartYear = getAcademicStartYear(settingTahunAjaran || currentSetting.tahun_ajaran, referenceDate);
  const rawYear = startYearOverride || currentSetting.spp_mulai_tahun || defaultStartYear;
  const effectiveStartYear = typeof rawYear === 'string' ? (parseInt(rawYear, 10) || defaultStartYear) : rawYear;

  // Cari index bulan mulai (case-insensitive)
  const cleanMonth = (effectiveStartMonthName || '').trim().toLowerCase();
  let startMonthIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === cleanMonth);
  if (startMonthIdx < 0) {
    startMonthIdx = 9; // Default Oktober (index 9) jika tidak ditemukan
  }

  const curCalYear = referenceDate.getFullYear();
  const curCalMonth = referenceDate.getMonth();
  const curAbsolute = curCalYear * 12 + curCalMonth;

  // Bangun TEPAT 12 BULAN BERURUTAN mulai dari bulan & tahun yang ditentukan
  const months: AcademicMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const totalMonthIdx = startMonthIdx + i;
    const calIdx = totalMonthIdx % 12;
    const year = effectiveStartYear + Math.floor(totalMonthIdx / 12);
    const absValue = year * 12 + calIdx;
    const isDue = absValue <= curAbsolute;
    const isCurrentMonth = absValue === curAbsolute;
    const monthName = INDONESIAN_MONTHS[calIdx];
    const label = `${monthName} ${year}`;

    months.push({
      indexInYear: i,
      calendarMonthIndex: calIdx,
      monthName,
      year,
      label,
      isDue,
      isCurrentMonth
    });
  }

  return months;
}

/**
 * Standardized transaction title / description helper:
 * Always produces "SPP Bulan [Nama Bulan]" for SPP transactions.
 * Example: "SPP Bulan Oktober 2026" instead of generic "SPP Bulanan".
 */
export function getStandardTransactionTitle(trx: {
  jenis?: string;
  kategori?: string;
  bulan?: string;
  keterangan?: string;
}): string {
  const isSpp = trx.kategori === 'SPP' ||
                (trx.jenis || '').toLowerCase().includes('spp') ||
                Boolean(trx.bulan);

  if (isSpp && trx.bulan) {
    const cleanBulan = trx.bulan.trim();
    if (cleanBulan.toLowerCase().startsWith('spp bulan')) {
      return cleanBulan;
    }
    if (cleanBulan.toLowerCase().startsWith('spp')) {
      return `SPP Bulan ${cleanBulan.slice(3).trim()}`;
    }
    return `SPP Bulan ${cleanBulan}`;
  }

  if (isSpp && trx.keterangan && trx.keterangan.toLowerCase().includes('spp bulan')) {
    const match = trx.keterangan.match(/spp\s+bulan\s+([a-zA-Z]+\s*\d{4}|[a-zA-Z]+)/i);
    if (match) {
      return `SPP Bulan ${match[1]}`;
    }
  }

  return trx.jenis || 'Transaksi';
}

/**
 * Checks whether a transaction is a historical arrears entry (pencatatan tunggakan historis).
 * Marked with prefix [Tunggakan Historis] or specific category/notes.
 */
export function isHistoricalArrearsTrx(t?: { jenis?: string; keterangan?: string; kategori?: string } | null): boolean {
  if (!t) return false;
  const ket = (t.keterangan || '').toLowerCase();
  const jenis = (t.jenis || '').toLowerCase();
  const kat = (t.kategori || '').toLowerCase();
  return ket.includes('[tunggakan historis]') ||
         ket.includes('tunggakan historis') ||
         jenis.includes('tunggakan historis') ||
         kat.includes('tunggakan historis');
}

/**
 * Checks whether a given transaction matches a specific academic month.
 * Supports exact month name, abbreviations, multi-month strings (e.g. "Oktober, November, Desember 2026"),
 * and range strings (e.g. "Oktober - Desember 2026" or "Oktober s/d Desember 2026").
 */
export function matchesMonth(t: Transaction, month: AcademicMonth): boolean {
  if (t.status === 'CANCEL') return false;
  // Entri historis TIDAK BOLEH masuk ke perhitungan 12 bulan dropdown Periode SPP yang sudah ada
  if (isHistoricalArrearsTrx(t)) return false;

  const isSpp = t.kategori === 'SPP' ||
                t.jenis.toLowerCase().includes('spp') ||
                Boolean(t.bulan);
  if (!isSpp) return false;

  const tBulan = (t.bulan || '').toLowerCase().trim();
  const tJenis = (t.jenis || '').toLowerCase().trim();
  const tKet = (t.keterangan || '').toLowerCase().trim();
  const mName = month.monthName.toLowerCase();
  const mYearStr = String(month.year);

  // Helper to test if a string matches the target month
  const testMonthMatch = (text: string): boolean => {
    if (!text) return false;

    // 1. Direct inclusion of full month name
    if (text.includes(mName)) {
      if (/\d{4}/.test(text)) {
        return text.includes(mYearStr);
      }
      return true;
    }

    // 2. Multi-month range matching e.g. "Oktober - Desember 2026" or "Oktober s/d Desember 2026"
    const rangeMatch = text.match(/([a-z]+)\s*(?:-|–|—|s\/d|sd|sampai|s\.d\.)\s*([a-z]+)/i);
    if (rangeMatch) {
      const startM = rangeMatch[1].toLowerCase();
      const endM = rangeMatch[2].toLowerCase();
      const ACADEMIC_ORDER = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'januari', 'februari', 'maret', 'april', 'mei', 'juni'];
      const sIdx = ACADEMIC_ORDER.findIndex(m => m.startsWith(startM.slice(0, 3)));
      const eIdx = ACADEMIC_ORDER.findIndex(m => m.startsWith(endM.slice(0, 3)));
      const curIdx = ACADEMIC_ORDER.indexOf(mName);

      if (sIdx !== -1 && eIdx !== -1 && curIdx !== -1) {
        const inRange = sIdx <= eIdx
          ? curIdx >= sIdx && curIdx <= eIdx
          : curIdx >= sIdx || curIdx <= eIdx;
        if (inRange) {
          if (/\d{4}/.test(text)) {
            return text.includes(mYearStr);
          }
          return true;
        }
      }
    }

    // 3. Comma / and separated list e.g. "Oktober, November, Desember"
    const words = text.split(/[\s,;&+/]+/);
    const mPrefix = mName.slice(0, 3);
    const hasWord = words.some(w => w === mName || (w.length >= 3 && w.startsWith(mPrefix)));
    if (hasWord) {
      if (/\d{4}/.test(text)) {
        return text.includes(mYearStr);
      }
      return true;
    }

    return false;
  };

  if (testMonthMatch(tBulan)) return true;
  if (testMonthMatch(tJenis)) return true;
  if (testMonthMatch(tKet)) return true;

  return false;
}

/**
 * Calculates student SPP status automatically up to current month and year.
 * Compares due months against existing TRANSAKSI records for the student's NISN.
 * Respects student or school start obligation month/year (titik awal kewajiban SPP).
 */
export function calculateStudentSppStatus(
  student: Student,
  transactions: Transaction[],
  settingTahunAjaran?: string,
  referenceDate: Date = new Date(),
  defaultStartMonth?: string,
  defaultStartYear?: number
): StudentSppSummary {
  const currentSetting = StorageService.getSetting();
  const effTahunAjaran = settingTahunAjaran || currentSetting.tahun_ajaran;
  const startYear = getAcademicStartYear(effTahunAjaran, referenceDate);
  const academicYear = effTahunAjaran || `${startYear}/${startYear + 1}`;

  // Titik awal kewajiban SPP: prioritas per-murid (murid pindahan), lalu parameter defaultStartMonth, lalu setting StorageService, lalu 'Oktober'
  const effectiveStartMonthName = student.spp_mulai_bulan || defaultStartMonth || currentSetting.spp_mulai_bulan || 'Oktober';
  const fallbackStartYear = getAcademicStartYear(effTahunAjaran, referenceDate);
  const rawYear = student.spp_mulai_tahun || defaultStartYear || currentSetting.spp_mulai_tahun || fallbackStartYear;
  const effectiveStartYear = typeof rawYear === 'string' ? (parseInt(rawYear, 10) || fallbackStartYear) : rawYear;

  const cleanMonth = (effectiveStartMonthName || '').trim().toLowerCase();
  let startMonthIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === cleanMonth);
  if (startMonthIdx < 0) {
    startMonthIdx = 9; // Default to Oktober (idx 9)
  }
  const startAbsolute = effectiveStartYear * 12 + startMonthIdx;

  // Saring daftar bulan akademik hanya mulai dari titik awal kewajiban SPP ke depan (tepat 12 bulan berurutan)
  const academicMonths = getAcademicYearMonths(effTahunAjaran, referenceDate, effectiveStartMonthName, effectiveStartYear);

  const curCalYear = referenceDate.getFullYear();
  const curCalMonth = referenceDate.getMonth();
  const curAbsolute = curCalYear * 12 + curCalMonth;

  // Filter transactions for this student (supports matching by NISN or fallback NIK)
  const studentTransactions = (transactions || []).filter(
    t => (
      (student.nisn && t.nisn === student.nisn) ||
      (student.nik && t.nisn === student.nik)
    ) && t.status !== 'CANCEL'
  );

  const monthlyFee = student.spp_nominal || 500000;

  const allMonths: StudentSppMonthStatus[] = academicMonths.map(m => {
    const matchingTrxs = studentTransactions.filter(t => matchesMonth(t, m));
    const mAbsolute = m.year * 12 + m.calendarMonthIndex;

    const hasArrived = mAbsolute <= curAbsolute;
    const isAfterOrAtStart = mAbsolute >= startAbsolute;
    const isDue = hasArrived && isAfterOrAtStart;

    let status: 'LUNAS' | 'KURANG' | 'BELUM_BAYAR' | 'BELUM_JATUH_TEMPO' = 'BELUM_BAYAR';
    let dibayar = 0;
    let sisa = 0;
    let tagihan = 0;

    if (matchingTrxs.length > 0) {
      dibayar = matchingTrxs.reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);
      const hasLunas = matchingTrxs.some(t => t.status === 'LUNAS');

      // Status LUNAS SELALU diberikan jika ada transaksi LUNAS
      // atau total bayar mencukupi nominal SPP, terlepas dari apakah bulan tersebut sudah jatuh tempo atau belum.
      if (hasLunas || dibayar >= monthlyFee) {
        status = 'LUNAS';
        tagihan = monthlyFee;
        sisa = 0;
      } else {
        status = 'KURANG';
        tagihan = monthlyFee;
        sisa = Math.max(0, monthlyFee - dibayar);
      }
    } else {
      if (isDue) {
        status = 'BELUM_BAYAR';
        tagihan = monthlyFee;
        dibayar = 0;
        sisa = monthlyFee;
      } else {
        status = 'BELUM_JATUH_TEMPO';
        tagihan = 0;
        dibayar = 0;
        sisa = 0;
      }
    }

    return {
      ...m,
      isDue,
      status,
      tagihan,
      dibayar,
      sisa,
      transactions: matchingTrxs
    };
  });

  const dueMonths = allMonths.filter(m => m.isDue);
  // paidMonths mencakup SEMUA bulan yang lunas (termasuk yang dibayar di muka)
  const paidMonths = allMonths.filter(m => m.status === 'LUNAS');
  // Hanya bulan yang sudah jatuh tempo dan belum lunas yang dihitung sebagai tunggakan
  const unpaidDueMonths = allMonths.filter(m => m.isDue && m.status !== 'LUNAS');

  // Total Tagihan SPP: mencakup semua bulan jatuh tempo + bulan di muka yang sudah dibayar/ditagihkan
  const totalTagihanDue = allMonths
    .filter(m => m.isDue || m.dibayar > 0)
    .reduce((acc, m) => acc + (m.tagihan || monthlyFee), 0);
  // Total Pembayaran SPP Masuk: SEMUA pembayaran SPP yang sudah masuk di sistem
  const totalDibayarDue = allMonths.reduce((acc, m) => acc + m.dibayar, 0);
  // Total Tunggakan SPP Periode Berjalan: hanya bulan jatuh tempo yang menunggak
  const totalTunggakanSpp = unpaidDueMonths.reduce((acc, m) => acc + m.sisa, 0);

  const monthsNunggakList = unpaidDueMonths.map(m => m.monthName);
  const monthsNunggakFullLabels = unpaidDueMonths.map(m => m.label);

  // 1. Perhitungan Catatan Tunggakan Historis / Manual
  const historicalTransactions = studentTransactions.filter(t => isHistoricalArrearsTrx(t));
  const activeHistorical = historicalTransactions.filter(t => t.status === 'KURANG');
  const tunggakanHistoris = activeHistorical.reduce((sum, t) => {
    if (t.sisa !== undefined && t.sisa !== null) return sum + t.sisa;
    return sum + Math.max(0, (t.nominal_tagihan || 0) - (t.nominal_bayar || 0));
  }, 0);
  const totalHistorisTagihan = historicalTransactions.reduce((sum, t) => sum + (t.nominal_tagihan || 0), 0);
  const totalHistorisDibayar = historicalTransactions.reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);

  const totalTunggakanKeseluruhan = totalTunggakanSpp + tunggakanHistoris;

  // Non-SPP transactions for this student (pastikan transaksi SPP dan transaksi historis tidak terhitung ke pos non-SPP)
  const isSppTrx = (t: Transaction) =>
    isHistoricalArrearsTrx(t) ||
    t.kategori === 'SPP' ||
    (t.jenis || '').toLowerCase().includes('spp') ||
    Boolean(t.bulan);

  const nonSppTrxs = studentTransactions.filter(t => !isSppTrx(t));
  const nonSppTagihan = nonSppTrxs.reduce((sum, t) => sum + (t.nominal_tagihan || 0), 0);
  const nonSppDibayar = nonSppTrxs.reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);
  const nonSppSisa = nonSppTrxs.filter(t => t.status === 'KURANG').reduce((sum, t) => sum + (t.sisa || 0), 0);

  const grandTotalTagihan = totalTagihanDue + totalHistorisTagihan + nonSppTagihan;
  const grandTotalDibayar = totalDibayarDue + totalHistorisDibayar + nonSppDibayar;
  const grandTotalSisa = totalTunggakanKeseluruhan + nonSppSisa;

  // Sinkronisasi mutlak: jika tidak ada tunggakan jatuh tempo dan tidak ada sisa non-SPP atau tunggakan historis, maka LUNAS
  const isLunas = unpaidDueMonths.length === 0 && grandTotalSisa === 0;
  let statusLabel = '';
  if (isLunas) {
    const advancePaidMonths = paidMonths.filter(pm => !pm.isDue);
    if (advancePaidMonths.length > 0) {
      const lastPaid = advancePaidMonths[advancePaidMonths.length - 1];
      statusLabel = `Lunas (Termasuk bayar di muka s/d ${lastPaid.monthName} ${lastPaid.year})`;
    } else {
      statusLabel = 'Lunas sampai bulan berjalan';
    }
  } else if (unpaidDueMonths.length > 0 && tunggakanHistoris > 0) {
    statusLabel = `Menunggak ${unpaidDueMonths.length} bln + Tunggakan Historis`;
  } else if (unpaidDueMonths.length > 0) {
    const count = unpaidDueMonths.length;
    statusLabel = `Menunggak ${count} bulan (${monthsNunggakList.join(', ')})`;
  } else if (tunggakanHistoris > 0) {
    statusLabel = `Ada Tunggakan Historis (Rp ${tunggakanHistoris.toLocaleString('id-ID')})`;
  } else if (nonSppSisa > 0) {
    statusLabel = `Tagihan Lain Belum Lunas (Rp ${nonSppSisa.toLocaleString('id-ID')})`;
  } else {
    statusLabel = 'Lunas sampai bulan berjalan';
  }

  return {
    student,
    academicYear,
    allMonths,
    dueMonths,
    paidMonths,
    unpaidDueMonths,
    totalTagihanDue,
    totalDibayarDue,
    totalTunggakanSpp,
    tunggakanHistoris,
    totalTunggakanKeseluruhan,
    historicalTransactions,
    isLunas,
    statusLabel,
    monthsNunggakList,
    monthsNunggakFullLabels,
    nonSppTagihan,
    nonSppDibayar,
    nonSppSisa,
    grandTotalTagihan,
    grandTotalDibayar,
    grandTotalSisa
  };
}

/**
 * Calculates SPP summaries for all active students, giving consistent aggregate metrics
 */
export function calculateAllStudentsSppSummary(
  students: Student[],
  transactions: Transaction[],
  settingTahunAjaran?: string,
  referenceDate: Date = new Date(),
  defaultStartMonth?: string,
  defaultStartYear?: number
) {
  const currentSetting = StorageService.getSetting();
  const effStartMonth = defaultStartMonth || currentSetting.spp_mulai_bulan || 'Oktober';
  const effStartYear = defaultStartYear || currentSetting.spp_mulai_tahun || 2026;

  const activeStudents = (students || []).filter(s => s.status_aktif);

  const summaries = activeStudents.map(st =>
    calculateStudentSppStatus(st, transactions, settingTahunAjaran, referenceDate, effStartMonth, effStartYear)
  );

  const studentsWithTunggakan = summaries.filter(s => s.grandTotalSisa > 0);
  const studentsLunas = summaries.filter(s => s.isLunas && s.grandTotalSisa === 0);

  const totalTunggakanAll = summaries.reduce((acc, s) => acc + s.grandTotalSisa, 0);
  const totalTunggakanSppOnly = summaries.reduce((acc, s) => acc + s.totalTunggakanSpp, 0);
  const totalTunggakanHistorisOnly = summaries.reduce((acc, s) => acc + s.tunggakanHistoris, 0);
  const totalPembayaranSppMasuk = summaries.reduce((acc, s) => acc + s.totalDibayarDue + (s.historicalTransactions?.reduce((hSum, ht) => hSum + (ht.nominal_bayar || 0), 0) || 0), 0);

  return {
    summaries,
    studentsWithTunggakan,
    studentsLunas,
    countSantriNunggak: studentsWithTunggakan.length,
    countSantriLunas: studentsLunas.length,
    totalTunggakanAll,
    totalTunggakanSppOnly,
    totalTunggakanHistorisOnly,
    totalPembayaranSppMasuk
  };
}

/**
 * Format real-time timestamp seragam di seluruh dashboard (tanggal & jam:menit:detik WIB)
 */
export function formatTransactionTimestamp(
  tanggalOrTrx: string | { tanggal?: string; waktu?: string } = '',
  waktu?: string
): {
  dateDisplay: string;
  timeDisplay: string;
  fullDisplay: string;
} {
  let datePart = '';
  let timePart = '';

  if (typeof tanggalOrTrx === 'object' && tanggalOrTrx !== null) {
    datePart = String(tanggalOrTrx.tanggal || '').trim();
    timePart = String(tanggalOrTrx.waktu || waktu || '').trim();
  } else {
    datePart = String(tanggalOrTrx || '').trim();
    timePart = String(waktu || '').trim();
  }

  // Handle jika tanggal mengandung waktu ISO atau spasi e.g. "2026-09-12 14:30:00"
  if (datePart.includes('T') || datePart.includes(' ')) {
    const separator = datePart.includes('T') ? 'T' : ' ';
    const parts = datePart.split(separator);
    datePart = parts[0];
    if (!timePart && parts[1]) {
      timePart = parts[1].replace('Z', '').split('.')[0];
    }
  }

  // Jika waktu adalah "00:00:00" atau "00:00" (tengah malam legacy), abaikan agar tidak menampilkan waktu palsu
  if (timePart === '00:00:00' || timePart === '00:00') {
    timePart = '';
  }

  // Jika timePart format HH:mm, lengkapi detik agar seragam
  if (timePart && timePart.split(':').length === 2) {
    timePart = `${timePart}:00`;
  }

  const timeDisplay = timePart ? `${timePart} WIB` : '';
  const fullDisplay = timeDisplay ? `${datePart} ${timeDisplay}` : datePart;

  return {
    dateDisplay: datePart || '-',
    timeDisplay,
    fullDisplay
  };
}
