import React, { useState } from 'react';
import { History, Shield, Search } from 'lucide-react';
import { AuditLog, UserRole } from '../../types.js';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
  currentRole: UserRole;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs, currentRole }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <History className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Audit Trail & Log Aktivitas Sistem</h2>
              <p className="text-xs text-slate-500">
                Pencatatan rekam jejak lengkap seluruh aktivitas pengguna, perubahan stok, penerimaan, pengeluaran, & approval.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari log audit..."
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Waktu Log</th>
                <th className="px-4 py-3">Pengguna & Role</th>
                <th className="px-4 py-3">Modul</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {log.userName}
                    <span className="block text-[10px] text-slate-500 font-normal">{log.userRole}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{log.module}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-teal-100 text-teal-800 font-bold px-2 py-0.5 text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 leading-snug">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
