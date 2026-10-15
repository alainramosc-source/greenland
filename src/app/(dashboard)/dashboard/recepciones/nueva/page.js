'use client';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertTriangle, CheckCircle, Container } from 'lucide-react';
import { useReceptionForm } from '@/hooks/useReceptionForm';
import ReceptionHeaderCard from './components/ReceptionHeaderCard';
import ReceptionItemsTable from './components/ReceptionItemsTable';
import LandedCostsCard from './components/LandedCostsCard';
import ReceptionCostingSummary from './components/ReceptionCostingSummary';
import ReceptionDocumentsCard from './components/ReceptionDocumentsCard';

export default function NuevaRecepcionPage() {
  const {
    loading,
    saving,
    confirming,
    editId,
    form,
    setForm,
    items,
    warehouses,
    suppliers,
    purchaseOrders,
    distributors,
    // Multi-PO
    linkedPOs,
    addSecondaryPO,
    removeLinkedPO,
    togglePOFinal,
    isFinalReception,
    setIsFinalReception,
    productSearch,
    searchResults,
    entryMode,
    setEntryMode,
    showReceptionScanner,
    scanFeedback,
    scanSearchRef,
    documents,
    uploadingDoc,
    isAuthorized,
    isCompleted,
    // Math
    tcGoods,
    totalOriginCostUSD,
    totalOriginCostMXN,
    totalAdditionalCosts,
    totalLandedCost,
    totalQuantity,
    chargeAmount,
    getLandedPerUnit,
    // Methods
    handlePOChange,
    handleWarehouseChange,
    handleProductSearch,
    addProduct,
    removeItem,
    updateItem,
    openReceptionScanner,
    closeReceptionScanner,
    handleScanKeyDown,
    handleUploadDoc,
    handleDeleteDoc,
    handleViewDoc,
    handleSave,
    handleConfirm,
    handleSaveCompleted,
  } = useReceptionForm();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="font-semibold text-slate-600">Cargando módulo de recepción...</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-5xl mx-auto pb-12">
      {/* Back button */}
      <Link
        href="/dashboard/recepciones"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-xs font-bold no-underline"
      >
        <ArrowLeft size={15} /> Volver al listado de recepciones
      </Link>

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl border border-white/60 p-5 sm:p-6 rounded-3xl shadow-xl mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6a9a04] to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-[#6a9a04]/25 shrink-0">
            <Container size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                {isCompleted ? 'Recepción Completada' : editId ? 'Editar Recepción' : 'Nueva Recepción de Contenedor'}
              </h1>
              {isCompleted ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  ✓ Completada
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                  {editId ? 'Borrador' : 'Nuevo Registro'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              {isCompleted
                ? 'Esta recepción ya fue procesada e ingresada a los inventarios correspondientes.'
                : 'Registra la llegada de mercancía, asignación de bodega y costeo landed.'}
            </p>
          </div>
        </div>
      </div>

        {/* Authorized Edit Mode Banner */}
        {isCompleted && isAuthorized && (
          <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium flex items-center gap-3 shadow-sm">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <span>
              <strong>Modo de Edición Administrativa (Alain Ramos):</strong> Puedes modificar la etiqueta de contenedor,
              pedimento(s), nº de operación, ref. aduanal, fecha, costos adicionales y tipos de cambio. Los productos y
              cantidades ya ingresadas permanecen protegidos para consistencia contable.
            </span>
          </div>
        )}

      {/* 1. General Header Data (with Multi-PO support) */}
      <ReceptionHeaderCard
        form={form}
        setForm={setForm}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
        warehouses={warehouses}
        distributors={distributors}
        linkedPOs={linkedPOs}
        addSecondaryPO={addSecondaryPO}
        removeLinkedPO={removeLinkedPO}
        togglePOFinal={togglePOFinal}
        handlePOChange={handlePOChange}
        handleWarehouseChange={handleWarehouseChange}
        isCompleted={isCompleted}
        isAuthorized={isAuthorized}
      />

      {/* 2. Received Items & Warehouse Destination Table */}
      <ReceptionItemsTable
        items={items}
        warehouses={warehouses}
        defaultWarehouseId={form.warehouse_id}
        linkedPOs={linkedPOs}
        isDistributorPro={!!form.distributor_id}
        isCompleted={isCompleted}
        isAuthorized={isAuthorized}
        updateItem={updateItem}
        removeItem={removeItem}
        addProduct={addProduct}
        handleProductSearch={handleProductSearch}
        productSearch={productSearch}
        searchResults={searchResults}
        entryMode={entryMode}
        setEntryMode={setEntryMode}
        showReceptionScanner={showReceptionScanner}
        openReceptionScanner={openReceptionScanner}
        closeReceptionScanner={closeReceptionScanner}
        scanSearchRef={scanSearchRef}
        handleScanKeyDown={handleScanKeyDown}
        chargeAmount={chargeAmount}
        totalOriginCostUSD={totalOriginCostUSD}
        totalOriginCostMXN={totalOriginCostMXN}
        totalQuantity={totalQuantity}
      />

      {/* 3. Additional Import Costs */}
      <LandedCostsCard
        form={form}
        setForm={setForm}
        totalAdditionalCosts={totalAdditionalCosts}
        isCompleted={isCompleted}
        isAuthorized={isAuthorized}
      />

      {/* 4. Costing & Landed Summary */}
      <ReceptionCostingSummary
        form={form}
        setForm={setForm}
        items={items}
        warehouses={warehouses}
        distributors={distributors}
        totalOriginCostUSD={totalOriginCostUSD}
        totalOriginCostMXN={totalOriginCostMXN}
        totalAdditionalCosts={totalAdditionalCosts}
        totalLandedCost={totalLandedCost}
        chargeAmount={chargeAmount}
        tcGoods={tcGoods}
        getLandedPerUnit={getLandedPerUnit}
        isCompleted={isCompleted}
        isAuthorized={isAuthorized}
      />

      {/* 5. Documents & Evidence */}
      <ReceptionDocumentsCard
        documents={documents}
        uploadingDoc={uploadingDoc}
        handleUploadDoc={handleUploadDoc}
        handleDeleteDoc={handleDeleteDoc}
        handleViewDoc={handleViewDoc}
        isCompleted={isCompleted}
        isAuthorized={isAuthorized}
      />

      {/* 6. Action Buttons */}
      {!isCompleted ? (
        <div className="flex items-center justify-between gap-4 mt-8">
          <Link
            href="/dashboard/recepciones"
            className="px-5 py-3 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm no-underline text-sm"
          >
            Cancelar
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || confirming}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Borrador
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || confirming}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
            >
              {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {confirming ? 'Ingresando a Bodegas...' : 'Confirmar e Ingresar a Inventario'}
            </button>
          </div>
        </div>
      ) : isAuthorized ? (
        <div className="flex items-center justify-between gap-4 mt-8">
          <Link
            href="/dashboard/recepciones"
            className="px-5 py-3 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm no-underline text-sm"
          >
            Volver a Recepciones
          </Link>
          <button
            type="button"
            onClick={handleSaveCompleted}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando Cambios...' : 'Guardar Cambios en Recepción'}
          </button>
        </div>
      ) : null}

      {/* Scan Feedback Toast */}
      {scanFeedback && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm ${
            scanFeedback.type === 'success'
              ? 'bg-emerald-500'
              : scanFeedback.type === 'warning'
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {scanFeedback.type === 'success' ? '✅' : scanFeedback.type === 'warning' ? '⚠️' : '❌'}
          {scanFeedback.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}
