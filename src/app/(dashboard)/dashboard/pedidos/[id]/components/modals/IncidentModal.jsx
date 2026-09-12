'use client';
import React from 'react';
import { X, MessageCircleWarning, Loader2 } from 'lucide-react';

export default function IncidentModal({
  showIncidentModal,
  setShowIncidentModal,
  incidentForm,
  setIncidentForm,
  handleReportIncident,
  submittingIncident
}) {
  if (!showIncidentModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-amber-600">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <MessageCircleWarning className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Reportar Incidencia</h3>
          </div>
          <button
            onClick={() => setShowIncidentModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Reporta cualquier anomalía con la entrega, mercancía dañada o faltante. El equipo de soporte revisará la información.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tipo de Incidencia
            </label>
            <select
              value={incidentForm.type}
              onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-800 bg-slate-50/50"
            >
              <option value="discrepancia">Faltante de piezas (Discrepancia)</option>
              <option value="danado">Producto Dañado / Defectuoso</option>
              <option value="retraso">Retraso en la Fletera</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Descripción de lo sucedido <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detalla lo sucedido, números de guía, fotos disponibles o paquetes afectados..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-800 placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={() => setShowIncidentModal(false)}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleReportIncident}
            disabled={submittingIncident}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {submittingIncident ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span>Enviar Reporte</span>
          </button>
        </div>
      </div>
    </div>
  );
}
