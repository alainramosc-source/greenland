'use client';
import React from 'react';
import { Ship, X, Save, Edit3, CheckCircle, Trash2, Calendar, Plus } from 'lucide-react';

export default function TransitSlideOverPanel({
  transitPanel,
  setTransitPanel,
  products,
  transitShipments,
  manufacturers,
  transitForm,
  setTransitForm,
  editingTransitId,
  editingTransitForm,
  setEditingTransitForm,
  addTransit,
  deleteTransit,
  markTransitArrived,
  startEditTransit,
  cancelEditTransit,
  saveEditTransit,
}) {
  if (!transitPanel) return null;

  const product = products.find(p => p.id === transitPanel);
  const productTransits = transitShipments.filter(t => t.product_id === transitPanel);
  const totalQty = productTransits.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-xs" onClick={() => setTransitPanel(null)} />
      <div
        className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-slate-200"
        style={{ animationDuration: '200ms' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 bg-gradient-to-r from-orange-50 to-amber-50/70">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 m-0">Embarques en Tránsito</h2>
                <p className="text-[11px] text-slate-500 m-0">Programación de llegadas por contenedor</p>
              </div>
            </div>
            <button
              onClick={() => setTransitPanel(null)}
              className="p-2 rounded-xl hover:bg-white/80 cursor-pointer bg-transparent border-none text-slate-400 hover:text-slate-700 transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm font-black text-[#6a9a04] m-0 mt-2">
            {product?.sku} — <span className="text-slate-800 font-bold">{product?.name}</span>
          </p>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Total en tránsito: <span className="font-black text-orange-600">{totalQty.toLocaleString()} uds</span> en {productTransits.length} embarque(s)
          </p>
        </div>

        {/* Shipments list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {productTransits.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Ship className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm text-slate-600 m-0">Sin embarques en tránsito</p>
              <p className="text-xs mt-1 m-0">Agrega un nuevo embarque en el formulario inferior</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productTransits.map(t => {
                const arrParts = t.estimated_arrival.toString().split(/[-T]/);
                const arrDate = new Date(parseInt(arrParts[0]), parseInt(arrParts[1]) - 1, parseInt(arrParts[2]), 12, 0, 0);
                const todayNoon = new Date();
                todayNoon.setHours(12, 0, 0, 0);
                const daysUntil = Math.ceil((arrDate - todayNoon) / (1000 * 60 * 60 * 24));
                const weeksUntil = Math.ceil(daysUntil / 7);
                const isEditing = editingTransitId === t.id;

                return (
                  <div
                    key={t.id}
                    className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 hover:border-orange-300 transition-all space-y-2"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                          Editar Embarque / Fecha de Llegada
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Cantidad</label>
                            <input
                              type="number"
                              value={editingTransitForm.quantity}
                              onChange={e => setEditingTransitForm(f => ({ ...f, quantity: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Fecha llegada</label>
                            <input
                              type="date"
                              value={editingTransitForm.estimated_arrival}
                              onChange={e => setEditingTransitForm(f => ({ ...f, estimated_arrival: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Origen</label>
                            <select
                              value={editingTransitForm.origin}
                              onChange={e => setEditingTransitForm(f => ({ ...f, origin: e.target.value }))}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                            >
                              <option value="">—</option>
                              {manufacturers.map(m => (
                                <option key={m.id} value={m.short_name}>{m.short_name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={cancelEditTransit}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveEditTransit(t.id)}
                            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-xs font-black cursor-pointer border-none shadow-2xs flex items-center gap-1"
                          >
                            <Save size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <span className="text-lg font-black text-slate-900 font-mono">{t.quantity.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 ml-1 font-semibold">uds</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditTransit(t)}
                              title="Editar fecha de llegada / tránsito"
                              className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer bg-white transition-all text-xs"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => markTransitArrived(t.id)}
                              title="Marcar como llegado"
                              className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer bg-white transition-all text-xs"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => deleteTransit(t.id)}
                              title="Eliminar embarque"
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer bg-white transition-all text-xs"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <Calendar size={12} />
                            {arrDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className={`font-bold ${
                            daysUntil <= 0 ? 'text-emerald-600' : daysUntil <= 14 ? 'text-orange-600' : 'text-slate-500'
                          }`}>
                            {daysUntil <= 0 ? '🟢 Llegando' : `${weeksUntil} sem (${daysUntil}d)`}
                          </span>
                        </div>
                        {t.origin && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">
                            {t.origin}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new transit form */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 m-0">Agregar embarque</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad</label>
              <input
                type="number"
                placeholder="500"
                value={transitForm.quantity}
                onChange={e => setTransitForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 bg-white mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha llegada</label>
              <input
                type="date"
                value={transitForm.estimated_arrival}
                onChange={e => setTransitForm(f => ({ ...f, estimated_arrival: e.target.value }))}
                className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 bg-white mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Origen</label>
              <select
                value={transitForm.origin}
                onChange={e => setTransitForm(f => ({ ...f, origin: e.target.value }))}
                className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 bg-white mt-0.5"
              >
                <option value="">—</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.short_name}>{m.short_name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => addTransit(transitPanel)}
            disabled={!transitForm.quantity || !transitForm.estimated_arrival}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 cursor-pointer transition-all border-none disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
          >
            <Plus size={15} /> Agregar Embarque
          </button>
        </div>
      </div>
    </div>
  );
}

