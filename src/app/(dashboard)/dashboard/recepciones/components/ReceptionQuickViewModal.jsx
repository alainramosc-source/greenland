'use client';
import Link from 'next/link';
import { X, Container, Warehouse, Calendar, Package, DollarSign, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function ReceptionQuickViewModal({
  reception,
  onClose,
  warehouses = [],
}) {
  if (!reception) return null;

  const isMulti = reception._whInfo?.isMulti;
  const items = reception.items || [];
  const totalUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  // Group items by warehouse
  const itemsByWarehouse = {};
  items.forEach((i) => {
    const wid = i.warehouse_id || reception.warehouse_id;
    const wName = warehouses.find((w) => w.id === wid)?.name || 'Bodega';
    if (!itemsByWarehouse[wName]) itemsByWarehouse[wName] = { count: 0, items: [] };
    itemsByWarehouse[wName].count += Number(i.quantity) || 0;
    itemsByWarehouse[wName].items.push(i);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6a9a04]/10 text-[#6a9a04] flex items-center justify-center shrink-0">
              <Container size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 m-0">
                  {reception.operation_number && (
                    <span className="text-[#6a9a04] mr-1.5">{reception.operation_number}</span>
                  )}
                  {reception.container_label || 'Sin etiqueta'}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    reception.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : reception.status === 'draft'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {reception.status === 'completed' ? 'Completada' : reception.status === 'draft' ? 'Borrador' : 'Cancelada'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                Fecha: {formatDateOnly(reception.reception_date)} • Pedimento: {reception.pedimento_number || 'N/A'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Destino
              </span>
              {isMulti ? (
                <div>
                  <span className="inline-block text-[10px] font-black uppercase text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded mb-1">
                    Multibodega
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    {reception._whInfo?.names?.join(' / ')}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-extrabold text-slate-800 block">
                  {reception._whInfo?.fullName || reception.warehouse?.name || '—'}
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Distribución
              </span>
              <span className="text-xs font-extrabold text-slate-800 block">
                {reception.distributor ? reception.distributor.full_name : 'Stock Propio (Saltillo)'}
              </span>
              {reception.distributor?.client_number && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {reception.distributor.client_number}
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Cargamento
              </span>
              <span className="text-xs font-extrabold text-slate-800 block">
                {items.length} {items.length === 1 ? 'partida' : 'partidas'}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                {totalUnits.toLocaleString('es-MX')} pzas
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Costo Landed Total
              </span>
              <span className="text-xs font-black text-slate-900 block">
                ${Number(reception.total_landed_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">MXN puesto en bodega</span>
            </div>
          </div>

          {/* Multibodega breakdown badge if multi */}
          {Object.keys(itemsByWarehouse).length > 1 && (
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs font-bold text-purple-900 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Warehouse size={15} className="text-purple-600 shrink-0" />
                <span>Desglose por Bodega Física:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(itemsByWarehouse).map(([wName, data]) => (
                  <span
                    key={wName}
                    className="bg-white/90 border border-purple-200 px-2.5 py-1 rounded-xl text-purple-800 font-extrabold shadow-xs"
                  >
                    {wName}: {data.count} pzas
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 m-0 flex items-center gap-1.5">
              <Package size={14} className="text-[#6a9a04]" /> Productos Recibidos
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3">Bodega</th>
                    <th className="py-2.5 px-3 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Costo Landed/ud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((it, idx) => {
                    const wid = it.warehouse_id || reception.warehouse_id;
                    const wName = warehouses.find((w) => w.id === wid)?.name || 'Bodega';
                    const isDifferent = reception.warehouse_id && wid && wid !== reception.warehouse_id;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{it.product?.sku || '—'}</td>
                        <td className="py-2 px-3 font-semibold">{it.product?.name || '—'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDifferent
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {wName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {Number(it.quantity || 0).toLocaleString('es-MX')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {it.unit_landed_cost ? `$${Number(it.unit_landed_cost).toFixed(2)} MXN` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <Link
            href={`/dashboard/recepciones/nueva?id=${reception.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6a9a04] hover:bg-[#5b8503] text-white text-xs font-bold transition-all shadow-md shadow-[#6a9a04]/20 no-underline cursor-pointer"
          >
            <span>Ver y Gestionar Detalle Completo</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
