import { SchoolSetting, Student, Transaction } from '../types';
import { StudentSppSummary } from './sppLogic';

/**
 * Normalizes an Indonesian phone number to international wa.me format (628...)
 */
export function formatPhoneNumberForWa(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    return '62' + clean.slice(1);
  }
  if (clean.startsWith('8')) {
    return '62' + clean;
  }
  if (clean.startsWith('62')) {
    return clean;
  }
  return '62' + clean;
}

/**
 * Generates a pre-filled WhatsApp URL for payment confirmation to the wali murid.
 * Pure manual link opening user's WhatsApp with ready-to-send polite and professional text.
 */
export function createPaymentConfirmationWaUrl(
  setting: SchoolSetting,
  student: Student,
  transaction: Transaction
): string {
  const phone = formatPhoneNumberForWa(student.no_hp || student.no_hp_wali);
  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  const text =
`Assalamu'alaikum Warahmatullahi Wabarakatuh.
Yth. Ayah/Bunda *${student.nama_wali || 'Wali Murid'}*, wali dari Ananda *${student.nama}* (${student.kelas}).

Alhamdulillah, pembayaran administrasi pendidikan telah kami terima dan tercatat dalam sistem keuangan sekolah:
• *No. Kuitansi*: ${transaction.id_transaksi}
• *Nama Murid*: ${student.nama} (NISN: ${student.nisn})
• *Jenis Pembayaran*: ${transaction.jenis}${transaction.bulan ? `\n• *Periode / Bulan*: ${transaction.bulan}` : ''}
• *Tanggal Bayar*: ${transaction.tanggal}${transaction.waktu ? ` pukul ${transaction.waktu} WIB` : ''}
• *Nominal Dibayar*: ${formatRupiah(transaction.nominal_bayar)}
• *Status*: ${transaction.status === 'LUNAS' ? 'LUNAS' : `KURANG BAYAR (Sisa: ${formatRupiah(transaction.sisa)})`}
• *Petugas Penerima*: ${transaction.petugas || 'Bendahara'}

Jazakumullahu khairan katsiran atas kerja sama dan kepercayaan Ayah/Bunda. Semoga Allah Subhanahu wa Ta'ala memberkahi rezeki keluarga dan memberikan kemudahan belajar bagi Ananda tercinta. Aamiin.

Hormat kami,
*Bagian Keuangan ${setting.nama_sekolah}*
${setting.no_wa ? `Kontak Resmi: ${setting.no_wa}` : ''}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates a pre-filled WhatsApp URL for polite and respectful tunggakan reminder.
 */
export function createTunggakanReminderWaUrl(
  setting: SchoolSetting,
  student: Student,
  sppSummary: StudentSppSummary
): string {
  const phone = formatPhoneNumberForWa(student.no_hp || student.no_hp_wali);
  const formatRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID');

  const unpaidMonthsStr = sppSummary.monthsNunggakFullLabels && sppSummary.monthsNunggakFullLabels.length > 0
    ? sppSummary.monthsNunggakFullLabels.join(', ')
    : sppSummary.monthsNunggakList.join(', ');

  const text =
`Assalamu'alaikum Warahmatullahi Wabarakatuh.
Yth. Ayah/Bunda *${student.nama_wali || 'Wali Murid'}*, wali dari Ananda *${student.nama}* (${student.kelas}).

Semoga Ayah/Bunda beserta seluruh keluarga senantiasa dalam limpahan taufiq, rahmat, dan kesehatan dari Allah Subhanahu wa Ta'ala.

Kami dari Bagian Keuangan *${setting.nama_sekolah}* bermaksud menyampaikan informasi administrasi SPP pendidikan Ananda tercinta:
• *Nama Santri*: ${student.nama}
• *NISN*: ${student.nisn}
• *Kelas*: ${student.kelas}
• *Periode Menunggak*: ${unpaidMonthsStr || 'Bulan Berjalan'}
• *Kewajiban SPP*: ${formatRupiah(sppSummary.totalTunggakanSpp)}${sppSummary.nonSppSisa > 0 ? `\n• *Tagihan Lainnya*: ${formatRupiah(sppSummary.nonSppSisa)}` : ''}
• *Total Tunggakan*: ${formatRupiah(sppSummary.grandTotalSisa)}

Pembayaran dapat dilakukan langsung di kantor kasir sekolah atau transfer melalui rekening resmi:
• *Bank*: ${setting.nama_bank || 'BSI (Bank Syariah Indonesia)'}
• *No. Rekening*: ${setting.no_rekening || '-'}
• *Atas Nama*: ${setting.atas_nama_rekening || setting.nama_sekolah}

Apabila Ayah/Bunda telah melakukan pembayaran, mohon abaikan pesan ini atau konfirmasikan bukti transfer kepada kami. Jazakumullahu khairan katsiran atas perhatian dan kerja samanya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
Hormat kami,
*Bagian Keuangan ${setting.nama_sekolah}*
${setting.no_wa ? `Kontak: ${setting.no_wa}` : ''}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
