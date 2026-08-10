import React from 'react';
import { X, Bell, AlertTriangle, AlertCircle, Info, Check, CheckCheck } from 'lucide-react';
import { SystemNotification } from '../../types.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkRead: (id?: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigateToTab,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <AlertCircle className="h-5 w-5 text-rose-600" />;
    if (severity === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    return <Info className="h-5 w-5 text-blue-600" />;
  };

  const getBgClass = (severity: string, read: boolean) => {
    if (read) return 'bg-slate-50 border-slate-200 opacity-75';
    if (severity === 'critical') return 'bg-rose-50/80 border-rose-200';
    if (severity === 'warning') return 'bg-amber-50/80 border-amber-200';
    return 'bg-blue-50/80 border-blue-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Notifikasi Sistem</h3>
              <p className="text-xs text-slate-500">Peringatan stok, kadaluarsa, & PO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-2.5 bg-white text-xs text-slate-600">
          <span>{notifications.filter((n) => !n.read).length} Belum Dibaca</span>
          <button
            onClick={() => onMarkRead()}
            className="flex items-center space-x-1 font-semibold text-teal-600 hover:text-teal-700 transition"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Tandai Semua Dibaca</span>
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Bell className="h-12 w-12 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-medium">Tidak ada notifikasi saat ini</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onMarkRead(notif.id);
                  if (notif.linkModule) {
                    onNavigateToTab(notif.linkModule);
                    onClose();
                  }
                }}
                className={`group cursor-pointer rounded-xl border p-4 transition shadow-2xs hover:shadow-md ${getBgClass(
                  notif.severity,
                  notif.read
                )}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="shrink-0 mt-0.5">{getIcon(notif.type, notif.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-slate-900 group-hover:text-teal-700 transition">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                    {notif.linkModule && (
                      <span className="inline-block mt-2 text-[11px] font-semibold text-teal-600 group-hover:underline">
                        Lihat Modul &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
          LRIMS Real-time Monitoring Active
        </div>
      </div>
    </div>
  );
};
