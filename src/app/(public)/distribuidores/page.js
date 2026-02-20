'use client';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import '@/app/globals.css';

// Remove the `revalidate = 0` line since this is now a client component

export default function DistribuidoresPage() {
    return (
        <div className="page-wrapper" style={{ paddingTop: '6rem', paddingBottom: '8rem', background: 'var(--color-bg-alt)' }}>
            <div className="container">
                {/* Hero Section */}
                <div className="hero-simple" style={{ textAlign: 'center', marginBottom: '6rem', maxWidth: '900px', margin: '0 auto 6rem' }}>
                    <span style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        color: 'var(--color-primary)',
                        marginBottom: '1.5rem',
                        background: 'rgba(6, 78, 59, 0.05)',
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(6, 78, 59, 0.1)'
                    }}>DISTRIBUIDORES</span>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', lineHeight: 1.1, color: 'var(--color-text)' }}>
                        Crece con una marca sólida,<br /><span style={{ color: 'var(--color-primary)' }}>productos confiables y respaldo real.</span>
                    </h1>
                    <div style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p>
                            En Greenland buscamos distribuidores comprometidos que deseen ofrecer productos de calidad superior, con una operación clara, soporte constante y una marca que respalda cada venta.
                        </p>
                        <p>
                            Nuestro enfoque está diseñado tanto para distribuidores consolidados como para negocios en crecimiento que buscan ampliar su portafolio con mobiliario funcional y soluciones especializadas.
                        </p>
                    </div>
                </div>

                {/* Por qué / Perfil */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '4rem',
                    marginBottom: '6rem'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text)' }}>¿Por Qué Ser Distribuidor Greenland?</h2>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
                            {[
                                'Portafolio amplio de productos funcionales y especializados',
                                'Calidad comprobada y especificaciones técnicas claras',
                                'Abastecimiento constante y operación nacional',
                                'Marca en crecimiento con visión a largo plazo',
                                'Soporte directo en procesos comerciales y logísticos'
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <CheckCircle2 size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p style={{ fontSize: '1.05rem', color: 'var(--color-primary)', fontWeight: 600, lineHeight: 1.6, padding: '1.5rem', background: 'rgba(6, 78, 59, 0.05)', borderRadius: 'var(--radius-md)' }}>
                            Trabajamos bajo una lógica de relación a largo plazo, cuidando la red de distribución y evitando la saturación del mercado.
                        </p>
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Perfil de Distribuidor</h2>
                        <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Buscamos distribuidores que:</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
                            {[
                                'Tengan experiencia en venta de productos similares o complementarios',
                                'Atiendan clientes finales, empresariales o institucionales',
                                'Cuenten con estructura comercial o intención de desarrollarla',
                                'Compartan la visión de crecimiento ordenado y profesional'
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <ArrowRight size={20} color="var(--color-text)" style={{ flexShrink: 0, marginTop: '2px', opacity: 0.5 }} />
                                    <span style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Existing Form / Benefits Grid */}
                <div className="distributors-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '4rem',
                    alignItems: 'start',
                    marginBottom: '6rem'
                }}>
                    <div className="form-card" style={{
                        background: '#FFFFFF',
                        padding: '2.5rem',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)',
                        border: '1px solid var(--color-border-light)'
                    }}>
                        <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>Solicitud de Distribución</h3>
                        <form className="simple-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Nombre de la Empresa</label>
                                <input type="text" className="input-field" placeholder="Ej. Eventos del Norte S.A. de C.V." style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-alt)', fontSize: '0.95rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Correo Electrónico</label>
                                <input type="email" className="input-field" placeholder="contacto@tuempresa.com" style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-alt)', fontSize: '0.95rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Teléfono</label>
                                <input type="tel" className="input-field" placeholder="+52 (55) ..." style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-alt)', fontSize: '0.95rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Ciudad / Estado</label>
                                <input type="text" className="input-field" placeholder="Monterrey, NL" style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-alt)', fontSize: '0.95rem' }} />
                            </div>
                            <button type="button" className="btn-primary" style={{
                                width: '100%',
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-pill)',
                                fontWeight: 700,
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer'
                            }}>
                                Enviar Solicitud <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>

                    <div className="benefits-list" style={{ paddingTop: '1rem' }}>
                        <h3 style={{ marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Beneficios Exclusivos</h3>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '2rem', listStyle: 'none', padding: 0 }}>
                            {[
                                { title: 'Rentabilidad Competitiva', desc: 'Márgenes de ganancia del 20% al 35% en nuestra línea core de productos.' },
                                { title: 'Prioridad Logística', desc: 'Tus pedidos tienen prioridad en despacho y envíos express garantizados.' },
                                { title: 'Herramientas de Venta', desc: 'Acceso a un portal B2B con catálogos white-label, fotos HD y fichas técnicas.' },
                                { title: 'Capacitación Técnica', desc: 'Webinars mensuales y soporte directo con nuestros expertos de producto.' },
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: '48px',
                                        height: '48px',
                                        background: '#FFFFFF',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}>
                                        <CheckCircle2 size={24} color="var(--color-primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' }}>{item.title}</h4>
                                        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Acceso para Distribuidores CTA */}
                <div className="cta-banner" style={{
                    background: 'var(--color-text)',
                    color: 'white',
                    padding: '4rem',
                    borderRadius: 'var(--radius-xl)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', textTransform: 'uppercase', color: 'white' }}>Acceso para Distribuidores</h2>
                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', maxWidth: '600px', lineHeight: 1.6 }}>
                        Acceso exclusivo para distribuidores autorizados. Este portal está pensado para facilitar la operación diaria y mejorar la comunicación entre Greenland y su red de distribución.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2.5rem', textAlign: 'left', maxWidth: '500px', width: '100%' }}>
                        <h4 style={{ color: 'var(--color-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontWeight: 700 }}>Funcionalidad contemplada (fase posterior):</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                'Acceso con usuario y contraseña',
                                'Visualización de catálogo',
                                'Generación de pedidos',
                                'Envío automático de pedidos al equipo Greenland'
                            ].map((feature, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                                    <ArrowRight size={16} color="var(--color-primary)" /> {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Link href="/login" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--color-primary)',
                        color: 'black',
                        padding: '1rem 2.5rem',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 14px rgba(74, 222, 32, 0.4)'
                    }}>
                        Iniciar Sesión <ArrowRight size={18} />
                    </Link>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .page-wrapper {
                        padding-top: 3rem !important;
                        padding-bottom: 4rem !important;
                    }
                    h1 {
                        font-size: 2.2rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
