import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Building2, Truck, BoxSelect, Warehouse, Check, Timer, Ruler, Weight, Wind, Shield, Layers } from 'lucide-react';
import './spaces.css';

export const metadata = {
    title: 'Greenland Spaces | Soluciones Modulares',
    description: 'Soluciones modulares y móviles para proyectos de cualquier escala. Contenedores expandibles, plegables tipo Z y contenedores plegables.',
};

const CONTAINERS = [
    {
        id: 'expandible',
        name: 'Contenedor Expandible',
        tagline: 'Máximo espacio, mínimo esfuerzo',
        description: 'Contenedores expandibles que se despliegan para ofrecer espacio adicional. Ideales para oficinas, viviendas o exhibiciones. Se arman con 4 personas en 30 minutos.',
        image: '/spaces/expandable.jpg',
        specs: [
            { label: 'Espacio', value: '10–72 m²' },
            { label: 'Instalación', value: '4 personas + 30 min' },
            { label: 'Estructura', value: 'Acero galvanizado Q2358' },
            { label: 'Aislamiento', value: 'EPS/lana de roca/lana de vidrio' },
            { label: 'Resistencia al viento', value: 'Hasta 118 km/h' },
            { label: 'Resistencia sísmica', value: 'Nivel 8' },
            { label: 'Vida útil', value: '15–20 años' },
        ],
        advantages: [
            'Apariencia estética y moderna',
            'Instalación rápida, 98% pre-ensamblado en fábrica',
            'Super espacio: hasta 72 m²',
            'Variedad de configuraciones y diseños',
        ],
    },
    {
        id: 'tipo-z',
        name: 'Contenedor Plegable Tipo Z',
        tagline: 'Flexible, apilable y sustentable',
        description: 'Solución de espacio basada en contenedores plegables tipo Z. Se apilan hasta 3 pisos, creando espacios personalizables y sustentables para oficinas o campamentos.',
        image: '/spaces/tipo-z.jpg',
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
            'Instalación rápida: 20 min por unidad',
            'Sistema de drenaje interno',
            'Electricidad pre-instalada',
            'Apilable hasta 3 pisos',
            'Aislamiento acústico equivalente a muro de 24 cm',
        ],
    },
    {
        id: 'plegable',
        name: 'Contenedor Plegable',
        tagline: 'Ultra rápido y transportable',
        description: 'Contenedores plegables de despliegue ultra rápido. Armado por 2 personas en solo 2 minutos. Ideales para campamentos, proyectos de emergencia y despliegues masivos.',
        image: '/spaces/plegable.jpg',
        specs: [
            { label: 'Dimensiones', value: '6,000 × 2,500 × 2,400 mm' },
            { label: 'Peso', value: '1,300 kg' },
            { label: 'Estructura', value: 'Tubular de acero galvanizado' },
            { label: 'Pared', value: 'Panel sándwich EPS 50 mm' },
            { label: 'Techo', value: 'Panel sándwich acero galvanizado 0.38 mm' },
            { label: 'Piso', value: 'Tablero MGo 18 mm' },
            { label: 'Ventanas', value: 'PVC corrediza 920 × 1200 mm' },
            { label: 'Resistencia al viento', value: '88–102 km/h' },
            { label: 'Resistencia sísmica', value: 'Grado 7' },
            { label: 'Instalación', value: '2 personas + 2 min' },
            { label: 'Carga por contenedor', value: '12 unidades / 40ft HQ' },
        ],
        advantages: [
            '2 personas y 2 minutos por unidad',
            'Ahorro en costos de transporte',
            'Vida útil de 15–20 años',
            '60% más económico que construcción tradicional',
            'Cero desperdicio de obra',
        ],
    },
];

export default function SpacesPage() {
    return (
        <div className="spaces-page">
            {/* HERO */}
            <section className="spaces-hero">
                <div className="container spaces-hero-container">
                    <div className="spaces-hero-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver a Inicio
                        </Link>
                        <span className="spaces-tag">GREENLAND SPACES</span>
                        <h1>Soluciones modulares y móviles para proyectos de <span className="accent">cualquier escala</span>.</h1>
                        <p className="spaces-intro">
                            Greenland Spaces es la división especializada en soluciones modulares y móviles para uso comercial, empresarial e institucional.
                        </p>
                        <p className="spaces-description">
                            Ofrecemos alternativas prácticas y funcionales que se adaptan a proyectos pequeños y de gran escala, con enfoque técnico, operativo y de largo plazo.
                        </p>
                        <div className="spaces-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Contactar Asesor <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                    <div className="spaces-hero-visual">
                        <div className="spaces-image-card">
                            <img src="/spaces/expandable-hero.png" alt="Contenedor Expandible Greenland" className="spaces-hero-img" />
                        </div>
                    </div>
                </div>
            </section>

            {/* MODELOS DE CONTENEDOR */}
            <section className="containers-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-label">NUESTROS MODELOS</span>
                        <h2>3 Soluciones para cada necesidad</h2>
                        <p>Desde oficinas expandibles hasta despliegues de emergencia ultra rápidos.</p>
                    </div>

                    <div className="containers-list">
                        {CONTAINERS.map((ct, idx) => (
                            <div key={ct.id} className={`container-card ${idx % 2 === 1 ? 'reversed' : ''}`} id={ct.id}>
                                <div className="container-card-image">
                                    <img src={ct.image} alt={ct.name} />
                                </div>
                                <div className="container-card-content">
                                    <span className="container-model-tag">MODELO {idx + 1}</span>
                                    <h3>{ct.name}</h3>
                                    <p className="container-tagline">{ct.tagline}</p>
                                    <p className="container-desc">{ct.description}</p>

                                    <div className="specs-grid">
                                        {ct.specs.map((spec, i) => (
                                            <div key={i} className="spec-item">
                                                <span className="spec-label">{spec.label}</span>
                                                <span className="spec-value">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="advantages-list">
                                        <h4>Ventajas</h4>
                                        <ul>
                                            {ct.advantages.map((adv, i) => (
                                                <li key={i}><Check size={14} className="adv-icon" /> {adv}</li>
                                            ))}
                                        </ul>
                                    </div>
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
                        <h2>Soluciones a tu Medida</h2>
                        <p>Infraestructura modular lista para operar en cualquier ubicación.</p>
                    </div>

                    <div className="applications-grid">
                        <div className="app-card">
                            <Building2 size={40} className="app-icon" />
                            <h3>Oficinas móviles</h3>
                            <p>Espacios de trabajo climatizados y equipados para supervisores o corporativos en campo.</p>
                        </div>
                        <div className="app-card">
                            <BoxSelect size={40} className="app-icon" />
                            <h3>Dormitorios</h3>
                            <p>Campamentos modulares confortables para personal en zonas remotas o construcción.</p>
                        </div>
                        <div className="app-card">
                            <Warehouse size={40} className="app-icon" />
                            <h3>Bodegas</h3>
                            <p>Almacenamiento seguro, seco y resistente a la intemperie para materiales o inventario.</p>
                        </div>
                        <div className="app-card">
                            <Truck size={40} className="app-icon" />
                            <h3>Proyectos temporales o permanentes</h3>
                            <p>Despliegue rápido para eventos, clínicas temporales o expansiones fijas de instalaciones.</p>
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
                        <p>Nuestro equipo técnico está listo para cotizar y desplegar tus módulos.</p>
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
