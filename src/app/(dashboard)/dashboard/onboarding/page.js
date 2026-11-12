'use client';
import { useOnboarding, STEPS } from '@/hooks/useOnboarding';
import StepPersonType from './components/StepPersonType';
import StepGeneralData from './components/StepGeneralData';
import StepDocuments from './components/StepDocuments';
import StepDeclarations from './components/StepDeclarations';
import StepContractAndSignature from './components/StepContractAndSignature';
import { Check, ChevronRight, Loader2, Shield, CheckCircle2, Clock } from 'lucide-react';

export default function OnboardingPage() {
  const {
    loading,
    saving,
    step,
    setStep,
    profile,
    documents,
    contract,
    uploading,
    powerInActa,
    personType,
    setPersonType,
    formData,
    updateField,
    declarations,
    setDeclarations,
    canvasRef,
    hasSigned,
    generatingPdf,
    requiredDocs,
    allDocsUploaded,
    isComplete,
    getSignedUrl,
    handleSavePersonType,
    handleSaveGeneralData,
    handleTogglePowerInActa,
    handleUploadDoc,
    handleFinishDocs,
    handleAcceptDeclarations,
    handleGenerateContract,
    startDraw,
    draw,
    endDraw,
    clearCanvas,
    handleSignContract,
  } = useOnboarding();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6a9a04]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4 pb-10">
      {/* ============================================================ */}
      {/* ENTERPRISE HEADER CARD */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#6a9a04]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 m-0">
                  Mi Expediente Digital
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] whitespace-nowrap">
                  COMPLIANCE & CONTRATOS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Completa tu registro fiscal, sube tu documentación oficial y firma digitalmente tu contrato de colaboración con Greenland
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isComplete ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold whitespace-nowrap">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Expediente Completo
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold whitespace-nowrap">
                <Clock size={15} className="text-amber-600" />
                En Proceso · Paso {step} de {STEPS.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ENTERPRISE STEPPER BAR */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {STEPS.map((s, i) => {
            const isCurrent = step === s.num;
            const isDone = s.num < step || isComplete;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    if (s.num <= step || (profile && s.num <= step)) setStep(s.num);
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none w-full justify-center whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#6a9a04] text-white shadow-sm shadow-[#6a9a04]/25'
                      : isDone
                      ? 'bg-[#6a9a04]/10 text-[#6a9a04] hover:bg-[#6a9a04]/15'
                      : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isDone
                      ? 'bg-[#6a9a04] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isDone && !isCurrent ? <Check size={12} /> : s.num}
                  </div>
                  <span>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={15} className="text-slate-300 mx-1.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP CONTENT CONTAINER */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 md:p-7">
        {step === 1 && (
          <StepPersonType
            personType={personType}
            setPersonType={setPersonType}
            saving={saving}
            handleSavePersonType={handleSavePersonType}
          />
        )}

        {step === 2 && (
          <StepGeneralData
            personType={personType}
            formData={formData}
            updateField={updateField}
            saving={saving}
            setStep={setStep}
            handleSaveGeneralData={handleSaveGeneralData}
          />
        )}

        {step === 3 && (
          <StepDocuments
            personType={personType}
            requiredDocs={requiredDocs}
            documents={documents}
            uploading={uploading}
            powerInActa={powerInActa}
            allDocsUploaded={allDocsUploaded}
            getSignedUrl={getSignedUrl}
            handleTogglePowerInActa={handleTogglePowerInActa}
            handleUploadDoc={handleUploadDoc}
            handleFinishDocs={handleFinishDocs}
            setStep={setStep}
          />
        )}

        {step === 4 && (
          <StepDeclarations
            declarations={declarations}
            setDeclarations={setDeclarations}
            saving={saving}
            setStep={setStep}
            handleAcceptDeclarations={handleAcceptDeclarations}
          />
        )}

        {step === 5 && (
          <StepContractAndSignature
            isComplete={isComplete}
            contract={contract}
            generatingPdf={generatingPdf}
            canvasRef={canvasRef}
            hasSigned={hasSigned}
            getSignedUrl={getSignedUrl}
            handleGenerateContract={handleGenerateContract}
            startDraw={startDraw}
            draw={draw}
            endDraw={endDraw}
            clearCanvas={clearCanvas}
            handleSignContract={handleSignContract}
            setStep={setStep}
          />
        )}
      </div>
    </div>
  );
}
