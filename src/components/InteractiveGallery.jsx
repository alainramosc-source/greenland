'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// SKUs that need object-contain (wide/panoramic images)
const CONTAIN_SKUS = ['GL06', 'GL29', 'GL35', 'GL36', 'GL37', 'GL38'];

export default function InteractiveGallery({ sku, productName }) {
    const objectFit = CONTAIN_SKUS.includes(sku) ? 'object-contain' : 'object-cover';
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
    const [loading, setLoading] = useState(true);

    // On mount, probe all possible image URLs to find which ones actually exist
    useEffect(() => {
        const candidates = [];
        for (let i = 1; i <= 5; i++) {
            candidates.push({ id: i, jpgUrl: `/productos/${sku}-P${i}.jpg`, pngUrl: `/productos/${sku}-P${i}.png` });
        }

        const probeImage = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });

        Promise.all(
            candidates.map(async (c) => {
                // Try JPG first
                if (await probeImage(c.jpgUrl)) return { id: c.id, url: c.jpgUrl };
                // Try PNG
                if (await probeImage(c.pngUrl)) return { id: c.id, url: c.pngUrl };
                // Neither exists
                return null;
            })
        ).then(results => {
            setImages(results.filter(Boolean));
            setLoading(false);
        });
    }, [sku]);

    const nextImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
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
            backgroundImage: `url(${images[currentIndex]?.url})`,
            backgroundSize: '250%'
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({ display: 'none' });
    };

    if (loading) {
        return (
            <div className="interactive-gallery w-full flex flex-col gap-4">
                <div className="main-image-container relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (images.length === 0) {
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

    const safeIndex = Math.min(currentIndex, images.length - 1);

    return (
        <div className="interactive-gallery flex flex-col gap-4 w-full h-full">
            {/* Main Image with Zoom */}
            <div
                className="main-image-container relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden cursor-zoom-in border border-gray-100 group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <NextImage
                    src={images[safeIndex].url}
                    alt={`${productName} - Vista ${safeIndex + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={80}
                    className="transition-opacity duration-300 mix-blend-multiply"
                    style={{ objectFit: CONTAIN_SKUS.includes(sku) ? 'contain' : 'cover' }}
                />

                {images.length > 1 && (
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
            {images.length > 1 && (
                <div className="thumbnails-container flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {images.map((img, idx) => (
                        <button
                            key={img.id}
                            onClick={() => selectThumbnail(idx)}
                            className={`thumbnail-btn relative min-w-[80px] w-[80px] h-[80px] rounded-lg overflow-hidden border-2 transition-all ${idx === safeIndex
                                ? 'border-[var(--color-primary)] opacity-100 scale-105 shadow-md'
                                : 'border-transparent opacity-60 hover:opacity-100 bg-[#f8f9fa]'
                                }`}
                        >
                            <NextImage
                                src={img.url}
                                alt={`Miniatura ${idx + 1}`}
                                width={80}
                                height={80}
                                quality={80}
                                className="mix-blend-multiply"
                                style={{ objectFit: CONTAIN_SKUS.includes(sku) ? 'contain' : 'cover', width: '100%', height: '100%' }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
