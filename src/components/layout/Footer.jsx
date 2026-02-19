import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-grid">
            {/* 1. Brand Info */}
            <div className="footer-section brand-section">
              <div className="footer-logo">
                <span className="logo-text">GREENLAND</span>
                <span className="logo-sub">PRODUCTS</span>
              </div>
              <p className="footer-desc">
                Soluciones profesionales en mobiliario y equipamiento para espacios versátiles. Calidad industrial para uso intensivo.
              </p>
              <div className="social-links">
                <a href="#" aria-label="LinkedIn"><Linkedin size={20} /></a>
                <a href="#" aria-label="Facebook"><Facebook size={20} /></a>
                <a href="#" aria-label="Instagram"><Instagram size={20} /></a>
              </div>
            </div>

            {/* 2. Navigation */}
            <div className="footer-section">
              <h4 className="footer-subtitle">Navegación</h4>
              <ul className="footer-links">
                <li><Link to="/">Inicio</Link></li>
                <li><Link to="/productos">Catálogo de Productos</Link></li>
                <li><Link to="/distribuidores">Distribuidores</Link></li>
                <li><Link to="/nosotros">Acerca de Greenland</Link></li>
              </ul>
            </div>

            {/* 3. Products */}
            <div className="footer-section">
              <h4 className="footer-subtitle">Líneas</h4>
              <ul className="footer-links">
                <li><Link to="/spaces">Greenland Spaces</Link></li>
                <li><Link to="/deco">Greenland Deco</Link></li>
                <li><Link to="/productos?cat=mesas">Mesas Plegables</Link></li>
                <li><Link to="/productos?cat=sillas">Sillas Plegables</Link></li>
              </ul>
            </div>

            {/* 4. Contact */}
            <div className="footer-section">
              <h4 className="footer-subtitle">Contacto</h4>
              <ul className="contact-list">
                <li>
                  <MapPin size={18} className="contact-icon" />
                  <span>
                    Oficinas Centrales<br />
                    CDMX, México
                  </span>
                </li>
                <li>
                  <Phone size={18} className="contact-icon" />
                  <span>+52 (55) 1234 5678</span>
                </li>
                <li>
                  <Mail size={18} className="contact-icon" />
                  <span>contacto@greenland.com.mx</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Greenland Products. Todos los derechos reservados.</p>
          <div className="legal-links">
            <Link to="/privacidad">Aviso de Privacidad</Link>
            <Link to="/terminos">Términos y Condiciones</Link>
          </div>
        </div>
      </div>

      <style>{`
                .footer {
                    background-color: var(--color-primary);
                    color: var(--color-text-muted);
                    padding-top: 5rem;
                    border-top: 4px solid var(--color-secondary);
                }

                .footer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 4rem;
                    margin-bottom: 4rem;
                }

                .footer-logo {
                    margin-bottom: 1.5rem;
                    color: var(--color-white);
                }
                
                .logo-text {
                    display: block;
                    font-weight: 800;
                    font-size: 1.5rem;
                    line-height: 1;
                }

                .logo-sub {
                    font-size: 0.75rem;
                    letter-spacing: 0.2rem;
                    color: var(--color-secondary);
                    font-family: var(--font-mono);
                }

                .footer-desc {
                    margin-bottom: 1.5rem;
                    line-height: 1.6;
                    font-size: 0.95rem;
                }

                .social-links {
                    display: flex;
                    gap: 1rem;
                }

                .social-links a {
                    background-color: rgba(255,255,255,0.05);
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                    color: var(--color-white);
                    transition: all 0.2s;
                }

                .social-links a:hover {
                    background-color: var(--color-secondary);
                    color: var(--color-primary);
                    transform: translateY(-2px);
                }

                .footer-subtitle {
                    color: var(--color-white);
                    margin-bottom: 1.5rem;
                    font-size: 1.1rem;
                    position: relative;
                }

                /* Line separator for subtitles */
                .footer-subtitle::after {
                    content: '';
                    display: block;
                    width: 30px;
                    height: 2px;
                    background-color: var(--color-secondary);
                    margin-top: 0.5rem;
                }

                .footer-links li {
                    margin-bottom: 0.75rem;
                }

                .footer-links a {
                    transition: all 0.2s;
                    font-size: 0.95rem;
                }

                .footer-links a:hover {
                    color: var(--color-secondary);
                    padding-left: 5px;
                }

                .contact-list li {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                    font-size: 0.95rem;
                }

                .contact-icon {
                    color: var(--color-secondary);
                    flex-shrink: 0;
                    margin-top: 0.2rem;
                }

                .footer-bottom {
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding: 2rem 0;
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                    font-size: 0.9rem;
                }

                .legal-links {
                    display: flex;
                    gap: 1.5rem;
                }

                .legal-links a:hover {
                    color: var(--color-white);
                }

                @media (max-width: 768px) {
                    .footer-grid {
                        grid-template-columns: 1fr;
                        gap: 2.5rem;
                    }
                    .footer-bottom {
                        flex-direction: column;
                        text-align: center;
                    }
                    .legal-links {
                        justify-content: center;
                    }
                }
            `}</style>
    </footer>
  );
};

export default Footer;
