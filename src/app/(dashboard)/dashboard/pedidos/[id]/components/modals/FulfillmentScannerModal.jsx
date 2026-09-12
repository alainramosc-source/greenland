'use client';
import React from 'react';
import { X, Search, Camera, CheckCircle2, AlertCircle, PackageCheck, Loader2 } from 'lucide-react';

export default function FulfillmentScannerModal({
  showFulfillmentScan,
  setShowFulfillmentScan,
  order,
  fulfilledQty,
  scanFeedback,
  showFulfillScanner,
  openFulfillScanner,
  closeFulfillScanner,
  fulfillSearchTerm,
  setFulfillSearchTerm,
  fulfillSearchRef,
  handleFulfillSearchKeyDown,
  handleFulfillSearchChange,
  handleUpdateStatus,
  actionLoading
}) {
  if (!showFulfillmentScan || !order) return null;

  const totalRequired = order.order_items.reduce((s, i) => s + i.quantity, 0);
  const totalFulfilled = Object.values(fulfilledQty).reduce((s, q) => s + q, 0);
  const is100Percent = totalFulfilled >= totalRequired && totalRequired > 0;
  const progressPercent = totalRequired > 0 ? Math.min(100, Math.round((totalFulfilled / totalRequired) * 100)) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Escáner de Surtido y Embalaje</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pedido #{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (showFulfillScanner) closeFulfillScanner();
              setShowFulfillmentScan(false);
            }}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Scanner Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Barcode Search / Scanner Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={fulfillSearchRef}
                type="text"
                value={fulfillSearchTerm}
                onChange={handleFulfillSearchChange}
                onKeyDown={handleFulfillSearchKeyDown}
                placeholder="Escanea SKU o Código de Barras aquí..."
                className="w-full text-xs font-mono font-bold pl-10 pr-4 py-3 rounded-2xl border-2 border-purple-500/30 focus:border-purple-600 focus:outline-none transition-all shadow-sm bg-purple-50/30 dark:bg-purple-950/20 text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>

            {/* Camera Toggle Button */}
            <button
              onClick={showFulfillScanner ? closeFulfillScanner : openFulfillScanner}
              className={`w-full sm:w-auto px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border ${
                showFulfillScanner
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{showFulfillScanner ? 'Cerrar Cámara' : 'Usar Cámara'}</span>
            </button>
          </div>

          {/* Camera Scanner Viewport */}
          {showFulfillScanner && (
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative">
              <div id="fulfill-barcode-reader" className="w-full rounded-xl overflow-hidden min-h-[180px]" />
              <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                Apunta la cámara del dispositivo al código de barras del producto
              </p>
            </div>
          )}

          {/* Feedback Banner */}
          {scanFeedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : scanFeedback.type === 'warning'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
              }`}
            >
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{scanFeedback.message}</span>
            </div>
          )}

          {/* Progress Overview Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-slate-600 dark:text-slate-400">Progreso de Surtido:</span>
              <span className={is100Percent ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}>
                {totalFulfilled} de {totalRequired} piezas ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  is100Percent ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-purple-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items checklist */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Artículos del Pedido</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {order.order_items.map((item) => {
                const current = fulfilledQty[item.id] || 0;
                const req = item.quantity;
                const isComplete = current >= req;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      isComplete ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        isComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : `${current}/${req}`}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{item.products?.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">SKU: {item.products?.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                        isComplete ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                      }`}>
                        {current} / {req} pcs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (showFulfillScanner) closeFulfillScanner();
              setShowFulfillmentScan(false);
            }}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cerrar Ventana
          </button>
          
          <button
            onClick={() => {
              if (showFulfillScanner) closeFulfillScanner();
              setShowFulfillmentScan(false);
              handleUpdateStatus('in_fulfillment', 'En Surtido');
            }}
            disabled={actionLoading === 'in_fulfillment'}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'in_fulfillment' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PackageCheck className="w-4 h-4" />
            )}
            <span>Marcar en Surtido e Imprimir Hoja</span>
          </button>
        </div>
      </div>
    </div>
  );
}
