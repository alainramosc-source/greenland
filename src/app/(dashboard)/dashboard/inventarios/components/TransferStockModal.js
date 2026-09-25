'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function TransferStockModal({
  isOpen,
  onClose,
  targetSkus = [],
  warehouses = [],
  stockData = [],
  onSubmit,
  loading = false
}) {
  const [originWarehouse, setOriginWarehouse] = useState('');
  const [destWarehouse, setDestWarehouse] = useState('');
  const [itemsToTransfer, setItemsToTransfer] = useState([]); // [{ sku, qty, maxQty }]
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const wh1 = warehouses[0]?.id || '';
      const wh2 = warehouses[1]?.id || warehouses[0]?.id || '';
      setOriginWarehouse(wh1);
      setDestWarehouse(wh2);
      setNotes('');

      // Build items array for selected targetSkus
      const items = targetSkus.map(sku => {
        const originStockItem = stockData.find(s => s.sku === sku && s.warehouse_id === wh1);
        const maxQty = originStockItem ? originStockItem.cantidad : 0;
        return { sku, qty: maxQty > 0 ? 1 : 0, maxQty };
      });
      setItemsToTransfer(items);
    }
  }, [isOpen, targetSkus, warehouses, stockData]);

  // Update maxQty when originWarehouse changes
  useEffect(() => {
    if (!isOpen || !originWarehouse) return;
    setItemsToTransfer(prev => prev.map(item => {
      const originStockItem = stockData.find(s => s.sku === item.sku && s.warehouse_id === originWarehouse);
      const maxQty = originStockItem ? originStockItem.cantidad : 0;
      return {
        ...item,
        maxQty,
        qty: Math.min(item.qty, maxQty)
      };
    }));
  }, [originWarehouse, stockData, isOpen]);

  if (!isOpen) return null;

  const handleQtyChange = (sku, val) => {
    const numVal = parseFloat(val) || 0;
    setItemsToTransfer(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, qty: Math.max(0, Math.min(numVal, item.maxQty)) };
      }
      return item;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!originWarehouse || !destWarehouse) {
      setErrorMsg('Selecciona bodega de origen y destino.');
      return;
    }
    if (originWarehouse === destWarehouse) {
      setErrorMsg('La bodega de origen y destino deben ser distintas.');
      return;
    }

    const validItems = itemsToTransfer.filter(i => i.qty > 0);
    if (validItems.length === 0) {
      setErrorMsg('Ingresa una cantidad mayor a 0 en al menos un producto.');
      return;
    }

    onSubmit({
      originWarehouseId: originWarehouse,
      destWarehouseId: destWarehouse,
      items: validItems,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Transferencia Entre Bodegas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reubicar existencias de inventario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Route Selectors (Origin -> Destination) */}
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bodega Origen
              </label>
              <select
                value={originWarehouse}
                onChange={(e) => setOriginWarehouse(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 flex items-center justify-center pt-4 md:pt-0">
              <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 md:rotate-0" />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bodega Destino
              </label>
              <select
                value={destWarehouse}
                onChange={(e) => setDestWarehouse(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Quantities Table */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Productos a Transferir ({itemsToTransfer.length})
            </label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60">
              {itemsToTransfer.map((item) => (
                <div key={item.sku} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{item.sku}</p>
                    <p className="text-[11px] text-slate-400">
                      Disponible en origen: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.maxQty} u</span>
                    </p>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      max={item.maxQty}
                      value={item.qty}
                      onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                      className="w-full px-2.5 py-1 text-sm font-semibold text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notas de Transferencia / Referencia
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Reubicación de stock a Bodega Monterrey por venta..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Transferencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
