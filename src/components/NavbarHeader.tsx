import React from 'react';
import { UserAccount, SchoolSetting, SyncStatus } from '../types';
import {
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  School,
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  FileSpreadsheet,
  Settings,
  Moon,
  Sun,
  Bell
} from 'lucide-react';

export type BendaharaTab = 'DASHBOARD' | 'SANTRI' | 'PEMBAYARAN' | 'KEUANGAN' | 'LAPORAN' | 'PENGATURAN';

interface NavbarHeaderProps {
  currentUser: UserAccount;
  setting: SchoolSetting;
  activeTab?: BendaharaTab;
  syncStatus?: SyncStatus;
  isDarkMode?: boolean;
  announcementCount?: number;
  onToggleDarkMode?: () => void;
  onTabChange?: (tab: BendaharaTab) => void;
  onLogout: () => void;
  onSyncClick?: () => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  currentUser,
  setting,
  activeTab = 'DASHBOARD',
  syncStatus = 'idle',
  isDarkMode = false,
  announcementCount = 0,
  onToggleDarkMode,
  onTabChange,
  onLogout,
  onSyncClick
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'BENDAHARA':
        return {
          label: 'SUPER ADMIN (BENDAHARA)',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: ShieldCheck
        };
      case 'KEPSEK':
        return {
          label: 'KEPALA SEKOLAH',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: School
        };
      case 'WALI':
        return {
          label: 'WALI MURID',
          color: 'bg-sky-100 text-sky-800 border-sky-300',
          icon: GraduationCap
        };
      default:
        return {
          label: role,
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: UserCheck
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const IconComp = badge.icon;

  const bendaharaNavItems: { id: BendaharaTab; label: string; icon: any }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'SANTRI', label: 'Data Murid', icon: Users },
    { id: 'PEMBAYARAN', label: 'Pembayaran Murid', icon: CreditCard },
    { id: 'KEUANGAN', label: 'Keuangan Sekolah', icon: Wallet },
    { id: 'LAPORAN', label: 'Laporan', icon: FileSpreadsheet },
    { id: 'PENGATURAN', label: 'Pengaturan', icon: Settings }
  ];

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      {/* Top Level Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        {/* Left: School identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-emerald-700 flex items-center justify-center p-0.5 border border-emerald-600 shadow-xs shrink-0">
            {setting.logo ? (
              <img
                src={setting.logo}
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-white font-bold text-xs font-arabic">الإعتصام</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-slate-900 text-xs sm:text-base leading-tight tracking-tight truncate">
              {setting.nama_sekolah}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden md:block truncate">
              Sistem Informasi Keuangan Sekolah &bull; Terintegrasi Google Spreadsheet & Drive
            </p>
          </div>
        </div>

        {/* Right: Symmetrical group (TA, Role, Dark Mode, Keluar) + Cloud status */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          {/* Dark Mode Toggle Button */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              type="button"
              id="btn-toggle-darkmode"
              title={isDarkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap Profesional"}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onSyncClick}
            type="button"
            title={
              setting.gas_url
                ? `Koneksi Google Apps Script Aktif (${syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Klik untuk Tarik/Sinkronkan Data'})`
                : 'Belum terhubung Web App Apps Script. Masuk ke Menu Pengaturan untuk menghubungkan.'
            }
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
              setting.gas_url
                ? syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : syncStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {setting.gas_url ? (
              <>
                <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-pulse text-amber-600' : 'text-emerald-600'}`} />
                <span className="hidden xl:inline">
                  {syncStatus === 'syncing' ? 'Menyinkron...' : syncStatus === 'error' ? 'Gagal' : 'Tersinkron'}
                </span>
                <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-slate-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xl:inline">Lokal</span>
              </>
            )}
          </button>

          {/* Symmetrical Item 1: TA 2026/2027 */}
          <div className="h-8 inline-flex items-center px-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0 whitespace-nowrap">
            <span>TA {setting.tahun_ajaran}</span>
          </div>

          {/* Symmetrical Item 2: ROLE BADGE (e.g. BENDAHARA) */}
          <div className={`h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold border ${badge.color} rounded-lg shrink-0 whitespace-nowrap`}>
            <IconComp className="w-3.5 h-3.5 shrink-0" />
            <span>{badge.label}</span>
          </div>

          {/* Wali Announcement Notification Badge */}
          {currentUser.role === 'WALI' && announcementCount > 0 && (
            <div
              className="h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg shrink-0 animate-pulse"
              title={`${announcementCount} pengumuman dan informasi aktif dari bendahara sekolah`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-700" />
              <span>{announcementCount} Pengumuman</span>
            </div>
          )}

          {/* Symmetrical Item 3: Keluar Button */}
          <button
            onClick={onLogout}
            type="button"
            id="btn-logout"
            className="h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Secondary Navigation Bar: Exclusive for BENDAHARA (6 Menus) */}
      {currentUser.role === 'BENDAHARA' && onTabChange && (
        <div className="bg-slate-50/95 border-t border-slate-200 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center space-x-1 sm:space-x-2 py-2 min-w-max">
            {bendaharaNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const TabIcon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
