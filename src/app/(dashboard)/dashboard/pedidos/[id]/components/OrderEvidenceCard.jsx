'use client';
import React from 'react';
import { Camera, Image as ImageIcon, Trash2, X, Upload, Loader2 } from 'lucide-react';

export default function OrderEvidenceCard({
  order,
  evidence,
  evidenceTab,
  setEvidenceTab,
  uploading,
  handleEvidenceUpload,
  handleDeleteEvidence,
  lightboxImg,
  setLightboxImg
}) {
  if (!order) return null;

  // Evidence section visible when in_fulfillment, shipped, closed
  const isVisible = ['in_fulfillment', 'shipped', 'closed'].includes(order.status);
  if (!isVisible && evidence.length === 0) return null;

  const filteredEvidence = evidence.filter(e => e.evidence_type === evidenceTab);
  const embarqueCount = evidence.filter(e => e.evidence_type === 'embarque').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Evidencias Fotográficas</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Fotos de embalaje, fletera y entrega del pedido
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
          <button
            onClick={() => setEvidenceTab('embarque')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              evidenceTab === 'embarque'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Embarque ({embarqueCount})
          </button>
          <button
            onClick={() => setEvidenceTab('flete')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              evidenceTab === 'flete'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Fletera ({evidence.filter(e => e.evidence_type === 'flete').length})
          </button>
          <button
            onClick={() => setEvidenceTab('llegada')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              evidenceTab === 'llegada'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Llegada ({evidence.filter(e => e.evidence_type === 'llegada').length})
          </button>
        </div>
      </div>

      {/* Upload buttons (when order is in_fulfillment, shipped, or active) */}
      {order.status === 'in_fulfillment' && (
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleEvidenceUpload(e.target.files, evidenceTab)}
              className="hidden"
            />
            <div className="py-3 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm">
              <Camera className="w-4 h-4" />
              <span>Tomar Foto con Cámara</span>
            </div>
          </label>

          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleEvidenceUpload(e.target.files, evidenceTab)}
              className="hidden"
            />
            <div className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Subir de Galería</span>
            </div>
          </label>
        </div>
      )}

      {uploading && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 flex items-center justify-center gap-3 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Subiendo fotos de evidencia a Supabase Storage...</span>
        </div>
      )}

      {/* Photos Grid */}
      {filteredEvidence.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sin fotos cargadas en esta sección</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Sube al menos 2 fotos de embarque para autorizar el envío
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredEvidence.map((ev) => (
            <div
              key={ev.id}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-sm"
            >
              <img
                src={ev.file_url}
                alt={ev.file_name || 'Evidencia'}
                onClick={() => setLightboxImg(ev.file_url)}
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                <div className="text-right">
                  {order.status === 'in_fulfillment' && (
                    <button
                      onClick={() => handleDeleteEvidence(ev)}
                      className="w-7 h-7 rounded-xl bg-red-600/90 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-md"
                      title="Eliminar evidencia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] font-medium text-white/90 truncate">
                  {new Date(ev.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxImg} alt="Evidencia en pantalla completa" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
