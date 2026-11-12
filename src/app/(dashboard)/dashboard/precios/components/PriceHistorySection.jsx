'use client';
import React from 'react';
import { History, ChevronUp, ChevronDown } from 'lucide-react';

export default function PriceHistorySection({
  priceHistory,
  products,
  showHistory,
  setShowHistory,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full px-5 py-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-slate-50/70 transition-colors"
      >
        <h4 className="font-black text-slate-900 m-0 flex items-center gap-2.5 text-sm">
          <span className="p-1.5 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04]">
            <History className="w-4 h-4" />
          </span>
          Historial de Cambios de Precio
          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
            {priceHistory.length}
          </span>
        </h4>
        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {showHistory && (
        <div className="border-t border-slate-200/80">
          {priceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Precio Anterior</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">→</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Precio Nuevo</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cambio</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priceHistory.map(h => {
                    const product = products.find(p => p.id === h.product_id);
                    const diff = (h.new_price || 0) - (h.old_price || 0);
                    const pct = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '—';
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-2.5">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{product?.name || 'Producto eliminado'}</span>
                          <span className="text-[10px] text-[#6a9a04] font-bold ml-2 font-mono">{product?.sku || ''}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs sm:text-sm font-bold text-slate-500 font-mono">
                          ${Number(h.old_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-300">→</td>
                        <td className="px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 font-mono">
                          ${Number(h.new_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            diff > 0 ? 'bg-emerald-50 text-emerald-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{pct}%
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right text-[11px] text-slate-400 font-medium">
                          {new Date(h.changed_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No hay cambios de precios registrados aún. Los cambios se registrarán automáticamente al guardar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
