'use client';
import { TAX_REGIMES } from '@/hooks/useOnboarding';
import { ArrowLeft, ArrowRight, Loader2, Shield, UserCheck, MapPin } from 'lucide-react';

export default function StepGeneralData({
  personType,
  formData,
  updateField,
  saving,
  setStep,
  handleSaveGeneralData,
}) {
  return (
    <div>
      <div className="mb-5">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-md">
          Paso 2 de 5
        </span>
        <h2 className="text-xl font-black text-slate-900 mt-2 mb-1">Datos Fiscales y Domicilio</h2>
        <p className="text-xs text-slate-500 m-0">
          {personType === 'fisica'
            ? 'Ingresa tus datos exactamente como aparecen en tu Constancia de Situación Fiscal como Persona Física.'
            : 'Ingresa los datos legales de la empresa y de su Representante Legal.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: IDENTITY, RFC, REGIME & CONTACT (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70">
            <UserCheck size={16} className="text-[#6a9a04]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 m-0">
              Identificación Fiscal y Contacto
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {personType === 'fisica' ? (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => updateField('full_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                    placeholder="Nombre(s) y Apellidos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CURP *</label>
                  <input
                    type="text"
                    value={formData.curp}
                    onChange={e => updateField('curp', e.target.value.toUpperCase())}
                    maxLength={18}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm font-mono uppercase"
                    placeholder="XXXX000000XXXXXXXX"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Razón Social *</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={e => updateField('legal_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                    placeholder="Razón Social S.A. de C.V."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Representante Legal *</label>
                  <input
                    type="text"
                    value={formData.legal_rep_name}
                    onChange={e => updateField('legal_rep_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                    placeholder="Nombre completo del representante legal"
                  />
                </div>
              </>
            )}

            <div className={personType === 'fisica' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-bold text-slate-600 mb-1">RFC *</label>
              <input
                type="text"
                value={formData.rfc}
                onChange={e => updateField('rfc', e.target.value.toUpperCase())}
                maxLength={13}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm font-mono uppercase"
                placeholder={personType === 'fisica' ? 'XXXX000000XX0' : 'XXX000000XX0'}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Régimen Fiscal SAT *</label>
              <select
                value={formData.tax_regime}
                onChange={e => updateField('tax_regime', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm cursor-pointer"
              >
                <option value="">— Seleccionar régimen fiscal —</option>
                {TAX_REGIMES.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => updateField('email', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => updateField('phone', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                placeholder="10 dígitos"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FISCAL ADDRESS (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70">
              <MapPin size={16} className="text-[#6a9a04]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 m-0">
                Domicilio Fiscal
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3.5">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Calle / Avenida *</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={e => updateField('street', e.target.value)}
                  placeholder="Nombre de vialidad"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">No. Ext</label>
                <input
                  type="text"
                  value={formData.exterior_num}
                  onChange={e => updateField('exterior_num', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">No. Int</label>
                <input
                  type="text"
                  value={formData.interior_num}
                  onChange={e => updateField('interior_num', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Colonia / Fraccionamiento *</label>
                <input
                  type="text"
                  value={formData.colonia}
                  onChange={e => updateField('colonia', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Código Postal *</label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={e => updateField('zip_code', e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1">Ciudad / Municipio *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => updateField('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1">Estado / Entidad *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => updateField('state', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 flex items-center gap-2.5 text-xs text-slate-500">
            <Shield size={15} className="text-[#6a9a04] shrink-0" />
            <span>Estos datos se utilizarán automáticamente para pre-llenar tu Contrato de Colaboración Comercial.</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white cursor-pointer transition-all"
        >
          <ArrowLeft size={15} /> Atrás
        </button>
        <button
          onClick={handleSaveGeneralData}
          disabled={saving}
          className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Guardar y Continuar
        </button>
      </div>
    </div>
  );
}
