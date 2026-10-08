'use client';

import React, { useState } from 'react';
import { History, Search, Warehouse, FileDown, User } from 'lucide-react';

export default function MovementLogsView({
  logs = [],
  warehouses = []
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const name = (log.product?.name || '').toLowerCase();
    const sku = (log.product?.sku || log.sku || '').toLowerCase();
    const user = (log.user?.full_name || log.user?.email || log.user_email || '').toLowerCase();
    const reason = (log.reason || log.notes || '').toLowerCase();

    return name.includes(query) || sku.includes(query) || user.includes(query) || reason.includes(query);
  });

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Hora', 'SKU', 'Producto', 'Cantidad', 'Bodega', 'Motivo', 'Usuario'];
    const rows = filteredLogs.map(log => {
      const whMatch = (log.reason || '').match(/\[Bodega:\s*(.+?)\]/);
      const warehouseName = whMatch ? whMatch[1] : (log.warehouse?.name || '');
      const cleanReason = (log.reason || '').replace(/\s*\[Bodega:.*?\]/, '').trim();
      return [
        new Date(log.created_at).toLocaleDateString('es-MX'),
        new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        log.product?.sku || '',
        log.product?.name || '',
        log.quantity_change ?? log.qty_change ?? 0,
        warehouseName,
        cleanReason,
        log.user?.full_name || log.user?.email || ''
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por producto, SKU, motivo, usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-sm text-slate-500 font-medium">{filteredLogs.length} movimientos</span>
          <button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#6a9a04]/20 border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Movement Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
          <History size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-bold text-slate-400">Sin movimientos</p>
          <p className="text-sm text-slate-400 mt-1">Los ajustes manuales, salidas y pedidos aparecerán aquí.</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Cantidad</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Bodega</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Motivo</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log, idx) => {
                  const qty = log.quantity_change ?? log.qty_change ?? 0;
                  const isPositive = qty > 0;
                  const whMatch = (log.reason || '').match(/\[Bodega:\s*(.+?)\]/);
                  const warehouseName = whMatch ? whMatch[1] : (log.warehouse?.name || '—');
                  const cleanReason = (log.reason || '—').replace(/\s*\[Bodega:.*?\]/, '').trim();
                  const dateStr = new Date(log.created_at || Date.now()).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  });
                  const timeStr = new Date(log.created_at || Date.now()).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit'
                  });
                  const userName = log.user?.full_name || log.user?.email || log.user_email || 'Sistema';

                  return (
                    <tr key={log.id || idx} className="hover:bg-white/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap min-w-[120px]">
                        <p className="text-sm font-medium text-slate-800 m-0 whitespace-nowrap">{dateStr}</p>
                        <p className="text-[10px] text-slate-400 m-0 whitespace-nowrap">{timeStr}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800 m-0">{log.product?.name || '—'}</p>
                        <p className="text-[10px] font-mono text-[#6a9a04] font-bold m-0">{log.product?.sku || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-black ${
                          isPositive
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : qty < 0
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>
                          {isPositive ? '+' : ''}{qty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                          <Warehouse size={12} className="text-slate-400" />
                          {warehouseName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 m-0 max-w-[260px] truncate" title={cleanReason}>{cleanReason}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          {userName}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
