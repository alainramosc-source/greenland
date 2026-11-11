'use client';
import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart, DollarSign, Clock, TrendingUp, Download,
  Eye, Plus, Trash2, Printer, AlertTriangle
} from 'lucide-react';
import { OP_STATUS, PAY_STATUS } from '@/hooks/usePedidos';

const STATUS_PILLS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'in_fulfillment', label: 'En Surtido' },
  { id: 'shipped', label: 'Enviados' },
  { id: 'closed', label: 'Cerrados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'rejected', label: 'Rechazados' },
];

export default function DistributorOrdersTab({
  isAdmin,
  orders,
  filteredOrders,
  loading,
  statusFilter,
  setStatusFilter,
  counts,
  totalAmount,
  pendingPayment,
  overdueOrders,
  deleteOrder,
  handleExportOrders,
  handlePrintOrders,
}) {
  const overdueTotal = overdueOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const inProcessCount = (counts['pending'] || 0) + (counts['confirmed'] || 0) + (counts['in_fulfillment'] || 0);

  return (
    <div className="space-y-6">
      {/* 14-day Overdue Alert Banner */}
      {isAdmin && overdueOrders.length > 0 && (
        <div className="bg-red-50/90 border border-red-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs sm:text-sm font-extrabold text-red-900 m-0">
                {overdueOrders.length} pedido{overdueOrders.length !== 1 ? 's' : ''} con más de 14 días sin pago
              </p>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-600 text-white">
                ${overdueTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {overdueOrders.slice(0, 8).map(o => (
                <Link
                  key={o.id}
                  href={`/dashboard/pedidos/${o.id}`}
                  className="text-[10px] bg-white hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold transition-colors no-underline"
                >
                  #{o.order_number} · {o.profiles?.full_name?.split(' ')[0] || '—'} · ${Number(o.total_amount).toLocaleString('es-MX')}
                </Link>
              ))}
              {overdueOrders.length > 8 && (
                <span className="text-[10px] text-red-600 font-bold self-center">+{overdueOrders.length - 8} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* High-Density Executive KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Pedidos</p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{orders.length.toLocaleString('es-MX')}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 m-0">Órdenes registradas</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">
              {isAdmin ? 'Ingresos Totales' : 'Compras Totales'}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">
              ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 m-0">Pedidos activos y cerrados</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">En Proceso</p>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Activos
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{inProcessCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 m-0">
              {counts['pending'] || 0} pend · {counts['confirmed'] || 0} conf · {counts['in_fulfillment'] || 0} surt
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">
              {isAdmin ? 'Cuentas por Cobrar' : 'Mi Saldo Pendiente'}
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1 m-0">
              ${pendingPayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 m-0">Saldo pendiente de liquidar</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Modern Enterprise Orders Table Container */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Card Header & Primary Actions */}
        <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 m-0">Listado de Pedidos</h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Mostrando <span className="font-bold text-slate-700">{filteredOrders.length}</span> de <span className="font-bold text-slate-700">{orders.length}</span> órdenes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={handleExportOrders}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                  title="Exportar pedidos a CSV/Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar CSV
                </button>
                <button
                  onClick={handlePrintOrders}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                  title="Imprimir hoja de revisión"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Imprimir
                </button>
              </>
            )}
            <Link
              href="/dashboard/pedidos/nuevo"
              className="bg-[#6a9a04] hover:bg-[#5b8503] text-white px-4 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold shadow-md shadow-[#6a9a04]/20 transition-all no-underline"
            >
              <Plus className="w-4 h-4" /> Crear Pedido
            </Link>
          </div>
        </div>

        {/* Status Filter Pills Bar */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto">
          {STATUS_PILLS.map(pill => {
            const count = pill.id === 'all' ? orders.length : (counts[pill.id] || 0);
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* High-Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Distribuidor / Ciudad</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Monto Total</th>
                <th className="px-5 py-3 text-center">Estado Operativo</th>
                <th className="px-5 py-3 text-center">Estado de Pago</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    No se encontraron pedidos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const opSc = OP_STATUS[order.status] || OP_STATUS.pending;
                  const paySc = PAY_STATUS[order.payment_status] || PAY_STATUS.unpaid;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/pedidos/${order.id}`}
                            className="font-mono font-bold text-slate-900 hover:text-[#6a9a04] no-underline text-xs sm:text-sm"
                          >
                            #{order.order_number}
                          </Link>
                          {order.notes && order.notes.includes('⚠️ INCIDENCIA') && (
                            <span
                              className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-red-100 text-red-600 border border-red-200 tracking-wider"
                              title="Incidencia reportada"
                            >
                              ⚠️ Incidencia
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm m-0">
                          {isAdmin ? (order.profiles?.full_name || order.profiles?.email || 'Desconocido') : 'Mi Pedido de Reposición'}
                        </p>
                        <p className="text-[11px] text-slate-400 m-0">
                          {isAdmin ? (order.profiles?.city || 'Sin ciudad especificada') : 'Inventario General'}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600">
                          {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="font-black text-slate-900 text-xs sm:text-sm font-mono">
                          ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full tracking-wider border ${opSc.className}`}>
                          {opSc.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {!['cancelled', 'rejected'].includes(order.status) ? (
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full tracking-wider border ${paySc.className}`}>
                            {paySc.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/pedidos/${order.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-[#6a9a04] hover:bg-[#6a9a04]/10 transition-colors no-underline"
                            title="Ver detalle del pedido"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Detalle</span>
                          </Link>
                          {isAdmin && ['cancelled', 'rejected'].includes(order.status) && (
                            <button
                              onClick={() => deleteOrder(order.id, order.order_number)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent text-slate-400 hover:text-red-600"
                              title="Eliminar pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-800">{filteredOrders.length}</strong> de <strong className="text-slate-800">{orders.length}</strong> pedidos
          </span>
          <span className="font-semibold text-slate-600">
            Total en vista: <strong className="text-slate-900 font-mono">${filteredOrders.filter(o => !['cancelled', 'rejected'].includes(o.status)).reduce((s, o) => s + Number(o.total_amount || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
