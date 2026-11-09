'use client';
import React from 'react';
import { BarChart3, FileSpreadsheet, Search, ChevronUp, ChevronDown } from 'lucide-react';

export default function DistributorMonthlyMatrix({
    distributorMatrixData,
    filteredMatrixRows,
    matrixMetric,
    setMatrixMetric,
    matrixRange,
    setMatrixRange,
    includeCurrentMonth,
    setIncludeCurrentMonth,
    distSearch,
    setDistSearch,
    distTrendFilter,
    setDistTrendFilter,
    expandedDistId,
    setExpandedDistId,
    onExportXLSX,
    fmt
}) {
    return (
        <div className="bg-white/70 backdrop-blur-md border border-white/60 shadow-sm rounded-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-xl">
                            <BarChart3 className="w-5 h-5" />
                        </span>
                        <div>
                            <h4 className="text-lg font-black text-slate-900 m-0">
                                Rendimiento Mensual de Distribuidores
                            </h4>
                            <p className="text-xs text-slate-500 m-0 mt-0.5">
                                Evolución mes a mes ({distributorMatrixData.numClosedMonths} meses cerrados{includeCurrentMonth ? ' + mes en curso' : ''}). Haz clic en un distribuidor para ver su mix de productos.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Period / Year Range Selector */}
                    <select
                        value={matrixRange}
                        onChange={e => setMatrixRange(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 cursor-pointer"
                        title="Seleccionar rango de meses a visualizar"
                    >
                        {(distributorMatrixData.availableYears || ['2026']).map(yr => (
                            <option key={yr} value={yr}>📅 Año {yr}</option>
                        ))}
                        <option value="last6">⏱️ Últimos 6 meses</option>
                        <option value="last12">📆 Últimos 12 meses</option>
                        <option value="all">🗂️ Todo el historial</option>
                    </select>

                    {/* Metric Toggle */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl">
                        {[
                            { id: 'revenue', label: '💰 Monto ($)' },
                            { id: 'units', label: '📦 Unidades' },
                            { id: 'orders', label: '🧾 Pedidos' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setMatrixMetric(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                                    matrixMetric === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'bg-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Include Current Month Toggle */}
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeCurrentMonth}
                            onChange={e => setIncludeCurrentMonth(e.target.checked)}
                            className="accent-[#6a9a04] rounded cursor-pointer"
                        />
                        <span>Incluir mes en curso</span>
                    </label>

                    {/* Excel Export */}
                    <button
                        type="button"
                        onClick={onExportXLSX}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                        title="Descargar Sábana Mensual en Excel (Ingresos, Unidades y Pedidos)"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exportar Sábana Excel</span>
                    </button>
                </div>
            </div>

            {/* Quick Status Summary Pills & Search Filter */}
            <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { id: 'all', label: `Todos (${distributorMatrixData.rows.length})`, cls: 'bg-slate-800 text-white' },
                        { id: 'growing', label: `🚀 Creciendo (${distributorMatrixData.rows.filter(r => r.trend === 'growing').length})`, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                        { id: 'stable', label: `➖ Estables (${distributorMatrixData.rows.filter(r => r.trend === 'stable').length})`, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                        { id: 'cooling', label: `📉 Enfriándose (${distributorMatrixData.rows.filter(r => r.trend === 'cooling').length})`, cls: 'bg-amber-100 text-amber-800 border-amber-200' },
                        { id: 'inactive', label: `⚠️ Inactivos +45d (${distributorMatrixData.rows.filter(r => r.trend === 'inactive').length})`, cls: 'bg-rose-100 text-rose-800 border-rose-200' },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            type="button"
                            onClick={() => setDistTrendFilter(pill.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                                distTrendFilter === pill.id
                                    ? 'ring-2 ring-[#6a9a04] shadow-sm ' + pill.cls
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={distSearch}
                        onChange={e => setDistSearch(e.target.value)}
                        placeholder="Buscar distribuidor o ciudad..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30"
                    />
                </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="py-3 pl-5 pr-3 sticky left-0 bg-slate-100 z-10 min-w-[210px]">Distribuidor</th>
                            {distributorMatrixData.visibleMonthCols.map(c => (
                                <th key={c.key} className={`px-2.5 py-3 text-right min-w-[88px] ${c.isCurrent ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : ''}`}>
                                    <div>{distributorMatrixData.spansMultipleYears ? c.fullLabel : c.label}</div>
                                    {c.isCurrent && <div className="text-[8px] font-semibold normal-case opacity-80">En curso</div>}
                                </th>
                            ))}
                            <th className="px-3 py-3 text-right bg-slate-200/50 text-slate-800 min-w-[105px]">Total</th>
                            <th className="px-3 py-3 text-right min-w-[95px]" title={`Promedio sobre los ${distributorMatrixData.numClosedMonths} meses cerrados del periodo`}>
                                Prom / Mes
                            </th>
                            <th className="px-3 py-3 text-center min-w-[90px]" title="Meses con al menos 1 pedido dentro de los meses cerrados del periodo">
                                Consistencia
                            </th>
                            <th className="px-3 py-3 text-center min-w-[115px]" title="Comparativa últimos 2 meses cerrados vs promedio previo">
                                Tendencia
                            </th>
                            <th className="px-4 py-3 text-right min-w-[90px]">Últ. Pedido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredMatrixRows.length > 0 ? filteredMatrixRows.map((row) => {
                            const isExpanded = expandedDistId === row.id;
                            const rowTotal = matrixMetric === 'revenue' ? row.totalRev : matrixMetric === 'units' ? row.totalUnits : row.totalOrders;
                            const rowAvg = matrixMetric === 'revenue' ? row.avgMonthlyRev : matrixMetric === 'units' ? row.avgMonthlyUnits : row.avgMonthlyOrders;
                            const rowActiveAvg = row.activeClosedMonths > 0
                                ? (matrixMetric === 'revenue' ? row.closedRev : matrixMetric === 'units' ? row.closedUnits : row.closedOrders) / row.activeClosedMonths
                                : 0;

                            const formatCell = (val) => {
                                if (!val || val <= 0) return '—';
                                if (matrixMetric === 'revenue') {
                                    return '$' + Math.round(val).toLocaleString('es-MX');
                                }
                                return val.toLocaleString('es-MX');
                            };

                            return (
                                <React.Fragment key={row.id}>
                                    <tr
                                        onClick={() => setExpandedDistId(isExpanded ? null : row.id)}
                                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${isExpanded ? 'bg-[#6a9a04]/5' : ''}`}
                                    >
                                        <td className="py-3 pl-5 pr-3 sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-100">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                                        <span>{row.name}</span>
                                                        {row.clientNumber && (
                                                            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                                {row.clientNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">{row.city}</div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                            </div>
                                        </td>

                                        {distributorMatrixData.visibleMonthCols.map(c => {
                                            const mData = row.months[c.key] || { revenue: 0, units: 0, orders: 0 };
                                            const val = mData[matrixMetric] || 0;
                                            let cellBg = '';
                                            let textCls = 'text-slate-300';

                                            if (val > 0) {
                                                const ratio = rowActiveAvg > 0 ? val / rowActiveAvg : 1;
                                                if (ratio >= 1.2) {
                                                    cellBg = 'rgba(106, 154, 4, 0.18)';
                                                    textCls = 'text-[#4d7003] font-black';
                                                } else if (ratio >= 0.7) {
                                                    cellBg = 'rgba(106, 154, 4, 0.08)';
                                                    textCls = 'text-slate-800 font-bold';
                                                } else {
                                                    cellBg = 'rgba(245, 158, 11, 0.10)';
                                                    textCls = 'text-amber-800 font-semibold';
                                                }
                                            }

                                            return (
                                                <td
                                                    key={c.key}
                                                    className={`px-2.5 py-3 text-right font-mono text-[11px] ${textCls} ${c.isCurrent ? 'border-l border-dashed border-[#6a9a04]/30' : ''}`}
                                                    style={cellBg ? { backgroundColor: cellBg } : undefined}
                                                    title={`${c.label}: ${fmt(mData.revenue)} • ${mData.units} pzas • ${mData.orders} ped.`}
                                                >
                                                    {formatCell(val)}
                                                </td>
                                            );
                                        })}

                                        <td className="px-3 py-3 text-right font-black text-slate-900 bg-slate-50/80 font-mono text-xs">
                                            {matrixMetric === 'revenue' ? fmt(rowTotal) : rowTotal.toLocaleString('es-MX')}
                                        </td>

                                        <td className="px-3 py-3 text-right font-bold text-slate-600 font-mono text-[11px]">
                                            {matrixMetric === 'revenue'
                                                ? '$' + Math.round(rowAvg).toLocaleString('es-MX')
                                                : rowAvg.toFixed(1)}
                                        </td>

                                        <td className="px-3 py-3 text-center">
                                            <div className="inline-flex flex-col items-center gap-1">
                                                <span className="text-[11px] font-bold text-slate-700">
                                                    {row.activeClosedMonths}/{row.numClosedMonths} m
                                                </span>
                                                <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-[#6a9a04]"
                                                        style={{ width: `${(row.activeClosedMonths / row.numClosedMonths) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-3 text-center">
                                            {row.trend === 'growing' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    🚀 {row.trendPct > 0 ? `+${row.trendPct}%` : 'Creciendo'}
                                                </span>
                                            )}
                                            {row.trend === 'stable' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    ➖ Estable
                                                </span>
                                            )}
                                            {row.trend === 'cooling' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    📉 {row.trendPct}%
                                                </span>
                                            )}
                                            {row.trend === 'inactive' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    ⚠️ Inactivo
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            {row.daysSinceLastOrder === null ? (
                                                <span className="text-[10px] text-slate-400 italic">Sin pedidos</span>
                                            ) : (
                                                <span className={`text-[11px] font-bold ${
                                                    row.daysSinceLastOrder > 45
                                                        ? 'text-rose-600'
                                                        : row.daysSinceLastOrder > 25
                                                            ? 'text-amber-600'
                                                            : 'text-emerald-600'
                                                }`}>
                                                    {row.daysSinceLastOrder === 0 ? 'Hoy' : `hace ${row.daysSinceLastOrder}d`}
                                                </span>
                                            )}
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="bg-slate-50/90 border-b border-slate-200">
                                            <td colSpan={distributorMatrixData.visibleMonthCols.length + 6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Mejor Mes</p>
                                                            <p className="text-sm font-black text-slate-900 m-0 mt-1">
                                                                {row.bestMonth.label} — <span className="text-[#6a9a04]">{fmt(row.bestMonth.revenue)}</span>
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 m-0">{row.bestMonth.orders} pedidos • {row.bestMonth.units} pzas</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ticket Promedio</p>
                                                            <p className="text-sm font-black text-slate-900 m-0 mt-1">{fmt(row.avgTicket)}</p>
                                                            <p className="text-[10px] text-slate-400 m-0">{row.totalOrders} pedidos totales • {row.totalUnits} pzas</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Prom. en Meses Activos</p>
                                                            <p className="text-sm font-black text-slate-900 m-0 mt-1">{fmt(row.avgActiveMonthRev)}</p>
                                                            <p className="text-[10px] text-slate-400 m-0">Meses con compra ({row.activeClosedMonths} de {row.numClosedMonths})</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Última Compra</p>
                                                            <p className="text-sm font-black text-slate-900 m-0 mt-1">
                                                                {row.lastOrderDate ? row.lastOrderDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 m-0">
                                                                {row.daysSinceLastOrder !== null ? `Hace ${row.daysSinceLastOrder} días` : 'Nunca ha pedido'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="lg:col-span-2 bg-white rounded-xl p-3.5 border border-slate-200/80">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0 mb-2.5">
                                                            🪑 Top 5 Productos que más compra {row.name}
                                                        </p>
                                                        {row.topSkus.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                                                {row.topSkus.map((skuItem, idx) => (
                                                                    <div key={idx} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-mono text-[10px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded">
                                                                                {skuItem.sku}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-slate-700">{skuItem.qty} pzas</span>
                                                                        </div>
                                                                        <p className="text-[11px] font-semibold text-slate-800 truncate m-0 mt-1" title={skuItem.name}>
                                                                            {skuItem.name}
                                                                        </p>
                                                                        <p className="text-[10px] font-bold text-slate-500 m-0 mt-0.5">
                                                                            {fmt(skuItem.rev)}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic m-0">Sin productos registrados</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        }) : (
                            <tr>
                                <td colSpan={distributorMatrixData.visibleMonthCols.length + 6} className="py-10 text-center text-slate-400 text-sm">
                                    No se encontraron distribuidores con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>

                    <tfoot className="bg-slate-900 text-white text-xs font-bold">
                        <tr>
                            <td className="py-3.5 pl-5 pr-3 sticky left-0 bg-slate-900 z-10">
                                <div>TOTAL MENSUAL</div>
                                <div className="text-[9px] font-normal text-slate-400">Distribuidores activos por mes</div>
                            </td>
                            {distributorMatrixData.visibleMonthCols.map(c => {
                                const mTot = distributorMatrixData.monthTotals[c.key] || { revenue: 0, units: 0, orders: 0, activeDists: 0 };
                                const val = mTot[matrixMetric] || 0;
                                return (
                                    <td key={c.key} className="px-2.5 py-3.5 text-right font-mono">
                                        <div>
                                            {matrixMetric === 'revenue'
                                                ? '$' + Math.round(val).toLocaleString('es-MX')
                                                : val.toLocaleString('es-MX')}
                                        </div>
                                        <div className="text-[9px] font-normal text-lime-400">
                                            {mTot.activeDists} dist.
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="px-3 py-3.5 text-right font-mono text-lime-400 text-xs">
                                {matrixMetric === 'revenue'
                                    ? fmt(distributorMatrixData.grandTotals.revenue)
                                    : distributorMatrixData.grandTotals[matrixMetric].toLocaleString('es-MX')}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono text-slate-300 text-[11px]">
                                {matrixMetric === 'revenue'
                                    ? '$' + Math.round(distributorMatrixData.grandTotals.closedRev / distributorMatrixData.numClosedMonths).toLocaleString('es-MX')
                                    : (distributorMatrixData.grandTotals[matrixMetric === 'units' ? 'closedUnits' : 'closedOrders'] / distributorMatrixData.numClosedMonths).toFixed(1)}
                            </td>
                            <td colSpan={3} className="px-4 py-3.5 text-right text-[10px] font-normal text-slate-400">
                                Promedio mensual calculado sobre {distributorMatrixData.numClosedMonths} meses cerrados del periodo
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
