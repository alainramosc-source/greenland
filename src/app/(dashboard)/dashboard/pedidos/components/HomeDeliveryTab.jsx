'use client';
import React from 'react';
import Link from 'next/link';
import {
  DollarSign, Clock, CheckCircle, Plus, ShoppingBag, Truck, RotateCcw, Copy, Check
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
    <>
      {/* KPI Cards — Envíos a Domicilio */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-2xl"><Truck className="w-6 h-6 text-blue-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Envíos</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{enviosActive.length}</p>
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-2xl"><Clock className="w-6 h-6 text-amber-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">En Ruta / Pendientes</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{inTransitCount + pendingCount}</p>
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-2xl"><CheckCircle className="w-6 h-6 text-emerald-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Entregados</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{deliveredCount}</p>
          {toSettle.length > 0 && (
            <p className="text-[11px] font-bold text-violet-600 mt-1">{toSettle.length} por liquidar · {formatMoney(toSettleCash)} en efectivo</p>
          )}
        </div>

        <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-2xl"><RotateCcw className="w-6 h-6 text-red-600" /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Devoluciones</h3>
          <p className="text-2xl font-bold text-[#000000] mt-1">{returnedCount}</p>
        </div>
      </section>

      {/* Table Section */}
      <section className="glass-panel rounded-[2.5rem] p-8 mt-6 border border-white/40 shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#000000]">Envíos a Domicilio</h2>
            <p className="text-[#747474] text-sm mt-1">Gestiona pedidos de entrega, ruteo y registro de devoluciones a Vito Alessio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSettleModal(true)}
              className={`px-4 py-2.5 rounded-xl flex items-center text-xs font-bold shadow-md transition-all border-none cursor-pointer ${toSettle.length > 0 ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <DollarSign className="w-4 h-4 mr-1.5" /> Liquidar ruta{toSettle.length > 0 ? ` (${toSettle.length})` : ''}
            </button>
            <button
              onClick={() => setShowNewSale(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl flex items-center text-xs font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#6a9a04]" /> Nuevo Envío Manual
            </button>
            <button
              onClick={() => setShowExpressModal(true)}
              className="bg-[#6a9a04] hover:bg-[#557e03] text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-bold shadow-lg shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> 🔗 Crear Link Express
            </button>
            <Link
              href="/chofer"
              target="_blank"
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl flex items-center text-xs font-bold shadow-md no-underline"
            >
              <Truck className="w-4 h-4 mr-1.5 text-[#8cc618]" /> Ver Interfaz Chófer
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[#747474] text-xs font-bold uppercase tracking-wider px-6">
                <th className="pb-2 pl-6">No. Orden</th>
                <th className="pb-2">Cliente / Contacto</th>
                <th className="pb-2">Dirección de Entrega</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-center">Estatus Envío</th>
                <th className="pb-2 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnvios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium bg-white/40 rounded-2xl">
                    No se encontraron órdenes de envío a domicilio
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
                      className="glass-panel table-row-glass rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                    >
                      <td className="py-4 pl-6 font-mono font-bold text-slate-900 rounded-l-2xl">
                        {order.order_number}
                      </td>
                      <td className="py-4">
                        <p className="font-bold text-slate-900 text-xs">{order.customer_name || 'Sin nombre'}</p>
                        {order.customer_phone && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{order.customer_phone}</p>
                        )}
                      </td>
                      <td className="py-4 max-w-xs">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {order.address_street ? `${order.address_street} #${order.address_ext_number}` : 'Formulario pendiente'}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{order.address_municipality || order.city || 'Saltillo'}</span>
                          {hasGps && <span className="text-emerald-600 font-bold">📍 GPS OK</span>}
                        </p>
                      </td>
                      <td className="py-4 text-xs text-slate-600 font-medium">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-4 text-right font-black text-slate-900 text-sm">
                        ${(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${TONE_CLASSES_LIGHT[st.tone]}`}>
                          {st.label}
                        </span>
                        {order.payment_status === 'paid' && (
                          <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-wider">Pagado</p>
                        )}
                      </td>
                      <td className="py-4 pr-6 text-right rounded-r-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              setCopiedToken(order.checkout_token);
                              setTimeout(() => setCopiedToken(null), 2000);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border-none"
                            title="Copiar link de entrega"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setSelectedDeliveryOrder(order)}
                            className="px-3 py-1.5 bg-[#6a9a04]/10 hover:bg-[#6a9a04]/20 text-[#6a9a04] rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                          >
                            Ver Detalle
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
    </>
  );
}

