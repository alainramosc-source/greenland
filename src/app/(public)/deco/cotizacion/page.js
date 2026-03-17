'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2 } from 'lucide-react';
import '../deco.css';

const PRODUCTS = [
    'WPC Interior (Lambrín / Panel Acanalado)',
    'WPC Exterior (Cladding / Fachada)',
    'Deck Coextruido',
    'Panel Mármol UV',
    'Panel Acústico',
    'Piso Vinílico SPC',
    'Panel Sándwich',
    'Piedra Flexible / PU Stone',
];

export default function DecoCotizacionPage() {
    const [form, setForm] = useState({
        name: '', company: '', email: '', phone: '',
        product: '', quantity: '', location: '', message: '',
    });
    const [status, setStatus] = useState('idle');

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const res = await fetch('/api/deco-quote', {
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
            <div className="deco-page">
                <section className="deco-quote-hero">
                    <div className="container">
                        <div className="deco-quote-success">
                            <CheckCircle2 size={64} style={{ color: '#c98c56' }} />
                            <h1>¡Solicitud Enviada!</h1>
                            <p>Hemos recibido tu solicitud de cotización para <strong>{form.product}</strong>. Nuestro equipo te contactará a la brevedad.</p>
                            <div style={{ marginTop: '2rem' }}>
                                <Link href="/deco" className="btn btn-primary-deco">
                                    <ArrowLeft size={16} /> Volver a Deco
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="deco-page">
            <section className="deco-quote-hero">
                <div className="container">
                    <Link href="/deco" className="back-link">
                        <ArrowLeft size={16} /> Volver a Deco
                    </Link>
                    <div className="deco-brand">
                        <span className="deco-logo-text">GREENLAND</span>
                        <span className="deco-logo-accent">DECO</span>
                    </div>
                    <h1>Solicitar Cotización</h1>
                    <p className="deco-quote-subtitle">Completa el formulario y nuestro equipo te contactará con una propuesta personalizada para tu proyecto.</p>
                </div>
            </section>

            <section className="deco-quote-form-section">
                <div className="container">
                    <form onSubmit={handleSubmit} className="deco-quote-form">
                        <div className="deco-form-grid">
                            <div className="deco-form-group">
                                <label htmlFor="name">Nombre completo *</label>
                                <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Tu nombre" />
                            </div>
                            <div className="deco-form-group">
                                <label htmlFor="company">Empresa</label>
                                <input type="text" id="company" name="company" value={form.company} onChange={handleChange} placeholder="Nombre de tu empresa" />
                            </div>
                            <div className="deco-form-group">
                                <label htmlFor="email">Correo electrónico *</label>
                                <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required placeholder="tu@correo.com" />
                            </div>
                            <div className="deco-form-group">
                                <label htmlFor="phone">Teléfono *</label>
                                <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="(844) 123 4567" />
                            </div>
                        </div>

                        <div className="deco-form-grid">
                            <div className="deco-form-group">
                                <label htmlFor="product">Producto de interés *</label>
                                <select id="product" name="product" value={form.product} onChange={handleChange} required>
                                    <option value="">Seleccionar producto...</option>
                                    {PRODUCTS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="deco-form-group">
                                <label htmlFor="quantity">Cantidad estimada (m²)</label>
                                <input type="text" id="quantity" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Ej: 50 m²" />
                            </div>
                        </div>

                        <div className="deco-form-group deco-full-width">
                            <label htmlFor="location">Ubicación / destino del proyecto</label>
                            <input type="text" id="location" name="location" value={form.location} onChange={handleChange} placeholder="Ciudad, estado o dirección" />
                        </div>

                        <div className="deco-form-group deco-full-width">
                            <label htmlFor="message">Detalles adicionales</label>
                            <textarea id="message" name="message" value={form.message} onChange={handleChange} rows="4" placeholder="Cuéntanos más sobre tu proyecto: superficie, tipo de espacio, acabados deseados, plazos, etc." />
                        </div>

                        <button type="submit" className="deco-quote-submit" disabled={status === 'sending'}>
                            {status === 'sending' ? (
                                <><Loader2 size={18} className="spinner" /> Enviando...</>
                            ) : (
                                <><Send size={18} /> Enviar Solicitud</>
                            )}
                        </button>

                        {status === 'error' && (
                            <p className="deco-quote-error">Hubo un error al enviar. Intenta de nuevo o contáctanos directamente.</p>
                        )}
                    </form>
                </div>
            </section>
        </div>
    );
}
