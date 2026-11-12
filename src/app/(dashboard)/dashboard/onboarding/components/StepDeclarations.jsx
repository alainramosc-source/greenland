'use client';
import { ArrowLeft, CheckSquare, Loader2, AlertTriangle } from 'lucide-react';

export default function StepDeclarations({
  declarations,
  setDeclarations,
  saving,
  setStep,
  handleAcceptDeclarations,
}) {
  const allAccepted =
    declarations.info_true &&
    declarations.terms &&
    declarations.contract &&
    declarations.privacy &&
    declarations.terms_use;

  const toggleAll = () => {
    const target = !allAccepted;
    setDeclarations({
      info_true: target,
      terms: target,
      contract: target,
      privacy: target,
      terms_use: target,
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-md">
            Paso 4 de 5
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2 mb-1">Consentimiento y Declaraciones Legales</h2>
          <p className="text-xs text-slate-500 m-0">
            Lee y acepta los siguientes puntos legales para proceder a la firma electrónica del contrato.
          </p>
        </div>
        <button
          onClick={toggleAll}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#6a9a04] hover:text-[#6a9a04] bg-white cursor-pointer transition-all whitespace-nowrap shrink-0"
        >
          {allAccepted ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      <div className="space-y-3 mb-5">
        {[
          {
            key: 'info_true',
            text: 'Declaro bajo protesta de decir verdad que la información proporcionada es veraz y corresponde a mi identidad y situación fiscal actual.',
          },
          {
            key: 'terms',
            text: 'Acepto los términos y condiciones comerciales de Greenland Products, incluyendo políticas de precios, pagos y devoluciones.',
          },
          {
            key: 'contract',
            text: 'Acepto celebrar el contrato de colaboración comercial con Greenland Products bajo los términos que se me presentarán en el siguiente paso.',
          },
        ].map(d => (
          <label
            key={d.key}
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              declarations[d.key]
                ? 'border-[#6a9a04]/30 bg-[#6a9a04]/[0.03]'
                : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <input
              type="checkbox"
              checked={declarations[d.key]}
              onChange={e => setDeclarations(prev => ({ ...prev, [d.key]: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-[#6a9a04] shrink-0 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-700 leading-relaxed">{d.text}</span>
          </label>
        ))}

        {/* Privacy & Terms checkboxes side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              declarations.privacy
                ? 'border-[#6a9a04]/30 bg-[#6a9a04]/[0.03]'
                : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <input
              type="checkbox"
              checked={declarations.privacy}
              onChange={e => setDeclarations(prev => ({ ...prev, privacy: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-[#6a9a04] shrink-0 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-700 leading-relaxed">
              He leído y acepto el{' '}
              <a
                href="/aviso-de-privacidad"
                target="_blank"
                className="text-[#6a9a04] font-bold hover:underline"
                onClick={e => e.stopPropagation()}
              >
                Aviso de Privacidad
              </a>
            </span>
          </label>

          <label
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              declarations.terms_use
                ? 'border-[#6a9a04]/30 bg-[#6a9a04]/[0.03]'
                : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <input
              type="checkbox"
              checked={declarations.terms_use}
              onChange={e => setDeclarations(prev => ({ ...prev, terms_use: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-[#6a9a04] shrink-0 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-700 leading-relaxed">
              Acepto los{' '}
              <a
                href="/terminos-de-uso"
                target="_blank"
                className="text-[#6a9a04] font-bold hover:underline"
                onClick={e => e.stopPropagation()}
              >
                Términos de Uso
              </a>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 mb-5">
        <p className="text-xs text-amber-800 flex items-center gap-2 m-0 font-medium">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          Al aceptar, se registrará tu dirección IP, fecha y hora como evidencia legal de tu consentimiento en la bitácora de auditoría.
        </p>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button
          onClick={() => setStep(3)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white cursor-pointer transition-all"
        >
          <ArrowLeft size={15} /> Atrás
        </button>
        <button
          onClick={handleAcceptDeclarations}
          disabled={saving || !allAccepted}
          className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
          Aceptar y Continuar a Firma
        </button>
      </div>
    </div>
  );
}
