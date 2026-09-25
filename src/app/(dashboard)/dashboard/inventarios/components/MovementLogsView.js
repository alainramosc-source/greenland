'use client';

import React, { useState } from 'react';
import { History, Search, Calendar, User, ArrowRightLeft, Sliders, ShoppingBag, Package, Filter, Download } from 'lucide-react';

export default function MovementLogsView({
  logs = [],
  warehouses = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const sku = (log.sku || '').toLowerCase();
    const user = (log.user_email || log.created_by || '').toLowerCase();
    const notes = (log.notes || log.reason || '').toLowerCase();
    const type = (log.action_type || log.type || '').toLowerCase();

    const matchesQuery = sku.includes(query) || user.includes(query) || notes.includes(query);
    const matchesType = typeFilter === 'ALL' || type.toUpperCase() === typeFilter.toUpperCase();

    return matchesQuery && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en historial por SKU, usuario o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="ALL">Todos los Movimientos</option>
            <option value="AJUSTE">Ajustes Manuales</option>
            <option value="TRANSFERENCIA">Transferencias</option>
            <option value="VENTA">Ventas PRO</option>
            <option value="CONTEO">Ajustes por Conteo</option>
          </select>
        </div>
      </div>

      {/* Movement Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Fecha y Hora</th>
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Bodega</th>
                <th className="p-3.5 text-center">Cambio Cant.</th>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron registros de movimientos de inventario.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const type = (log.action_type || log.type || 'AJUSTE').toUpperCase();
                  const isTransfer = type.includes('TRANSFER');
                  const isSale = type.includes('VENTA') || type.includes('SALE');
                  const qtyChange = log.qty_change ?? log.cantidad ?? 0;
                  const isPositive = qtyChange > 0;

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(log.created_at || Date.now()).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5">
                        {isTransfer ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                            <ArrowRightLeft className="w-3 h-3" /> Transferencia
                          </span>
                        ) : isSale ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            <ShoppingBag className="w-3 h-3" /> Venta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                            <Sliders className="w-3 h-3" /> {type}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {log.sku}
                      </td>
                      <td className="p-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {log.warehouse_name || log.warehouses?.name || log.warehouse_id || 'N/A'}
                      </td>
                      <td className={`p-3.5 text-center font-bold text-xs ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isPositive ? `+${qtyChange}` : qtyChange}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {log.user_email || log.created_by || 'Sistema'}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {log.notes || log.reason || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
