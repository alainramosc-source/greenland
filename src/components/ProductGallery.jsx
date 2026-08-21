'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// SKUs that need object-contain (wide/panoramic images and Deco slabs)
const CONTAIN_SKUS = [
  'GL06', 'GL27', 'GL28', 'GL29', 'GL35', 'GL36', 'GL37', 'GL38', 
  'GL39', 'GL40', 'GL41', 'GL42', 'GL45', 'GL46', 'GL47', 'GL48', 
  'GL49', 'GL50', 'GL51', 'GL52'
];

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

export default function ProductGallery({ sku, productName }) {
    const objectFit = CONTAIN_SKUS.includes(sku) ? 'object-contain' : 'object-cover';

    // Get pre-mapped images if available, otherwise construct default fallback candidate URLs
    const initialUrls = KNOWN_IMAGES[sku] || [
        `/productos/${sku}-P1.png`,
        `/productos/${sku}-P1.jpg`,
        `/productos/${sku}.png`,
        `/productos/${sku}.jpg`,
    ];

    const [failedUrls, setFailedUrls] = useState(new Set());
    const [currentIndex, setCurrentIndex] = useState(0);

    const validUrls = initialUrls.filter(url => !failedUrls.has(url));

    const handleImageError = (failedUrl) => {
        setFailedUrls(prev => new Set(prev).add(failedUrl));
    };

    if (validUrls.length === 0) {
        return (
            <div className="product-image-container relative h-full w-full flex items-center justify-center bg-[#1a1a2e]">
                <div className="placeholder text-white opacity-30 flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">Sin imagen</span>
                    <span className="text-xs text-slate-400">({sku})</span>
                </div>
            </div>
        );
    }

    const safeCurrentIndex = Math.min(currentIndex, validUrls.length - 1);

    const nextImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % validUrls.length);
    };

    const prevImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? validUrls.length - 1 : prev - 1));
    };

    return (
        <div className="product-gallery relative w-full h-full group">
            <Image
                key={validUrls[safeCurrentIndex]}
                src={validUrls[safeCurrentIndex]}
                alt={`${productName || sku} - Vista ${safeCurrentIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={80}
                className="transition-opacity duration-300"
                style={{ objectFit }}
                onError={() => handleImageError(validUrls[safeCurrentIndex])}
            />

            {validUrls.length > 1 && (
                <>
                    <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                        aria-label="Imagen anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                        aria-label="Siguiente imagen"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {validUrls.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${idx === safeCurrentIndex ? 'bg-white' : 'bg-white/40'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
