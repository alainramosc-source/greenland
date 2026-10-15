'use client';
import { FileText, User, Warehouse } from 'lucide-react';

export default function ReceptionCostingSummary({
  form,
  setForm,
  items,
  warehouses,
  distributors,
  totalOriginCostUSD,
  totalOriginCostMXN,
  totalAdditionalCosts,
  totalLandedCost,
  chargeAmount,
  tcGoods,
  getLandedPerUnit,
  isCompleted,
  isAuthorized,
}) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
        <FileText size={18} className="text-[#6a9a04]" /> Resumen de Costeo y Landed Cost
      </h3>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-50/90 rounded-2xl p-4 text-center border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-1">
            Costo Origen (USD→MXN)
          </p>
          <p className="text-2xl font-black text-slate-900 m-0">
            ${totalOriginCostMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 m-0 mt-1">
            ${totalOriginCostUSD.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD × {tcGoods}
          </p>
        </div>

        <div className="bg-slate-50/90 rounded-2xl p-4 text-center border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-1">
            Costos Adicionales (MXN)
          </p>
          <p className="text-2xl font-black text-slate-900 m-0">
            ${totalAdditionalCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 m-0 mt-1">Fletes + Aduana + Impuestos</p>
        </div>

        <div className="bg-blue-50/80 rounded-2xl p-4 text-center border-2 border-blue-200">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider m-0 mb-1">
            Costo Landed Total (MXN)
          </p>
          <p className="text-2xl font-black text-blue-700 m-0">
            ${totalLandedCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-blue-500 font-semibold m-0 mt-1">Total Puesto en Bodegas</p>
        </div>
      </div>

      {/* Landed Cost Prorated Table by SKU */}
      {items.length > 0 && totalAdditionalCosts > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider m-0">
              Costo Landed por SKU (Prorrateo Ponderado en Almacén)
            </p>
            <span className="text-[11px] text-slate-400">
              Impacta directamente el costo promedio ponderado de inventario
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5">Bodega Destino</th>
                  <th className="px-4 py-2.5 text-center">Cantidad</th>
                  <th className="px-4 py-2.5 text-right">Landed Unitario (MXN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const targetWid = item.warehouse_id || form.warehouse_id;
                  const targetWname = warehouses.find((w) => w.id === targetWid)?.name || 'Bodega';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-mono font-bold text-slate-600">{item.sku}</td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">{item.name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Warehouse size={11} className="text-slate-400" />
                          {targetWname}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-black text-blue-600">
                        ${getLandedPerUnit(item).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRO Charge summary */}
      {form.distributor_id && (
        <div className="bg-[#6a9a04]/5 border-2 border-[#6a9a04]/20 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
                <User size={24} className="text-[#6a9a04]" />
              </div>
              <div>
                <p className="text-xs font-black text-[#6a9a04] uppercase tracking-wider m-0">
                  Cargo Generado al Distribuidor PRO
                </p>
                <p className="text-sm font-bold text-slate-800 m-0">
                  {distributors.find((d) => d.id === form.distributor_id)?.full_name || '—'}
                </p>
                <p className="text-[11px] text-slate-500 m-0">
                  Se generará una cuenta por cobrar al confirmar la recepción.
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-[#6a9a04] m-0">
              ${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Notas y Observaciones</label>
        <textarea
          value={form.notes || ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          disabled={isCompleted && !isAuthorized}
          rows={2}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm resize-none disabled:opacity-60"
          placeholder="Observaciones de la descarga, estado de los sellos del contenedor, daños o faltantes..."
        />
      </div>
    </div>
  );
}
