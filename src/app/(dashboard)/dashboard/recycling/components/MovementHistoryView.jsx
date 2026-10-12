'use client';
import { FileText, Download, Filter, Search, Calendar, Edit3, Trash2, ShoppingCart, Send, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function MovementHistoryView({
  historyItems,
  historyFilter,
  setHistoryFilter,
  exportHistoryExcel,
  materialTypes,
  openEditMovementModal,
  handleDeleteMovement,
  isAdmin,
}) {
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
      {/* Top Filter & Export Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Historial de Movimientos de Reciclaje
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Auditoría completa de compras a proveedores y ventas salientes</p>
          </div>

          <button
            onClick={exportHistoryExcel}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
          >
            <Download size={16} /> Exportar Excel / CSV
          </button>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historyFilter.search || ''}
              onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar folio, proveedor, comprador..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={historyFilter.type}
              onChange={e => setHistoryFilter(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500 bg-white cursor-pointer"
            >
              <option value="all">Todos los Tipos (Compras y Ventas)</option>
              <option value="compra">Solo Compras</option>
              <option value="venta">Solo Ventas</option>
            </select>
          </div>

          {/* Material Filter */}
          <div>
            <select
              value={historyFilter.material}
              onChange={e => setHistoryFilter(f => ({ ...f, material: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500 bg-white cursor-pointer"
            >
              <option value="all">Todos los Materiales</option>
              {materialTypes.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={historyFilter.dateFrom}
              onChange={e => setHistoryFilter(f => ({ ...f, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 bg-white text-slate-700"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={historyFilter.dateTo}
              onChange={e => setHistoryFilter(f => ({ ...f, dateTo: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 bg-white text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl overflow-hidden">
        {historyItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <FileText size={44} className="mx-auto text-slate-300 stroke-[1.5]" />
            <p className="font-bold text-sm">No se encontraron movimientos con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Tipo y Folio</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Proveedor / Comprador</th>
                  <th className="px-6 py-4">Capturado Por</th>
                  <th className="px-6 py-4 text-right">Kilos</th>
                  <th className="px-6 py-4 text-right">Precio/KG</th>
                  <th className="px-6 py-4 text-right">Monto Total</th>
                  {isAdmin && <th className="px-6 py-4 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {historyItems.map(item => {
                  const isCompra = item.type === 'compra';
                  const dateObj = new Date(item.date);
                  const dateStr = dateObj.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-slate-500">
                        <span className="font-bold text-slate-900 block">{dateStr}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-xl border ${
                            isCompra ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            {isCompra ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          </span>
                          <div>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              isCompra ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isCompra ? 'Compra' : 'Venta'}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                              {item.number || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.material}
                        {item.notes && <p className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]" title={item.notes}>{item.notes}</p>}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {item.who}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.captured_by}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {fmtKg(item.quantity_kg)} kg
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        ${fmt(item.price_per_kg)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-black text-sm ${isCompra ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isCompra ? '-' : '+'}${fmt(item.total_amount)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditMovementModal(item)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                              title="Editar movimiento"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMovement(item)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                              title="Eliminar movimiento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
