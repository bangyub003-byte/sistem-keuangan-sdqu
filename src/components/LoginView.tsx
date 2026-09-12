import React, { useState } from 'react';
import { SchoolSetting, UserAccount, Student } from '../types';
import { StorageService } from '../services/storageService';
import { ShieldCheck, School, GraduationCap, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginViewProps {
  setting: SchoolSetting;
  users?: UserAccount[];
  students?: Student[];
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ setting, users = [], students = [], onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const userList = (users && users.length > 0) ? users : StorageService.getUsers();
      const studentList = (students && students.length > 0) ? students : StorageService.getStudents();
      const cleanU = username.trim().toLowerCase();
      const cleanP = password.trim();

      // 1. Cek apakah login sebagai Wali Murid via NISN Murid
      const matchedStudent = (studentList || []).find(
        s => s.nisn.toLowerCase() === cleanU || s.id_siswa.toLowerCase() === cleanU
      );

      if (matchedStudent) {
        // Kata sandi resmi wali murid: "sdqutercinta" (juga izinkan 123 untuk pengujian)
        const isPassValid =
          cleanP.toLowerCase() === 'sdqutercinta' ||
          cleanP === '123' ||
          cleanP === matchedStudent.nisn;

        if (isPassValid) {
          const waliUser: UserAccount = {
            id_user: `wali_${matchedStudent.nisn}`,
            username: matchedStudent.nisn,
            password: '•••',
            nama: `Wali ${matchedStudent.nama}`,
            role: 'WALI',
            id_siswa: matchedStudent.id_siswa,
            nisn: matchedStudent.nisn
          };
          onLoginSuccess(waliUser);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Kata sandi untuk NISN murid ini salah! Gunakan kata sandi "sdqutercinta".');
          setIsLoading(false);
          return;
        }
      }

      // 2. Cek akun Bendahara, Kepsek, atau Akun Khusus terdaftar
      const found = (userList || []).find(
        u => u.username.toLowerCase() === cleanU && (
          u.password === cleanP ||
          (u.role === 'WALI' && cleanP.toLowerCase() === 'sdqutercinta')
        )
      );

      if (found) {
        // Pastikan jika role WALI, nisn atau id_siswa terkait sesuai
        if (found.role === 'WALI') {
          const st = (studentList || []).find(s => s.nisn.toLowerCase() === cleanU || s.id_siswa === found.id_siswa);
          if (st) {
            onLoginSuccess({
              ...found,
              id_siswa: st.id_siswa,
              nisn: st.nisn,
              nama: found.nama || `Wali ${st.nama}`
            });
            setIsLoading(false);
            return;
          }
        }
        onLoginSuccess(found);
      } else {
        // Berikan pesan kesalahan yang informatif dan tepat sasaran
        if (/^\d+$/.test(cleanU)) {
          setErrorMsg(`NISN "${username}" tidak terdaftar dalam pangkalan data murid sekolah. Silakan periksa kembali atau hubungi Bendahara.`);
        } else {
          setErrorMsg('Username atau Kata Sandi salah! Periksa kembali atau hubungi pihak sekolah.');
        }
      }
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-radial from-emerald-900/10 via-slate-50 to-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-emerald-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 p-6 sm:p-7 text-center text-white relative">
          <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto mb-3 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center border-2 border-emerald-300/40">
            {setting.logo ? (
              <img
                src={setting.logo}
                alt="Logo SD Qur'an Unggulan Al-I'tisham"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-emerald-900 font-bold font-arabic text-2xl">الإعتصام</span>
            )}
          </div>

          <p className="text-emerald-200 font-arabic text-base sm:text-lg tracking-wide mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-white leading-snug">
            {setting.nama_sekolah}
          </h2>
          <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium mt-1">
            Sistem Informasi Administrasi & Keuangan Terpadu
          </p>
        </div>

        {/* Login Form */}
        <div className="p-5 sm:p-7">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-username">
                Username / NISN Murid
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: 0015678901 / bendahara"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                *Wali Murid masuk menggunakan <strong>NISN Murid</strong> sebagai Username.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-password">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                *Kata sandi resmi Wali Murid: <code className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-900 font-mono">sdqutercinta</code>
              </p>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              disabled={isLoading}
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Panduan Akses Singkat & Elegan */}
          <div className="mt-5 pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Petunjuk Masuk Portal:</span>
            </div>
            <p className="pl-5 text-slate-600">
              • <strong>Wali Murid</strong>: Gunakan NISN putra/putri & kata sandi <code className="text-emerald-700 font-mono">sdqutercinta</code>
            </p>
            <p className="pl-5 text-slate-600">
              • <strong>Bendahara & Kepala Sekolah</strong>: Masuk menggunakan akun terdaftar sekolah.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 text-center border-t border-slate-200 text-xs text-slate-500">
          SD Qur'an Unggulan Al-I'tisham Playen &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
