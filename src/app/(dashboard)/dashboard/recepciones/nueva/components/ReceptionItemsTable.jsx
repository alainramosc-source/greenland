'use client';
import { useState } from 'react';
import { Package, Search, Plus, Trash2, Camera, QrCode, Warehouse, CheckSquare, Square, ArrowRightLeft } from 'lucide-react';

export default function ReceptionItemsTable({
  items,
  warehouses,
  defaultWarehouseId,
  isDistributorPro,
  isCompleted,
  updateItem,
  removeItem,
  addProduct,
  handleProductSearch,
  productSearch,
  searchResults,
  entryMode,
  setEntryMode,
  showReceptionScanner,
  openReceptionScanner,
  closeReceptionScanner,
  scanSearchRef,
  handleScanKeyDown,
  chargeAmount,
  totalOriginCostUSD,
  totalOriginCostMXN,
  totalQuantity,
}) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [batchWarehouseId, setBatchWarehouseId] = useState('');

  const defaultWh = warehouses.find((w) => w.id === defaultWarehouseId);
  const defaultWhName = defaultWh?.name || 'Bodega Predeterminada';

  // Toggle row selection for batch assignment
  const toggleSelectRow = (idx) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === items.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(items.map((_, i) => i));
    }
  };

  // Apply warehouse to selected items
  const handleApplyBatchWarehouse = () => {
    if (!batchWarehouseId) {
      alert('Selecciona una bodega para asignar a las partidas seleccionadas');
      return;
    }
    selectedIndices.forEach((idx) => {
      updateItem(idx, 'warehouse_id', batchWarehouseId);
    });
    setSelectedIndices([]);
  };

  // Group items by warehouse for the summary badge
  const summaryByWarehouse = {};
  items.forEach((item) => {
    const wid = item.warehouse_id || defaultWarehouseId;
    const wName = warehouses.find((w) => w.id === wid)?.name || 'Sin bodega';
    summaryByWarehouse[wName] = (summaryByWarehouse[wName] || 0) + (Number(item.quantity) || 0);
  });

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
            <Package size={18} className="text-[#6a9a04]" /> Productos Recibidos y Destino de Descarga
          </h3>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Por defecto van a <strong>{defaultWhName}</strong>. Si una partida o contenedor se descargó en otra bodega, selecciónala directamente en su fila.
          </p>
        </div>

        {/* Multibodega live counter tag */}
        {items.length > 0 && Object.keys(summaryByWarehouse).length > 1 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700">
            <Warehouse size={14} className="text-indigo-600 shrink-0" />
            <span>
              Multibodega activo ({Object.entries(summaryByWarehouse).map(([w, q]) => `${w}: ${q} pzas`).join(' | ')})
            </span>
          </div>
        )}
      </div>

      {/* Entry Mode Toggle */}
      {!isCompleted && (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-1 bg-white/80 rounded-xl p-1 border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setEntryMode('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                entryMode === 'manual'
                  ? 'bg-[#6a9a04] text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('scan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                entryMode === 'scan'
                  ? 'bg-[#6a9a04] text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode size={14} /> Escaneo de Código
            </button>
          </div>

          {/* Batch warehouse assignment toolbar */}
          {items.length > 1 && !isCompleted && selectedIndices.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50/90 border border-blue-200 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
              <span className="text-xs font-bold text-blue-700">
                {selectedIndices.length} {selectedIndices.length === 1 ? 'partida seleccionada' : 'partidas seleccionadas'}:
              </span>
              <select
                value={batchWarehouseId}
                onChange={(e) => setBatchWarehouseId(e.target.value)}
                className="px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-700 outline-none"
              >
                <option value="">— Asignar bodega a marcadas —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.id === defaultWarehouseId ? '(Predeterminada)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyBatchWarehouse}
                disabled={!batchWarehouseId}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scan Mode UI */}
      {!isCompleted && entryMode === 'scan' && (
        <div className="bg-[#6a9a04]/5 border-2 border-[#6a9a04]/20 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] mb-3 m-0 flex items-center gap-2">
            <QrCode size={13} /> Modo Escaneo — Pistola de código o cámara
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={scanSearchRef}
                type="text"
                placeholder="Escanea o escribe SKU y presiona Enter..."
                onKeyDown={handleScanKeyDown}
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04]/50 placeholder:text-slate-400 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={showReceptionScanner ? closeReceptionScanner : openReceptionScanner}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer border-none transition-all ${
                showReceptionScanner ? 'bg-red-500 text-white' : 'bg-[#6a9a04]/10 text-[#6a9a04] hover:bg-[#6a9a04]/20'
              }`}
            >
              <Camera size={18} /> {showReceptionScanner ? 'Cerrar Cámara' : 'Cámara'}
            </button>
          </div>
          {showReceptionScanner && (
            <div className="mt-3 rounded-xl overflow-hidden border-2 border-[#6a9a04]/30">
              <div id="reception-barcode-reader" style={{ minHeight: 280, background: '#000' }} />
            </div>
          )}
        </div>
      )}

      {/* Items Table */}
      {items.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                {!isCompleted && items.length > 1 && (
                  <th className="pb-3 text-center" style={{ width: '36px' }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
                      title="Seleccionar todas"
                    >
                      {selectedIndices.length === items.length ? (
                        <CheckSquare size={16} className="text-[#6a9a04]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                )}
                <th className="pb-3">SKU</th>
                <th className="pb-3">Producto</th>
                <th className="pb-3" style={{ minWidth: '170px' }}>
                  Bodega de Descarga
                </th>
                <th className="pb-3 text-center" style={{ width: '90px' }}>
                  Cantidad
                </th>
                <th className="pb-3 text-center" style={{ width: '130px' }}>
                  Costo Origen/ud (USD)
                </th>
                <th className="pb-3 text-right" style={{ width: '120px' }}>
                  Subtotal USD
                </th>
                {isDistributorPro && (
                  <th className="pb-3 text-center" style={{ width: '130px' }}>
                    Precio PRO/ud (MXN)
                  </th>
                )}
                {isDistributorPro && (
                  <th className="pb-3 text-right" style={{ width: '120px' }}>
                    Cargo PRO
                  </th>
                )}
                {!isCompleted && <th style={{ width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_origin_cost) || 0);
                const proSubtotal = (Number(item.quantity) || 0) * (Number(item.unit_pro_price) || 0);
                const currentWarehouseId = item.warehouse_id || defaultWarehouseId;
                const isDifferentWarehouse = currentWarehouseId && defaultWarehouseId && currentWarehouseId !== defaultWarehouseId;
                const isSelected = selectedIndices.includes(idx);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isDifferentWarehouse
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : isSelected
                        ? 'bg-blue-50/40 hover:bg-blue-50/60'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {!isCompleted && items.length > 1 && (
                      <td className="py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(idx)}
                          className="w-4 h-4 accent-[#6a9a04] rounded cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-3 font-mono text-xs font-bold text-slate-600">{item.sku}</td>
                    <td className="py-3 text-sm font-semibold text-slate-800">{item.name}</td>

                    {/* Warehouse per item */}
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={currentWarehouseId || ''}
                          onChange={(e) => updateItem(idx, 'warehouse_id', e.target.value)}
                          disabled={isCompleted}
                          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border outline-none transition-all ${
                            isDifferentWarehouse
                              ? 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold focus:ring-2 focus:ring-amber-400/30'
                              : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-[#6a9a04]/20'
                          } disabled:opacity-60`}
                        >
                          <option value="">— {defaultWhName} (Predeterminada) —</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} {w.id === defaultWarehouseId ? '★ (Predeterminada)' : ''}
                            </option>
                          ))}
                        </select>
                        {isDifferentWarehouse && (
                          <span
                            className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold"
                            title="Descargado en bodega alterna"
                          >
                            !
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        disabled={isCompleted}
                        className="w-20 px-2 py-1.5 text-center text-sm font-black text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/20 disabled:opacity-60"
                      />
                    </td>

                    {/* Origin Cost USD */}
                    <td className="py-3 text-center">
                      <div className="relative inline-block">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">USD</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_origin_cost || ''}
                          onChange={(e) => updateItem(idx, 'unit_origin_cost', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          disabled={isCompleted}
                          className="w-24 pl-8 pr-2 py-1.5 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/20 text-right disabled:opacity-60"
                        />
                      </div>
                    </td>

                    {/* Subtotal USD */}
                    <td className="py-3 text-right text-sm font-bold text-slate-700">
                      ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>

                    {/* PRO Price MXN (if applicable) */}
                    {isDistributorPro && (
                      <td className="py-3 text-center">
                        <div className="relative inline-block">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#6a9a04] text-[10px] font-bold">MXN</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_pro_price || ''}
                            onChange={(e) => updateItem(idx, 'unit_pro_price', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            disabled={isCompleted}
                            className="w-28 pl-9 pr-2 py-1.5 text-sm font-bold border border-[#6a9a04]/30 bg-[#6a9a04]/5 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/30 text-right disabled:opacity-60"
                          />
                        </div>
                      </td>
                    )}

                    {/* PRO Subtotal */}
                    {isDistributorPro && (
                      <td className="py-3 text-right text-sm font-black text-[#6a9a04]">
                        ${proSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    )}

                    {/* Actions */}
                    {!isCompleted && (
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                          title="Eliminar partida"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-300">
                {!isCompleted && items.length > 1 && <td></td>}
                <td colSpan={2} className="py-3 text-sm font-bold text-slate-700 text-right">
                  Totales Origen:
                </td>
                <td className="py-3 text-xs text-slate-500 font-medium">
                  {Object.entries(summaryByWarehouse).map(([w, q]) => (
                    <div key={w} className="font-bold text-slate-700">
                      • {w}: <span className="text-[#6a9a04]">{q}</span> pzas
                    </div>
                  ))}
                </td>
                <td className="py-3 text-center text-sm font-black text-slate-900">{totalQuantity}</td>
                <td></td>
                <td className="py-3 text-right text-sm font-black text-slate-900">
                  <div>${totalOriginCostUSD.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    ${totalOriginCostMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </div>
                </td>
                {isDistributorPro && <td></td>}
                {isDistributorPro && (
                  <td className="py-3 text-right text-sm font-black text-[#6a9a04]">
                    ${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                )}
                {!isCompleted && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add Product Search */}
      {!isCompleted && (
        <div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => handleProductSearch(e.target.value)}
              placeholder="Buscar y agregar producto por SKU o nombre..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm font-medium"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6a9a04]/50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">SKU: {p.sku}</span>
                  </div>
                  <Plus size={16} className="text-[#6a9a04]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
