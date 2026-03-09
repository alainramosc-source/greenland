'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2 } from 'lucide-react';
import '../spaces.css';

const PRODUCTS = [
    'Contenedor Expandible',
    'Contenedor Plegable Tipo Z',
    'Contenedor Plegable',
    'Space Capsule',
    'Contenedor Desmontable',
];

export default function CotizacionPage() {
    const [form, setForm] = useState({
        name: '', company: '', email: '', phone: '',
        product: '', quantity: '', location: '', message: '',
    });
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const res = await fetch('/api/spaces-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('sent');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className="spaces-page">
                <section className="quote-hero">
                    <div className="container">
                        <div className="quote-success">
                            <CheckCircle2 size={64} className="success-icon" />
                            <h1>¡Solicitud Enviada!</h1>
                            <p>Hemos recibido tu solicitud de cotización para <strong>{form.product}</strong>. Nuestro equipo te contactará a la brevedad.</p>
                            <div className="quote-success-actions">
                                <Link href="/spaces" className="btn btn-primary">
                                    <ArrowLeft size={16} /> Volver a Spaces
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="spaces-page">
            <section className="quote-hero">
                <div className="container">
                    <Link href="/spaces" className="back-link">
                        <ArrowLeft size={16} /> Volver a Spaces
                    </Link>
                    <div className="spaces-brand">
                        <span className="spaces-logo-text">GREENLAND</span>
                        <span className="spaces-logo-accent">SPACES</span>
                    </div>
                    <h1>Solicitar Cotización</h1>
                    <p className="quote-subtitle">Completa el formulario y nuestro equipo técnico te contactará con una propuesta personalizada.</p>
                </div>
            </section>

            <section className="quote-form-section">
                <div className="container">
                    <form onSubmit={handleSubmit} className="quote-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">Nombre completo *</label>
                                <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Tu nombre" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="company">Empresa</label>
                                <input type="text" id="company" name="company" value={form.company} onChange={handleChange} placeholder="Nombre de tu empresa" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Correo electrónico *</label>
                                <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required placeholder="tu@correo.com" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Teléfono *</label>
                                <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="(844) 123 4567" />
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="product">Producto de interés *</label>
                                <select id="product" name="product" value={form.product} onChange={handleChange} required>
                                    <option value="">Seleccionar producto...</option>
                                    {PRODUCTS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="quantity">Cantidad estimada</label>
                                <input type="text" id="quantity" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Ej: 5 unidades" />
                            </div>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="location">Ubicación / destino del proyecto</label>
                            <input type="text" id="location" name="location" value={form.location} onChange={handleChange} placeholder="Ciudad, estado o dirección" />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="message">Detalles adicionales</label>
                            <textarea id="message" name="message" value={form.message} onChange={handleChange} rows="4" placeholder="Cuéntanos más sobre tu proyecto: uso, configuración deseada, plazos, etc." />
                        </div>

                        <button type="submit" className="quote-submit-btn" disabled={status === 'sending'}>
                            {status === 'sending' ? (
                                <><Loader2 size={18} className="spinner" /> Enviando...</>
                            ) : (
                                <><Send size={18} /> Enviar Solicitud</>
                            )}
                        </button>

                        {status === 'error' && (
                            <p className="quote-error">Hubo un error al enviar. Intenta de nuevo o contáctanos directamente.</p>
                        )}
                    </form>
                </div>
            </section>
        </div>
    );
}
