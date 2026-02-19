
import Link from 'next/link';

export default function NosotrosPage() {
    return (
        <div className="page-wrapper" style={{ paddingTop: '6rem', paddingBottom: '8rem', background: '#FFFFFF' }}>
            <div className="container">
                <div className="about-hero" style={{ textAlign: 'center', marginBottom: '6rem' }}>
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
                    }}>SOMOS GREENLAND</span>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', lineHeight: 1.1, color: 'var(--color-text)' }}>
                        Redefiniendo el<br /><span style={{ color: 'var(--color-primary-light)' }}>Estándar Industrial</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
                        Desde 2015, proveemos soluciones de mobiliario de alta durabilidad para la industria de eventos, hotelería y comercio en todo México.
                    </p>
                </div>

                <div className="values-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '3rem',
                    marginBottom: '6rem'
                }}>
                    {[
                        { title: 'Durabilidad Extrema', desc: 'Diseñamos productos para el uso rudo constante. HDPE virgen y acero reforzado son nuestros estándares.' },
                        { title: 'Diseño Inteligente', desc: 'Funcionalidad sin sacrificar estética. Nuestros productos optimizan espacio y tiempos de montaje.' },
                        { title: 'Compromiso Total', desc: 'Tu operación no puede detenerse. Garantizamos stock y tiempos de entrega líderes en el mercado.' },
                    ].map((val, i) => (
                        <div key={i} className="value-card" style={{
                            padding: '2.5rem',
                            background: 'var(--color-bg-alt)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border-light)'
                        }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase' }}>{val.title}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{val.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="cta-banner" style={{
                    background: 'var(--color-text)',
                    color: 'white',
                    padding: '4rem',
                    borderRadius: 'var(--radius-xl)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', textTransform: 'uppercase', color: 'white' }}>¿Listo para colaborar?</h2>
                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                        Descubre por qué las cadenas hoteleras y organizadores de eventos más grandes confían en Greenland.
                    </p>
                    <Link href="/productos" style={{
                        display: 'inline-block',
                        background: 'white',
                        color: 'var(--color-text)',
                        padding: '1rem 2.5rem',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none'
                    }}>Ver Catálogo</Link>
                </div>
            </div>
        </div>
    );
}
