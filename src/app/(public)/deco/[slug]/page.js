'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Droplets, Shield, Paintbrush, Leaf, Wrench, Clock, Thermometer, Recycle, Sparkles } from 'lucide-react';
import './product-detail.css';

// Product data registry - expandable for future products
const PRODUCT_DATA = {
  'wpc-interior': {
    number: '01',
    name: 'WPC Interior',
    subtitle: 'Lambrín y Panel Acanalado',
    tagline: 'Paneles de WPC (Wood Plastic Composite) para interiores con acabado acanalado tipo fluted. Disponibles en múltiples tonalidades de madera, ofrecen una instalación rápida con sistema de clipaje y un acabado premium que transforma cualquier espacio.',
    color: '#8B6F47',
    heroImage: '/deco/wpc-interior/living-room.png',
    gallery: [
      { src: '/deco/wpc-interior/living-room.png', title: 'Sala de estar', desc: 'Paneles fluted en tono roble natural', large: true },
      { src: '/deco/wpc-interior/closeup.png', title: 'Detalle de textura', desc: 'Acabado veta de madera' },
      { src: '/deco/wpc-interior/color-samples.png', title: 'Paleta de colores', desc: 'Más de 20 opciones disponibles' },
      { src: '/deco/wpc-interior/bedroom.png', title: 'Recámara', desc: 'Cabecera de panel acanalado' },
      { src: '/deco/wpc-interior/office.png', title: 'Oficina', desc: 'Panel gris oscuro con iluminación LED' },
      { src: '/deco/wpc-interior/restaurant.png', title: 'Restaurante', desc: 'Ambiente cálido con tono teca' },
    ],
    specs: [
      { label: 'Material', value: 'WPC (Madera + PVC)' },
      { label: 'Acabado', value: 'Fluted / Acanalado' },
      { label: 'Resistencia', value: 'Anti-humedad, anti-polilla, anti-moho' },
      { label: 'Temperatura', value: '-40°C a +60°C' },
      { label: 'Instalación', value: 'Sistema clip / machiembrado' },
      { label: 'Mantenimiento', value: 'Casi nulo — limpieza con paño húmedo' },
      { label: 'Vida útil', value: '15 – 25 años' },
      { label: 'Ecológico', value: '100% reciclable' },
      { label: 'Pintura', value: 'No requiere — color integrado' },
      { label: 'Resistencia UV', value: 'Protección anti-decoloración' },
    ],
    colors: [
      { name: 'Roble Natural', hex: '#c8a876' },
      { name: 'Nogal', hex: '#6b4226' },
      { name: 'Teca', hex: '#b8860b' },
      { name: 'Cerezo', hex: '#9e3e2a' },
      { name: 'Café Espresso', hex: '#3c2415' },
      { name: 'Gris Claro', hex: '#b0b0b0' },
      { name: 'Gris Oscuro', hex: '#5a5a5a' },
      { name: 'Carbón', hex: '#2d2d2d' },
      { name: 'Blanco', hex: '#f0efe8' },
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Miel', hex: '#d4a948' },
      { name: 'Arce', hex: '#d4a574' },
    ],
    advantages: [
      { icon: 'droplets', title: 'Resistente al agua', desc: 'Ideal para baños, cocinas y zonas húmedas sin riesgo de hincharse o pudrirse.' },
      { icon: 'shield', title: 'Anti-plagas', desc: 'Inmune a termitas, polillas y hongos. No requiere tratamientos químicos.' },
      { icon: 'leaf', title: '100% Ecológico', desc: 'Fabricado con material reciclable. Sin deforestación, sin tala de árboles.' },
      { icon: 'wrench', title: 'Instalación rápida', desc: 'Sistema de clipaje/machiembrado. Sin obra húmeda, sin pegamentos.' },
      { icon: 'clock', title: 'Sin mantenimiento', desc: 'No requiere barniz, sellador ni pintura. Limpieza con paño húmedo.' },
      { icon: 'thermometer', title: 'Estabilidad térmica', desc: 'Funciona desde -40°C hasta +60°C sin deformarse.' },
      { icon: 'recycle', title: 'Material reciclable', desc: 'Al final de su vida útil se recicla completamente sin residuos tóxicos.' },
      { icon: 'sparkles', title: 'Acabado premium', desc: 'Textura y veta idénticas a la madera natural. Múltiples diseños y colores.' },
    ],
    models: [
      { name: 'CM-20020', size: '200 × 20 mm', grooves: 5 },
      { name: 'CM-16818', size: '168 × 18 mm', grooves: 6 },
      { name: 'CM-1509', size: '150 × 9 mm', grooves: 4 },
      { name: 'CM-16822', size: '168 × 22 mm', grooves: 4 },
      { name: 'CM-17816', size: '178 × 16 mm', grooves: 5 },
      { name: 'CM-15518', size: '155 × 18 mm', grooves: 4 },
      { name: 'CM-22013', size: '220 × 13 mm', grooves: 3 },
      { name: 'CM-2109', size: '210 × 9 mm', grooves: 2 },
    ],
    applications: [
      { src: '/deco/wpc-interior/living-room.png', label: 'Salas de estar' },
      { src: '/deco/wpc-interior/bedroom.png', label: 'Recámaras' },
      { src: '/deco/wpc-interior/office.png', label: 'Oficinas' },
      { src: '/deco/wpc-interior/restaurant.png', label: 'Restaurantes y bares' },
    ],
  },
};

const ICON_MAP = {
  droplets: Droplets,
  shield: Shield,
  paintbrush: Paintbrush,
  leaf: Leaf,
  wrench: Wrench,
  clock: Clock,
  thermometer: Thermometer,
  recycle: Recycle,
  sparkles: Sparkles,
};

export default function ProductDetailPage({ params }) {
  const [lightbox, setLightbox] = useState(null);
  const product = PRODUCT_DATA[params.slug];

  if (!product) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: '#1a2b0f' }}>Producto no encontrado</h2>
        <Link href="/deco" style={{ color: '#6a9a04', fontWeight: 700, textDecoration: 'none' }}>← Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="deco-page">
      {/* Hero */}
      <section className="pdp-hero">
        <div className="pdp-hero-bg">
          <img src={product.heroImage} alt={product.name} />
        </div>
        <div className="pdp-hero-overlay" />
        <div className="pdp-hero-content">
          <Link href="/deco" className="pdp-hero-back">
            <ArrowLeft size={16} /> Volver al catálogo
          </Link>
          <span className="pdp-hero-number">{product.number}</span>
          <p className="pdp-hero-subtitle" style={{ color: product.color }}>{product.subtitle}</p>
          <h1 className="pdp-hero-title">{product.name}</h1>
          <p className="pdp-hero-tagline">{product.tagline}</p>
          <Link href="/deco/cotizacion" className="pdp-hero-cta" style={{ background: product.color }}>
            Solicitar Cotización <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Gallery */}
      <section className="pdp-gallery">
        <div className="pdp-gallery-grid">
          {product.gallery.map((img, i) => (
            <div key={i} className={`pdp-gallery-item ${img.large ? 'large' : ''}`}
              onClick={() => setLightbox(img.src)}>
              <img src={img.src} alt={img.title} loading="lazy" />
              <div className="pdp-gallery-caption">
                <h4>{img.title}</h4>
                <p>{img.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Specs */}
      <section className="pdp-specs-bg">
        <div className="pdp-section">
          <span className="pdp-section-label" style={{ color: product.color }}>ESPECIFICACIONES</span>
          <h2>Ficha técnica</h2>
          <p>Material de alto rendimiento diseñado para transformar interiores con mínima intervención.</p>
          <div className="pdp-specs-grid">
            {product.specs.map((spec, i) => (
              <div key={i} className="pdp-spec-card">
                <span className="pdp-spec-label">{spec.label}</span>
                <span className="pdp-spec-value">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models / Profiles */}
      <section className="pdp-section">
        <span className="pdp-section-label" style={{ color: product.color }}>PERFILES DISPONIBLES</span>
        <h2>Modelos y dimensiones</h2>
        <p>Diferentes perfiles acanalados para crear el diseño exacto que necesitas.</p>
        <div className="pdp-models-grid">
          {product.models.map((m, i) => (
            <div key={i} className="pdp-model-card">
              <div className="pdp-model-visual" style={{ background: '#f8f6f1' }}>
                <div className="grooves">
                  {Array.from({ length: m.grooves }).map((_, g) => (
                    <div key={g} className="groove" style={{ background: `hsl(30, 25%, ${55 + g * 5}%)` }} />
                  ))}
                </div>
              </div>
              <p className="pdp-model-name">{m.name}</p>
              <p className="pdp-model-size">{m.size}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section className="pdp-specs-bg">
        <div className="pdp-section">
          <span className="pdp-section-label" style={{ color: product.color }}>COLORES DISPONIBLES</span>
          <h2>Paleta de tonalidades</h2>
          <p>Más de 24 tonos disponibles entre series de madera, mármol, metálico, piel y sólidos.</p>
          <div className="pdp-colors-grid">
            {product.colors.map((c, i) => (
              <div key={i} className="pdp-color-card">
                <div className="pdp-color-swatch" style={{ background: c.hex }} />
                <div className="pdp-color-name">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="pdp-section">
        <span className="pdp-section-label" style={{ color: product.color }}>¿POR QUÉ WPC?</span>
        <h2>Ventajas del material</h2>
        <p>Tecnología que combina la belleza de la madera con la resistencia del compuesto plástico.</p>
        <div className="pdp-advantages-grid">
          {product.advantages.map((adv, i) => {
            const Icon = ICON_MAP[adv.icon] || Check;
            return (
              <div key={i} className="pdp-advantage-card">
                <div className="pdp-advantage-icon" style={{ background: product.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h4>{adv.title}</h4>
                  <p>{adv.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Applications */}
      <section className="pdp-applications-bg">
        <div className="pdp-section" style={{ padding: '0' }}>
          <span className="pdp-section-label" style={{ color: '#6a9a04' }}>APLICACIONES</span>
          <h2>Espacios que transforma</h2>
          <p>El WPC interior se adapta a cualquier concepto de diseño. Desde hogares hasta proyectos comerciales.</p>
          <div className="pdp-applications-grid">
            {product.applications.map((app, i) => (
              <div key={i} className="pdp-app-card">
                <img src={app.src} alt={app.label} loading="lazy" />
                <div className="pdp-app-label">{app.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pdp-cta">
        <h2>¿Listo para transformar tus espacios?</h2>
        <p>Solicita muestras físicas, asesoría de instalación o una cotización personalizada para tu proyecto.</p>
        <Link href="/deco/cotizacion" className="pdp-cta-btn">
          Contactar Asesor <ArrowRight size={18} />
        </Link>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="pdp-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Detalle" />
        </div>
      )}
    </div>
  );
}
