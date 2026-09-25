'use client';

import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';

export default function CsvImportModal({
  isOpen,
  onClose,
  onFileSelect,
  previewData = [],
  invalidRows = [],
  onSubmit,
  loading = false
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,SKU,Bodega,Cantidad\nPROD-001,BODEGA_PRINCIPAL,50\nPROD-002,BODEGA_NORTE,100";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Importación Masiva vía CSV</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Actualiza stocks mediante archivos CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Template Download Option */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Soporta formatos en filas (<code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">SKU,Bodega,Cantidad</code>) o matriz pivote.
            </span>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Plantilla CSV
            </button>
          </div>

          {/* File Upload Zone */}
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-900/20 group cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 mx-auto mb-2 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra un archivo CSV'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Máximo 10,000 filas por archivo</p>
          </div>

          {/* Invalid rows alert if any */}
          {invalidRows.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Se detectaron {invalidRows.length} fila(s) con errores:
              </div>
              <ul className="list-disc list-inside max-h-24 overflow-y-auto font-mono text-[11px]">
                {invalidRows.map((inv, idx) => (
                  <li key={idx}>Fila {inv.row}: {inv.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vista Previa de Registros a Importar ({previewData.length})</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Válidos</span>
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Bodega / ID</th>
                      <th className="p-2 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">{row.sku}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">{row.warehouse_id}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{row.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || previewData.length === 0}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Procesar Importación
          </button>
        </div>
      </div>
    </div>
  );
}
