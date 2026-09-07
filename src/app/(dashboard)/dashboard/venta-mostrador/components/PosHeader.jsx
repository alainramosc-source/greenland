'use client';
import React from 'react';
import {
  ShoppingBag, Receipt, BarChart3, Warehouse, UserCheck, ShieldCheck, Key
} from 'lucide-react';

export default function PosHeader({
  activeTab,
  setActiveTab,
  warehouses = [],
  selectedWarehouse,
  setSelectedWarehouse,
  activeSeller,
  setShowSellerPinModal,
  userName
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
      {/* Title & Warehouse Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shadow-sm">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Punto de Venta
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20">
                POS Commercial
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Venta directa en mostrador y control de inventario</p>
          </div>
        </div>

        {/* Warehouse Picker Pill */}
        <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 px-3 rounded-xl border border-slate-200">
          <Warehouse size={15} className="text-[#6a9a04]" />
          <span className="text-xs font-bold text-slate-600">Bodega:</span>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs & Seller PIN Badge */}
      <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
        {/* Navigation Sub-tabs */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('nueva')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'nueva'
                ? 'bg-white text-[#6a9a04] shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Nueva Venta</span>
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'historial'
                ? 'bg-white text-[#6a9a04] shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt size={14} />
            <span>Historial</span>
          </button>
          <button
            onClick={() => setActiveTab('estadisticas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'estadisticas'
                ? 'bg-white text-[#6a9a04] shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>Estadísticas</span>
          </button>
        </div>

        {/* Active Seller Badge / PIN Switcher */}
        <button
          onClick={() => setShowSellerPinModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            activeSeller
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
          }`}
          title="Cambiar vendedor por PIN"
        >
          {activeSeller ? (
            <>
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Vendedor: <strong>{activeSeller.name}</strong></span>
            </>
          ) : (
            <>
              <Key size={15} className="text-amber-600" />
              <span>+ Identificar Vendedor (PIN)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
