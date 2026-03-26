import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Paintbrush, Home, Building2, Hotel, UtensilsCrossed, Briefcase, Store } from 'lucide-react';
import './deco.css';

export const metadata = {
    title: 'Greenland Deco | Recubrimientos Decorativos para Interiores y Exteriores',
    description: 'Soluciones profesionales de recubrimiento decorativo: WPC, Deck, Paneles de Mármol UV, Paneles Acústicos, Pisos Vinílicos SPC, Piedra Flexible y más. Greenland Deco transforma cualquier espacio.',
};

const PRODUCTS = [
    {
        id: 'wpc-interior',
        name: 'WPC Interior',
        subtitle: 'Lambrín y Panel Acanalado',
        tagline: 'Elegancia natural en cada muro',
        description: 'Paneles de WPC (Wood Plastic Composite) para interiores con acabado acanalado tipo fluted. Disponibles en múltiples tonalidades de madera, ofrecen una instalación rápida con sistema de clipaje y un acabado premium que transforma cualquier espacio en minutos.',
        image: '/deco/wpc-interior.png',
        color: '#8B6F47',
        specs: [
            { label: 'Material', value: 'WPC (Madera + PVC)' },
            { label: 'Acabado', value: 'Fluted / Acanalado' },
            { label: 'Resistencia', value: 'Anti-humedad, anti-polilla' },
            { label: 'Instalación', value: 'Sistema clip / machiembrado' },
            { label: 'Mantenimiento', value: 'Casi nulo' },
            { label: 'Vida útil', value: '15–25 años' },
        ],
        advantages: [
            'Apariencia de madera real sin mantenimiento',
            'Resistente a la humedad — ideal para baños y cocinas',
            'Instalación rápida sin obra húmeda',
            'Múltiples tonalidades y texturas disponibles',
            'Material 100% reciclable y ecológico',
        ],
    },
    {
        id: 'wpc-exterior',
        name: 'WPC Exterior',
        subtitle: 'Cladding y Fachada',
        tagline: 'Fachadas que resisten y deslumbran',
        description: 'Revestimiento exterior de WPC diseñado para fachadas comerciales y residenciales. Alta resistencia UV, impermeabilidad total y acabados que mantienen su color por años. La solución ideal para renovar exteriores sin sacrificar estética ni durabilidad.',
        image: '/deco/wpc-exterior.png',
        color: '#5C7A3A',
        specs: [
            { label: 'Material', value: 'WPC Co-extruido' },
            { label: 'Protección UV', value: 'Capa exterior anti-decoloración' },
            { label: 'Impermeabilidad', value: '100% resistente al agua' },
            { label: 'Resistencia', value: '-40°C a +60°C' },
            { label: 'Instalación', value: 'Sistema de rieles ocultos' },
            { label: 'Garantía de color', value: '10–15 años' },
        ],
        advantages: [
            'Resistente a lluvia, sol y heladas extremas',
            'No se decolora, agrieta ni deforma',
            'Aspecto moderno tipo madera para fachadas',
            'Instalación mecánica sin pegamentos',
            'Ignífugo clase B1',
        ],
    },
    {
        id: 'deck',
        name: 'Deck Coextruido',
        subtitle: 'Pisos para Exterior',
        tagline: 'El piso exterior que no necesita mantenimiento',
        description: 'Deck de WPC coextruido con tecnología de doble capa que protege contra decoloración, manchas y humedad. Perfecto para terrazas, albercas, jardines y áreas comerciales. Textura y apariencia de madera natural con la durabilidad del material compuesto.',
        image: '/deco/deck.png',
        color: '#A67C52',
        specs: [
            { label: 'Tecnología', value: 'Co-extrusión de doble capa' },
            { label: 'Superficie', value: 'Anti-deslizante texturizada' },
            { label: 'Resistencia UV', value: 'Protección máxima' },
            { label: 'Carga', value: 'Hasta 500 kg/m²' },
            { label: 'Instalación', value: 'Clips ocultos de acero' },
            { label: 'Garantía', value: '20–25 años' },
        ],
        advantages: [
            'No se astilla como la madera natural',
            'Superficie antideslizante — seguro para albercas',
            'Resistente a manchas de grasa, vino y cloro',
            'No requiere barniz, sellador ni mantenimiento',
            'Disponible en tonos teca, nogal, gris y carbón',
        ],
    },
    {
        id: 'uv-marble',
        name: 'Panel Mármol UV',
        subtitle: 'UV Marble Sheet',
        tagline: 'Mármol premium a una fracción del costo',
        description: 'Hojas decorativas de gran formato con acabado de mármol y recubrimiento UV de alta brillantez. Instalación ultra rápida sobre cualquier superficie existente. Efecto espejo con aspecto idéntico al mármol natural a una fracción del costo y sin la complejidad de la instalación tradicional.',
        image: '/deco/uv-marble.png',
        color: '#7A7A8E',
        specs: [
            { label: 'Acabado', value: 'UV High-Gloss / Mate' },
            { label: 'Formato', value: '1220 × 2440 mm' },
            { label: 'Espesor', value: '3–8 mm' },
            { label: 'Instalación', value: 'Adhesivo directo' },
            { label: 'Resistencia', value: 'Anti-rayones, anti-mancha' },
            { label: 'Aplicación', value: 'Muros, plafones, muebles' },
        ],
        advantages: [
            'Aspecto idéntico al mármol natural',
            '90% más económico que mármol real',
            'Instalación en horas, no días',
            'Ligero y fácil de cortar',
            'Variedad de diseños: Calacatta, Carrara, Ónix, etc.',
        ],
    },
    {
        id: 'acoustic-panel',
        name: 'Panel Acústico',
        subtitle: 'Acoustic Slat Wall Panel',
        tagline: 'Diseño que absorbe el ruido',
        description: 'Paneles decorativos de listones de madera con respaldo de fieltro acústico para absorción de sonido. Combinan estética contemporánea con funcionalidad acústica. Ideales para salas de cine en casa, oficinas, restaurantes y espacios donde el control del sonido es esencial.',
        image: '/deco/acoustic-panel.png',
        color: '#6B5B4B',
        specs: [
            { label: 'Estructura', value: 'Listones MDF + fieltro PET' },
            { label: 'Absorción NRC', value: '0.7 – 0.85' },
            { label: 'Formato', value: '2400 × 600 mm' },
            { label: 'Acabado', value: 'Natural, Nogal, Roble, Negro' },
            { label: 'Fieltro', value: 'PET reciclado 9 mm' },
            { label: 'Instalación', value: 'Adhesivo o clavado' },
        ],
        advantages: [
            'Reduce eco y reverberación hasta 85%',
            'Aspecto premium de madera natural',
            'Fieltro fabricado con PET reciclado',
            'Ideal para home theaters y estudios',
            'Fácil de cortar y adaptar a cualquier espacio',
        ],
    },
    {
        id: 'spc-flooring',
        name: 'Piso Vinílico SPC',
        subtitle: 'Stone Polymer Composite Flooring',
        tagline: 'El piso que resiste todo',
        description: 'Pisos de Stone Polymer Composite con núcleo de piedra caliza que ofrece estabilidad dimensional superior. Sistema de click rápido, 100% impermeables y con aspecto de madera natural. La alternativa perfecta a pisos de madera y laminados en áreas de alto tráfico y zonas húmedas.',
        image: '/deco/spc-flooring.png',
        color: '#8E7A5C',
        specs: [
            { label: 'Núcleo', value: 'SPC (Piedra + PVC)' },
            { label: 'Espesor', value: '4–6 mm + underlayment' },
            { label: 'Capa de desgaste', value: '0.3 – 0.5 mm' },
            { label: 'Instalación', value: 'Click flotante' },
            { label: 'Impermeabilidad', value: '100%' },
            { label: 'Clasificación', value: 'AC5 / Clase 33' },
        ],
        advantages: [
            '100% impermeable — baños, cocinas, lavanderías',
            'Instalación flotante sin pegamento',
            'Compatible con calefacción de piso',
            'Aspecto de madera real con gran variedad',
            'Resistente a rayones de mascotas y muebles',
        ],
    },
    {
        id: 'sandwich-panel',
        name: 'Panel Sándwich',
        subtitle: 'Sandwich Panel',
        tagline: 'Paredes completas en una sola pieza',
        description: 'Paneles sándwich con núcleo aislante (EPS, lana de roca o poliuretano) y caras de acero o aluminio pre-pintado. Solución integral para muros divisorios, cámaras frías, naves industriales y construcción rápida. Aislamiento térmico y acústico en una pieza lista para instalar.',
        image: '/deco/sandwich-panel.png',
        color: '#5A7DA0',
        specs: [
            { label: 'Núcleo', value: 'EPS / Lana de roca / PU' },
            { label: 'Caras', value: 'Acero galvanizado pre-pintado' },
            { label: 'Espesor', value: '50–150 mm' },
            { label: 'Valor R', value: 'R5 – R12' },
            { label: 'Clasificación fuego', value: 'Hasta A1 (lana de roca)' },
            { label: 'Ancho', value: '950–1150 mm' },
        ],
        advantages: [
            'Construcción 5x más rápida que métodos tradicionales',
            'Excelente aislamiento térmico y acústico',
            'Opciones ignífugas con lana de roca',
            'Acabado liso de fábrica — sin obra húmeda',
            'Ideal para cámaras frías y naves industriales',
        ],
    },
    {
        id: 'stone',
        name: 'Piedra Flexible y PU Stone',
        subtitle: 'Flexible Stone & PU Stone',
        tagline: 'Piedra natural sin el peso',
        description: 'Recubrimientos decorativos con apariencia de piedra natural en formato ultra ligero. La piedra flexible se dobla y adapta a superficies curvas, mientras que el PU Stone ofrece texturas tridimensionales realistas. Ambos pesan una fracción de la piedra real y se instalan con adhesivo simple.',
        image: '/deco/stone.png',
        color: '#8C7B6B',
        specs: [
            { label: 'Peso', value: '3–5 kg/m² (vs 50+ kg piedra real)' },
            { label: 'Espesor', value: '2–3 mm (flexible) / 20–30 mm (PU)' },
            { label: 'Flexibilidad', value: 'Se dobla en curvas' },
            { label: 'Instalación', value: 'Adhesivo de contacto' },
            { label: 'Resistencia', value: 'UV, humedad, impacto' },
            { label: 'Texturas', value: 'Pizarra, ladrillo, cantera, etc.' },
        ],
        advantages: [
            '95% más ligera que la piedra natural',
            'Se instala en cualquier superficie, incluso curva',
            'No requiere refuerzo estructural',
            'Texturas idénticas a piedra real',
            'Interior y exterior',
        ],
    },
];

const NAV_ITEMS = PRODUCTS.map(p => ({ id: p.id, name: p.name, color: p.color }));

export default function DecoPage() {
    return (
        <div className="deco-page">
            {/* HERO */}
            <section className="deco-hero">
                <div className="container deco-hero-container">
                    <div className="deco-hero-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver a Greenland
                        </Link>
                        <div className="deco-brand">
                            <span className="deco-logo-text">GREENLAND</span>
                            <span className="deco-logo-accent">DECO</span>
                        </div>
                        <h1>Recubrimientos <span className="accent">de vanguardia</span> para transformar cualquier espacio.</h1>
                        <p className="deco-intro">
                            Desde paneles de madera hasta mármol UV y pisos vinílicos. Soluciones decorativas funcionales, estéticas y de fácil instalación para proyectos residenciales, comerciales e industriales.
                        </p>
                        <div className="deco-actions">
                            <Link href="/deco/cotizacion" className="btn btn-primary-deco">
                                Contactar Asesor <ArrowRight size={18} />
                            </Link>
                            <a href="#catalogo" className="btn btn-outline-deco">
                                Ver Catálogo
                            </a>
                        </div>
                    </div>
                    <div className="deco-hero-visual">
                        <div className="deco-image-card">
                            <img src="/deco/hero.png" alt="Recubrimientos decorativos Greenland Deco" className="deco-hero-img" />
                        </div>
                    </div>
                </div>
            </section>

            {/* INTERNAL NAV */}
            <nav className="deco-nav" id="catalogo">
                <div className="container">
                    <div className="deco-nav-inner">
                        <span className="deco-nav-label">CATÁLOGO</span>
                        <div className="deco-nav-links">
                            {NAV_ITEMS.map(item => (
                                <a key={item.id} href={`#${item.id}`} className="deco-nav-link">
                                    {item.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            {/* PRODUCT CATALOG */}
            <section className="deco-products-section">
                <div className="container">
                    <div className="deco-products-header">
                        <span className="section-label-deco">NUESTRO PORTAFOLIO</span>
                        <h2>{PRODUCTS.length} Líneas de Recubrimiento para cada proyecto</h2>
                        <p>Materiales de vanguardia importados directamente. Calidad, estética y funcionalidad en cada solución.</p>
                    </div>

                    <div className="deco-products-list">
                        {PRODUCTS.map((prod, idx) => (
                            <div key={prod.id} className={`deco-product-card ${idx % 2 === 1 ? 'reversed' : ''}`} id={prod.id}>
                                <div className="deco-product-visual">
                                    <img src={prod.image} alt={prod.name} className="deco-product-img" />
                                </div>
                                <div className="deco-product-content">
                                    <span className="deco-product-number" style={{ color: prod.color }}>0{idx + 1}</span>
                                    <h3>{prod.name}</h3>
                                    <p className="deco-product-subtitle">{prod.subtitle}</p>
                                    <p className="deco-product-tagline" style={{ color: prod.color }}>{prod.tagline}</p>
                                    <p className="deco-product-desc">{prod.description}</p>

                                    <div className="deco-specs-grid">
                                        {prod.specs.map((spec, i) => (
                                            <div key={i} className="deco-spec-item">
                                                <span className="deco-spec-label">{spec.label}</span>
                                                <span className="deco-spec-value">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="deco-advantages-list">
                                        <h4>Ventajas Clave</h4>
                                        <ul>
                                            {prod.advantages.map((adv, i) => (
                                                <li key={i}><Check size={14} className="deco-adv-icon" style={{ color: prod.color }} /> {adv}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link href={`/deco/${prod.id}`} className="deco-product-cta" style={{ background: prod.color }}>
                                        Ver Detalles de {prod.name} <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* APPLICATIONS */}
            <section className="deco-applications-section">
                <div className="container">
                    <div className="section-header-deco">
                        <span className="section-label-deco">APLICACIONES</span>
                        <h2>Soluciones para cada tipo de proyecto</h2>
                        <p>Nuestros recubrimientos se adaptan a cualquier entorno, desde hogares hasta desarrollos comerciales.</p>
                    </div>

                    <div className="deco-applications-grid">
                        <div className="deco-app-card">
                            <Home size={40} className="deco-app-icon" />
                            <h3>Residencial</h3>
                            <p>Renovación de salas, recámaras, baños y cocinas con acabados que elevan el diseño de tu hogar.</p>
                        </div>
                        <div className="deco-app-card">
                            <Building2 size={40} className="deco-app-icon" />
                            <h3>Comercial</h3>
                            <p>Locales, tiendas y showrooms con acabados impactantes que refuerzan la imagen de marca.</p>
                        </div>
                        <div className="deco-app-card">
                            <Hotel size={40} className="deco-app-icon" />
                            <h3>Hotelería</h3>
                            <p>Lobbies, habitaciones y áreas comunes con estética premium y mantenimiento mínimo.</p>
                        </div>
                        <div className="deco-app-card">
                            <UtensilsCrossed size={40} className="deco-app-icon" />
                            <h3>Restaurantes y Bares</h3>
                            <p>Ambientes únicos con paneles acústicos, piedra decorativa y acabados resistentes.</p>
                        </div>
                        <div className="deco-app-card">
                            <Briefcase size={40} className="deco-app-icon" />
                            <h3>Oficinas Corporativas</h3>
                            <p>Espacios profesionales con control acústico, pisos premium y muros de diseño.</p>
                        </div>
                        <div className="deco-app-card">
                            <Store size={40} className="deco-app-icon" />
                            <h3>Fachadas y Exteriores</h3>
                            <p>Renovación de fachadas con cladding WPC y deck para terrazas de alto desempeño.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="deco-cta-section">
                <div className="container">
                    <div className="deco-cta-content">
                        <h2>Eleva el diseño de tu próximo proyecto</h2>
                        <p>Solicita muestras físicas, asesoría técnica o una cotización personalizada. Nuestro equipo está listo para ayudarte.</p>
                        <div className="deco-cta-actions">
                            <Link href="/distribuidores" className="btn btn-primary-deco">
                                Solicitar Cotización <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
