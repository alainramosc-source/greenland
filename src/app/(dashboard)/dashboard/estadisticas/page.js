'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, DollarSign, Clock, AlertTriangle, Users, TrendingUp,
    Calendar, Filter, RefreshCw, ArrowUpRight, ArrowDownRight,
    BarChart3, MapPin, ShoppingCart, Box
} from 'lucide-react';

export default function EstadisticasPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [dateRange, setDateRange] = useState('month'); // today, week, month, year, all
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Raw data
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [orderItems, setOrderItems] = useState([]);

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        setIsAdmin(true);
        await fetchAllData();
    };

    const fetchAllData = async () => {
        setLoading(true);
        const [ordersRes, productsRes, profilesRes, itemsRes] = await Promise.all([
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
            supabase.from('products').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('order_items').select('*, products(name, sku)')
        ]);

        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
        setProfiles(profilesRes.data || []);
        setOrderItems(itemsRes.data || []);
        setLoading(false);
    };

    // Date filter logic
    const getDateRange = () => {
        const now = new Date();
        let from = null;
        let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (dateRange) {
            case 'today':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                from = new Date(now);
                from.setDate(now.getDate() - 7);
                break;
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                from = customFrom ? new Date(customFrom) : null;
                to = customTo ? new Date(customTo + 'T23:59:59') : to;
                break;
            default: // 'all'
                from = null;
                break;
        }
        return { from, to };
    };

    const filteredOrders = useMemo(() => {
        const { from, to } = getDateRange();
        return orders.filter(o => {
            const d = new Date(o.created_at);
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }, [orders, dateRange, customFrom, customTo]);

    // KPIs
    const kpis = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const nonCancelled = filteredOrders.filter(o => o.status !== 'cancelled');
        const totalRevenue = nonCancelled.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
        const lowStockProducts = products.filter(p => p.stock_quantity <= (p.stock_minimum || 10)).length;
        const activeDistributors = profiles.filter(p => p.role === 'distributor' && p.is_active).length;
        const avgTicket = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;

        return { totalOrders, totalRevenue, pendingOrders, lowStockProducts, activeDistributors, avgTicket };
    }, [filteredOrders, products, profiles]);

    // Status breakdown
    const statusBreakdown = useMemo(() => {
        const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        filteredOrders.forEach(o => { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });
        return counts;
    }, [filteredOrders]);

    // Orders by city
    const ordersByCity = useMemo(() => {
        const cityMap = {};
        filteredOrders.forEach(order => {
            const profile = profiles.find(p => p.id === order.distributor_id);
            const city = profile?.city || 'Sin ciudad';
            if (!cityMap[city]) cityMap[city] = { count: 0, revenue: 0 };
            cityMap[city].count++;
            if (order.status !== 'cancelled') {
                cityMap[city].revenue += parseFloat(order.total_amount) || 0;
            }
        });
        return Object.entries(cityMap)
            .map(([city, data]) => ({ city, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredOrders, profiles]);

    // Top distributors
    const topDistributors = useMemo(() => {
        const distMap = {};
        filteredOrders.forEach(order => {
            const id = order.distributor_id;
            if (!distMap[id]) distMap[id] = { count: 0, revenue: 0 };
            distMap[id].count++;
            if (order.status !== 'cancelled') {
                distMap[id].revenue += parseFloat(order.total_amount) || 0;
            }
        });
        return Object.entries(distMap)
            .map(([id, data]) => {
                const profile = profiles.find(p => p.id === id);
                return { name: profile?.full_name || 'Desconocido', city: profile?.city || '—', ...data };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredOrders, profiles]);

    // Top selling products
    const topProducts = useMemo(() => {
        const confirmedOrderIds = new Set(
            filteredOrders.filter(o => o.status !== 'cancelled' && o.status !== 'pending').map(o => o.id)
        );
        const prodMap = {};
        orderItems.forEach(item => {
            if (!confirmedOrderIds.has(item.order_id)) return;
            const pid = item.product_id;
            if (!prodMap[pid]) prodMap[pid] = { qty: 0, revenue: 0 };
            prodMap[pid].qty += item.quantity;
            prodMap[pid].revenue += parseFloat(item.subtotal) || (item.quantity * parseFloat(item.unit_price));
        });
        return Object.entries(prodMap)
            .map(([id, data]) => {
                const p = products.find(pr => pr.id === id);
                return { name: p?.name || 'Producto', sku: p?.sku || '—', ...data };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredOrders, orderItems, products]);

    // Critical inventory
    const criticalInventory = useMemo(() => {
        return products
            .filter(p => p.stock_quantity <= (p.stock_minimum || 10))
            .sort((a, b) => a.stock_quantity - b.stock_quantity)
            .slice(0, 10);
    }, [products]);

    const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    if (loading) return <div className="loading">Cargando estadísticas...</div>;
    if (!isAdmin) return null;

    const statusConfig = {
        pending: { label: 'Pendientes', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        processing: { label: 'En Proceso', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        shipped: { label: 'Enviados', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
        delivered: { label: 'Entregados', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        cancelled: { label: 'Cancelados', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    };

    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);

    return (
        <div className="min-h-screen w-full bg-white text-black rounded-2xl p-6 md:p-8 shadow flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Estadísticas</h1>
                    <p className="text-gray-500 mt-1">Panel de análisis y métricas del negocio</p>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-gray-50 border border-gray-200 rounded-full transition-colors font-medium shadow-sm"
                    onClick={fetchAllData}
                >
                    <RefreshCw size={18} /> Actualizar
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-gray-50/50 p-2 border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-3 px-3">
                    <Calendar size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Periodo</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {['today', 'week', 'month', 'year', 'all'].map(key => (
                        <button
                            key={key}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${dateRange === key
                                    ? 'bg-black text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            onClick={() => setDateRange(key)}
                        >
                            {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo' }[key]}
                        </button>
                    ))}
                    <button
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${dateRange === 'custom'
                                ? 'bg-black text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        onClick={() => setDateRange('custom')}
                    >
                        Personalizado
                    </button>
                </div>
                {dateRange === 'custom' && (
                    <div className="flex items-center gap-2 ml-auto w-full md:w-auto">
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-white border border-gray-200 text-black px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 flex-1" />
                        <span className="text-gray-400">—</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-white border border-gray-200 text-black px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 flex-1" />
                    </div>
                )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Package size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.totalOrders}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Total Pedidos</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><DollarSign size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{fmt(kpis.totalRevenue)}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Ingresos Totales</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center"><Clock size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.pendingOrders}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Pendientes</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.lowStockProducts}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Stock Bajo</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Users size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.activeDistributors}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Distribuidores</div>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><TrendingUp size={24} /></div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{fmt(kpis.avgTicket)}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Ticket Promedio</div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Status Breakdown */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-6 text-gray-900">
                        <BarChart3 size={20} className="text-gray-400" /> Desglose por Estado
                    </h3>
                    <div className="flex flex-col gap-5">
                        {Object.entries(statusBreakdown).map(([key, count]) => {
                            const cfg = statusConfig[key];
                            return (
                                <div key={key} className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 w-32 shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }}></div>
                                        <span className="text-sm font-medium text-gray-600">{cfg.label}</span>
                                    </div>
                                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0}%`,
                                                background: cfg.color
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold w-8 text-right text-gray-900">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Orders by City */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-6 text-gray-900">
                        <MapPin size={20} className="text-gray-400" /> Pedidos por Ciudad
                    </h3>
                    {ordersByCity.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium rounded-l-xl">Ciudad</th>
                                        <th className="px-4 py-3 font-medium text-right">Pedidos</th>
                                        <th className="px-4 py-3 font-medium text-right rounded-r-xl">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersByCity.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.city}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{row.count}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-400 py-8">Sin datos para este periodo</p>}
                </div>

                {/* Top Distributors */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-6 text-gray-900">
                        <Users size={20} className="text-gray-400" /> Top Distribuidores
                    </h3>
                    {topDistributors.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium rounded-l-xl whitespace-nowrap">Distribuidor</th>
                                        <th className="px-4 py-3 font-medium">Ciudad</th>
                                        <th className="px-4 py-3 font-medium text-right">Pedidos</th>
                                        <th className="px-4 py-3 font-medium text-right rounded-r-xl">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topDistributors.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{row.city}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{row.count}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-400 py-8">Sin datos para este periodo</p>}
                </div>

                {/* Top Products */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-6 text-gray-900">
                        <ShoppingCart size={20} className="text-gray-400" /> Productos Más Vendidos
                    </h3>
                    {topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium rounded-l-xl">Producto</th>
                                        <th className="px-4 py-3 font-medium">SKU</th>
                                        <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                                        <th className="px-4 py-3 font-medium text-right rounded-r-xl">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-[150px] truncate" title={row.name}>{row.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{row.sku}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{row.qty}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-400 py-8">Sin datos para este periodo</p>}
                </div>

                {/* Critical Inventory */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-6 text-gray-900">
                        <Box size={20} className="text-gray-400" /> Inventario Crítico
                    </h3>
                    {criticalInventory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium rounded-l-xl">Producto</th>
                                        <th className="px-4 py-3 font-medium">SKU</th>
                                        <th className="px-4 py-3 font-medium text-right">Stock</th>
                                        <th className="px-4 py-3 font-medium text-right">Mínimo</th>
                                        <th className="px-4 py-3 font-medium rounded-r-xl w-32">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {criticalInventory.map((p, i) => {
                                        const pct = p.stock_minimum ? (p.stock_quantity / p.stock_minimum) * 100 : 0;
                                        const color = pct <= 25 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#22c55e';
                                        return (
                                            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                                <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                                                <td className="px-4 py-3 text-right font-semibold" style={{ color }}>{p.stock_quantity}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">{p.stock_minimum || 10}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex bg-gray-100 h-2 rounded-full overflow-hidden w-full">
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
                                <Package size={32} />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">Inventario Saludable</h4>
                            <p className="text-gray-500 mt-1">Todos los productos tienen stock adecuado al momento.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
