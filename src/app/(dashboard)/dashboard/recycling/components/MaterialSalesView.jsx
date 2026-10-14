'use client';
import { Send, Plus, Trash2, Users, Package, TrendingUp, DollarSign, Loader2, Info, AlertTriangle } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function MaterialSalesView({
  activeMaterials = [],
  stockByMaterial = {},
  multiSaleBuyer = '',
  setMultiSaleBuyer,
  multiSaleNotes = '',
  setMultiSaleNotes,
  multiSaleRows = [],
  submittingMultiSale = false,
  multiSaleSummary = { totalKg: 0, totalRevenue: 0, totalCogs: 0, grossProfit: 0 },
  handleAddSaleRow,
  handleRemoveSaleRow,
  handleSaleRowChange,
  handleSubmitMultiSale,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.3s_ease]">
      {/* Main Multi-Material Sale Form Terminal */}
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <Send size={20} />
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Venta Multi-Material / Multi-Calidad</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Registra salidas de inventario consolidadas en un solo ticket con precios independientes</p>
          </div>

          <span className="text-xs font-extrabold px-3 py-1.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            Ticket Consolidado
          </span>
        </div>

        {/* Buyer & Notes Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Comprador o Empresa Destino <span className="text-blue-600">*</span>
            </label>
            <div className="relative">
              <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={multiSaleBuyer}
                onChange={e => setMultiSaleBuyer(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white transition-all shadow-xs"
                placeholder="Ej. Siderúrgica del Norte, Fundición Ramos..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas o Folio Externo (opcional)
            </label>
            <input
              type="text"
              value={multiSaleNotes}
              onChange={e => setMultiSaleNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white transition-all shadow-xs"
              placeholder="Ej. Factura #402, Chofer Don Pedro..."
            />
          </div>
        </div>

        {/* Rows Builder Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Desglose de Materiales y Precios de Venta <span className="text-blue-600">*</span>
            </label>
            <button
              type="button"
              onClick={handleAddSaleRow}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200/80 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus size={15} /> Agregar Renglón
            </button>
          </div>

          {/* Rows List */}
          <div className="space-y-3">
            {(multiSaleRows || []).map((row, index) => {
              const matStock = (stockByMaterial || {})[row.material_type_id];
              const availKg = matStock ? (matStock.purchased_kg - matStock.sold_kg) : 0;
              const rowSubtotal = (parseFloat(row.quantity_kg) || 0) * (parseFloat(row.price_per_kg) || 0);
              const isOverStock = (parseFloat(row.quantity_kg) || 0) > availKg;

              return (
                <div key={row.id} className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isOverStock ? 'bg-red-50/70 border-red-200' : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-200/60 pb-2">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      Renglón #{index + 1}
                    </span>
                    {multiSaleRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSaleRow(row.id)}
                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer flex items-center gap-1 text-xs font-bold"
                      >
                        <Trash2 size={14} /> Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Material Selector */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Material Base *</label>
                      <select
                        value={row.material_type_id}
                        onChange={e => handleSaleRowChange(row.id, 'material_type_id', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500 bg-white cursor-pointer"
                      >
                        <option value="">Selecciona material...</option>
                        {(activeMaterials || []).map(m => {
                          const stock = (stockByMaterial || {})[m.id];
                          const kgs = stock ? (stock.purchased_kg - stock.sold_kg) : 0;
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} — (Disponibles: {fmtKg(kgs)} kg)
                            </option>
                          );
                        })}
                      </select>
                      {row.material_type_id && (
                        <p className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${isOverStock ? 'text-red-600' : 'text-slate-500'}`}>
                          {isOverStock && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                          Stock disponible en almacén: <strong>{fmtKg(availKg)} kg</strong>
                        </p>
                      )}
                    </div>

                    {/* Quality / Reclassification note */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Detalle / Calidad (opcional)</label>
                      <input
                        type="text"
                        value={row.condition}
                        onChange={e => handleSaleRowChange(row.id, 'condition', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500 bg-white"
                        placeholder="Ej. Limpio, Sucio, Residuos, Mezclado..."
                      />
                    </div>

                    {/* Quantity KG */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cantidad KG *</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={row.quantity_kg}
                        onChange={e => handleSaleRowChange(row.id, 'quantity_kg', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
                        placeholder="0.000"
                      />
                    </div>

                    {/* Price per KG */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Venta / KG ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.price_per_kg}
                        onChange={e => handleSaleRowChange(row.id, 'price_per_kg', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Subtotal Preview */}
                    <div className="lg:col-span-2 flex items-center justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal Renglón</span>
                        <span className="text-base font-black text-blue-600 font-mono">${fmt(rowSubtotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddSaleRow}
            className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl text-slate-500 hover:text-blue-600 text-xs font-bold bg-transparent cursor-pointer transition-all mt-2 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Agregar Otro Material / Calidad a esta Venta
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitMultiSale}
          disabled={submittingMultiSale}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm border-none cursor-pointer shadow-xl shadow-blue-500/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5"
        >
          {submittingMultiSale ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          Registrar Venta Consolidada ({multiSaleRows.length} Renglón{multiSaleRows.length > 1 ? 'es' : ''})
        </button>
      </div>

      {/* Right Column: Ticket Summary & Cogs/Profit Preview */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-700/50 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumen Ticket de Venta</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Venta Externa
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Comprador Destino</span>
              <span className="font-bold text-white text-sm">{multiSaleBuyer.trim() || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Renglones Incluidos</span>
              <span className="font-bold text-slate-200">{multiSaleRows.length}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Total Kilos Salientes</span>
              <span className="font-mono font-bold text-blue-400 text-sm">{fmtKg(multiSaleSummary.totalKg)} kg</span>
            </div>

            <div className="border-t border-slate-700/80 pt-3 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Costo Adquisición (COGS)</span>
                <span className="font-mono">${fmt(multiSaleSummary.totalCogs)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Utilidad Bruta Estimada</span>
                <span className={`font-mono font-bold ${multiSaleSummary.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${fmt(multiSaleSummary.grossProfit)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TOTAL A COBRAR</span>
              <div className="text-4xl font-black text-blue-400 font-mono tracking-tight">
                ${fmt(multiSaleSummary.totalRevenue)} <span className="text-xs text-blue-500 font-semibold">MXN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-3xl p-5 text-xs text-blue-900 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-extrabold text-blue-800">
            <Info size={16} className="text-blue-600" />
            <span>Re-clasificación de Materiales</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-800/90">
            Puedes vender un mismo material base en distintos renglones especificando calidades o grados de impureza diferenciados. El sistema descontará el peso total acumulado del stock del almacén.
          </p>
        </div>
      </div>
    </div>
  );
}
