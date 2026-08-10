import React, { useState } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, Search, Edit2, Trash2, X } from 'lucide-react';
import { Supplier, UserRole } from '../../types.js';

interface SupplierViewProps {
  suppliers: Supplier[];
  currentRole: UserRole;
  onCreateSupplier?: (supplier: Partial<Supplier>) => Promise<void>;
  onUpdateSupplier?: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier?: (id: string) => Promise<void>;
}

export const SupplierView: React.FC<SupplierViewProps> = ({
  suppliers,
  currentRole,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    pic: '',
    phone: '',
    email: '',
    address: '',
    status: 'Aktif' as 'Aktif' | 'Non-Aktif',
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      pic: '',
      phone: '',
      email: '',
      address: '',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      code: sup.code,
      name: sup.name,
      pic: sup.pic,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      status: sup.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier && onUpdateSupplier) {
      await onUpdateSupplier(editingSupplier.id, formData);
    } else if (onCreateSupplier) {
      await onCreateSupplier(formData);
    }
    setIsModalOpen(false);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.pic.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Master Supplier & Distributor Reagen</h2>
              <p className="text-xs text-slate-500">
                Kelola daftar vendor penyedia reagen, informasi PIC, alamat, serta histori pemesanan.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Supplier Baru</span>
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari supplier..."
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 transition space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                {s.code}
              </span>
              <div className="flex items-center space-x-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {s.status}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                    title="Edit Supplier"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {onDeleteSupplier && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus supplier ${s.name}?`)) {
                          onDeleteSupplier(s.id);
                        }
                      }}
                      className="p-1 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                      title="Hapus Supplier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
              <p className="text-xs text-slate-500 font-medium">PIC: {s.pic}</p>
            </div>

            <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center space-x-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{s.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{s.email}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{s.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Supplier</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Supplier / PT *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Medika Utama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama PIC *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Sales / Contact Person"
                  value={formData.pic}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telepon</label>
                  <input
                    type="text"
                    placeholder="0812xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor / Depo</label>
                <textarea
                  rows={2}
                  placeholder="Alamat lengkap supplier..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Non-Aktif' })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
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
                  {editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
