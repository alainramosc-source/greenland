'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// SKUs that need object-contain (wide/panoramic images)
const CONTAIN_SKUS = ['GL06'];

export default function ProductGallery({ sku, productName }) {
    const objectFit = CONTAIN_SKUS.includes(sku) ? 'object-contain' : 'object-cover';
    // Determine how many images a product has based on the naming convention (GL01-P1.jpg, GL01-P2.jpg, etc.)
    // We will attempt to load up to 10 images. If an image doesn't exist, the onError handler will mark it as failed.
    const maxImages = 10;
    const [images, setImages] = useState(
        Array.from({ length: maxImages }, (_, i) => ({
            id: i + 1,
            url: `/productos/${sku}-P${i + 1}.jpg`,
            failed: false,
            isPng: false,
            pngFailed: false,
        }))
    );

    const [baseImage, setBaseImage] = useState({ url: `/productos/${sku}.jpg`, isPng: false, failed: false });
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleImageError = (index, failedSrc) => {
        if (!failedSrc) return;
        // Synchronous guard to prevent double-processing
        if (handleImageError._handled.has(failedSrc)) return;
        handleImageError._handled.add(failedSrc);
        setImages(prev => {
            const newImages = [...prev];
            if (!newImages[index].isPng) {
                // If JPG failed, try PNG next
                newImages[index] = { ...newImages[index], url: `/productos/${sku}-P${index + 1}.png`, isPng: true };
            } else {
                // If PNG also failed, mark as totally failed
                newImages[index] = { ...newImages[index], failed: true };
            }
            return newImages;
        });
    };
    // Initialize the guard set
    if (!handleImageError._handled) handleImageError._handled = new Set();

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

    // If no -P images loaded but we haven't tried the base one
    if (validImages.length === 0) {
        // No valid images found for this product
        return (
            <div className="product-image-container relative h-full w-full flex items-center justify-center bg-[#1a1a2e]">
                <Image
                    src={baseImage.url}
                    alt={productName}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={80}
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                        handleBaseImageError();
                        if (baseImage.isPng) {
                            e.target.style.display = 'none';
                            e.target.parentElement.querySelector('.placeholder').style.display = 'flex';
                        }
                    }}
                />
                <div className="placeholder hidden text-white opacity-30">
                    <span className="text-sm">Sin imagen ({sku})</span>
                </div>
            </div>
        );
    }

    return (
        <div className="product-gallery relative w-full h-full group">
            <Image
                key={validImages[safeCurrentIndex].url}
                src={validImages[safeCurrentIndex].url}
                alt={`${productName} - Vista ${safeCurrentIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={80}
                className="transition-opacity duration-300"
                style={{ objectFit: CONTAIN_SKUS.includes(sku) ? 'contain' : 'cover' }}
                onError={(e) => handleImageError(images.findIndex(img => img.id === validImages[safeCurrentIndex].id), e.target.src)}
            />

            {validImages.length > 1 && (
                <>
                    <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Imagen anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Siguiente imagen"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {validImages.map((_, idx) => (
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
