'use client';
import { Plus, Trash2, ShieldCheck, StickyNote } from 'lucide-react';

export default function ConditionsAndNotesSection({
  activeBrand,
  conditions,
  addCondition,
  updateCondition,
  removeCondition,
  notes,
  setNotes,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ============================================================ */}
      {/* CONDITIONS (7 cols) */}
      {/* ============================================================ */}
      <div className="lg:col-span-7 bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                5. Condiciones Comerciales
              </label>
            </div>
            <button
              onClick={addCondition}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#6a9a04] hover:bg-[#6a9a04]/10 transition-all cursor-pointer bg-[#6a9a04]/5 border border-[#6a9a04]/25"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar condición
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-center">
              <p className="text-xs text-slate-400 font-medium m-0">
                Sin condiciones comerciales. Agrega una condición o selecciona una plantilla rápida arriba.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeBrand.color }}
                  />
                  <input
                    type="text"
                    value={cond}
                    onChange={(e) => updateCondition(idx, e.target.value)}
                    placeholder="Ej. Tiempo de entrega sujeto a disponibilidad de inventario..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs text-slate-700 transition-all bg-slate-50/40 focus:bg-white"
                  />
                  <button
                    onClick={() => removeCondition(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer bg-transparent border-0"
                    title="Eliminar condición"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* NOTES (5 cols) */}
      {/* ============================================================ */}
      <div className="lg:col-span-5 bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <StickyNote className="w-4 h-4" />
            </div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              6. Notas Adicionales
            </label>
          </div>
          <span className="text-[11px] text-slate-400">Opcional</span>
        </div>
        <p className="text-xs text-slate-500 mb-3 m-0">
          Información bancaria, cuentas de depósito o aclaraciones especiales
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notas adicionales para el cliente..."
          className="w-full flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-xs resize-y bg-slate-50/40 focus:bg-white"
        />
      </div>
    </div>
  );
}
