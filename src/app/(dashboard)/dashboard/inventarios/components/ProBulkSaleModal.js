'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, AlertCircle, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

export default function ProBulkSaleModal({
  isOpen,
  onClose,
  targetSkus = [],
  warehouses = [],
  stockData = [],
  onSubmit,
  loading = false
}) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [itemsToSell, setItemsToSell] = useState([]);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const whId = warehouses[0]?.id || '';
      setSelectedWarehouse(whId);
      setClientName('');
      setNotes('');

      const items = targetSkus.map(sku => {
        const itemStock = stockData.find(s => s.sku === sku && s.warehouse_id === whId);
        const maxQty = itemStock ? itemStock.cantidad : 0;
        return { sku, qty: maxQty > 0 ? 1 : 0, price: 0, maxQty };
      });
      setItemsToSell(items);
    }
  }, [isOpen, targetSkus, warehouses, stockData]);

  // Update maxQty when warehouse changes
  useEffect(() => {
    if (!isOpen || !selectedWarehouse) return;
    setItemsToSell(prev => prev.map(item => {
      const itemStock = stockData.find(s => s.sku === item.sku && s.warehouse_id === selectedWarehouse);
      const maxQty = itemStock ? itemStock.cantidad : 0;
      return {
        ...item,
        maxQty,
        qty: Math.min(item.qty, maxQty)
      };
    }));
  }, [selectedWarehouse, stockData, isOpen]);

  if (!isOpen) return null;

  const handleQtyChange = (sku, val) => {
    const numVal = parseFloat(val) || 0;
    setItemsToSell(prev => prev.map(i => i.sku === sku ? { ...i, qty: Math.max(0, Math.min(numVal, i.maxQty)) } : i));
  };

  const handlePriceChange = (sku, val) => {
    const numVal = parseFloat(val) || 0;
    setItemsToSell(prev => prev.map(i => i.sku === sku ? { ...i, price: Math.max(0, numVal) } : i));
  };

  const totalPrice = itemsToSell.reduce((sum, item) => sum + (item.qty * item.price), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      setErrorMsg('Selecciona una bodega para descontar stock.');
      return;
    }
    const validItems = itemsToSell.filter(i => i.qty > 0);
    if (validItems.length === 0) {
      setErrorMsg('Ingresa al menos 1 producto con cantidad mayor a 0.');
      return;
    }

    onSubmit({
      warehouseId: selectedWarehouse,
      items: validItems,
      clientName,
      notes,
      totalPrice
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60 bg-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-900 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Venta al Público (Módulo PRO)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Registra salida por venta directa al mostrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

          {/* Warehouse Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bodega de Origen
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
              ))}
            </select>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Productos a Vender ({itemsToSell.length})
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60">
              {itemsToSell.map((item) => (
                <div key={item.sku} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{item.sku}</p>
                    <p className="text-[11px] text-slate-400">Disp: {item.maxQty} u</p>
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Cant.</label>
                    <input
                      type="number"
                      min="0"
                      max={item.maxQty}
                      value={item.qty}
                      onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                      className="w-full px-2 py-1 text-xs font-semibold text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Precio U. ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.price}
                      onChange={(e) => handlePriceChange(item.sku, e.target.value)}
                      className="w-full px-2 py-1 text-xs font-semibold text-right bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cliente / Razon Social
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Cliente de Mostrador"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notas / Referencia
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Folio o Ticket de Venta..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Total display */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Total Venta PRO:</span>
            <span className="text-base font-extrabold text-amber-900 dark:text-amber-200 font-mono">
              ${totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
            </span>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              Registrar Venta PRO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
