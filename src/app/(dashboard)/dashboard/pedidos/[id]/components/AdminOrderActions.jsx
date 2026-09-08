'use client';
import React from 'react';
import {
  CheckCircle, XCircle, PackageCheck, Truck, Loader2, AlertTriangle, Printer
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
  setShowTransportModal,
  initFulfillmentScan,
  setShowFulfillmentScan,
  printLoadingSheet
}) {
  if (!isAdmin || !order) return null;

  const status = order.status;
  const embarqueCount = evidence.filter(e => e.evidence_type === 'embarque').length;
  const canShip = embarqueCount >= 2;

  // Don't show admin action bar if closed, rejected, or cancelled
  if (['closed', 'rejected', 'cancelled'].includes(status)) return null;

  return (
    <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-extrabold text-sm tracking-tight text-slate-100">Acciones Operativas de Administrador</h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Etapa actual: {status}
        </span>
      </div>

      {/* Dynamic Action Buttons according to status */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status: PENDING */}
        {status === 'pending' && (
          <>
            <button
              onClick={handleConfirmOrder}
              disabled={actionLoading === 'confirm' || !allItemsHaveWarehouse}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-40"
              title={!allItemsHaveWarehouse ? 'Asigna bodegas de salida primero' : ''}
            >
              {actionLoading === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Confirmar Pedido</span>
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center gap-2 border border-amber-500/20 transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Rechazar</span>
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-2 border border-red-500/20 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Cancelar Pedido</span>
            </button>
          </>
        )}

        {/* Status: CONFIRMED */}
        {status === 'confirmed' && (
          <>
            <button
              onClick={async () => {
                await initFulfillmentScan();
                setShowFulfillmentScan(true);
              }}
              className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Escaneo e Iniciar Surtido</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('in_fulfillment', 'En Surtido')}
              disabled={actionLoading === 'in_fulfillment'}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {actionLoading === 'in_fulfillment' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Marcar En Surtido Directo</span>
            </button>
          </>
        )}

        {/* Status: IN_FULFILLMENT */}
        {status === 'in_fulfillment' && (
          <>
            <button
              onClick={() => setShowTransportModal(true)}
              disabled={actionLoading === 'shipped' || !canShip}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-40"
              title={!canShip ? 'Se requieren mínimo 2 fotos de evidencia de embarque' : ''}
            >
              {actionLoading === 'shipped' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              <span>Autorizar Envío (Fletera)</span>
            </button>

            {!canShip && (
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Faltan fotos de embarque ({embarqueCount}/2 requeridas)
              </span>
            )}

            <button
              onClick={() => printLoadingSheet()}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ml-auto"
            >
              <Printer className="w-4 h-4" />
              <span>Hoja de Carga</span>
            </button>
          </>
        )}

        {/* Status: SHIPPED */}
        {status === 'shipped' && (
          <button
            onClick={() => handleUpdateStatus('closed', 'Cerrado / Entregado')}
            disabled={actionLoading === 'closed'}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {actionLoading === 'closed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
            <span>Marcar como Entregado / Cerrar</span>
          </button>
        )}
      </div>
    </div>
  );
}
