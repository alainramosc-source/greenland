'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, ShoppingCart, Plus, Minus, ArrowRight, ArrowLeft, CheckCircle, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductGallery from '@/components/ProductGallery';

export default function NuevoPedidoPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');

  const router = useRouter();
  const supabase = createClient();

  // Load products & categories
  useEffect(() => {
    async function fetchData() {
      try {
        // Products
        const { data: productsData } = await supabase
          .from('products')
          .select(`
            *,
            categories:category_id (name, slug)
          `)
          .eq('is_active', true)
          .order('name');

        // Calculate available stock for each product
        if (productsData) {
          productsData.forEach(p => {
            p.available_stock = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
          });
        }

        if (productsData) setProducts(productsData);

        // Unique categories
        const uniqueCats = Array.from(new Set((productsData || []).map(p => p.categories?.name).filter(Boolean)));
        setCategories(uniqueCats);

        // Fetch distributor addresses
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let addrUserId = user.id;
          // Check admin simulation
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (prof?.role === 'admin' && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
            const simId = sessionStorage.getItem('test_view_distributor_id');
            if (simId) addrUserId = simId;
          }
          const { data: addrData } = await supabase
            .from('distributor_addresses')
            .select('*')
            .eq('distributor_id', addrUserId)
            .order('is_default', { ascending: false });
          if (addrData) {
            setAddresses(addrData);
            const defaultAddr = addrData.find(a => a.is_default);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          }
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter products
  const filteredProducts = products.filter(product => {
    const safeQuery = searchQuery?.toLowerCase() || '';
    const matchesSearch = (product.name && product.name.toLowerCase().includes(safeQuery)) ||
      (product.sku && product.sku.toLowerCase().includes(safeQuery));
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

  const cartTotal = cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * item.quantity), 0);

  // Submit Order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let distributorIdToUse = user.id;

      // Check if admin is simulating a distributor
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin' && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
        const simulatedDistId = sessionStorage.getItem('test_view_distributor_id');
        if (simulatedDistId) {
          distributorIdToUse = simulatedDistId;
        }
      }

      // 1. Create Order (as suggested/pending — NO inventory impact)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          distributor_id: distributorIdToUse,
          order_number: `ORD-${Date.now().toString().slice(-6)}`,
          status: 'pending',
          payment_status: 'unpaid',
          total_amount: cartTotal,
          shipping_address_id: selectedAddressId === 'pickup' ? null : selectedAddressId,
          notes: orderNotes || (selectedAddressId === 'pickup' ? 'Recoger en sitio' : 'Pedido sugerido desde web')
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: Number(item.price) || 0
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Note: Inventory is NOT reserved at this stage.
      // It will be reserved when Admin confirms the order.

      // Send email notification to admins
      try {
        const { data: distProfile } = await supabase.from('profiles').select('full_name, email').eq('id', distributorIdToUse).single();
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_order',
            orderNumber: order.order_number,
            orderId: order.id,
            status: 'pending',
            distributorName: distProfile?.full_name || 'Distribuidor',
            distributorEmail: distProfile?.email,
            items: cart.map(item => ({ products: { name: item.name }, quantity: item.quantity, subtotal: (Number(item.price) || 0) * item.quantity })),
            total: cartTotal,
          }),
        });
      } catch (emailErr) { console.error('Email notification error:', emailErr); }

      setOrderSuccess(true);
      setCart([]);

      // Redirect after 2s
      setTimeout(() => {
        router.push('/dashboard/pedidos');
      }, 2000);

    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear el pedido: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin"></div>
      <p className="font-medium">Cargando catálogo...</p>
    </div>
  );

  return (
    <div className="relative">
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 border border-slate-100 flex flex-col items-center">
            <CheckCircle size={64} className="text-[#6a9a04] mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Pedido Enviado!</h2>
            <p className="text-slate-600 mb-4">Tu pedido sugerido ha sido registrado. Greenland lo revisará y confirmará.</p>
            <p className="text-sm text-slate-400">Redirigiendo...</p>
          </div>
        </div>
      )}

      <div>
        <div style={{ paddingBottom: '2rem' }}>
          <header className="mb-8">
            <div className="mb-6">
              <Link href="/dashboard/pedidos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium no-underline">
                <ArrowLeft size={16} />
                Volver a pedidos
              </Link>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 m-0">Nuevo Pedido</h1>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full pl-11 pr-4 py-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-slate-800 outline-none transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  className={`px-4 py-1.5 rounded-full text-sm transition-all border ${selectedCategory === 'all' ? 'bg-[#6a9a04] text-white border-[#6a9a04] font-bold shadow-md shadow-[#6a9a04]/20' : 'bg-white/60 text-slate-600 border-white/60 hover:bg-white hover:border-slate-200'}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all border ${selectedCategory === cat ? 'bg-[#6a9a04] text-white border-[#6a9a04] font-bold shadow-md shadow-[#6a9a04]/20' : 'bg-white/60 text-slate-600 border-white/60 hover:bg-white hover:border-slate-200'}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-all p-4 rounded-2xl flex flex-col group">
                <div className="h-40 bg-slate-100 rounded-xl overflow-hidden mb-4 flex items-center justify-center relative">
                  {product.sku && <ProductGallery sku={product.sku} productName={product.name} />}
                  {!product.sku && <Package className="w-8 h-8 text-slate-300" />}
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-slate-900 leading-tight">{product.name}</h3>
                    <span className="font-black text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded-lg text-sm shrink-0">${product.price}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2 line-clamp-2">{product.description}</p>
                  <p className={`text-xs font-bold m-0 mb-3 ${product.available_stock <= 0 ? 'text-red-500' : product.available_stock <= 10 ? 'text-amber-500' : 'text-[#6a9a04]'}`}>
                    {product.available_stock <= 0 ? 'Sin stock disponible' : `${product.available_stock} disponibles`}
                  </p>

                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-200/50">
                    <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">SKU: {product.sku}</span>
                    <button
                      className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-colors text-sm ${product.available_stock <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-[#6a9a04] hover:text-white text-slate-700 cursor-pointer'}`}
                      onClick={() => addToCart(product)}
                      disabled={product.available_stock <= 0}
                    >
                      <Plus size={16} /> {product.available_stock <= 0 ? 'Agotado' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-white/40">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#6a9a04]" />
              <h2 className="font-bold text-lg text-slate-900 m-0">Resumen del Pedido</h2>
            </div>
            <span className="bg-[#6a9a04] text-white text-xs font-bold px-2.5 py-1 rounded-full">{cart.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="font-medium">Tu carrito está vacío</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {cart.map(item => (
                  <div key={item.id} className="flex flex-col gap-2 pb-4 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-slate-800 m-0 pr-4 leading-tight">{item.name}</h4>
                      <span className="font-black text-[#6a9a04] text-sm shrink-0">${item.price * item.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-500">${item.price} c/u</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#6a9a04] rounded transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const val = raw === '' ? 1 : parseInt(raw);
                            if (val > 0) {
                              setCart(prev => prev.map(ci => ci.id === item.id ? { ...ci, quantity: val } : ci));
                            }
                          }}
                          className="font-bold text-sm text-slate-700 w-14 text-center border-none outline-none bg-transparent"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#6a9a04] rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-200/50 bg-white/60 mt-auto">
            {/* Address Selector */}
            {addresses.length === 0 ? (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <MapPin size={24} className="mx-auto mb-2 text-orange-400" />
                <p className="text-sm font-bold text-orange-700 m-0 mb-1">Sin direcciones registradas</p>
                <p className="text-xs text-orange-600 m-0 mb-3">Debes registrar al menos una dirección de envío antes de crear un pedido.</p>
                <Link href="/dashboard/direcciones" className="inline-flex items-center gap-1.5 bg-[#6a9a04] text-white text-sm font-bold px-4 py-2 rounded-lg no-underline hover:bg-[#6a9a04]/90 transition-colors">
                  <MapPin size={14} /> Registrar Dirección
                </Link>
              </div>
            ) : (
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <MapPin size={12} /> Dirección de envío *
                </label>
                <select
                  value={selectedAddressId || ''}
                  onChange={(e) => setSelectedAddressId(e.target.value || null)}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 ${!selectedAddressId ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'
                    }`}
                >
                  <option value="">— Selecciona una dirección —</option>
                  {addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label} — {addr.city}, {addr.state}
                    </option>
                  ))}
                  <option value="pickup">🏭 Recoger en sitio (sin envío)</option>
                </select>
                {!selectedAddressId && (
                  <p className="text-[11px] text-orange-500 font-medium mt-1 m-0">Selecciona una dirección para continuar</p>
                )}
              </div>
            )}

            {/* Comentarios / Instrucciones */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                📝 Comentarios / Instrucciones
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ej: Priorizar 20 mesas negras de 1.80, llenar espacio restante con cualquier modelo..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-slate-600">Total Estimado</span>
              <span className="text-2xl font-black text-[#6a9a04]">${cartTotal.toFixed(2)}</span>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#6a9a04]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              disabled={cart.length === 0 || isSubmitting || !selectedAddressId || addresses.length === 0}
              onClick={handleSubmitOrder}
            >
              {isSubmitting ? 'Enviando pedido...' : (
                <>Enviar Pedido Sugerido <ArrowRight size={18} /></>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2 m-0">Las cantidades pueden ser ajustadas por Greenland antes de la confirmación.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
