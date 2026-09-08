'use client';
import React from 'react';
import {
  User, MapPin, FileText, AlertTriangle, CheckCircle, Calendar, ClipboardCheck, Truck, Lock, DollarSign
} from 'lucide-react';

export default function OrderSidebar({
  order,
  isAdmin,
  setShowIncidentModal,
  receivingOrder,
  handleReceiveOrder
}) {
  if (!order) return null;

  const distributor = order.profiles || {};
  const addr = order.shipping_address || {};

  return (
    <div className="space-y-5">
      {/* Distributor Info (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-sm">Distribuidor</h3>
          </div>
          <div className="text-xs space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
            <p className="font-extrabold text-slate-900 dark:text-white text-sm">{distributor.full_name || 'Sin nombre'}</p>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <p className="text-slate-500 font-mono text-[11px]">{distributor.email || 'Sin correo'}</p>
              {distributor.city && <p className="text-slate-500 text-[11px]">📍 {distributor.city}</p>}
              {distributor.phone && <p className="text-slate-500 text-[11px]">📞 {distributor.phone}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Shipping Address */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
          <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-extrabold text-sm">Dirección de Entrega</h3>
        </div>
        <div className="text-xs space-y-1 font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
          {addr && typeof addr === 'object' && (addr.street || addr.city || addr.state || addr.zip_code) ? (
            <>
              {addr.label && <p className="font-extrabold text-slate-900 dark:text-white">{addr.label}</p>}
              <p>{addr.street || ''}</p>
              <p>{addr.city || ''}{addr.state ? `, ${addr.state}` : ''} {addr.zip_code ? `C.P. ${addr.zip_code}` : ''}</p>
            </>
          ) : (
            <p className="font-bold text-slate-800 dark:text-slate-200 italic bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              Recoger en sitio
            </p>
          )}
        </div>
      </div>

      {/* Distributor Notes / Instructions */}
      {order.notes && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <FileText className="w-4 h-4" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider">Instrucciones del Distribuidor</h3>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-300 font-medium leading-relaxed italic bg-amber-100/50 dark:bg-amber-900/30 p-2.5 rounded-xl border border-amber-200/60">
            &quot;{order.notes}&quot;
          </p>
        </div>
      )}

      {/* Order Timestamps & Financial Summary (Resumen) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Resumen del Pedido</h3>
        </div>

        <div className="space-y-3.5">
          {/* Order Date */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-lime-50 dark:bg-lime-950 text-lime-600 dark:text-lime-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">FECHA DEL PEDIDO</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {new Date(order.created_at).toLocaleDateString('es-MX')} {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Confirmed Date */}
          {order.confirmed_at && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">CONFIRMADO</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {new Date(order.confirmed_at).toLocaleDateString('es-MX')} {new Date(order.confirmed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}

          {/* Shipped Date */}
          {order.shipped_at && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">FECHA DE ENVÍO</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {new Date(order.shipped_at).toLocaleDateString('es-MX')} {new Date(order.shipped_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}

          {/* Closed Date */}
          {order.delivered_at && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">CIERRE OPERATIVO</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {new Date(order.delivered_at).toLocaleDateString('es-MX')} {new Date(order.delivered_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">TOTAL</span>
              <span className="text-xl font-black text-[#6a9a04] dark:text-[#7db505]">
                ${Number(order.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection / Cancelled Reason */}
      {order.rejection_reason && (
        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-200/80 dark:border-red-900/40 p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider">Motivo de Rechazo/Cancelación</h3>
          </div>
          <p className="text-xs text-red-900 dark:text-red-300 font-medium leading-relaxed">
            {order.rejection_reason}
          </p>
        </div>
      )}

      {/* Distributor Actions (Receive Order / Report Incident) */}
      {!isAdmin && order.status === 'shipped' && (
        <div className="space-y-3 pt-2">
          <button
            onClick={handleReceiveOrder}
            disabled={receivingOrder}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirmar Recepción Física</span>
          </button>

          <button
            onClick={() => setShowIncidentModal(true)}
            className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-2xl border border-amber-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Reportar Incidencia</span>
          </button>
        </div>
      )}
    </div>
  );
}
