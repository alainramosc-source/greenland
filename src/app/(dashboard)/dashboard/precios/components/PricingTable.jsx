'use client';
import React from 'react';
import {
  Search, AlertTriangle, Package, ArrowUpDown, X, Save
} from 'lucide-react';

export default function PricingTable({
  filteredProducts,
  searchTerm,
  setSearchTerm,
  categories,
  selectedCategory,
  setSelectedCategory,
  editCount,
  isDistributorMode,
  editedPrices,
  setEditedPrices,
  saving,
  handleSaveAll,
  handleSort,
  getCurrentPrice,
  hasCustomPrice,
  distributorPrices,
}) {
  return (
    <div className="space-y-4">
      {/* Pending Changes Alert Banner */}
      {editCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-amber-900">
              {editCount} precio{editCount > 1 ? 's' : ''} modificado{editCount > 1 ? 's' : ''} sin guardar
              {isDistributorMode && <span className="text-amber-600 font-semibold ml-1">(modo distribuidor)</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditedPrices({})}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#6a9a04] rounded-xl cursor-pointer hover:bg-[#5b8503] border-none disabled:opacity-50 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar Todo'}
            </button>
          </div>
        </div>
      )}

      {/* Enterprise Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Integrated Search & Category Filter Toolbar */}
        <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6a9a04] transition-colors" />
            <input
              type="text"
              placeholder="Buscar producto o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6a9a04]/25 focus:border-[#6a9a04]/40 outline-none shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th
                  className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">Producto <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('sku')}
                >
                  <span className="inline-flex items-center gap-1">SKU <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                {isDistributorMode && (
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Precio Base</th>
                )}
                <th
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('price')}
                >
                  <span className="inline-flex items-center gap-1">
                    {isDistributorMode ? 'Precio Distribuidor' : 'Precio Actual'} <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('avg_cost')}
                  title="Costo promedio ponderado puesto en almacén (se recalcula con cada recepción, todas las bodegas)"
                >
                  <span className="inline-flex items-center gap-1">Costo Prom. <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500" title="(Precio − Costo) / Precio">
                  Margen
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Nuevo Precio</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isDistributorMode ? 9 : 8} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const currentPrice = getCurrentPrice(product);
                  const hasEdit = editedPrices[product.id] !== undefined;
                  const newPrice = hasEdit ? parseFloat(editedPrices[product.id]) : currentPrice;
                  const diff = newPrice - currentPrice;
                  const diffPct = currentPrice > 0 ? ((diff / currentPrice) * 100).toFixed(1) : 0;
                  const isCustom = hasCustomPrice(product);
                  const avgCost = Number(product.avg_cost) || 0;
                  const marginPct = avgCost > 0 && newPrice > 0 ? ((newPrice - avgCost) / newPrice) * 100 : null;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${hasEdit ? 'bg-amber-50/50' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100/80 border border-slate-200/60 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{product.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#6a9a04]">{product.sku || '—'}</td>

                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full">
                          {product.categories?.name || '—'}
                        </span>
                      </td>

                      {isDistributorMode && (
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          ${Number(product.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-black font-mono ${
                            hasEdit ? 'text-slate-400 line-through' : isCustom ? 'text-blue-600' : 'text-slate-900'
                          }`}>
                            ${Number(currentPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          {isCustom && !hasEdit && (
                            <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {avgCost > 0 ? (
                          <span className="text-xs sm:text-sm font-semibold text-slate-600 font-mono">
                            ${avgCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                            title="Aún no hay recepción con costo para este SKU"
                          >
                            Sin costo
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {marginPct === null ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full border ${
                            marginPct < 0
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : marginPct < 15
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {marginPct.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hasEdit ? editedPrices[product.id] : ''}
                            placeholder={currentPrice.toString()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) === currentPrice) {
                                setEditedPrices(prev => {
                                  const n = { ...prev };
                                  delete n[product.id];
                                  return n;
                                });
                              } else {
                                setEditedPrices(prev => ({ ...prev, [product.id]: val }));
                              }
                            }}
                            className={`w-32 pl-6 pr-2.5 py-1.5 text-xs font-bold font-mono rounded-xl border outline-none transition-all ${
                              hasEdit
                                ? 'border-[#6a9a04] bg-white text-[#6a9a04] ring-2 ring-[#6a9a04]/20 shadow-2xs'
                                : 'border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {hasEdit ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black font-mono ${
                              diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'
                            }`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              diff > 0 ? 'bg-emerald-50 text-emerald-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {diff > 0 ? '+' : ''}{diffPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            <strong className="text-slate-800">{filteredProducts.length}</strong> productos en vista ·{' '}
            <strong className="text-slate-800">{editCount}</strong> modificados
            {isDistributorMode && ` · ${Object.keys(distributorPrices).length} con precio custom`}
          </span>
        </div>
      </div>
    </div>
  );
}
