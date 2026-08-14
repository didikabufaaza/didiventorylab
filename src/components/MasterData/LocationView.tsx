import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, X, CheckSquare } from 'lucide-react';
import { StorageLocation, UserRole } from '../../types.js';

interface LocationViewProps {
  locations: StorageLocation[];
  currentRole: UserRole;
  onCreateLocation?: (location: Partial<StorageLocation>) => Promise<void>;
  onUpdateLocation?: (id: string, location: Partial<StorageLocation>) => Promise<void>;
  onDeleteLocation?: (id: string) => Promise<void>;
}

export const LocationView: React.FC<LocationViewProps> = ({
  locations,
  currentRole,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<StorageLocation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canEdit = currentRole === 'Super Admin' || currentRole === 'Admin Inventory';

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    building: 'Gudang Utama',
    room: 'Ruang Reagen A',
    type: 'Kulkas / Chiller' as 'Kulkas / Chiller' | 'Freezer' | 'Rak Suhu Ruang' | 'Kinetik Room',
    temperatureCondition: '2°C - 8°C',
    status: 'Aktif' as 'Aktif' | 'Penuh' | 'Maintenance',
  });

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setFormData({
      code: `LOC-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      building: 'Gudang Utama',
      room: 'Ruang Reagen A',
      type: 'Kulkas / Chiller',
      temperatureCondition: '2°C - 8°C',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: StorageLocation) => {
    setEditingLoc(loc);
    setFormData({
      code: loc.code,
      name: loc.name,
      building: loc.building,
      room: loc.room,
      type: loc.type,
      temperatureCondition: loc.temperatureCondition,
      status: loc.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLoc && onUpdateLocation) {
      await onUpdateLocation(editingLoc.id, formData);
    } else if (onCreateLocation) {
      await onCreateLocation(formData);
    }
    setIsModalOpen(false);
  };

  // --- Checkbox / multi-select helpers ---
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

  const allSelected = locations.length > 0 && selectedIds.size === locations.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(locations.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!onDeleteLocation) return;
    const count = selectedIds.size;
    if (!window.confirm(`Hapus ${count} lokasi terpilih? Tindakan ini tidak dapat dibatalkan.`)) return;
    for (const id of Array.from(selectedIds)) {
      await onDeleteLocation(id);
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <MapPin className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Master Lokasi Storage Reagen</h2>
              <p className="text-xs text-slate-500">
                Pengelolaan hierarki penyimpanan multi-ruangan (Gudang Utama, Rak, Refrigerator 2-8°C, Freezer -20°C).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canEdit && locations.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              title={allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
            >
              <CheckSquare className="h-4 w-4" />
              <span>{allSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Lokasi Penyimpanan</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className={`rounded-2xl border bg-white p-5 shadow-xs space-y-3 relative hover:border-teal-300 transition ${
              selectedIds.has(loc.id) ? 'border-teal-400 ring-2 ring-teal-200' : 'border-slate-200'
            }`}
          >
            {/* Checkbox top-left */}
            {canEdit && (
              <input
                type="checkbox"
                checked={selectedIds.has(loc.id)}
                onChange={() => toggleSelect(loc.id)}
                className="absolute top-3 left-3 w-4 h-4 rounded accent-teal-600 cursor-pointer"
                title="Pilih lokasi ini"
              />
            )}

            <div className={`flex items-center justify-between ${canEdit ? 'pl-7' : ''}`}>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {loc.code}
              </span>
              <div className="flex items-center space-x-2">
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {loc.temperatureCondition}
                </span>
                <div className="flex items-center space-x-1">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(loc)}
                      className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                      title="Edit Lokasi"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEdit && onDeleteLocation && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus lokasi ${loc.name}?`)) {
                          onDeleteLocation(loc.id);
                        }
                      }}
                      className="p-1 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                      title="Hapus Lokasi"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm">{loc.name}</h4>
              <p className="text-xs text-slate-500">{loc.building} &ndash; {loc.room}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Tipe Storage:</span>
              <span className="font-bold text-slate-800">{loc.type}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Delete Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between bg-rose-600 px-6 py-3 shadow-2xl">
          <span className="text-sm font-bold text-white">
            {selectedIds.size} lokasi dipilih
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl border border-rose-300 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shadow"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus {selectedIds.size} lokasi terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingLoc ? 'Edit Lokasi Storage' : 'Tambah Lokasi Storage Baru'}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Lokasi</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lokasi / Unit *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Chiller Reagen BioKimia #1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gedung / Bangunan</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ruangan</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Storage</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Kulkas / Chiller">Kulkas / Chiller (2 - 8°C)</option>
                  <option value="Freezer">Freezer (-20°C)</option>
                  <option value="Rak Suhu Ruang">Rak Suhu Ruang (15 - 25°C)</option>
                  <option value="Kinetik Room">Kinetik Room</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi Suhu</label>
                <input
                  type="text"
                  placeholder="2°C - 8°C atau -20°C"
                  value={formData.temperatureCondition}
                  onChange={(e) => setFormData({ ...formData, temperatureCondition: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Kapasitas</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Penuh">Penuh</option>
                  <option value="Maintenance">Maintenance</option>
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
                  {editingLoc ? 'Simpan Perubahan' : 'Tambah Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
