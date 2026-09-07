'use client';
import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Edit3, Package } from 'lucide-react';

export default function CartSection({
  saleItems = [],
  updateItemQuantity,
  updateItemPrice,
  removeItem,
  resetSale,
  selectedWarehouse,
  getAvailableStock
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Header & Cart Counter */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-[#6a9a04]" />
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Productos en Carrito
          </h2>
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] text-xs font-black">
            {saleItems.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </div>

        {saleItems.length > 0 && (
          <button
            onClick={resetSale}
            className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
            title="Vaciar carrito"
          >
            <Trash2 size={13} />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {/* Cart Content Table or Empty State */}
      {saleItems.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-300">
            <ShoppingCart size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">El carrito está vacío</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
              Busca productos arriba o escanea un código de barras para iniciar la venta.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Producto</th>
                <th className="py-2.5 px-3 text-center">Precio U.</th>
                <th className="py-2.5 px-3 text-center">Cantidad</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {saleItems.map(item => {
                const available = getAvailableStock(item.product_id, selectedWarehouse);
                const isMax = item.quantity >= available;
                const subtotal = item.quantity * item.unit_price;

                return (
                  <tr key={item.product_id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Item Details */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={14} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 line-clamp-1">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                        </div>
                      </div>
                    </td>

                    {/* Unit Price (Editable) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 focus-within:border-[#6a9a04]">
                        <span className="text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(item.product_id, e.target.value)}
                          className="w-16 bg-transparent text-xs font-bold text-slate-900 focus:outline-none text-right"
                        />
                      </div>
                    </td>

                    {/* Quantity Controls */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={available}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.product_id, e.target.value)}
                          className="w-10 bg-transparent text-xs font-black text-slate-900 text-center focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                          disabled={isMax}
                          className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Line Subtotal */}
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                      ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Delete Item */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
