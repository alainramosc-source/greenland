'use client';
import React from 'react';
import { Key, ShieldCheck, X, Loader2, AlertCircle } from 'lucide-react';

export default function SellerPinModal({
  showSellerPinModal,
  setShowSellerPinModal,
  sellerPinInput,
  setSellerPinInput,
  sellerModalError,
  rememberSeller,
  setRememberSeller,
  verifyingSeller,
  verifySellerPin,
  handleKeypadPress
}) {
  if (!showSellerPinModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSellerPinModal(false)}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Key size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Identificar Vendedor</h3>
              <p className="text-[11px] text-slate-400">Ingresa tu PIN o escanea credencial</p>
            </div>
          </div>
          <button
            onClick={() => setShowSellerPinModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Submission */}
        <form onSubmit={verifySellerPin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Ingresa PIN..."
              value={sellerPinInput}
              onChange={(e) => setSellerPinInput(e.target.value)}
              className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
              autoFocus
            />
          </div>

          {sellerModalError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{sellerModalError}</span>
            </div>
          )}

          {/* On-Screen Touch Keypad Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleKeypadPress(val)}
                className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                  val === 'C'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : val === 'DEL'
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Remember Seller Checkbox */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={rememberSeller}
              onChange={(e) => setRememberSeller(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <span>Recordar este vendedor para las siguientes ventas</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={verifyingSeller || !sellerPinInput.trim()}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20"
          >
            {verifyingSeller ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>Confirmar e Iniciar Venta</span>
          </button>
        </form>
      </div>
    </div>
  );
}
