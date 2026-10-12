'use client';
import { X, Edit3, Check, Loader2 } from 'lucide-react';

export default function EditMovementModal({
  editingMovementModal,
  setEditingMovementModal,
  editMovementForm,
  setEditMovementForm,
  submittingEditMovement,
  handleSaveMovementEdit,
  materialTypes,
}) {
  if (!editingMovementModal) return null;
  const isCompra = editingMovementModal.type === 'compra';

  return (
    <div className="fixed inset-[#0] z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Editar Movimiento</h3>
              <p className="text-xs text-slate-300">Folio: {editingMovementModal.number} ({isCompra ? 'Compra' : 'Venta'})</p>
            </div>
          </div>
          <button
            onClick={() => setEditingMovementModal(null)}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Material *</label>
            <select
              value={editMovementForm.material_type_id}
              onChange={e => setEditMovementForm(f => ({ ...f, material_type_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Selecciona material...</option>
              {materialTypes.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cantidad KG *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={editMovementForm.quantity_kg}
                onChange={e => setEditMovementForm(f => ({ ...f, quantity_kg: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Precio / KG ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editMovementForm.price_per_kg}
                onChange={e => setEditMovementForm(f => ({ ...f, price_per_kg: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isCompra ? 'Proveedor' : 'Comprador'}
            </label>
            <input
              type="text"
              value={editMovementForm.who}
              onChange={e => setEditMovementForm(f => ({ ...f, who: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notas</label>
            <textarea
              value={editMovementForm.notes}
              onChange={e => setEditMovementForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-blue-500 bg-white resize-none"
              rows={2}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setEditingMovementModal(null)}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMovementEdit}
              disabled={submittingEditMovement}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingEditMovement ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
