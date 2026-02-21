'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function InteractiveGallery({ sku, productName }) {
    // Array of up to 5 images
    const [images, setImages] = useState([
        { id: 1, url: `/productos/${sku}-P1.jpg`, failed: false, isPng: false },
        { id: 2, url: `/productos/${sku}-P2.jpg`, failed: false, isPng: false },
        { id: 3, url: `/productos/${sku}-P3.jpg`, failed: false, isPng: false },
        { id: 4, url: `/productos/${sku}-P4.jpg`, failed: false, isPng: false },
        { id: 5, url: `/productos/${sku}-P5.jpg`, failed: false, isPng: false }
    ]);

    const [baseImage, setBaseImage] = useState({ url: `/productos/${sku}.jpg`, isPng: false, failed: false });
    const [currentIndex, setCurrentIndex] = useState(0);

    // Zoom state
    const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

    const handleImageError = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            if (!newImages[index].isPng) {
                newImages[index].url = `/productos/${sku}-P${index + 1}.png`;
                newImages[index].isPng = true;
            } else {
                newImages[index].failed = true;
            }
            return newImages;
        });
    };

    const handleBaseImageError = () => {
        setBaseImage(prev => {
            if (!prev.isPng) {
                return { url: `/productos/${sku}.png`, isPng: true, failed: false };
            }
            return { ...prev, failed: true };
        });
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
            backgroundImage: `url(${validImages[safeCurrentIndex]?.url || baseImage.url})`,
            backgroundSize: '250%' // Zoom level
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({ display: 'none' });
    };

    // If no numbered images exist, just show the base one
    if (validImages.length === 0) {
        return (
            <div className="interactive-gallery w-full flex flex-col gap-4">
                <div
                    className="main-image-container relative w-full aspect-square bg-[#f8f9fa] rounded-xl overflow-hidden cursor-zoom-in"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <img
                        src={baseImage.url}
                        alt={productName}
                        className="w-full h-full object-cover mix-blend-multiply"
                        onError={handleBaseImageError}
                        style={{ display: baseImage.failed ? 'none' : 'block' }}
                    />
                    {baseImage.failed && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            Sin imagen disponible
                        </div>
                    )}

                    {/* Zoom Lens Overlay */}
                    <div
                        className="zoom-lens absolute inset-0 pointer-events-none transition-opacity duration-200"
                        style={{ ...zoomStyle, opacity: zoomStyle.display === 'block' ? 1 : 0 }}
                    />
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
                    src={validImages[safeCurrentIndex].url}
                    alt={`${productName} - Vista ${safeCurrentIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-300 mix-blend-multiply"
                    onError={() => handleImageError(images.findIndex(img => img.id === validImages[safeCurrentIndex].id))}
                />

                {/* Navigation Arrows */}
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

                {/* Zoom Lens Overlay */}
                <div
                    className="zoom-lens absolute inset-0 pointer-events-none transition-opacity duration-200"
                    style={{
                        ...zoomStyle,
                        opacity: zoomStyle.display === 'block' ? 1 : 0,
                        backgroundColor: 'white' // Prevents seeing the layout behind while zooming transparent PNGs
                    }}
                />
            </div>

            {/* Thumbnails */}
            {validImages.length > 1 && (
                <div className="thumbnails-container flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {validImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => selectThumbnail(idx)}
                            className={`thumbnail-btn relative min-w-[80px] w-[80px] h-[80px] rounded-lg overflow-hidden border-2 transition-all ${idx === safeCurrentIndex
                                    ? 'border-[var(--color-primary)] opacity-100 scale-105 shadow-md'
                                    : 'border-transparent opacity-60 hover:opacity-100 bg-[#f8f9fa]'
                                }`}
                        >
                            <img
                                src={img.url}
                                alt={`Miniatura ${idx + 1}`}
                                className="w-full h-full object-cover mix-blend-multiply"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
