
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Filter, ShoppingBag } from 'lucide-react';
import ProductGallery from '@/components/ProductGallery';
import './catalog.css';

export const revalidate = 0;

export default async function ProductosPage({ searchParams }) {
    const supabase = await createClient();
    const categoryFilter = searchParams?.cat;

    // Fetch categories
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

    // Build query
    let query = supabase.from('products').select('*, categories(name, slug)').eq('is_active', true);

    if (categoryFilter) {
        if (categoryFilter === 'spaces') {
            // Only show specific categories for Spaces (e.g. not bancas? or imply furniture)
            // Let's filter by slug manually for now
            // query = query.in('categories.slug', ['mesas', 'sillas', 'toldos']); - Wait, simple join filter is hard
            // We'll fetch all and filter in JS for these special "divisions" to save time on complex query setup
        } else if (categoryFilter === 'deco') {
            // query = query.eq('categories.slug', 'bancas');
        } else {
            // Filter by specific category slug
            // We need to resolve slug to ID first
            const category = categories?.find(c => c.slug === categoryFilter);
            if (category) {
                query = query.eq('category_id', category.id);
            }
        }
    }

    const { data: products } = await query;

    // Client-side filtering for 'divisions' if needed
    let displayProducts = products || [];
    if (categoryFilter === 'spaces') {
        displayProducts = displayProducts.filter(p => ['mesas', 'sillas', 'toldos'].includes(p.categories?.slug));
    } else if (categoryFilter === 'deco') {
        displayProducts = displayProducts.filter(p => ['bancas'].includes(p.categories?.slug));
    }

    const getPageTitle = () => {
        if (!categoryFilter) return 'Catálogo Completo';
        if (categoryFilter === 'spaces') return 'Greenland Spaces';
        if (categoryFilter === 'deco') return 'Greenland Deco';
        const cat = categories?.find(c => c.slug === categoryFilter);
        return cat ? cat.name : 'Productos';
    };

    return (
        <div className="catalog-page">
            <div className="catalog-header">
                <div className="container">
                    <Link href="/" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <ArrowLeft size={16} /> Volver al Inicio
                    </Link>
                    <div style={{ marginTop: '1rem' }}>
                        <span className="catalog-tag">COLECCIÓN 2026</span>
                    </div>
                    <h1>{getPageTitle()}</h1>
                    <p>Mobiliario profesional diseñado para durar.</p>
                </div>
            </div>

            <div className="container catalog-content">
                {/* Sidebar / Filters */}
                <aside className="catalog-sidebar">
                    <div className="sidebar-section">
                        <h3>Divisiones</h3>
                        <nav className="nav-vertical">
                            <Link href="/productos?cat=spaces" className={`nav-item ${categoryFilter === 'spaces' ? 'active' : ''}`}>
                                Spaces (Eventos)
                            </Link>
                            <Link href="/productos?cat=deco" className={`nav-item ${categoryFilter === 'deco' ? 'active' : ''}`}>
                                Deco (Hogar & Jardín)
                            </Link>
                        </nav>
                    </div>

                    <div className="sidebar-section" style={{ marginTop: '2rem' }}>
                        <h3>Categorías</h3>
                        <nav className="nav-vertical">
                            <Link href="/productos" className={`nav-item ${!categoryFilter ? 'active' : ''}`}>
                                Ver Todo
                            </Link>
                            {categories?.map(cat => (
                                <Link
                                    key={cat.id}
                                    href={`/productos?cat=${cat.slug}`}
                                    className={`nav-item ${categoryFilter === cat.slug ? 'active' : ''}`}
                                >
                                    {cat.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Grid */}
                <div className="catalog-main">
                    {displayProducts.length === 0 ? (
                        <div className="empty-state">
                            <p>No se encontraron productos en esta categoría.</p>
                            <Link href="/productos" className="btn-text">Ver todo el catálogo</Link>
                        </div>
                    ) : (
                        <div className="catalog-grid">
                            {displayProducts.map(product => (
                                <Link href={`/productos/${product.sku}`} key={product.id} className="product-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                                    <div className="product-image">
                                        <ProductGallery sku={product.sku} productName={product.name} />
                                        {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                                            <span className="badge-low-stock">Pocas Piezas</span>
                                        )}
                                    </div>
                                    <div className="product-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <span className="product-category">{product.categories?.name}</span>
                                        <h3>{product.name}</h3>
                                        <p>{product.description?.substring(0, 80)}...</p>
                                        <div className="product-footer" style={{ marginTop: 'auto' }}>
                                            <span className="price">${parseFloat(product.price).toLocaleString()} <span style={{ fontSize: '0.7em', fontWeight: 400 }}>MXN</span></span>
                                            <button className="btn-icon" aria-label="Ver detalles" style={{ pointerEvents: 'none' }} tabIndex={-1}>
                                                <ArrowRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
