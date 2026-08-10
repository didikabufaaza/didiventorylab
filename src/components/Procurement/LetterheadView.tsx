import React, { useState, useEffect } from 'react';
import { FileText, Save, Upload, CheckCircle2, Building2, Phone, Mail, MapPin, UserCheck, Image, RefreshCw } from 'lucide-react';
import { LetterheadConfig } from '../../types.js';

interface LetterheadViewProps {
  letterhead: LetterheadConfig;
  onSaveLetterhead: (config: LetterheadConfig) => Promise<void>;
}

export const LetterheadView: React.FC<LetterheadViewProps> = ({
  letterhead,
  onSaveLetterhead,
}) => {
  const [formData, setFormData] = useState<LetterheadConfig>(letterhead);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (letterhead) {
      setFormData(letterhead);
    }
  }, [letterhead]);

  const handleChange = (field: keyof LetterheadConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'logoLeftUrl' | 'logoRightUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, [target]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveLetterhead(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving letterhead:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Sample SVG Data URLs for quick default selection if none provided
  const SAMPLE_LOGO_LEFT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230f766e'/><path d='M50 15 L62 38 L85 42 L68 60 L72 85 L50 72 L28 85 L32 60 L15 42 L38 38 Z' fill='%23ffffff'/></svg>";
  const SAMPLE_LOGO_RIGHT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='20' fill='%230284c7'/><path d='M40 25 H60 V40 H75 V60 H60 V75 H40 V60 H25 V40 H40 Z' fill='%23ffffff'/></svg>";

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 shadow-xs">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pengaturan Kop Surat & Pejabat Penandatangan PO</h2>
            <p className="text-xs text-slate-500">
              Konfigurasi identitas resmi Rumah Sakit, logo kiri & kanan, serta 3 pejabat penandatangan berkas Purchase Order.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Kop Surat & TTD Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identitas Kop Surat (5 Kolom Utama) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">1. Identitas Dokumen Resmi (5 Atribut Kop Surat)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nama PEMDA */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Kolom Nama PEMDA / Instansi Induk *
              </label>
              <input
                type="text"
                required
                value={formData.pemdaName}
                onChange={(e) => handleChange('pemdaName', e.target.value)}
                placeholder="Contoh: PEMERINTAH PROVINSI DKI JAKARTA / DINAS KESEHATAN"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Tampil paling atas di Kop Surat dengan huruf kapital.</p>
            </div>

            {/* 2. NAMA RUMAH SAKIT */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. NAMA RUMAH SAKIT / FASILITAS KESEHATAN *
              </label>
              <input
                type="text"
                required
                value={formData.hospitalName}
                onChange={(e) => handleChange('hospitalName', e.target.value)}
                placeholder="Contoh: RSUD DR. RADEN SOEDJONO"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* 3. ALAMAT RUMAH SAKIT */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. ALAMAT RUMAH SAKIT *
              </label>
              <input
                type="text"
                required
                value={formData.hospitalAddress}
                onChange={(e) => handleChange('hospitalAddress', e.target.value)}
                placeholder="Contoh: Jl. Prof. Dr. Soepomo No. 45, Tebet, Jakarta Selatan"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* 4. TELPON */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                4. TELPON / FAX *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Contoh: (021) 555-1234 / Fax: (021) 555-5678"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. EMAIL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                5. EMAIL / WEBSITE *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Contoh: info@rsud-soedjono.go.id / lab@rsud-soedjono.go.id"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Logo Surat Kiri & Kanan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Image className="h-5 w-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">2. Upload Gambar Logo Kiri dan Kanan Kop Surat</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Kiri */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Logo Surat Kiri (PEMDA / Kemenkes)</span>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoLeftUrl: SAMPLE_LOGO_LEFT }))}
                  className="text-[11px] text-teal-700 font-bold hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Gunakan Preset Pemda</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-xs shrink-0">
                  {formData.logoLeftUrl ? (
                    <img src={formData.logoLeftUrl} alt="Logo Kiri" className="max-h-16 max-w-16 object-contain" />
                  ) : (
                    <div className="text-center text-[10px] text-slate-400">
                      <Image className="mx-auto h-6 w-6 text-slate-300" />
                      <span>Belum ada logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <label className="cursor-pointer inline-flex items-center space-x-2 rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs">
                    <Upload className="h-4 w-4 text-teal-600" />
                    <span>Upload File Gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logoLeftUrl')}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={formData.logoLeftUrl}
                    onChange={(e) => handleChange('logoLeftUrl', e.target.value)}
                    placeholder="Atau masukkan URL / Base64 image..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-[11px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Logo Kanan */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Logo Surat Kanan (Rumah Sakit / Lab)</span>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoRightUrl: SAMPLE_LOGO_RIGHT }))}
                  className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Gunakan Preset RS</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-xs shrink-0">
                  {formData.logoRightUrl ? (
                    <img src={formData.logoRightUrl} alt="Logo Kanan" className="max-h-16 max-w-16 object-contain" />
                  ) : (
                    <div className="text-center text-[10px] text-slate-400">
                      <Image className="mx-auto h-6 w-6 text-slate-300" />
                      <span>Belum ada logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <label className="cursor-pointer inline-flex items-center space-x-2 rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs">
                    <Upload className="h-4 w-4 text-indigo-600" />
                    <span>Upload File Gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logoRightUrl')}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={formData.logoRightUrl}
                    onChange={(e) => handleChange('logoRightUrl', e.target.value)}
                    placeholder="Atau masukkan URL / Base64 image..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-[11px] font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: 3 Kolom Penandatangan PO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">3. Setting 3 Pejabat Penandatangan Surat PO</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pejabat 1: Kabid Penunjang Medis */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
              <span className="font-bold text-xs text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-md inline-block">
                1. Kabid Penunjang Medis
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Header TTD</label>
                <input
                  type="text"
                  value={formData.signatory1Title}
                  onChange={(e) => handleChange('signatory1Title', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory1Name}
                  onChange={(e) => handleChange('signatory1Name', e.target.value)}
                  placeholder="dr. Hj. Endang Rahmawati, M.Kes"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">NIP Pejabat *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory1Nip}
                  onChange={(e) => handleChange('signatory1Nip', e.target.value)}
                  placeholder="NIP. 19760412 200312 2 004"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>
            </div>

            {/* Pejabat 2: Kepala Instalasi Farmasi */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
              <span className="font-bold text-xs text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-md inline-block">
                2. Kepala Instalasi Farmasi
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Header TTD</label>
                <input
                  type="text"
                  value={formData.signatory2Title}
                  onChange={(e) => handleChange('signatory2Title', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory2Name}
                  onChange={(e) => handleChange('signatory2Name', e.target.value)}
                  placeholder="Apt. Rian Hidayat, S.Farm"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">NIP Pejabat *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory2Nip}
                  onChange={(e) => handleChange('signatory2Nip', e.target.value)}
                  placeholder="NIP. 19820815 200804 1 003"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>
            </div>

            {/* Pejabat 3: Kepala Instalasi Laboratorium */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
              <span className="font-bold text-xs text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-md inline-block">
                3. Kepala Instalasi Laboratorium
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan / Header TTD</label>
                <input
                  type="text"
                  value={formData.signatory3Title}
                  onChange={(e) => handleChange('signatory3Title', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory3Name}
                  onChange={(e) => handleChange('signatory3Name', e.target.value)}
                  placeholder="Dr. Hendra Wijaya, Sp.PK"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">NIP Pejabat *</label>
                <input
                  type="text"
                  required
                  value={formData.signatory3Nip}
                  onChange={(e) => handleChange('signatory3Nip', e.target.value)}
                  placeholder="NIP. 19791104 200604 1 009"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Kop Surat & TTD'}</span>
          </button>
        </div>
      </form>

      {/* Live Preview Kop Surat & Document Signature Layout */}
      <div className="rounded-2xl border border-slate-300 bg-white p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pratinjau Kop Surat Resmi & Tata Letak Penandatangan PO
          </h4>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Simulasi Tampilan Surat
          </span>
        </div>

        {/* Kop Surat Header Layout */}
        <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Kiri */}
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {formData.logoLeftUrl ? (
                <img src={formData.logoLeftUrl} alt="Logo Left" className="max-h-20 max-w-20 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                  Logo Kiri
                </div>
              )}
            </div>

            {/* Header Text Center */}
            <div className="flex-1 space-y-1">
              <h3 className="text-xs font-bold tracking-widest text-slate-800 uppercase">
                {formData.pemdaName || 'PEMERINTAH KABUPATEN / PROVINSI'}
              </h3>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                {formData.hospitalName || 'NAMA RUMAH SAKIT / FASILITAS KESEHATAN'}
              </h2>
              <p className="text-[11px] text-slate-700 font-medium">
                {formData.hospitalAddress || 'Alamat Rumah Sakit belum diisi'}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                Telp: {formData.phone || '-'} | Email: {formData.email || '-'}
              </p>
            </div>

            {/* Logo Kanan */}
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {formData.logoRightUrl ? (
                <img src={formData.logoRightUrl} alt="Logo Right" className="max-h-20 max-w-20 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                  Logo Kanan
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Content Sample */}
        <div className="text-center py-2 space-y-1">
          <h3 className="text-sm font-bold text-slate-900 underline uppercase tracking-wider">SURAT PURCHASE ORDER REAGEN</h3>
          <p className="text-[11px] font-mono text-slate-600">Nomor: PO/2026/08/001</p>
        </div>

        {/* Signature Preview Grid (3 Columns) */}
        <div className="pt-6 border-t border-slate-100">
          <p className="text-[11px] text-center font-bold text-slate-500 mb-6">
            Ditetapkan di Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-3 gap-4 text-center">
            {/* 1. Kabid Penunjang Medis */}
            <div className="space-y-12">
              <div>
                <p className="text-[11px] font-bold text-slate-800">{formData.signatory1Title}</p>
                <p className="text-[10px] text-slate-500">Mengetahui/Menyetujui</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 underline">{formData.signatory1Name}</p>
                <p className="text-[10px] font-mono text-slate-600">{formData.signatory1Nip}</p>
              </div>
            </div>

            {/* 2. Kepala Instalasi Farmasi */}
            <div className="space-y-12">
              <div>
                <p className="text-[11px] font-bold text-slate-800">{formData.signatory2Title}</p>
                <p className="text-[10px] text-slate-500">Pemeriksa Pengadaan</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 underline">{formData.signatory2Name}</p>
                <p className="text-[10px] font-mono text-slate-600">{formData.signatory2Nip}</p>
              </div>
            </div>

            {/* 3. Kepala Instalasi Laboratorium */}
            <div className="space-y-12">
              <div>
                <p className="text-[11px] font-bold text-slate-800">{formData.signatory3Title}</p>
                <p className="text-[10px] text-slate-500">Pemohon Pengadaan</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 underline">{formData.signatory3Name}</p>
                <p className="text-[10px] font-mono text-slate-600">{formData.signatory3Nip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
