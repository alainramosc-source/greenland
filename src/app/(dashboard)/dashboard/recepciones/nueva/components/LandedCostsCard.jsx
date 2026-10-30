'use client';
import { DollarSign, Truck } from 'lucide-react';

export default function LandedCostsCard({
  form,
  setForm,
  totalAdditionalCosts,
  isCompleted,
  isAuthorized,
}) {
  const fields = [
    { key: 'freight_maritime', label: 'Flete Marítimo (USD)', isUsd: true },
    {
      key: 'freight_national',
      label: 'Flete Nacional (MXN)',
      hint: form.freight_external
        ? `Transportista externo${form.freight_external_carrier ? ` (${form.freight_external_carrier})` : ''}: no se crea orden de flete`
        : 'Se crea orden de flete única para el tractor',
    },
    { key: 'import_taxes', label: 'Impuestos Importación (MXN)' },
    { key: 'port_handling', label: 'Maniobras en Puerto (MXN)' },
    { key: 'customs_broker', label: 'Despacho Aduanal (MXN)' },
    { key: 'other_costs', label: 'Otros Costos (MXN)' },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-7 mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-2">
        <h3 className="text-lg font-black text-slate-900 m-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6a9a04]/10 text-[#6a9a04] flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
          <span>Costos de Importación y Logística (Landed)</span>
        </h3>
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          💡 Estos costos se prorratean de forma unificada entre todos los productos del cargamento
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {fields.map(({ key, label, isUsd, hint }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700">{label}</label>
              {isUsd && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">USD</span>}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form[key] || ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                onFocus={(e) => e.target.select()}
                disabled={isCompleted && !isAuthorized}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm text-right font-bold disabled:opacity-60"
              />
            </div>
            {hint && <p className="text-[10px] text-slate-400 mt-1 m-0">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Flete con transportista externo / no frecuente */}
      <div className={`mt-4 p-4 rounded-2xl border transition-colors ${form.freight_external ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/70 border-slate-200'}`}>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            id="freight-external-toggle"
            type="checkbox"
            checked={!!form.freight_external}
            onChange={(e) => setForm((f) => ({ ...f, freight_external: e.target.checked }))}
            disabled={isCompleted && !isAuthorized}
            className="mt-0.5 w-4 h-4 accent-[#6a9a04] cursor-pointer"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Truck size={15} className={form.freight_external ? 'text-amber-600' : 'text-slate-400'} />
              Flete nacional con transportista externo (no generar orden de flete)
            </span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              Úsalo cuando el traslado lo hace un transportista no frecuente (ej. traslado local en Altamira). El monto del flete se sigue sumando al costo aterrizado; sube su factura en Documentos.
            </span>
          </span>
        </label>

        {form.freight_external && (
          <div className="mt-3 sm:pl-7">
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del transportista *</label>
            <input
              id="freight-external-carrier"
              type="text"
              value={form.freight_external_carrier || ''}
              onChange={(e) => setForm((f) => ({ ...f, freight_external_carrier: e.target.value }))}
              disabled={isCompleted && !isAuthorized}
              placeholder="Ej: Transportes del Golfo"
              className="w-full sm:max-w-md px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-300/40 shadow-sm disabled:opacity-60"
            />
          </div>
        )}
      </div>

      {/* Description for other costs */}
      {form.other_costs && Number(form.other_costs) > 0 && (
        <div className="mt-3">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción de otros costos</label>
          <input
            type="text"
            value={form.other_costs_description || ''}
            onChange={(e) => setForm((f) => ({ ...f, other_costs_description: e.target.value }))}
            disabled={isCompleted && !isAuthorized}
            placeholder="Ej: Almacenajes portuarios extra, fumigación, seguro de mercancía..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
          />
        </div>
      )}

      {/* Exchange rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">TC Mercancía (USD→MXN)</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={form.exchange_rate_goods || ''}
            onChange={(e) => setForm((f) => ({ ...f, exchange_rate_goods: e.target.value }))}
            onFocus={(e) => e.target.select()}
            placeholder="Ej: 18.25"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm font-mono font-bold disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">TC Flete Marítimo (USD→MXN)</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={form.exchange_rate_freight || ''}
            onChange={(e) => setForm((f) => ({ ...f, exchange_rate_freight: e.target.value }))}
            onFocus={(e) => e.target.select()}
            placeholder="Ej: 18.50"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm font-mono font-bold disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-400">Total acumulado de fletes, impuestos y maniobras:</span>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-bold uppercase mr-2">Total Costos Adicionales:</span>
          <span className="text-xl font-black text-slate-900">
            ${totalAdditionalCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>
      </div>
    </div>
  );
}
