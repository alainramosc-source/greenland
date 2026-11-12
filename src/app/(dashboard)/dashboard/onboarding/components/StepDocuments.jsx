'use client';
import { Check, Upload, Eye, Loader2, ArrowLeft, ArrowRight, FileCheck } from 'lucide-react';

export default function StepDocuments({
  personType,
  requiredDocs,
  documents,
  uploading,
  powerInActa,
  allDocsUploaded,
  getSignedUrl,
  handleTogglePowerInActa,
  handleUploadDoc,
  handleFinishDocs,
  setStep,
}) {
  const uploadedCount = requiredDocs.filter(rd => documents.some(d => d.document_type === rd.type)).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-md">
            Paso 3 de 5
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2 mb-1">Carga de Documentación Legal</h2>
          <p className="text-xs text-slate-500 m-0">
            Sube los documentos requeridos en formato PDF o imagen legible (máximo 50 MB por archivo).
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
          <FileCheck size={16} className={allDocsUploaded ? 'text-[#6a9a04]' : 'text-slate-400'} />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            {uploadedCount} de {requiredDocs.length} completados
          </span>
        </div>
      </div>

      {/* Helper Box: Compression */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span>
            <strong>¿Tus escrituras notariales o poder pesan mucho?</strong> Puedes comprimir tus archivos PDF gratis sin perder legibilidad.
          </span>
        </div>
        <a
          href="https://www.ilovepdf.com/es/comprimir_pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all no-underline shrink-0 flex items-center gap-1 shadow-xs whitespace-nowrap"
        >
          Comprimir PDF ↗
        </a>
      </div>

      {/* Power inside Acta checkbox for Persona Moral */}
      {personType === 'moral' && (
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="powerInActa"
            checked={powerInActa}
            onChange={e => handleTogglePowerInActa(e.target.checked)}
            className="w-4 h-4 text-[#6a9a04] rounded border-slate-300 focus:ring-[#6a9a04] cursor-pointer"
          />
          <label htmlFor="powerInActa" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
            El Poder del Representante Legal ya viene integrado dentro del Acta Constitutiva
          </label>
        </div>
      )}

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {requiredDocs.map(rd => {
          const doc = documents.find(d => d.document_type === rd.type);
          const isUploadingState = uploading[rd.type];
          return (
            <div
              key={rd.type}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                doc
                  ? 'border-[#6a9a04]/30 bg-[#6a9a04]/[0.03]'
                  : 'border-dashed border-slate-300 bg-slate-50/40 hover:border-slate-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  doc ? 'bg-[#6a9a04]/15 text-[#6a9a04]' : 'bg-slate-100 text-slate-400'
                }`}>
                  {doc ? <Check size={18} /> : <Upload size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 m-0">{rd.label}</p>
                  {doc ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[11px] text-slate-500 truncate m-0" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px]">
                        {(doc.uploaded_at || doc.created_at) && (
                          <span className="text-slate-400">
                            {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('es-MX')}
                          </span>
                        )}
                        {doc.status === 'approved' && <span className="text-[#6a9a04] font-bold">✓ Aprobado</span>}
                        {doc.status === 'rejected' && <span className="text-red-500 font-bold">✗ Rechazado</span>}
                        {doc.status === 'pending' && <span className="text-amber-600 font-bold">⏳ En revisión</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-0.5 m-0">Pendiente de subir (PDF, JPG o PNG)</p>
                  )}

                  {typeof isUploadingState === 'string' && (
                    <p className="text-[11px] text-blue-600 font-semibold mt-1 animate-pulse flex items-center gap-1 m-0">
                      <Loader2 size={12} className="animate-spin" /> {isUploadingState}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                {doc && (
                  <button
                    onClick={async () => {
                      const url = await getSignedUrl(doc.file_url);
                      if (url) window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white rounded-lg text-xs font-bold text-slate-600 transition-colors border border-slate-200/80 bg-white/80 cursor-pointer"
                    title="Ver documento"
                  >
                    <Eye size={13} className="text-slate-500" />
                    Ver
                  </button>
                )}
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    isUploadingState
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : doc
                      ? 'bg-white border border-slate-200 text-slate-700 hover:border-[#6a9a04] hover:text-[#6a9a04]'
                      : 'bg-[#6a9a04] text-white hover:bg-[#6a9a04]/90 shadow-xs'
                  }`}
                >
                  {isUploadingState ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {doc ? 'Reemplazar' : 'Subir archivo'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files[0]) handleUploadDoc(rd.type, e.target.files[0]);
                    }}
                    disabled={!!isUploadingState}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white cursor-pointer transition-all"
        >
          <ArrowLeft size={15} /> Atrás
        </button>
        <button
          onClick={handleFinishDocs}
          disabled={!allDocsUploaded}
          className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50"
        >
          <ArrowRight size={16} /> Continuar al Paso 4
        </button>
      </div>
    </div>
  );
}
