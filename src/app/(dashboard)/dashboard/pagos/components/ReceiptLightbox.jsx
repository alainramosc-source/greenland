'use client';
import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function ReceiptLightbox({ lightboxImg, onClose }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [lightboxImg]);

  if (!lightboxImg) return null;

  const isPdf = lightboxImg.toLowerCase().includes('.pdf') || imgError;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <a
            href={lightboxImg}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors no-underline"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink size={14} />
            <span>Abrir en nueva pestaña</span>
          </a>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors border-none cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {isPdf ? (
          <div className="w-full h-[80vh] flex flex-col items-center justify-center">
            <iframe
              src={lightboxImg}
              className="w-full h-full rounded-xl border border-slate-200 bg-slate-50"
              title="Comprobante PDF"
            />
          </div>
        ) : (
          <img
            src={lightboxImg}
            alt="Comprobante"
            className="max-h-[82vh] max-w-full w-auto object-contain rounded-xl"
            onError={() => setImgError(true)}
          />
        )}
      </div>
    </div>
  );
}
