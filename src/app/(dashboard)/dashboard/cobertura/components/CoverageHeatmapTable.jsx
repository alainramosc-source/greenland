'use client';
import React from 'react';
import {
  Package, X, Save, Edit3, CheckCircle, Clock, Truck, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { middleEllipsis } from '@/utils/formatters';

export function ReorderBadge({ row }) {
  const configs = {
    no_demand: { label: '—', bg: 'bg-slate-100', text: 'text-slate-400', icon: null },
    ok: { label: 'OK', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <CheckCircle size={10} /> },
    plan: { label: 'Planear', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <Clock size={10} /> },
    order_now: { label: '¡Pedir!', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Truck size={10} /> },
    late: { label: 'TARDE', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertTriangle size={10} /> },
  };
  const c = configs[row.reorderStatus] || configs.no_demand;
  if (row.reorderStatus === 'no_demand') {
    return <span className="text-slate-300 text-[10px]">—</span>;
  }

  const nowYear = new Date().getFullYear();
  const dateStr = row.stockoutDate
    ? row.stockoutDate.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: row.stockoutDate.getFullYear() !== nowYear ? 'numeric' : undefined
      })
    : '';

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      title={`Quiebre: ${dateStr}\nMargen: ${row.reorderMargin.toFixed(1)} sem\nSugerido: ${row.suggestedQty} uds`}
    >
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${c.bg} ${c.text} border ${c.border}`}>
        {c.icon} {c.label}
      </span>
      {row.stockoutDate && (
        <span className={`text-[8px] font-bold whitespace-nowrap ${
          row.reorderStatus === 'late' ? 'text-red-500' : row.reorderStatus === 'order_now' ? 'text-orange-500' : 'text-slate-400'
        }`}>
          ⚡ {dateStr}
        </span>
      )}
    </div>
  );
}

function getCellColor(remaining, weeklyDemand) {
  if (weeklyDemand === 0) return 'bg-slate-50/70 text-slate-300';
  if (remaining <= 0) return 'bg-red-100/90 text-red-700 font-black';
  const ratio = remaining / (weeklyDemand * 4);
  if (ratio >= 2) return 'bg-emerald-100/90 text-emerald-800';
  if (ratio >= 1) return 'bg-emerald-50/90 text-emerald-700';
  if (ratio >= 0.5) return 'bg-amber-100/90 text-amber-800';
  if (ratio > 0) return 'bg-orange-100/90 text-orange-800';
  return 'bg-red-100/90 text-red-700 font-black';
}

export default function CoverageHeatmapTable({
  heatmapData,
  skuFilter,
  setSkuFilter,
  weekMetadata,
  LEAD_TIME_WEEKS,
  editingRow,
  editForm,
  setEditForm,
  saving,
  isCombinedView,
  startEdit,
  cancelEdit,
  saveEdit,
  setTransitPanel,
}) {
  const filteredRows = skuFilter
    ? heatmapData.filter(r => {
        const skus = skuFilter.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (skus.length === 0) return true;
        return skus.some(f => r.product.sku.toUpperCase().includes(f) || r.product.name.toUpperCase().includes(f));
      })
    : heatmapData;

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      {/* Integrated Toolbar: Multi-SKU Search & CSV Format Guide */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md group">
            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6a9a04] transition-colors" />
            <input
              type="text"
              value={skuFilter}
              onChange={e => setSkuFilter(e.target.value)}
              placeholder="Filtrar SKUs o nombre... Ej: GL01, GL15, GL19"
              className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/25 focus:border-[#6a9a04]/40 shadow-2xs placeholder:text-slate-400 transition-all"
            />
            {skuFilter && (
              <button
                onClick={() => setSkuFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer bg-transparent border-none"
                title="Limpiar filtro"
              >
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
            {skuFilter ? `${filteredRows.length} de ${heatmapData.length} SKUs` : `${heatmapData.length} SKUs activos`}
          </span>
        </div>

        {/* CSV Format Quick Pill */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200/70 rounded-xl px-3 py-1.5 flex-wrap">
          <FileSpreadsheet size={13} className="text-[#6a9a04] shrink-0" />
          <strong className="text-slate-700">Formato CSV:</strong>
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#6a9a04] font-bold text-[10px]">
            sku, demanda, transit_qty, transit_date, transit_origin
          </code>
          <span className="text-slate-400 hidden xl:inline">
            Ej: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">GL01, 80, 500, 2026-12-15, Consmos</code>
          </span>
        </div>
      </div>

      {/* Scrollable Heatmap Matrix */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '72vh' }}>
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/90">
              <th className="sticky left-0 z-20 bg-slate-50/95 px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px]">
                PN
              </th>
              <th className="sticky left-[70px] z-20 bg-slate-50/95 px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[165px] border-r border-slate-200/60">
                Descripción
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[72px]">
                Bodega
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[76px]">
                Tránsito
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[72px]">
                Dem/Sem
              </th>
              <th className="px-2.5 py-3 text-center text-[10px] font-black uppercase tracking-wider text-orange-600 min-w-[72px] bg-orange-50/60">
                Reorden
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[56px] border-r border-slate-200/60">
                Editar
              </th>
              {weekMetadata.map((w, i) => {
                const isLeadTimeCutoff = i === LEAD_TIME_WEEKS - 1;
                return (
                  <th
                    key={i}
                    className={`px-1.5 py-3 text-center text-[10px] font-black uppercase tracking-wider min-w-[58px] relative ${
                      w.isYearTransition ? 'border-l-2 border-indigo-500 bg-indigo-50/70 text-indigo-700' : ''
                    } ${
                      isLeadTimeCutoff
                        ? 'text-orange-600 border-r-2 border-orange-400 bg-orange-50/30'
                        : w.year > new Date().getFullYear()
                        ? 'text-indigo-600'
                        : 'text-slate-500'
                    }`}
                    title={`${w.label} (${w.dateRangeStr})`}
                  >
                    {w.isYearTransition && (
                      <div className="absolute -top-0.5 left-0 bg-indigo-600 text-white text-[7px] font-bold px-1 rounded-r shadow-2xs">
                        {w.year} ↗
                      </div>
                    )}
                    <div>{w.label}</div>
                    {isLeadTimeCutoff && <div className="text-[7px] text-orange-600 font-extrabold">🚢 LLEGA</div>}
                    {w.isCNY && (
                      <div className="text-[7px] text-red-500 font-bold" title="Año Nuevo Chino 2027 (Fábricas cerradas)">
                        🏮 CNY
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredRows.map(row => {
              const isEditing = editingRow === row.product.id;
              return (
                <tr
                  key={row.product.id}
                  className={`hover:bg-slate-50/80 transition-colors ${isEditing ? 'bg-[#6a9a04]/5' : ''}`}
                >
                  <td className="sticky left-0 z-5 bg-white/95 px-3 py-2.5 font-mono text-[11px] font-black text-[#6a9a04]">
                    {row.product.sku}
                  </td>
                  <td
                    className="sticky left-[70px] z-5 bg-white/95 px-3 py-2.5 text-xs font-medium text-slate-700 truncate max-w-[200px] border-r border-slate-100"
                    title={row.product.name}
                  >
                    {middleEllipsis(row.product.name, 28)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing && !isCombinedView ? (
                      <input
                        type="number"
                        value={editForm.stock_bodega}
                        onChange={e => setEditForm(f => ({ ...f, stock_bodega: e.target.value }))}
                        className="w-16 px-2 py-1 border border-[#6a9a04]/40 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-2xs font-bold"
                      />
                    ) : (
                      <span className="text-xs tabular-nums font-semibold text-slate-800">
                        {row.stockBodega.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.stock_transito}
                        onChange={e => setEditForm(f => ({ ...f, stock_transito: e.target.value }))}
                        className="w-16 px-2 py-1 border border-[#6a9a04]/40 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-2xs font-bold"
                      />
                    ) : (
                      <button
                        onClick={() => setTransitPanel(row.product.id)}
                        className="text-xs tabular-nums cursor-pointer bg-transparent border-none hover:bg-orange-50 px-2 py-1 rounded-lg transition-all"
                        title="Click para gestionar tránsitos"
                      >
                        <span className={row.transitCount > 0 ? 'text-orange-600 font-black' : 'text-slate-300'}>
                          {row.stockTransito > 0 ? row.stockTransito.toLocaleString() : '—'}
                        </span>
                        {row.transitCount > 0 && (
                          <span className="ml-1 text-[9px] font-bold text-orange-500">({row.transitCount})</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.weekly_demand}
                        onChange={e => setEditForm(f => ({ ...f, weekly_demand: e.target.value }))}
                        className="w-16 px-2 py-1 border border-[#6a9a04]/40 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-2xs font-bold"
                      />
                    ) : (
                      <span className="text-xs tabular-nums font-semibold text-slate-700">
                        {row.weeklyDemand.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-center bg-orange-50/20">
                    <ReorderBadge row={row} />
                  </td>
                  <td className="px-3 py-2 text-center border-r border-slate-100">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => saveEdit(row.product.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer bg-transparent transition-all"
                          title="Guardar cambios"
                        >
                          <Save size={12} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer bg-transparent transition-all"
                          title="Cancelar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-[#6a9a04] cursor-pointer bg-transparent transition-all"
                        title={isCombinedView ? 'Editar tránsito y demanda' : 'Editar stock, tránsito y demanda'}
                      >
                        <Edit3 size={12} />
                      </button>
                    )}
                  </td>
                  {row.weeks.map((remaining, i) => {
                    const w = weekMetadata[i];
                    const isLeadTimeCutoff = i === LEAD_TIME_WEEKS - 1;
                    return (
                      <td
                        key={i}
                        className={`px-1 py-2 text-center text-[11px] tabular-nums font-bold transition-colors ${
                          getCellColor(remaining, row.weeklyDemand)
                        } ${w?.isYearTransition ? 'border-l-2 border-indigo-400' : ''} ${
                          isLeadTimeCutoff ? 'border-r-2 border-orange-400' : ''
                        }`}
                        title={`${w?.label || `WK${i + 1}`} (${w?.dateRangeStr}): ${remaining.toLocaleString()} unidades`}
                      >
                        {row.weeklyDemand > 0 ? remaining.toLocaleString() : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

