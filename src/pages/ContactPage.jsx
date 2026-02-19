import BaseLayout from '../components/layout/BaseLayout';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

const ContactPage = () => {
    return (
        <BaseLayout>
            <div className="contact-page">
                <div className="container">

                    <div className="contact-header">
                        <h1>Contacto</h1>
                        <p className="lead">Estamos para ayudarte a encontrar la solución adecuada.</p>
                    </div>

                    <div className="contact-grid">

                        {/* Contact Form */}
                        <div className="contact-form-section">
                            <form className="contact-form">
                                <div className="form-group">
                                    <label htmlFor="name">Nombre Completo</label>
                                    <input type="text" id="name" placeholder="Tu nombre" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email">Correo Electrónico</label>
                                    <input type="email" id="email" placeholder="tucorreo@ejemplo.com" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="phone">Teléfono</label>
                                    <input type="tel" id="phone" placeholder="(55) 1234 5678" />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message">Mensaje</label>
                                    <textarea id="message" rows="5" placeholder="¿En qué podemos ayudarte?" required></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary">Enviar Mensaje</button>
                            </form>
                        </div>

                        {/* Info Section */}
                        <div className="contact-info-section">
                            <div className="info-card">
                                <h3>Medios de Contacto</h3>
                                <ul className="info-list">
                                    <li>
                                        <div className="icon"><Mail size={24} /></div>
                                        <div>
                                            <strong>Correo</strong>
                                            <p>contacto@greenland.com.mx</p>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="icon"><Phone size={24} /></div>
                                        <div>
                                            <strong>Teléfono</strong>
                                            <p>+52 (55) 1234 5678</p>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="icon"><MessageCircle size={24} /></div>
                                        <div>
                                            <strong>WhatsApp</strong>
                                            <p>Envíanos un mensaje directo</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="info-card map-card">
                                <h3>Cobertura Nacional</h3>
                                <p>
                                    Greenland opera y distribuye a nivel nacional a través de sus distintos puntos estratégicos.
                                </p>
                                {/* Map Placeholder */}
                                <div className="map-placeholder">
                                    <MapPin size={48} color="#ccc" />
                                    <span>Mapa de Cobertura</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
        .contact-page {
          padding: 4rem 0;
          background-color: #f8f9fa;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .contact-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .contact-header h1 {
          font-size: 2.5rem;
          color: var(--color-primary);
          margin-bottom: 0.5rem;
        }

        .contact-header .lead {
          font-size: 1.25rem;
          color: var(--color-grey);
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          background-color: transparent;
        }

        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        /* Form Styles */
        .contact-form-section {
          background-color: var(--color-white);
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--color-black);
        }

        .form-group input, 
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus, 
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(106, 154, 4, 0.1);
        }

        .btn-primary {
          background-color: var(--color-primary);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 1rem;
          width: 100%;
          transition: background-color 0.2s;
        }

        .btn-primary:hover {
          background-color: #5a8203;
        }

        /* Info Styles */
        .info-card {
          margin-bottom: 2rem;
        }

        .info-card h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: var(--color-black);
        }

        .info-list {
          list-style: none;
        }

        .info-list li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .icon {
          background-color: #f0f4e8;
          padding: 0.75rem;
          border-radius: 50%;
          color: var(--color-primary);
        }

        .info-list strong {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 1.1rem;
        }

        .info-list p {
          color: var(--color-grey);
          margin: 0;
        }

        .map-placeholder {
          height: 200px;
          background-color: #ddd;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #888;
          gap: 0.5rem;
        }
      `}</style>
        </BaseLayout>
    );
};

export default ContactPage;
