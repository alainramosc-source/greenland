'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { History, Search, Warehouse, FileDown, User, Calendar, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { todayMX } from '@/utils/formatters';

const PAGE_SIZE = 300;

const shiftDays = (ymd, days) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const buildPresets = () => {
  const today = todayMX();
  const [y, m] = today.split('-').map(Number);
  const firstThis = `${today.slice(0, 7)}-01`;
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const firstPrev = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const lastPrev = shiftDays(firstThis, -1);
  return [
    { key: 'today', label: 'Hoy', from: today, to: today },
    { key: '7d', label: '7 días', from: shiftDays(today, -6), to: today },
    { key: '30d', label: '30 días', from: shiftDays(today, -30), to: today },
    { key: 'month', label: 'Este mes', from: firstThis, to: today },
    { key: 'prev', label: 'Mes pasado', from: firstPrev, to: lastPrev },
    { key: '90d', label: '90 días', from: shiftDays(today, -90), to: today },
  ];
};

const getRowData = (log) => {
  const whMatch = (log.reason || '').match(/\[Bodega:\s*(.+?)\]/);
  const warehouseName = whMatch ? whMatch[1] : (log.warehouse?.name || '');
  const cleanReason = (log.reason || log.notes || '').replace(/\s*\[Bodega:.*?\]/, '').trim();
  const qty = log.quantity_change ?? log.qty_change ?? 0;
  const userName = log.user?.full_name || log.user?.email || log.user_email || 'Sistema';
  return { warehouseName, cleanReason, qty, userName };
};

export default function MovementLogsView({
  logs = [],
  warehouses = [],
  range,
  onRangeChange,
  loading = false,
  truncated = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draftFrom, setDraftFrom] = useState(range?.from || '');
  const [draftTo, setDraftTo] = useState(range?.to || '');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const presets = buildPresets();
  const activePreset = presets.find(p => p.from === range?.from && p.to === range?.to)?.key;

  useEffect(() => {
    setDraftFrom(range?.from || '');
    setDraftTo(range?.to || '');
  }, [range?.from, range?.to]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, logs]);

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const name = (log.product?.name || '').toLowerCase();
    const sku = (log.product?.sku || log.sku || '').toLowerCase();
    const user = (log.user?.full_name || log.user?.email || log.user_email || '').toLowerCase();
    const reason = (log.reason || log.notes || '').toLowerCase();

    return name.includes(query) || sku.includes(query) || user.includes(query) || reason.includes(query);
  });
  const visibleLogs = filteredLogs.slice(0, visibleCount);

  const applyCustomRange = () => {
    if (!draftFrom || !draftTo || !onRangeChange) return;
    onRangeChange({ from: draftFrom, to: draftTo });
  };

  const handleExportExcel = () => {
    const rows = filteredLogs.map(log => {
      const { warehouseName, cleanReason, qty, userName } = getRowData(log);
      const d = new Date(log.created_at);
      return {
        'Fecha': d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }),
        'Hora': d.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }),
        'SKU': log.product?.sku || '',
        'Producto': log.product?.name || '',
        'Cantidad': Number(qty) || 0,
        'Bodega': warehouseName,
        'Motivo': cleanReason,
        'Usuario': userName
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 32 }, { wch: 10 }, { wch: 22 }, { wch: 50 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    const suffix = searchQuery ? '_filtrado' : '';
    XLSX.writeFile(wb, `Movimientos_${range?.from || ''}_a_${range?.to || ''}${suffix}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Date range */}
      {range && onRangeChange && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map(p => (
              <button
                key={p.key}
                id={`logs-preset-${p.key}`}
                onClick={() => onRangeChange({ from: p.from, to: p.to })}
                disabled={loading}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                  activePreset === p.key
                    ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Calendar size={15} className="text-slate-400" />
            <input
              id="logs-date-from"
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
            />
            <span className="text-xs text-slate-400">a</span>
            <input
              id="logs-date-to"
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
            />
            <button
              id="logs-apply-range"
              onClick={applyCustomRange}
              disabled={loading || !draftFrom || !draftTo || (draftFrom === range.from && draftTo === range.to)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : null} Aplicar
            </button>
          </div>
        </div>
      )}

      {truncated && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertTriangle size={14} /> El rango es muy grande y se cortó en 30,000 registros. Usa un rango más corto para ver todo.
        </div>
      )}

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
          <span className="text-sm text-slate-500 font-medium inline-flex items-center gap-1.5">
            {loading && <Loader2 size={14} className="animate-spin text-[#6a9a04]" />}
            {filteredLogs.length.toLocaleString('es-MX')} movimientos
          </span>
          <button
            id="logs-export-excel"
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0 || loading}
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
          <p className="text-sm text-slate-400 mt-1">{loading ? 'Cargando movimientos del rango...' : 'No hay movimientos en el rango seleccionado.'}</p>
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
                {visibleLogs.map((log, idx) => {
                  const { warehouseName: whRaw, cleanReason: reasonRaw, qty, userName } = getRowData(log);
                  const isPositive = qty > 0;
                  const warehouseName = whRaw || '—';
                  const cleanReason = reasonRaw || '—';
                  const dateStr = new Date(log.created_at || Date.now()).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  });
                  const timeStr = new Date(log.created_at || Date.now()).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit'
                  });

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
          {filteredLogs.length > visibleCount && (
            <div className="border-t border-slate-100 p-3 flex items-center justify-center gap-3 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Mostrando {visibleCount.toLocaleString('es-MX')} de {filteredLogs.length.toLocaleString('es-MX')}
              </span>
              <button
                id="logs-show-more"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#6a9a04] bg-white border border-[#6a9a04]/30 hover:bg-[#6a9a04]/5 rounded-xl cursor-pointer transition-all"
              >
                <ChevronDown size={14} /> Ver más movimientos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
