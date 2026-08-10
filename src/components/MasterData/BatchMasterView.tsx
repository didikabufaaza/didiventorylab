import React, { useState } from 'react';
import {
  Boxes,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Calendar,
  Sparkles,
  MapPin,
  Truck,
  Plus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { ReagentBatch, UserRole, StorageLocation } from '../../types.js';

interface BatchMasterViewProps {
  batches: ReagentBatch[];
  locations?: StorageLocation[];
  currentRole: UserRole;
  onMarkBatchOpened: (batchId: string, openedDate: string, days: number) => Promise<void>;
  onUpdateBatchStatus: (batchId: string, status: string, notes?: string) => Promise<void>;
  onUpdateBatch?: (batchId: string, payload: Partial<ReagentBatch>) => Promise<void>;
  onDeleteBatch?: (batchId: string) => Promise<void>;
}

export const BatchMasterView: React.FC<BatchMasterViewProps> = ({
  batches,
  locations = [],
  currentRole,
  onMarkBatchOpened,
  onUpdateBatchStatus,
  onUpdateBatch,
  onDeleteBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState<ReagentBatch | null>(null);
  const [openModalType, setOpenModalType] = useState<'opened' | 'quarantine' | null>(null);

  // Form Inputs
  const [openedDateInput, setOpenedDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [openDaysInput, setOpenDaysInput] = useState(30);
  const [quarantineReason, setQuarantineReason] = useState('');

  // Super Admin Edit & Delete States
  const [editingBatch, setEditingBatch] = useState<ReagentBatch | null>(null);
  const [editForm, setEditForm] = useState({
    lotNumber: '',
    currentQuantity: 0,
    expiryDate: '',
    locationId: '',
    status: 'Available' as any,
    openedDate: '',
    openedExpiryDate: '',
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<ReagentBatch | null>(null);

  const handleOpenEditBatch = (batch: ReagentBatch) => {
    setEditingBatch(batch);
    setEditForm({
      lotNumber: batch.lotNumber,
      currentQuantity: batch.currentQuantity,
      expiryDate: batch.expiryDate,
      locationId: batch.locationId,
      status: batch.status,
      openedDate: batch.openedDate || '',
      openedExpiryDate: batch.openedExpiryDate || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !onUpdateBatch) return;

    const loc = locations.find((l) => l.id === editForm.locationId);

    const payload: Partial<ReagentBatch> = {
      lotNumber: editForm.lotNumber,
      currentQuantity: editForm.currentQuantity,
      expiryDate: editForm.expiryDate,
      locationId: editForm.locationId,
      locationName: loc ? `${loc.name} (${loc.temperatureCondition})` : editingBatch.locationName,
      status: editForm.status,
      openedDate: editForm.openedDate || undefined,
      openedExpiryDate: editForm.openedExpiryDate || undefined,
    };

    await onUpdateBatch(editingBatch.id, payload);
    setIsEditModalOpen(false);
    setEditingBatch(null);
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteTargetBatch || !onDeleteBatch) return;
    await onDeleteBatch(deleteTargetBatch.id);
    setDeleteTargetBatch(null);
  };

  const filteredBatches = batches.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.reagentName.toLowerCase().includes(q) ||
      b.lotNumber.toLowerCase().includes(q) ||
      b.barcode.toLowerCase().includes(q) ||
      b.locationName.toLowerCase().includes(q)
    );
  });

  const handleOpenMarkOpened = (batch: ReagentBatch) => {
    setSelectedBatch(batch);
    setOpenedDateInput(new Date().toISOString().split('T')[0]);
    setOpenDaysInput(batch.openStabilityDays || 30);
    setOpenModalType('opened');
  };

  const handleOpenQuarantine = (batch: ReagentBatch) => {
    setSelectedBatch(batch);
    setQuarantineReason('');
    setOpenModalType('quarantine');
  };

  const handleConfirmOpened = async () => {
    if (!selectedBatch) return;
    await onMarkBatchOpened(selectedBatch.id, openedDateInput, openDaysInput);
    setOpenModalType(null);
  };

  const handleConfirmQuarantine = async (newStatus: string) => {
    if (!selectedBatch) return;
    await onUpdateBatchStatus(selectedBatch.id, newStatus, quarantineReason);
    setOpenModalType(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Boxes className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Manajemen Stok Lot / Batch & Open Stability</h2>
              <p className="text-xs text-slate-500">
                Pantau seluruh Lot fisik reagen, tanggal kadaluarsa (ED), pencatatan reagen dibuka (Open Stability), dan status Quarantine.
              </p>
            </div>
          </div>
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
            placeholder="Cari Lot, Reagen, Barcode, Lokasi..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status Lot:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="Available">Available (Tersedia)</option>
            <option value="Opened">Opened (Aktif Dibuka)</option>
            <option value="Quarantine">Quarantine (Dikarantina)</option>
            <option value="Expired">Expired (Kadaluarsa)</option>
            <option value="Empty">Empty (Habis)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nama Reagen</th>
                <th className="px-4 py-3">Nomor Lot & Barcode</th>
                <th className="px-4 py-3">Stok Saat Ini</th>
                <th className="px-4 py-3">Tanggal ED (Kemasan)</th>
                <th className="px-4 py-3">Open Stability Status</th>
                <th className="px-4 py-3">Lokasi Storage</th>
                <th className="px-4 py-3">Status Lot</th>
                <th className="px-4 py-3 text-right">Aksi Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {b.reagentName}
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Supplier: {b.supplierName}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className="font-bold text-slate-900">{b.lotNumber}</span>
                    <span className="block text-[10px] text-slate-500">{b.barcode}</span>
                  </td>
                  <td className="px-4 py-3 font-extrabold text-teal-800 text-sm">
                    {b.currentQuantity} <span className="text-xs font-normal text-slate-500">{b.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{b.expiryDate}</td>
                  <td className="px-4 py-3">
                    {b.openedDate ? (
                      <div>
                        <span className="font-bold text-blue-800">Dibuka: {b.openedDate}</span>
                        <span className="block text-[10px] text-slate-500">
                          Batas: <strong>{b.openedExpiryDate}</strong> ({b.openStabilityDays} Hari)
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Belum Dibuka</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.locationName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        b.status === 'Opened'
                          ? 'bg-blue-100 text-blue-800'
                          : b.status === 'Expired'
                          ? 'bg-rose-100 text-rose-800'
                          : b.status === 'Quarantine'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {b.status !== 'Opened' && b.status !== 'Expired' && (
                      <button
                        onClick={() => handleOpenMarkOpened(b)}
                        className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100 transition"
                      >
                        Mark Opened
                      </button>
                    )}
                    {b.status !== 'Quarantine' && (
                      <button
                        onClick={() => handleOpenQuarantine(b)}
                        className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition"
                      >
                        Quarantine
                      </button>
                    )}
                    {currentRole === 'Super Admin' && (
                      <>
                        <button
                          onClick={() => handleOpenEditBatch(b)}
                          className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTargetBatch(b)}
                          className="inline-flex items-center space-x-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Opened Modal */}
      {openModalType === 'opened' && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Tandai Reagen Dibuka (Open Stability)</h3>
            <p className="text-xs text-slate-600">
              Mencatat tanggal botol/kit reagen <strong>{selectedBatch.reagentName}</strong> (LOT: {selectedBatch.lotNumber}) pertama kali dibuka di analyzer.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Dibuka *</label>
              <input
                type="date"
                value={openedDateInput}
                onChange={(e) => setOpenedDateInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Stabilitas Setelah Dibuka (Hari) *
              </label>
              <input
                type="number"
                value={openDaysInput}
                onChange={(e) => setOpenDaysInput(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmOpened}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md"
              >
                Simpan Status Dibuka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine Modal */}
      {openModalType === 'quarantine' && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Ubah Status Lot ke Quarantine</h3>
            <p className="text-xs text-slate-600">
              Lot reagen dalam status Quarantine tidak dapat dikeluarkan untuk transaksi pemakaian normal.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Quarantine / Kendala Mutu *</label>
              <textarea
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                placeholder="Contoh: Kemasan bocor saat verifikasi suhu..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmQuarantine('Quarantine')}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-md"
              >
                Konfirmasi Quarantine
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Super Admin Edit Batch Modal */}
      {isEditModalOpen && editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Lot / Batch Reagen</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBatch(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBatch} className="space-y-3.5">
              <div>
                <p className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
                  {editingBatch.reagentName} ({editingBatch.reagentCode})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Lot *</label>
                <input
                  type="text"
                  required
                  value={editForm.lotNumber}
                  onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Qty ({editingBatch.unit}) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.currentQuantity}
                    onChange={(e) => setEditForm({ ...editForm, currentQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal ED *</label>
                  <input
                    type="date"
                    required
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Storage *</label>
                <select
                  value={editForm.locationId}
                  onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.temperatureCondition})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Lot *</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="Available">Available (Tersedia)</option>
                  <option value="Opened">Opened (Aktif Dibuka)</option>
                  <option value="Quarantine">Quarantine (Dikarantina)</option>
                  <option value="Expired">Expired (Kadaluarsa)</option>
                  <option value="Empty">Empty (Habis)</option>
                  <option value="Returned">Returned (Retur)</option>
                </select>
              </div>

              {editForm.status === 'Opened' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tgl Dibuka</label>
                    <input
                      type="date"
                      value={editForm.openedDate}
                      onChange={(e) => setEditForm({ ...editForm, openedDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Batas ED Stabilitas</label>
                    <input
                      type="date"
                      value={editForm.openedExpiryDate}
                      onChange={(e) => setEditForm({ ...editForm, openedExpiryDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBatch(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Delete Confirmation Modal */}
      {deleteTargetBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Lot / Batch Fisik?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus Lot <strong>{deleteTargetBatch.lotNumber}</strong> untuk reagen <strong>{deleteTargetBatch.reagentName}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleConfirmDeleteBatch}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                Hapus Permanen
              </button>
              <button
                onClick={() => setDeleteTargetBatch(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
