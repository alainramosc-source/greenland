'use client';
import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart, DollarSign, Clock, TrendingUp, Download,
  ChevronLeft, ChevronRight, Eye, Plus, Trash2, Printer, AlertTriangle
} from 'lucide-react';
import { OP_STATUS, PAY_STATUS } from '@/hooks/usePedidos';

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

  return (
    <>
      {/* 14-day Overdue Alert Banner */}
      {isAdmin && overdueOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">
              ⚠️ {overdueOrders.length} pedido{overdueOrders.length !== 1 ? 's' : ''} con más de 14 días sin pago
              <span className="font-normal text-red-600 ml-2">(${overdueTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })})</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {overdueOrders.slice(0, 8).map(o => (
                <span key={o.id} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  #{o.order_number} · {o.profiles?.full_name?.split(' ')[0] || '—'} · ${Number(o.total_amount).toLocaleString('es-MX')}
                </span>
              ))}
              {overdueOrders.length > 8 && (
                <span className="text-[10px] text-red-500 font-bold">+{overdueOrders.length - 8} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-2xl"><ShoppingCart className="w-6 h-6 text-blue-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Pedidos</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{orders.length.toLocaleString('es-MX')}</p>
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-2xl"><DollarSign className="w-6 h-6 text-purple-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isAdmin ? 'Ingresos Totales' : 'Compras Totales'}</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-2xl"><Clock className="w-6 h-6 text-orange-600" /></div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Activos</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">En Proceso</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{(counts['pending'] || 0) + (counts['confirmed'] || 0) + (counts['in_fulfillment'] || 0)}</p>
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-2xl"><TrendingUp className="w-6 h-6 text-red-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isAdmin ? 'Cuentas por Cobrar' : 'Mi Saldo Pendiente'}</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">${pendingPayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </section>

      {/* Orders Table Section */}
      <section className="glass-panel rounded-[2.5rem] p-8 mt-6 border border-white/40 shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#000000]">Pedidos Recientes</h2>
            <p className="text-[#747474] text-sm mt-1">Gestiona y monitorea las órdenes en tiempo real.</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="glass-button px-4 py-2.5 rounded-xl text-slate-700 text-sm font-semibold cursor-pointer border border-white/80 outline-none bg-white/50 backdrop-blur-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="in_fulfillment">En Surtido</option>
              <option value="shipped">Enviados</option>
              <option value="closed">Cerrados</option>
              <option value="cancelled">Cancelados</option>
              <option value="rejected">Rechazados</option>
            </select>
            <Link
              href="/dashboard/pedidos/nuevo"
              className="bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-6 py-2.5 rounded-xl flex items-center text-sm font-bold shadow-lg shadow-[#6a9a04]/20 transition-all no-underline"
            >
              <Plus className="w-5 h-5 mr-2" /> Crear Pedido
            </Link>
            {isAdmin && (
              <>
                <button
                  onClick={handleExportOrders}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white/50 border border-white/80 hover:bg-white cursor-pointer transition-all backdrop-blur-md shadow-sm"
                  title="Exportar pedidos a Excel"
                >
                  <Download className="w-4 h-4" /> Exportar
                </button>
                <button
                  onClick={handlePrintOrders}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white/50 border border-white/80 hover:bg-white cursor-pointer transition-all backdrop-blur-md shadow-sm"
                  title="Imprimir hoja de revisión"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-2">ID</th>
                <th className="px-6 py-2">Concepto / Cliente</th>
                <th className="px-6 py-2">Fecha</th>
                <th className="px-6 py-2">Total</th>
                <th className="px-6 py-2 text-center">Estado</th>
                <th className="px-6 py-2 text-center">Pago</th>
                <th className="px-6 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                    No se encontraron pedidos.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const opSc = OP_STATUS[order.status] || OP_STATUS.pending;
                  const paySc = PAY_STATUS[order.payment_status] || PAY_STATUS.unpaid;
                  return (
                    <tr key={order.id} className="table-row-glass transition-all rounded-2xl group">
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-l-2xl border-y border-l border-transparent group-hover:border-[#6a9a04]/10 first:rounded-l-2xl transition-colors">
                        <span className="text-slate-800 font-bold">#{order.order_number}</span>
                        {order.notes && order.notes.includes('⚠️ INCIDENCIA') && (
                          <span className="ml-2 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-red-100 text-red-600 border border-red-200 tracking-wider" title="Incidencia reportada">
                            ⚠️ Incidencia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 m-0">
                            {isAdmin ? (order.profiles?.full_name || order.profiles?.email || 'Desconocido') : 'Mi Pedido de Reposición'}
                          </p>
                          <p className="text-xs text-[#747474] m-0">
                            {isAdmin ? (order.profiles?.city || 'Sin especificar') : 'Inventario General'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                        <span className="text-sm font-medium text-slate-600">
                          {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                        <span className="font-black text-[#000000]">
                          ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${opSc.className}`}>
                          {opSc.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center">
                        {!['cancelled', 'rejected'].includes(order.status) && (
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${paySc.className}`}>
                            {paySc.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-r-2xl border-y border-r border-transparent group-hover:border-[#6a9a04]/10 text-center transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="p-2 hover:bg-white rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent" title="Ver detalle">
                            <Eye className="w-5 h-5 text-slate-400 hover:text-[#6a9a04]" />
                          </Link>
                          {isAdmin && ['cancelled', 'rejected'].includes(order.status) && (
                            <button
                              onClick={() => deleteOrder(order.id, order.order_number)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent"
                              title="Eliminar pedido"
                            >
                              <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between mt-8 border-t border-slate-200/50 pt-6">
          <p className="text-sm text-[#747474] m-0">
            Mostrando <span className="font-bold text-slate-800">{filteredOrders.length}</span> de <span className="font-bold text-slate-800">{orders.length}</span> pedidos
          </p>
          <div className="flex space-x-2">
            <button className="glass-button w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white cursor-pointer shadow-sm border-none bg-white/50 text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#6a9a04] text-white font-bold shadow-md cursor-pointer border-none">1</button>
            <button className="glass-button w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white cursor-pointer shadow-sm border-none bg-white/50 text-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

