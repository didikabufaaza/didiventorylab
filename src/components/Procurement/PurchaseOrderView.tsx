import React, { useState } from 'react';
import { ShoppingBag, Plus, CheckCircle2, UserCheck, Edit2, Trash2, X, Printer, Send, FileCheck, AlertCircle, Building2, Clock, Check, FileDown, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PurchaseOrder, Supplier, Reagent, UserRole, LetterheadConfig, DEFAULT_LETTERHEAD } from '../../types.js';

interface PurchaseOrderViewProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  reagents: Reagent[];
  letterhead?: LetterheadConfig;
  currentRole: UserRole;
  onCreatePO: (payload: any) => Promise<void>;
  onUpdatePO?: (poId: string, payload: any) => Promise<void>;
  onDeletePO?: (poId: string) => Promise<void>;
  onSubmitPO?: (poId: string) => Promise<void>;
  onApprovePO: (poId: string) => Promise<void>;
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({
  purchaseOrders,
  suppliers,
  reagents,
  letterhead = DEFAULT_LETTERHEAD,
  currentRole,
  onCreatePO,
  onUpdatePO,
  onDeletePO,
  onSubmitPO,
  onApprovePO,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Role Manajemen = read-only, hanya bisa Setujui PO dan memberi catatan
  const isManagement = currentRole === 'Manajemen';

  // Print Modal State
  const [printingPO, setPrintingPO] = useState<PurchaseOrder | null>(null);

  // Delete Confirmation Target
  const [deleteTargetPO, setDeleteTargetPO] = useState<PurchaseOrder | null>(null);

  // PDF Export Loading State
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // --- Multi-Item PO Form State ---
  interface POItemDraft {
    id: string;
    reagentId: string;
    reagentSearchQuery: string;
    isDropdownOpen: boolean;
    qty: number;
    unitPrice: number;
  }

  const makeEmptyItem = (): POItemDraft => ({
    id: `draft-${Date.now()}-${Math.random()}`,
    reagentId: '',
    reagentSearchQuery: '',
    isDropdownOpen: false,
    qty: 1,
    unitPrice: 0,
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [estDeliveryDate, setEstDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<POItemDraft[]>([makeEmptyItem()]);
  const [targetStatus, setTargetStatus] = useState<'Draft' | 'Submitted' | 'Approved' | 'Received' | 'Cancelled'>('Draft');

  // Catatan sementara per PO (khusus Manajemen)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const getNoteValue = (po: PurchaseOrder) =>
    noteInputs[po.id] !== undefined ? noteInputs[po.id] : (po.notes || '');

  const handleSaveNote = async (po: PurchaseOrder) => {
    const note = getNoteValue(po).trim();
    if (onUpdatePO) {
      await onUpdatePO(po.id, { notes: note });
      setNoteInputs((prev) => ({ ...prev, [po.id]: note }));
    }
  };

  // Helpers for multi-item
  const updateItem = (idx: number, patch: Partial<POItemDraft>) => {
    setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setPoItems((prev) => [...prev, makeEmptyItem()]);
  const removeItem = (idx: number) => setPoItems((prev) => prev.filter((_, i) => i !== idx));

  const selectReagentForItem = (idx: number, reagentId: string) => {
    const found = reagents.find((r) => r.id === reagentId);
    updateItem(idx, {
      reagentId,
      unitPrice: found?.price && found.price > 0 ? found.price : 0,
      reagentSearchQuery: '',
      isDropdownOpen: false,
    });
  };

  const handleOpenAdd = () => {
    setEditingPO(null);
    setSelectedSupplierId(suppliers[0]?.id || '');
    setEstDeliveryDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setPoNotes('Restock rutin reagen laboratorium');
    setPoItems([makeEmptyItem()]);
    setTargetStatus('Draft');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setSelectedSupplierId(po.supplierId || suppliers[0]?.id || '');
    setEstDeliveryDate(po.estimatedDeliveryDate || new Date().toISOString().split('T')[0]);
    setPoNotes(po.notes || '');
    setTargetStatus(po.status);
    // Rebuild poItems from existing PO items
    setPoItems(
      po.items.length > 0
        ? po.items.map((item) => ({
            id: item.id,
            reagentId: item.reagentId,
            reagentSearchQuery: '',
            isDropdownOpen: false,
            qty: item.quantityOrdered,
            unitPrice: item.unitPrice,
          }))
        : [makeEmptyItem()]
    );
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (saveAsStatus: 'Draft' | 'Submitted') => {
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) return;
    const validItems = poItems.filter((it) => it.reagentId && it.qty > 0);
    if (validItems.length === 0) {
      alert('Tambahkan minimal satu item reagen yang valid.');
      return;
    }

    const items = validItems.map((it) => {
      const reg = reagents.find((r) => r.id === it.reagentId)!;
      const totalPrice = it.qty * it.unitPrice;
      return {
        id: it.id.startsWith('draft-') ? `poi-${Date.now()}-${Math.random()}` : it.id,
        reagentId: reg.id,
        reagentCode: reg.code,
        reagentName: reg.name,
        unit: reg.unit,
        quantityOrdered: it.qty,
        quantityReceived: 0,
        unitPrice: it.unitPrice,
        totalPrice,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);
    const tax = subtotal * 0.11;
    const total = subtotal + tax;

    if (editingPO && onUpdatePO) {
      await onUpdatePO(editingPO.id, {
        supplierId: sup.id,
        supplierName: sup.name,
        estimatedDeliveryDate: estDeliveryDate || new Date().toISOString().split('T')[0],
        status: saveAsStatus,
        notes: poNotes,
        subtotal,
        tax,
        total,
        items,
      });
    } else {
      await onCreatePO({
        supplierId: sup.id,
        supplierName: sup.name,
        estimatedDeliveryDate: estDeliveryDate || new Date().toISOString().split('T')[0],
        status: saveAsStatus,
        notes: poNotes,
        items,
      });
    }

    setIsModalOpen(false);
  };

  const handlePrintDocument = (poToPrint?: PurchaseOrder) => {
    if (poToPrint) {
      setPrintingPO(poToPrint);
      setTimeout(() => {
        window.print();
      }, 250);
    } else {
      window.print();
    }
  };

  const handleDownloadPDF = async (poToExport: PurchaseOrder) => {
    setIsExportingPDF(true);
    try {
      if (!printingPO || printingPO.id !== poToExport.id) {
        setPrintingPO(poToExport);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      const target = document.getElementById('po-print-area-modal');
      if (!target) {
        alert('Area dokumen PO tidak ditemukan.');
        return;
      }

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          // 1. Sanitize style tags textContent to eliminate Tailwind v4 oklch / oklab color functions
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((styleTag) => {
            if (styleTag.textContent) {
              styleTag.textContent = styleTag.textContent
                .replace(/oklch\([^\)]+\)/gi, '#1e293b')
                .replace(/oklab\([^\)]+\)/gi, '#1e293b')
                .replace(/color-mix\([^\)]+\)/gi, '#1e293b')
                .replace(/color\([^\)]+\)/gi, '#1e293b');
            }
          });

          // 2. Remove any CSSOM rules containing modern color functions from styleSheets
          try {
            const sheets = Array.from(clonedDoc.styleSheets);
            sheets.forEach((sheet) => {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  for (let i = rules.length - 1; i >= 0; i--) {
                    const cssText = rules[i].cssText || '';
                    if (
                      cssText.includes('oklch') ||
                      cssText.includes('oklab') ||
                      cssText.includes('color-mix') ||
                      cssText.includes('color(')
                    ) {
                      sheet.deleteRule(i);
                    }
                  }
                }
              } catch (e) {
                // Ignore cross-origin stylesheet security restrictions
              }
            });
          } catch (e) {
            // Ignore CSSOM access errors
          }

          // 3. Apply explicit computed RGB colors onto cloned DOM elements
          const origArea = document.getElementById('po-print-area-modal');
          const clonedArea = clonedDoc.getElementById('po-print-area-modal');
          if (origArea && clonedArea) {
            const origEls = [origArea, ...Array.from(origArea.querySelectorAll('*'))];
            const clonedEls = [clonedArea, ...Array.from(clonedArea.querySelectorAll('*'))];

            origEls.forEach((origEl, i) => {
              const clonedEl = clonedEls[i];
              if (origEl instanceof HTMLElement && clonedEl instanceof HTMLElement) {
                const comp = window.getComputedStyle(origEl);
                if (comp.color) clonedEl.style.color = comp.color;
                if (comp.backgroundColor) clonedEl.style.backgroundColor = comp.backgroundColor;
                if (comp.borderColor) clonedEl.style.borderColor = comp.borderColor;
                clonedEl.style.boxShadow = 'none';
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const margin = 10;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = (imgHeight * printWidth) / imgWidth;

      if (printHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight);
      } else {
        let heightLeft = printHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - printHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
          heightLeft -= (pdfHeight - margin * 2);
        }
      }

      const cleanPoNum = (poToExport.poNumber || 'PO').replace(/[/\\?%*:|"<>]/g, '_');
      const cleanSupplier = (poToExport.supplierName || 'Vendor').replace(/\s+/g, '_');
      pdf.save(`Surat_PO_${cleanPoNum}_${cleanSupplier}.pdf`);
    } catch (error) {
      console.error('Gagal membuat PDF:', error);
      alert('PDF sedang diproses menggunakan dialog cetak browser ("Simpan sebagai PDF").');
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Sample SVG Data URL logos with safe URL encoding
  const SAMPLE_LOGO_LEFT = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230f766e'/><path d='M50 15 L62 38 L85 42 L68 60 L72 85 L50 72 L28 85 L32 60 L15 42 L38 38 Z' fill='%23ffffff'/></svg>");
  const SAMPLE_LOGO_RIGHT = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='20' fill='%230284c7'/><path d='M40 25 H60 V40 H75 V60 H60 V75 H40 V60 H25 V40 H40 Z' fill='%23ffffff'/></svg>");

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="rounded-xl bg-teal-100 p-2.5 text-teal-700 shadow-xs">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Purchase Order (PO) & Restock Reagen</h2>
              <p className="text-xs text-slate-500">
                Pemesanan bertingkat: Buat Pesanan (Draft) &rarr; Mengirim PO &rarr; Validasi/Approval Manajemen &rarr; Cetak PO Resmi Ber-Kop Surat.
              </p>
            </div>
          </div>
        </div>

        {!isManagement && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Pesanan Baru</span>
          </button>
        )}
      </div>

      {/* Info Banner Workflow */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-teal-900">
        <div className="flex items-center space-x-3">
          <FileCheck className="h-5 w-5 text-teal-700 shrink-0" />
          <div>
            <p className="font-bold">Alur Alur Pemesanan Bertingkat (Workflow Validation):</p>
            <p className="text-[11px] text-teal-800 mt-0.5">
              1. <strong>Draft</strong> &rarr; 2. <strong>Mengirim PO (Submitted)</strong> &rarr; 3. <strong>Disetujui/Divalidasi Manajemen</strong> &rarr; 4. <strong>Cetak Surat PO Ber-Kop & 3 TTD Pejabat</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* PO List */}
      <div className="space-y-4">
        {purchaseOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            <p className="text-sm font-semibold">Belum ada Purchase Order (PO) yang dibuat.</p>
            <p className="text-xs text-slate-400 mt-1">Klik "Buat Pesanan Baru" untuk mengajukan pengadaan reagen ke supplier terdaftar.</p>
          </div>
        ) : (
          purchaseOrders.map((po) => {
            const isApproved = po.status === 'Approved';
            const isSubmitted = po.status === 'Submitted';
            const isDraft = po.status === 'Draft';

            return (
              <div
                key={po.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 transition ${
                  isApproved
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : isSubmitted
                    ? 'border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* PO Header Info & Status Indicator */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {po.poNumber}
                      </span>

                      {/* Explicit Visual Approved Indicator */}
                      {isApproved && (
                        <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-black text-emerald-800 animate-fade-in shadow-2xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>PO DISETUJUI & DIVALIDASI MANAJEMEN</span>
                        </span>
                      )}

                      {isSubmitted && (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Menunggu Approval Manajemen</span>
                        </span>
                      )}

                      {isDraft && (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                          <span>Draft (Pesanan Baru)</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-900 mt-1.5">
                      Supplier: <span className="text-teal-700">{po.supplierName}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tanggal Buat: {po.orderDate} | Estimasi Tiba: {po.estimatedDeliveryDate}
                      {po.approvedBy && <span className="ml-2 text-emerald-700 font-bold">| Disetujui Oleh: {po.approvedBy}</span>}
                    </p>
                  </div>

                  {/* Actions Right */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Action 1: Submit PO if Draft */}
                    {!isManagement && isDraft && onSubmitPO && (
                      <button
                        onClick={() => onSubmitPO(po.id)}
                        className="flex items-center space-x-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim PO ke Manajemen</span>
                      </button>
                    )}

                    {/* Action 2: Approve PO if Submitted */}
                    {isSubmitted && (currentRole === 'Manajemen' || currentRole === 'Super Admin' || currentRole === 'Admin Inventory') && (
                      <button
                        onClick={() => onApprovePO(po.id)}
                        className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Setujui / Validasi PO</span>
                      </button>
                    )}

                    {/* Action 3: Print PO Official Document */}
                    {!isManagement && (
                      <button
                        onClick={() => setPrintingPO(po)}
                        className="flex items-center space-x-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        title="Pratinjau & Cetak Surat PO Ber-Kop Surat"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Cetak Surat PO</span>
                      </button>
                    )}

                    {/* Action 4: Download PDF Document */}
                    {!isManagement && (
                      <button
                        onClick={() => handleDownloadPDF(po)}
                        disabled={isExportingPDF}
                        className="flex items-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                        title="Simpan & Unduh Surat PO sebagai File PDF"
                      >
                        <FileDown className="h-3.5 w-3.5 text-rose-600" />
                        <span>{isExportingPDF ? 'Proses PDF...' : 'Simpan PDF'}</span>
                      </button>
                    )}

                    {!isManagement && (
                      <button
                        onClick={() => handleOpenEdit(po)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                        title="Edit PO"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}

                    {!isManagement && onDeletePO && (
                      <button
                        onClick={() => setDeleteTargetPO(po)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        title="Hapus PO"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Workflow Stepper Progress */}
                <div className="grid grid-cols-4 gap-2 text-center py-2 bg-slate-50 rounded-xl px-3 border border-slate-100">
                  <div className={`text-[11px] font-bold flex items-center justify-center space-x-1 ${isDraft || isSubmitted || isApproved ? 'text-teal-700' : 'text-slate-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>1. Buat Draft</span>
                  </div>
                  <div className={`text-[11px] font-bold flex items-center justify-center space-x-1 ${isSubmitted || isApproved ? 'text-amber-700' : 'text-slate-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>2. Mengirim PO</span>
                  </div>
                  <div className={`text-[11px] font-bold flex items-center justify-center space-x-1 ${isApproved ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>3. Disetujui Manajemen</span>
                  </div>
                  <div className={`text-[11px] font-bold flex items-center justify-center space-x-1 ${po.status === 'Received' ? 'text-blue-700' : 'text-slate-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">4</span>
                    <span>4. Penerimaan Reagen</span>
                  </div>
                </div>

                {/* Order Items Detail */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rincian Barang / Reagen Dipesan:</p>
                  {po.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900">{it.reagentName}</span>
                        <span className="font-mono text-[11px] text-slate-400 ml-2">({it.reagentCode})</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {it.quantityOrdered} {it.unit} &times; Rp {it.unitPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 text-xs gap-2">
                  <span className="text-slate-500 font-medium">Catatan: {po.notes || '-'}</span>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Subtotal: Rp {po.subtotal?.toLocaleString('id-ID')} | PPN (11%): Rp {po.tax?.toLocaleString('id-ID')}</p>
                    <p className="font-black text-slate-900 text-base text-teal-800">
                      Total Pesanan: Rp {po.total.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Editor Catatan khusus Manajemen */}
                {isManagement && (
                  <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Catatan / Komentar Manajemen:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={getNoteValue(po)}
                        onChange={(e) =>
                          setNoteInputs((prev) => ({ ...prev, [po.id]: e.target.value }))
                        }
                        placeholder="Tulis catatan / pertimbangan terhadap PO ini..."
                        className="flex-1 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                      />
                      <button
                        onClick={() => handleSaveNote(po)}
                        className="flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shrink-0"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Simpan Catatan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit PO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingPO ? `Edit Purchase Order (${editingPO.poNumber})` : 'Buat Pesanan Reagen Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitForm('Submitted'); }} className="space-y-3">
              {/* Supplier & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Vendor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Tgl. Pengiriman</label>
                  <input
                    type="date"
                    value={estDeliveryDate}
                    onChange={(e) => setEstDeliveryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Multi-Item Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Daftar Item Reagen yang Dipesan *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center space-x-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Reagen</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_64px_120px_32px] gap-0 bg-slate-50 border-b border-slate-200">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">Pilih Reagen</div>
                    <div className="px-2 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Qty</div>
                    <div className="px-2 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Harga Satuan</div>
                    <div className="px-2 py-2" />
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
                    {poItems.map((item, idx) => {
                      const selectedReg = reagents.find((r) => r.id === item.reagentId);
                      const filteredReagents = reagents.filter((r) => {
                        const q = item.reagentSearchQuery.toLowerCase();
                        return !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.brand && r.brand.toLowerCase().includes(q));
                      });
                      return (
                        <div key={item.id} className="grid grid-cols-[1fr_64px_120px_32px] gap-0 items-center bg-white hover:bg-slate-50/60 transition">
                          {/* Searchable Reagent Dropdown */}
                          <div className="px-2 py-2 relative">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                value={item.isDropdownOpen ? item.reagentSearchQuery : (selectedReg ? `${selectedReg.name}` : '')}
                                onChange={(e) => updateItem(idx, { reagentSearchQuery: e.target.value, isDropdownOpen: true })}
                                onFocus={() => updateItem(idx, { isDropdownOpen: true, reagentSearchQuery: '' })}
                                onBlur={() => setTimeout(() => updateItem(idx, { isDropdownOpen: false }), 200)}
                                placeholder="Cari & pilih reagen..."
                                className={`w-full rounded-lg border pl-7 pr-2 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 transition-all ${item.reagentId ? 'border-teal-300 bg-teal-50/40 focus:ring-teal-400/20' : 'border-slate-300 focus:ring-indigo-400/20 focus:border-indigo-400'}`}
                              />
                            </div>
                            {item.isDropdownOpen && (
                              <div className="absolute left-2 right-2 z-30 mt-0.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl custom-scrollbar py-1">
                                {filteredReagents.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan</div>
                                ) : filteredReagents.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onMouseDown={() => selectReagentForItem(idx, r.id)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex flex-col ${r.id === item.reagentId ? 'bg-indigo-50 font-bold' : ''}`}
                                  >
                                    <span className="font-semibold text-slate-900">{r.name}</span>
                                    <span className="text-[10px] text-slate-400">{r.code} · {r.brand} · Rp {r.price?.toLocaleString('id-ID')}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Qty */}
                          <div className="px-1 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItem(idx, { qty: Math.max(1, Number(e.target.value)) })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="px-1 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
                            />
                          </div>

                          {/* Remove */}
                          <div className="px-1 py-2 flex justify-center">
                            {poItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-item subtotals footer */}
                  {poItems.some((it) => it.reagentId && it.qty > 0 && it.unitPrice > 0) && (
                    <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 space-y-0.5">
                      {poItems.filter((it) => it.reagentId && it.qty > 0).map((it, idx) => {
                        const reg = reagents.find((r) => r.id === it.reagentId);
                        if (!reg) return null;
                        return (
                          <div key={it.id} className="flex justify-between text-[10px] text-slate-500">
                            <span className="truncate max-w-[60%]">{idx + 1}. {reg.name} × {it.qty}</span>
                            <span className="font-mono">Rp {(it.qty * it.unitPrice).toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pemesanan</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Restock reagen rutin..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              {/* Grand Total Summary */}
              {(() => {
                const subtotal = poItems.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
                const tax = subtotal * 0.11;
                return (
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-3 text-xs space-y-1 border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({poItems.filter((it) => it.reagentId).length} item):</span>
                      <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>PPN 11%:</span>
                      <span className="font-mono">Rp {tax.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-300 text-sm">
                      <span>Total Pemesanan:</span>
                      <span className="font-mono text-teal-700">Rp {(subtotal + tax).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitForm('Draft')}
                  className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitForm('Submitted')}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-md"
                >
                  Kirim PO ke Manajemen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Official Print Preview Purchase Order Document */}
      {printingPO && (
        <div className="print-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="print-modal-content w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl space-y-6 my-auto">
            {/* Action Bar inside Print Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div className="flex items-center space-x-2">
                <Printer className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Pratinjau Surat Purchase Order Resmi</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePrintDocument()}
                  className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
                  title="Cetak langsung menggunakan printer (Ctrl+P)"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak Dokumen (Print)</span>
                </button>
                <button
                  onClick={() => printingPO && handleDownloadPDF(printingPO)}
                  disabled={isExportingPDF}
                  className="flex items-center space-x-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition disabled:opacity-50"
                  title="Simpan dokumen sebagai file PDF otomatis"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{isExportingPDF ? 'Mengekspor PDF...' : 'Unduh PDF'}</span>
                </button>
                <button
                  onClick={() => setPrintingPO(null)}
                  className="rounded-xl border border-slate-300 p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Area */}
            <div id="po-print-area-modal" className="print-area space-y-6 text-slate-900 p-6 border border-slate-200 rounded-xl bg-white shadow-2xs">
              {/* Official Kop Surat Header */}
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo Kiri */}
                  <div className="w-20 h-20 flex items-center justify-center shrink-0">
                    <img
                      src={letterhead.logoLeftUrl || SAMPLE_LOGO_LEFT}
                      alt="Logo Left"
                      className="max-h-20 max-w-20 object-contain"
                    />
                  </div>

                  {/* Header Text Center (5 Atribut Kop Surat) */}
                  <div className="flex-1 space-y-1">
                    <h3 className="text-xs font-bold tracking-widest text-slate-800 uppercase">
                      {letterhead.pemdaName || 'PEMERINTAH KABUPATEN / PROVINSI DINAS KESEHATAN'}
                    </h3>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {letterhead.hospitalName || 'RSUD DR. RADEN SOEDJONO LABSENTRAL'}
                    </h2>
                    <p className="text-[11px] text-slate-800 font-medium">
                      {letterhead.hospitalAddress || 'Jl. Prof. Dr. Soepomo No. 45, Kompleks RSUD'}
                    </p>
                    <p className="text-[10px] text-slate-700 font-mono">
                      Telp: {letterhead.phone || '-'} | Email: {letterhead.email || '-'}
                    </p>
                  </div>

                  {/* Logo Kanan */}
                  <div className="w-20 h-20 flex items-center justify-center shrink-0">
                    <img
                      src={letterhead.logoRightUrl || SAMPLE_LOGO_RIGHT}
                      alt="Logo Right"
                      className="max-h-20 max-w-20 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Document Title & Number */}
              <div className="text-center py-2 space-y-1">
                <h3 className="text-base font-black text-slate-900 underline uppercase tracking-widest">
                  SURAT PESANAN REAGEN (PURCHASE ORDER)
                </h3>
                <p className="text-xs font-mono font-bold text-slate-700">Nomor PO: {printingPO.poNumber}</p>
              </div>

              {/* Vendor Supplier & Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="font-bold text-slate-500 uppercase">Penyedia / Vendor Supplier:</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{printingPO.supplierName}</p>
                  <p className="text-slate-600 mt-1">Status PO: <strong className="text-emerald-700 uppercase">{printingPO.status}</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600">Tanggal Pesan: <strong>{printingPO.orderDate}</strong></p>
                  <p className="text-slate-600 mt-0.5">Estimasi Tiba: <strong>{printingPO.estimatedDeliveryDate}</strong></p>
                  {printingPO.approvedBy && (
                    <p className="text-emerald-800 font-bold mt-1">Disetujui Oleh: {printingPO.approvedBy}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Kode</th>
                      <th className="p-3">Nama Reagen & Kemasan</th>
                      <th className="p-3 text-center">Jumlah</th>
                      <th className="p-3 text-right">Harga Satuan (Rp)</th>
                      <th className="p-3 text-right">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {printingPO.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="p-3 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold">{it.reagentCode}</td>
                        <td className="p-3 font-bold">{it.reagentName}</td>
                        <td className="p-3 text-center font-bold">{it.quantityOrdered} {it.unit}</td>
                        <td className="p-3 text-right font-mono">Rp {it.unitPrice.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-mono font-bold">Rp {it.totalPrice.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right text-slate-600">Subtotal:</td>
                      <td className="p-2.5 text-right font-mono">Rp {printingPO.subtotal?.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right text-slate-600">PPN (11%):</td>
                      <td className="p-2.5 text-right font-mono">Rp {printingPO.tax?.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="text-sm bg-slate-100 text-slate-900">
                      <td colSpan={5} className="p-3 text-right">TOTAL KESELURUHAN:</td>
                      <td className="p-3 text-right font-mono font-black text-teal-900">
                        Rp {printingPO.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Watermark / Validation Stempel Indikator */}
              {printingPO.status === 'Approved' && (
                <div className="my-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/60 p-3 text-center">
                  <span className="font-black text-emerald-800 uppercase tracking-widest text-xs flex items-center justify-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>DOKUMEN INI TELAH DIVALIDASI DAN DISETUJU OLEH MANAJEMEN RUMAH SAKIT</span>
                  </span>
                </div>
              )}

              {/* 3 Kolom Penandatangan PO */}
              <div className="pt-8">
                <p className="text-[11px] text-right font-bold text-slate-700 mb-8">
                  Ditetapkan di Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* 1. Kabid Penunjang Medis */}
                  <div className="space-y-16">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{letterhead.signatory1Title || 'Kabid Penunjang Medis'}</p>
                      <p className="text-[10px] text-slate-500">Mengetahui/Menyetujui</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 underline">{letterhead.signatory1Name || 'Dr. Hj. Endang Rahmawati, M.Kes'}</p>
                      <p className="text-[10px] font-mono text-slate-700">{letterhead.signatory1Nip || 'NIP. 19760412 200312 2 004'}</p>
                    </div>
                  </div>

                  {/* 2. Kepala Instalasi Farmasi */}
                  <div className="space-y-16">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{letterhead.signatory2Title || 'Kepala Instalasi Farmasi'}</p>
                      <p className="text-[10px] text-slate-500">Pemeriksa Pengadaan</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 underline">{letterhead.signatory2Name || 'Apt. Rian Hidayat, S.Farm'}</p>
                      <p className="text-[10px] font-mono text-slate-700">{letterhead.signatory2Nip || 'NIP. 19820815 200804 1 003'}</p>
                    </div>
                  </div>

                  {/* 3. Kepala Instalasi Laboratorium */}
                  <div className="space-y-16">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{letterhead.signatory3Title || 'Kepala Instalasi Laboratorium'}</p>
                      <p className="text-[10px] text-slate-500">Pemohon Pengadaan</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 underline">{letterhead.signatory3Name || 'Dr. Hendra Wijaya, Sp.PK'}</p>
                      <p className="text-[10px] font-mono text-slate-700">{letterhead.signatory3Nip || 'NIP. 19791104 200604 1 009'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete PO Modal */}
      {deleteTargetPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Purchase Order?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>{deleteTargetPO.poNumber}</strong> ({deleteTargetPO.supplierName})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteTargetPO(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (onDeletePO && deleteTargetPO) {
                    await onDeletePO(deleteTargetPO.id);
                    setDeleteTargetPO(null);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-md"
              >
                Ya, Hapus PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
