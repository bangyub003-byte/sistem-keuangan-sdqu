import { Student, Transaction } from '../types';

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
  totalTunggakanSpp: number;
  isLunas: boolean; // unpaidDueMonths.length === 0 && totalTunggakanSpp === 0
  statusLabel: string; // "Lunas sampai bulan berjalan" OR "Menunggak X bulan (Agustus, September)"
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
 * Generates the full 12 months sequence of the Indonesian academic year (Juli to Juni)
 * and marks which months are already due based on the current system date.
 */
export function getAcademicYearMonths(settingTahunAjaran?: string, referenceDate: Date = new Date()): AcademicMonth[] {
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
 * Checks whether a given transaction matches a specific academic month
 */
export function matchesMonth(t: Transaction, month: AcademicMonth): boolean {
  if (t.status === 'CANCEL') return false;

  const isSpp = t.kategori === 'SPP' ||
                t.jenis.toLowerCase().includes('spp') ||
                Boolean(t.bulan);
  if (!isSpp) return false;

  const tBulan = (t.bulan || '').toLowerCase().trim();
  const tJenis = (t.jenis || '').toLowerCase().trim();
  const tKet = (t.keterangan || '').toLowerCase().trim();
  const mName = month.monthName.toLowerCase();
  const mYearStr = String(month.year);

  // Check if t.bulan matches month name
  if (tBulan) {
    if (tBulan.includes(mName)) {
      if (/\d{4}/.test(tBulan)) {
        return tBulan.includes(mYearStr);
      }
      return true;
    }
  }

  // Check if t.jenis or t.keterangan contains month name
  if (tJenis.includes(mName) || tKet.includes(mName)) {
    if (/\d{4}/.test(tJenis) || /\d{4}/.test(tKet)) {
      return tJenis.includes(mYearStr) || tKet.includes(mYearStr);
    }
    return true;
  }

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
  const startYear = getAcademicStartYear(settingTahunAjaran, referenceDate);
  const academicYear = settingTahunAjaran || `${startYear}/${startYear + 1}`;
  const academicMonths = getAcademicYearMonths(settingTahunAjaran, referenceDate);

  const curCalYear = referenceDate.getFullYear();
  const curCalMonth = referenceDate.getMonth();
  const curAbsolute = curCalYear * 12 + curCalMonth;

  // Titik awal kewajiban SPP: prioritas per-murid (murid pindahan), lalu pengaturan semester/sekolah, lalu awal tahun ajaran (Juli)
  const effectiveStartMonthName = student.spp_mulai_bulan || defaultStartMonth || 'Juli';
  const effectiveStartYear = student.spp_mulai_tahun || defaultStartYear || startYear;

  const startMonthIdx = INDONESIAN_MONTHS.indexOf(effectiveStartMonthName);
  const startCalIdx = startMonthIdx >= 0 ? startMonthIdx : 6; // Default to Juli (idx 6)
  const startAbsolute = effectiveStartYear * 12 + startCalIdx;

  // Filter transactions for this student
  const studentTransactions = (transactions || []).filter(
    t => t.nisn === student.nisn && t.status !== 'CANCEL'
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
    let sisa = isDue ? monthlyFee : 0;

    if (!isDue) {
      status = 'BELUM_JATUH_TEMPO';
      sisa = 0;
    }

    if (matchingTrxs.length > 0) {
      dibayar = matchingTrxs.reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);
      const hasLunas = matchingTrxs.some(t => t.status === 'LUNAS');

      if (hasLunas || dibayar >= monthlyFee) {
        status = 'LUNAS';
        sisa = 0;
      } else {
        status = 'KURANG';
        sisa = Math.max(0, monthlyFee - dibayar);
      }
    } else {
      if (isDue) {
        status = 'BELUM_BAYAR';
        sisa = monthlyFee;
      } else {
        status = 'BELUM_JATUH_TEMPO';
        sisa = 0;
      }
    }

    return {
      ...m,
      isDue,
      status,
      tagihan: isDue ? monthlyFee : 0,
      dibayar,
      sisa,
      transactions: matchingTrxs
    };
  });

  const dueMonths = allMonths.filter(m => m.isDue);
  const paidMonths = dueMonths.filter(m => m.status === 'LUNAS');
  const unpaidDueMonths = dueMonths.filter(m => m.status !== 'LUNAS');

  const totalTagihanDue = dueMonths.reduce((acc, m) => acc + m.tagihan, 0);
  const totalDibayarDue = dueMonths.reduce((acc, m) => acc + m.dibayar, 0);
  const totalTunggakanSpp = unpaidDueMonths.reduce((acc, m) => acc + m.sisa, 0);

  const monthsNunggakList = unpaidDueMonths.map(m => m.monthName);
  const monthsNunggakFullLabels = unpaidDueMonths.map(m => m.label);

  // Non-SPP transactions for this student
  const nonSppTrxs = studentTransactions.filter(
    t => !academicMonths.some(m => matchesMonth(t, m))
  );
  const nonSppTagihan = nonSppTrxs.reduce((sum, t) => sum + (t.nominal_tagihan || 0), 0);
  const nonSppDibayar = nonSppTrxs.reduce((sum, t) => sum + (t.nominal_bayar || 0), 0);
  const nonSppSisa = nonSppTrxs.filter(t => t.status === 'KURANG').reduce((sum, t) => sum + (t.sisa || 0), 0);

  const grandTotalTagihan = totalTagihanDue + nonSppTagihan;
  const grandTotalDibayar = totalDibayarDue + nonSppDibayar;
  const grandTotalSisa = totalTunggakanSpp + nonSppSisa;

  // Sinkronisasi mutlak: jika sisa total 0 ATAU tidak ada bulan jatuh tempo yang menunggak, maka LUNAS
  const isLunas = (unpaidDueMonths.length === 0 || totalTunggakanSpp === 0) && grandTotalSisa === 0;
  let statusLabel = '';
  if (isLunas) {
    statusLabel = 'Lunas sampai bulan berjalan';
  } else if (unpaidDueMonths.length > 0) {
    const count = unpaidDueMonths.length;
    statusLabel = `Menunggak ${count} bulan (${monthsNunggakList.join(', ')})`;
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
  const activeStudents = (students || []).filter(s => s.status_aktif);

  const summaries = activeStudents.map(st =>
    calculateStudentSppStatus(st, transactions, settingTahunAjaran, referenceDate, defaultStartMonth, defaultStartYear)
  );

  const studentsWithTunggakan = summaries.filter(s => s.grandTotalSisa > 0);
  const studentsLunas = summaries.filter(s => s.isLunas && s.grandTotalSisa === 0);

  const totalTunggakanAll = summaries.reduce((acc, s) => acc + s.grandTotalSisa, 0);
  const totalTunggakanSppOnly = summaries.reduce((acc, s) => acc + s.totalTunggakanSpp, 0);
  const totalPembayaranSppMasuk = summaries.reduce((acc, s) => acc + s.totalDibayarDue, 0);

  return {
    summaries,
    studentsWithTunggakan,
    studentsLunas,
    countSantriNunggak: studentsWithTunggakan.length,
    countSantriLunas: studentsLunas.length,
    totalTunggakanAll,
    totalTunggakanSppOnly,
    totalPembayaranSppMasuk
  };
}
