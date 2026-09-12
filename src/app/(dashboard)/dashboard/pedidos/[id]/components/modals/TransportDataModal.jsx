'use client';
import React from 'react';
import { X, Truck, Printer, ArrowRight } from 'lucide-react';

export default function TransportDataModal({
  showTransportModal,
  setShowTransportModal,
  transportData,
  setTransportData,
  pendingPrintWindow,
  printLoadingSheet
}) {
  if (!showTransportModal) return null;

  const handlePrintWithData = () => {
    printLoadingSheet(pendingPrintWindow, transportData);
    setShowTransportModal(false);
  };

  const handleSkip = () => {
    printLoadingSheet(pendingPrintWindow, {});
    setShowTransportModal(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-blue-600">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">🚚 Datos de Transporte</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Opcional — solo para envíos por camión. Deja en blanco para paquetería.</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (pendingPrintWindow) pendingPrintWindow.close();
              setShowTransportModal(false);
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              PLACAS
            </label>
            <input
              type="text"
              placeholder="Ej: ABC-123-A"
              value={transportData.placas}
              onChange={(e) => setTransportData({ ...transportData, placas: e.target.value })}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 uppercase placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              NOMBRE DEL OPERADOR
            </label>
            <input
              type="text"
              placeholder="Nombre completo del chofer"
              value={transportData.operador}
              onChange={(e) => setTransportData({ ...transportData, operador: e.target.value })}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              NÚMERO DE SELLO
            </label>
            <input
              type="text"
              placeholder="Ej: SELLO-0001"
              value={transportData.sello}
              onChange={(e) => setTransportData({ ...transportData, sello: e.target.value })}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 uppercase placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={handleSkip}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Saltar (Paquetería)
          </button>
          <button
            onClick={handlePrintWithData}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir con datos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
