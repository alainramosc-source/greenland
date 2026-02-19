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
        <div className="stats-page">
            <div className="page-header">
                <div>
                    <h1>📊 Estadísticas</h1>
                    <p>Panel de análisis y métricas del negocio</p>
                </div>
                <button className="btn btn-glass refresh-btn" onClick={fetchAllData}>
                    <RefreshCw size={18} /> Actualizar
                </button>
            </div>

            {/* Date Filter */}
            <div className="filters-bar glass-panel">
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
                    <div className="custom-range">
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="date-input" />
                        <span className="range-sep">—</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="date-input" />
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Package size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{kpis.totalOrders}</span>
                        <span className="kpi-label">Total Pedidos</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}><DollarSign size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{fmt(kpis.totalRevenue)}</span>
                        <span className="kpi-label">Ingresos Totales</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}><Clock size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{kpis.pendingOrders}</span>
                        <span className="kpi-label">Pendientes</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}><AlertTriangle size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{kpis.lowStockProducts}</span>
                        <span className="kpi-label">Stock Bajo</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}><Users size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{kpis.activeDistributors}</span>
                        <span className="kpi-label">Distribuidores Activos</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee' }}><TrendingUp size={24} /></div>
                    <div className="kpi-data">
                        <span className="kpi-value">{fmt(kpis.avgTicket)}</span>
                        <span className="kpi-label">Ticket Promedio</span>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="main-grid">
                {/* Status Breakdown */}
                <div className="section-card glass-panel">
                    <h3><BarChart3 size={20} /> Desglose por Estado</h3>
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
                                            className="status-bar-fill"
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
                <div className="section-card glass-panel">
                    <h3><MapPin size={20} /> Pedidos por Ciudad</h3>
                    {ordersByCity.length > 0 ? (
                        <div className="mini-table-wrap">
                            <table className="mini-table">
                                <thead>
                                    <tr><th>Ciudad</th><th>Pedidos</th><th>Ingresos</th></tr>
                                </thead>
                                <tbody>
                                    {ordersByCity.map((row, i) => (
                                        <tr key={i}>
                                            <td className="city-cell">{row.city}</td>
                                            <td className="num-cell">{row.count}</td>
                                            <td className="num-cell revenue">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="no-data">Sin datos para este periodo</p>}
                </div>

                {/* Top Distributors */}
                <div className="section-card glass-panel">
                    <h3><Users size={20} /> Top Distribuidores</h3>
                    {topDistributors.length > 0 ? (
                        <div className="mini-table-wrap">
                            <table className="mini-table">
                                <thead>
                                    <tr><th>Distribuidor</th><th>Ciudad</th><th>Pedidos</th><th>Ingresos</th></tr>
                                </thead>
                                <tbody>
                                    {topDistributors.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.name}</td>
                                            <td className="muted">{row.city}</td>
                                            <td className="num-cell">{row.count}</td>
                                            <td className="num-cell revenue">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="no-data">Sin datos para este periodo</p>}
                </div>

                {/* Top Products */}
                <div className="section-card glass-panel">
                    <h3><ShoppingCart size={20} /> Productos Más Vendidos</h3>
                    {topProducts.length > 0 ? (
                        <div className="mini-table-wrap">
                            <table className="mini-table">
                                <thead>
                                    <tr><th>Producto</th><th>SKU</th><th>Cantidad</th><th>Revenue</th></tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.name}</td>
                                            <td className="muted">{row.sku}</td>
                                            <td className="num-cell">{row.qty}</td>
                                            <td className="num-cell revenue">{fmt(row.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="no-data">Sin datos para este periodo</p>}
                </div>

                {/* Critical Inventory */}
                <div className="section-card glass-panel full-width">
                    <h3><AlertTriangle size={20} /> Inventario Crítico</h3>
                    {criticalInventory.length > 0 ? (
                        <div className="mini-table-wrap">
                            <table className="mini-table">
                                <thead>
                                    <tr><th>Producto</th><th>SKU</th><th>Stock Actual</th><th>Mínimo</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                    {criticalInventory.map((p, i) => {
                                        const pct = p.stock_minimum ? (p.stock_quantity / p.stock_minimum) * 100 : 0;
                                        return (
                                            <tr key={i}>
                                                <td>{p.name}</td>
                                                <td className="muted">{p.sku}</td>
                                                <td className="num-cell">{p.stock_quantity}</td>
                                                <td className="num-cell">{p.stock_minimum || 10}</td>
                                                <td>
                                                    <div className="stock-bar-wrap">
                                                        <div className="stock-bar" style={{
                                                            width: `${Math.min(pct, 100)}%`,
                                                            background: pct <= 25 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#22c55e'
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
                        <div className="no-critical">
                            <span style={{ fontSize: '2rem' }}>✅</span>
                            <p>Todos los productos tienen stock adecuado</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .stats-page {
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .page-header h1 {
          font-size: 2rem;
          color: var(--color-text-main);
          margin: 0;
        }
        .page-header p {
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
        }

        /* Filters */
        .filters-bar {
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          background: white;
          border: 1px solid var(--color-border);
        }
        .filter-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .filter-icon {
          color: var(--color-text-muted);
        }
        .filter-label {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .filter-chip {
          padding: 0.4rem 1rem;
          border-radius: 99px;
          border: 1px solid var(--color-border);
          background: white;
          color: var(--color-text-muted);
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip:hover {
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
          background: var(--color-bg-alt);
        }
        .filter-chip.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #064E3B;
          font-weight: 600;
        }
        .custom-range {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .date-input {
          background: white;
          border: 1px solid var(--color-border);
          color: var(--color-text-main);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
        }
        .date-input:focus {
          border-color: var(--color-primary);
          outline: none;
        }
        .range-sep {
          color: var(--color-text-muted);
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .kpi-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: transform 0.2s, box-shadow 0.2s;
          background: white;
          border: 1px solid var(--color-border);
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.1);
          border-color: var(--color-primary);
        }
        .kpi-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kpi-data {
          display: flex;
          flex-direction: column;
        }
        .kpi-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          line-height: 1.2;
        }
        .kpi-label {
          font-size: 0.78rem;
          color: var(--color-text-muted);
          margin-top: 0.15rem;
        }

        /* Main Grid */
        .main-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .section-card {
          padding: 1.5rem;
          background: white;
          border: 1px solid var(--color-border);
        }
        .section-card.full-width {
          grid-column: 1 / -1;
        }
        .section-card h3 {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--color-text-main);
          font-size: 1.05rem;
          margin: 0 0 1.25rem 0;
        }

        /* Status Bars */
        .status-bars {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .status-bar-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .status-bar-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 120px;
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-bar-track {
          flex: 1;
          height: 10px;
          background: var(--color-bg-alt);
          border-radius: 99px;
          overflow: hidden;
        }
        .status-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.5s ease;
          min-width: 4px;
        }
        .status-bar-count {
          font-weight: 700;
          font-size: 0.95rem;
          min-width: 30px;
          text-align: right;
        }

        /* Mini Tables */
        .mini-table-wrap {
          overflow-x: auto;
        }
        .mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .mini-table th {
          text-align: left;
          padding: 0.6rem 0.75rem;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-alt);
        }
        .mini-table td {
          padding: 0.6rem 0.75rem;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-bg-alt);
        }
        .mini-table tbody tr:hover {
          background: var(--color-bg-surface);
        }
        .num-cell {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .num-cell.revenue {
          color: var(--color-primary-dark);
          font-weight: 600;
        }
        .city-cell {
          color: var(--color-text-main);
          font-weight: 500;
        }
        .muted {
          color: var(--color-text-muted);
          font-size: 0.8rem;
        }

        /* Stock Bar */
        .stock-bar-wrap {
          width: 80px;
          height: 8px;
          background: var(--color-bg-alt);
          border-radius: 99px;
          overflow: hidden;
        }
        .stock-bar {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s;
        }

        .no-data {
          color: var(--color-text-muted);
          text-align: center;
          padding: 2rem;
          font-size: 0.9rem;
        }
        .no-critical {
          text-align: center;
          padding: 2rem;
          color: var(--color-text-muted);
        }

        .loading {
          text-align: center;
          padding: 4rem;
          color: var(--color-text-muted);
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .page-header {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
        </div>
    );
}
