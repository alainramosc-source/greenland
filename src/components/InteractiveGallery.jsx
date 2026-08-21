'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// SKUs that need object-contain (wide/panoramic images)
const CONTAIN_SKUS = ['GL06', 'GL27', 'GL29', 'GL35', 'GL36', 'GL37', 'GL38'];

// Known image map to load exact files instantly without 404 cascades
const KNOWN_IMAGES = {
  GL01: ['/productos/GL01-P1.jpg', '/productos/GL01-P2.jpg', '/productos/GL01-P3.jpg', '/productos/GL01-P4.jpg', '/productos/GL01-P5.jpg'],
  GL02: ['/productos/GL02-P1.jpg', '/productos/GL02-P2.png', '/productos/GL02-P3.png', '/productos/GL02-P4.jpg', '/productos/GL02-P5.jpg'],
  GL03: ['/productos/GL03-P1.jpg', '/productos/GL03-P2.jpg', '/productos/GL03-P3.jpg', '/productos/GL03-P4.jpg', '/productos/GL03-P5.jpg'],
  GL04: ['/productos/GL04-P1.jpg', '/productos/GL04-P2.jpg', '/productos/GL04-P3.jpg', '/productos/GL04-P4.jpg', '/productos/GL04-P5.jpg'],
  GL05: ['/productos/GL05-P1.jpg', '/productos/GL05-P2.jpg', '/productos/GL05-P3.jpg', '/productos/GL05-P4.jpg', '/productos/GL05-P5.jpg'],
  GL06: ['/productos/GL06-P1.jpg', '/productos/GL06-P2.jpg', '/productos/GL06-P3.jpg', '/productos/GL06-P4.jpg', '/productos/GL06-P5.jpg'],
  GL07: ['/productos/GL07-P1.jpg', '/productos/GL07-P2.jpg', '/productos/GL07-P3.jpg', '/productos/GL07-P4.jpg', '/productos/GL07-P5.jpg'],
  GL08: ['/productos/GL08-P1.jpg', '/productos/GL08-P2.jpg', '/productos/GL08-P3.jpg', '/productos/GL08-P4.jpg', '/productos/GL08-P5.jpg'],
  GL09: ['/productos/GL09-P1.png', '/productos/GL09-P2.png', '/productos/GL09-P3.png', '/productos/GL09-P4.png', '/productos/GL09-P5.png'],
  GL10: ['/productos/GL10-P1.png', '/productos/GL10-P2.png', '/productos/GL10-P3.png', '/productos/GL10-P4.png', '/productos/GL10-P5.png'],
  GL11: ['/productos/GL11-P1.png', '/productos/GL11-P2.png', '/productos/GL11-P3.png', '/productos/GL11-P4.png', '/productos/GL11-P5.png'],
  GL12: ['/productos/GL12-P1.png', '/productos/GL12-P2.png', '/productos/GL12-P3.png', '/productos/GL12-P4.png', '/productos/GL12-P5.png'],
  GL13: ['/productos/GL13-P1.png', '/productos/GL13-P2.png', '/productos/GL13-P3.png', '/productos/GL13-P4.png', '/productos/GL13-P5.png'],
  GL14: ['/productos/GL14-P1.png', '/productos/GL14-P2.png', '/productos/GL14-P3.png', '/productos/GL14-P4.png', '/productos/GL14-P5.png'],
  GL15: ['/productos/GL15-P1.png', '/productos/GL15-P2.png', '/productos/GL15-P3.png', '/productos/GL15-P4.png', '/productos/GL15-P5.png'],
  GL16: ['/productos/GL16-P1.png', '/productos/GL16-P2.png', '/productos/GL16-P3.png', '/productos/GL16-P4.png', '/productos/GL16-P5.png'],
  GL17: ['/productos/GL17-P1.png', '/productos/GL17-P2.png', '/productos/GL17-P3.png', '/productos/GL17-P4.png', '/productos/GL17-P5.png'],
  GL18: ['/productos/GL18-P1.png', '/productos/GL18-P2.png', '/productos/GL18-P3.png', '/productos/GL18-P4.png', '/productos/GL18-P5.png'],
  GL19: ['/productos/GL19-P1.png', '/productos/GL19-P2.png', '/productos/GL19-P3.png', '/productos/GL19-P4.png', '/productos/GL19-P5.png'],
  GL20: ['/productos/GL20-P1.png', '/productos/GL20-P2.png', '/productos/GL20-P3.png', '/productos/GL20-P4.png', '/productos/GL20-P5.png', '/productos/GL20-P6.png', '/productos/GL20-P7.png'],
  GL21: ['/productos/GL21-P1.jpg', '/productos/GL21-P2.jpg'],
  GL22: ['/productos/GL22-P1.png', '/productos/GL22-P2.png', '/productos/GL22-P3.png', '/productos/GL22-P4.png', '/productos/GL22-P5.png'],
  GL23: ['/productos/GL23-P1.png', '/productos/GL23-P2.png', '/productos/GL23-P3.png', '/productos/GL23-P4.png', '/productos/GL23-P5.png'],
  GL24: ['/productos/GL24-P1.jpg', '/productos/GL24-P2.jpg', '/productos/GL24-P3.jpg'],
  GL25: ['/productos/GL25-P1.jpg'],
  GL26: ['/productos/GL26-P1.jpg'],
  GL27: ['/productos/GL27-P1.jpg'],
  GL28: ['/productos/GL28-P1.png'],
  GL29: ['/productos/GL29-P1.png'],
  GL31: ['/productos/GL31-P1.jpg'],
  GL32: ['/productos/GL32-P1.jpg'],
  GL33: ['/productos/GL33-P1.jpg'],
  GL34: ['/productos/GL34-P1.jpg'],
  GL35: ['/productos/GL35-P1.jpg'],
  GL36: ['/productos/GL36-P1.jpg'],
  GL37: ['/productos/GL37-P1.jpg'],
  GL38: ['/productos/GL38-P1.jpg'],
  GL39: ['/productos/GL39-P1.png'],
  GL40: ['/productos/GL40-P1.png'],
  GL41: ['/productos/GL41-P1.png'],
  GL42: ['/productos/GL42-P1.png'],
  GL44: ['/productos/GL44-P1.jpg'],
  GL47: ['/productos/GL47-P1.png'],
  GL48: ['/productos/GL48-P1.png'],
  GL49: ['/productos/GL49-P1.png'],
  GL50: ['/productos/GL50-P1.png'],
  GL51: ['/productos/GL51-P1.png'],
  GL52: ['/productos/GL52-P1.png'],
};

export default function InteractiveGallery({ sku, productName }) {
    const objectFit = CONTAIN_SKUS.includes(sku) ? 'object-contain' : 'object-cover';
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
    const [loading, setLoading] = useState(true);

    // On mount, probe or use known image URLs
    useEffect(() => {
        if (KNOWN_IMAGES[sku]) {
            setImages(KNOWN_IMAGES[sku].map((url, i) => ({ id: i + 1, url })));
            setLoading(false);
            return;
        }

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
                // Try PNG first (for newer products), then JPG
                if (await probeImage(c.pngUrl)) return { id: c.id, url: c.pngUrl };
                if (await probeImage(c.jpgUrl)) return { id: c.id, url: c.jpgUrl };
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
