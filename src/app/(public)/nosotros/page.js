import Link from 'next/link';

export const revalidate = 0;

export default function NosotrosPage() {
    return (
        <div className="page-wrapper" style={{ paddingTop: '6rem', paddingBottom: '8rem', background: '#FFFFFF' }}>
            <div className="container">
                {/* Hero Section */}
                <div className="about-hero" style={{ textAlign: 'center', marginBottom: '6rem', maxWidth: '800px', margin: '0 auto 6rem' }}>
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
                    }}>NOSOTROS</span>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', lineHeight: 1.1, color: 'var(--color-text)' }}>
                        Soluciones versátiles para<br /><span style={{ color: 'var(--color-primary)' }}>cualquier espacio.</span>
                    </h1>
                    <div style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <p>
                            En Greenland Products nos especializamos en la importación y distribución de mobiliario funcional y soluciones especializadas, diseñadas para adaptarse a distintos tipos de espacios y necesidades, desde aplicaciones domésticas hasta proyectos comerciales, empresariales e institucionales.
                        </p>
                        <p>
                            Nuestro enfoque se basa en la calidad, funcionalidad y durabilidad real de cada producto, cuidando que lo que ofrecemos en papel funcione correctamente en el uso diario.
                        </p>
                        <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1.2rem', marginTop: '1rem' }}>
                            Compra calidad. Compra Greenland.
                        </p>
                    </div>
                </div>

                {/* ¿Qué nos define? */}
                <div style={{ marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2.5rem', color: 'var(--color-text)', textAlign: 'center' }}>¿Qué Nos Define?</h2>
                    <div className="values-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                    }}>
                        {[
                            { title: 'Enfoque Absoluto', desc: 'Enfoque absoluto en calidad y especificaciones reales.' },
                            { title: 'Uso Intensivo', desc: 'Productos diseñados para uso intensivo y funcional.' },
                            { title: 'Selección Cuidadosa', desc: 'Selección cuidadosa de proveedores y materiales.' },
                            { title: 'Constancia', desc: 'Operación estructurada y abastecimiento constante.' },
                            { title: 'Visión a Largo Plazo', desc: 'Visión de negocio a largo plazo, no ventas aisladas.' }
                        ].map((val, i) => (
                            <div key={i} className="value-card" style={{
                                padding: '2rem',
                                background: 'var(--color-bg-alt)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border-light)'
                            }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase' }}>{val.title}</h3>
                                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{val.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 600, maxWidth: '800px', margin: '3rem auto 0' }}>
                        No buscamos ser una marca genérica más; buscamos ser un referente confiable para quienes valoran la calidad y la continuidad en sus proyectos y negocios.
                    </p>
                </div>

                {/* Visión y Compromiso (Dos columnas) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '4rem',
                    marginBottom: '6rem'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Nuestra Visión</h2>
                        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p>
                                Construir una marca sólida que ofrezca soluciones confiables, respaldadas por una operación real, una red de distribución cuidada y una propuesta clara tanto para distribuidores como para clientes finales.
                            </p>
                            <p>
                                Greenland evoluciona continuamente a través de líneas especializadas como <strong>Greenland Spaces</strong> y <strong>Greenland Deco</strong>, ampliando su alcance sin perder congruencia, control de calidad ni enfoque operativo.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Nuestro Compromiso</h2>
                        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p>
                                Nuestro compromiso comienza con nuestra red de distribuidores, porque entendemos que su crecimiento, estabilidad y continuidad son clave para el éxito del negocio.
                            </p>
                            <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', fontWeight: 500 }}>
                                <li style={{ marginBottom: '0.5rem' }}>Cuidar y fortalecer nuestra red de distribución.</li>
                                <li style={{ marginBottom: '0.5rem' }}>Ofrecer productos confiables y consistentes en calidad.</li>
                                <li style={{ marginBottom: '0.5rem' }}>Mantener una operación clara y ordenada.</li>
                                <li style={{ marginBottom: '0.5rem' }}>Asegurar disponibilidad y continuidad de producto.</li>
                                <li style={{ marginBottom: '0.5rem' }}>Respaldar a nuestros distribuidores en su negocio.</li>
                            </ul>
                            <p>
                                Y, más allá de ellos, estamos comprometidos con la satisfacción del cliente final, garantizando soluciones funcionales y durables.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cobertura */}
                <div className="coverage-section" style={{
                    background: 'var(--color-bg-alt)',
                    padding: '4rem',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: '6rem',
                    textAlign: 'center',
                    border: '1px solid var(--color-border-light)'
                }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Cobertura y Operación</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem' }}>
                        Greenland cuenta con puntos estratégicos de operación y distribución en distintas regiones del país, lo que nos permite atender de forma eficiente a clientes y distribuidores a nivel nacional.
                    </p>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '1rem'
                    }}>
                        {['Saltillo', 'Monterrey', 'Altamira', 'Morelia', 'Mazatlán', 'Tlalnepantla', 'Mérida'].map(city => (
                            <span key={city} style={{
                                padding: '0.75rem 1.5rem',
                                background: 'white',
                                color: 'var(--color-text)',
                                borderRadius: '9999px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                            }}>{city}</span>
                        ))}
                    </div>
                </div>

                {/* CTA Call to Action */}
                <div className="cta-banner" style={{
                    background: 'var(--color-text)',
                    color: 'white',
                    padding: '4rem',
                    borderRadius: 'var(--radius-xl)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', textTransform: 'uppercase', color: 'white' }}>Explora Nuestras Líneas</h2>
                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                        Descubre todas nuestras soluciones en mobiliario para espacios versátiles.
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
                        textDecoration: 'none',
                        transition: 'transform 0.2s'
                    }}>Ver Catálogo</Link>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .page-wrapper {
                        padding-top: 3rem !important;
                        padding-bottom: 4rem !important;
                    }
                    h1 {
                        font-size: 2.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
