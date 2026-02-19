import BaseLayout from '../components/layout/BaseLayout';

const AboutPage = () => {
    return (
        <BaseLayout>
            <div className="about-page">
                <div className="container">
                    {/* Main Introduction */}
                    <section className="about-section fade-in">
                        <h1>Nosotros</h1>
                        <p className="lead">
                            En Greenland Products, ofrecemos soluciones versátiles para cualquier espacio.
                        </p>
                        <p>
                            En Greenland Products nos especializamos en la importación y distribución de mobiliario funcional y soluciones especializadas, diseñadas para adaptarse a distintos tipos de espacios y necesidades, desde aplicaciones domésticas hasta proyectos comerciales, empresariales e institucionales.
                        </p>
                        <p>
                            Nuestro enfoque se basa en la calidad, funcionalidad y durabilidad real de cada producto, cuidando que lo que ofrecemos en papel funcione correctamente en el uso diario.
                        </p>
                        <p><strong>Compra calidad. Compra Greenland.</strong></p>
                    </section>

                    {/* What Defines Us */}
                    <section className="about-section">
                        <h2>¿Qué nos define?</h2>
                        <ul className="feature-list">
                            <li>Enfoque absoluto en calidad y especificaciones reales</li>
                            <li>Productos diseñados para uso intensivo y funcional</li>
                            <li>Selección cuidadosa de proveedores y materiales</li>
                            <li>Operación estructurada y abastecimiento constante</li>
                            <li>Visión de negocio a largo plazo, no ventas aisladas</li>
                        </ul>
                        <p>
                            No buscamos ser una marca genérica más; buscamos ser un referente confiable para quienes valoran la calidad y la continuidad en sus proyectos y negocios.
                        </p>
                    </section>

                    {/* Vision */}
                    <section className="about-section highlight-bg">
                        <h2>Nuestra Visión</h2>
                        <p>
                            Construir una marca sólida que ofrezca soluciones confiables, respaldadas por una operación real, una red de distribución cuidada y una propuesta clara tanto para distribuidores como para clientes finales.
                        </p>
                        <p>
                            Greenland evoluciona continuamente a través de líneas especializadas como Greenland Spaces y Greenland Deco, ampliando su alcance sin perder congruencia, control de calidad ni enfoque operativo.
                        </p>
                    </section>

                    {/* Commitment */}
                    <section className="about-section">
                        <h2>Nuestro Compromiso</h2>
                        <p>
                            Nuestro compromiso comienza con nuestra red de distribuidores, porque entendemos que su crecimiento, estabilidad y continuidad son clave para el éxito del negocio.
                        </p>
                        <p>Nos comprometemos a:</p>
                        <ul className="feature-list">
                            <li>Cuidar y fortalecer nuestra red de distribución</li>
                            <li>Ofrecer productos confiables y consistentes en calidad</li>
                            <li>Mantener una operación clara y ordenada</li>
                            <li>Asegurar disponibilidad y continuidad de producto</li>
                            <li>Respaldar a nuestros distribuidores en el desarrollo de su negocio</li>
                        </ul>
                        <p>
                            Y, más allá de ellos, estamos comprometidos con la satisfacción del cliente final, el usuario de nuestros productos, garantizando soluciones funcionales, durables y acordes a lo que prometemos como marca.
                        </p>
                    </section>

                    {/* Coverage */}
                    <section className="about-section">
                        <h2>Cobertura y Operación</h2>
                        <p>
                            Greenland cuenta con puntos estratégicos de operación y distribución en distintas regiones del país, lo que nos permite atender de forma eficiente a clientes y distribuidores a nivel nacional.
                        </p>
                        <div className="locations-grid">
                            <div className="location-item">Saltillo</div>
                            <div className="location-item">Monterrey</div>
                            <div className="location-item">Altamira</div>
                            <div className="location-item">Morelia</div>
                            <div className="location-item">Mazatlán</div>
                            <div className="location-item">Tlalnepantla</div>
                            <div className="location-item">Mérida</div>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
        .about-page {
          padding: 4rem 0;
        }

        .container {
          max-width: 900px; /* Readability width */
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .about-section {
          margin-bottom: 4rem;
        }

        .about-section h1 {
          font-size: 2.5rem;
          color: var(--color-primary);
          margin-bottom: 1.5rem;
        }

        .about-section h2 {
          font-size: 1.75rem;
          color: var(--color-black);
          margin-bottom: 1.25rem;
          border-left: 4px solid var(--color-secondary);
          padding-left: 1rem;
        }

        .about-section p {
          margin-bottom: 1rem;
          color: var(--color-grey);
          line-height: 1.7;
        }

        .lead {
          font-size: 1.2rem;
          font-weight: 500;
          color: var(--color-black);
        }

        .feature-list {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .feature-list li {
          margin-bottom: 0.5rem;
          color: var(--color-grey);
        }

        .highlight-bg {
          background-color: #f9f9f9;
          padding: 2rem;
          border-radius: 8px;
        }

        .locations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .location-item {
          background-color: var(--color-white);
          border: 1px solid #eee;
          padding: 0.8rem;
          text-align: center;
          border-radius: 4px;
          color: var(--color-primary);
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
      `}</style>
        </BaseLayout>
    );
};

export default AboutPage;
