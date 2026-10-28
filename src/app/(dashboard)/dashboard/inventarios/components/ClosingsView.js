'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CalendarCheck, ChevronDown, ChevronRight, Download, Loader2, Lock, AlertTriangle, Zap, Clock } from 'lucide-react';

const MX_TZ = 'America/Mexico_City';
const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const units = (n) => Number(n || 0).toLocaleString('es-MX');
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const periodLabel = (p) => {
  const [y, m] = String(p || '').split('-');
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : p;
};
const closedAtLabel = (iso) =>
  new Date(iso).toLocaleString('es-MX', { timeZone: MX_TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Último día del mes en hora de México
const isLastDayOfMonthMX = () => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: MX_TZ }); // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number);
  return d === new Date(y, m, 0).getDate();
};

export default function ClosingsView({
  closings = [],
  fetchClosingItems,
  onGenerateClosing,
  generatingClosing = false,
  canGenerate = false,
}) {
  const [openId, setOpenId] = useState(null);
  const [itemsById, setItemsById] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);

  const currentPeriod = new Date().toLocaleDateString('en-CA', { timeZone: MX_TZ }).slice(0, 7);
  const currentClosed = closings.some(c => c.period === currentPeriod);
  const lastDay = isLastDayOfMonthMX();

  const loadItems = async (closing) => {
    if (itemsById[closing.id]) return itemsById[closing.id];
    setLoadingId(closing.id);
    const items = await fetchClosingItems(closing.id);
    setItemsById(prev => ({ ...prev, [closing.id]: items }));
    setLoadingId(null);
    return items;
  };

  const toggle = async (closing) => {
    if (openId === closing.id) { setOpenId(null); return; }
    setOpenId(closing.id);
    await loadItems(closing);
  };

  const summarizeByWarehouse = (items) => {
    const map = {};
    items.forEach(i => {
      const k = i.warehouse_name || 'Sin bodega';
      if (!map[k]) map[k] = { warehouse: k, units: 0, value: 0 };
      map[k].units += Number(i.stock_quantity || 0);
      map[k].value += Number(i.value || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  };

  const handleExport = async (closing) => {
    setExportingId(closing.id);
    const items = await loadItems(closing);
    const wb = XLSX.utils.book_new();

    const resumen = [
      { Concepto: 'Periodo', Valor: periodLabel(closing.period) },
      { Concepto: 'Fecha y hora del corte (México)', Valor: closedAtLabel(closing.closed_at) },
      { Concepto: 'Tipo de cierre', Valor: closing.method === 'manual' ? 'Manual' : 'Automático' },
      { Concepto: 'Unidades totales', Valor: Number(closing.total_units || 0) },
      { Concepto: 'Valor total (MXN, costo promedio)', Valor: Number(closing.total_value || 0) },
      { Concepto: 'SKUs con stock sin costo', Valor: Number(closing.skus_without_cost || 0) },
      {},
      ...summarizeByWarehouse(items).map(w => ({ Concepto: `Bodega: ${w.warehouse}`, Valor: Math.round(w.value * 100) / 100, Unidades: w.units })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');

    const detalle = items.map(i => ({
      SKU: i.sku,
      Producto: i.product_name,
      Categoría: i.category || '',
      Bodega: i.warehouse_name,
      'Stock físico': Number(i.stock_quantity || 0),
      'Apartado': Number(i.reserved_quantity || 0),
      'Costo promedio (MXN)': Number(i.avg_cost || 0),
      'Valor (MXN)': Number(i.value || 0),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), 'Detalle SKU x Bodega');

    XLSX.writeFile(wb, `Cierre_Inventario_${closing.period}.xlsx`);
    setExportingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header / status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Cierres Mensuales de Inventario</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
              Foto del stock y su valor (stock físico × costo promedio) por SKU y bodega.
              Se genera <strong>automáticamente el último día de cada mes a las 23:00</strong> (hora de México) y no se puede modificar.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-1.5">
          {currentClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <Lock className="w-3.5 h-3.5" /> {periodLabel(currentPeriod)} ya está cerrado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5" /> {periodLabel(currentPeriod)}: se cerrará automáticamente el último día a las 23:00
            </span>
          )}

          {canGenerate && !currentClosed && (
            <button
              onClick={onGenerateClosing}
              disabled={generatingClosing || !lastDay}
              title={lastDay ? 'Genera el cierre de este mes con el stock actual' : 'Solo disponible el último día del mes'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generatingClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generar cierre ahora
            </button>
          )}
          {canGenerate && !currentClosed && !lastDay && (
            <span className="text-[10px] text-slate-400 text-right">El botón se activa el último día del mes.</span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {closings.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Aún no hay cierres registrados</p>
            <p className="text-xs">El primero se generará el último día de este mes a las 23:00.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {closings.map(c => {
              const isOpen = openId === c.id;
              const items = itemsById[c.id] || [];
              const byWh = isOpen ? summarizeByWarehouse(items) : [];
              return (
                <div key={c.id}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                    <button onClick={() => toggle(c)} className="flex items-center gap-3 text-left min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{periodLabel(c.period)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.method === 'manual' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {c.method === 'manual' ? 'Manual' : 'Automático'}
                          </span>
                          {c.skus_without_cost > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" title="SKUs con stock pero sin costo promedio: su valor cuenta como $0">
                              <AlertTriangle className="w-3 h-3" /> {c.skus_without_cost} SKU sin costo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Corte: {closedAtLabel(c.closed_at)}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Valor total</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{money(c.total_value)}</p>
                        <p className="text-[11px] text-slate-400">{units(c.total_units)} unidades</p>
                      </div>
                      <button
                        onClick={() => handleExport(c)}
                        disabled={exportingId === c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {exportingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Excel
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                      {loadingId === c.id ? (
                        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                      ) : (
                        <>
                          {/* By warehouse */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                            {byWh.map(w => (
                              <div key={w.warehouse} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                <p className="text-[11px] font-semibold text-slate-500 truncate">{w.warehouse}</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white">{money(w.value)}</p>
                                <p className="text-[10px] text-slate-400">{units(w.units)} u</p>
                              </div>
                            ))}
                          </div>

                          {/* Detail */}
                          <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="p-2.5 text-left">SKU</th>
                                  <th className="p-2.5 text-left">Producto</th>
                                  <th className="p-2.5 text-left">Bodega</th>
                                  <th className="p-2.5 text-right">Stock</th>
                                  <th className="p-2.5 text-right">Costo prom.</th>
                                  <th className="p-2.5 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {items.map(i => (
                                  <tr key={i.id} className={Number(i.avg_cost) === 0 && i.stock_quantity > 0 ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                                    <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{i.sku}</td>
                                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{i.product_name}</td>
                                    <td className="p-2.5 text-slate-500">{i.warehouse_name}</td>
                                    <td className="p-2.5 text-right font-semibold">{units(i.stock_quantity)}</td>
                                    <td className="p-2.5 text-right text-slate-500">{money(i.avg_cost)}</td>
                                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">{money(i.value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
