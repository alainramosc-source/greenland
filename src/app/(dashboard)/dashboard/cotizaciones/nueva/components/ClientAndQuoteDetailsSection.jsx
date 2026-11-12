'use client';
import { BRANDS } from '@/hooks/useQuotationForm';
import { CheckCircle, ChevronDown, User, Calendar, FileCheck2, MessageSquareText } from 'lucide-react';

export default function ClientAndQuoteDetailsSection({
  brand,
  handleBrandChange,
  clientName,
  setClientName,
  clientCompany,
  setClientCompany,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  city,
  setCity,
  quoteDate,
  setQuoteDate,
  validityDays,
  setValidityDays,
  currency,
  setCurrency,
  includesIva,
  setIncludesIva,
  templates,
  selectedTemplate,
  handleTemplateChange,
  introText,
  setIntroText,
}) {
  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* BRAND SELECTOR */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            1. Línea de Negocio / Marca
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {BRANDS.map((b) => {
            const Icon = b.icon;
            const isSelected = brand === b.key;
            return (
              <button
                key={b.key}
                onClick={() => handleBrandChange(b.key)}
                className={`relative flex items-center gap-3.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer bg-transparent text-left ${
                  isSelected
                    ? 'shadow-sm'
                    : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                style={isSelected ? {
                  borderColor: b.color,
                  backgroundColor: b.lightBg,
                  borderLeftWidth: '4px',
                } : {}}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${b.color}15`, color: b.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 pr-5">
                  <p className="font-bold text-sm text-slate-800 m-0 truncate">{b.name}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">{b.description}</p>
                </div>
                {isSelected && (
                  <div
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: b.color }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2-COLUMN GRID: CLIENT INFO + QUOTE PARAMS & TEMPLATE */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CLIENT INFO (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                2. Información del Cliente
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nombre del cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Empresa</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(844) 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Ciudad / Destino</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ciudad, Estado"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* QUOTE DETAILS + TEMPLATE (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Calendar className="w-4 h-4" />
              </div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                3. Parámetros de Cotización
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vigencia (días)</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  min="1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm bg-slate-50/40 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Moneda</label>
                <div className="flex gap-2">
                  {['MXN', 'USD'].map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer bg-transparent ${
                        currency === c
                          ? 'border-[#6a9a04] text-[#6a9a04]'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                      style={currency === c ? { backgroundColor: 'rgba(106,154,4,0.06)' } : {}}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Impuestos (IVA)</label>
                <button
                  onClick={() => setIncludesIva(!includesIva)}
                  className={`w-full px-3 py-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer bg-transparent flex items-center justify-center gap-2 whitespace-nowrap ${
                    includesIva
                      ? 'border-[#6a9a04] text-[#6a9a04]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={includesIva ? { backgroundColor: 'rgba(106,154,4,0.06)' } : {}}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                    includesIva ? 'bg-[#6a9a04]' : 'border-2 border-slate-300'
                  }`}>
                    {includesIva && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  IVA incluido
                </button>
              </div>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#6a9a04]" />
                <label className="text-xs font-bold text-slate-700">Plantilla rápida</label>
              </div>
              <div className="relative">
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-xs font-medium appearance-none cursor-pointer pr-9 bg-slate-50/60"
                >
                  <option value="">— Seleccionar plantilla para pre-llenar textos —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* INTRO TEXT */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Texto Introductorio / Presentación
            </label>
          </div>
          <span className="text-[11px] text-slate-400">Opcional · Aparece al inicio del PDF</span>
        </div>
        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          rows={2}
          placeholder="Estimado cliente, a continuación le presentamos nuestra propuesta económica..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm resize-y bg-slate-50/40 focus:bg-white"
        />
      </div>
    </div>
  );
}
