'use client';
import { User, Building2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function StepPersonType({
  personType,
  setPersonType,
  saving,
  handleSavePersonType,
}) {
  const options = [
    {
      val: 'fisica',
      icon: User,
      title: 'Persona Física',
      badge: 'Actividad Empresarial / RESICO',
      desc: 'Actividad comercial o empresarial registrada a nombre propio ante el SAT.',
      docs: ['Identificación Oficial (INE / Pasaporte)', 'Comprobante de Domicilio', 'Constancia de Situación Fiscal'],
    },
    {
      val: 'moral',
      icon: Building2,
      title: 'Persona Moral',
      badge: 'Sociedad Mercantil / S.A. / S.A.P.I.',
      desc: 'Empresa o sociedad legalmente constituida mediante escritura pública.',
      docs: ['Acta Constitutiva', 'Poder del Representante Legal', 'Identificación del Representante', 'Constancia Fiscal y Comprobante'],
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-md">
          Paso 1 de 5
        </span>
        <h2 className="text-xl font-black text-slate-900 mt-2 mb-1">¿Qué tipo de contribuyente eres?</h2>
        <p className="text-xs text-slate-500 m-0">
          Selecciona el régimen jurídico con el que facturarás y celebrarás tu contrato comercial con Greenland Products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {options.map(opt => {
          const isSelected = personType === opt.val;
          return (
            <button
              key={opt.val}
              onClick={() => setPersonType(opt.val)}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all cursor-pointer bg-white flex flex-col justify-between ${
                isSelected
                  ? 'border-[#6a9a04] bg-[#6a9a04]/[0.03] shadow-md shadow-[#6a9a04]/10'
                  : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-[#6a9a04] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {opt.badge}
                  </span>
                </div>

                <h3 className="font-black text-base text-slate-900 m-0">{opt.title}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">{opt.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Requisitos documentales:
                </p>
                <ul className="space-y-1 m-0 p-0 list-none">
                  {opt.docs.map((d, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#6a9a04]' : 'text-slate-300'}`} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleSavePersonType}
          disabled={!personType || saving}
          className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Continuar al Paso 2
        </button>
      </div>
    </div>
  );
}
