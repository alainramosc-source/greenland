'use client';
import { Settings, Plus, Edit3, Save, X, ToggleLeft, ToggleRight, Users, Package, Phone } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MaterialSettingsView({
  materialTypes,
  suppliers,
  newMaterial,
  setNewMaterial,
  editingMaterial,
  setEditingMaterial,
  newSupplier,
  setNewSupplier,
  editingSupplier,
  setEditingSupplier,
  showAddMaterial,
  setShowAddMaterial,
  showAddSupplier,
  setShowAddSupplier,
  handleAddMaterial,
  handleUpdateMaterial,
  handleToggleMaterial,
  handleAddSupplier,
  handleUpdateSupplier,
  handleToggleSupplier,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-[fadeIn_0.3s_ease]">
      {/* Material Types Management Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" /> Catálogo de Materiales y Precios
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Define materiales reciclables y sus precios sugeridos de compra por kg</p>
          </div>

          <button
            onClick={() => setShowAddMaterial(!showAddMaterial)}
            className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200/80 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus size={15} /> Nuevo Material
          </button>
        </div>

        {/* Add Material Expandable Form */}
        {showAddMaterial && (
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3 animate-[slideDown_0.2s_ease]">
            <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">Agregar Nuevo Tipo de Material</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre del Material *</label>
                <input
                  type="text"
                  value={newMaterial.name}
                  onChange={e => setNewMaterial(m => ({ ...m, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500 bg-white"
                  placeholder="Ej. Cartón, PET Transparente..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Precio Compra / KG ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newMaterial.buy_price_per_kg}
                  onChange={e => setNewMaterial(m => ({ ...m, buy_price_per_kg: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500 bg-white font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddMaterial(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddMaterial}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none cursor-pointer shadow-sm"
              >
                Guardar Material
              </button>
            </div>
          </div>
        )}

        {/* Materials Table List */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
          {materialTypes.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No hay materiales registrados aún.</p>
          ) : (
            materialTypes.map(m => {
              const isEditing = editingMaterial?.id === m.id;

              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingMaterial.name}
                        onChange={e => setEditingMaterial(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editingMaterial.buy_price_per_kg}
                          onChange={e => setEditingMaterial(prev => ({ ...prev, buy_price_per_kg: e.target.value }))}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none"
                        />
                        <button
                          onClick={() => handleUpdateMaterial(m.id, {
                            name: editingMaterial.name,
                            buy_price_per_kg: parseFloat(editingMaterial.buy_price_per_kg) || 0
                          })}
                          className="p-1.5 bg-emerald-600 text-white rounded-xl cursor-pointer border-none"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingMaterial(null)}
                          className="p-1.5 bg-slate-200 text-slate-600 rounded-xl cursor-pointer border-none"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className={`font-bold text-sm block ${m.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {m.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600">
                          ${fmt(m.buy_price_per_kg)} <span className="text-[10px] text-slate-400 font-normal">/ kg compra</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMaterial(m.id, m.is_active)}
                          className={`p-1.5 rounded-xl cursor-pointer border-none transition-colors ${
                            m.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={m.is_active ? 'Desactivar material' : 'Activar material'}
                        >
                          {m.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <button
                          onClick={() => setEditingMaterial(m)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer border-none transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Suppliers Management Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Directorio de Proveedores
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Directorio de recolectores y proveedores habituales de material</p>
          </div>

          <button
            onClick={() => setShowAddSupplier(!showAddSupplier)}
            className="px-3.5 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/80 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus size={15} /> Nuevo Proveedor
          </button>
        </div>

        {/* Add Supplier Expandable Form */}
        {showAddSupplier && (
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3 animate-[slideDown_0.2s_ease]">
            <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Agregar Nuevo Proveedor / Recolector</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500 bg-white"
                  placeholder="Ej. Pedro Morales, Chatarra Don Chuy..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={e => setNewSupplier(s => ({ ...s, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500 bg-white font-mono"
                  placeholder="33 1234 5678"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddSupplier(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSupplier}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs border-none cursor-pointer shadow-sm"
              >
                Guardar Proveedor
              </button>
            </div>
          </div>
        )}

        {/* Suppliers Table List */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
          {suppliers.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No hay proveedores registrados aún.</p>
          ) : (
            suppliers.map(s => {
              const isEditing = editingSupplier?.id === s.id;

              return (
                <div key={s.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingSupplier.name}
                        onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingSupplier.phone || ''}
                          onChange={e => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono outline-none"
                          placeholder="Teléfono"
                        />
                        <button
                          onClick={() => handleUpdateSupplier(s.id, {
                            name: editingSupplier.name,
                            phone: editingSupplier.phone
                          })}
                          className="p-1.5 bg-blue-600 text-white rounded-xl cursor-pointer border-none"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingSupplier(null)}
                          className="p-1.5 bg-slate-200 text-slate-600 rounded-xl cursor-pointer border-none"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className={`font-bold text-sm block ${s.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {s.name}
                        </span>
                        {s.phone && (
                          <span className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-slate-400" /> {s.phone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSupplier(s.id, s.is_active)}
                          className={`p-1.5 rounded-xl cursor-pointer border-none transition-colors ${
                            s.is_active ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={s.is_active ? 'Desactivar proveedor' : 'Activar proveedor'}
                        >
                          {s.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <button
                          onClick={() => setEditingSupplier(s)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer border-none transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
