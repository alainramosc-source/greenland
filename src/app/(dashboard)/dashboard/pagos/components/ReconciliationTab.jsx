'use client';
import { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, RefreshCw, Search } from 'lucide-react';

export default function ReconciliationTab({
  payments = [],
  parsedMovements = [],
  matchResults = [],
  onParseCSV,
  onParsePDF,
  actionLoading
}) {
  const [file, setFile] = useState(null);

  const handleFileUpload = (e) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);

    if (uploaded.name.endsWith('.csv') || uploaded.name.endsWith('.xlsx')) {
      onParseCSV(uploaded);
    } else if (uploaded.name.endsWith('.pdf')) {
      onParsePDF(uploaded);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#6a9a04]" />
          Conciliación Bancaria Automática
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Sube tu estado de cuenta bancario (CSV, Excel o PDF) para cotejar automáticamente las referencias de depósito con los pagos pendientes.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6a9a04] hover:bg-[#588203] text-white font-bold text-sm shadow-sm transition-all">
            <Upload size={16} />
            <span>Cargar Estado de Cuenta</span>
            <input
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {file && (
            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
              Archivo: {file.name}
            </span>
          )}
        </div>
      </div>

      {matchResults.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-base">
            Resultados del Cotejo ({matchResults.length})
          </h4>
          <div className="divide-y divide-slate-100">
            {matchResults.map((res, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800">
                    Ref: {res.reference}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">(${res.amount})</span>
                </div>
                <div>
                  {res.matched ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 size={16} /> Coincide con pago #{res.paymentId}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold">
                      <AlertTriangle size={16} /> Sin coincidencia directa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
