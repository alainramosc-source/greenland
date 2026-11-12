'use client';
import React, { Suspense } from 'react';
import {
  ShieldCheck, Upload, RefreshCw, AlertTriangle, CheckCircle,
  TrendingDown, TrendingUp, Warehouse, FileSpreadsheet, History,
  Truck, Calendar, Ship, Eye, ArrowLeft, Package
} from 'lucide-react';
import { useCobertura } from '@/hooks/useCobertura';
import CoverageHeatmapTable from './components/CoverageHeatmapTable';
import ReorderSuggestionsPanel from './components/ReorderSuggestionsPanel';
import TransitSlideOverPanel from './components/TransitSlideOverPanel';

export default function CoberturaPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2 text-xs font-bold">
          <div className="w-6 h-6 border-2 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
          <span>Cargando Cobertura...</span>
        </div>
      }
    >
      <CoberturaPage />
    </Suspense>
  );
}

function CoberturaPage() {
  const {
    router,
    fileInputRef,
    transitFileRef,
    simulationData,
    loading,
    warehouses,
    selectedWarehouse,
    products,
    transitShipments,
    editingRow,
    editForm,
    setEditForm,
    saving,
    csvImporting,
    toast,
    skuFilter,
    setSkuFilter,
    transitPanel,
    setTransitPanel,
    transitForm,
    setTransitForm,
    editingTransitId,
    editingTransitForm,
    setEditingTransitForm,
    transitCsvImporting,
    manufacturers,
    selectedManufacturer,
    setSelectedManufacturer,
    LEAD_TIME_WEEKS,
    horizonWeeks,
    setHorizonWeeks,
    ORDER_CYCLE_WEEKS,
    REORDER_TARGET_WEEKS,
    isCombinedView,
    heatmapData,
    kpis,
    reorderAlerts,
    weekMetadata,
    handleWarehouseChange,
    handleRefresh,
    startEdit,
    cancelEdit,
    saveEdit,
    handleCsvImport,
    handleTransitCsvImport,
    addTransit,
    deleteTransit,
    markTransitArrived,
    startEditTransit,
    cancelEditTransit,
    saveEditTransit,
  } = useCobertura();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2 text-xs font-bold">
        <div className="w-6 h-6 border-2 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <span>Cargando Cobertura de Producto...</span>
      </div>
    );
  }

  return (
    <>
      {/* Simulation Banner */}
      {simulationData && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <Eye size={18} className="shrink-0" />
            <div>
              <span className="font-black text-xs sm:text-sm">🔮 MODO SIMULACIÓN</span>
              <span className="ml-3 text-purple-100 text-xs font-medium">
                {simulationData.supplier} → {simulationData.destination} · {simulationData.items?.length || 0} productos · Llegada estimada en {simulationData.lead_weeks} semanas
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/dashboard/cobertura/nuevo-pedido')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-purple-700 rounded-xl text-xs font-bold transition-all cursor-pointer border-none hover:bg-purple-50 shadow-2xs"
            >
              <ArrowLeft size={14} /> Volver al Pedido
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-5">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xl animate-in slide-in-from-right backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.message}
          </div>
        )}

        {/* Executive Top Header Card */}
        <header className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
          {/* Top Row: Title & Global Action Buttons */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shadow-2xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-2.5 flex-wrap">
                  Cobertura de Producto
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20">
                    Supply Chain & S&OP
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium m-0">
                  Seguimiento de inventario y cobertura semanal por localidad ·{' '}
                  <span className="text-orange-600 font-bold">Lead time activo: {LEAD_TIME_WEEKS} semanas</span>
                </p>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => transitFileRef.current?.click()}
                disabled={transitCsvImporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50/80 text-orange-700 font-bold text-xs hover:bg-orange-100 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
              >
                <Ship size={14} /> {transitCsvImporting ? 'Importando...' : 'Importar Tránsitos'}
              </button>
              <input ref={transitFileRef} type="file" accept=".csv" className="hidden" onChange={handleTransitCsvImport} />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={csvImporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
              >
                <Upload size={14} /> {csvImporting ? 'Importando...' : 'CSV Cobertura'}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />

              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs"
                title="Actualizar Datos"
              >
                <RefreshCw size={15} />
              </button>

              <button
                onClick={() => router.push('/dashboard/cobertura/historial')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-700 font-bold text-xs hover:bg-blue-100 cursor-pointer transition-all shadow-2xs"
              >
                <History size={14} /> Historial PO
              </button>

              <button
                onClick={() => router.push('/dashboard/planeacion-demanda')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800 font-bold text-xs hover:bg-emerald-100 cursor-pointer transition-all shadow-2xs"
              >
                <TrendingUp size={14} /> Planeación Demanda
              </button>

              <button
                onClick={() => router.push('/dashboard/cobertura/nuevo-pedido')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6a9a04] text-white font-bold text-xs hover:bg-[#5b8503] cursor-pointer transition-all shadow-md shadow-[#6a9a04]/20 border-none"
              >
                <FileSpreadsheet size={14} /> Crear Pedido
              </button>
            </div>
          </div>

          {/* Second Row: Warehouse Switcher + Manufacturer Lead Time + Horizon Vision */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Warehouse Segmented Switcher */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-wrap">
              <span className="px-2.5 py-1 text-slate-400 flex items-center gap-1 text-xs font-bold">
                <Warehouse size={14} className="text-[#6a9a04]" />
              </span>
              {warehouses.map(wh => (
                <button
                  key={wh.id}
                  onClick={() => handleWarehouseChange(wh)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    selectedWarehouse?.id === wh.id
                      ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-2xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {wh.name}
                </button>
              ))}
            </div>

            {/* Manufacturer & Vision Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Manufacturer Lead Time Toggle */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-wrap">
                {manufacturers.map(m => {
                  const transit = selectedWarehouse?.transit_lead_weeks || m.transit_lead_weeks || 5;
                  const total = (m.production_lead_weeks || 4) + transit;
                  const active = selectedManufacturer?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedManufacturer(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        active
                          ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                          : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {m.short_name} ({total}s)
                    </button>
                  );
                })}
              </div>

              {/* Horizon Vision Selector */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-bold flex-wrap">
                <span className="px-2.5 py-1 text-slate-500 text-[11px] font-bold flex items-center gap-1">
                  <Calendar size={13} className="text-[#6a9a04]" /> Visión:
                </span>
                {[
                  { weeks: 20, label: '20 sem' },
                  { weeks: 26, label: '26 sem (6m)' },
                  { weeks: 32, label: '32 sem' },
                  { weeks: 52, label: '52 sem (1 año)' },
                ].map(opt => (
                  <button
                    key={opt.weeks}
                    onClick={() => setHorizonWeeks(opt.weeks)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                      horizonWeeks === opt.weeks
                        ? 'bg-white text-[#6a9a04] border-slate-200/60 shadow-2xs'
                        : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* 5 High-Density Executive KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200/80 shadow-sm p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">OK (8+ Sem)</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5 m-0">{kpis.green}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 shadow-sm p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Precaución (4-8)</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5 m-0">{kpis.yellow}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 shadow-sm p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Crítico (&lt;4)</p>
              <p className="text-2xl font-black text-red-600 mt-0.5 m-0">{kpis.red}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 shadow-sm p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Promedio Sem</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5 m-0">{kpis.avgCoverage.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`border shadow-sm p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow col-span-2 lg:col-span-1 ${
              kpis.needReorder > 0 ? 'bg-orange-50/70 border-orange-200' : 'bg-white border-slate-200/80'
            }`}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Pedir Ahora</p>
              <p className={`text-2xl font-black mt-0.5 m-0 ${kpis.needReorder > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {kpis.needReorder}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                kpis.needReorder > 0 ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Heatmap Matrix Table */}
        <CoverageHeatmapTable
          heatmapData={heatmapData}
          skuFilter={skuFilter}
          setSkuFilter={setSkuFilter}
          weekMetadata={weekMetadata}
          LEAD_TIME_WEEKS={LEAD_TIME_WEEKS}
          editingRow={editingRow}
          editForm={editForm}
          setEditForm={setEditForm}
          saving={saving}
          isCombinedView={isCombinedView}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          saveEdit={saveEdit}
          setTransitPanel={setTransitPanel}
        />

        {/* Reorder Suggestion Table & Legend */}
        <ReorderSuggestionsPanel
          reorderAlerts={reorderAlerts}
          LEAD_TIME_WEEKS={LEAD_TIME_WEEKS}
          REORDER_TARGET_WEEKS={REORDER_TARGET_WEEKS}
          ORDER_CYCLE_WEEKS={ORDER_CYCLE_WEEKS}
          selectedManufacturer={selectedManufacturer}
          selectedWarehouse={selectedWarehouse}
        />
      </div>

      {/* Transit Slide-Over Panel */}
      <TransitSlideOverPanel
        transitPanel={transitPanel}
        setTransitPanel={setTransitPanel}
        products={products}
        transitShipments={transitShipments}
        manufacturers={manufacturers}
        transitForm={transitForm}
        setTransitForm={setTransitForm}
        editingTransitId={editingTransitId}
        editingTransitForm={editingTransitForm}
        setEditingTransitForm={setEditingTransitForm}
        addTransit={addTransit}
        deleteTransit={deleteTransit}
        markTransitArrived={markTransitArrived}
        startEditTransit={startEditTransit}
        cancelEditTransit={cancelEditTransit}
        saveEditTransit={saveEditTransit}
      />
    </>
  );
}
