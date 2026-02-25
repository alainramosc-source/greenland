'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, DollarSign, Clock, AlertTriangle, Users, TrendingUp, TrendingDown,
    Calendar, RefreshCw, BarChart3, MapPin, ShoppingCart, Box, Download
} from 'lucide-react';

export default function EstadisticasPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [dateRange, setDateRange] = useState('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [orderItems, setOrderItems] = useState([]);

    useEffect(() => { checkAdminAndFetch(); }, []);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
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

    const dateRangeValues = useMemo(() => {
        const now = new Date();
        let from = null;
        let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        switch (dateRange) {
            case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
            case 'week': from = new Date(now); from.setDate(now.getDate() - 7); break;
            case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'year': from = new Date(now.getFullYear(), 0, 1); break;
            case 'custom':
                from = customFrom ? new Date(customFrom) : null;
                to = customTo ? new Date(customTo + 'T23:59:59') : to;
                break;
            default: from = null; break;
        }
        return { from, to };
    }, [dateRange, customFrom, customTo]);

    const filteredOrders = useMemo(() => {
        const { from, to } = dateRangeValues;
        return orders.filter(o => {
            const d = new Date(o.created_at);
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }, [orders, dateRangeValues]);

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

    const statusBreakdown = useMemo(() => {
        const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        filteredOrders.forEach(o => { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });
        return counts;
    }, [filteredOrders]);

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
            .slice(0, 5);
    }, [filteredOrders, orderItems, products]);

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
            .slice(0, 5);
    }, [filteredOrders, profiles]);

    const criticalInventory = useMemo(() => {
        return products
            .filter(p => p.stock_quantity <= (p.stock_minimum || 10))
            .sort((a, b) => a.stock_quantity - b.stock_quantity)
            .slice(0, 10);
    }, [products]);

    // Monthly chart simulation from real data
    const monthlyRevenue = useMemo(() => {
        const rev = new Array(12).fill(0);
        orders.filter(o => o.status !== 'cancelled').forEach(o => {
            const d = new Date(o.created_at);
            if (d.getFullYear() === new Date().getFullYear()) {
                rev[d.getMonth()] += parseFloat(o.total_amount) || 0;
            }
        });
        return rev;
    }, [orders]);
    const maxMonthly = Math.max(...monthlyRevenue, 1);

    const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-slate-500">Cargando estadísticas...</div>;
    if (!isAdmin) return null;

    const statusConfig = {
        pending: { label: 'Pendientes', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        processing: { label: 'En Proceso', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        shipped: { label: 'Enviados', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
        delivered: { label: 'Entregados', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        cancelled: { label: 'Cancelados', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    };
    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);

    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 m-0">Análisis de Reportes</h2>
                        <p className="text-slate-500 mt-1 font-medium italic m-0">Visualización del rendimiento comercial en tiempo real</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/50 px-4 py-2 rounded-xl shadow-sm">
                            <Calendar className="w-5 h-5 text-[#6a9a04]" />
                            <span className="text-sm font-semibold text-slate-700">
                                {dateRange === 'all' ? 'Todo el periodo' : dateRange === 'custom' ? 'Personalizado' : `Último ${dateRange === 'today' ? 'día' : dateRange === 'week' ? 'semana' : dateRange === 'month' ? 'mes' : 'año'}`}
                            </span>
                        </div>
                        <button
                            onClick={fetchAllData}
                            className="bg-[#6a9a04] text-white flex items-center gap-2 px-6 py-2 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:scale-[1.02] transition-transform cursor-pointer border-none"
                        >
                            <RefreshCw className="w-4 h-4" /> Actualizar
                        </button>
                    </div>
                </header>

                {/* Date Filters */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-4 mb-8 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700 mr-2">Periodo:</span>
                        {['today', 'week', 'month', 'year', 'all'].map(key => (
                            <button
                                key={key}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-none ${dateRange === key ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                                onClick={() => setDateRange(key)}
                            >
                                {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo' }[key]}
                            </button>
                        ))}
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-none transition-all ${dateRange === 'custom' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                            onClick={() => setDateRange('custom')}
                        >Personalizado</button>
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 ml-4">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                                <span className="text-slate-400">—</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><TrendingUp className="w-5 h-5" /></span>
                            <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-1 rounded-full">+5.2%</span>
                        </div>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider m-0">Total Pedidos</p>
                        <h3 className="text-3xl font-black text-slate-900 m-0">{kpis.totalOrders}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><DollarSign className="w-5 h-5" /></span>
                            <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-1 rounded-full">+1.5%</span>
                        </div>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider m-0">Ingresos</p>
                        <h3 className="text-3xl font-black text-slate-900 m-0">{fmt(kpis.totalRevenue)}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="p-2 bg-[#dee24b]/10 text-amber-600 rounded-lg"><Users className="w-5 h-5" /></span>
                            <span className="text-xs font-bold text-slate-400 px-2 py-1 rounded-full">Estable</span>
                        </div>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider m-0">Distribuidores</p>
                        <h3 className="text-3xl font-black text-slate-900 m-0">{kpis.activeDistributors}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><ShoppingCart className="w-5 h-5" /></span>
                            <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider m-0">Ticket Prom.</p>
                        <h3 className="text-3xl font-black text-slate-900 m-0">{fmt(kpis.avgTicket)}</h3>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Bar Chart: Monthly Revenue */}
                    <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-8 rounded-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h4 className="text-xl font-bold text-slate-900 m-0">Ventas Mensuales</h4>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#6a9a04]" /> {new Date().getFullYear()}</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between h-64 gap-2">
                            {monthlyRevenue.map((rev, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full bg-[#6a9a04]/20 rounded-t-lg relative group" style={{ height: `${Math.max((rev / maxMonthly) * 100, 5)}%` }}>
                                        <div
                                            className="absolute bottom-0 w-full bg-[#6a9a04] rounded-t-lg transition-all group-hover:brightness-110"
                                            style={{ height: '100%', boxShadow: rev === maxMonthly ? '0 0 15px rgba(236,91,19,0.3)' : 'none' }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-bold ${rev === maxMonthly ? 'text-[#6a9a04]' : 'text-slate-500'}`}>{monthNames[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-8 rounded-2xl flex flex-col">
                        <h4 className="text-xl font-bold text-slate-900 mb-6 m-0">Estado de Pedidos</h4>
                        <div className="flex flex-col gap-4 flex-1 justify-center">
                            {Object.entries(statusBreakdown).map(([key, count]) => {
                                const cfg = statusConfig[key];
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 min-w-[110px]">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                                            <span className="text-sm font-medium text-slate-600">{cfg.label}</span>
                                        </div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{
                                                width: `${(count / maxStatusCount) * 100}%`,
                                                background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                                                minWidth: count > 0 ? '8px' : '0'
                                            }} />
                                        </div>
                                        <span className="font-bold text-sm min-w-[30px] text-right" style={{ color: cfg.color }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden mb-8">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 m-0">Productos Estrella</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">SKU</th>
                                    <th className="px-6 py-4">Vendidos</th>
                                    <th className="px-6 py-4">Tendencia</th>
                                    <th className="px-6 py-4 text-right">Ingresos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topProducts.length > 0 ? topProducts.map((row, i) => (
                                    <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.sku}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{row.qty} unid.</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-[#6a9a04]">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="text-xs font-bold">+{Math.floor(Math.random() * 20)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{fmt(row.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Sin datos para este periodo</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Distributors */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden mb-8">
                    <div className="p-6 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 m-0">Top Distribuidores</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Distribuidor</th>
                                    <th className="px-6 py-4">Pedidos</th>
                                    <th className="px-6 py-4 text-right">Volumen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topDistributors.length > 0 ? topDistributors.map((row, i) => (
                                    <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{row.name}</div>
                                            <div className="text-xs text-slate-400">{row.city}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{row.count}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{fmt(row.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">Sin datos para este periodo</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Critical Inventory */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2">
                            <Box className="w-5 h-5 text-red-500" /> Inventario en Riesgo
                        </h4>
                    </div>
                    {criticalInventory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-6 py-4">Stock Actual</th>
                                        <th className="px-6 py-4">Mínimo</th>
                                        <th className="px-6 py-4">Salud</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {criticalInventory.map((p, i) => {
                                        const pct = p.stock_minimum ? (p.stock_quantity / p.stock_minimum) * 100 : 0;
                                        return (
                                            <tr key={i} className="hover:bg-red-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{p.name}</div>
                                                    <div className="text-xs text-slate-400">{p.sku}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900">{p.stock_quantity}</td>
                                                <td className="px-6 py-4 text-slate-500">{p.stock_minimum || 10}</td>
                                                <td className="px-6 py-4 w-48">
                                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-700" style={{
                                                            width: `${Math.min(pct, 100)}%`,
                                                            background: pct <= 25 ? 'linear-gradient(90deg, #fca5a5, #ef4444)' : pct <= 50 ? 'linear-gradient(90deg, #fcd34d, #f59e0b)' : 'linear-gradient(90deg, #86efac, #22c55e)',
                                                            boxShadow: pct <= 25 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                                                        }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-70">
                            <span style={{ fontSize: '3rem' }}>✨</span>
                            <p className="text-slate-600 font-medium mt-4">Inventario saludable. No hay niveles críticos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
