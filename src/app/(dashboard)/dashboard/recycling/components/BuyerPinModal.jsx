'use client';
import { Users, X, Loader2, Check, Lock, Delete } from 'lucide-react';

export default function BuyerPinModal({
  isOpen,
  onClose,
  buyerPinInput,
  setBuyerPinInput,
  buyerModalError,
  verifyingBuyer,
  rememberBuyer,
  setRememberBuyer,
  verifyBuyerPin,
  handleKeypadPress,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-[#0] z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Identificación de Comprador</h3>
              <p className="text-xs text-slate-300">Ingresa tu PIN de 4 dígitos o escanea credencial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={verifyBuyerPin} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
          <div>
            {/* PIN Display */}
            <div className="mb-4 text-center">
              <input
                type="password"
                maxLength={10}
                value={buyerPinInput}
                onChange={e => setBuyerPinInput(e.target.value)}
                autoFocus
                placeholder="• • • •"
                className="w-full text-center text-3xl font-black tracking-[0.4em] py-3.5 px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none bg-slate-50 transition-all font-mono text-slate-900"
              />
              {buyerModalError && (
                <p className="text-xs font-bold text-red-500 mt-2 bg-red-50 p-2.5 rounded-xl border border-red-100 animate-[shake_0.3s_ease]">
                  {buyerModalError}
                </p>
              )}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => {
                const isAction = key === 'C' || key === 'DEL';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className={`py-3.5 rounded-2xl font-black text-lg transition-all border border-slate-200/80 active:scale-95 cursor-pointer shadow-xs ${
                      isAction
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {key === 'DEL' ? <Delete size={20} className="mx-auto" /> : key}
                  </button>
                );
              })}
            </div>

            {/* Remember Switch */}
            <div className="mt-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between cursor-pointer"
              onClick={() => setRememberBuyer(!rememberBuyer)}>
              <div className="flex items-center gap-2.5">
                <Users size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Recordar comprador en esta sesión</span>
              </div>
              <input
                type="checkbox"
                checked={rememberBuyer}
                onChange={e => setRememberBuyer(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={verifyingBuyer || !buyerPinInput.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifyingBuyer ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirmar PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
