'use client';
import React from 'react';
import { Truck, Calendar } from 'lucide-react';
import { ReorderBadge } from './CoverageHeatmapTable';

export default function ReorderSuggestionsPanel({
  reorderAlerts,
  LEAD_TIME_WEEKS,
  REORDER_TARGET_WEEKS,
  ORDER_CYCLE_WEEKS,
  selectedManufacturer,
  selectedWarehouse,
}) {
  return (
    <div className="space-y-4">
      {/* Reorder Suggestion Panel */}
      {reorderAlerts.length > 0 && (
        <div className="bg-white border border-orange-200/90 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-200/60 bg-gradient-to-r from-orange-50/80 to-amber-50/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 m-0 flex items-center gap-2">
                  Sugerencia Inteligente de Reorden
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200">
                    {reorderAlerts.length} SKUs
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  Basado en lead time de <strong>{LEAD_TIME_WEEKS} semanas</strong> · Objetivo de cobertura: <strong>{REORDER_TARGET_WEEKS} semanas</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-center">Stock Actual</th>
                  <th className="px-4 py-3 text-center">Dem/Sem</th>
                  <th className="px-4 py-3 text-center">Sem Restantes</th>
                  <th className="px-4 py-3 text-center text-orange-600">Quiebre Est.</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right text-[#6a9a04]">Qty Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reorderAlerts.map(row => (
                  <tr key={row.product.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] font-black text-[#6a9a04]">{row.product.sku}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{row.product.name}</td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums font-bold text-slate-700">{row.totalStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums text-slate-600">{row.weeklyDemand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums font-bold text-slate-700">{row.coverageWeeks.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`text-xs font-bold inline-flex items-center gap-1 ${
                        row.reorderStatus === 'late' ? 'text-red-600' : row.reorderStatus === 'order_now' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        <Calendar size={11} />
                        {row.stockoutDate?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ReorderBadge row={row} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20 text-xs font-black font-mono">
                        {row.suggestedQty.toLocaleString()} uds
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend Bar */}
      <div className="bg-white border border-slate-200/80 shadow-2xs rounded-2xl px-5 py-3 flex items-center gap-4 sm:gap-5 flex-wrap text-xs text-slate-500">
        <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider">Leyenda:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> Stock holgado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Precaución</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Bajo</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Sin stock</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Sin demanda</span>
        <span className="text-slate-300 hidden sm:inline">|</span>
        <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
          <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block" /> Inicio 2027
        </span>
        <span className="flex items-center gap-1.5 text-red-600 font-bold" title="Cierre de fábricas en China por Año Nuevo Chino">
          <span>🏮 CNY</span> Año Nuevo Chino (Feb 2027)
        </span>
        <span className="text-slate-300 hidden sm:inline">|</span>
        <span className="flex items-center gap-1.5 text-orange-600 font-bold">
          <span className="w-3 h-3 rounded border-2 border-orange-400 inline-block" />
          🚢 {selectedManufacturer?.short_name || '—'}: {selectedManufacturer?.production_lead_weeks || 4}p + {(selectedWarehouse?.transit_lead_weeks || selectedManufacturer?.transit_lead_weeks || 5)}t = {LEAD_TIME_WEEKS}sem · Ciclo: {ORDER_CYCLE_WEEKS}sem
        </span>
      </div>
    </div>
  );
}

