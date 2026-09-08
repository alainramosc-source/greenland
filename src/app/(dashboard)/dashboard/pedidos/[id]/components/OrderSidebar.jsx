'use client';
import React from 'react';
import { User, MapPin, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

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
          <div className="text-xs space-y-1 font-medium text-slate-700 dark:text-slate-300">
            <p className="font-extrabold text-slate-900 dark:text-white text-sm">{distributor.full_name || 'Sin nombre'}</p>
            <p className="text-slate-500">{distributor.email || 'Sin correo'}</p>
            {distributor.phone && <p className="text-slate-500">Tel: {distributor.phone}</p>}
            {distributor.city && <p className="text-slate-500">Ciudad: {distributor.city}</p>}
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
          {addr.label && <p className="font-extrabold text-slate-900 dark:text-white">{addr.label}</p>}
          <p>{addr.street || 'Dirección por definir'}</p>
          <p>{addr.city || ''} {addr.state ? `, ${addr.state}` : ''} {addr.zip_code ? `C.P. ${addr.zip_code}` : ''}</p>
        </div>
      </div>

      {/* Order Notes / Instructions */}
      {order.notes && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <FileText className="w-4 h-4" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider">Notas del Pedido</h3>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-300 font-medium leading-relaxed whitespace-pre-wrap">
            {order.notes}
          </p>
        </div>
      )}

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
