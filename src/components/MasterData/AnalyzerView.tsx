import React, { useState } from 'react';
import { Cpu, Plus, Search, Edit2, Trash2, X, Activity, Tag } from 'lucide-react';
import { Analyzer, UserRole } from '../../types.js';

interface AnalyzerViewProps {
  analyzers: Analyzer[];
  currentRole: UserRole;
  onCreateAnalyzer?: (analyzer: Partial<Analyzer>) => Promise<void>;
  onUpdateAnalyzer?: (id: string, analyzer: Partial<Analyzer>) => Promise<void>;
  onDeleteAnalyzer?: (id: string) => Promise<void>;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  analyzers,
  currentRole,
  onCreateAnalyzer,
  onUpdateAnalyzer,
  onDeleteAnalyzer,
}) => {
  const canEdit = currentRole === 'Super Admin' || currentRole === 'Admin Inventory';

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnalyzer, setEditingAnalyzer] = useState<Analyzer | null>(null);

  // Custom Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<Analyzer | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    unit: 'Kimia Klinik',
    parametersInput: '',
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
  });

  const handleOpenAdd = () => {
    setEditingAnalyzer(null);
    setFormData({
      name: '',
      brand: '',
      model: '',
      serialNumber: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
      unit: 'Kimia Klinik',
      parametersInput: '',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (anz: Analyzer) => {
    setEditingAnalyzer(anz);
    setFormData({
      name: anz.name,
      brand: anz.brand,
      model: anz.model,
      serialNumber: anz.serialNumber,
      unit: anz.unit,
      parametersInput: anz.parameters ? anz.parameters.join(', ') : '',
      status: anz.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parametersList = formData.parametersInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name,
      brand: formData.brand,
      model: formData.model,
      serialNumber: formData.serialNumber,
      unit: formData.unit,
      parameters: parametersList,
      status: formData.status,
    };

    if (editingAnalyzer && onUpdateAnalyzer) {
      await onUpdateAnalyzer(editingAnalyzer.id, payload);
    } else if (onCreateAnalyzer) {
      await onCreateAnalyzer(payload);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget && onDeleteAnalyzer) {
      await onDeleteAnalyzer(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Checkbox helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredAnalyzers = analyzers.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const paramsText = a.parameters ? a.parameters.join(' ').toLowerCase() : '';
    return (
      a.name.toLowerCase().includes(q) ||
      a.brand.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.unit.toLowerCase().includes(q) ||
      paramsText.includes(q)
    );
  });

  const allSelected =
    filteredAnalyzers.length > 0 && selectedIds.size === filteredAnalyzers.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAnalyzers.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!onDeleteAnalyzer || selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await onDeleteAnalyzer(id);
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Cpu className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Master Analyzer &amp; Parameter Pemeriksaan</h2>
              <p className="text-xs text-slate-500">
                Kelola instrumen/alat otomatisasi laboratorium, nomor seri, unit pelayanan, dan daftar parameter uji.
              </p>
            </div>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Analyzer Baru</span>
          </button>
        )}
      </div>

      {/* Search Bar + Select All */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari analyzer, merk, parameter (e.g. Glucose, Hb)..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {canEdit && filteredAnalyzers.length > 0 && (
          <label className="flex items-center space-x-2 cursor-pointer select-none text-xs font-semibold text-slate-600 hover:text-teal-700 transition">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
            />
            <span>{allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
          </label>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAnalyzers.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            <p className="text-sm font-semibold">Tidak ada data Analyzer &amp; Parameter ditemukan.</p>
          </div>
        ) : (
          filteredAnalyzers.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 hover:border-teal-300 transition flex flex-col justify-between ${
                selectedIds.has(a.id) ? 'border-teal-400 ring-2 ring-teal-200' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Per-row checkbox */}
                    {canEdit && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
                        title="Pilih analyzer ini"
                      />
                    )}
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      {a.unit}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        a.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {a.status}
                    </span>
                    <div className="flex items-center space-x-1">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(a)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          title="Edit Analyzer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && onDeleteAnalyzer && (
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Analyzer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-base">{a.name}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Merk: <span className="text-slate-800 font-semibold">{a.brand}</span> ({a.model})
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">S/N: {a.serialNumber}</p>
                </div>

                {/* Parameters list tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                    <Tag className="h-3 w-3 text-teal-600" />
                    <span>Parameter Uji Uji ({a.parameters?.length || 0}):</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {a.parameters && a.parameters.length > 0 ? (
                      a.parameters.map((p, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ada parameter tersambung</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status Koneksi: LIS / HIS Ready</span>
                <span className="text-emerald-600 font-bold flex items-center space-x-1">
                  <Activity className="h-3 w-3" />
                  <span>Online</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Delete Toolbar — fixed bottom */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between bg-rose-600 px-6 py-3 shadow-2xl">
          <span className="text-sm font-bold text-white">
            {selectedIds.size} analyzer terpilih
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl border border-rose-300 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1.5 rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition shadow"
            >
              <Trash2 className="h-4 w-4" />
              <span>Hapus {selectedIds.size} analyzer terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Analyzer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingAnalyzer ? 'Edit Analyzer & Parameter' : 'Tambah Analyzer Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Analyzer / Instrumen *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cobas c311 Chemistry Analyzer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Merk / Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="Roche, Sysmex, Abbott"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model Uji</label>
                  <input
                    type="text"
                    placeholder="c311, XN-1000, i1000SR"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Lab *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                  >
                    <option value="Kimia Klinik">Kimia Klinik</option>
                    <option value="Hematologi">Hematologi</option>
                    <option value="Imunologi">Imunologi</option>
                    <option value="Urinalisis">Urinalisis</option>
                    <option value="Mikrobiologi">Mikrobiologi</option>
                    <option value="Bank Darah">Bank Darah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parameter Pemeriksaan (Pisahkan dengan koma)
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Glucose, Urea, Creatinine, SGOT, SGPT"
                  value={formData.parametersInput}
                  onChange={(e) => setFormData({ ...formData, parametersInput: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ketik setiap parameter terpisah dengan tanda koma (e.g. Glucose, Hb, Leukosit)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Operational</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-md"
                >
                  {editingAnalyzer ? 'Simpan Perubahan' : 'Tambah Analyzer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Delete Analyzer */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Master Analyzer?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong> ({deleteTarget.brand})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md"
              >
                Ya, Hapus Analyzer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
