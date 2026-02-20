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
        <div className="stats-theme-override">
            {/* Background Blobs for Glassmorphism Effect */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <div className="stats-page">
                <div className="page-header">
                    <div>
                        <h1>Analytics &amp; Estadísticas</h1>
                        <p>Panel de análisis interactivo y métricas clave</p>
                    </div>
                    <button className="btn btn-glass refresh-btn" onClick={fetchAllData}>
                        <RefreshCw size={18} /> Actualizar
                    </button>
                </div>

                {/* Date Filter */}
                <div className="filters-bar premium-glass">
                    <div className="filter-row">
                        <Calendar size={18} className="filter-icon" />
                        <span className="filter-label">Periodo:</span>
                        {['today', 'week', 'month', 'year', 'all'].map(key => (
                            <button
                                key={key}
                                className={`filter-chip ${dateRange === key ? 'active' : ''}`}
                                onClick={() => setDateRange(key)}
                            >
                                {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo' }[key]}
                            </button>
                        ))}
                        <button
                            className={`filter-chip ${dateRange === 'custom' ? 'active' : ''}`}
                            onClick={() => setDateRange('custom')}
                        >
                            Personalizado
                        </button>
                    </div>
                    {dateRange === 'custom' && (
                        <div className="custom-range animate-fade-in">
                            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="date-input" />
                            <span className="range-sep">—</span>
                            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="date-input" />
                        </div>
                    )}
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Total Pedidos</span>
                            <span className="kpi-value">{kpis.totalOrders}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <Package size={24} />
                        </div>
                    </div>
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Ingresos</span>
                            <span className="kpi-value">{fmt(kpis.totalRevenue)}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(34,197,94,0.1)', color: '#10b981' }}>
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Pendientes</span>
                            <span className="kpi-value">{kpis.pendingOrders}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Bajo Stock</span>
                            <span className="kpi-value">{kpis.lowStockProducts}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Distribuidores</span>
                            <span className="kpi-value">{kpis.activeDistributors}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="kpi-card premium-glass">
                        <div className="kpi-content">
                            <span className="kpi-label uppercase">Ticket Prom.</span>
                            <span className="kpi-value">{fmt(kpis.avgTicket)}</span>
                        </div>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                {/* Main Grid Section */}
                <div className="main-grid">
                    {/* Status Breakdown */}
                    <div className="section-card premium-glass text-dark">
                        <h3><BarChart3 size={20} className="text-primary" /> Distribución de Órdenes</h3>
                        <div className="status-bars">
                            {Object.entries(statusBreakdown).map(([key, count]) => {
                                const cfg = statusConfig[key];
                                return (
                                    <div key={key} className="status-bar-row">
                                        <div className="status-bar-label">
                                            <span className="status-dot" style={{ background: cfg.color }}></span>
                                            {cfg.label}
                                        </div>
                                        <div className="status-bar-track">
                                            <div
                                                className="status-bar-fill shadow-glow"
                                                style={{
                                                    width: `${(count / maxStatusCount) * 100}%`,
                                                    background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`
                                                }}
                                            />
                                        </div>
                                        <span className="status-bar-count" style={{ color: cfg.color }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orders by City */}
                    <div className="section-card premium-glass text-dark">
                        <h3><MapPin size={20} className="text-primary" /> Pedidos por Ciudad</h3>
                        {ordersByCity.length > 0 ? (
                            <div className="modern-table-wrap">
                                <table className="modern-table">
                                    <thead>
                                        <tr><th>Ciudad</th><th>Pedidos</th><th className="text-right">Ingresos</th></tr>
                                    </thead>
                                    <tbody>
                                        {ordersByCity.map((row, i) => (
                                            <tr key={i}>
                                                <td className="font-semibold text-slate-800">{row.city}</td>
                                                <td className="text-slate-500">{row.count}</td>
                                                <td className="text-right font-bold text-slate-900">{fmt(row.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="no-data">Sin datos para este periodo</p>}
                    </div>

                    {/* Top Distributors */}
                    <div className="section-card premium-glass text-dark">
                        <h3><Users size={20} className="text-primary" /> Top Distribuidores</h3>
                        {topDistributors.length > 0 ? (
                            <div className="modern-table-wrap">
                                <table className="modern-table">
                                    <thead>
                                        <tr><th>Distribuidor</th><th>Pedidos</th><th className="text-right">Volumen</th></tr>
                                    </thead>
                                    <tbody>
                                        {topDistributors.map((row, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="font-bold text-slate-800">{row.name}</div>
                                                    <div className="text-xs text-slate-400">{row.city}</div>
                                                </td>
                                                <td className="text-slate-500">{row.count}</td>
                                                <td className="text-right font-bold text-slate-900">{fmt(row.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="no-data">Sin datos para este periodo</p>}
                    </div>

                    {/* Top Products */}
                    <div className="section-card premium-glass text-dark">
                        <h3><ShoppingCart size={20} className="text-primary" /> Productos Estrella</h3>
                        {topProducts.length > 0 ? (
                            <div className="modern-table-wrap">
                                <table className="modern-table">
                                    <thead>
                                        <tr><th>Producto / SKU</th><th>Vendidos</th><th className="text-right">Ingresos</th></tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((row, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="font-bold text-slate-800">{row.name}</div>
                                                    <div className="text-xs text-slate-400">{row.sku}</div>
                                                </td>
                                                <td className="text-slate-500">{row.qty} unid.</td>
                                                <td className="text-right font-bold text-slate-900">{fmt(row.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="no-data">Sin datos para este periodo</p>}
                    </div>

                    {/* Critical Inventory */}
                    <div className="section-card premium-glass text-dark full-width">
                        <h3><Box size={20} className="text-rose-500" /> Inventario en Riesgo</h3>
                        {criticalInventory.length > 0 ? (
                            <div className="modern-table-wrap">
                                <table className="modern-table">
                                    <thead>
                                        <tr><th>Producto</th><th>Stock Actual</th><th>Mínimo</th><th>Estado de Salud</th></tr>
                                    </thead>
                                    <tbody>
                                        {criticalInventory.map((p, i) => {
                                            const pct = p.stock_minimum ? (p.stock_quantity / p.stock_minimum) * 100 : 0;
                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        <div className="font-bold text-slate-800">{p.name}</div>
                                                        <div className="text-xs text-slate-400">{p.sku}</div>
                                                    </td>
                                                    <td className="font-bold text-slate-900">{p.stock_quantity}</td>
                                                    <td className="text-slate-500">{p.stock_minimum || 10}</td>
                                                    <td className="w-48">
                                                        <div className="health-bar-wrap bg-slate-100">
                                                            <div className="health-bar" style={{
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
                                <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>✨</span>
                                <p className="text-slate-600 font-medium mt-4">Inventario saludable. No hay niveles críticos.</p>
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                /* OVERRIDE GLOBAL DARK BACKGROUND FOR THIS SECTION ONLY */
                .stats-theme-override {
                    position: relative;
                    min-height: calc(100vh - 64px);
                    background-color: #f8fafc; /* Very light slate background (casi blanco) */
                    color: #0f172a; /* Slate 900 text */
                    margin: -2rem; /* Negate the padding of dashboard-main */
                    padding: 2rem;
                    overflow: hidden;
                    font-family: 'Inter', sans-serif;
                }

                /* Animated Background Blobs for Glassmorphism */
                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    z-index: 0;
                    opacity: 0.5;
                    animation: float 20s infinite ease-in-out alternate;
                }
                .blob-1 {
                    top: -10%;
                    right: -5%;
                    width: 500px;
                    height: 500px;
                    background: rgba(221, 226, 75, 0.4); /* Primary color */
                }
                .blob-2 {
                    bottom: -15%;
                    left: -10%;
                    width: 600px;
                    height: 600px;
                    background: rgba(6, 182, 212, 0.2); /* Cyan accent */
                    animation-delay: -5s;
                }
                @keyframes float {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 50px) scale(1.1); }
                    100% { transform: translate(20px, -30px) scale(0.9); }
                }

                .stats-page {
                    position: relative;
                    z-index: 10;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2.5rem;
                }
                .page-header h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                    margin: 0;
                }
                .page-header p {
                    color: #64748b;
                    font-weight: 500;
                    margin-top: 0.35rem;
                }
                
                .btn-glass {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    color: #0f172a;
                    font-weight: 600;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s;
                    border-radius: 99px;
                }
                .btn-glass:hover {
                    background: rgba(255, 255, 255, 0.9);
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                }

                /* GLASSMORPHISM UTILITY DEFINITION */
                .premium-glass {
                    background: rgba(255, 255, 255, 0.65);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0,0,0,0.05) inset;
                    border-radius: 1.25rem;
                }

                /* Filters */
                .filters-bar {
                    padding: 1.25rem 1.5rem;
                    margin-bottom: 2rem;
                }
                .filter-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .filter-icon {
                    color: #64748b;
                }
                .filter-label {
                    color: #334155;
                    font-size: 0.875rem;
                    font-weight: 700;
                    margin-right: 0.5rem;
                }
                .filter-chip {
                    padding: 0.5rem 1.25rem;
                    border-radius: 99px;
                    border: 1px solid rgba(0,0,0,0.05);
                    background: rgba(255, 255, 255, 0.5);
                    color: #475569;
                    font-weight: 500;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .filter-chip:hover {
                    background: rgba(255, 255, 255, 0.9);
                    color: #0f172a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .filter-chip.active {
                    background: #0f172a;
                    border-color: #0f172a;
                    color: #ffffff;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
                }
                .custom-range {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-top: 1rem;
                }
                .date-input {
                    background: rgba(255,255,255,0.7);
                    border: 1px solid rgba(0,0,0,0.1);
                    color: #0f172a;
                    padding: 0.6rem 1rem;
                    border-radius: 0.75rem;
                    font-weight: 500;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .date-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
                }

                /* Spectacular KPI Grid */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }
                .kpi-card {
                    padding: 1.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .kpi-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
                    border-color: rgba(255, 255, 255, 1);
                    background: rgba(255, 255, 255, 0.85);
                }
                /* Specular highlight for glass */
                .kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
                    transform: skewX(-20deg);
                    animation: shine 6s infinite;
                }
                @keyframes shine {
                    0% { left: -100%; }
                    20% { left: 200%; }
                    100% { left: 200%; }
                }

                .kpi-content {
                    display: flex;
                    flex-direction: column;
                    z-index: 1;
                }
                .kpi-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }
                .kpi-value {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1;
                    letter-spacing: -0.025em;
                }
                .kpi-icon-wrap {
                    width: 56px;
                    height: 56px;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    z-index: 1;
                    box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);
                }

                /* Main Grid */
                .main-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                    padding-bottom: 4rem;
                }
                .section-card {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                }
                .full-width {
                    grid-column: 1 / -1;
                }
                .section-card h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: #0f172a;
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin: 0 0 1.5rem 0;
                    letter-spacing: -0.01em;
                }
                .text-primary { color: #848a1b; } /* Adjusted primary for dark contrast */

                /* Status Bars */
                .status-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    flex: 1;
                    justify-content: center;
                }
                .status-bar-row {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .status-bar-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    min-width: 130px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #475569;
                }
                .status-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    box-shadow: 0 0 8px currentColor;
                }
                .status-bar-track {
                    flex: 1;
                    height: 12px;
                    background: rgba(0,0,0,0.04);
                    border-radius: 99px;
                    overflow: hidden;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
                }
                .status-bar-fill {
                    height: 100%;
                    border-radius: 99px;
                    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                    min-width: 8px;
                }
                .status-bar-count {
                    font-weight: 800;
                    font-size: 1.1rem;
                    min-width: 36px;
                    text-align: right;
                }

                /* Modern Tables */
                .modern-table-wrap {
                    overflow-x: auto;
                    margin: -0.5rem;
                    padding: 0.5rem;
                }
                .modern-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 0.5rem;
                    font-size: 0.9rem;
                }
                .modern-table th {
                    text-align: left;
                    padding: 0.5rem 1rem;
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .modern-table td {
                    padding: 1rem;
                    background: rgba(255,255,255,0.4);
                    border-top: 1px solid rgba(255,255,255,0.6);
                    border-bottom: 1px solid rgba(0,0,0,0.02);
                }
                .modern-table tbody tr {
                    transition: transform 0.2s, background 0.2s;
                }
                .modern-table tbody tr:hover td {
                    background: rgba(255,255,255,0.8);
                }
                .modern-table td:first-child { border-top-left-radius: 0.75rem; border-bottom-left-radius: 0.75rem; }
                .modern-table td:last-child { border-top-right-radius: 0.75rem; border-bottom-right-radius: 0.75rem; }
                .text-right { text-align: right !important; }

                /* Health Bar */
                .health-bar-wrap {
                    width: 100%;
                    height: 10px;
                    border-radius: 99px;
                    overflow: hidden;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
                }
                .health-bar {
                    height: 100%;
                    border-radius: 99px;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .no-data {
                    color: #94a3b8;
                    text-align: center;
                    padding: 3rem 0;
                    font-size: 0.95rem;
                    font-weight: 500;
                }

                @media (max-width: 1024px) {
                    .main-grid { grid-template-columns: 1fr; }
                }
                @media (max-width: 768px) {
                    .stats-theme-override { margin: -1rem; padding: 1rem; }
                    .kpi-grid { grid-template-columns: 1fr; }
                    .page-header { flex-direction: column; gap: 1rem; }
                }
                `}</style>
            </div>
        </div>
    );
}
