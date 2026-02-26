'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatters';
import {
    Package, ShoppingCart, TrendingUp, DollarSign, Search, X, Minus,
    BarChart3, AlertCircle, ChevronDown, ChevronUp, History
} from 'lucide-react';

export default function MiInventarioPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSaleModal, setShowSaleModal] = useState(null); // product obj
    const [saleForm, setSaleForm] = useState({ quantity: 1, sale_price: '', client_name: '', notes: '' });
    const [savingSale, setSavingSale] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const [invRes, salesRes, prodRes] = await Promise.all([
            supabase.from('distributor_inventory')
                .select('*, products:product_id(id, name, sku, price)')
                .eq('distributor_id', user.id),
            supabase.from('distributor_sales')
                .select('*, products:product_id(name, sku)')
                .eq('distributor_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100),
            supabase.from('products')
                .select('id, name, sku, price')
                .eq('is_active', true)
        ]);

        setInventory(invRes.data || []);
        setSales(salesRes.data || []);
        setProducts(prodRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // KPIs
    const kpis = useMemo(() => {
        const totalStock = inventory.reduce((s, i) => s + (i.stock || 0), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthSales = sales.filter(s => new Date(s.created_at) >= monthStart);
        const monthUnits = monthSales.reduce((s, sl) => s + (sl.quantity || 0), 0);
        const monthRevenue = monthSales.reduce((s, sl) => s + ((sl.sale_price || 0) * (sl.quantity || 0)), 0);
        const monthCost = monthSales.reduce((s, sl) => s + ((sl.cost_price || 0) * (sl.quantity || 0)), 0);
        const marginPct = monthRevenue > 0 ? (((monthRevenue - monthCost) / monthRevenue) * 100).toFixed(1) : 0;
        return { totalStock, monthUnits, monthRevenue, marginPct };
    }, [inventory, sales]);

    // Filter inventory
    const filtered = inventory.filter(i => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return i.products?.name?.toLowerCase().includes(s) || i.products?.sku?.toLowerCase().includes(s);
    });

    // Register sale
    const handleSale = async (e) => {
        e.preventDefault();
        if (!showSaleModal) return;
        setSavingSale(true);

        const { data, error } = await supabase.rpc('record_distributor_sale', {
            p_product_id: showSaleModal.product_id,
            p_quantity: parseInt(saleForm.quantity),
            p_sale_price: parseFloat(saleForm.sale_price),
            p_client_name: saleForm.client_name || null,
            p_notes: saleForm.notes || null
        });

        if (error) {
            alert('Error: ' + error.message);
        } else if (data && !data.success) {
            alert(data.error || 'Error al registrar venta');
        } else {
            setShowSaleModal(null);
            setSaleForm({ quantity: 1, sale_price: '', client_name: '', notes: '' });
            await fetchData();
        }
        setSavingSale(false);
    };

    const saleMargin = useMemo(() => {
        if (!showSaleModal || !saleForm.sale_price) return null;
        const cost = showSaleModal.products?.price || 0;
        const sale = parseFloat(saleForm.sale_price) || 0;
        const qty = parseInt(saleForm.quantity) || 1;
        const profit = (sale - cost) * qty;
        const pct = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;
        return { profit, pct };
    }, [showSaleModal, saleForm]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
                <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Mi Inventario</h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">
                            Gestiona tu stock de productos GreenLand y registra tus ventas.
                        </p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><Package className="w-4 h-4" /></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Stock Total</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.totalStock} <span className="text-sm font-medium text-slate-400">uds</span></h3>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Vendidos (Mes)</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.monthUnits} <span className="text-sm font-medium text-slate-400">uds</span></h3>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign className="w-4 h-4" /></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Ingresos (Mes)</p>
                        <h3 className="text-2xl font-black text-green-600 m-0">{formatCurrency(kpis.monthRevenue)}</h3>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BarChart3 className="w-4 h-4" /></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Margen (Mes)</p>
                        <h3 className="text-2xl font-black text-purple-600 m-0">{kpis.marginPct}%</h3>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-[#6a9a04]" /> Mi Stock
                        </h4>
                        <span className="text-xs text-slate-400 font-bold">{filtered.length} productos</span>
                    </div>

                    {filtered.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Costo</th>
                                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(item => {
                                        const prod = item.products;
                                        return (
                                            <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <span className="font-bold text-sm text-slate-900">{prod?.name || 'Producto'}</span>
                                                </td>
                                                <td className="px-3 py-3 font-mono text-xs text-slate-400">{prod?.sku || '—'}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={`text-lg font-black ${item.stock <= 0 ? 'text-red-500' : item.stock <= 3 ? 'text-amber-500' : 'text-slate-900'}`}>
                                                        {item.stock}
                                                    </span>
                                                    {item.stock <= 3 && item.stock > 0 && (
                                                        <p className="text-[9px] text-amber-500 font-bold m-0">⚠ Bajo</p>
                                                    )}
                                                    {item.stock <= 0 && (
                                                        <p className="text-[9px] text-red-500 font-bold m-0">Sin stock</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right text-sm font-bold text-slate-500">
                                                    {formatCurrency(prod?.price || 0)}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setShowSaleModal(item);
                                                            setSaleForm({ quantity: 1, sale_price: '', client_name: '', notes: '' });
                                                        }}
                                                        disabled={item.stock <= 0}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#6a9a04] rounded-lg hover:bg-[#6a9a04]/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none shadow-sm transition-all"
                                                    >
                                                        + Venta
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-14 h-14 mx-auto bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                                <Package className="w-7 h-7 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-400 m-0">
                                {searchTerm ? 'No se encontraron productos' : 'Tu inventario está vacío'}
                            </p>
                            <p className="text-xs text-slate-400 m-0 mt-1">
                                Cuando recibas un pedido de GreenLand, tus productos aparecerán aquí automáticamente.
                            </p>
                        </div>
                    )}
                </div>

                {/* Sales History */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-white/30 transition-colors"
                    >
                        <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2 text-sm">
                            <History className="w-4 h-4 text-[#6a9a04]" /> Historial de Ventas
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sales.length}</span>
                        </h4>
                        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {showHistory && (
                        <div className="border-t border-slate-200">
                            {sales.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cant.</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Precio Venta</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Costo</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Margen</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sales.map(sale => {
                                                const profit = ((sale.sale_price || 0) - (sale.cost_price || 0)) * sale.quantity;
                                                const marginPct = sale.sale_price > 0 ? (((sale.sale_price - sale.cost_price) / sale.sale_price) * 100).toFixed(1) : 0;
                                                return (
                                                    <tr key={sale.id} className="hover:bg-white/50 transition-colors">
                                                        <td className="px-5 py-2.5 text-xs text-slate-500">
                                                            {new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-sm font-bold text-slate-900">{sale.products?.name || '—'}</td>
                                                        <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-700">{sale.quantity}</td>
                                                        <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900">{formatCurrency(sale.sale_price)}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs text-slate-400">{formatCurrency(sale.cost_price)}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                                                {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({marginPct}%)
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-500">{sale.client_name || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-slate-400">
                                    Aún no has registrado ventas. Usa el botón "+ Venta" en tu inventario.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sale Modal */}
            {showSaleModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white/95 backdrop-blur-xl w-full max-w-[450px] rounded-2xl shadow-2xl border border-white overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-[#6a9a04]" /> Registrar Venta
                            </h3>
                            <button onClick={() => setShowSaleModal(null)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSale} className="p-6 space-y-4">
                            {/* Product info */}
                            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-sm text-slate-900 m-0">{showSaleModal.products?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono m-0">{showSaleModal.products?.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 m-0">Stock</p>
                                    <p className="text-lg font-black text-slate-900 m-0">{showSaleModal.stock}</p>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad</label>
                                <input
                                    type="number" min="1" max={showSaleModal.stock} required
                                    value={saleForm.quantity}
                                    onChange={e => setSaleForm(f => ({ ...f, quantity: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 text-lg font-bold shadow-sm"
                                />
                            </div>

                            {/* Sale price */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Precio de Venta (unitario)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number" step="0.01" min="0" required
                                        value={saleForm.sale_price}
                                        onChange={e => setSaleForm(f => ({ ...f, sale_price: e.target.value }))}
                                        placeholder={`Costo: $${showSaleModal.products?.price || 0}`}
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 text-lg font-bold shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Margin preview */}
                            {saleMargin && (
                                <div className={`rounded-xl p-3 text-center ${saleMargin.profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <p className="text-[10px] font-bold text-slate-500 m-0 uppercase">Ganancia estimada</p>
                                    <p className={`text-xl font-black m-0 ${saleMargin.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {saleMargin.profit >= 0 ? '+' : ''}{formatCurrency(saleMargin.profit)}
                                        <span className="text-sm ml-1">({saleMargin.pct}%)</span>
                                    </p>
                                </div>
                            )}

                            {/* Client name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Cliente <span className="text-slate-400">(opcional)</span></label>
                                <input
                                    type="text"
                                    value={saleForm.client_name}
                                    onChange={e => setSaleForm(f => ({ ...f, client_name: e.target.value }))}
                                    placeholder="Nombre del cliente"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Notas <span className="text-slate-400">(opcional)</span></label>
                                <input
                                    type="text"
                                    value={saleForm.notes}
                                    onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Ej: pago en efectivo, entrega en domicilio..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowSaleModal(null)}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                >Cancelar</button>
                                <button type="submit" disabled={savingSale || !saleForm.sale_price || !saleForm.quantity}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {savingSale ? 'Registrando...' : 'Registrar Venta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
