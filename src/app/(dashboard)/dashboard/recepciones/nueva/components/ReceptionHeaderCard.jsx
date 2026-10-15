'use client';
import { Container, Calendar, Warehouse, User, FileText, AlertTriangle } from 'lucide-react';

export default function ReceptionHeaderCard({
  form,
  setForm,
  suppliers,
  purchaseOrders,
  warehouses,
  distributors,
  isFinalReception,
  setIsFinalReception,
  handlePOChange,
  handleWarehouseChange,
  isCompleted,
  isAuthorized,
}) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
          <Container size={18} className="text-[#6a9a04]" /> Datos Generales de la Llegada
        </h3>
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          💡 Para contenedores en Full puedes capturar ambos números separados con una diagonal ( / )
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
              setForm((f) => ({ ...f, supplier_id: sid, purchase_order_id: '' }));
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

        {/* PO Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Orden de Compra (opcional)</label>
          <select
            value={form.purchase_order_id}
            onChange={(e) => handlePOChange(e.target.value)}
            disabled={isCompleted || !form.supplier_id}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60 font-medium"
          >
            <option value="">{form.supplier_id ? '— Sin PO vinculada —' : '— Selecciona proveedor primero —'}</option>
            {purchaseOrders
              .filter((po) => !form.supplier_id || po.supplier_id === form.supplier_id)
              .map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — {po.supplier_name || 'Sin proveedor'} ({po.status})
                </option>
              ))}
          </select>
          {form.purchase_order_id && (
            <div className="mt-2.5 flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2">
              <input
                type="checkbox"
                id="isFinalReception"
                checked={isFinalReception}
                onChange={(e) => setIsFinalReception(e.target.checked)}
                disabled={isCompleted}
                className="w-4 h-4 accent-[#6a9a04] rounded cursor-pointer"
              />
              <label htmlFor="isFinalReception" className="text-xs text-amber-900 font-bold cursor-pointer select-none">
                Esta es la última recepción / Cerrar Orden de Compra (PO)
              </label>
            </div>
          )}
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

        {/* Container Label (Supports Full / multiple containers) */}
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
