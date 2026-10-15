'use client';
import { useState } from 'react';
import { Container, Calendar, Warehouse, User, FileText, Plus, Trash2, X, CheckSquare, Square } from 'lucide-react';

export default function ReceptionHeaderCard({
  form,
  setForm,
  suppliers,
  purchaseOrders,
  warehouses,
  distributors,
  linkedPOs,
  addSecondaryPO,
  removeLinkedPO,
  togglePOFinal,
  handlePOChange,
  handleWarehouseChange,
  isCompleted,
  isAuthorized,
}) {
  const [showAddSecondary, setShowAddSecondary] = useState(false);
  const [secondarySelectedId, setSecondarySelectedId] = useState('');

  // Available POs for linking as secondary (exclude already linked ones)
  const availableSecondaryPOs = purchaseOrders.filter(
    (po) => !linkedPOs.some((lp) => lp.id === po.id)
  );

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-7 mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-2">
        <h3 className="text-lg font-black text-slate-900 m-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6a9a04]/10 text-[#6a9a04] flex items-center justify-center shrink-0">
            <Container size={18} />
          </div>
          <span>Datos Generales de la Llegada</span>
        </h3>
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          💡 Para Full: puedes capturar ambos contenedores, pedimentos y vincular 2 Órdenes de Compra (POs)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Proveedor *</label>
          <select
            value={form.supplier_id}
            onChange={(e) => {
              const sid = e.target.value;
              setForm((f) => ({ ...f, supplier_id: sid }));
            }}
            disabled={isCompleted}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-medium"
          >
            <option value="">— Seleccionar Proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short_name}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Warehouse */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-slate-700">Bodega Principal / Predeterminada *</label>
            <span className="text-[11px] text-[#6a9a04] font-bold">Por defecto para partidas</span>
          </div>
          <select
            value={form.warehouse_id}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            disabled={isCompleted}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#6a9a04] rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-bold"
          >
            <option value="">— Seleccionar Bodega Predeterminada —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1 m-0">
            Todas las partidas asumirán esta bodega automáticamente. Solo cambia la bodega abajo para las que fueron a otra sucursal.
          </p>
        </div>

        {/* Multi-PO Section (Full Width or 2-col) */}
        <div className="md:col-span-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Órdenes de Compra Vinculadas (PO)
              </span>
              <p className="text-[11px] text-slate-400 m-0">
                Al vincular las POs se cargarán sus partidas y se resolverán sus tránsitos correspondientes.
              </p>
            </div>
            {linkedPOs.length === 1 && !isCompleted && !showAddSecondary && (
              <button
                type="button"
                onClick={() => setShowAddSecondary(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6a9a04]/10 hover:bg-[#6a9a04]/20 text-[#6a9a04] text-xs font-bold rounded-xl border border-[#6a9a04]/30 cursor-pointer transition-all"
              >
                <Plus size={14} /> Vincular 2ª Orden de Compra (Full / 2º Contenedor)
              </button>
            )}
          </div>

          {/* Primary PO selector if none linked yet */}
          {linkedPOs.length === 0 && (
            <div>
              <select
                value={form.purchase_order_id}
                onChange={(e) => handlePOChange(e.target.value)}
                disabled={isCompleted}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-medium"
              >
                <option value="">— Seleccionar Orden de Compra —</option>
                {purchaseOrders
                  .filter((po) => !form.supplier_id || po.supplier_id === form.supplier_id)
                  .map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} — {po.supplier_name || 'Sin proveedor'} ({po.status})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Linked POs Cards */}
          {linkedPOs.length > 0 && (
            <div className="space-y-2.5">
              {linkedPOs.map((lpo, idx) => (
                <div
                  key={lpo.id}
                  className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        idx === 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {idx === 0 ? 'PO 1 (Principal)' : 'PO 2 (Full / Contenedor 2)'}
                    </span>
                    <div>
                      <span className="font-bold text-sm text-slate-900 mr-2">{lpo.po_number}</span>
                      <span className="text-xs text-slate-500">Proveedor: {lpo.supplier_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Closure Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={lpo.is_final || false}
                        onChange={(e) => togglePOFinal(lpo.id, e.target.checked)}
                        disabled={isCompleted}
                        className="w-4 h-4 accent-[#6a9a04] rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 font-bold">
                        Cerrar Orden de Compra ({lpo.po_number})
                      </span>
                    </label>

                    {/* Unlink button */}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => removeLinkedPO(lpo.id)}
                        className="p-1 text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer transition-colors"
                        title="Desvincular esta PO y sus partidas"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Secondary PO Dropdown */}
          {!isCompleted && showAddSecondary && (
            <div className="mt-3 p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center gap-3 flex-wrap animate-in fade-in duration-200">
              <span className="text-xs font-bold text-purple-900">
                Selecciona la 2ª Orden de Compra (Contenedor 2):
              </span>
              <select
                value={secondarySelectedId}
                onChange={(e) => setSecondarySelectedId(e.target.value)}
                className="flex-1 min-w-[240px] px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                <option value="">— Seleccionar PO para 2º contenedor —</option>
                {availableSecondaryPOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} — {po.supplier_name || 'Sin proveedor'} ({po.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!secondarySelectedId}
                onClick={async () => {
                  await addSecondaryPO(secondarySelectedId);
                  setSecondarySelectedId('');
                  setShowAddSecondary(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                Vincular y Cargar Partidas
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddSecondary(false);
                  setSecondarySelectedId('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Distributor PRO */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Distribuidor PRO (opcional)</label>
          <select
            value={form.distributor_id}
            onChange={(e) => setForm((f) => ({ ...f, distributor_id: e.target.value }))}
            disabled={isCompleted}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-medium"
          >
            <option value="">— Ninguno (Saltillo / Stock Propio) —</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.client_number})
              </option>
            ))}
          </select>
          {!form.distributor_id && form.warehouse_id && (
            <p className="text-[11px] text-slate-400 mt-1 m-0">Sin PRO = solo ingreso a inventario local, sin generar cargo.</p>
          )}
        </div>

        {/* Reception Date */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Recepción *</label>
          <input
            type="date"
            value={form.reception_date}
            onChange={(e) => setForm((f) => ({ ...f, reception_date: e.target.value }))}
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-medium"
          />
        </div>

        {/* Container Label */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Etiqueta del Contenedor / Contenedores
          </label>
          <input
            type="text"
            value={form.container_label}
            onChange={(e) => setForm((f) => ({ ...f, container_label: e.target.value }))}
            placeholder="Ej: TGHU1234567 / TCLU7654321 (Full Saltillo)"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 disabled:opacity-60 font-medium"
          />
        </div>

        {/* Pedimento Number */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Número de Pedimento (o Pedimentos)
          </label>
          <input
            type="text"
            value={form.pedimento_number}
            onChange={(e) => setForm((f) => ({ ...f, pedimento_number: e.target.value }))}
            placeholder="Ej: 26 51 3412 6001234 / 26 51 3412 6009876"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 font-mono disabled:opacity-60 font-medium"
          />
        </div>

        {/* Operation Number */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nº de Operación *</label>
          <input
            type="text"
            value={form.operation_number}
            onChange={(e) => setForm((f) => ({ ...f, operation_number: e.target.value }))}
            placeholder="Ej: Op19"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 font-bold disabled:opacity-60"
          />
        </div>

        {/* Customs Broker Ref */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Ref. Agente Aduanal</label>
          <input
            type="text"
            value={form.customs_broker_ref}
            onChange={(e) => setForm((f) => ({ ...f, customs_broker_ref: e.target.value }))}
            placeholder="Ej: Manzanillo - Agente Grupo Aduanal / Laredo"
            disabled={isCompleted && !isAuthorized}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
