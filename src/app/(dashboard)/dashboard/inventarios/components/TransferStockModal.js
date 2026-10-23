'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function TransferStockModal({
  isOpen,
  onClose,
  targetSkus = [],
  warehouses = [],
  stockData = [],
  proDistributors = [],
  onSubmit,
  loading = false
}) {
  const [originWarehouse, setOriginWarehouse] = useState('');
  const [destWarehouse, setDestWarehouse] = useState('');
  const [itemsToTransfer, setItemsToTransfer] = useState([]); // [{ sku, qty, maxQty }]
  const [credits, setCredits] = useState({}); // { [sku]: montoMXN } — solo origen PRO
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setCredits({});
      const availableIn = (sku, whId) => stockData.find(s => s.sku === sku && s.warehouse_id === whId)?.cantidad || 0;

      // Origen por defecto: la bodega con más disponible del primer SKU seleccionado
      const firstSku = targetSkus[0];
      const byStock = [...warehouses].sort((a, b) => availableIn(firstSku, b.id) - availableIn(firstSku, a.id));
      const wh1 = (firstSku && availableIn(firstSku, byStock[0]?.id) > 0 ? byStock[0]?.id : warehouses[0]?.id) || '';
      const wh2 = warehouses.find(w => w.id !== wh1)?.id || '';
      setOriginWarehouse(wh1);
      setDestWarehouse(wh2);

      // Build items array for selected targetSkus
      const items = targetSkus.map(sku => {
        const maxQty = availableIn(sku, wh1);
        return { sku, qty: 0, maxQty };
      });
      setItemsToTransfer(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetSkus]);

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

  // Distribuidor PRO dueño de la bodega origen (si aplica)
  const originPro = proDistributors.find(d => d.assigned_warehouse_id === originWarehouse) || null;
  const totalCredit = originPro
    ? itemsToTransfer.reduce((s, i) => s + (i.qty > 0 ? Number(credits[i.sku]) || 0 : 0), 0)
    : 0;

  const handleQtyChange = (sku, val) => {
    const numVal = parseInt(val, 10) || 0;
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
      credits: originPro ? credits : {},
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

          {/* PRO origin: credit to distributor balance */}
          {originPro && (
            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
              <p className="font-bold">Bodega de distribuidor PRO: {originPro.full_name}{originPro.client_number ? ` (#${originPro.client_number})` : ''}</p>
              <p className="mt-0.5">Opcional: captura el crédito (MXN) por partida para abonarlo a su saldo. Déjalo vacío si no aplica crédito.</p>
            </div>
          )}

          {/* Items Quantities Table */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Productos a Transferir ({itemsToTransfer.length})
            </label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60">
              {itemsToTransfer.map((item) => {
                const creditVal = credits[item.sku] ?? '';
                const unit = item.qty > 0 && Number(creditVal) > 0 ? Number(creditVal) / item.qty : 0;
                return (
                  <div key={item.sku} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{item.sku}</p>
                      <p className="text-[11px] text-slate-400">
                        Disponible en origen: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.maxQty} u</span>
                      </p>
                      {originPro && unit > 0 && (
                        <p className="text-[11px] text-purple-600 dark:text-purple-300">
                          ${unit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pza
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <label className="block text-[10px] text-slate-400 mb-0.5 text-center">Piezas</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          max={item.maxQty}
                          value={item.qty}
                          onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                          className="w-full px-2.5 py-1 text-sm font-semibold text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
                        />
                      </div>
                      {originPro && (
                        <div className="w-28">
                          <label className="block text-[10px] text-purple-500 mb-0.5 text-center">Crédito $ MXN</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={creditVal}
                            onChange={(e) => setCredits(c => ({ ...c, [item.sku]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1 text-sm font-semibold text-center bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {originPro && totalCredit > 0 && (
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300 text-right">
                Crédito total a {originPro.full_name}: ${totalCredit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            )}
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
