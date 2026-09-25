'use client';

import React from 'react';
import {
  Search, Filter, Eye, EyeOff, ArrowRightLeft, Sliders, ShoppingBag, AlertTriangle, Package, CheckCircle2, DollarSign, Warehouse, Download
} from 'lucide-react';

export default function StockTableView({
  matrix,
  warehouses,
  visibleWarehouses,
  toggleWarehouseVisibility,
  searchFilter,
  setSearchFilter,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  selectedSkus,
  toggleSelectSku,
  selectAllSkus,
  categories,
  onOpenAdjust,
  onOpenTransfer,
  onOpenProSale,
  userRole,
  isPro,
  stats,
  valuationData,
  totalProductsCount
}) {
  const allSelected = matrix.length > 0 && matrix.every(row => selectedSkus.includes(row.sku));
  const someSelected = selectedSkus.length > 0;

  const handleExportExcel = () => {
    const headers = [
      'SKU',
      'Producto',
      'Categoría',
      'Precio Público ($)',
      ...warehouses.map(w => `${w.name || w.codigo} (Disp)`),
      ...warehouses.map(w => `${w.name || w.codigo} (Res)`),
      'Total Disponible (Neto)',
      'Total Físico (Con Reservas)'
    ];

    const rows = matrix.map(row => {
      const whAvails = warehouses.map(wh => row.warehouses[wh.id]?.available || 0);
      const whRes = warehouses.map(wh => row.warehouses[wh.id]?.reserved || 0);

      return [
        `"${row.sku}"`,
        `"${(row.name || '').replace(/"/g, '""')}"`,
        `"${(row.category || '').replace(/"/g, '""')}"`,
        row.price || 0,
        ...whAvails,
        ...whRes,
        row.totalAvailable,
        row.totalPhysical
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_Greenland_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por SKU o nombre de producto..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar a Excel
            </button>
            {/* Category Selector */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Stock Level Selector */}
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
              >
                <option value="ALL">Todo el Stock</option>
                <option value="LOW">Stock Bajo (&le; 10)</option>
                <option value="OUT">Sin Stock (= 0)</option>
                <option value="AVAILABLE">Con Stock (&gt; 0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bodegas Visibility Toggles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Bodegas Visibles ({warehouses.filter(w => visibleWarehouses[w.id] !== false).length}/{warehouses.length}):
          </span>
          {warehouses.map((wh) => {
            const isVisible = visibleWarehouses[wh.id] !== false;
            return (
              <button
                key={wh.id}
                onClick={() => toggleWarehouseVisibility(wh.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  isVisible
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                }`}
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {wh.name || wh.codigo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions Bar if items selected */}
      {someSelected && (
        <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <span className="text-sm font-medium pl-2">
            {selectedSkus.length} producto(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenTransfer(selectedSkus)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferencia Masiva
            </button>
            <button
              onClick={() => onOpenAdjust(selectedSkus)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" /> Ajuste Masivo
            </button>
            {isPro && (
              <button
                onClick={() => onOpenProSale(selectedSkus)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg transition-all shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Venta al Público PRO
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Stock Matrix Table Container with Internal Scrollbar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        {/* Scrollable Body Container with Sticky Header */}
        <div className="max-h-[580px] overflow-y-auto overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
              <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={selectAllSkus}
                    className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="p-3.5 min-w-[240px]">Producto</th>
                <th className="p-3.5 min-w-[100px]">SKU</th>
                {warehouses.map((wh) => {
                  if (visibleWarehouses[wh.id] === false) return null;
                  return (
                    <th key={wh.id} className="p-3.5 text-center min-w-[110px]">
                      {wh.name || wh.codigo}
                    </th>
                  );
                })}
                <th className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200 min-w-[110px]">
                  Total
                </th>
                <th className="p-3.5 text-center min-w-[110px]">Estado</th>
                <th className="p-3.5 text-right min-w-[160px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
              {matrix.length === 0 ? (
                <tr>
                  <td colSpan={5 + warehouses.filter(w => visibleWarehouses[w.id] !== false).length} className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron productos en el inventario con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                matrix.map((row) => {
                  const isSelected = selectedSkus.includes(row.sku);
                  const totalAvail = row.totalAvailable;
                  const isLow = totalAvail > 0 && totalAvail <= 10;
                  const isOut = totalAvail <= 0;

                  return (
                    <tr
                      key={row.sku}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSku(row.sku)}
                          className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Product Name + Box Icon + Retail Price */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-snug">
                              {row.name}
                            </p>
                            {row.price !== undefined && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ${Number(row.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {row.sku}
                      </td>

                      {/* Warehouses Stock Columns */}
                      {warehouses.map((wh) => {
                        if (visibleWarehouses[wh.id] === false) return null;
                        const whStock = row.warehouses[wh.id] || { available: 0, physical: 0, reserved: 0 };
                        const avail = whStock.available;
                        const reserved = whStock.reserved;

                        return (
                          <td key={wh.id} className="p-3.5 text-center">
                            <span className={`font-bold text-sm ${avail === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {avail}
                            </span>
                            {reserved > 0 && (
                              <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                                ({reserved} res.)
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Available + Physical Breakdown */}
                      <td className="p-3.5 text-center bg-slate-50/50 dark:bg-slate-800/50">
                        <span className={`font-extrabold text-base ${row.totalAvailable === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {row.totalAvailable}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium leading-tight">
                          de {row.totalPhysical}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                            <AlertTriangle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Disponible
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAdjust([row.sku])}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all"
                          >
                            <Sliders className="w-3.5 h-3.5" /> Ajustar
                          </button>
                          <button
                            onClick={() => onOpenTransfer([row.sku])}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-all"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Counter */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Mostrando {matrix.length} de {totalProductsCount || matrix.length} productos</span>
        </div>
      </div>

      {/* Summary Indicators Cards (Below Table) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Disponible Total</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.totalUnits?.toLocaleString('es-MX')}</p>
            </div>
          </div>

          {stats.warehouseTotals?.map((wh) => (
            <div key={wh.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 border-l-4 border-l-emerald-500">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{(wh.name || wh.codigo).replace('Bodega ', '')}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{wh.total?.toLocaleString('es-MX')}</p>
              </div>
            </div>
          ))}

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Agotados</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.outOfStockCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Valuation Card (Dark Navy Box) */}
      {valuationData && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50 space-y-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">Valor de Inventario</h3>
                <p className="text-xs text-slate-400">
                  Stock actual &times; costo promedio ponderado ({valuationData.skusWithCost}/{valuationData.totalSkus} SKUs con costo)
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Total</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                ${valuationData.grandTotal?.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {valuationData.warehouseValues?.map((wh) => (
              <div key={wh.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {(wh.name || wh.codigo).replace('Bodega ', '')}
                </p>
                <p className="text-lg font-black text-white font-mono">
                  ${wh.value?.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
