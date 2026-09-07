'use client';
import React from 'react';
import { Camera, X } from 'lucide-react';

export default function BarcodeScannerModal({
  showScanner,
  closeScanner
}) {
  if (!showScanner) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeScanner}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-[#6a9a04]" />
            <h3 className="text-sm font-black text-slate-900">Escáner de Código de Barras</h3>
          </div>
          <button onClick={closeScanner} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Apunta la cámara del dispositivo al código de barras del producto.
        </p>

        {/* Camera Feed Mounting Element */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-black min-h-[200px] flex items-center justify-center">
          <div id="barcode-reader" className="w-full"></div>
        </div>

        <button
          type="button"
          onClick={closeScanner}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
        >
          Cerrar Cámara
        </button>
      </div>
    </div>
  );
}
