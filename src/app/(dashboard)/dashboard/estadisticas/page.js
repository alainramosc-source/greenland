'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, DollarSign, Clock, AlertTriangle, Users, TrendingUp, TrendingDown,
    Calendar, RefreshCw, BarChart3, MapPin, ShoppingCart, Box, Download,
    Warehouse, Timer, CheckCircle, Truck, ArrowRight, Zap
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
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseStock, setWarehouseStock] = useState([]);

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
        const [ordersRes, productsRes, profilesRes, itemsRes, whRes, wsRes] = await Promise.all([
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
            supabase.from('products').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('order_items').select('*, products(name, sku)'),
            supabase.from('warehouses').select('*').eq('is_active', true),
            supabase.from('warehouse_stock').select('*')
        ]);
        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
        setProfiles(profilesRes.data || []);
        setOrderItems(itemsRes.data || []);
        setWarehouses(whRes.data || []);
        setWarehouseStock(wsRes.data || []);
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

    // --- KPIs ---
    const kpis = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const nonCancelled = filteredOrders.filter(o => !['cancelled', 'rejected'].includes(o.status));
        const totalRevenue = nonCancelled.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
        const activeDistributors = profiles.filter(p => p.role === 'distributor' && p.is_active).length;
        const avgTicket = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
        return { totalOrders, totalRevenue, pendingOrders, activeDistributors, avgTicket };
    }, [filteredOrders, profiles]);

    // --- Conversion Rate ---
    const conversionRate = useMemo(() => {
        const total = filteredOrders.length;
        if (total === 0) return { rate: 0, confirmed: 0, total: 0 };
        const confirmed = filteredOrders.filter(o => !['pending', 'cancelled', 'rejected'].includes(o.status)).length;
        return { rate: ((confirmed / total) * 100).toFixed(1), confirmed, total };
    }, [filteredOrders]);

    // --- Fulfillment Metrics ---
    const fulfillmentMetrics = useMemo(() => {
        const diffHours = (a, b) => {
            if (!a || !b) return null;
            return (new Date(b) - new Date(a)) / (1000 * 60 * 60);
        };

        const confirmTimes = [];
        const fulfillTimes = [];
        const leadTimes = [];

        filteredOrders.forEach(o => {
            if (o.confirmed_at) {
                const h = diffHours(o.created_at, o.confirmed_at);
                if (h !== null && h >= 0) confirmTimes.push(h);
            }
            if (o.confirmed_at && o.shipped_at) {
                const h = diffHours(o.confirmed_at, o.shipped_at);
                if (h !== null && h >= 0) fulfillTimes.push(h);
            }
            if (o.shipped_at) {
                const h = diffHours(o.created_at, o.shipped_at);
                if (h !== null && h >= 0) leadTimes.push(h);
            }
        });

        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const fmtTime = (hours) => {
            if (hours === null) return '—';
            if (hours < 1) return `${Math.round(hours * 60)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} días`;
        };

        return {
            avgConfirmTime: fmtTime(avg(confirmTimes)),
            avgFulfillTime: fmtTime(avg(fulfillTimes)),
            avgLeadTime: fmtTime(avg(leadTimes)),
            confirmCount: confirmTimes.length,
            fulfillCount: fulfillTimes.length,
            leadCount: leadTimes.length
        };
    }, [filteredOrders]);

    // --- Status Breakdown ---
    const statusBreakdown = useMemo(() => {
        const counts = { pending: 0, confirmed: 0, in_fulfillment: 0, shipped: 0, closed: 0, cancelled: 0, rejected: 0 };
        filteredOrders.forEach(o => { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });
        return counts;
    }, [filteredOrders]);

    // --- Top Products ---
    const topProducts = useMemo(() => {
        const confirmedOrderIds = new Set(
            filteredOrders.filter(o => !['cancelled', 'rejected', 'pending'].includes(o.status)).map(o => o.id)
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

    // --- Top Distributors ---
    const topDistributors = useMemo(() => {
        const distMap = {};
        filteredOrders.forEach(order => {
            const id = order.distributor_id;
            if (!distMap[id]) distMap[id] = { count: 0, revenue: 0 };
            distMap[id].count++;
            if (!['cancelled', 'rejected'].includes(order.status)) {
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

    // --- City Heatmap ---
    const cityHeatmap = useMemo(() => {
        const cityMap = {};
        filteredOrders.forEach(order => {
            const profile = profiles.find(p => p.id === order.distributor_id);
            const city = profile?.city || 'Sin ciudad';
            if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0, distributors: new Set() };
            cityMap[city].orders++;
            cityMap[city].distributors.add(order.distributor_id);
            if (!['cancelled', 'rejected'].includes(order.status)) {
                cityMap[city].revenue += parseFloat(order.total_amount) || 0;
            }
        });
        return Object.entries(cityMap)
            .map(([city, data]) => ({
                city,
                orders: data.orders,
                revenue: data.revenue,
                distributors: data.distributors.size,
                avgTicket: data.orders > 0 ? data.revenue / data.orders : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders, profiles]);
    const maxCityRevenue = Math.max(...cityHeatmap.map(c => c.revenue), 1);

    // --- Warehouse Sales ---
    const warehouseSales = useMemo(() => {
        const whMap = {};
        warehouses.forEach(wh => {
            whMap[wh.id] = { name: wh.name, items: 0, revenue: 0, totalStock: 0 };
        });

        // Count stock per warehouse
        warehouseStock.forEach(ws => {
            if (whMap[ws.warehouse_id]) {
                whMap[ws.warehouse_id].totalStock += (ws.stock_quantity || 0);
            }
        });

        // Count dispatched items by warehouse
        const confirmedOrderIds = new Set(
            filteredOrders.filter(o => !['cancelled', 'rejected', 'pending'].includes(o.status)).map(o => o.id)
        );
        orderItems.forEach(item => {
            if (!confirmedOrderIds.has(item.order_id) || !item.warehouse_id) return;
            if (whMap[item.warehouse_id]) {
                whMap[item.warehouse_id].items += item.quantity;
                whMap[item.warehouse_id].revenue += parseFloat(item.subtotal) || (item.quantity * parseFloat(item.unit_price));
            }
        });

        return Object.values(whMap);
    }, [warehouses, warehouseStock, filteredOrders, orderItems]);

    // --- Monthly Revenue Chart ---
    const monthlyRevenue = useMemo(() => {
        const rev = new Array(12).fill(0);
        orders.filter(o => !['cancelled', 'rejected'].includes(o.status)).forEach(o => {
            const d = new Date(o.created_at);
            if (d.getFullYear() === new Date().getFullYear()) {
                rev[d.getMonth()] += parseFloat(o.total_amount) || 0;
            }
        });
        return rev;
    }, [orders]);
    const maxMonthly = Math.max(...monthlyRevenue, 1);

    // --- Export ---
    const handleExport = () => {
        let csv = 'Reporte Greenland - Estadísticas\n\n';
        csv += 'KPIs\n';
        csv += `Total Pedidos,${kpis.totalOrders}\n`;
        csv += `Ingresos,${kpis.totalRevenue}\n`;
        csv += `Ticket Promedio,${kpis.avgTicket.toFixed(2)}\n`;
        csv += `Tasa Conversión,${conversionRate.rate}%\n\n`;

        csv += 'Métricas de Surtimiento\n';
        csv += `Tiempo Confirmación,${fulfillmentMetrics.avgConfirmTime}\n`;
        csv += `Tiempo Surtido,${fulfillmentMetrics.avgFulfillTime}\n`;
        csv += `Lead Time Total,${fulfillmentMetrics.avgLeadTime}\n\n`;

        csv += 'Top Productos\nProducto,SKU,Vendidos,Ingresos\n';
        topProducts.forEach(p => { csv += `${p.name},${p.sku},${p.qty},${p.revenue.toFixed(2)}\n`; });

        csv += '\nVentas por Ciudad\nCiudad,Pedidos,Ingresos,Distribuidores\n';
        cityHeatmap.forEach(c => { csv += `${c.city},${c.orders},${c.revenue.toFixed(2)},${c.distributors}\n`; });

        csv += '\nTop Distribuidores\nNombre,Ciudad,Pedidos,Ingresos\n';
        topDistributors.forEach(d => { csv += `${d.name},${d.city},${d.count},${d.revenue.toFixed(2)}\n`; });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_greenland_${dateRange}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-slate-500"><div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" /></div>;
    if (!isAdmin) return null;

    const statusConfig = {
        pending: { label: 'Pendientes', color: '#f59e0b' },
        confirmed: { label: 'Confirmados', color: '#3b82f6' },
        in_fulfillment: { label: 'En Surtido', color: '#8b5cf6' },
        shipped: { label: 'Enviados', color: '#10b981' },
        closed: { label: 'Cerrados', color: '#6b7280' },
        cancelled: { label: 'Cancelados', color: '#ef4444' },
        rejected: { label: 'Rechazados', color: '#f97316' },
    };
    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 m-0">Centro de Inteligencia GreenLand</h2>
                        <p className="text-slate-500 mt-1 font-medium m-0">KPIs, eficiencia operativa y análisis geográfico en tiempo real</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Exportar Reporte
                        </button>
                        <button
                            onClick={fetchAllData}
                            className="bg-[#6a9a04] text-white flex items-center gap-2 px-5 py-2 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:scale-[1.02] transition-transform cursor-pointer border-none"
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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Total Pedidos</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.totalOrders}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><DollarSign className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ingresos</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.totalRevenue)}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><TrendingUp className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ticket Prom.</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.avgTicket)}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Distribuidores</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.activeDistributors}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`p-2 rounded-lg ${parseFloat(conversionRate.rate) >= 70 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                <Zap className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Conversión</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{conversionRate.rate}%</h3>
                        <p className="text-[10px] text-slate-400 m-0">{conversionRate.confirmed}/{conversionRate.total} pedidos</p>
                    </div>
                </div>

                {/* Fulfillment Metrics */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-8">
                    <h4 className="text-lg font-bold text-slate-900 m-0 mb-5 flex items-center gap-2">
                        <Timer className="w-5 h-5 text-[#6a9a04]" /> Eficiencia de Surtimiento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Confirm Time */}
                        <div className="flex items-center gap-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CheckCircle className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider m-0">Confirmación</p>
                                <p className="text-xs text-slate-500 m-0">Pedido → Confirmado</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgConfirmTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.confirmCount} pedidos medidos</p>
                            </div>
                        </div>
                        {/* Fulfill Time */}
                        <div className="flex items-center gap-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Package className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider m-0">Surtido</p>
                                <p className="text-xs text-slate-500 m-0">Confirmado → Enviado</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgFulfillTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.fulfillCount} pedidos medidos</p>
                            </div>
                        </div>
                        {/* Lead time */}
                        <div className="flex items-center gap-4 bg-green-50/50 rounded-xl p-4 border border-green-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Truck className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider m-0">Lead Time Total</p>
                                <p className="text-xs text-slate-500 m-0">Pedido → Entrega a paquetería</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgLeadTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.leadCount} pedidos medidos</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Bar Chart: Monthly Revenue */}
                    <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-8 rounded-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h4 className="text-lg font-bold text-slate-900 m-0">Ventas Mensuales</h4>
                            <span className="flex items-center gap-1 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#6a9a04]" /> {new Date().getFullYear()}</span>
                        </div>
                        <div className="flex items-end justify-between h-48 gap-2">
                            {monthlyRevenue.map((rev, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="w-full relative" style={{ height: `${Math.max((rev / maxMonthly) * 100, 4)}%` }}>
                                        <div className="absolute bottom-0 w-full bg-[#6a9a04] rounded-t-lg transition-all group-hover:brightness-110 h-full" />
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                                            {fmt(rev)}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold ${i === new Date().getMonth() ? 'text-[#6a9a04]' : 'text-slate-400'}`}>{monthNames[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-6 rounded-2xl flex flex-col">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 m-0">Estado de Pedidos</h4>
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                            {Object.entries(statusBreakdown).filter(([, c]) => c > 0).map(([key, count]) => {
                                const cfg = statusConfig[key];
                                if (!cfg) return null;
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 min-w-[100px]">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                                            <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
                                        </div>
                                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{
                                                width: `${(count / maxStatusCount) * 100}%`,
                                                background: cfg.color,
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

                {/* City Heatmap + Warehouse Sales */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
                    {/* City Heatmap */}
                    <div className="lg:col-span-3 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#6a9a04]" />
                            <h4 className="font-bold text-slate-900 m-0">Mapa de Calor por Ciudad</h4>
                        </div>
                        {cityHeatmap.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3">Ciudad</th>
                                            <th className="px-3 py-3 text-center">Pedidos</th>
                                            <th className="px-3 py-3 text-center">Dist.</th>
                                            <th className="px-3 py-3">Ingresos</th>
                                            <th className="px-3 py-3 text-right">Ticket</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cityHeatmap.map((row, i) => {
                                            const intensity = row.revenue / maxCityRevenue;
                                            const hue = intensity > 0.7 ? '106, 154, 4' : intensity > 0.3 ? '245, 158, 11' : '239, 68, 68';
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-8 rounded-full" style={{
                                                                background: `rgba(${hue}, ${0.3 + intensity * 0.7})`,
                                                                boxShadow: `0 0 8px rgba(${hue}, ${intensity * 0.4})`
                                                            }} />
                                                            <span className="font-bold text-sm text-slate-900">{row.city}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.orders}</td>
                                                    <td className="px-3 py-3 text-center text-sm text-slate-500">{row.distributors}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                                <div className="h-full rounded-full transition-all duration-700" style={{
                                                                    width: `${intensity * 100}%`,
                                                                    background: `rgba(${hue}, 0.85)`
                                                                }} />
                                                            </div>
                                                            <span className="font-bold text-xs text-slate-700">{fmt(row.revenue)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-xs font-bold text-slate-500">{fmt(row.avgTicket)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-slate-400 text-sm">Sin datos para este periodo</div>
                        )}
                    </div>

                    {/* Warehouse Sales */}
                    <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                            <Warehouse className="w-5 h-5 text-[#6a9a04]" />
                            <h4 className="font-bold text-slate-900 m-0">Despacho por Bodega</h4>
                        </div>
                        <div className="p-6 space-y-5">
                            {warehouseSales.map((wh, i) => (
                                <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-sm text-slate-900">{wh.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                            {wh.totalStock} en stock
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Items despachados</p>
                                            <p className="text-lg font-black text-slate-900 m-0">{wh.items}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ingresos</p>
                                            <p className="text-lg font-black text-[#6a9a04] m-0">{fmt(wh.revenue)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {warehouseSales.length === 0 && (
                                <p className="text-center text-slate-400 text-sm py-4">Sin bodegas configuradas</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Products + Top Distributors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-200">
                            <h4 className="font-bold text-slate-900 m-0">🏆 Productos Estrella</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Producto</th>
                                        <th className="px-3 py-3 text-center">Vendidos</th>
                                        <th className="px-3 py-3 text-right">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topProducts.length > 0 ? topProducts.map((row, i) => (
                                        <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.qty}</td>
                                            <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-200">
                            <h4 className="font-bold text-slate-900 m-0">👥 Top Distribuidores</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Distribuidor</th>
                                        <th className="px-3 py-3 text-center">Pedidos</th>
                                        <th className="px-3 py-3 text-right">Volumen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topDistributors.length > 0 ? topDistributors.map((row, i) => (
                                        <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                                <div className="text-[10px] text-slate-400">{row.city}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.count}</td>
                                            <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
