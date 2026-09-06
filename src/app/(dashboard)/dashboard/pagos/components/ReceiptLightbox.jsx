'use client';
import { X } from 'lucide-react';

export default function ReceiptLightbox({ lightboxImg, onClose }) {
  if (!lightboxImg) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors">
          <X size={20} />
        </button>
        <img src={lightboxImg} alt="Comprobante" className="max-h-[85vh] w-auto object-contain rounded-xl" />
      </div>
    </div>
  );
}
