'use client';
import { X, Sliders, Check, Loader2, Package } from 'lucide-react';

const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function StockAdjustmentModal({
  adjustModal,
  setAdjustModal,
  adjustForm,
  setAdjustForm,
  submittingAdjustment,
  handleSubmitAdjustment,
}) {
  if (!adjustModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Ajustar Inventario Manual</h3>
              <p className="text-xs text-slate-300">{adjustModal.name}</p>
            </div>
          </div>
          <button
            onClick={() => setAdjustModal(null)}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Current Stock Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Stock Actual Registrado</span>
            <span className="text-base font-black font-mono text-slate-900">{fmtKg(adjustModal.stock_kg)} kg</span>
          </div>

          {/* Adjustment Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo de Ajuste *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustForm(f => ({ ...f, type: 'add' }))}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  adjustForm.type === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Sumar Kilos
              </button>
              <button
                type="button"
                onClick={() => setAdjustForm(f => ({ ...f, type: 'subtract' }))}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  adjustForm.type === 'subtract'
                    ? 'bg-red-600 text-white border-red-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                - Restar Kilos
              </button>
              <button
                type="button"
                onClick={() => setAdjustForm(f => ({ ...f, type: 'set_exact' }))}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  adjustForm.type === 'set_exact'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Fijar Exacto
              </button>
            </div>
          </div>

          {/* Amount / Exact Input */}
          {adjustForm.type === 'set_exact' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nuevo Stock Exacto (KG) *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={adjustForm.exact_kg}
                onChange={e => setAdjustForm(f => ({ ...f, exact_kg: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono font-bold outline-none focus:border-blue-500 bg-white"
                placeholder="0.000"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cantidad a {adjustForm.type === 'add' ? 'Sumar (+)' : 'Restar (-)'} en KG *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={adjustForm.amount_kg}
                onChange={e => setAdjustForm(f => ({ ...f, amount_kg: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono font-bold outline-none focus:border-emerald-500 bg-white"
                placeholder="0.000"
              />
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Motivo / Razón del Ajuste *</label>
            <textarea
              value={adjustForm.reason}
              onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500 bg-white resize-none"
              rows={2}
              placeholder="Ej. Conteo físico de fin de mes, Mermas por humedad, Corrección de peso..."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setAdjustModal(null)}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitAdjustment}
              disabled={submittingAdjustment}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingAdjustment ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirmar Ajuste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
