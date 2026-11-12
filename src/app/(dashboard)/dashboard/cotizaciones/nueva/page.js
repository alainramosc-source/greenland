'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useQuotationForm, fmtMoney } from '@/hooks/useQuotationForm';
import ClientAndQuoteDetailsSection from './components/ClientAndQuoteDetailsSection';
import QuotationItemsSection from './components/QuotationItemsSection';
import ConditionsAndNotesSection from './components/ConditionsAndNotesSection';
import { ArrowLeft, Save, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function QuotationFormInner() {
  const {
    editId,
    brand,
    activeBrand,
    handleBrandChange,
    clientName, setClientName,
    clientCompany, setClientCompany,
    clientEmail, setClientEmail,
    clientPhone, setClientPhone,
    city, setCity,
    quoteDate, setQuoteDate,
    validityDays, setValidityDays,
    currency, setCurrency,
    includesIva, setIncludesIva,
    introText, setIntroText,
    conditions,
    addCondition,
    updateCondition,
    removeCondition,
    notes, setNotes,
    items,
    folio,
    templates,
    selectedTemplate,
    handleTemplateChange,
    productSearch,
    productResults,
    showProductDropdown,
    setShowProductDropdown,
    searchLoading,
    searchContainerRef,
    handleProductSearch,
    addProductFromSearch,
    addCustomItem,
    updateItem,
    removeItem,
    totals,
    saving,
    loading,
    toast,
    setToast,
    handleSave,
  } = useQuotationForm();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Cargando cotización...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full pb-28 space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all animate-slideIn ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded-lg transition-colors cursor-pointer bg-transparent border-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* ENTERPRISE HEADER CARD */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/dashboard/cotizaciones"
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all shrink-0"
              title="Volver a Cotizaciones"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 m-0">
                  {editId ? `Editar Cotización ${folio || ''}` : 'Nueva Cotización'}
                </h1>
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    color: activeBrand.color,
                    backgroundColor: `${activeBrand.color}15`,
                  }}
                >
                  {activeBrand.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                {editId
                  ? 'Actualiza conceptos, precios o condiciones comerciales y regenera el documento PDF'
                  : 'Configura datos del cliente, agrega productos y genera la cotización ejecutiva en PDF'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cotizado</span>
              <span className="text-base font-black text-slate-900 whitespace-nowrap">
                {fmtMoney(totals.total, currency)} <span className="text-xs font-bold text-slate-400">{currency}</span>
              </span>
            </div>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer bg-white disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-500" />}
              Guardar Borrador
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all cursor-pointer border-0 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: activeBrand.color }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generar PDF
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTIONS 1-3: BRAND, CLIENT, QUOTE PARAMS, TEMPLATE, INTRO */}
      {/* ============================================================ */}
      <ClientAndQuoteDetailsSection
        brand={brand}
        handleBrandChange={handleBrandChange}
        clientName={clientName}
        setClientName={setClientName}
        clientCompany={clientCompany}
        setClientCompany={setClientCompany}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        city={city}
        setCity={setCity}
        quoteDate={quoteDate}
        setQuoteDate={setQuoteDate}
        validityDays={validityDays}
        setValidityDays={setValidityDays}
        currency={currency}
        setCurrency={setCurrency}
        includesIva={includesIva}
        setIncludesIva={setIncludesIva}
        templates={templates}
        selectedTemplate={selectedTemplate}
        handleTemplateChange={handleTemplateChange}
        introText={introText}
        setIntroText={setIntroText}
      />

      {/* ============================================================ */}
      {/* SECTION 4: PRODUCTS & SERVICES */}
      {/* ============================================================ */}
      <QuotationItemsSection
        activeBrand={activeBrand}
        items={items}
        currency={currency}
        includesIva={includesIva}
        totals={totals}
        productSearch={productSearch}
        productResults={productResults}
        showProductDropdown={showProductDropdown}
        setShowProductDropdown={setShowProductDropdown}
        searchLoading={searchLoading}
        searchContainerRef={searchContainerRef}
        handleProductSearch={handleProductSearch}
        addProductFromSearch={addProductFromSearch}
        addCustomItem={addCustomItem}
        updateItem={updateItem}
        removeItem={removeItem}
      />

      {/* ============================================================ */}
      {/* SECTIONS 5-6: CONDITIONS & NOTES */}
      {/* ============================================================ */}
      <ConditionsAndNotesSection
        activeBrand={activeBrand}
        conditions={conditions}
        addCondition={addCondition}
        updateCondition={updateCondition}
        removeCondition={removeCondition}
        notes={notes}
        setNotes={setNotes}
      />

      {/* ============================================================ */}
      {/* STICKY ACTIONS BAR */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1650px] mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/dashboard/cotizaciones"
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium mr-2">
              {items.length} {items.length === 1 ? 'concepto' : 'conceptos'} · Total:{' '}
              <strong className="text-slate-900 font-black">{fmtMoney(totals.total, currency)}</strong>
            </span>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer bg-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Borrador
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer border-0 disabled:opacity-50"
              style={{
                backgroundColor: activeBrand.color,
                boxShadow: `0 6px 20px ${activeBrand.color}35`,
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in animation for toast */}
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Cargando...</p>
      </div>
    }>
      <QuotationFormInner />
    </Suspense>
  );
}
