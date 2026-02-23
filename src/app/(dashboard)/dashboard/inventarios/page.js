'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, History, X, Search, AlertTriangle, Shield } from 'lucide-react';

export default function InventariosPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Admin check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      router.push('/dashboard/pedidos');
      return;
    }
    setIsAdmin(true);

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setProducts(productsData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustmentAmount) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const qty = parseInt(adjustmentAmount);

    const { error } = await supabase
      .from('inventory_logs')
      .insert({
        user_id: user.id,
        product_id: selectedProduct.id,
        quantity_change: qty,
        reason: adjustmentReason || 'Manual adjustment'
      });

    if (error) {
      alert('Error adjusting stock: ' + error.message);
    } else {
      await fetchData();
      setSelectedProduct(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    }
    setSubmitting(false);
  };

  const filteredProducts = products.filter(p => {
    const safeSearch = searchTerm?.toLowerCase() || '';
    const matchSearch = !safeSearch ||
      (p.name && p.name.toLowerCase().includes(safeSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(safeSearch));
    return matchSearch;
  });
  // Calculate stats based on actual product data
  const totalItems = products.reduce((sum, p) => sum + Math.max((p.stock_quantity || 0) - (p.reserved_quantity || 0), 0), 0);
  const outOfStockCount = products.filter(p => ((p.stock_quantity || 0) - (p.reserved_quantity || 0)) <= 0).length;
  const lowStockCount = products.filter(p => {
    const s = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
    return s > 0 && s <= 10;
  }).length;

  const getStockStatus = (stock) => {
    if (stock <= 0) return { label: 'Agotado', dotClass: 'bg-red-500', textClass: 'text-red-500' };
    if (stock <= 10) return { label: 'Stock Bajo', dotClass: 'bg-amber-500 animate-pulse', textClass: 'text-amber-500' };
    return { label: 'Disponible', dotClass: 'bg-[#6a9a04]', textClass: 'text-[#6a9a04]' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Title & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Catálogo de Productos</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Gestión integral de inventario agrícola de alta precisión.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por SKU o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none w-72 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="glass-panel bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Stock Total</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Reservado</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Disponible</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Precio</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Estado</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400">No se encontraron productos.</td></tr>
              ) : (
                filteredProducts.map(product => {
                  const currentStock = product.stock_quantity || 0;
                  const reservedStock = product.reserved_quantity || 0;
                  const availableStock = (product.stock_quantity || 0) - (product.reserved_quantity || 0);
                  const status = getStockStatus(availableStock);
                  return (
                    <tr key={product.id} className="hover:bg-white/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-white/80 border border-slate-100 shadow-sm overflow-hidden p-1 flex-shrink-0 ${currentStock <= 0 ? 'opacity-70' : ''}`}>
                            <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 m-0">{product.name}</p>
                            {product.description && <p className="text-[11px] text-[#6a9a04] font-bold m-0">{product.description.substring(0, 30)}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold m-0 ${currentStock <= 0 ? 'text-red-500' : 'text-slate-900'}`}>
                          {currentStock} <span className="text-[10px] text-slate-400">UND</span>
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold m-0 ${reservedStock > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {reservedStock} <span className="text-[10px] text-slate-400">UND</span>
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-bold m-0 ${availableStock <= 0 ? 'text-red-500' : availableStock <= (product.stock_minimum || 5) ? 'text-amber-500' : 'text-[#6a9a04]'}`}>
                          {availableStock} <span className="text-[10px] text-slate-400">UND</span>
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-[#ec5b13] m-0">
                          ${Number(product.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${status.textClass}`}>
                          <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white hover:text-[#ec5b13] transition-all cursor-pointer bg-transparent flex items-center gap-1 ml-auto"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <History className="w-3.5 h-3.5" /> Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 m-0">Mostrando {filteredProducts.length} de {products.length} productos</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-6 rounded-2xl flex items-center gap-4 hover:bg-white/80 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
              <Package className="w-6 h-6 border-none" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 m-0">Total Items</p>
              <p className="text-2xl font-black text-slate-900 m-0">{totalItems.toLocaleString('es-MX')}</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md shadow-lg p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-[#ec5b13] hover:bg-white/80 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#ec5b13]/10 flex items-center justify-center text-[#ec5b13]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 m-0">Productos</p>
              <p className="text-2xl font-black text-slate-900 m-0">{products.length}</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-6 rounded-2xl flex items-center gap-4 hover:bg-white/80 transition-all">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6 border-none" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 m-0">Agotados</p>
              <p className="text-2xl font-black text-slate-900 m-0">{outOfStockCount}</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-6 rounded-2xl flex items-center gap-4 hover:bg-white/80 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 m-0">Stock Bajo</p>
              <p className="text-2xl font-black text-slate-900 m-0">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-[450px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0">Ajustar Stock: {selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad a AJUSTAR (+ comprar, - vender)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Ej. 10 o -5"
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none text-lg shadow-sm"
                />
                <small className="block mt-1 text-xs text-slate-400">Usa números positivos para agregar stock, negativos para restar.</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Motivo</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ej. Venta local, Compra, Merma..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedProduct(null)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >Cancelar</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#ec5b13] hover:bg-[#ec5b13]/90 shadow-lg shadow-[#ec5b13]/30 cursor-pointer transition-all border-none"
                >
                  {submitting ? 'Guardando...' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
