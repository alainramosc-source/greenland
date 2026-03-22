'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// SKUs that need object-contain (wide/panoramic images)
const CONTAIN_SKUS = ['GL06'];

export default function InteractiveGallery({ sku, productName }) {
    const objectFit = CONTAIN_SKUS.includes(sku) ? 'object-contain' : 'object-cover';

    const [images, setImages] = useState([
        { id: 1, url: `/productos/${sku}-P1.jpg`, failed: false, isPng: false },
        { id: 2, url: `/productos/${sku}-P2.jpg`, failed: false, isPng: false },
        { id: 3, url: `/productos/${sku}-P3.jpg`, failed: false, isPng: false },
        { id: 4, url: `/productos/${sku}-P4.jpg`, failed: false, isPng: false },
        { id: 5, url: `/productos/${sku}-P5.jpg`, failed: false, isPng: false }
    ]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

    // Synchronous guard to prevent double-processing the same error
    const handledErrors = useRef(new Set());

    const handleImageError = (imageId, failedSrc) => {
        // Use the actual src that failed as the key — this is synchronous
        // so even if React batches, the second call for the same src is blocked
        if (handledErrors.current.has(failedSrc)) return;
        handledErrors.current.add(failedSrc);

        setImages(prev => prev.map(img => {
            if (img.id !== imageId) return img;
            if (!img.isPng) {
                return { ...img, url: `/productos/${sku}-P${img.id}.png`, isPng: true };
            }
            return { ...img, failed: true };
        }));
    };

    const validImages = images.filter(img => !img.failed);
    const safeCurrentIndex = Math.min(currentIndex, Math.max(0, validImages.length - 1));

    const nextImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % validImages.length);
    };

    const prevImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
    };

    const selectThumbnail = (index) => {
        setCurrentIndex(index);
    };

    const handleMouseMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;

        setZoomStyle({
            display: 'block',
            backgroundPosition: `${x}% ${y}%`,
            backgroundImage: `url(${validImages[safeCurrentIndex]?.url})`,
            backgroundSize: '250%'
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({ display: 'none' });
    };

    if (validImages.length === 0) {
        return (
            <div className="interactive-gallery w-full flex flex-col gap-4">
                <div className="main-image-container relative w-full aspect-square bg-[#f8f9fa] rounded-xl overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        Sin imagen disponible
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="interactive-gallery flex flex-col gap-4 w-full h-full">
            {/* Main Image with Zoom */}
            <div
                className="main-image-container relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden cursor-zoom-in border border-gray-100 group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <img
                    key={validImages[safeCurrentIndex].url}
                    src={validImages[safeCurrentIndex].url}
                    alt={`${productName} - Vista ${safeCurrentIndex + 1}`}
                    className={`w-full h-full ${objectFit} transition-opacity duration-300 mix-blend-multiply`}
                    onError={(e) => handleImageError(validImages[safeCurrentIndex].id, e.target.src)}
                />

                {validImages.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            aria-label="Imagen anterior"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            aria-label="Siguiente imagen"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                <div
                    className="zoom-lens absolute inset-0 pointer-events-none transition-opacity duration-200"
                    style={{
                        ...zoomStyle,
                        opacity: zoomStyle.display === 'block' ? 1 : 0,
                        backgroundColor: 'white'
                    }}
                />
            </div>

            {/* Thumbnails */}
            {validImages.length > 1 && (
                <div className="thumbnails-container flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {validImages.map((img, idx) => (
                        <button
                            key={img.id}
                            onClick={() => selectThumbnail(idx)}
                            className={`thumbnail-btn relative min-w-[80px] w-[80px] h-[80px] rounded-lg overflow-hidden border-2 transition-all ${idx === safeCurrentIndex
                                ? 'border-[var(--color-primary)] opacity-100 scale-105 shadow-md'
                                : 'border-transparent opacity-60 hover:opacity-100 bg-[#f8f9fa]'
                                }`}
                        >
                            <img
                                key={img.url}
                                src={img.url}
                                alt={`Miniatura ${idx + 1}`}
                                className={`w-full h-full ${objectFit} mix-blend-multiply`}
                                onError={(e) => handleImageError(img.id, e.target.src)}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
