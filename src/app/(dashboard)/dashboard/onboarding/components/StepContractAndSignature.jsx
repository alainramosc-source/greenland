'use client';
import { FileText, Loader2, Download, PenLine, X, Check, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function StepContractAndSignature({
  isComplete,
  contract,
  generatingPdf,
  canvasRef,
  hasSigned,
  getSignedUrl,
  handleGenerateContract,
  startDraw,
  draw,
  endDraw,
  clearCanvas,
  handleSignContract,
  setStep,
}) {
  return (
    <div>
      <div className="mb-5">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-md">
          Paso 5 de 5
        </span>
        <h2 className="text-xl font-black text-slate-900 mt-2 mb-1">
          {isComplete ? '✅ Expediente Completo y Contrato Firmado' : 'Contrato de Colaboración y Firma Digital'}
        </h2>
        <p className="text-xs text-slate-500 m-0">
          {isComplete
            ? 'Tu contrato ha sido firmado exitosamente con sello criptográfico SHA-256. Tu expediente está activo.'
            : 'Genera tu contrato pre-llenado con tus datos fiscales, revísalo y fírmalo digitalmente.'}
        </p>
      </div>

      {/* Generate contract */}
      {!contract && (
        <div className="text-center py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40">
          <div className="w-12 h-12 rounded-2xl bg-[#6a9a04]/10 text-[#6a9a04] flex items-center justify-center mx-auto mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-black text-slate-800 m-0">Generar Borrador de Contrato</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-md mx-auto">
            Se generará el documento PDF oficial con tu razón social, RFC y domicilio fiscal registrados en el Paso 2.
          </p>
          <button
            onClick={handleGenerateContract}
            disabled={generatingPdf}
            className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer mx-auto disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Generar Contrato en PDF
          </button>
        </div>
      )}

      {/* Contract generated but not signed */}
      {contract && contract.status !== 'signed' && (
        <div className="space-y-4">
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 m-0">Contrato de Colaboración Comercial generado</p>
                <p className="text-[11px] text-slate-500 m-0">Descárgalo y revísalo antes de estampar tu firma autógrafa digital</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const url = await getSignedUrl(contract.contract_pdf_url);
                if (url) window.open(url, '_blank');
              }}
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all border-none cursor-pointer whitespace-nowrap"
            >
              <Download size={14} /> Ver / Descargar PDF
            </button>
          </div>

          {/* Signature area */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-black text-sm text-slate-900 m-0 flex items-center gap-2">
                <PenLine size={16} className="text-[#6a9a04]" /> Recuadro de Firma Autógrafa Digital
              </h3>
              <span className="text-[11px] text-slate-400">Usa el mouse, trackpad, stylus o pantalla táctil</span>
            </div>
            <p className="text-xs text-slate-500 mb-3 m-0">
              Dibuja tu firma lo más parecido a tu identificación oficial vigente:
            </p>

            <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden mb-4 shadow-xs" style={{ touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair"
                style={{ height: '180px', display: 'block' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>

            <div className="flex justify-between items-center flex-wrap gap-3">
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-bold bg-white cursor-pointer transition-all"
              >
                <X size={14} /> Limpiar recuadro
              </button>
              <button
                onClick={handleSignContract}
                disabled={!hasSigned || generatingPdf}
                className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                Firmar y Sellar Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract signed */}
      {contract && contract.status === 'signed' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-emerald-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-emerald-950 m-0">Certificado de Firma Electrónica</h3>
                  <p className="text-[11px] text-emerald-700 m-0">Documento íntegro verificado mediante SHA-256</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const url = await getSignedUrl(contract.contract_signed_pdf_url);
                  if (url) window.open(url, '_blank');
                }}
                className="flex items-center gap-2 bg-[#6a9a04] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Download size={14} /> Descargar Contrato Firmado
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider m-0">Fecha y Hora de Firma</p>
                <p className="text-slate-800 font-bold mt-1 m-0">
                  {contract.signed_at ? new Date(contract.signed_at).toLocaleString('es-MX') : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider m-0">Dirección IP de Origen</p>
                <p className="text-slate-800 font-mono font-bold mt-1 m-0">{contract.signer_ip || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider m-0">Huella Digital SHA-256</p>
                <p className="text-slate-800 font-mono text-[11px] font-bold mt-1 m-0 truncate" title={contract.document_hash}>
                  {contract.document_hash ? `${contract.document_hash.substring(0, 20)}...` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider m-0">Estatus Legal</p>
                <p className="text-emerald-700 font-black mt-1 m-0 flex items-center gap-1">
                  <ShieldCheck size={14} /> Firmado y Vigente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isComplete && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setStep(4)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white cursor-pointer transition-all"
          >
            <ArrowLeft size={15} /> Atrás
          </button>
        </div>
      )}
    </div>
  );
}
