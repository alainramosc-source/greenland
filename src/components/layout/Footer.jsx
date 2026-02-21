'use client';
import { Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <img src="/logo-new.jpg" alt="Greenland Products" className="footer-logo-img" />
            </div>
            <p className="footer-desc">
              Soluciones profesionales en mobiliario y equipamiento para espacios versátiles. Calidad industrial para uso intensivo.
            </p>
          </div>

          {/* Navigation */}
          <div className="footer-col">
            <h4>NAVEGACIÓN</h4>
            <ul>
              <li><Link href="/">Inicio</Link></li>
              <li><Link href="/productos">Catálogo de Productos</Link></li>
              <li><Link href="/distribuidores">Distribuidores</Link></li>
              <li><Link href="/nosotros">Acerca de Greenland</Link></li>
            </ul>
          </div>

          {/* Lineas */}
          <div className="footer-col">
            <h4>LÍNEAS</h4>
            <ul>
              <li><Link href="/productos?cat=spaces">Greenland Spaces</Link></li>
              <li><Link href="/productos?cat=deco">Greenland Deco</Link></li>
              <li><Link href="/productos?cat=mesas">Mesas Plegables</Link></li>
              <li><Link href="/productos?cat=sillas">Sillas y Bancas</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4>CONTACTO</h4>
            <ul className="contact-list">
              <li>
                <MapPin size={16} />
                <span>Oficinas Centrales<br />Saltillo, Coahuila, MX.</span>
              </li>
              <li>
                <Phone size={16} />
                <span>+52 (844) 159 5472</span>
              </li>
              <li>
                <Mail size={16} />
                <span>ventas@greenland-products.com.mx</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Greenland Products. Todos los derechos reservados.</p>
          <div className="legal-links">
            <Link href="/privacidad">Aviso de Privacidad</Link>
            <Link href="/terminos">Términos y Condiciones</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: var(--color-bg);
          border-top: 1px solid var(--color-border);
          padding: 5rem 0 0;
          margin-top: auto;
          position: relative;
          z-index: 1;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
          gap: 3rem;
          margin-bottom: 4rem;
        }

        /* Logo */
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .footer-logo-img {
          height: 60px;
          width: auto;
          object-fit: contain;
        }

        .footer-desc {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          max-width: 300px;
        }

        /* Columns */
        .footer-col h4 {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--color-text);
          margin-bottom: 1.5rem;
        }

        .footer-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-col li {
          margin-bottom: 0.75rem;
        }

        .footer-col a {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          transition: color 0.2s;
        }

        .footer-col a:hover {
          color: var(--color-primary);
        }

        /* Contact */
        .contact-list li {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }

        .contact-list li :global(svg) {
          color: var(--color-primary);
          flex-shrink: 0;
          margin-top: 3px;
        }

        /* Bottom */
        .footer-bottom {
          border-top: 1px solid var(--color-border-light);
          padding: 2rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-bottom p {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .legal-links {
          display: flex;
          gap: 1.5rem;
        }

        .legal-links a {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          transition: color 0.2s;
        }

        .legal-links a:hover {
          color: var(--color-primary);
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
