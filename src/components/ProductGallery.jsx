'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGallery({ sku, productName }) {
    // Determine how many images a product has based on the naming convention (GL01-P1.jpg, GL01-P2.jpg, etc.)
    // We will attempt to load up to 5 images. If an image doesn't exist, the onError handler will mark it as failed.
    const [images, setImages] = useState([
        { id: 1, url: `/productos/${sku}-P1.jpg`, failed: false, isPng: false, pngFailed: false },
        { id: 2, url: `/productos/${sku}-P2.jpg`, failed: false, isPng: false, pngFailed: false },
        { id: 3, url: `/productos/${sku}-P3.jpg`, failed: false, isPng: false, pngFailed: false },
        { id: 4, url: `/productos/${sku}-P4.jpg`, failed: false, isPng: false, pngFailed: false },
        { id: 5, url: `/productos/${sku}-P5.jpg`, failed: false, isPng: false, pngFailed: false }
    ]);

    const [baseImage, setBaseImage] = useState({ url: `/productos/${sku}.jpg`, isPng: false, failed: false });
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleImageError = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            if (!newImages[index].isPng) {
                // If JPG failed, try PNG next
                newImages[index].url = `/productos/${sku}-P${index + 1}.png`;
                newImages[index].isPng = true;
            } else {
                // If PNG also failed, mark as totally failed
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

    // If no -P images loaded but we haven't tried the base one
    if (validImages.length === 0) {
        // No valid images found for this product
        return (
            <div className="product-image-container relative h-full w-full flex items-center justify-center bg-[#1a1a2e]">
                <img
                    src={baseImage.url}
                    alt={productName}
                    className="object-cover w-full h-full absolute inset-0"
                    onError={(e) => {
                        handleBaseImageError();
                        if (baseImage.isPng) {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
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
            <img
                src={validImages[safeCurrentIndex].url}
                alt={`${productName} - Vista ${safeCurrentIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={() => handleImageError(images.findIndex(img => img.id === validImages[safeCurrentIndex].id))}
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
