import React, { useState } from 'react';
import { UserRole } from '../../types.js';
import { loginApi, registerApi, resetPasswordApi } from '../../lib/api.js';
import { Eye, EyeOff, FlaskConical, LogIn, UserPlus, ChevronLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

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
      setResetError(err.message || 'Gagal mereset password. Pastikan username dan email terdaftar sudah benar.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0c1938]">
      {/* Sleek, Bright Royal Blue Hospital & Lab Inventory Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-110 contrast-105 opacity-95 scale-105"
        style={{ backgroundImage: `url('/lab_login_bg.jpg')` }}
      >
        {/* Soft, Elegant Royal Blue Gradient & Subtle Blur Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1d43]/70 via-[#132a5e]/60 to-[#1e3a8a]/65 backdrop-blur-[1px]" />
      </div>

      {/* Animated background soft royal blue glow accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl animate-pulse delay-500" />

        {/* Subtle grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/40 mb-4 ring-4 ring-white/10">
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">SI-REAGEN</h1>
          <p className="text-sm text-blue-100/90 mt-1 font-medium drop-shadow-xs">Sistem Manajemen Persediaan Reagen Lab</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-blue-300/25 bg-[#0f234e]/60 backdrop-blur-2xl shadow-2xl shadow-blue-950/80 overflow-hidden">
          {/* Card Header Indicator */}
          <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400" />

          <div className="p-8">
            {/* === LOGIN FORM === */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Selamat Datang</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Masuk dengan akun LRIMS Anda</p>
                </div>

                {loginError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 flex items-start space-x-2.5">
                    <span className="text-rose-400 text-xs mt-0.5">⚠</span>
                    <p className="text-xs text-rose-300 font-medium">{loginError}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Masukkan username..."
                    className="w-full rounded-xl bg-white/10 border border-blue-200/20 text-white placeholder:text-blue-200/50 px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-400/80 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/30 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('reset-password'); setResetError(''); }}
                      className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition-colors"
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
                      className="w-full rounded-xl bg-white/10 border border-blue-200/20 text-white placeholder:text-blue-200/50 px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:border-blue-400/80 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-200/70 hover:text-white transition-colors"
                    >
                      {showLoginPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center space-x-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-sm font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/40 hover:shadow-blue-500/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span>{loginLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="px-3 text-xs text-slate-500">atau</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
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
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-white">Daftar Akun Baru</h2>
                    <p className="text-xs text-slate-400">Perlu disetujui Super Admin sebelum dapat masuk</p>
                  </div>
                </div>

                {regError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3">
                    <p className="text-xs text-rose-300 font-medium">{regError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Nama Lengkap *</label>
                    <input
                      type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama lengkap beserta gelar..."
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Username *</label>
                    <input
                      type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="username unik"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Email *</label>
                    <input
                      type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@rumahsakit.id"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Unit / Instalasi *</label>
                    <input
                      type="text" required value={regUnit} onChange={(e) => setRegUnit(e.target.value)}
                      placeholder="Contoh: Lab Kimia Klinik / Patologi Anatomi"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Password *</label>
                    <div className="relative">
                      <input
                        type={showRegPwd ? 'text' : 'password'} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 pr-9 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                      />
                      <button type="button" onClick={() => setShowRegPwd(!showRegPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showRegPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Konfirmasi Password *</label>
                    <input
                      type="password" required value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3 text-sm font-bold text-white hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60"
                >
                  {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>{regLoading ? 'Mendaftarkan...' : 'Kirim Permohonan Daftar'}</span>
                </button>
              </form>
            )}

            {/* === REGISTER SUCCESS === */}
            {mode === 'register-success' && (
              <div className="text-center space-y-5 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/15 border border-teal-500/30">
                  <ShieldCheck className="h-8 w-8 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Permohonan Terkirim!</h2>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Pendaftaran akun Anda (<strong className="text-slate-300">{regUsername}</strong>) dengan Unit/Instalasi <strong className="text-teal-300">{regUnit}</strong> telah dikirim ke Super Admin untuk diverifikasi.
                  </p>
                </div>
                <button
                  onClick={() => { setMode('login'); setRegUsername(''); setRegPassword(''); setRegConfirm(''); setRegName(''); setRegEmail(''); setRegUnit(''); }}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-500 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Kembali ke Halaman Login</span>
                </button>
              </div>
            )}

            {/* === RESET PASSWORD FORM === */}
            {mode === 'reset-password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-white">Reset Password</h2>
                    <p className="text-xs text-slate-400">Masukkan username & email terdaftar Anda</p>
                  </div>
                </div>

                {resetError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3">
                    <p className="text-xs text-rose-300 font-medium">{resetError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Username *</label>
                    <input
                      type="text" required value={resetUsername} onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="Masukkan username Anda..."
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Email Terdaftar *</label>
                    <input
                      type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="email@rumahsakit.id"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Password Baru *</label>
                    <div className="relative">
                      <input
                        type={showResetPwd ? 'text' : 'password'} required value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 pr-9 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                      />
                      <button type="button" onClick={() => setShowResetPwd(!showResetPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showResetPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Konfirmasi Password Baru *</label>
                    <input
                      type="password" required value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="w-full rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-slate-600 px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-white hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-60"
                >
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  <span>{resetLoading ? 'Memproses Reset...' : 'Reset Password Saya'}</span>
                </button>
              </form>
            )}

            {/* === RESET SUCCESS === */}
            {mode === 'reset-success' && (
              <div className="text-center space-y-5 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <KeyRound className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reset Password Berhasil!</h2>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    {resetSuccessMsg || 'Password Anda telah berhasil diperbarui.'}
                  </p>
                </div>
                <button
                  onClick={() => { setMode('login'); setResetUsername(''); setResetEmail(''); setResetNewPassword(''); setResetConfirmPassword(''); }}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-500 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Masuk Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} SI-REAGEN LRIMS · Instalasi Laboratorium
        </p>
      </div>
    </div>
  );
};
