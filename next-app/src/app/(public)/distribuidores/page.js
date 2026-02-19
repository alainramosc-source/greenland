
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import '@/app/globals.css';

export default function DistribuidoresPage() {
    return (
        <div className="page-wrapper" style={{ paddingTop: '6rem', paddingBottom: '8rem', background: 'var(--color-bg-alt)' }}>
            <div className="container">
                <div className="hero-simple" style={{ textAlign: 'center', marginBottom: '5rem' }}>
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
                    }}>B2B PARTNERS</span>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', lineHeight: 1.1, color: 'var(--color-text)' }}>Únete a la Red<br />Líder en Mobiliario</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Accede a precios mayoristas, stock garantizado y soporte prioritario para tu negocio de eventos o retail.
                    </p>
                </div>

                <div className="distributors-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '4rem',
                    alignItems: 'start'
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
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '2rem', listStyle: 'none' }}>
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
            </div>
        </div>
    );
}
