'use client';
import { QUANTITY_UNITS, fmtMoney, round2 } from '@/hooks/useQuotationForm';
import { Search, Plus, Trash2, GripVertical, Package, Loader2, ImageOff } from 'lucide-react';

export default function QuotationItemsSection({
  activeBrand,
  items,
  currency,
  includesIva,
  totals,
  productSearch,
  productResults,
  showProductDropdown,
  setShowProductDropdown,
  searchLoading,
  searchContainerRef,
  handleProductSearch,
  addProductFromSearch,
  addCustomItem,
  updateItem,
  removeItem,
}) {
  return (
    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5">
      {/* Header + Add Custom button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${activeBrand.color}15`, color: activeBrand.color }}
          >
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 m-0">
              4. Productos y Servicios Cotizados
            </h3>
            <p className="text-[11px] text-slate-400 m-0">
              {items.length} {items.length === 1 ? 'concepto agregado' : 'conceptos agregados'}
            </p>
          </div>
        </div>
        <button
          onClick={addCustomItem}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:border-[#6a9a04] hover:text-[#6a9a04] hover:bg-[#6a9a04]/5 transition-all cursor-pointer bg-white"
        >
          <Plus className="w-4 h-4" />
          Agregar concepto libre / servicio
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => handleProductSearch(e.target.value)}
            onFocus={() => { if (productResults.length > 0) setShowProductDropdown(true); }}
            placeholder="Buscar en catálogo por código SKU (ej. GL01, GL43) o nombre del producto..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/50 focus:bg-white"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>

        {/* Search results dropdown */}
        {showProductDropdown && productResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
            {productResults.map(p => (
              <button
                key={p.id}
                onClick={() => addProductFromSearch(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left cursor-pointer bg-transparent border-0 border-b border-b-slate-100 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60">
                  <img
                    src={`/productos/${p.sku}-P1.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (e.target.src.endsWith('.jpg')) {
                        e.target.src = e.target.src.replace(/\.jpg$/, '.png');
                      } else {
                        e.target.style.display = 'none';
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML = '<span class="text-slate-400 text-xs">—</span>';
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded whitespace-nowrap">
                    {p.sku}
                  </span>
                  <span className="text-sm text-slate-800 font-semibold truncate">{p.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {showProductDropdown && productResults.length === 0 && productSearch.length >= 2 && !searchLoading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 text-center text-sm text-slate-500">
            No se encontraron productos en el catálogo
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30">
          <Package className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm text-slate-600 font-bold m-0">Sin productos en la cotización</p>
          <p className="text-xs text-slate-400 mt-1 m-0">
            Busca un producto arriba por SKU o agrega un concepto libre
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.tempId}
              className="border border-slate-200/90 rounded-xl p-3.5 hover:border-slate-300 transition-all bg-slate-50/30"
            >
              <div className="flex gap-3.5 items-start">
                {/* Drag handle + Image */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                  {item.image_url ? (
                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border border-slate-200 shadow-xs">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.retried && /\.jpg$/i.test(img.src)) {
                            img.dataset.retried = '1';
                            img.src = img.src.replace(/\.jpg$/i, '.png');
                          } else {
                            img.style.display = 'none';
                            if (img.nextSibling) img.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="w-full h-full items-center justify-center hidden">
                        <ImageOff className="w-5 h-5 text-slate-300" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border border-dashed border-slate-200 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Item fields */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                    {item.sku && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                        style={{
                          color: activeBrand.color,
                          backgroundColor: `${activeBrand.color}15`,
                        }}
                      >
                        {item.sku}
                      </span>
                    )}
                    {item.isCustom && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                        Concepto Libre
                      </span>
                    )}
                  </div>

                  {/* Responsive row: Name, Description, Unit Price, Qty, Unit, Total */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end">
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Nombre del Producto</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.tempId, 'name', e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs font-semibold text-slate-800 transition-all"
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Descripción / Especificaciones</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                        placeholder="Dimensiones, color o detalles..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs text-slate-700 transition-all"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Precio Unitario</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.tempId, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs font-bold text-slate-800 transition-all"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Cant.</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, 'quantity', e.target.value)}
                        min="1"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs font-bold text-slate-800 text-center transition-all"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Unidad</label>
                      <select
                        value={item.quantity_unit}
                        onChange={(e) => updateItem(item.tempId, 'quantity_unit', e.target.value)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-xs font-medium text-slate-700 transition-all cursor-pointer"
                      >
                        {QUANTITY_UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Importe</label>
                      <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-900 text-right whitespace-nowrap">
                        {fmtMoney(round2(Number(item.unit_price || 0) * Number(item.quantity || 0)), currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => removeItem(item.tempId)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer bg-transparent border-0"
                  title="Eliminar concepto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals Summary */}
      {items.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-full sm:w-80 space-y-2">
            <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Subtotal</span>
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap">{fmtMoney(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">IVA (16%)</span>
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {includesIva ? 'Incluido en precios' : fmtMoney(totals.ivaAmount, currency)}
              </span>
            </div>
            <div
              className="flex justify-between items-center px-4 py-3 rounded-xl text-white font-black shadow-sm"
              style={{ backgroundColor: activeBrand.color }}
            >
              <span className="text-xs uppercase tracking-wider">Total {currency}</span>
              <span className="text-lg whitespace-nowrap">{fmtMoney(totals.total, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
