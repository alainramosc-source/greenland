'use client';

import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdjustStockModal({
  isOpen,
  onClose,
  targetSkus = [],
  warehouses = [],
  stockData = [],
  onSubmit,
  loading = false
}) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [adjType, setAdjType] = useState('SET'); // 'SET', 'ADD', 'SUB'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (warehouses.length > 0) setSelectedWarehouse(warehouses[0].id);
      if (targetSkus.length > 0) setSelectedSku(targetSkus[0]);
      setAdjType('SET');
      setQuantity('');
      setReason('');
    }
  }, [isOpen, targetSkus, warehouses]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      setErrorMsg('Selecciona una bodega.');
      return;
    }
    if (!selectedSku) {
      setErrorMsg('Selecciona un SKU.');
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setErrorMsg('Ingresa una cantidad válida.');
      return;
    }

    onSubmit({
      warehouseId: selectedWarehouse,
      sku: selectedSku,
      type: adjType,
      quantity: qtyNum,
      reason
    });
  };

  // Find current stock for the selected sku & warehouse
  const currentItem = stockData.find(
    s => s.sku === selectedSku && s.warehouse_id === selectedWarehouse
  );
  const currentStock = currentItem ? currentItem.cantidad : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Ajuste Manual de Inventario</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Corregir o actualizar existencias de stock</p>
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

          {/* Warehouse Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bodega
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
              ))}
            </select>
          </div>

          {/* SKU Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SKU de Producto
            </label>
            {targetSkus.length > 1 ? (
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
              >
                {targetSkus.map((sku) => (
                  <option key={sku} value={sku}>{sku}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                placeholder="SKU-XXXX"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Stock actual en bodega seleccionada: <strong className="text-slate-700 dark:text-slate-200">{currentStock} unidades</strong>
            </p>
          </div>

          {/* Adjustment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Ajuste
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjType('SET')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  adjType === 'SET'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Fijar Exacto
              </button>
              <button
                type="button"
                onClick={() => setAdjType('ADD')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  adjType === 'ADD'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => setAdjType('SUB')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  adjType === 'SUB'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                - Salida
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {adjType === 'SET' ? 'Nueva Cantidad Total' : 'Cantidad a Ajustar'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Motivo / Observaciones
            </label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Conteo de auditoría, mermas, recepción de proveedor..."
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
              Guardar Ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
