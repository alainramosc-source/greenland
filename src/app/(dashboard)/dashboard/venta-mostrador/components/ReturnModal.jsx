'use client';
import React from 'react';
import { RotateCcw, X, Loader2, Key, AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react';

export default function ReturnModal({
  showReturnModal,
  setShowReturnModal,
  selectedSaleToReturn,
  returnReason,
  setReturnReason,
  signerAuthInput,
  setSignerAuthInput,
  processingReturn,
  handleProcessReturn,
  returnSuccessData,
  setReturnSuccessData,
  handleLoadReturnedItemsToCart
}) {
  // If showing return success popup
  if (returnSuccessData) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReturnSuccessData(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-scale-up" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Devolución Procesada</h3>
            <p className="text-xs text-slate-500 mt-1">
              Se reintegró el stock a la bodega y se registró el movimiento correspondientemente.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => handleLoadReturnedItemsToCart(returnSuccessData)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <ShoppingCart size={16} />
              <span>🛒 Cargar Items al Carrito para Corregir</span>
            </button>

            <button
              type="button"
              onClick={() => setReturnSuccessData(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showReturnModal || !selectedSaleToReturn) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReturnModal(false)}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Procesar Devolución de Venta</h3>
              <p className="text-[11px] text-slate-400">Folio #{selectedSaleToReturn.sale_number}</p>
            </div>
          </div>
          <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            Acción de Devolución
          </p>
          <p className="text-[11px] text-amber-700">
            Esta acción reingresará los productos al inventario de la bodega y cancelará la venta. Si fue en efectivo, registrará el egreso correspondiente.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          {/* Motivo Obligatorio */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Motivo de Devolución *
            </label>
            <input
              type="text"
              placeholder="Especifica la razón obligatoria (ej: cliente cambió de opinión)..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
          </div>

          {/* Signer Authorization PIN / Barcode */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>PIN o Credencial de Signer / Admin *</span>
              <span className="text-[10px] text-slate-400">Autorización requerida</span>
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Ingresa PIN o escanea credencial..."
                value={signerAuthInput}
                onChange={(e) => setSignerAuthInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowReturnModal(false)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcessReturn}
            disabled={processingReturn || !returnReason.trim()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-red-600/20"
          >
            {processingReturn ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            <span>Confirmar Devolución</span>
          </button>
        </div>
      </div>
    </div>
  );
}
