'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Search,
  Layers,
  User,
  FileText,
  DollarSign,
  Package
} from 'lucide-react';

export default function ProBulkSaleModal({
  isOpen,
  onClose,
  targetSkus = [],
  warehouses = [],
  products = [],
  matrix = [],
  proWarehouseId = null,
  onSubmit,
  loading = false
}) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [itemsToSell, setItemsToSell] = useState([]);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search state to add more products inside the modal
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Helper to get available stock from matrix
  const getAvailableStock = (sku, whId) => {
    const row = matrix.find(m => m.sku === sku);
    if (!row) return 0;
    const whStock = row.warehouses?.[whId];
    return whStock ? Math.max(0, whStock.available) : 0;
  };

  // Helper to find product details
  const getProductDetails = (sku) => {
    const prod = products.find(p => p.sku === sku);
    const row = matrix.find(m => m.sku === sku);
    return {
      id: prod?.id || row?.id || row?.productId,
      name: prod?.name || row?.name || sku,
      price: Number(prod?.price || row?.price || 0),
      sku: sku
    };
  };

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSearchProductQuery('');
      setShowSearchResults(false);
      setClientName('');
      setNotes('');

      // Choose warehouse: proWarehouseId > first warehouse
      const whId = proWarehouseId || warehouses[0]?.id || '';
      setSelectedWarehouse(whId);

      // Build initial items from targetSkus
      if (Array.isArray(targetSkus) && targetSkus.length > 0) {
        const initialItems = targetSkus.map(sku => {
          const details = getProductDetails(sku);
          const maxQty = getAvailableStock(sku, whId);
          return {
            id: details.id,
            productId: details.id,
            sku: details.sku,
            name: details.name,
            price: details.price,
            maxQty: maxQty,
            qty: maxQty > 0 ? 1 : 0
          };
        });
        setItemsToSell(initialItems);
      } else {
        setItemsToSell([]);
      }
    }
  }, [isOpen, targetSkus, warehouses, proWarehouseId]);

  // Recalculate max stock if warehouse changes
  useEffect(() => {
    if (!isOpen || !selectedWarehouse) return;
    setItemsToSell(prev => prev.map(item => {
      const maxQty = getAvailableStock(item.sku, selectedWarehouse);
      const currentQty = item.qty === '' ? '' : Math.min(Number(item.qty || 0), maxQty);
      return {
        ...item,
        maxQty,
        qty: currentQty
      };
    }));
  }, [selectedWarehouse, isOpen]);

  // Products available to add via search inside modal
  const searchResults = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    const existingSkus = new Set(itemsToSell.map(i => i.sku));

    return (matrix.length > 0 ? matrix : products)
      .filter(p => {
        if (existingSkus.has(p.sku)) return false;
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesName = (p.name || '').toLowerCase().includes(q);
        return matchesSku || matchesName;
      })
      .slice(0, 6)
      .map(p => {
        const details = getProductDetails(p.sku);
        const maxQty = getAvailableStock(p.sku, selectedWarehouse);
        return {
          ...details,
          maxQty
        };
      });
  }, [searchProductQuery, itemsToSell, matrix, products, selectedWarehouse]);

  if (!isOpen) return null;

  // Add a product from search
  const handleAddProduct = (prod) => {
    const maxQty = getAvailableStock(prod.sku, selectedWarehouse);
    setItemsToSell(prev => [
      ...prev,
      {
        id: prod.id,
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        price: prod.price,
        maxQty,
        qty: maxQty > 0 ? 1 : 0
      }
    ]);
    setSearchProductQuery('');
    setShowSearchResults(false);
  };

  // Remove a product from list
  const handleRemoveProduct = (sku) => {
    setItemsToSell(prev => prev.filter(i => i.sku !== sku));
  };

  // Quantity adjustments
  const handleQtyChange = (sku, val) => {
    if (val === '') {
      setItemsToSell(prev => prev.map(i => i.sku === sku ? { ...i, qty: '' } : i));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        return { ...i, qty: Math.min(Math.max(0, num), i.maxQty) };
      }
      return i;
    }));
  };

  const handleQtyBlur = (sku) => {
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        if (i.qty === '' || i.qty === undefined || isNaN(i.qty)) {
          return { ...i, qty: 0 };
        }
      }
      return i;
    }));
  };

  const handleIncrementQty = (sku) => {
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        const currentQty = Number(i.qty || 0);
        if (currentQty < i.maxQty) {
          return { ...i, qty: currentQty + 1 };
        }
      }
      return i;
    }));
  };

  const handleDecrementQty = (sku) => {
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        const currentQty = Number(i.qty || 0);
        if (currentQty > 0) {
          return { ...i, qty: currentQty - 1 };
        }
      }
      return i;
    }));
  };

  // Price adjustment
  const handlePriceChange = (sku, val) => {
    if (val === '') {
      setItemsToSell(prev => prev.map(i => i.sku === sku ? { ...i, price: '' } : i));
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        return { ...i, price: Math.max(0, num) };
      }
      return i;
    }));
  };

  const handlePriceBlur = (sku) => {
    setItemsToSell(prev => prev.map(i => {
      if (i.sku === sku) {
        if (i.price === '' || i.price === undefined || isNaN(i.price)) {
          return { ...i, price: 0 };
        }
      }
      return i;
    }));
  };

  // Total summary calculations
  const totalQuantity = itemsToSell.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalPrice = itemsToSell.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      setErrorMsg('Selecciona una bodega para descontar stock.');
      return;
    }
    const validItems = itemsToSell.filter(i => Number(i.qty || 0) > 0);
    if (validItems.length === 0) {
      setErrorMsg('Ingresa al menos 1 producto con cantidad mayor a 0.');
      return;
    }

    onSubmit({
      warehouseId: selectedWarehouse,
      items: validItems.map(item => ({
        productId: item.productId || item.id,
        sku: item.sku,
        name: item.name,
        quantity: parseInt(item.qty, 10),
        qty: parseInt(item.qty, 10),
        price: Number(item.price || 0),
        sale_price: Number(item.price || 0)
      })),
      clientName: clientName.trim(),
      notes: notes.trim(),
      totalPrice
    });
  };

  const selectedWhObj = warehouses.find(w => w.id === selectedWarehouse);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 bg-emerald-500/10 dark:bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                Registrar Venta de Contenedor (Módulo PRO)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Genera folio de venta oficial y descuenta stock en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Warehouse Selector / Info */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Bodega de Despacho (Contenedores)
            </label>
            {warehouses.length > 1 ? (
              <div className="relative">
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedWhObj?.name || 'Bodega Asignada'}
                </span>
                <span className="ml-auto text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Tu Bodega PRO
                </span>
              </div>
            )}
          </div>

          {/* Add Product Search Bar */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Agregar Productos a la Venta
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por SKU o nombre de producto..."
                value={searchProductQuery}
                onChange={(e) => {
                  setSearchProductQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              />

              {/* Autocomplete dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.sku}
                      onClick={() => handleAddProduct(prod)}
                      className="p-2.5 sm:p-3 hover:bg-emerald-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {prod.sku}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {prod.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span>Disp: <strong className={prod.maxQty > 0 ? 'text-emerald-600' : 'text-rose-500'}>{prod.maxQty} u</strong></span>
                          <span>Precio sugerido: <strong>${prod.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items To Sell List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Productos en el Ticket ({itemsToSell.length})
              </label>
              {itemsToSell.length > 0 && (
                <span className="text-xs font-semibold text-slate-400">
                  Total piezas: <strong className="text-slate-700 dark:text-slate-200">{totalQuantity} u</strong>
                </span>
              )}
            </div>

            {itemsToSell.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
                <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No has agregado productos a esta venta
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Usa el buscador de arriba o selecciona las casillas en la tabla de inventario.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {itemsToSell.map((item) => {
                  const currentQty = Number(item.qty || 0);
                  const currentPrice = Number(item.price || 0);
                  const lineTotal = currentQty * currentPrice;
                  const isOutOfStock = item.maxQty <= 0;

                  return (
                    <div
                      key={item.sku}
                      className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors"
                    >
                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate m-0">
                            {item.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px]">
                          <span className={`font-medium ${isOutOfStock ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                            Stock disponible: {item.maxQty} u
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-medium">
                            Subtotal: <strong className="text-slate-900 dark:text-white">${lineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Controls: Quantity & Price */}
                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {/* Quantity with - / + buttons */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Cantidad
                          </label>
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500">
                            <button
                              type="button"
                              onClick={() => handleDecrementQty(item.sku)}
                              disabled={currentQty <= 0}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-xs font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={item.maxQty}
                              value={item.qty}
                              onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                              onBlur={() => handleQtyBlur(item.sku)}
                              onFocus={(e) => e.target.select()}
                              className="w-16 sm:w-20 text-center py-1.5 text-xs sm:text-sm font-black bg-transparent text-slate-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrementQty(item.sku)}
                              disabled={currentQty >= item.maxQty}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Precio U. ($)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => handlePriceChange(item.sku, e.target.value)}
                              onBlur={() => handlePriceBlur(item.sku)}
                              onFocus={(e) => e.target.select()}
                              className="w-24 px-2.5 py-1.5 text-xs sm:text-sm font-black text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.sku)}
                          title="Quitar producto"
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors mt-4 sm:mt-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client & Reference Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Cliente / Razón Social
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Ferretería del Norte"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Notas / Referencia de Pago
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Efectivo / Factura 123 / Mostrador"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Total Banner */}
          <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Total Venta Mostrador (PRO)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {itemsToSell.length} producto(s) · {totalQuantity} unidades
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-1">MXN</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || itemsToSell.length === 0 || totalQuantity === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Confirmar y Registrar Venta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
