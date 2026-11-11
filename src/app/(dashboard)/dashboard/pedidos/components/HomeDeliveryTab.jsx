'use client';
import React from 'react';
import Link from 'next/link';
import {
  DollarSign, Clock, CheckCircle, Plus, ShoppingBag, Truck, RotateCcw, Copy, Check, Eye
} from 'lucide-react';
import {
  getDeliveryStatus, TONE_CLASSES_LIGHT, isPendingSettlement, isInTransit, isReturned, formatMoney
} from '@/components/delivery/deliveryUtils';

export default function HomeDeliveryTab({
  deliveryOrders,
  searchTerm,
  setShowSettleModal,
  setShowExpressModal,
  setShowNewSale,
  setSelectedDeliveryOrder,
  copiedToken,
  setCopiedToken,
}) {
  const enviosActive = deliveryOrders.filter(o => o.status !== 'cancelled');
  const inTransitCount = enviosActive.filter(o => isInTransit(o)).length;
  const deliveredCount = enviosActive.filter(o => o.status === 'delivered').length;
  const returnedCount = enviosActive.filter(o => isReturned(o)).length;
  const pendingCount = enviosActive.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
  const toSettle = enviosActive.filter(o => isPendingSettlement(o));
  const toSettleCash = toSettle.filter(o => o.collected_method === 'cash').reduce((s, o) => s + Number(o.collected_amount || 0), 0);

  const filteredEnvios = deliveryOrders.filter(o => {
    const s = searchTerm?.toLowerCase() || '';
    if (!s) return true;
    return (o.order_number || '').toLowerCase().includes(s) ||
           (o.customer_name || '').toLowerCase().includes(s) ||
           (o.customer_phone || '').toLowerCase().includes(s) ||
           (o.address_street || '').toLowerCase().includes(s) ||
           (o.address_municipality || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* High-Density KPI Cards — Envíos a Domicilio */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Envíos</p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{enviosActive.length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 m-0">Órdenes activas de última milla</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">En Ruta / Pendientes</p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{inTransitCount + pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5 m-0">
              {inTransitCount} en tránsito · {pendingCount} por despachar
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Entregados</p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{deliveredCount}</p>
            {toSettle.length > 0 ? (
              <p className="text-[11px] font-bold text-violet-600 mt-0.5 m-0">
                {toSettle.length} por liquidar · {formatMoney(toSettleCash)} efvo.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 m-0">Rutas al día</p>
            )}
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Devoluciones</p>
            <p className="text-2xl font-black text-rose-600 mt-1 m-0">{returnedCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 m-0">Retornos a bodega</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Modern Enterprise Table Section */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 m-0">Envíos a Domicilio (Última Milla)</h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Gestiona pedidos de entrega, ruteo con GPS y liquidación de efectivo en Vito Alessio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSettleModal(true)}
              className={`px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold transition-all border cursor-pointer ${
                toSettle.length > 0
                  ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-md shadow-violet-600/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Liquidar ruta{toSettle.length > 0 ? ` (${toSettle.length})` : ''}</span>
            </button>

            <button
              onClick={() => setShowNewSale(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#6a9a04]" /> Nuevo Envío Manual
            </button>

            <button
              onClick={() => setShowExpressModal(true)}
              className="bg-[#6a9a04] hover:bg-[#557e03] text-white px-4 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold shadow-md shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> 🔗 Crear Link Express
            </button>

            <Link
              href="/chofer"
              target="_blank"
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold shadow-sm no-underline"
            >
              <Truck className="w-3.5 h-3.5 text-[#8cc618]" /> Interfaz Chófer
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-5 py-3">No. Orden</th>
                <th className="px-5 py-3">Cliente / Contacto</th>
                <th className="px-5 py-3">Dirección de Entrega</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-center">Estatus Envío</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEnvios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No se encontraron órdenes de envío a domicilio.
                  </td>
                </tr>
              ) : (
                filteredEnvios.map(order => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/entrega/${order.checkout_token}`;
                  const isCopied = copiedToken === order.checkout_token;
                  const hasGps = !isNaN(parseFloat(order.lat)) && !isNaN(parseFloat(order.lng));
                  const st = getDeliveryStatus(order);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedDeliveryOrder(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        {order.order_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm m-0">{order.customer_name || 'Sin nombre'}</p>
                        {order.customer_phone && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 m-0">{order.customer_phone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-xs font-semibold text-slate-800 truncate m-0">
                          {order.address_street ? `${order.address_street} #${order.address_ext_number}` : 'Formulario pendiente de llenado'}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 m-0">
                          <span>{order.address_municipality || order.city || 'Saltillo'}</span>
                          {hasGps && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              📍 GPS OK
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-semibold whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900 text-xs sm:text-sm font-mono whitespace-nowrap">
                        ${(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${TONE_CLASSES_LIGHT[st.tone]}`}>
                          {st.label}
                        </span>
                        {order.payment_status === 'paid' && (
                          <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-wider m-0">Pagado</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              setCopiedToken(order.checkout_token);
                              setTimeout(() => setCopiedToken(null), 2000);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer border-none"
                            title="Copiar link de entrega para cliente"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedDeliveryOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#6a9a04]/10 hover:bg-[#6a9a04]/20 text-[#6a9a04] rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detalle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
