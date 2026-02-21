import Link from 'next/link';
import { ArrowLeft, ArrowRight, Paintbrush, Home, LayoutTemplate, Layers, Users } from 'lucide-react';
import './deco.css';

export const metadata = {
    title: 'Greenland Deco | Recubrimientos y Decoración',
    description: 'Soluciones de recubrimiento, decoración y remodelación para interiores y exteriores. Proyectos residenciales y comerciales con Lambrín, Cladding, Deck y más.',
};

export default function DecoPage() {
    return (
        <div className="deco-page">
            {/* SECCIÓN: GREENLAND DECO – INTRODUCCIÓN */}
            <section className="deco-hero">
                <div className="container deco-hero-container">
                    <div className="deco-hero-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver a Inicio
                        </Link>
                        <span className="deco-tag">GREENLAND DECO</span>
                        <h1>Recubrimientos <span className="accent">funcionales</span> para interiores y exteriores.</h1>
                        <p className="deco-intro">
                            Greenland Deco es la división especializada de Greenland enfocada en soluciones de recubrimiento, decoración y remodelación.
                        </p>
                        <p className="deco-description">
                            Nuestro portafolio está diseñado para atender proyectos residenciales, comerciales y de desarrollo, ofreciendo productos modernos, funcionales y de fácil instalación.
                        </p>
                        <div className="deco-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Contactar Asesor <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                    <div className="deco-hero-visual">
                        <div className="deco-image-card">
                            {/* We will add an image of decorative materials here later */}
                            <div className="deco-placeholder">
                                <span>Diseño & Textura</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Catálogo de Materiales (Portafolio) */}
            <section className="materials-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-label">NUESTRO PORTAFOLIO</span>
                        <h2>Materiales de Vanguardia</h2>
                        <p>Sistemas de recubrimiento decorativo listos para transformar cualquier espacio.</p>
                    </div>

                    <div className="materials-grid">
                        <div className="material-card">
                            <Layers size={40} className="material-icon" />
                            <h3>Lambrín</h3>
                            <p>Acabados acanalados modernos para muros interiores que aportan calidez y diseño contemporáneo.</p>
                        </div>
                        <div className="material-card">
                            <Home size={40} className="material-icon" />
                            <h3>Cladding</h3>
                            <p>Recubrimientos exteriores de alta resistencia para fachadas comerciales y residenciales duraderas.</p>
                        </div>
                        <div className="material-card">
                            <LayoutTemplate size={40} className="material-icon" />
                            <h3>Deck</h3>
                            <p>Pisos sintéticos para exteriores, terrazas y albercas que imitan la madera sin su mantenimiento.</p>
                        </div>
                        <div className="material-card">
                            <Paintbrush size={40} className="material-icon" />
                            <h3>Mármol y Panel PVC</h3>
                            <p>Hojas decorativas de instalación rápida y estética premium para renovación de muros y plafones.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Orientado a */}
            <section className="target-section">
                <div className="container target-container">
                    <div className="target-content">
                        <div className="target-text">
                            <h2>Soluciones para Profesionales</h2>
                            <p>
                                Greenland Deco está orientado a instaladores, arquitectos, desarrolladores, distribuidores y clientes finales que buscan soluciones estéticas sin sacrificar funcionalidad y durabilidad.
                            </p>
                            <ul className="target-list">
                                <li><Users size={20} className="list-icon" /> <span>Arquitectos e Interioristas</span></li>
                                <li><Users size={20} className="list-icon" /> <span>Constructoras y Desarrolladores</span></li>
                                <li><Users size={20} className="list-icon" /> <span>Instaladores Profesionales</span></li>
                                <li><Users size={20} className="list-icon" /> <span>Red de Distribuidores</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="deco-cta-section">
                <div className="container">
                    <div className="deco-cta-content">
                        <h2>Eleva el diseño de tu próximo proyecto</h2>
                        <p>Descubre la versatilidad de nuestros recubrimientos y solicita muestras físicas.</p>
                        <div className="deco-cta-actions">
                            <Link href="/distribuidores" className="btn btn-primary">
                                Unirse a la Red Deco <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
