'use client';
import { ShoppingCart, Users, Weight, DollarSign, Loader2, Check, Sparkles, Scale, Info } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function MaterialPurchaseView({
  activeMaterials,
  filteredSuppliers,
  purchaseForm,
  setPurchaseForm,
  supplierSearch,
  setSupplierSearch,
  showSupplierDropdown,
  setShowSupplierDropdown,
  submittingPurchase,
  purchaseTotal,
  handleMaterialChange,
  handleSupplierSelect,
  handleSubmitPurchase,
  activeBuyer,
  setActiveBuyer,
  setShowBuyerPinModal,
  setBuyerPinInput,
  setBuyerModalError,
  setPendingPurchaseAction,
  purchases,
}) {
  const selectedMaterial = activeMaterials.find(m => m.id === purchaseForm.material_type_id);

  // Today's summary stats
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayPurchases = purchases.filter(p => p.created_at?.startsWith(todayStr));
  const todayTotal = todayPurchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const todayKg = todayPurchases.reduce((s, p) => s + Number(p.quantity_kg || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.3s_ease]">
      {/* Left Form Terminal */}
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Terminal Header & Buyer Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <ShoppingCart size={20} />
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Terminal de Recepción / Compra</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Ingresa el material, peso recibido y precio por kg del proveedor</p>
          </div>

          {/* Buyer Identity Badge */}
          {activeBuyer ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-emerald-800 shadow-xs">
              <Users size={16} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-600 uppercase font-extrabold block leading-tight">Comprador</span>
                <span className="text-slate-900 truncate block font-bold">{activeBuyer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveBuyer(null)}
                className="text-slate-400 hover:text-slate-700 underline bg-transparent border-none cursor-pointer text-[10px] ml-1 shrink-0"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBuyerPinInput('');
                setBuyerModalError('');
                setPendingPurchaseAction(false);
                setShowBuyerPinModal(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-2xl border-none cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-slate-900/10 active:scale-95 shrink-0"
            >
              <Users size={15} className="text-emerald-400" /> Identificar Comprador (PIN)
            </button>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-5">
          {/* Material Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo de Material <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <select
                value={purchaseForm.material_type_id}
                onChange={e => handleMaterialChange(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white cursor-pointer transition-all shadow-xs"
              >
                <option value="">Selecciona un tipo de material...</option>
                {activeMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — ${fmt(m.buy_price_per_kg)} / kg
                  </option>
                ))}
              </select>
            </div>
            {selectedMaterial && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 p-2.5 rounded-xl mt-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" /> Precio base de compra sugerido: <strong>${fmt(selectedMaterial.buy_price_per_kg)} MXN/kg</strong>
              </p>
            )}
          </div>

          {/* Supplier Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Proveedor o Vendedor
            </label>
            <div className="relative">
              <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={supplierSearch}
                onChange={e => {
                  setSupplierSearch(e.target.value);
                  setPurchaseForm(f => ({ ...f, supplier_name: e.target.value }));
                  setShowSupplierDropdown(true);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white transition-all shadow-xs"
                placeholder="Ej. Público en General, Chatarrería Don Luis..."
              />
            </div>
            {showSupplierDropdown && filteredSuppliers.length > 0 && (
              <div className="absolute z-30 w-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filteredSuppliers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => handleSupplierSelect(s.name)}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 cursor-pointer border-none bg-transparent flex items-center justify-between transition-colors"
                  >
                    <span className="font-bold text-slate-800">{s.name}</span>
                    {s.phone && <span className="text-[11px] text-slate-400 font-mono">{s.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Weight + Price Per KG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Peso Recibido (KG) <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <Weight size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={purchaseForm.quantity_kg}
                  onChange={e => setPurchaseForm(f => ({ ...f, quantity_kg: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-base font-mono font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white transition-all shadow-xs"
                  placeholder="0.000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Precio Pago por KG ($) <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseForm.price_per_kg}
                  onChange={e => setPurchaseForm(f => ({ ...f, price_per_kg: e.target.value }))}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 text-base font-mono font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white transition-all shadow-xs"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas u Observaciones (opcional)
            </label>
            <textarea
              value={purchaseForm.notes}
              onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white resize-none shadow-xs"
              rows={2}
              placeholder="Detalles sobre impurezas, tara, báscula utilizada..."
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitPurchase}
            disabled={submittingPurchase}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm border-none cursor-pointer shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {submittingPurchase ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            Registrar Compra y Generar Ticket
          </button>
        </div>
      </div>

      {/* Right Column: Live Summary & Daily Stats */}
      <div className="space-y-6">
        {/* Ticket Amount Preview Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-700/50 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cálculo en Tiempo Real</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Báscula Activa
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Material Seleccionado</span>
              <span className="font-bold text-white text-sm">
                {selectedMaterial?.name || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Proveedor / Vendedor</span>
              <span className="font-semibold text-slate-200">{purchaseForm.supplier_name || 'Público en General'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Kilos Recibidos</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{fmtKg(purchaseForm.quantity_kg)} kg</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Precio Unitario</span>
              <span className="font-mono font-bold text-slate-200">${fmt(purchaseForm.price_per_kg)} / kg</span>
            </div>

            <div className="pt-4 border-t border-slate-700/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MONTO TOTAL A PAGAR</span>
              <div className="text-4xl font-black text-emerald-400 font-mono tracking-tight">
                ${fmt(purchaseTotal)} <span className="text-xs text-emerald-500 font-semibold">MXN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Purchases Summary */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumen de Compras (Hoy)</h3>
            <span className="text-xs font-bold text-slate-500 font-mono">{todayStr}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tickets procesados hoy</span>
              <span className="font-black text-slate-900 text-sm">{todayPurchases.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total KG acumulado hoy</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{fmtKg(todayKg)} kg</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Efectivo entregado a proveedores</span>
              <span className="font-mono font-black text-red-600 text-sm">${fmt(todayTotal)} MXN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
