import BaseLayout from '../components/layout/BaseLayout';
import { ArrowRight, Box, Layout, ShieldCheck, Truck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <BaseLayout>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <span className="hero-tag">DISTRIBUCIÓN NACIONAL</span>
          <h1>Especialistas en mobiliario funcional para espacios versátiles.</h1>
          <p>La solución confiable en mesas, sillas y toldos plegables para uso comercial e industrial.</p>
          <div className="hero-actions">
            <Link to="/productos" className="btn btn-primary">Ver Catálogo</Link>
            <Link to="/distribuidores" className="btn btn-outline-light">Hazte Distribuidor</Link>
          </div>
        </div>
      </section>

      {/* Featured Divisions */}
      <section className="divisions-section">
        <div className="container">
          <div className="divisions-grid">
            <div className="division-card spaces">
              <div className="division-content">
                <h2>Greenland <span>Spaces</span></h2>
                <p>Soluciones modulares y móviles para proyectos de cualquier escala.</p>
                <Link to="/spaces" className="link-arrow">Explorar Spaces <ArrowRight size={18} /></Link>
              </div>
              <div className="division-image-overlay"></div>
            </div>
            <div className="division-card deco">
              <div className="division-content">
                <h2>Greenland <span>Deco</span></h2>
                <p>Recubrimientos funcionales y estéticos para interiores y exteriores.</p>
                <Link to="/deco" className="link-arrow">Explorar Deco <ArrowRight size={18} /></Link>
              </div>
              <div className="division-image-overlay"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Essentials */}
      <section className="essentials-section">
        <div className="container">
          <div className="section-header">
            <h2>Esenciales para tu Negocio</h2>
            <p>Productos de alta rotación diseñados para resistir.</p>
          </div>

          <div className="products-grid">
            <Link to="/productos?cat=mesas" className="product-category-card">
              <div className="icon-wrapper"><Layout size={32} /></div>
              <h3>Mesas Plegables</h3>
              <p>Rectangulares y redondas, HDPE alta densidad.</p>
              <span className="virtual-btn">Ver Modelos</span>
            </Link>
            <Link to="/productos?cat=sillas" className="product-category-card">
              <div className="icon-wrapper"><Users size={32} /></div>
              <h3>Sillas Plegables</h3>
              <p>Ergonomía y resistencia para eventos.</p>
              <span className="virtual-btn">Ver Modelos</span>
            </Link>
            <Link to="/productos?cat=toldos" className="product-category-card">
              <div className="icon-wrapper"><ShieldCheck size={32} /></div>
              <h3>Toldos</h3>
              <p>Protección exterior de fácil montaje.</p>
              <span className="virtual-btn">Ver Modelos</span>
            </Link>
            <Link to="/productos?cat=bancas" className="product-category-card">
              <div className="icon-wrapper"><Box size={32} /></div>
              <h3>Bancas y Otros</h3>
              <p>Complementos versátiles para carga y almacenamiento.</p>
              <span className="virtual-btn">Ver Modelos</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="values-section">
        <div className="container values-container">
          <div className="values-text">
            <span className="section-label">POR QUÉ GREENLAND</span>
            <h2>Calidad que sostiene tu operación.</h2>
            <ul className="values-list">
              <li>
                <strong>Enfoque en Calidad:</strong> Productos probados para durabilidad real, no solo estética.
              </li>
              <li>
                <strong>Stock Constante:</strong> Infraestructura logística para asegurar disponibilidad.
              </li>
              <li>
                <strong>Atención B2B:</strong> Entendemos las necesidades de mayoristas y distribuidores.
              </li>
            </ul>
            <Link to="/nosotros" className="btn btn-outline-dark">Conoce más sobre nosotros</Link>
          </div>
          <div className="values-image">
            {/* Placeholder for warehouse/industrial image */}
            <div className="img-placeholder"></div>
          </div>
        </div>
      </section>

      {/* Coverage/Locations */}
      <section className="coverage-section">
        <div className="container">
          <div className="coverage-content">
            <div className="coverage-info">
              <Truck size={48} className="coverage-icon" />
              <h2>Cobertura Nacional</h2>
              <p>Operamos estratégicamente desde múltiples puntos para agilizar tu logística.</p>
            </div>
            <div className="locations-grid">
              <span>Saltillo</span>
              <span>Monterrey</span>
              <span>Altamira</span>
              <span>Morelia</span>
              <span>Mazatlán</span>
              <span>Tlalnepantla</span>
              <span>Mérida</span>
              <span>Veracruz</span>
            </div>
          </div>
        </div>
      </section>

      <style>{`
                /* Hero */
                .hero {
                    background-color: var(--color-primary);
                    color: white;
                    min-height: 85vh;
                    display: flex;
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                    background-image: url('https://images.unsplash.com/photo-1586864387967-dfaafa30d506?q=80&w=2670&auto=format&fit=crop'); /* Warehouse/Industrial BG */
                    background-size: cover;
                    background-position: center;
                }

                .hero-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%);
                    z-index: 1;
                }

                .hero-content {
                    position: relative;
                    z-index: 2;
                    max-width: 800px;
                    margin-left: auto; 
                    margin-right: auto;
                    text-align: center;
                    padding-top: 4rem;
                }

                .hero-tag {
                    display: inline-block;
                    background-color: var(--color-secondary);
                    color: var(--color-primary);
                    font-weight: 700;
                    font-size: 0.75rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-sm);
                    margin-bottom: 1.5rem;
                    letter-spacing: 0.1em;
                }

                .hero h1 {
                    font-size: 3.5rem;
                    line-height: 1.1;
                    margin-bottom: 1.5rem;
                    font-weight: 800;
                }

                .hero p {
                    font-size: 1.25rem;
                    color: var(--color-text-light);
                    margin-bottom: 2.5rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .hero-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .btn-outline-light {
                    border: 2px solid white;
                    color: white;
                    font-weight: 600;
                }
                .btn-outline-light:hover {
                    background-color: white;
                    color: var(--color-primary);
                }

                /* Divisions */
                .divisions-section {
                    padding: 4rem 0;
                    background-color: var(--color-background);
                }

                .divisions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                }

                .division-card {
                    height: 400px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    align-items: flex-end;
                    transition: transform 0.3s ease;
                    background-color: var(--color-primary);
                }
                
                .division-card:hover {
                    transform: translateY(-5px);
                }

                .division-card.spaces {
                    background-image: url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80');
                    background-size: cover;
                }
                
                .division-card.deco {
                    background-image: url('https://images.unsplash.com/photo-1600566752355-35792bedcfe1?auto=format&fit=crop&q=80');
                    background-size: cover;
                }

                .division-image-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                    z-index: 1;
                }

                .division-content {
                    position: relative;
                    z-index: 2;
                    padding: 2.5rem;
                    width: 100%;
                }

                .division-content h2 {
                    font-size: 2rem;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .division-content h2 span {
                    color: var(--color-secondary);
                }

                .division-content p {
                    color: rgba(255,255,255,0.8);
                    margin-bottom: 1.5rem;
                }

                .link-arrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: white;
                    font-weight: 600;
                    background-color: rgba(255,255,255,0.1);
                    padding: 0.75rem 1.25rem;
                    border-radius: var(--radius-md);
                    backdrop-filter: blur(4px);
                    transition: all 0.2s;
                }

                .link-arrow:hover {
                    background-color: white;
                    color: var(--color-primary);
                }

                /* Essentials */
                .section-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }
                .section-header h2 {
                    font-size: 2.5rem;
                    color: var(--color-primary);
                    margin-bottom: 0.5rem;
                }
                .section-header p {
                    color: var(--color-text-muted);
                    font-size: 1.1rem;
                }

                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                }

                .product-category-card {
                    background-color: white;
                    border: 1px solid var(--color-border);
                    padding: 2rem;
                    border-radius: var(--radius-lg);
                    text-align: center;
                    transition: all 0.3s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    height: 100%;
                }

                .product-category-card:hover {
                    border-color: var(--color-secondary);
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-5px);
                }

                .icon-wrapper {
                    width: 64px;
                    height: 64px;
                    background-color: var(--color-background);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-primary);
                    margin-bottom: 1.5rem;
                    transition: all 0.3s;
                }

                .product-category-card:hover .icon-wrapper {
                    background-color: var(--color-secondary);
                    color: var(--color-primary);
                }

                .product-category-card h3 {
                    margin-bottom: 0.75rem;
                    color: var(--color-primary);
                }

                .product-category-card p {
                    font-size: 0.9rem;
                    color: var(--color-text-muted);
                    margin-bottom: 1.5rem;
                    flex-grow: 1;
                }

                .virtual-btn {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--color-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    position: relative;
                }
                .virtual-btn::after {
                    content: '';
                    display: block;
                    width: 100%;
                    height: 2px;
                    background-color: var(--color-secondary);
                    transform: scaleX(0);
                    transition: transform 0.3s;
                }
                .product-category-card:hover .virtual-btn::after {
                    transform: scaleX(1);
                }


                /* Values */
                .values-section {
                    background-color: white;
                }

                .values-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4rem;
                    align-items: center;
                }

                .section-label {
                    color: var(--color-secondary-hover);
                    font-weight: 700;
                    font-size: 0.85rem;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    display: block;
                    margin-bottom: 1rem;
                }

                .values-text h2 {
                    font-size: 2.5rem;
                    color: var(--color-primary);
                    margin-bottom: 2rem;
                }

                .values-list {
                    margin-bottom: 2.5rem;
                }

                .values-list li {
                    margin-bottom: 1.5rem;
                    color: var(--color-text-muted);
                    font-size: 1.1rem;
                }
                
                .values-list strong {
                    color: var(--color-primary);
                    display: block;
                    margin-bottom: 0.25rem;
                }

                .values-image {
                    height: 500px;
                    background-color: var(--color-primary);
                    border-radius: var(--radius-lg);
                    position: relative;
                    overflow: hidden;
                }
                
                .img-placeholder {
                    width: 100%;
                    height: 100%;
                    background-image: url('https://images.unsplash.com/photo-1565514020171-460d3d4b6807?auto=format&fit=crop&q=80'); /* Industrial Detail */
                    background-size: cover;
                    background-position: center;
                }


                /* Coverage */
                .coverage-section {
                    background-color: var(--color-primary);
                    color: white;
                    padding: 6rem 0;
                    text-align: center;
                }

                .coverage-icon {
                    color: var(--color-secondary);
                    margin-bottom: 1.5rem;
                }

                .coverage-info h2 {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                }

                .coverage-info p {
                    color: var(--color-text-muted);
                    margin-bottom: 3rem;
                    font-size: 1.2rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .locations-grid {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 2rem;
                    max-width: 900px;
                    margin: 0 auto;
                }

                .locations-grid span {
                    font-family: var(--font-mono);
                    color: var(--color-white);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 0.75rem 1.5rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.9rem;
                    letter-spacing: 0.05em;
                }

                @media (max-width: 900px) {
                    .hero h1 { font-size: 2.5rem; }
                    .values-container { grid-template-columns: 1fr; gap: 2rem; }
                    .values-image { height: 300px; order: -1; }
                }
            `}</style>
    </BaseLayout>
  );
};

export default HomePage;
