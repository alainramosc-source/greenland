'use client';
import React from 'react';
import { Package, Plus, Minus, Trash2, Warehouse, Search, Loader2 } from 'lucide-react';
import { PRODUCT_WEIGHTS } from '@/hooks/useOrderDetail';

export default function OrderItemsCard({
  order,
  isAdmin,
  isSuperAdmin,
  warehouses,
  warehouseStock,
  editingItems,
  setEditingItems,
  editingPrices,
  setEditingPrices,
  handleAssignWarehouse,
  handleUpdateQuantity,
  handleDeleteItem,
  handleUpdatePrice,
  showAddProduct,
  setShowAddProduct,
  productSearch,
  setProductSearch,
  availableProducts,
  handleAddProduct,
  actionLoading
}) {
  if (!order || !order.order_items) return null;

  const totalPieces = order.order_items.reduce((sum, item) => sum + (editingItems[item.id] ?? item.quantity), 0);
  const totalWeight = order.order_items.reduce((sum, item) => {
    const w = PRODUCT_WEIGHTS[item.products?.sku] || 0;
    const qty = editingItems[item.id] ?? item.quantity;
    return sum + (w * qty);
  }, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Artículos del Pedido</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {order.order_items.length} modelos distintos en este pedido
            </p>
          </div>
        </div>

        {/* Admin Add Product Toggle */}
        {isAdmin && order.status === 'pending' && (
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-blue-200 dark:border-blue-800"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddProduct ? 'Cerrar Buscador' : 'Agregar Producto'}</span>
          </button>
        )}
      </div>

      {/* Admin Add Product Inline Search Panel */}
      {isAdmin && showAddProduct && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar producto por SKU o nombre..."
              className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {availableProducts.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {availableProducts.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-100 dark:border-slate-800" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">
                        {p.sku}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">SKU: {p.sku} · Stock General: {p.stock_quantity}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddProduct(p)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Producto</th>
              {isAdmin && <th className="py-3 px-4">Bodega de Salida</th>}
              <th className="py-3 px-4 text-center">Cantidad</th>
              <th className="py-3 px-4 text-right">P. Unitario</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
              {isAdmin && order.status === 'pending' && <th className="py-3 px-4 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {order.order_items.map((item) => {
              const currentQty = editingItems[item.id] ?? item.quantity;
              const currentPrice = editingPrices[item.id] ?? item.unit_price;
              const subtotal = currentQty * currentPrice;
              const isQtyLoading = actionLoading === `qty-${item.id}`;
              const isPriceLoading = actionLoading === `price-${item.id}`;
              const isDelLoading = actionLoading === `del-${item.id}`;

              return (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Product Column */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {item.products?.image_url ? (
                        <img src={item.products.image_url} alt={item.products.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                          {item.products?.sku || 'PROD'}
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white leading-snug">{item.products?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">SKU: {item.products?.sku}</span>
                          {PRODUCT_WEIGHTS[item.products?.sku] > 0 && (
                            <span className="text-[10px] font-semibold text-slate-400">· {PRODUCT_WEIGHTS[item.products?.sku]} kg/ud</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Warehouse Selector (Admin Only) */}
                  {isAdmin && (
                    <td className="py-3.5 px-4">
                      {order.status === 'pending' || order.status === 'confirmed' ? (
                        <div className="space-y-1">
                          <select
                            value={item.warehouse_id || ''}
                            onChange={(e) => handleAssignWarehouse(item.id, e.target.value)}
                            className="w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="">Seleccionar bodega...</option>
                            {warehouses.map(wh => {
                              const ws = warehouseStock[item.product_id]?.[wh.id];
                              const avail = ws ? (ws.stock_quantity - ws.reserved_quantity) : 0;
                              return (
                                <option key={wh.id} value={wh.id}>
                                  {wh.name} (Disp: {avail})
                                </option>
                              );
                            })}
                          </select>
                          {!item.warehouse_id && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">⚠️ Requerido</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Warehouse className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {warehouses.find(w => w.id === item.warehouse_id)?.name || 'Sin asignar'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Quantity Column */}
                  <td className="py-3.5 px-4 text-center">
                    {isAdmin && order.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            const newQty = Math.max(0, currentQty - 1);
                            setEditingItems(prev => ({ ...prev, [item.id]: newQty }));
                            handleUpdateQuantity(item.id, newQty);
                          }}
                          disabled={isQtyLoading}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          value={currentQty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            setEditingItems(prev => ({ ...prev, [item.id]: raw }));
                          }}
                          onBlur={() => {
                            const raw = editingItems[item.id];
                            if (raw !== undefined) {
                              const newQty = parseInt(raw) || item.quantity;
                              handleUpdateQuantity(item.id, newQty);
                            }
                          }}
                          className="w-12 text-center text-xs font-extrabold py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const newQty = currentQty + 1;
                            setEditingItems(prev => ({ ...prev, [item.id]: newQty }));
                            handleUpdateQuantity(item.id, newQty);
                          }}
                          disabled={isQtyLoading}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{item.quantity}</span>
                    )}
                  </td>

                  {/* Unit Price Column */}
                  <td className="py-3.5 px-4 text-right">
                    {isSuperAdmin && order.status === 'pending' ? (
                      <input
                        type="text"
                        value={currentPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          setEditingPrices(prev => ({ ...prev, [item.id]: raw }));
                        }}
                        onBlur={() => {
                          const raw = editingPrices[item.id];
                          if (raw !== undefined) {
                            const newPrice = parseFloat(raw);
                            handleUpdatePrice(item.id, newPrice);
                          }
                        }}
                        className="w-20 text-right text-xs font-black py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    ) : (
                      <span className="font-bold text-slate-700 dark:text-slate-300">${Number(item.unit_price).toFixed(2)}</span>
                    )}
                  </td>

                  {/* Subtotal Column */}
                  <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                    ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Admin Actions Column */}
                  {isAdmin && order.status === 'pending' && (
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDelLoading}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar producto del pedido"
                      >
                        {isDelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Bar (Weight and Pieces) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div>
            <span>Total Piezas: </span>
            <strong className="text-slate-900 dark:text-white font-black text-sm">{totalPieces} pcs</strong>
          </div>
          <div>
            <span>Peso Total Estimado: </span>
            <strong className="text-slate-900 dark:text-white font-black text-sm">{totalWeight.toFixed(1)} kg</strong>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total del Pedido</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            ${Number(order.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
