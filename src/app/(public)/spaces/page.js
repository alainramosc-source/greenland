import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, Truck, BoxSelect, Warehouse, Check, Home, Hotel, Mountain, Tent, Shield, Zap, Package, Minimize2, Maximize2 } from 'lucide-react';
import ImageCarousel from '@/components/ImageCarousel';
import './spaces.css';

export const metadata = {
    title: 'Greenland Spaces | Soluciones Modulares y Espacios Inteligentes',
    description: 'Contenedores expandibles, plegables, cápsulas espaciales y soluciones desmontables. Infraestructura modular de clase mundial para cualquier proyecto.',
};

const SOLUTIONS = [
    {
        id: 'expandible',
        name: 'Contenedor Expandible',
        tagline: 'Máximo espacio, mínimo esfuerzo',
        description: 'Contenedores expandibles que se despliegan para ofrecer hasta 72 m² de espacio habitable. Ideales para oficinas, viviendas o exhibiciones. Una unidad de 40 pies se transforma en una casa completa con sala, cocina, comedor y baño en solo 30 minutos con 4 personas.',
        images: ['/spaces/expandable.png', '/spaces/expandable 2.jpg'],
        heroImage: '/spaces/expandable-hero.png',
        color: '#6a9a04',
        specs: [
            { label: 'Espacio', value: '36–72 m²' },
            { label: 'Instalación', value: '4 personas + 30 min' },
            { label: 'Estructura', value: 'Acero galvanizado Q235B' },
            { label: 'Aislamiento', value: 'EPS / Lana de roca' },
            { label: 'Resistencia al viento', value: 'Hasta 118 km/h' },
            { label: 'Resistencia sísmica', value: 'Nivel 8' },
            { label: 'Vida útil', value: '15–20 años' },
        ],
        advantages: [
            'Concepto "todo en uno": sala, cocina, baño integrados',
            '98% pre-ensamblado en fábrica',
            'Hasta 72 m² desde una sola unidad',
            'Personalización total de acabados',
            'Apariencia estética y moderna',
        ],
    },
    {
        id: 'tipo-z',
        name: 'Contenedor Plegable Tipo Z',
        tagline: 'Resistente, apilable y sustentable',
        description: 'Solución modular basada en el innovador plegado tipo Z. Se apilan hasta 3 pisos, creando espacios personalizables para oficinas, campamentos o dormitorios. Resistente a huracanes categoría 12 con aislamiento térmico avanzado de aerogel.',
        images: ['/spaces/tipo-z.png', '/spaces/tipo-z 2.jpg', '/spaces/tipo-z 3.jpg'],
        heroImage: '/spaces/tipo-z-hero.png',
        color: '#2563eb',
        specs: [
            { label: 'Dimensiones', value: '5,900 × 2,500 × 2,470 mm' },
            { label: 'Peso', value: '1,260 kg' },
            { label: 'Estructura', value: 'Acero galvanizado' },
            { label: 'Pared', value: 'Panel sándwich EPS 50 mm' },
            { label: 'Techo', value: 'Panel sándwich EPS 75 mm' },
            { label: 'Piso', value: 'Cemento 18 mm + PVC 1.6 mm' },
            { label: 'Resistencia al viento', value: 'Hasta 162 km/h' },
            { label: 'Aislamiento', value: '>R3.5' },
            { label: 'Vida útil', value: '15 años' },
        ],
        advantages: [
            '40% más económico que contenedor flat pack',
            'Instalación en 20 min por unidad',
            'Apilable hasta 3 pisos',
            'Sistema de drenaje interno',
            'Electricidad pre-instalada',
            'Aislamiento acústico equivalente a muro de 24 cm',
        ],
    },
    {
        id: 'plegable',
        name: 'Contenedor Plegable',
        tagline: 'Ultra rápido y transportable',
        description: 'Contenedores de despliegue ultra rápido: 2 personas, 2 minutos. Optimiza costos de transporte con 12 unidades plegadas en un solo contenedor de 40 pies. Ideales para campamentos, despliegues de emergencia y proyectos masivos.',
        images: ['/spaces/plegable.png', '/spaces/plegable 2.jpg', '/spaces/plegable 3.jpg'],
        heroImage: '/spaces/plegable-hero.png',
        color: '#d97706',
        specs: [
            { label: 'Dimensiones', value: '6,000 × 2,500 × 2,400 mm' },
            { label: 'Peso', value: '1,300 kg' },
            { label: 'Estructura', value: 'Tubular de acero galvanizado' },
            { label: 'Pared', value: 'Panel sándwich EPS 50 mm' },
            { label: 'Techo', value: 'Acero galvanizado 0.38 mm' },
            { label: 'Piso', value: 'Tablero MGo 18 mm' },
            { label: 'Ventanas', value: 'PVC corrediza 920 × 1200 mm' },
            { label: 'Resistencia al viento', value: '88–102 km/h' },
            { label: 'Instalación', value: '2 personas + 2 min' },
            { label: 'Carga por contenedor', value: '12 unidades / 40ft HQ' },
        ],
        advantages: [
            '2 personas y 2 minutos por unidad',
            '12 unidades plegadas en un solo contenedor de 40ft',
            '60% más económico que construcción tradicional',
            'Vida útil de 15–20 años',
            'Cero desperdicio de obra',
        ],
    },
    {
        id: 'space-capsule',
        name: 'Space Capsule',
        tagline: 'Diseño futurista, confort total',
        description: 'Cápsulas espaciales de diseño futurista con ventanales panorámicos de vidrio curvado. Vienen equipadas con tecnología inteligente pre-instalada: aire acondicionado, calefacción de piso, iluminación y sistemas de seguridad. La solución premium para glamping de lujo, hoteles boutique y experiencias únicas.',
        images: ['/spaces/capsule.png', '/spaces/capsule-2.png', '/spaces/capsule-3.png'],
        heroImage: '/spaces/capsule.png',
        color: '#7c3aed',
        specs: [
            { label: 'Diseño', value: 'Panorámico futurista' },
            { label: 'Vidrio', value: 'Curvado panorámico' },
            { label: 'Tecnología', value: 'Smart Home integrado' },
            { label: 'A/C', value: 'Pre-instalado' },
            { label: 'Calefacción', value: 'Piso radiante' },
            { label: 'Aislamiento', value: 'Aerogel + Silent System' },
            { label: 'Seguridad', value: 'Sistema inteligente integrado' },
        ],
        advantages: [
            'Diseño futurista con vidrio panorámico curvado',
            'Tecnología inteligente pre-instalada',
            'A/C y calefacción de piso incluidos',
            'Aislamiento con aerogel de última generación',
            'Ideal para glamping de lujo y hoteles boutique',
            'Experiencia premium inigualable',
        ],
    },
    {
        id: 'desmontable',
        name: 'Contenedor Desmontable',
        tagline: 'Llega a donde otros no pueden',
        description: 'Diseñados para ubicaciones de difícil acceso donde no llegan grúas ni camiones pesados. Las piezas se transportan manualmente y 4 trabajadores pueden armar una unidad completa en 3 a 5 horas. La solución ideal para proyectos rurales, montañosos o islas.',
        images: ['/spaces/detachable.png', '/spaces/detachable-2.png', '/spaces/detachable-3.png'],
        heroImage: '/spaces/detachable.png',
        color: '#059669',
        specs: [
            { label: 'Transporte', value: 'Piezas manuales' },
            { label: 'Instalación', value: '4 personas + 3-5 hrs' },
            { label: 'Estructura', value: 'Marcos de acero modular' },
            { label: 'Acceso', value: 'Sin grúa necesaria' },
            { label: 'Configuración', value: 'Modular flexible' },
            { label: 'Resistencia', value: 'Industrial certificada' },
        ],
        advantages: [
            'No requiere grúas ni maquinaria pesada',
            'Piezas transportables a mano',
            'Armado por 4 personas en 3-5 horas',
            'Ideal para zonas rurales y de difícil acceso',
            'Configuración modular adaptable',
            'Reutilizable y reubicable ilimitadamente',
        ],
    },
];

const NAV_ITEMS = SOLUTIONS.map(s => ({ id: s.id, name: s.name, color: s.color }));

export default function SpacesPage() {
    return (
        <div className="spaces-page">
            {/* HERO */}
            <section className="spaces-hero">
                <div className="container spaces-hero-container">
                    <div className="spaces-hero-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver a Greenland
                        </Link>
                        <div className="spaces-brand">
                            <span className="spaces-logo-text">GREENLAND</span>
                            <span className="spaces-logo-accent">SPACES</span>
                        </div>
                        <h1>Soluciones modulares de <span className="accent">clase mundial</span> para proyectos de cualquier escala.</h1>
                        <p className="spaces-intro">
                            Infraestructura inteligente, resistente y lista para operar. Desde oficinas corporativas hasta glamping de lujo, nuestras soluciones se adaptan a tu visión.
                        </p>
                        <div className="spaces-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Solicitar Cotización <ArrowRight size={18} />
                            </Link>
                            <a href="#catalogo" className="btn btn-outline-spaces">
                                Ver Catálogo
                            </a>
                        </div>
                    </div>
                    <div className="spaces-hero-visual">
                        <div className="spaces-image-card">
                            <img src="/spaces/expandable-hero.png" alt="Soluciones Modulares Greenland Spaces" className="spaces-hero-img" />
                        </div>
                    </div>
                </div>
            </section>

            {/* INTERNAL NAV */}
            <nav className="spaces-nav" id="catalogo">
                <div className="container">
                    <div className="spaces-nav-inner">
                        <span className="spaces-nav-label">CATÁLOGO</span>
                        <div className="spaces-nav-links">
                            {NAV_ITEMS.map(item => (
                                <a key={item.id} href={`#${item.id}`} className="spaces-nav-link">
                                    {item.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            {/* SOLUTIONS CATALOG */}
            <section className="solutions-section">
                <div className="container">
                    <div className="solutions-header">
                        <span className="section-label">NUESTRAS SOLUCIONES</span>
                        <h2>{SOLUTIONS.length} Líneas de Producto para cada necesidad</h2>
                        <p>Desde despliegues de emergencia hasta experiencias de lujo. Tecnología modular con más de 30 patentes internacionales.</p>
                    </div>

                    <div className="solutions-list">
                        {SOLUTIONS.map((sol, idx) => (
                            <div key={sol.id} className={`solution-card ${idx % 2 === 1 ? 'reversed' : ''}`} id={sol.id}>
                                <div className="solution-card-visual">
                                    <ImageCarousel images={sol.images} alt={sol.name} />
                                </div>
                                <div className="solution-card-content">
                                    <span className="solution-number" style={{ color: sol.color }}>0{idx + 1}</span>
                                    <h3>{sol.name}</h3>
                                    <p className="solution-tagline" style={{ color: sol.color }}>{sol.tagline}</p>
                                    <p className="solution-desc">{sol.description}</p>

                                    <div className="specs-grid">
                                        {sol.specs.map((spec, i) => (
                                            <div key={i} className="spec-item">
                                                <span className="spec-label">{spec.label}</span>
                                                <span className="spec-value">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="advantages-list">
                                        <h4>Ventajas Clave</h4>
                                        <ul>
                                            {sol.advantages.map((adv, i) => (
                                                <li key={i}><Check size={14} className="adv-icon" style={{ color: sol.color }} /> {adv}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link href="/distribuidores" className="solution-cta" style={{ background: sol.color }}>
                                        Cotizar {sol.name} <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* APLICACIONES */}
            <section className="applications-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-label">APLICACIONES</span>
                        <h2>Infraestructura para Cualquier Necesidad</h2>
                        <p>Nuestras soluciones modulares se adaptan a múltiples industrias y escenarios.</p>
                    </div>

                    <div className="applications-grid">
                        <div className="app-card">
                            <Building2 size={40} className="app-icon" />
                            <h3>Oficinas Corporativas</h3>
                            <p>Espacios climatizados y equipados para operación empresarial en campo o sitio.</p>
                        </div>
                        <div className="app-card">
                            <Hotel size={40} className="app-icon" />
                            <h3>Hoteles & Glamping</h3>
                            <p>Experiencias de hospedaje premium con las Space Capsules y contenedores expandibles.</p>
                        </div>
                        <div className="app-card">
                            <BoxSelect size={40} className="app-icon" />
                            <h3>Campamentos & Dormitorios</h3>
                            <p>Alojamiento modular confortable para personal en zonas remotas o industriales.</p>
                        </div>
                        <div className="app-card">
                            <Warehouse size={40} className="app-icon" />
                            <h3>Bodegas & Almacenes</h3>
                            <p>Almacenamiento seguro, seco y resistente a la intemperie para materiales o inventario.</p>
                        </div>
                        <div className="app-card">
                            <Mountain size={40} className="app-icon" />
                            <h3>Zonas de Difícil Acceso</h3>
                            <p>Contenedores desmontables que se transportan a mano, sin necesidad de grúas.</p>
                        </div>
                        <div className="app-card">
                            <Zap size={40} className="app-icon" />
                            <h3>Emergencias & Desastres</h3>
                            <p>Despliegue masivo y ultrarrápido: 2 personas, 2 minutos por unidad plegable.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODALIDADES */}
            <section className="modalities-section">
                <div className="container modalities-container">
                    <div className="modalities-content">
                        <h2>Modalidades de Operación</h2>
                        <div className="modalities-list">
                            <div className="modality-item">
                                <div className="modality-check">
                                    <span className="check-icon">✓</span>
                                </div>
                                <div>
                                    <h3>Venta</h3>
                                    <p>Adquiere nuestras unidades modulares de forma definitiva para tus operaciones permanentes comerciales o industriales.</p>
                                </div>
                            </div>
                            <div className="modality-item">
                                <div className="modality-check">
                                    <span className="check-icon">✓</span>
                                </div>
                                <div>
                                    <h3>Renta</h3>
                                    <p>Disponibilidad inmediata para arrendamiento mensual de oficinas y contenedores para proyectos con temporalidad definida.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="spaces-cta-section">
                <div className="container">
                    <div className="spaces-cta-content">
                        <h2>Comienza tu proyecto modular hoy</h2>
                        <p>Nuestro equipo técnico está listo para asesorarte, cotizar y desplegar tus módulos en cualquier parte del país.</p>
                        <div className="spaces-cta-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Solicitar Cotización <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
