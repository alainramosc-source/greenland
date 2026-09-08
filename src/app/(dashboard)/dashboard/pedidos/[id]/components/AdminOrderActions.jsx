'use client';
import React from 'react';
import {
  CheckCircle, XCircle, PackageCheck, Truck, Loader2, AlertTriangle, Printer, Lock
} from 'lucide-react';

export default function AdminOrderActions({
  order,
  isAdmin,
  evidence,
  actionLoading,
  allItemsHaveWarehouse,
  handleConfirmOrder,
  handleUpdateStatus,
  setShowRejectModal,
  setShowCancelModal,
  openLoadingSheetPrompt,
  initFulfillmentScan,
  setShowFulfillmentScan
}) {
  if (!isAdmin || !order) return null;

  const status = order.status;
  const embarqueCount = evidence.filter(e => e.evidence_type === 'embarque').length;
  const canShip = embarqueCount >= 2;
  const isFinalStatus = ['closed', 'rejected', 'cancelled'].includes(status);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Acciones Operativas</h3>
        </div>
      </div>

      {isFinalStatus ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
            Este pedido ha alcanzado su estado final.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status: PENDING */}
          {status === 'pending' && (
            <div className="space-y-2">
              <button
                onClick={handleConfirmOrder}
                disabled={actionLoading === 'confirm' || !allItemsHaveWarehouse}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-40"
              >
                {actionLoading === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Confirmar Pedido</span>
              </button>
              {!allItemsHaveWarehouse && (
                <p className="text-[10px] text-center font-bold text-amber-600 dark:text-amber-400">
                  ⚠️ Asigna una bodega de salida a todos los productos para confirmar
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={!!actionLoading}
                  className="py-2.5 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Rechazar</span>
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={!!actionLoading}
                  className="py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* Status: CONFIRMED */}
          {status === 'confirmed' && (
            <div className="space-y-2">
              <button
                onClick={() => handleUpdateStatus('in_fulfillment', 'En Surtido')}
                disabled={actionLoading === 'in_fulfillment'}
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/20"
              >
                {actionLoading === 'in_fulfillment' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>Pasar a Surtido</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={!!actionLoading}
                  className="py-2.5 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Rechazar</span>
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={!!actionLoading}
                  className="py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* Status: IN_FULFILLMENT */}
          {status === 'in_fulfillment' && (
            <div className="space-y-2.5">
              <button
                onClick={async () => {
                  await initFulfillmentScan();
                  setShowFulfillmentScan(true);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Escaneo de Surtido</span>
              </button>

              <button
                onClick={() => canShip && handleUpdateStatus('shipped', 'Enviado')}
                disabled={actionLoading === 'shipped' || !canShip}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  canShip
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {actionLoading === 'shipped' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>Marcar como Enviado</span>
              </button>

              {!canShip && (
                <p className="text-[10px] text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                  📸 Sube mín. 2 fotos de embarque para habilitar ({embarqueCount}/2)
                </p>
              )}

              <button
                onClick={() => setShowCancelModal(true)}
                disabled={!!actionLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar Pedido</span>
              </button>
            </div>
          )}

          {/* Status: SHIPPED */}
          {status === 'shipped' && (
            <button
              onClick={() => handleUpdateStatus('closed', 'Cerrado')}
              disabled={actionLoading === 'closed'}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {actionLoading === 'closed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-emerald-400" />}
              <span>Cerrar Pedido</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
