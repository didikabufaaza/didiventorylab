# Sistem Manajemen Persediaan Reagen Laboratorium (SI-REAGEN)

Aplikasi Web Full-Stack terintegrasi untuk manajemen stok reagen laboratorium, alur pemesanan Purchase Order (PO) bertingkat, penelusuran FEFO (First Expired, First Out), serta Pengaturan Kop Surat Resmi & 3 Pejabat Penandatangan.

---

## 🚀 Cara Mengunduh & Menggunakan Source Code Ini

1. **Unduh Source Code (ZIP / GitHub)**:
   - Klik menu **Settings** di pojok kanan atas AI Studio.
   - Pilih **Export to ZIP** atau **Export to GitHub** untuk mengunduh seluruh direktori kode sumber aplikasi ini.

2. **Jalankan Aplikasi di Komputer Lokal**:
   ```bash
   # 1. Install dependensi
   npm install

   # 2. Jalankan server pengembangan
   npm run dev
   ```
   Akses aplikasi di browser pada alamat `http://localhost:3000`.

3. **Petunjuk untuk AI / Developer Selanjutnya**:
   - Buka dan baca file `AGENTS.md` di root direktori. File tersebut memuat arsitektur sistem lengkap, daftar REST API, skema data, dan instruksi teknis agar AI lain atau tim developer dapat langsung melanjutkan pengembangan tanpa perlu membuat dari awal.

---

## 🛠️ Fitur Terpasang
- **Kop Surat Resmi & 3 Pejabat TTD**: Pengaturan 5 atribut identitas rumah sakit, upload logo kiri/kanan, dan 3 pejabat penandatangan PO (Kabid Penunjang Medis, Kepala Instalasi Farmasi, Kepala Instalasi Laboratorium).
- **Alur PO Bertingkat**: Validation Workflow `Draft` -> `Submitted` -> `Approved` -> `Received`.
- **Cetak Surat PO Ber-Kop & Export PDF**: Fitur cetak dokumen resmi ber-kop surat lengkap dengan stempel validasi `APPROVED`, serta tombol **Simpan PDF / Unduh PDF** otomatis menggunakan `jsPDF` dan `html2canvas`.
- **Manajemen Reagen FEFO**: Notifikasi kadaluarsa dan stok di bawah batas aman.
- **Stock Opname & Audit Trail**: Log aktivitas pengguna secara otomatis.

---
*Dikembangkan dengan React 18, Vite, Express.js, & Tailwind CSS.*
