import React, { useState } from 'react';
import { X, FileSpreadsheet, Plus, HelpCircle, Save, Trash } from 'lucide-react';
import { Reagent } from '../../types.js';

interface SmartReagentInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reagents: Partial<Reagent>[]) => Promise<void>;
}

export interface SmartReagentRow {
  code: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  packageSize: string;
  price: string;
  sellingPrice: string;
  minimumStock: string;
  reorderPoint: string;
  storageCondition: string;
  openStabilityValue: string;
  description: string;
}

const COLUMNS: { key: keyof SmartReagentRow; label: string; placeholder: string; required?: boolean; width?: string }[] = [
  { key: 'code', label: 'Kode Reagen *', placeholder: 'REG-GLU-001', required: true, width: '130px' },
  { key: 'barcode', label: 'Barcode', placeholder: '899100...', width: '140px' },
  { key: 'name', label: 'Nama Reagen *', placeholder: 'Glucose Enzymatic', required: true, width: '220px' },
  { key: 'brand', label: 'Merk / Brand *', placeholder: 'Roche Cobas', required: true, width: '140px' },
  { key: 'category', label: 'Kategori *', placeholder: 'Kimia Klinik', required: true, width: '130px' },
  { key: 'unit', label: 'Satuan', placeholder: 'Kit', width: '90px' },
  { key: 'packageSize', label: 'Kemasan / Isi', placeholder: '100 Test/Kit', width: '120px' },
  { key: 'price', label: 'Harga Beli (Rp) *', placeholder: '1250000', width: '130px' },
  { key: 'sellingPrice', label: 'Harga Jual (Rp) *', placeholder: '1500000', width: '130px' },
  { key: 'minimumStock', label: 'Min Stok', placeholder: '5', width: '95px' },
  { key: 'reorderPoint', label: 'Reorder Point', placeholder: '8', width: '110px' },
  { key: 'storageCondition', label: 'Suhu Storage', placeholder: '2-8°C', width: '140px' },
  { key: 'openStabilityValue', label: 'Open Stability', placeholder: '30', width: '130px' },
  { key: 'description', label: 'Deskripsi', placeholder: 'Deskripsi singkat...', width: '250px' },
];

export const SmartReagentInputModal: React.FC<SmartReagentInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [rowCountInput, setRowCountInput] = useState<number>(5);
  const [gridData, setGridData] = useState<SmartReagentRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Initialize or add rows to the grid
  const handleGenerateRows = () => {
    const count = Math.max(1, Math.min(500, rowCountInput)); // Clamp between 1 and 500
    const emptyRows: SmartReagentRow[] = Array.from({ length: count }, () => ({
      code: '',
      barcode: '',
      name: '',
      brand: '',
      category: 'Kimia Klinik',
      unit: 'Kit',
      packageSize: '100 Test/Kit',
      price: '',
      sellingPrice: '',
      minimumStock: '5',
      reorderPoint: '8',
      storageCondition: '2-8°C',
      openStabilityValue: '30',
      description: '',
    }));
    setGridData(emptyRows);
    setRowCountInput(count);
    setValidationErrors([]);
  };

  // Change single cell value manually
  const handleCellChange = (rowIndex: number, key: keyof SmartReagentRow, value: string) => {
    const updated = [...gridData];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [key]: value,
    };
    setGridData(updated);
  };

  // Clear grid
  const handleClearGrid = () => {
    setGridData([]);
    setRowCountInput(5);
    setValidationErrors([]);
  };

  // Paste Event Handler (Intercept Excel Tab-Separated Clipboard data)
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColKey: keyof SmartReagentRow
  ) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    // Split rows by newline
    const lines = clipboardText.split(/\r?\n/);
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop(); // Remove trailing empty line from Excel
    }

    const startColIndex = COLUMNS.findIndex((col) => col.key === startColKey);
    if (startColIndex === -1) return;

    const updatedGrid = [...gridData];

    // Find the first empty cell in this specific column to start pasting
    const firstEmptyRowIdx = updatedGrid.findIndex(
      (row) => {
        const val = row[startColKey];
        return !val || String(val).trim() === '';
      }
    );
    const actualStartRowIndex = firstEmptyRowIdx !== -1 ? firstEmptyRowIdx : updatedGrid.length;

    lines.forEach((line, rowOffset) => {
      const targetRowIndex = actualStartRowIndex + rowOffset;
      // If we don't have enough rows in the grid, add a new empty row
      if (targetRowIndex >= updatedGrid.length) {
        // Stop pasting if we reach 500 limit to prevent browser freeze
        if (targetRowIndex >= 500) return;
        updatedGrid.push({
          code: '',
          barcode: '',
          name: '',
          brand: '',
          category: 'Kimia Klinik',
          unit: 'Kit',
          packageSize: '100 Test/Kit',
          price: '',
          sellingPrice: '',
          minimumStock: '5',
          reorderPoint: '8',
          storageCondition: '2-8°C',
          openStabilityValue: '30',
          description: '',
        });
      }

      const cells = line.split('\t');
      cells.forEach((cellVal, colOffset) => {
        const targetColIndex = startColIndex + colOffset;
        if (targetColIndex >= COLUMNS.length) return; // Prevent column overflow

        const colKey = COLUMNS[targetColIndex].key;
        updatedGrid[targetRowIndex] = {
          ...updatedGrid[targetRowIndex],
          [colKey]: cellVal.trim(),
        };
      });
    });

    setGridData(updatedGrid);
    setRowCountInput(updatedGrid.length);
  };

  // Process and save data
  const handleSaveGrid = async () => {
    setValidationErrors([]);
    setIsSaving(true);

    try {
      const validReagents: Partial<Reagent>[] = [];
      const errors: string[] = [];

      // Loop through all grid rows
      gridData.forEach((row, idx) => {
        const rowNum = idx + 1;

        // Skip completely empty rows
        const isRowEmpty = Object.values(row).every((val) => val === '');
        if (isRowEmpty) return;

        // Check required fields
        if (!row.code) {
          errors.push(`Baris ${rowNum}: "Kode Reagen" wajib diisi.`);
        }
        if (!row.name) {
          errors.push(`Baris ${rowNum}: "Nama Reagen" wajib diisi.`);
        }
        if (!row.brand) {
          errors.push(`Baris ${rowNum}: "Merk / Brand" wajib diisi.`);
        }

        // Validate storage condition category
        const allowedStorage = ['Room Temperature', '2-8°C', '-20°C', '-80°C', 'Protected from Light'];
        let finalStorage = row.storageCondition || '2-8°C';
        if (!allowedStorage.includes(finalStorage)) {
          // Try to map or fallback
          if (finalStorage.includes('2-8')) finalStorage = '2-8°C';
          else if (finalStorage.toLowerCase().includes('room') || finalStorage.includes('15-25')) finalStorage = 'Room Temperature';
          else if (finalStorage.includes('-20')) finalStorage = '-20°C';
          else if (finalStorage.includes('-80')) finalStorage = '-80°C';
          else finalStorage = '2-8°C'; // Default fallback
        }

        // Build reagent payload
        const reagentPayload: Partial<Reagent> = {
          code: row.code,
          barcode: row.barcode || `899${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          name: row.name,
          genericName: row.name,
          brand: row.brand,
          manufacturer: row.brand,
          category: row.category || 'Kimia Klinik',
          unit: row.unit || 'Kit',
          packageSize: row.packageSize || '100 Test/Kit',
          price: row.price ? Number(row.price.replace(/[^\d]/g, '')) || 0 : 0,
          sellingPrice: row.sellingPrice ? Number(row.sellingPrice.replace(/[^\d]/g, '')) || 0 : 0,
          minimumStock: row.minimumStock ? Number(row.minimumStock) || 0 : 5,
          maximumStock: row.reorderPoint ? (Number(row.reorderPoint) * 3) || 25 : 25,
          reorderPoint: row.reorderPoint ? Number(row.reorderPoint) || 0 : 8,
          storageMinTemp: finalStorage === '2-8°C' ? 2 : finalStorage === '-20°C' ? -25 : finalStorage === '-80°C' ? -85 : 15,
          storageMaxTemp: finalStorage === '2-8°C' ? 8 : finalStorage === '-20°C' ? -15 : finalStorage === '-80°C' ? -70 : 25,
          storageCondition: finalStorage as any,
          openStabilityValue: row.openStabilityValue ? Number(row.openStabilityValue) || 30 : 30,
          openStabilityUnit: 'hari',
          status: 'Aktif',
          description: row.description || undefined,
        };

        validReagents.push(reagentPayload);
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsSaving(false);
        return;
      }

      if (validReagents.length === 0) {
        setValidationErrors(['Tidak ada data yang valid untuk disimpan. Isi sekurang-kurangnya 1 baris.']);
        setIsSaving(false);
        return;
      }

      // Save to database
      await onSave(validReagents);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving smart grid:', err);
      setValidationErrors([err.message || 'Gagal menyimpan data reagen massal ke server.']);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Smart Input Master Reagen (Massal via Copy-Paste Excel)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pengisian cepat katalog reagen massal langsung dengan menempelkan data baris dan kolom hasil copy dari Excel.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Control Panel */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Jumlah Baris Input */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Jumlah Baris :</label>
            <input
              type="number"
              min={1}
              max={500}
              value={rowCountInput}
              onChange={(e) => setRowCountInput(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-center font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleGenerateRows}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tampilkan Baris</span>
            </button>
            {gridData.length > 0 && (
              <button
                onClick={handleClearGrid}
                className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
              >
                <Trash className="h-3.5 w-3.5" />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="flex items-center space-x-2 rounded-xl bg-teal-50 border border-teal-200/50 p-2.5 text-[11px] text-teal-800 w-full md:w-auto md:max-w-md shrink-0">
            <HelpCircle className="h-4.5 w-4.5 text-teal-700 shrink-0" />
            <p className="leading-relaxed">
              <strong>Tips Excel:</strong> Copy data di Excel dengan urutan kolom yang sama, lalu klik sel input pertama di baris 1 kolom 1 dan tekan <strong>Ctrl + V</strong>.
            </p>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="bg-rose-50 border-b border-rose-100 p-4 max-h-[15vh] overflow-y-auto custom-scrollbar">
            <p className="text-xs font-bold text-rose-800 mb-1">Ditemukan kesalahan pengisian data ({validationErrors.length}):</p>
            <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Central Spreadsheet Grid */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100/50 custom-scrollbar">
          {gridData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-800">Tabel Kosong</p>
              <p className="text-[11px] text-slate-400 mt-1">Masukkan Jumlah Baris di atas lalu klik "Tampilkan Baris" untuk memicu editor grid spreadsheet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs min-w-[1700px] table-fixed">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-12 border-r border-slate-200 text-center bg-slate-100 font-bold">No</th>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="px-3 py-2.5 border-r border-slate-200" style={{ width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gridData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/50 transition">
                      <td className="px-2 py-1.5 border-r border-slate-200 font-mono text-center font-bold bg-slate-50/80 text-slate-500">
                        {rowIndex + 1}
                      </td>
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="p-0.5 border-r border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-inset" style={{ width: col.width }}>
                          <input
                            type="text"
                            value={row[col.key]}
                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                            onPaste={(e) => handlePaste(e, rowIndex, col.key)}
                            placeholder={col.placeholder}
                            className="w-full h-8 border-none bg-transparent px-2.5 text-xs text-slate-900 focus:outline-none placeholder-slate-400/70"
                            style={{ width: '100%' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {gridData.length > 0 && (
              <span>Menampilkan total <strong>{gridData.length}</strong> baris editor data.</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSaveGrid}
              disabled={gridData.length === 0 || isSaving}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isSaving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan ke Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
