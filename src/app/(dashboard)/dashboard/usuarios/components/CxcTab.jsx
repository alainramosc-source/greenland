'use client';
import React from 'react';
import { Search, DollarSign, TrendingUp, CreditCard, Download, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function CxcTab({
  cxcData = [],
  cxcLoading = false,
  cxcSearch = '',
  setCxcSearch,
  cxcSort = { key: 'balance', dir: 'desc' },
  setCxcSort,
  filteredCxc = [],
  totalGlobalFacturado = 0,
  totalGlobalPagado = 0,
  totalGlobalBalance = 0,
  exportingReport = null,
  exportDistributorReport,
  getInitials
}) {
  const handleSortChange = (key) => {
    if (cxcSort.key === key) {
      setCxcSort({ key, dir: cxcSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setCxcSort({ key, dir: 'desc' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Facturado */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 m-0">Total Facturado</p>
            <h3 className="text-2xl font-black text-slate-900 m-0 mt-1">
              {formatCurrency(totalGlobalFacturado)}
            </h3>
            <p className="text-[11px] text-slate-400 m-0 mt-0.5">Ventas y cargos a distribuidores</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Total Pagado */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 m-0">Total Recaudado</p>
            <h3 className="text-2xl font-black text-green-700 m-0 mt-1">
              {formatCurrency(totalGlobalPagado)}
            </h3>
            <p className="text-[11px] text-slate-400 m-0 mt-0.5">Pagos recibidos y liquidados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold shadow-sm">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Saldo Pendiente CxC */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 backdrop-blur-md p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 m-0">Saldo Pendiente por Cobrar</p>
            <h3 className="text-2xl font-black text-amber-900 m-0 mt-1">
              {formatCurrency(totalGlobalBalance)}
            </h3>
            <p className="text-[11px] text-amber-700/80 m-0 mt-0.5">Cuentas Por Cobrar (CxC)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente, empresa, ciudad o folio de distribuidor..."
            value={cxcSearch}
            onChange={(e) => setCxcSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] transition-all"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Ordenar por:</span>
          <select
            value={`${cxcSort.key}-${cxcSort.dir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split('-');
              setCxcSort({ key, dir });
            }}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/20 transition-all"
          >
            <option value="balance-desc">Mayor Saldo Pendiente</option>
            <option value="balance-asc">Menor Saldo Pendiente</option>
            <option value="totalFacturado-desc">Mayor Total Facturado</option>
            <option value="totalPagado-desc">Mayor Total Pagado</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Distribuidor / Cliente</th>
                <th className="px-4 py-3">Empresa / Ciudad</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSortChange('totalFacturado')}>
                  <div className="flex items-center gap-1">
                    Total Facturado
                    {cxcSort.key === 'totalFacturado' && (
                      cxcSort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSortChange('totalPagado')}>
                  <div className="flex items-center gap-1">
                    Total Pagado
                    {cxcSort.key === 'totalPagado' && (
                      cxcSort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSortChange('balance')}>
                  <div className="flex items-center gap-1">
                    Saldo Pendiente
                    {cxcSort.key === 'balance' && (
                      cxcSort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cxcLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Calculando estado financiero y saldos de cuentas por cobrar...
                  </td>
                </tr>
              ) : filteredCxc.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No se encontraron clientes distribuidor en el registro CxC.
                  </td>
                </tr>
              ) : (
                filteredCxc.map((dist) => {
                  const isPending = dist.balance > 0.01;

                  return (
                    <tr key={dist.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Customer Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6a9a04] to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                            {getInitials(dist)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 m-0">{dist.full_name || 'Sin Nombre'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-slate-500 text-[11px] m-0">{dist.email}</span>
                              {dist.client_number && (
                                <span className="font-mono text-[10px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.2 rounded border border-[#6a9a04]/20">
                                  #{dist.client_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company & City */}
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800 m-0">{dist.company_name || '—'}</p>
                        <p className="text-slate-400 text-[11px] m-0">{dist.city || 'Sin ciudad'}</p>
                      </td>

                      {/* Total Facturado */}
                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {formatCurrency(dist.totalFacturado)}
                      </td>

                      {/* Total Pagado */}
                      <td className="px-4 py-4 font-semibold text-green-700">
                        {formatCurrency(dist.totalPagado)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-green-100 text-green-800 border border-green-300'
                        }`}>
                          {formatCurrency(dist.balance)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => exportDistributorReport(dist)}
                          disabled={exportingReport === dist.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200/80 text-xs flex items-center gap-1.5 ml-auto cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {exportingReport === dist.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-[#6a9a04]" />
                              <span>Generando...</span>
                            </>
                          ) : (
                            <>
                              <Download size={13} />
                              <span>Reporte CxC</span>
                            </>
                          )}
                        </button>
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
