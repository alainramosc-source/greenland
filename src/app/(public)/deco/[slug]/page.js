'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Droplets, Shield, Paintbrush, Leaf, Wrench, Clock, Thermometer, Recycle, Sparkles, Sun, Wind, Flame, Hammer } from 'lucide-react';
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
    colorCardImage: '/deco/wpc-interior/color-card.png',
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
    profileImages: [
      '/deco/wpc-interior/profiles-1.png',
      '/deco/wpc-interior/profiles-2.png',
    ],
    applications: [
      { src: '/deco/wpc-interior/living-room.png', label: 'Salas de estar' },
      { src: '/deco/wpc-interior/bedroom.png', label: 'Recámaras' },
      { src: '/deco/wpc-interior/office.png', label: 'Oficinas' },
      { src: '/deco/wpc-interior/restaurant.png', label: 'Restaurantes y bares' },
    ],
  },
  'wpc-exterior': {
    number: '02',
    name: 'WPC Exterior',
    subtitle: 'Wall Cladding y Lambrín Exterior',
    tagline: 'Revestimiento exterior de WPC co-extruido diseñado para fachadas comerciales y residenciales. Alta resistencia UV, impermeabilidad total y acabados que mantienen su color por años. Incluye cladding, lambrín exterior, vigas WPC y esquineros para proyectos integrales de fachada.',
    color: '#5C7A3A',
    heroImage: '/deco/wpc-exterior/facade.png',
    gallery: [
      { src: '/deco/wpc-exterior/facade.png', title: 'Fachada Residencial', desc: 'Cladding teca con diseño horizontal', large: true },
      { src: '/deco/wpc-exterior/closeup.png', title: 'Detalle Co-extruido', desc: 'Capa protectora UV de doble capa' },
      { src: '/deco/wpc-exterior/lambrin-profiles.png', title: 'Wall Cladding', desc: 'Paneles CM-21926 con cámaras huecas' },
      { src: '/deco/wpc-exterior/cladding-profiles.png', title: 'Lambrín Exterior', desc: 'Siding CM-15520 tipo traslape' },
      { src: '/deco/wpc-exterior/commercial.png', title: 'Comercial', desc: 'Fachada gris oscuro con iluminación' },
      { src: '/deco/wpc-exterior/pergola.png', title: 'Pérgola WPC', desc: 'Vigas estructurales en nogal' },
    ],
    specs: [
      { label: 'Material', value: 'WPC Co-extruido' },
      { label: 'Composición', value: '35% PVC + 60% Fibra de madera + 5% Aditivos' },
      { label: 'Protección UV', value: 'Capa exterior anti-decoloración' },
      { label: 'Impermeabilidad', value: '100% resistente al agua' },
      { label: 'Resistencia', value: '-40°C a +60°C' },
      { label: 'Instalación', value: 'Sistema de rieles / clips ocultos' },
      { label: 'Garantía de color', value: '10 – 15 años' },
      { label: 'Clasificación fuego', value: 'Ignífugo clase B1' },
      { label: 'Mantenimiento', value: 'Casi nulo' },
      { label: 'Ecológico', value: '100% reciclable' },
    ],
    colorCardImage: '/deco/wpc-exterior/color-card.png',
    advantages: [
      { icon: 'sun', title: 'Resistencia UV máxima', desc: 'Capa co-extruida que protege contra decoloración por exposición solar continua.' },
      { icon: 'droplets', title: 'Impermeabilidad total', desc: 'Resistente a lluvia, nieve y condiciones de alta humedad sin deformarse.' },
      { icon: 'thermometer', title: 'Estabilidad extrema', desc: 'Funciona desde -40°C hasta +60°C. Ideal para cualquier clima.' },
      { icon: 'flame', title: 'Ignífugo clase B1', desc: 'Material auto-extinguible. Seguro para fachadas comerciales y residenciales.' },
      { icon: 'hammer', title: 'Instalación mecánica', desc: 'Sistema de clips ocultos. Sin pegamentos ni obra húmeda.' },
      { icon: 'shield', title: 'Anti-plagas', desc: 'Inmune a termitas, hongos y pudrición. No requiere tratamientos químicos.' },
      { icon: 'wind', title: 'Resistencia a viento', desc: 'Sistema de fijación mecánica que soporta vientos de alta velocidad.' },
      { icon: 'recycle', title: 'Material reciclable', desc: 'Al final de su vida útil se recicla completamente sin impacto ambiental.' },
    ],
    profileImages: [
      '/deco/wpc-exterior/cladding-profiles.png',
      '/deco/wpc-exterior/lambrin-profiles.png',
      '/deco/wpc-exterior/esquineros.png',
      '/deco/wpc-exterior/vigas.png',
    ],
    applications: [
      { src: '/deco/wpc-exterior/facade.png', label: 'Fachadas residenciales' },
      { src: '/deco/wpc-exterior/commercial.png', label: 'Fachadas comerciales' },
      { src: '/deco/wpc-exterior/pergola.png', label: 'Pérgolas y estructuras' },
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
  sun: Sun,
  wind: Wind,
  flame: Flame,
  hammer: Hammer,
};

export default function ProductDetailPage({ params }) {
  const { slug } = use(params);
  const [lightbox, setLightbox] = useState(null);
  const product = PRODUCT_DATA[slug];

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>
          {product.profileImages.map((src, i) => (
            <div key={i} className="pdp-gallery-item" onClick={() => setLightbox(src)}
              style={{ borderRadius: '16px', overflow: 'hidden', cursor: 'pointer' }}>
              <img src={src} alt={`Perfiles WPC Set ${i + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section className="pdp-specs-bg">
        <div className="pdp-section">
          <span className="pdp-section-label" style={{ color: product.color }}>COLORES DISPONIBLES</span>
          <h2>Carta de colores</h2>
          <p>Series disponibles: Quasi molecular, Veta de madera, Full Sky Star, Metálico, Skin Feel, Tela, Sólidos anti-rayones, Mármol, Piel.</p>
          <div style={{ marginTop: '40px', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setLightbox(product.colorCardImage)}>
            <img src={product.colorCardImage} alt="Carta de colores WPC" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
            Para más colores y acabados, contáctanos.
          </p>
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
