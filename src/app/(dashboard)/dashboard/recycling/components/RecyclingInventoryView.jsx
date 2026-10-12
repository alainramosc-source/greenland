'use client';
import { Package, DollarSign, ShoppingCart, Send, TrendingUp, Edit3, Sliders, AlertCircle } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function RecyclingInventoryView({
  stockArray,
  totals,
  openAdjustmentModal,
  isAdmin,
}) {
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Stock Total KG */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <Package size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500">KG en Stock</span>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{fmtKg(totals.totalStockKg)}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total en almacén</span>
        </div>

        {/* Valor Estimado */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500">Valor Estimado</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">${fmt(totals.totalEstimatedValue)}</p>
          <span className="text-[10px] text-emerald-700/80 font-semibold block mt-1">Al costo de compra sugerido</span>
        </div>

        {/* Total Invertido */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20">
              <ShoppingCart size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500">Total Invertido</span>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono tracking-tight">${fmt(totals.totalInvested)}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Compras acumuladas</span>
        </div>

        {/* Total Vendido */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <Send size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500">Total Vendido</span>
          </div>
          <p className="text-2xl font-black text-purple-600 font-mono tracking-tight">${fmt(totals.totalSold)}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Ventas acumuladas</span>
        </div>

        {/* Utilidad Bruta */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500">Utilidad Bruta</span>
          </div>
          <p className={`text-2xl font-black font-mono tracking-tight ${totals.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${fmt(totals.grossProfit)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Ventas - COGS</span>
        </div>
      </div>

      {/* Stock Table Container */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" /> Stock Actual por Material
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Control de almacén, kilos comprados, vendidos y saldos</p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-2xl">
            {stockArray.length} Materiales Activos
          </span>
        </div>

        {stockArray.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <Package size={44} className="mx-auto text-slate-300 stroke-[1.5]" />
            <p className="font-bold text-sm">No hay materiales con existencias registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4 text-right">Comprado (KG)</th>
                  <th className="px-6 py-4 text-right">Vendido (KG)</th>
                  <th className="px-6 py-4 text-right">Stock Disponible (KG)</th>
                  <th className="px-6 py-4 text-right">Precio Sugerido / KG</th>
                  <th className="px-6 py-4 text-right">Valor Estimado ($)</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stockArray.map(m => {
                  const stockKg = m.purchased_kg - m.sold_kg;
                  const value = stockKg * Number(m.buy_price_per_kg || 0);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                          {!m.is_active && (
                            <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full">Inactivo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {fmtKg(m.purchased_kg)} kg
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {fmtKg(m.sold_kg)} kg
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-xl ${
                          stockKg > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {fmtKg(stockKg)} kg
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-800 font-bold">
                        ${fmt(m.buy_price_per_kg)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 text-sm">
                        ${fmt(value)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openAdjustmentModal(m)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border-none cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                          title="Ajustar stock de este material"
                        >
                          <Sliders size={13} className="text-emerald-600" /> Ajustar Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
