import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Scan, Keyboard, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode Reagen',
  subtitle = 'Arahkan kamera smartphone/webcam ke barcode atau ketik manual',
}) => {
  const [manualInput, setManualInput] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = 'html5qr-code-full-region';

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error(e));
        scannerRef.current = null;
      }
      return;
    }

    // Delay initialization to ensure DOM element is mounted
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 10,
            qrbox: { width: 250, height: 160 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            rememberLastUsedCamera: true,
            aspectRatio: 1.5,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            setScanStatus(`Barcode Terdeteksi: ${decodedText}`);
            if (scannerRef.current) {
              scannerRef.current.clear().catch(() => {});
            }
            onScanSuccess(decodedText);
            onClose();
          },
          (errorMessage) => {
            // Ignore standard frame scan errors
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error('Failed to init scanner:', err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cleanCode = manualInput.trim();
    onScanSuccess(cleanCode);
    setManualInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Scanner Container */}
          <div className="rounded-xl border border-slate-200 bg-slate-950/5 p-3 text-center">
            <div id={containerId} className="w-full rounded-lg overflow-hidden min-h-[220px]" />
          </div>

          {scanStatus && (
            <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{scanStatus}</span>
            </div>
          )}

          {/* Manual / USB Scanner Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Input Barcode Manual / USB Scanner
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ketik atau scan barcode USB di sini..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition shadow-sm shrink-0"
              >
                Gunakan
              </button>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Keyboard className="h-3.5 w-3.5 text-slate-400 inline" />
              <span>Dapat ditembak langsung dengan Barcode Scanner USB / Bluetooth (Tekan Enter)</span>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
