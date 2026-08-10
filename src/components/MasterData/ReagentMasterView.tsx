import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  Layers,
  Thermometer,
  Scan,
  Camera,
  FileSpreadsheet,
} from 'lucide-react';
import { Reagent, UserRole, ReagentBatch } from '../../types.js';
import { BarcodeScannerModal } from '../BarcodeScannerModal.js';
import { SmartReagentInputModal } from './SmartReagentInputModal.js';

interface ReagentMasterViewProps {
  reagents: Reagent[];
  batches?: ReagentBatch[];
  currentRole: UserRole;
  onCreateReagent: (reagent: Partial<Reagent>) => Promise<void>;
  onCreateReagentsBatch?: (reagents: Partial<Reagent>[]) => Promise<void>;
  onUpdateReagent: (id: string, reagent: Partial<Reagent>) => Promise<void>;
  onDeleteReagent?: (id: string) => Promise<void>;
}

export const ReagentMasterView: React.FC<ReagentMasterViewProps> = ({
  reagents,
  batches = [],
  currentRole,
  onCreateReagent,
  onCreateReagentsBatch,
  onUpdateReagent,
  onDeleteReagent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [editingReagent, setEditingReagent] = useState<Reagent | null>(null);
  const [deleteTargetReagent, setDeleteTargetReagent] = useState<Reagent | null>(null);

  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'master_search' | 'form_barcode'>('master_search');
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    genericName: '',
    brand: '',
    manufacturer: '',
    category: 'Kimia Klinik',
    subCategory: '',
    analyzer: 'Cobas c311 Analyzer',
    parameter: '',
    unit: 'Kit',
    packageSize: '100 Test/Kit',
    price: 0,
    sellingPrice: 0,
    minimumStock: 5,
    maximumStock: 25,
    reorderPoint: 8,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C' as const,
    openStabilityValue: 30,
    openStabilityUnit: 'hari' as const,
    description: '',
  });

  const filteredReagents = reagents.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingReagent(null);
    setFormData({
      code: `REG-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `899${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: '',
      genericName: '',
      brand: '',
      manufacturer: '',
      category: 'Kimia Klinik',
      subCategory: '',
      analyzer: 'Cobas c311 Analyzer',
      parameter: '',
      unit: 'Kit',
      packageSize: '100 Test/Kit',
      price: 0,
      sellingPrice: 0,
      minimumStock: 5,
      maximumStock: 25,
      reorderPoint: 8,
      storageMinTemp: 2,
      storageMaxTemp: 8,
      storageCondition: '2-8°C',
      openStabilityValue: 30,
      openStabilityUnit: 'hari',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reagent: Reagent) => {
    setEditingReagent(reagent);
    setFormData({
      code: reagent.code,
      barcode: reagent.barcode,
      name: reagent.name,
      genericName: reagent.genericName || '',
      brand: reagent.brand,
      manufacturer: reagent.manufacturer,
      category: reagent.category,
      subCategory: reagent.subCategory || '',
      analyzer: reagent.analyzer || '',
      parameter: reagent.parameter || '',
      unit: reagent.unit,
      packageSize: reagent.packageSize,
      price: reagent.price || 0,
      sellingPrice: reagent.sellingPrice || 0,
      minimumStock: reagent.minimumStock,
      maximumStock: reagent.maximumStock,
      reorderPoint: reagent.reorderPoint,
      storageMinTemp: reagent.storageMinTemp,
      storageMaxTemp: reagent.storageMaxTemp,
      storageCondition: reagent.storageCondition,
      openStabilityValue: reagent.openStabilityValue || 30,
      openStabilityUnit: reagent.openStabilityUnit || 'hari',
      description: reagent.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingReagent) {
      await onUpdateReagent(editingReagent.id, formData);
    } else {
      await onCreateReagent({ ...formData, status: 'Aktif' });
    }
    setIsModalOpen(false);
  };

  const handleBarcodeScanSuccess = (scannedCode: string) => {
    if (scannerTarget === 'form_barcode') {
      setFormData((prev) => ({ ...prev, barcode: scannedCode }));
      setScanNotice(`Barcode berhasil di-scan: ${scannedCode}`);
      setTimeout(() => setScanNotice(null), 4000);
    } else {
      const match = reagents.find(
        (r) => r.barcode === scannedCode || r.code.toLowerCase() === scannedCode.toLowerCase()
      );
      if (match) {
        handleOpenEdit(match);
        setScanNotice(`Reagen "${match.name}" ditemukan dari barcode ${scannedCode}.`);
      } else {
        handleOpenAdd();
        setFormData((prev) => ({ ...prev, barcode: scannedCode }));
        setScanNotice(`Barcode ${scannedCode} belum terdaftar. Silakan lengkapi data reagen baru.`);
      }
      setTimeout(() => setScanNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Scan Notice Alert */}
      {scanNotice && (
        <div className="flex items-center space-x-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-900 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />
          <span>{scanNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <FlaskConical className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Master Data Katalog Reagen</h2>
              <p className="text-xs text-slate-500">
                Kelola katalog spesifikasi reagen, ambang minimum stok, reorder point, dan pedoman open stability.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              setScannerTarget('master_search');
              setIsScannerOpen(true);
            }}
            className="flex items-center space-x-2 rounded-lg bg-indigo-100 px-4 py-2.5 text-xs font-semibold text-indigo-800 border border-indigo-200 hover:bg-indigo-200 transition"
          >
            <Scan className="h-4 w-4 text-indigo-700" />
            <span>Scan Barcode Kamera / HP</span>
          </button>

          <button
            onClick={() => setIsSmartInputOpen(true)}
            className="flex items-center space-x-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Smart Input Master Reagen</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Reagen Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Reagen, Kode, Barcode, Merk..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Kategori:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="Kimia Klinik">Kimia Klinik</option>
            <option value="Hematologi">Hematologi</option>
            <option value="Imunologi">Imunologi</option>
            <option value="Urinalisis">Urinalisis</option>
            <option value="Mikrobiologi">Mikrobiologi</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Kode & Barcode</th>
                <th className="px-4 py-3">Nama Reagen</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Kemasan & Satuan</th>
                <th className="px-4 py-3">Harga Beli / Jual</th>
                <th className="px-4 py-3">Min / Reorder / Max</th>
                <th className="px-4 py-3">Kondisi Storage</th>
                <th className="px-4 py-3">Open Stability</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredReagents.map((r) => {
                const hasExpiredBatch = batches.some(
                  (b) =>
                    b.reagentId === r.id &&
                    b.currentQuantity > 0 &&
                    (b.status === 'Expired' || new Date(b.expiryDate) < new Date())
                );
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-slate-900">{r.code}</span>
                      <span className="block text-[10px] text-slate-500">{r.barcode}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span>{r.name}</span>
                        {hasExpiredBatch && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 border border-rose-200 animate-pulse shrink-0">
                            KADALUARSA (EXPIRED)
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Merk: {r.brand} | Analyzer: {r.analyzer || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.category}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-teal-800">{r.packageSize}</span>
                  </td>
                  <td className="px-4 py-3 font-bold font-mono">
                    <div className="text-emerald-700">B: Rp {(r.price || 0).toLocaleString('id-ID')}</div>
                    <div className="text-teal-700 text-[10px]">J: Rp {(r.sellingPrice || 0).toLocaleString('id-ID')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-amber-700 font-bold">{r.minimumStock}</span> /{' '}
                    <span className="text-blue-700 font-bold">{r.reorderPoint}</span> /{' '}
                    <span className="text-slate-700">{r.maximumStock}</span> {r.unit}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center space-x-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      <Thermometer className="h-3 w-3 text-blue-600" />
                      <span>{r.storageCondition}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {r.openStabilityValue} {r.openStabilityUnit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 transition"
                        title="Edit Master Reagen"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {onDeleteReagent && (
                        <button
                          onClick={() => setDeleteTargetReagent(r)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 transition"
                          title="Hapus Master Reagen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingReagent ? 'Edit Master Reagen' : 'Tambah Master Reagen Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Reagen *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Barcode Master (Input Manual / Scan Kamera HP)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Ketik barcode atau scan..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('form_barcode');
                        setIsScannerOpen(true);
                      }}
                      className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition shrink-0"
                      title="Scan Barcode Kamera Smartphone / USB Scanner"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">Scan HP</span>
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Reagen *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Merk / Brand *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                  >
                    <option value="Kimia Klinik">Kimia Klinik</option>
                    <option value="Hematologi">Hematologi</option>
                    <option value="Imunologi">Imunologi</option>
                    <option value="Urinalisis">Urinalisis</option>
                    <option value="Mikrobiologi">Mikrobiologi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Kit / Box / Botol"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kemasan / Isi</label>
                  <input
                    type="text"
                    value={formData.packageSize}
                    onChange={(e) => setFormData({ ...formData, packageSize: e.target.value })}
                    placeholder="Contoh: 500 Test/Kit"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Beli (Rp) *</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="Contoh: 1250000"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-emerald-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    placeholder="Contoh: 1500000"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-teal-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Minimum</label>
                  <input
                    type="number"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi Suhu Storage</label>
                  <select
                    value={formData.storageCondition}
                    onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                  >
                    <option value="2-8°C">2-8°C (Refrigerated)</option>
                    <option value="Room Temperature">Room Temperature (15-25°C)</option>
                    <option value="-20°C">-20°C (Deep Freezer)</option>
                    <option value="-80°C">-80°C (Ultra Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi Open Stability (Hari)</label>
                  <input
                    type="number"
                    value={formData.openStabilityValue}
                    onChange={(e) => setFormData({ ...formData, openStabilityValue: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-md"
                >
                  Simpan Master Reagen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Camera / Phone / USB scanning */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
        title={
          scannerTarget === 'form_barcode'
            ? 'Scan Barcode Reagen Baru'
            : 'Scan Barcode Katalog Reagen'
        }
        subtitle="Arahkan kamera smartphone atau USB scanner ke barcode reagen"
      />

      {/* Delete Reagent Confirmation Modal */}
      {deleteTargetReagent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Master Reagen?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus master reagen <strong>{deleteTargetReagent.name}</strong> ({deleteTargetReagent.code})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteTargetReagent(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (onDeleteReagent && deleteTargetReagent) {
                    await onDeleteReagent(deleteTargetReagent.id);
                    setDeleteTargetReagent(null);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md"
              >
                Ya, Hapus Reagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Input Excel Copy-Paste Modal */}
      {isSmartInputOpen && onCreateReagentsBatch && (
        <SmartReagentInputModal
          isOpen={isSmartInputOpen}
          onClose={() => setIsSmartInputOpen(false)}
          onSave={onCreateReagentsBatch}
        />
      )}
    </div>
  );
};
