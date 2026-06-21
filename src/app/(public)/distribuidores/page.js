'use client';
import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Send, Phone, MapPin, TrendingUp, Package, Shield, Truck, Users, Star, ChevronRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import '@/app/globals.css';

const WHATSAPP_NUMBER = '528441595472';
const WHATSAPP_MSG = encodeURIComponent('Hola, me interesa ser distribuidor Greenland. Me gustaría recibir más información.');

const PRODUCTS = [
    { sku: 'GL15', name: 'Mesa Plegable 1.80 Premium', desc: 'HDPE + Acero · 180×74×74 cm · Hasta 300 kg', image: '/productos/GL15-P1.png', category: 'Mesas Plegables' },
    { sku: 'GL23', name: 'Silla Plegable C17 Black', desc: 'Estructura de acero · 49×45×84 cm · Plegable', image: '/productos/GL23-P1.png', category: 'Sillas Plegables' },
    { sku: 'GL07', name: 'Toldo Profesional 3×3', desc: 'Acero + Poliéster 800D PVC · Impermeable', image: '/productos/GL07-P1.jpg', category: 'Toldos Profesionales' },
];

const STATS = [
    { value: 'Directo', label: 'Precio importador · Sin intermediarios' },
    { value: '25%', label: 'Margen promedio' },
    { value: '24hrs', label: 'Despacho garantizado' },
    { value: '100%', label: 'Cobertura nacional' },
];

const BENEFITS = [
    { icon: TrendingUp, title: 'Márgenes del 20-35%', desc: 'Precios directos de importador. Sin intermediarios. Tu margen es real y competitivo.' },
    { icon: Package, title: 'Stock Permanente', desc: 'Inventario disponible en bodegas nacionales. No dependes de tiempos de importación.' },
    { icon: Truck, title: 'Envío Nacional', desc: 'Red logística propia con cobertura a toda la República. Despacho en 24hrs.' },
    { icon: Shield, title: 'Territorio Protegido', desc: 'Red de distribución controlada. Evitamos la saturación para cuidar tu mercado.' },
    { icon: Star, title: 'Portal B2B Exclusivo', desc: 'Plataforma digital para pedidos, inventario, pagos, ventas e indicadores en tiempo real.' },
    { icon: Users, title: 'Soporte Directo', desc: 'Línea directa con el equipo comercial. Capacitación y acompañamiento constante.' },
];

export default function DistribuidoresPage() {
    const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', city: '', message: '' });
    const [status, setStatus] = useState('idle');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.company || !form.email || !form.phone || !form.city) return;
        setStatus('sending');
        try {
            const res = await fetch('/api/distributor-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('sent');
                // Google Analytics conversion event
                if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'generate_lead', {
                        event_category: 'distributor_application',
                        event_label: form.city,
                        value: 1,
                        company: form.company,
                        city: form.city,
                    });
                }
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    const scrollToForm = () => {
        document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const trackWhatsApp = (location) => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'contact', {
                event_category: 'whatsapp_click',
                event_label: location,
                method: 'WhatsApp',
            });
        }
    };

    return (
        <div style={{ background: '#fafafa' }}>
            {/* ============ HERO ============ */}
            <section style={{
                position: 'relative',
                minHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
            }}>
                {/* Background image */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                }}>
                    <Image src="/images/distributor-hero.png" alt="Greenland distribuidores" fill style={{ objectFit: 'cover' }} priority />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,20,15,0.88) 0%, rgba(10,20,15,0.6) 60%, rgba(10,20,15,0.4) 100%)' }} />
                </div>
                <div className="container" style={{ position: 'relative', zIndex: 1, padding: '8rem 2rem 6rem', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ maxWidth: '700px' }}>
                        <span style={{
                            display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.25em',
                            color: '#4ade20', marginBottom: '1.5rem', background: 'rgba(74,222,32,0.1)',
                            padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '1px solid rgba(74,222,32,0.2)',
                            textTransform: 'uppercase'
                        }}>Programa de distribuidores</span>

                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.05,
                            color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em'
                        }}>
                            Vende productos de<br />
                            <span style={{ color: '#4ade20' }}>alta rotación.</span>
                        </h1>

                        <p style={{
                            fontSize: '1.15rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7,
                            marginBottom: '2.5rem', maxWidth: '550px'
                        }}>
                            Únete a la red de distribuidores Greenland. Mesas, sillas y toldos plegables de grado comercial con márgenes de hasta 35%. Importador directo, stock permanente, envío nacional.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button onClick={scrollToForm} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                background: '#4ade20', color: '#0a140f', padding: '1rem 2rem',
                                borderRadius: '9999px', fontWeight: 800, fontSize: '0.95rem',
                                border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                                letterSpacing: '0.05em', boxShadow: '0 8px 25px rgba(74,222,32,0.35)',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}>
                                Quiero ser distribuidor <ArrowRight size={18} />
                            </button>
                            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsApp('hero')} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(255,255,255,0.1)', color: 'white', padding: '1rem 2rem',
                                borderRadius: '9999px', fontWeight: 700, fontSize: '0.95rem',
                                border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none',
                                backdropFilter: 'blur(10px)', transition: 'background 0.2s',
                                cursor: 'pointer'
                            }}>
                                <MessageCircle size={18} /> WhatsApp directo
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ STATS BAR ============ */}
            <section style={{
                background: '#111', padding: '0', position: 'relative', zIndex: 2,
                marginTop: '-2rem', borderRadius: '1.5rem 1.5rem 0 0'
            }}>
                <div style={{
                    maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem',
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem',
                }}>
                    {STATS.map((stat, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '2.25rem', fontWeight: 900, color: '#4ade20', marginBottom: '0.25rem' }}>{stat.value}</p>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============ PRODUCTS ============ */}
            <section style={{ padding: '6rem 2rem', background: 'white' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.25em', color: '#6a9a04', textTransform: 'uppercase' }}>Línea Core</span>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#111', marginTop: '0.75rem', letterSpacing: '-0.02em' }}>
                            Productos con Demanda Comprobada
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: '#666', maxWidth: '600px', margin: '1rem auto 0', lineHeight: 1.6 }}>
                            Tres categorías de alta rotación con márgenes atractivos. Calidad de grado comercial que genera recompra.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                        {PRODUCTS.map((p, i) => (
                            <div key={i} style={{
                                background: '#fafafa', borderRadius: '1.25rem', overflow: 'hidden',
                                border: '1px solid #eee', transition: 'transform 0.3s, box-shadow 0.3s',
                            }}>
                                <div style={{
                                    position: 'relative', height: '280px', background: '#f5f5f5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '1.5rem'
                                }}>
                                    <Image src={p.image} alt={p.name} width={240} height={240} style={{ objectFit: 'contain', maxHeight: '100%' }} />
                                    <span style={{
                                        position: 'absolute', top: '1rem', left: '1rem',
                                        background: '#111', color: 'white', padding: '0.35rem 0.75rem',
                                        borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 800,
                                        letterSpacing: '0.1em', textTransform: 'uppercase'
                                    }}>{p.category}</span>
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', marginBottom: '0.5rem' }}>{p.name}</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.5 }}>{p.desc}</p>
                                    <div style={{
                                        marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(106,154,4,0.08)',
                                        borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <TrendingUp size={14} color="#6a9a04" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6a9a04' }}>Margen distribuidor: 20-35%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ BENEFITS ============ */}
            <section style={{ padding: '6rem 2rem', background: '#fafafa' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.25em', color: '#6a9a04', textTransform: 'uppercase' }}>Ventajas</span>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#111', marginTop: '0.75rem', letterSpacing: '-0.02em' }}>
                            ¿Por Qué Greenland?
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                        {BENEFITS.map((b, i) => {
                            const Icon = b.icon;
                            return (
                                <div key={i} style={{
                                    background: 'white', padding: '2rem', borderRadius: '1.25rem',
                                    border: '1px solid #eee', transition: 'transform 0.2s'
                                }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'rgba(106,154,4,0.1)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem'
                                    }}>
                                        <Icon size={22} color="#6a9a04" />
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111', marginBottom: '0.5rem' }}>{b.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6 }}>{b.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ============ FORM + CTA ============ */}
            <section id="form-section" style={{ padding: '6rem 2rem', background: '#111' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
                    {/* Left - CTA */}
                    <div style={{ paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.25em', color: '#4ade20', textTransform: 'uppercase' }}>Da el primer paso</span>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: 'white', marginTop: '0.75rem', marginBottom: '1.5rem', lineHeight: 1.1 }}>
                            Solicita tu acceso<br />a precios mayoristas
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                            Completa el formulario y nuestro equipo comercial te contactará en menos de 24 horas con toda la información que necesitas para comenzar.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                            {[
                                'Sin costo de inscripción',
                                'Pedido mínimo accesible',
                                'Capacitación incluida',
                                'Acceso inmediato al portal B2B'
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <CheckCircle2 size={18} color="#4ade20" />
                                    <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{item}</span>
                                </div>
                            ))}
                        </div>

                        {/* WhatsApp CTA */}
                        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsApp('form_section')} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                            background: '#25d366', color: 'white', padding: '1rem 2rem',
                            borderRadius: '9999px', fontWeight: 800, fontSize: '0.9rem',
                            textDecoration: 'none', boxShadow: '0 8px 25px rgba(37,211,102,0.3)',
                            transition: 'transform 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            <MessageCircle size={20} /> ¿Prefieres WhatsApp? Escríbenos
                        </a>
                    </div>

                    {/* Right - Form */}
                    <div style={{
                        background: 'white', padding: '2.5rem', borderRadius: '1.5rem',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                    }}>
                        {status === 'sent' ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '50%',
                                    background: 'rgba(106,154,4,0.1)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
                                }}>
                                    <CheckCircle2 size={36} color="#6a9a04" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111', marginBottom: '0.75rem' }}>¡Solicitud Recibida!</h3>
                                <p style={{ fontSize: '1rem', color: '#666', lineHeight: 1.6 }}>
                                    Hemos recibido la solicitud de <strong>{form.company}</strong>. Te contactaremos en menos de 24 horas.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#111', marginBottom: '0.25rem' }}>Solicitud de Distribución</h3>
                                <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '1.75rem' }}>Todos los campos son requeridos</p>
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empresa</label>
                                            <input type="text" name="company" value={form.company} onChange={handleChange} required placeholder="Nombre de tu empresa"
                                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacto</label>
                                            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Tu nombre"
                                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
                                        <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="contacto@tuempresa.com"
                                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono / WhatsApp</label>
                                            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="+52 (81) ..."
                                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciudad / Estado</label>
                                            <input type="text" name="city" value={form.city} onChange={handleChange} required placeholder="Monterrey, NL"
                                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mensaje (opcional)</label>
                                        <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="¿Qué productos te interesan? ¿Ya tienes experiencia en el giro?"
                                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e5e5e5', background: '#fafafa', fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                    </div>
                                    <button type="submit" disabled={status === 'sending'} style={{
                                        width: '100%', marginTop: '0.5rem', padding: '1rem',
                                        background: '#6a9a04', color: 'white', border: 'none',
                                        borderRadius: '9999px', fontWeight: 800, fontSize: '0.95rem',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                        cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                                        opacity: status === 'sending' ? 0.7 : 1,
                                        boxShadow: '0 4px 14px rgba(106,154,4,0.3)',
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                        transition: 'transform 0.2s'
                                    }}>
                                        {status === 'sending' ? (
                                            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                                        ) : (
                                            <>Enviar Solicitud <ArrowRight size={18} /></>
                                        )}
                                    </button>
                                    {status === 'error' && (
                                        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                                            Hubo un error. Intenta de nuevo o escríbenos por WhatsApp.
                                        </p>
                                    )}
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ============ PORTAL PREVIEW ============ */}
            <section style={{ padding: '5rem 2rem', background: 'white', textAlign: 'center' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111', marginBottom: '1rem' }}>
                        Portal B2B Exclusivo
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#666', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                        Cada distribuidor recibe acceso a una plataforma digital completa para gestionar toda su operación con Greenland.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
                        {[
                            { emoji: '📦', title: 'Pedidos', desc: 'Crea y da seguimiento' },
                            { emoji: '📊', title: 'Inventario', desc: 'Control en tiempo real' },
                            { emoji: '💰', title: 'Pagos', desc: 'Saldos y transacciones' },
                            { emoji: '📈', title: 'Indicadores', desc: 'Métricas de negocio' },
                        ].map((f, i) => (
                            <div key={i} style={{
                                padding: '1.5rem 1rem', background: '#fafafa', borderRadius: '1rem',
                                border: '1px solid #eee'
                            }}>
                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>{f.emoji}</span>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111', marginBottom: '0.25rem' }}>{f.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: '#999' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                    <Link href="/login" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: '#111', color: 'white', padding: '0.875rem 2rem',
                        borderRadius: '9999px', fontWeight: 800, fontSize: '0.85rem',
                        textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        Ya soy distribuidor — Iniciar Sesión <ChevronRight size={16} />
                    </Link>
                </div>
            </section>

            {/* ============ FLOATING WHATSAPP ============ */}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsApp('floating_button')}
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
                    transition: 'transform 0.3s',
                }}>
                <MessageCircle size={28} color="white" />
            </a>

            <style jsx>{`
                @media (max-width: 768px) {
                    section > div[style*="grid-template-columns: repeat(3"] {
                        grid-template-columns: 1fr !important;
                    }
                    section > div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                    section > div > div[style*="grid-template-columns: repeat(4"] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
