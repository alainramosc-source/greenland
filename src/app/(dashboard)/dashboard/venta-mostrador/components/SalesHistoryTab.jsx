'use client';
import React from 'react';
import {
  Search, Receipt, Calendar, User, Warehouse, ChevronDown, ChevronUp, RotateCcw, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function SalesHistoryTab({
  salesHistory = [],
  historialLoading,
  historialSearch,
  setHistorialSearch,
  expandedSale,
  setExpandedSale,
  hasMoreHistory,
  loadingMore,
  fetchHistorial,
  handleOpenReturnModal,
  handleLoadReturnedItemsToCart,
  shortName
}) {
  const filteredHistory = salesHistory.filter(s => {
    if (!historialSearch.trim()) return true;
    const term = historialSearch.toLowerCase();
    return (
      (s.sale_number || '').toLowerCase().includes(term) ||
      (s.customer_name || '').toLowerCase().includes(term) ||
      (s.seller?.full_name || '').toLowerCase().includes(term) ||
      (s.notes || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-[#6a9a04]" />
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Historial de Ventas Mostrador
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-black">
            {filteredHistory.length} registros
          </span>
        </div>

        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, vendedor..."
            value={historialSearch}
            onChange={(e) => setHistorialSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
          />
        </div>
      </div>

      {/* History Table */}
      {historialLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-[#6a9a04]" />
          <span>Cargando historial de ventas...</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No se encontraron ventas registradas.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map(sale => {
            const isExpanded = expandedSale === sale.id;
            const isCancelled = sale.status === 'cancelled';

            return (
              <div
                key={sale.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCancelled
                    ? 'bg-red-50/50 border-red-200'
                    : isExpanded
                    ? 'bg-white border-[#6a9a04] shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Row Summary */}
                <div
                  onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCancelled ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isCancelled ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">#{sale.sale_number}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isCancelled ? 'DEVOLUCIÓN / CANCELADA' : 'COMPLETADA'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {sale.payment_method}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span>Cliente: <strong>{sale.customer_name || 'Público General'}</strong></span>
                        <span>•</span>
                        <span>Vendedor: {shortName(sale.seller?.full_name || 'Admin')}</span>
                        <span>•</span>
                        <span>{formatDateOnly(sale.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                      <p className={`text-base font-black ${isCancelled ? 'text-red-600 line-through' : 'text-[#6a9a04]'}`}>
                        ${Number(sale.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {(sale.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} items
                      </p>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-4 animate-fade-in text-xs">
                    {/* Items Table */}
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2">Desglose de Productos:</h4>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {(sale.items || []).map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{item.name || item.sku}</p>
                              <p className="text-[10px] text-slate-400">SKU: {item.sku} • Cant: {item.quantity} x ${Number(item.unit_price).toFixed(2)}</p>
                            </div>
                            <span className="font-black text-slate-900">
                              ${Number(item.subtotal || (item.quantity * item.unit_price)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {sale.notes && (
                      <p className="text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                        <strong>Notas:</strong> {sale.notes}
                      </p>
                    )}

                    {isCancelled && sale.cancel_reason && (
                      <div className="p-3 rounded-xl bg-red-100/70 border border-red-200 text-red-800 space-y-1">
                        <p><strong>Motivo Devolución:</strong> {sale.cancel_reason}</p>
                        {sale.approver && <p><strong>Autorizó:</strong> {sale.approver.full_name}</p>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(sale)}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 border border-red-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>Procesar Devolución</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleLoadReturnedItemsToCart(sale)}
                        className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                        title="Cargar estos mismos productos al carrito de venta"
                      >
                        <Receipt size={14} />
                        <span>🛒 Cargar Items al Carrito</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMoreHistory && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => fetchHistorial(true)}
                disabled={loadingMore}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Cargar más ventas</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
