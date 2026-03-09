'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageCarousel({ images, alt = '' }) {
    const [current, setCurrent] = useState(0);

    if (!images || images.length === 0) return null;
    if (images.length === 1) {
        return (
            <div className="carousel-single">
                <img src={images[0]} alt={alt} />
            </div>
        );
    }

    const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
    const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

    return (
        <div className="carousel">
            <div className="carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
                {images.map((src, i) => (
                    <div className="carousel-slide" key={i}>
                        <img src={src} alt={`${alt} ${i + 1}`} />
                    </div>
                ))}
            </div>
            <button className="carousel-btn carousel-prev" onClick={prev} aria-label="Anterior">
                <ChevronLeft size={20} />
            </button>
            <button className="carousel-btn carousel-next" onClick={next} aria-label="Siguiente">
                <ChevronRight size={20} />
            </button>
            <div className="carousel-dots">
                {images.map((_, i) => (
                    <button
                        key={i}
                        className={`carousel-dot ${i === current ? 'active' : ''}`}
                        onClick={() => setCurrent(i)}
                        aria-label={`Imagen ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
