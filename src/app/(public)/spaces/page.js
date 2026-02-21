import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, Truck, BoxSelect, Warehouse } from 'lucide-react';
import './spaces.css'; // Let's quickly create a small CSS file or reuse home styles

export const metadata = {
    title: 'Greenland Spaces | Oficinas Móviles y Contenedores',
    description: 'Soluciones modulares y móviles para proyectos de cualquier escala. Especialistas en oficinas móviles, dormitorios, bodegas y proyectos temporales o permanentes.',
};

export default function SpacesPage() {
    return (
        <div className="spaces-page">
            {/* SECTION: GREENLAND SPACES – INTRODUCCIÓN */}
            <section className="spaces-hero">
                <div className="container spaces-hero-container">
                    <div className="spaces-hero-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver a Inicio
                        </Link>
                        <span className="spaces-tag">GREENLAND SPACES</span>
                        <h1>Soluciones modulares y móviles para proyectos de <span className="accent">cualquier escala</span>.</h1>
                        <p className="spaces-intro">
                            Greenland Spaces es la división especializada de Greenland enfocada en soluciones modulares y móviles para uso comercial, empresarial e institucional.
                        </p>
                        <p className="spaces-description">
                            Ofrecemos alternativas prácticas y funcionales que se adaptan tanto a proyectos pequeños como a desarrollos de gran escala, manteniendo siempre un enfoque técnico, operativo y de largo plazo.
                        </p>
                        <div className="spaces-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Contactar Asesor <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                    <div className="spaces-hero-visual">
                        <div className="spaces-image-card">
                            {/* We will add an image of a container or modular office here later */}
                            <div className="spaces-placeholder">
                                <span>Módulo Industrial B2B</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Aplicaciones */}
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

            {/* Modalidades */}
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
