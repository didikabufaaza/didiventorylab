import React, { useState } from 'react';
import { UserRole } from '../../types.js';
import { loginApi, registerApi, resetPasswordApi } from '../../lib/api.js';
import { Eye, EyeOff, LogIn, UserPlus, ChevronLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; name: string; username: string; role: UserRole; unit: string; email: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'register-success' | 'reset-password' | 'reset-success'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUnit, setRegUnit] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Reset Password form state
  const [resetUsername, setResetUsername] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { user } = await loginApi(loginUsername.trim(), loginPassword);
      onLoginSuccess(user as any);
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Periksa kembali username dan password Anda.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regUnit.trim()) {
      setRegError('Kolom Unit / Instalasi wajib diisi.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Konfirmasi password tidak cocok.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password minimal 6 karakter.');
      return;
    }
    setRegLoading(true);
    try {
      await registerApi({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        unit: regUnit.trim(),
        password: regPassword,
        requestedRole: 'Petugas Laboratorium',
      });
      setMode('register-success');
    } catch (err: any) {
      setRegError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError('Password minimal 6 karakter.');
      return;
    }
    setResetLoading(true);
    try {
      const msg = await resetPasswordApi({
        username: resetUsername.trim(),
        email: resetEmail.trim(),
        newPassword: resetNewPassword,
      });
      setResetSuccessMsg(msg);
      setMode('reset-success');
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black text-white">
      {/* Background Image with Dark Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-75 contrast-125 opacity-40 scale-105"
        style={{ backgroundImage: `url('/lab_login_bg.jpg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/80 to-black/95 backdrop-blur-[2px]" />
      </div>

      {/* Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4 py-8">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-indigo-950/80 mb-3 p-2 ring-1 ring-slate-700">
            <img
              src="https://lh3.googleusercontent.com/d/1aJ9JZ4J44viC5qgISqdHgNAOx82_9ZFL"
              alt="di-diventory logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            di-diventory
          </h1>
          <p className="text-sm text-indigo-300 font-semibold mt-1">didik-digital inventory</p>
        </div>

        {/* Form Card (Black Theme & High Contrast) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black ring-1 ring-slate-800 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600" />

          <div className="p-7">
            {/* === LOGIN FORM === */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Selamat Datang</h2>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Masuk ke sistem persediaan laboratorium Anda</p>
                </div>

                {loginError && (
                  <div className="rounded-xl bg-rose-950/60 border border-rose-600/50 px-4 py-3 flex items-start space-x-2.5">
                    <span className="text-rose-400 text-xs mt-0.5">⚠</span>
                    <p className="text-xs text-rose-200 font-semibold">{loginError}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Masukkan username..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('reset-password'); setResetError(''); }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPwd ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-4 py-3 pr-12 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showLoginPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center space-x-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 py-3.5 text-sm font-extrabold text-white hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-950/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span>{loginLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="px-3 text-xs font-semibold text-slate-400">atau</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-slate-700 bg-slate-900/80 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Daftar Akun Baru</span>
                </button>
              </form>
            )}

            {/* === REGISTER FORM === */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-white">Daftar Akun Baru</h2>
                    <p className="text-xs text-slate-300">Perlu disetujui Super Admin sebelum dapat masuk</p>
                  </div>
                </div>

                {regError && (
                  <div className="rounded-xl bg-rose-950/60 border border-rose-600/50 px-4 py-3">
                    <p className="text-xs text-rose-200 font-semibold">{regError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-200">Nama Lengkap *</label>
                    <input
                      type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama lengkap beserta gelar..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Username *</label>
                    <input
                      type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Username unik..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Email *</label>
                    <input
                      type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@rs.go.id"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-200">Unit / Instalasi *</label>
                    <input
                      type="text" required value={regUnit} onChange={(e) => setRegUnit(e.target.value)}
                      placeholder="Contoh: Lab Hematologi, Patologi Klinik..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Password *</label>
                    <div className="relative">
                      <input
                        type={showRegPwd ? 'text' : 'password'} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 pr-9 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="button" onClick={() => setShowRegPwd(!showRegPwd)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showRegPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Konfirmasi Password *</label>
                    <input
                      type={showRegPwd ? 'text' : 'password'} required value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit" disabled={regLoading}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-extrabold text-white hover:bg-indigo-500 shadow-md shadow-indigo-950 transition-all disabled:opacity-60"
                  >
                    {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    <span>{regLoading ? 'Mendaftarkan...' : 'Kirim Permohonan Akun'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* === REGISTER SUCCESS === */}
            {mode === 'register-success' && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Permohonan Terkirim!</h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Akun Anda telah berhasil terdaftar. Hubungi Super Admin untuk menyetujui akun Anda.
                  </p>
                </div>
                <button
                  onClick={() => setMode('login')}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Kembali ke Form Login</span>
                </button>
              </div>
            )}

            {/* === RESET PASSWORD FORM === */}
            {mode === 'reset-password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    type="button" onClick={() => setMode('login')}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Reset Password</h2>
                    <p className="text-xs text-slate-300">Verifikasi identitas akun Anda</p>
                  </div>
                </div>

                {resetError && (
                  <div className="rounded-xl bg-rose-950/60 border border-rose-600/50 px-4 py-3">
                    <p className="text-xs text-rose-200 font-semibold">{resetError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Username *</label>
                    <input
                      type="text" required value={resetUsername} onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="Masukkan username Anda..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Email Terdaftar *</label>
                    <input
                      type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Masukkan email Anda..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Password Baru *</label>
                    <div className="relative">
                      <input
                        type={showResetPwd ? 'text' : 'password'} required value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 pr-9 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="button" onClick={() => setShowResetPwd(!showResetPwd)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showResetPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Konfirmasi Password Baru *</label>
                    <input
                      type={showResetPwd ? 'text' : 'password'} required value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit" disabled={resetLoading}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-extrabold text-white hover:bg-indigo-500 shadow-md shadow-indigo-950 transition-all disabled:opacity-60"
                  >
                    {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    <span>{resetLoading ? 'Memperbarui...' : 'Perbarui Password Saya'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* === RESET SUCCESS === */}
            {mode === 'reset-success' && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  <KeyRound className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Reset Password Berhasil!</h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {resetSuccessMsg || 'Password Anda telah berhasil diperbarui.'}
                  </p>
                </div>
                <button
                  onClick={() => { setMode('login'); setResetUsername(''); setResetEmail(''); setResetNewPassword(''); setResetConfirmPassword(''); }}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-extrabold text-white hover:bg-indigo-500 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Masuk Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Text Requested */}
        <p className="text-center text-xs text-slate-200 font-semibold mt-6 leading-relaxed bg-black/70 backdrop-blur-md py-3 px-4 rounded-xl border border-slate-800 shadow-lg">
          &copy; 2026 di-diventory-Laboratorium.rsudokut created by Muhammad Didik Wahyudi
        </p>
      </div>
    </div>
  );
};
