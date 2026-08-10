# Dokumentasi & Panduan Pengembang AI (AGENTS.md)
## Sistem Manajemen Persediaan Reagen Laboratorium (SI-REAGEN / LRIMS)

Dokumen ini berisi arsitektur lengkap, skema data, daftar API, dan panduan untuk AI/Pengembang yang akan melanjutkan atau mengembangkan aplikasi ini tanpa harus memulai dari awal.

---

## 1. Ringkasan Proyek & Teknologi

Sistem Manajemen Persediaan Reagen Laboratorium (SI-REAGEN) adalah aplikasi Full-Stack web yang dirancang khusus untuk Instalasi Laboratorium Rumah Sakit dan Fasilitas Kesehatan. Sistem ini mengelola pencatatan stok reagen berbasis **FEFO (First Expired, First Out)**, manajemen **Purchase Order (PO)** bertingkat, pengaturan **Kop Surat Resmi & 3 Pejabat Penandatangan**, audit trail, hingga laporan rekapitulasi.

### Tech Stack:
- **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS, Lucide React Icons.
- **Backend**: Node.js dengan Express.js (`server.ts`) melayani API server-side sekaligus Vite middleware.
- **Data Persistence**: Engine JSON file-backed terintegrasi (`data/db.json`) yang berada di `src/server/db.ts` dengan dukungan data seed otomatis.
- **Port Requirement**: Bekerja secara penuh pada Port `3000` (`0.0.0.0`).

---

## 2. Struktur Direktori Utama

```
├── server.ts                             # Express Server + API Routes
├── src/
│   ├── App.tsx                           # Root React Component & Tab Routing
│   ├── types.ts                          # Type Definitions Global & Default Settings
│   ├── lib/
│   │   └── api.ts                        # Client API Fetcher Methods
│   ├── server/
│   │   └── db.ts                         # File JSON Database Storage Engine
│   └── components/
│       ├── Sidebar.tsx                   # Main Navigation Sidebar
│       ├── Procurement/
│       │   ├── LetterheadView.tsx        # Pengaturan Kop Surat & 3 TTD Pejabat
│       │   └── PurchaseOrderView.tsx     # PO Manager & Cetak Dokumen Ber-Kop
│       ├── MasterData/                   # Vendor Supplier, Lokasi, Analyzer, Reagen
│       ├── StockOpname/                  # Modul Opname & Penyesuaian Stok
│       └── Reports/                      # Laporan & Audit Logs
├── data/
│   └── db.json                           # Persistent Local Storage File
├── package.json                          # Scripts: dev, build, start
└── AGENTS.md                             # Dokumentasi & AI Handover Instructions
```

---

## 3. Fitur Utama & Modul Sistem

### 1. Pengaturan Kop Surat & 3 Pejabat Penandatangan (`/api/letterhead`)
- **5 Atribut Identitas Resmi**: Nama Pemda/Instansi, Nama Rumah Sakit, Alamat, Telp/Fax, dan Email/Website.
- **Upload Dual Logo**: Dukungan logo kiri (PEMDA/Kemenkes) dan logo kanan (RS/Lab) via Upload Image File atau URL/Preset.
- **3 Pejabat Penandatangan PO**:
  1. Kabid Penunjang Medis (Mengetahui/Menyetujui)
  2. Kepala Instalasi Farmasi (Pemeriksa Pengadaan)
  3. Kepala Instalasi Laboratorium (Pemohon Pengadaan)
- **Live Preview Document**: Pratinjau waktu nyata untuk memastikan cetakan sesuai standar dinas.

### 2. Purchase Order (PO) & Pemesanan Bertingkat (`/api/purchase-orders`)
- **Workflow Status**: `Draft` &rarr; `Submitted` (Terkirim ke Manajemen) &rarr; `Approved` (Disetujui/Divalidasi) &rarr; `Received` (Reagen Diterima ke Stok) &rarr; `Cancelled`.
- **Fitur Cetak Dokumen PO Resmi**: Menghasilkan dokumen PO yang menyertakan Kop Surat lengkap, stempel validasi `APPROVED`, rincian barang, perhitungan PPN 11%, dan 3 kolom tanda tangan pejabat.
- **Dukungan Cetak (Print) & Export PDF**:
  - Tombol **Cetak Dokumen (Print)** memicu pencetakan kertas menggunakan Aturan `@media print` di CSS (menyembunyikan sidebar, navbar, dan tombol UI secara otomatis).
  - Tombol **Simpan / Unduh PDF** menggunakan `jsPDF` + `html2canvas` untuk secara otomatis mengonversi dokumen PO ber-Kop Surat menjadi file `.pdf` yang terunduh langsung di perangkat pengguna.

### 3. Master Data & Inventori Reagen
- **Pencatatan Batch/Lot & Kadaluarsa (FEFO)**: Peringatan otomatis untuk reagen yang mendekati kadaluarsa (*near-expired*) atau stok di bawah batas aman (*safety stock*).
- **Master Vendor Supplier, Lokasi Penyimpanan (Suhu & Rak), dan Alat Analyzer**.

### 4. Audit Trail & Notifikasi Real-time
- Semua tindakan pengguna (pembuatan PO, approval, update Kop Surat, penyesuaian stok) tercatat otomatis di Log Audit beserta waktu (*timestamp*) dan peran pengguna.

---

## 4. Daftar REST API Endpoints (`server.ts`)

| Method | Endpoint | Deskripsi |
| text | text | text |
| `GET` | `/api/letterhead` | Mengambil konfigurasi Kop Surat & Penandatangan |
| `PUT` | `/api/letterhead` | Memperbarui Kop Surat & Penandatangan |
| `GET` | `/api/purchase-orders` | Mengambil daftar semua Purchase Order |
| `POST` | `/api/purchase-orders` | Membuat Purchase Order baru (`Draft` / `Submitted`) |
| `PUT` | `/api/purchase-orders/:id/submit` | Mengirim PO ke Manajemen untuk diaproval |
| `PUT` | `/api/purchase-orders/:id/approve` | Menyetujui & memvalidasi PO oleh Manajemen/Kepala Lab |
| `DELETE` | `/api/purchase-orders/:id` | Menghapus data Purchase Order |
| `GET` | `/api/reagents` | Mengambil daftar master reagen |
| `POST` | `/api/reagents` | Menambah reagen baru |
| `GET` | `/api/suppliers` | Mengambil daftar vendor supplier |
| `POST` | `/api/suppliers` | Menambah vendor supplier baru |

---

## 5. Panduan Menjalankan & Membangun Proyek

### Mode Pengembangan (Development):
```bash
npm run dev
```
*(Menjalankan `server.ts` menggunakan `tsx` pada http://localhost:3000)*

### Mode Produksi (Production Build):
```bash
npm run build
npm start
```
*(Membangun bundle frontend Vite & mengompilasi backend server menjadi `dist/server.cjs` untuk dieksekusi oleh Node.js)*

---

## 6. Petunjuk Penting untuk AI / Developer Selanjutnya

1. **Memelihara Tipe Data**: Jika menambah kolom baru pada Kop Surat atau PO, pastikan memperbarui interface di `src/types.ts` terlebih dahulu.
2. **Penyimpanan Data**: Gunakan instans `db.get()` dan `db.save()` pada `server.ts` agar data tersimpan secara konsisten ke file JSON.
3. **Pemisahan Klien-Server**: Semua logic browser tidak boleh mengimpor modul Node.js native (seperti `fs` atau `path`). Semua data ditembak melalui API helper di `src/lib/api.ts`.
4. **Validasi Linter**: Selalu jalankan `npm run lint` atau tool `compile_applet` untuk memastikan tidak ada kesalahan *TypeScript type-checking*.

---
*Dokumen ini disusun untuk memudahkan serah terima (handover) pengembangan aplikasi AI Studio.*
