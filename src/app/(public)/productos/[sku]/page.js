import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import InteractiveGallery from '@/components/InteractiveGallery';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function ProductDetailsPage({ params }) {
    const supabase = await createClient();
    const sku = params.sku;

    // Fetch product details
    const { data: product } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('sku', sku)
        .eq('is_active', true)
        .single();

    if (!product) {
        notFound();
    }

    return (
        <div className="product-details-page" style={{ paddingTop: '6rem', paddingBottom: '8rem', background: 'var(--color-bg-alt)', minHeight: '100vh' }}>
            <div className="container">
                {/* Breadcrumbs */}
                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/productos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
                        <ArrowLeft size={16} /> Volver al Catálogo
                    </Link>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '4rem',
                    background: '#FFFFFF',
                    padding: '3rem',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)',
                    border: '1px solid var(--color-border-light)'
                }} className="pdp-grid">

                    {/* Image Gallery */}
                    <div className="pdp-gallery">
                        <div style={{ position: 'sticky', top: '2rem' }}>
                            <InteractiveGallery sku={product.sku} productName={product.name} />
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="pdp-info" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                            display: 'inline-block',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: 'var(--color-primary)',
                            marginBottom: '1rem',
                            textTransform: 'uppercase'
                        }}>{product.categories?.name || 'Producto'}</span>

                        <h1 style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--color-text)', lineHeight: 1.2 }}>
                            {product.name}
                        </h1>
                        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '2rem', fontFamily: 'monospace' }}>SKU: {product.sku}</p>

                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '2rem' }}>
                            ${parseFloat(product.price).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>MXN</span>
                        </div>

                        <div style={{ marginBottom: '3rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>Descripción</h3>
                            <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                {product.description || 'No hay descripción disponible para este producto en este momento.'}
                            </p>
                        </div>

                        <div style={{ marginBottom: '3rem', background: 'var(--color-bg-alt)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>Características Destacadas</h3>
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', padding: 0, margin: 0 }}>
                                {['Durabilidad estructural extrema para uso rudo', 'Fácil almacenamiento y logística', 'Materiales resistentes a la intemperie', 'Diseño ergonómico y funcional'].map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                                        <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link href="/distribuidores" style={{
                                flex: 1,
                                minWidth: '200px',
                                textAlign: 'center',
                                padding: '1rem 2rem',
                                background: 'var(--color-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-pill)',
                                fontWeight: 700,
                                textDecoration: 'none',
                                transition: 'filter 0.2s',
                            }}>
                                Solicitar Cotización B2B
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
