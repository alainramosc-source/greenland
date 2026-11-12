'use client';
import React from 'react';
import {
  DollarSign, Save, Upload, Percent, Download, FileSpreadsheet, Users, MapPin
} from 'lucide-react';
import { usePrecios } from '@/hooks/usePrecios';
import PricingTable from './components/PricingTable';
import PriceHistorySection from './components/PriceHistorySection';
import PriceModals from './components/PriceModals';

export default function PreciosPage() {
  const {
    products,
    filteredProducts,
    loading,
    searchTerm,
    setSearchTerm,
    editedPrices,
    setEditedPrices,
    saving,
    categories,
    selectedCategory,
    setSelectedCategory,
    showPercent,
    setShowPercent,
    percentValue,
    setPercentValue,
    percentTarget,
    setPercentTarget,
    showCsvModal,
    setShowCsvModal,
    csvData,
    setCsvData,
    csvPreview,
    setCsvPreview,
    fileInputRef,
    handleSort,
    priceHistory,
    showHistory,
    setShowHistory,
    distributors,
    selectedDistributor,
    setSelectedDistributor,
    distributorAddresses,
    selectedAddress,
    setSelectedAddress,
    distributorPrices,
    showBulkCsv,
    setShowBulkCsv,
    bulkCsvRows,
    setBulkCsvRows,
    bulkCsvErrors,
    setBulkCsvErrors,
    bulkCsvUploading,
    bulkCsvResult,
    setBulkCsvResult,
    bulkFileRef,
    editCount,
    isDistributorMode,
    getCurrentPrice,
    hasCustomPrice,
    handleSaveAll,
    handleApplyPercent,
    handleCsvFile,
    handleApplyCsv,
    handleExportCsv,
    handleBulkCsvFile,
    handleBulkCsvUpload,
    downloadBulkTemplate,
    handleCopyBasePrices,
  } = usePrecios();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2 text-xs font-bold">
        <div className="w-6 h-6 border-2 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <span>Cargando Gestión de Precios...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-3 sm:p-5 space-y-5">
      {/* Executive Header & Distributor / Address Control Bar */}
      <header className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        {/* Top Row: Title + Action Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shadow-2xs shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-2.5 flex-wrap">
                Gestión de Precios
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20">
                  Pricing & Margins
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium m-0">
                Edita precios base o configura listas personalizadas por distribuidor y sucursal de envío
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Exportar CSV
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" /> Importar CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCsvFile} className="hidden" />

            <button
              onClick={() => setShowPercent(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50/80 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-all shadow-2xs"
            >
              <Percent className="w-3.5 h-3.5" /> Ajuste %
            </button>

            {isDistributorMode && (
              <button
                onClick={handleCopyBasePrices}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50/80 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-all shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Copiar Precios Base
              </button>
            )}

            <input ref={bulkFileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleBulkCsvFile} className="hidden" />
            <button
              onClick={() => bulkFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 border border-[#6a9a04]/30 hover:bg-[#6a9a04]/20 cursor-pointer transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" /> Carga Masiva
            </button>

            <button
              onClick={downloadBulkTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Plantilla
            </button>

            {editCount > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6a9a04] hover:bg-[#5b8503] shadow-md shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Guardando...' : `Guardar ${editCount} cambio${editCount > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Distributor & Shipping Address Selector Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              <Users className="w-3 h-3 text-[#6a9a04]" /> Lista / Distribuidor
            </label>
            <select
              value={selectedDistributor}
              onChange={(e) => { setSelectedDistributor(e.target.value); setEditedPrices({}); }}
              className="w-full px-3.5 py-2 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 transition-all cursor-pointer"
            >
              <option value="base">📋 Precios Base (General)</option>
              {distributors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.city ? `— ${d.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {isDistributorMode && (
            <div className="flex-1 min-w-[240px]">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <MapPin className="w-3 h-3 text-[#6a9a04]" /> Dirección de Envío / Destino
              </label>
              <select
                value={selectedAddress}
                onChange={(e) => { setSelectedAddress(e.target.value); setEditedPrices({}); }}
                className="w-full px-3.5 py-2 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 transition-all cursor-pointer"
              >
                <option value="default">🏠 Precio default del distribuidor</option>
                {distributorAddresses.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.city}, {a.state}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDistributorMode && (
            <div className="flex items-center gap-2 pb-1">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${
                Object.keys(distributorPrices).length > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {Object.keys(distributorPrices).length} precios personalizados
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Pricing Table */}
      <PricingTable
        filteredProducts={filteredProducts}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        editCount={editCount}
        isDistributorMode={isDistributorMode}
        editedPrices={editedPrices}
        setEditedPrices={setEditedPrices}
        saving={saving}
        handleSaveAll={handleSaveAll}
        handleSort={handleSort}
        getCurrentPrice={getCurrentPrice}
        hasCustomPrice={hasCustomPrice}
        distributorPrices={distributorPrices}
      />

      {/* Collapsible Price Change History */}
      <PriceHistorySection
        priceHistory={priceHistory}
        products={products}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
      />

      {/* Modals: Percentage Adjustment, CSV Preview & Bulk Multi-Distributor Upload */}
      <PriceModals
        showPercent={showPercent}
        setShowPercent={setShowPercent}
        percentTarget={percentTarget}
        setPercentTarget={setPercentTarget}
        percentValue={percentValue}
        setPercentValue={setPercentValue}
        categories={categories}
        handleApplyPercent={handleApplyPercent}
        showCsvModal={showCsvModal}
        setShowCsvModal={setShowCsvModal}
        csvPreview={csvPreview}
        setCsvData={setCsvData}
        setCsvPreview={setCsvPreview}
        isDistributorMode={isDistributorMode}
        distributors={distributors}
        selectedDistributor={selectedDistributor}
        products={products}
        handleApplyCsv={handleApplyCsv}
        showBulkCsv={showBulkCsv}
        setShowBulkCsv={setShowBulkCsv}
        bulkCsvRows={bulkCsvRows}
        setBulkCsvRows={setBulkCsvRows}
        bulkCsvErrors={bulkCsvErrors}
        setBulkCsvErrors={setBulkCsvErrors}
        bulkCsvResult={bulkCsvResult}
        setBulkCsvResult={setBulkCsvResult}
        bulkCsvUploading={bulkCsvUploading}
        handleBulkCsvUpload={handleBulkCsvUpload}
      />
    </div>
  );
}
