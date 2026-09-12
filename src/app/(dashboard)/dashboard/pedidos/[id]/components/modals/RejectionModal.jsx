'use client';
import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function RejectionModal({
  showRejectModal,
  setShowRejectModal,
  rejectionReason,
  setRejectionReason,
  handleReject,
  actionLoading
}) {
  if (!showRejectModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-red-600">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Rechazar Pedido</h3>
          </div>
          <button
            onClick={() => setShowRejectModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Ingresa el motivo del rechazo para notificar al distribuidor. Esta acción detendrá el procesamiento del pedido.
        </p>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Motivo del rechazo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="Ej: Stock insuficiente, precio desactualizado, inconsistencia en la dirección..."
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-800 placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={() => setShowRejectModal(false)}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading === 'rejected'}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'rejected' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span>Confirmar Rechazo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
