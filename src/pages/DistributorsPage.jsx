import BaseLayout from '../components/layout/BaseLayout';
import { CheckCircle, ArrowRight } from 'lucide-react';

const DistributorsPage = () => {
    return (
        <BaseLayout>
            <div className="distributors-page">
                {/* Hero / Intro */}
                <section className="dist-hero">
                    <div className="container">
                        <h1>Distribuidores</h1>
                        <p className="lead">Crece con una marca sólida, productos confiables y respaldo real.</p>
                    </div>
                </section>

                <div className="container">
                    <div className="content-grid">

                        {/* Main Content */}
                        <div className="main-col">
                            <section className="dist-section">
                                <p>
                                    En Greenland buscamos distribuidores comprometidos que deseen ofrecer productos de calidad superior, con una operación clara, soporte constante y una marca que respalda cada venta.
                                </p>
                                <p>
                                    Nuestro enfoque está diseñado tanto para distribuidores consolidados como para negocios en crecimiento que buscan ampliar su portafolio con mobiliario funcional y soluciones especializadas.
                                </p>
                            </section>

                            <section className="dist-section">
                                <h2>¿Por qué ser distribuidor Greenland?</h2>
                                <ul className="benefits-list">
                                    <li><CheckCircle size={20} color="var(--color-primary)" /> Portafolio amplio de productos funcionales y especializados</li>
                                    <li><CheckCircle size={20} color="var(--color-primary)" /> Calidad comprobada y especificaciones técnicas claras</li>
                                    <li><CheckCircle size={20} color="var(--color-primary)" /> Abastecimiento constante y operación nacional</li>
                                    <li><CheckCircle size={20} color="var(--color-primary)" /> Marca en crecimiento con visión a largo plazo</li>
                                    <li><CheckCircle size={20} color="var(--color-primary)" /> Soporte directo en procesos comerciales y logísticos</li>
                                </ul>
                                <p className="note">
                                    Trabajamos bajo una lógica de relación a largo plazo, cuidando la red de distribución y evitando la saturación del mercado.
                                </p>
                            </section>

                            <section className="dist-section">
                                <h2>Perfil de Distribuidor</h2>
                                <p>Buscamos distribuidores que:</p>
                                <ul className="profile-list">
                                    <li>Tengan experiencia en venta de productos similares o complementarios</li>
                                    <li>Atiendan clientes finales, empresariales o institucionales</li>
                                    <li>Cuenten con estructura comercial o intención de desarrollarla</li>
                                    <li>Compartan la visión de crecimiento ordenado y profesional</li>
                                </ul>
                            </section>
                        </div>

                        {/* Sidebar / Actions */}
                        <aside className="sidebar">
                            {/* Login Box */}
                            <div className="action-box login-box">
                                <h3>Acceso para Distribuidores</h3>
                                <p>Acceso exclusivo para distribuidores autorizados.</p>
                                <ul className="features-mini">
                                    <li>Visualización de catálogo</li>
                                    <li>Generación de pedidos</li>
                                </ul>
                                <button className="btn btn-primary full-width">Iniciar Sesión</button>
                            </div>

                            {/* Apply Box */}
                            <div className="action-box apply-box">
                                <h3>¿Quieres convertirte en distribuidor?</h3>
                                <p>Nuestro equipo se pondrá en contacto para conocer tu perfil.</p>
                                <a href="/contacto" className="btn btn-secondary full-width">
                                    Quiero ser distribuidor <ArrowRight size={16} />
                                </a>
                            </div>
                        </aside>

                    </div>
                </div>
            </div>

            <style>{`
        .dist-hero {
          background-color: #f0f4e8; /* Light green tint */
          padding: 4rem 0;
          margin-bottom: 3rem;
          text-align: center;
        }

        .dist-hero h1 {
          color: var(--color-primary);
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .dist-hero .lead {
          font-size: 1.25rem;
          color: var(--color-grey);
          max-width: 800px;
          margin: 0 auto;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 3rem;
          margin-bottom: 4rem;
        }

        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .dist-section {
          margin-bottom: 3rem;
        }

        .dist-section h2 {
          color: var(--color-black);
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .dist-section p {
          color: var(--color-grey);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .benefits-list, .profile-list {
          list-style: none;
          margin-bottom: 1.5rem;
        }

        .benefits-list li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
          color: var(--color-black);
        }

        .profile-list {
          padding-left: 1.5rem;
          list-style: disc;
        }
        
        .profile-list li {
          margin-bottom: 0.5rem;
          color: var(--color-grey);
        }

        .note {
          font-style: italic;
          color: var(--color-primary);
          background: #f9f9f9;
          padding: 1rem;
          border-left: 3px solid var(--color-primary);
        }

        /* Sidebar Styles */
        .action-box {
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .login-box {
          background-color: var(--color-white);
          border: 1px solid #e5e5e5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .apply-box {
          background-color: var(--color-primary);
          color: white;
        }

        .action-box h3 {
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .features-mini {
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          color: var(--color-grey);
          padding-left: 1rem;
        }

        .apply-box p {
          margin-bottom: 1.5rem;
          opacity: 0.9;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }

        .full-width {
          width: 100%;
        }

        .btn-primary {
          background-color: var(--color-primary);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background-color: #5a8203;
        }

        .btn-secondary {
          background-color: white;
          color: var(--color-primary);
          border: none;
        }

        .btn-secondary:hover {
          background-color: #f0f0f0;
        }
      `}</style>
        </BaseLayout>
    );
};

export default DistributorsPage;
