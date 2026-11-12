'use client';
import React from 'react';
import {
  Percent, X, FileSpreadsheet, Check, Upload, Users, AlertTriangle, Save
} from 'lucide-react';

export default function PriceModals({
  showPercent,
  setShowPercent,
  percentTarget,
  setPercentTarget,
  percentValue,
  setPercentValue,
  categories,
  handleApplyPercent,
  showCsvModal,
  setShowCsvModal,
  csvPreview,
  setCsvData,
  setCsvPreview,
  isDistributorMode,
  distributors,
  selectedDistributor,
  products,
  handleApplyCsv,
  showBulkCsv,
  setShowBulkCsv,
  bulkCsvRows,
  setBulkCsvRows,
  bulkCsvErrors,
  setBulkCsvErrors,
  bulkCsvResult,
  setBulkCsvResult,
  bulkCsvUploading,
  handleBulkCsvUpload,
}) {
  return (
    <>
      {/* Percentage Modal */}
      {showPercent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-600" /> Ajuste Porcentual
              </h3>
              <button
                onClick={() => setShowPercent(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 bg-transparent border-none cursor-pointer text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Aplicar a</label>
                <select
                  value={percentTarget}
                  onChange={(e) => setPercentTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="all">Todos los productos</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Porcentaje</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={percentValue}
                    onChange={(e) => setPercentValue(e.target.value)}
                    placeholder="Ej. 10 para +10%, -5 para -5%"
                    autoFocus
                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 text-slate-800 outline-none text-base font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <small className="block mt-1.5 text-[11px] text-slate-400">
                  Positivo para subir, negativo para bajar. Los cambios se aplican a la columna &ldquo;Nuevo Precio&rdquo; sin guardar.
                </small>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowPercent(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyPercent}
                  disabled={!percentValue}
                  className="px-4 py-2 rounded-xl text-xs text-white font-bold bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 cursor-pointer transition-all border-none disabled:opacity-50"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[550px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900 m-0 flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Previsualización CSV
                {isDistributorMode && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    → {distributors.find(d => d.id === selectedDistributor)?.full_name}
                  </span>
                )}
              </h3>
              <button
                onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 bg-transparent border-none cursor-pointer text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-3 m-0">
                Se encontraron <strong>{csvPreview.length}</strong> filas. Los SKUs que coincidan con productos existentes se actualizarán.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">SKU</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Nuevo Precio</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreview.slice(0, 50).map((row, i) => {
                      const match = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
                      return (
                        <tr key={i} className={match ? '' : 'bg-red-50/50'}>
                          <td className="px-4 py-2 font-mono text-xs font-bold">{row.sku}</td>
                          <td className="px-4 py-2 font-bold text-[#6a9a04] font-mono">${row.price.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            {match ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {match.name}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-red-500">No encontrado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyCsv}
                  className="px-4 py-2 rounded-xl text-xs text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 cursor-pointer transition-all border-none flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Aplicar Precios del CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showBulkCsv && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-[800px] w-full rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#6a9a04]" />
                <h3 className="text-base font-black text-slate-900 m-0">Carga Masiva — Precios por Distribuidor</h3>
              </div>
              <button
                onClick={() => { setShowBulkCsv(false); setBulkCsvRows([]); setBulkCsvErrors([]); setBulkCsvResult(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 bg-transparent border-none cursor-pointer text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {bulkCsvErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-700 mb-2 m-0 flex items-center gap-2">
                    <AlertTriangle size={14} /> {bulkCsvErrors.length} error(es)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {bulkCsvErrors.map((e, i) => <p key={i} className="text-xs text-red-600 m-0">{e}</p>)}
                  </div>
                </div>
              )}

              {bulkCsvResult && (
                <div className={`border rounded-xl p-4 ${bulkCsvResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-xs font-bold m-0 flex items-center gap-2">
                    {bulkCsvResult.failed === 0 ? <Check size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-600" />}
                    {bulkCsvResult.success} precios actualizados
                    {bulkCsvResult.failed > 0 && `, ${bulkCsvResult.failed} fallaron`}
                  </p>
                  {bulkCsvResult.errors?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {bulkCsvResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600 m-0">{err}</p>)}
                    </div>
                  )}
                </div>
              )}

              {bulkCsvRows.length > 0 && !bulkCsvResult && (
                <>
                  <p className="text-xs text-slate-600 font-bold m-0">{bulkCsvRows.length} precios listos para aplicar:</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Cliente</th>
                          <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Dirección</th>
                          <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">SKU</th>
                          <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Producto</th>
                          <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {bulkCsvRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2">
                              <span className="font-mono font-bold text-[#6a9a04]">{row.clientNum}</span>{' '}
                              <span className="text-slate-500">{row.distributorName}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-600 font-medium">{row.addressName}</td>
                            <td className="px-3 py-2 font-mono text-slate-500">{row.sku}</td>
                            <td className="px-3 py-2 text-slate-800 font-semibold">{row.productName}</td>
                            <td className="px-3 py-2 font-bold text-slate-900 text-right font-mono">
                              ${row.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkCsvRows.length > 50 && (
                      <p className="text-xs text-slate-400 text-center py-2 m-0">...y {bulkCsvRows.length - 50} más</p>
                    )}
                  </div>
                </>
              )}

              {bulkCsvRows.length === 0 && bulkCsvErrors.length === 0 && !bulkCsvResult && (
                <p className="text-center text-slate-400 text-xs py-8 m-0">No se encontraron datos válidos.</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-200/80 flex justify-end gap-2.5 bg-slate-50/40">
              <button
                onClick={() => { setShowBulkCsv(false); setBulkCsvRows([]); setBulkCsvErrors([]); setBulkCsvResult(null); }}
                className="px-4 py-2 rounded-xl text-xs text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
              >
                {bulkCsvResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {bulkCsvRows.length > 0 && !bulkCsvResult && (
                <button
                  onClick={handleBulkCsvUpload}
                  disabled={bulkCsvUploading}
                  className="px-4 py-2 rounded-xl text-xs text-white font-bold bg-[#6a9a04] hover:bg-[#5b8503] shadow-md shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkCsvUploading ? <Save size={14} className="animate-spin" /> : <Upload size={14} />}
                  {bulkCsvUploading ? 'Aplicando...' : `Aplicar ${bulkCsvRows.length} precios`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
