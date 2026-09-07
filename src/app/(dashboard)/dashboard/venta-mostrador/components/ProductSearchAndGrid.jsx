'use client';
import React, { useState } from 'react';
import { Search, Camera, Package, Plus, CheckCircle2, Star } from 'lucide-react';

export default function ProductSearchAndGrid({
  searchTerm,
  setSearchTerm,
  searchResults,
  showSearchDropdown,
  setShowSearchDropdown,
  searchRef,
  searchInputRef,
  handleSearchKeyDown,
  addProductToSale,
  openScanner,
  scanFeedback,
  products = [],
  selectedWarehouse,
  getAvailableStock,
  pinnedProductIds = [],
  togglePinProduct
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'favorites'

  const displayedProducts = products.filter(p => {
    if (filterMode === 'favorites') {
      return pinnedProductIds.includes(p.id);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search Input Bar & Scanner Trigger */}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#6a9a04] focus-within:border-[#6a9a04] transition-all">
          <Search size={20} className="text-slate-400 ml-2 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por SKU o Nombre (o escanea código con pistolete/cámara)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 py-1"
          />

          {/* Camera Scanner Button */}
          <button
            type="button"
            onClick={openScanner}
            className="p-2 rounded-xl bg-slate-100 hover:bg-[#6a9a04]/10 text-slate-600 hover:text-[#6a9a04] transition-all flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
            title="Escanear con cámara"
          >
            <Camera size={18} />
            <span className="hidden sm:inline">Cámara</span>
          </button>
        </div>

        {/* Scan Feedback Notification Banner */}
        {scanFeedback && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{scanFeedback}</span>
          </div>
        )}

        {/* Live Autocomplete Results Dropdown */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map(p => {
              const stock = getAvailableStock(p.id, selectedWarehouse);
              const isOut = stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!isOut) addProductToSale(p);
                  }}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isOut ? 'opacity-50 bg-slate-50 cursor-not-allowed' : 'hover:bg-[#6a9a04]/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{p.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">SKU: {p.sku}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#6a9a04]">
                      ${Number(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isOut ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Stock: {stock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Catalog Touch Grid (Configurable Favorites & All Products) */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 space-y-3">
        {/* Section Title Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Package size={16} className="text-[#6a9a04]" /> Catálogo Rápido de Productos
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            Haz clic en ⭐ para fijar tus favoritos
          </span>
        </div>

        {/* Filter Tabs Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#6a9a04] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos los productos ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('favorites')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterMode === 'favorites'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100'
              }`}
            >
              <Star size={13} className={filterMode === 'favorites' ? 'fill-white' : 'fill-amber-500 text-amber-500'} />
              <span>Favoritos ({pinnedProductIds.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-bold">
            {displayedProducts.length} mostrados
          </span>
        </div>

        {/* Product Cards Grid (Set exact 2-row max-height: 224px) */}
        {displayedProducts.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            {filterMode === 'favorites'
              ? 'No tienes productos fijados en favoritos aún. Haz clic en la estrella ⭐ en cualquier producto para agregarlo a la selección rápida.'
              : 'No hay productos disponibles.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[224px] overflow-y-auto pr-1">
            {displayedProducts.map(p => {
              const stock = getAvailableStock(p.id, selectedWarehouse);
              const isOut = stock <= 0;
              const isPinned = pinnedProductIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => { if (!isOut) addProductToSale(p); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 group relative ${
                    isOut
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : isPinned
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500 hover:shadow-md'
                      : 'bg-white border-slate-200/80 hover:border-[#6a9a04] hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {/* Pin / Favorite Star Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinProduct(p.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full text-slate-300 hover:text-amber-500 transition-colors z-10"
                    title={isPinned ? 'Quitar de favoritos' : 'Fijar en selección rápida'}
                  >
                    <Star size={14} className={isPinned ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>

                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1 pr-5">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[70px]">{p.sku}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {stock} disp.
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#6a9a04] transition-colors">
                      {p.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-black text-slate-900">
                      ${Number(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#6a9a04]/10 group-hover:bg-[#6a9a04] group-hover:text-white text-[#6a9a04] flex items-center justify-center transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
