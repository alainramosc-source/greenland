'use client';
import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function CancelOrderModal({
  showCancelModal,
  setShowCancelModal,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  actionLoading
}) {
  if (!showCancelModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-red-600">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Cancelar Pedido</h3>
          </div>
          <button
            onClick={() => setShowCancelModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-red-800 text-xs font-medium space-y-1">
          <p className="font-bold">⚠️ Atención: Reversión Completa</p>
          <p className="text-[11px] text-red-700 leading-relaxed">
            Al cancelar, se revertirá cualquier inventario reservado en bodegas y se liberarán los apartados asociados a este pedido.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Motivo de la cancelación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Escribe el motivo detallado de la cancelación..."
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-800 placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={() => setShowCancelModal(false)}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleCancelOrder}
            disabled={actionLoading === 'cancelled'}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'cancelled' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span>Confirmar Cancelación</span>
          </button>
        </div>
      </div>
    </div>
  );
}
