'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, ShoppingCart, Plus, Minus, ArrowRight, CheckCircle, Package } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function NuevoPedidoPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // Load products & categories
    useEffect(() => {
        async function fetchData() {
            // Products
            const { data: productsData } = await supabase
                .from('products')
                .select(`
          *,
          categories:category_id (name, slug)
        `)
                .eq('is_active', true)
                .order('name');

            if (productsData) setProducts(productsData);

            // Unique categories
            const uniqueCats = Array.from(new Set(productsData?.map(p => p.categories?.name))).filter(Boolean);
            setCategories(uniqueCats);

            setLoading(false);
        }
        fetchData();
    }, []);

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.categories?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Cart logic
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Submit Order
    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    distributor_id: user.id,
                    order_number: `ORD-${Date.now().toString().slice(-6)}`, // Simple ID gen
                    status: 'pending',
                    total_amount: cartTotal,
                    notes: 'Pedido generado desde web'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            setOrderSuccess(true);
            setCart([]);

            // Redirect after 2s
            setTimeout(() => {
                router.push('/dashboard/pedidos');
            }, 2000);

        } catch (error) {
            console.error('Error creating order:', error);
            alert('Error al crear el pedido. Intente nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Cargando catálogo...</div>;

    return (
        <div className="new-order-container">
            {orderSuccess && (
                <div className="success-overlay">
                    <div className="success-modal glass-panel">
                        <CheckCircle size={64} className="text-primary mb-4" />
                        <h2>¡Pedido Creado!</h2>
                        <p>Tu pedido ha sido registrado exitosamente.</p>
                        <p className="text-sm text-muted">Redirigiendo...</p>
                    </div>
                </div>
            )}

            <div className="catalog-section">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-4">Nuevo Pedido</h1>

                    <div className="filters">
                        <div className="search-box glass-input-wrapper">
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="glass-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="category-pills">
                            <button
                                className={`pill ${selectedCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                Todos
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`pill ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="product-card glass-panel">
                            <div className="product-image">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} />
                                ) : (
                                    <div className="placeholder-img"><Package size={32} /></div>
                                )}
                            </div>
                            <div className="product-info">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-white">{product.name}</h3>
                                    <span className="price">${product.price}</span>
                                </div>
                                <p className="text-sm text-muted mb-4 line-clamp-2">{product.description}</p>
                                <div className="flex justify-between items-center mt-auto">
                                    <span className="text-xs text-muted">SKU: {product.sku}</span>
                                    <button
                                        className="btn-add"
                                        onClick={() => addToCart(product)}
                                    >
                                        <Plus size={16} /> Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="cart-sidebar glass-panel">
                <div className="cart-header">
                    <ShoppingCart size={20} />
                    <h2>Resumen del Pedido</h2>
                    <span className="badge">{cart.length}</span>
                </div>

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <ShoppingCart size={48} className="opacity-20 mb-2" />
                            <p>Tu carrito está vacío</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="cart-item">
                                <div className="item-details">
                                    <h4>{item.name}</h4>
                                    <span className="item-price">${item.price * item.quantity}</span>
                                </div>
                                <div className="qty-controls">
                                    <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}>
                                        <Minus size={14} />
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-footer">
                    <div className="total-row">
                        <span>Total Estimado</span>
                        <span className="total-amount">${cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        className="btn-checkout"
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={handleSubmitOrder}
                    >
                        {isSubmitting ? 'Procesando...' : (
                            <>Confirmar Pedido <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .new-order-container {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2rem;
          height: calc(100vh - 120px); /* Adjust based on layout */
        }

        .catalog-section {
          overflow-y: auto;
          padding-right: 1rem;
        }

        .filters {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }

        .category-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .pill {
          padding: 0.4rem 1rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-muted);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .pill:hover, .pill.active {
          background: var(--color-primary);
          color: black;
          border-color: var(--color-primary);
          font-weight: 600;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .product-card {
          overflow: hidden;
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
        }

        .product-card:hover {
          transform: translateY(-4px);
          border-color: rgba(74, 222, 32, 0.3);
        }

        .product-image {
          height: 160px;
          background: #1a1a2e;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .placeholder-img {
          opacity: 0.3;
          color: white;
        }

        .product-info {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .price {
          color: var(--color-primary);
          font-weight: 700;
        }

        .btn-add {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }

        .btn-add:hover {
          background: var(--color-primary);
          color: black;
        }

        /* Cart Sidebar */
        .cart-sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cart-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: white;
        }
        
        .cart-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
        
        .badge {
          background: var(--color-primary);
          color: black;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.1rem 0.5rem;
          border-radius: 10px;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .empty-cart {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .item-details h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.9rem;
          color: white;
        }

        .item-price {
          color: var(--color-primary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .qty-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.25rem;
          border-radius: 4px;
        }

        .qty-controls button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
        }
        
        .qty-controls button:hover { color: var(--color-primary); }
        .qty-controls span { font-size: 0.9rem; color: white; min-width: 20px; text-align: center; }

        .cart-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          color: white;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .total-amount {
          font-weight: 700;
          color: var(--color-primary);
        }

        .btn-checkout {
          width: 100%;
          padding: 0.8rem;
          background: var(--color-primary);
          color: black;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: filter 0.2s;
        }
        
        .btn-checkout:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
        }

        .btn-checkout:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        /* Success Modal */
        .success-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-modal {
          padding: 3rem;
          text-align: center;
          border: 1px solid var(--color-primary);
          box-shadow: 0 0 30px rgba(74, 222, 32, 0.2);
        }
        
        .success-modal h2 { color: white; margin-bottom: 0.5rem; }
        .success-modal p { color: var(--color-text-muted); }

        @media (max-width: 1024px) {
          .new-order-container {
            grid-template-columns: 1fr;
            height: auto;
          }
          .cart-sidebar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: auto;
            max-height: 50vh;
            z-index: 50;
            border-top: 2px solid var(--color-primary);
            background: #0f0f1a;
          }
          .dashboard-main { padding-bottom: 300px; } /* Space for fixed cart */
        }
      `}</style>
        </div>
    );
}
