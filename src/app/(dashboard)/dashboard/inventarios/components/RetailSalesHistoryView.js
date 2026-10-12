'use client';

import React, { useMemo } from 'react';
import {
  ShoppingBag,
  Package,
  DollarSign,
  TrendingUp,
  Search,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function RetailSalesHistoryView({
  sales = [],
  searchFilter = '',
  setSearchFilter,
  onNewSale,
  isPro = false,
  loading = false
}) {
  // Filter sales based on search term
  const filteredSales = useMemo(() => {
    if (!searchFilter.trim()) return sales;
    const q = searchFilter.toLowerCase().trim();

    return sales.filter(sale => {
      const matchOrder = (sale.order_number || '').toLowerCase().includes(q);
      const matchNotes = (sale.notes || '').toLowerCase().includes(q);
      const matchCustomer = (sale.customer_name || '').toLowerCase().includes(q);
      const matchWh = (sale.warehouse_name || '').toLowerCase().includes(q);

      const items = Array.isArray(sale.items) ? sale.items : [];
      const matchItems = items.some(item =>
        (item.sku || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q)
      );

      return matchOrder || matchNotes || matchCustomer || matchWh || matchItems;
    });
  }, [sales, searchFilter]);

  // Aggregate KPIs
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    let totalPieces = 0;
    let totalRevenue = 0;

    filteredSales.forEach(sale => {
      totalRevenue += Number(sale.total || 0);
      const items = Array.isArray(sale.items) ? sale.items : [];
      items.forEach(i => {
        totalPieces += Number(i.quantity || i.qty || 0);
      });
    });

    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

    return { totalCount, totalPieces, totalRevenue, avgTicket };
  }, [filteredSales]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Ventas Registradas</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats.totalCount}
            </p>
            <span className="text-[11px] text-slate-400">transacciones</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Piezas Vendidas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Unidades Vendidas</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats.totalPieces.toLocaleString('es-MX')}
            </p>
            <span className="text-[11px] text-slate-400">piezas entregadas</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Ingresos Totales */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Ingresos Totales (Ventas)</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400">MXN recaudado</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Ticket Promedio</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              ${stats.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400">por operación</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio (#VP-...), cliente, SKU, producto o notas..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          {onNewSale && (
            <button
              onClick={onNewSale}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Registrar Venta PRO
            </button>
          )}
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Orden / Folio</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Fecha y Hora</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Productos Vendidos</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Total ($)</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Pago</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Estado</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Bodega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      {searchFilter ? 'No se encontraron ventas con ese criterio' : 'No hay ventas a público registradas aún'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchFilter ? 'Prueba con otra palabra clave o limpia el filtro.' : 'Cuando registres ventas de tus contenedores aparecerán listadas aquí con su folio y desglose.'}
                    </p>
                    {!searchFilter && onNewSale && (
                      <button
                        onClick={onNewSale}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar Primera Venta
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const items = Array.isArray(sale.items) ? sale.items : [];
                  const isPaid = sale.payment_status === 'paid';
                  const dateObj = new Date(sale.created_at);

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Folio & Client */}
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          #{sale.order_number}
                        </span>
                        {sale.customer_name && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{sale.customer_name}</span>
                          </div>
                        )}
                        {sale.notes && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]" title={sale.notes}>
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>{sale.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <p className="text-[11px] text-slate-400 m-0">
                          {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                        </p>
                      </td>

                      {/* Products Breakdown */}
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 max-w-md">
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800"
                            >
                              <div className="truncate">
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mr-1.5">
                                  {item.quantity || item.qty}x
                                </span>
                                <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1.5">
                                  {item.sku}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                                ${(Number(item.sale_price || item.price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                              </span>
                            </div>
                          ))}
                          {items.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Sin detalle de artículos</span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                          ${Number(sale.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 m-0">MXN</p>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>

                      {/* Order Status */}
                      <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${
                            sale.status === 'confirmed' || sale.status === 'delivered'
                              ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              : sale.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                        >
                          {sale.status === 'confirmed' ? 'Mostrador' : sale.status === 'delivered' ? 'Entregado' : sale.status || 'Registrado'}
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{sale.warehouse_name || 'Bodega'}</span>
                        </div>
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
