'use client';
import { Search, X, Warehouse, Filter } from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'cancelled', label: 'Canceladas' },
];

export default function ReceptionsFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  warehouseFilter,
  setWarehouseFilter,
  warehouses,
  stats,
  totalFiltered,
}) {
  const isFiltered = searchTerm !== '' || statusFilter !== 'all' || warehouseFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setWarehouseFilter('all');
  };

  const getStatusCount = (key) => {
    switch (key) {
      case 'completed': return stats.completedCount || 0;
      case 'draft': return stats.draftsCount || 0;
      case 'cancelled': return stats.cancelledCount || 0;
      default: return stats.totalCount || 0;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 bg-white/70 backdrop-blur-xl border border-white/60 p-3 sm:p-4 rounded-2xl shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px] max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por contenedor, pedimento, BL, OP, distribuidor, bodega..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/25 focus:border-[#6a9a04] text-xs sm:text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-xs font-medium"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Warehouse Filter */}
        <div className="relative min-w-[160px]">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-xs cursor-pointer"
          >
            <option value="all">Todas las Bodegas</option>
            <option value="multibodega">🏢 Solo Multibodega</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {STATUS_TABS.map((tab) => {
            const count = getStatusCount(tab.key);
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reset filter button if active */}
        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Limpiar todos los filtros"
          >
            Limpiar ({totalFiltered})
          </button>
        )}
      </div>
    </div>
  );
}
