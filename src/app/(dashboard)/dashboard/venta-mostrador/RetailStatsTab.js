'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  TrendingUp, Package, DollarSign, ShoppingCart, Calendar, Filter,
  Award, Users, CreditCard, Loader2, BarChart3
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const COLORS = ['#6a9a04', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
const PAYMENT_COLORS = { Efectivo: '#10b981', Transferencia: '#3b82f6', efectivo: '#10b981', transferencia: '#3b82f6' };

export default function RetailStatsTab() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // today, week, month, year, all
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => { fetchSales(); }, [dateRange, customFrom, customTo]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
      case 'month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.toISOString(); }
      case 'year': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString(); }
      case 'custom': return customFrom ? new Date(customFrom).toISOString() : null;
      default: return null;
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase.from('counter_sales').select('*').eq('status', 'completed').order('created_at', { ascending: false });
    const fromDate = getDateFilter();
    if (fromDate) query = query.gte('created_at', fromDate);
    if (dateRange === 'custom' && customTo) query = query.lte('created_at', new Date(customTo + 'T23:59:59').toISOString());
    const { data } = await query;
    setSales(data || []);
    setLoading(false);
  };

  // ── Computed Stats ──
  const stats = useMemo(() => {
    if (!sales.length) return null;

    const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total || 0), 0);
    const totalTickets = sales.length;
    const avgTicket = totalRevenue / totalTickets;

    // Products aggregation
    const productMap = {};
    sales.forEach(sale => {
      const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
      items.forEach(item => {
        const key = item.name || item.sku;
        if (!productMap[key]) productMap[key] = { name: item.name, sku: item.sku, quantity: 0, revenue: 0 };
        productMap[key].quantity += Number(item.quantity || 0);
        productMap[key].revenue += Number(item.subtotal || item.quantity * item.unit_price || 0);
      });
    });
    const products = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
    const truncName = (n) => {
      if (n.length <= 28) return n;
      return n.slice(0, 12) + '…' + n.slice(-14);
    };
    const topByQty = products.slice(0, 10).map(p => ({ ...p, shortName: truncName(p.name) }));
    const topByRevenue = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(p => ({ ...p, shortName: truncName(p.name) }));
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);

    // Payment method breakdown
    const paymentBreakdown = {};
    sales.forEach(sale => {
      const method = sale.payment_method || 'Otro';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(sale.total || 0);
    });
    const paymentData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name, value }));

    // Sales by day trend
    const dayMap = {};
    sales.forEach(sale => {
      const day = new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      if (!dayMap[day]) dayMap[day] = { day, revenue: 0, tickets: 0, units: 0 };
      dayMap[day].revenue += Number(sale.total || 0);
      dayMap[day].tickets += 1;
      const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
      dayMap[day].units += items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    });
    const dailyTrend = Object.values(dayMap).reverse();

    // Sales by hour of day
    const hourMap = {};
    for (let h = 7; h <= 20; h++) hourMap[h] = { hour: `${h}:00`, revenue: 0, tickets: 0 };
    sales.forEach(sale => {
      const h = new Date(sale.created_at).getHours();
      if (!hourMap[h]) hourMap[h] = { hour: `${h}:00`, revenue: 0, tickets: 0 };
      hourMap[h].revenue += Number(sale.total || 0);
      hourMap[h].tickets += 1;
    });
    const hourlyData = Object.values(hourMap).filter(h => h.tickets > 0);

    // Top customers
    const customerMap = {};
    sales.forEach(sale => {
      const name = sale.customer_name || 'Público General';
      if (!customerMap[name]) customerMap[name] = { name, total: 0, visits: 0 };
      customerMap[name].total += Number(sale.total || 0);
      customerMap[name].visits += 1;
    });
    const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return { totalRevenue, totalTickets, avgTicket, totalUnits, topByQty, topByRevenue, paymentData, dailyTrend, hourlyData, topCustomers, products };
  }, [sales]);

  const dateButtons = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: '7 días' },
    { key: 'month', label: '30 días' },
    { key: 'year', label: 'Año' },
    { key: 'all', label: 'Todo' },
    { key: 'custom', label: 'Rango' },
  ];

  // Custom Y-axis tick that shows full name on hover
  const CustomYAxisTick = ({ x, y, payload, data }) => {
    const item = data?.find(d => d.shortName === payload.value);
    const fullName = item?.name || payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{fullName}</title>
        <text x={-5} y={0} dy={4} textAnchor="end" fontSize={10} fill="#475569" style={{ cursor: 'pointer' }}>
          {payload.value}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
        <p className="font-bold text-slate-900 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {typeof p.value === 'number' && p.name?.includes('$') ? `$${fmt(p.value)}` : p.value?.toLocaleString('es-MX')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Date Filter ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm">
          {dateButtons.map(d => (
            <button key={d.key} onClick={() => setDateRange(d.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                dateRange === d.key ? 'bg-[#6a9a04] text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}>
              {d.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-[#6a9a04]" />
            <span className="text-xs text-slate-400">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-[#6a9a04]" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        </div>
      ) : !stats ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-16 text-center">
          <BarChart3 size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-medium">No hay ventas en este período</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#6a9a04]/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-[#6a9a04]" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Ingresos</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${fmt(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShoppingCart size={16} className="text-blue-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tickets</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{stats.totalTickets}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp size={16} className="text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Ticket Promedio</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${fmt(stats.avgTicket)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Package size={16} className="text-purple-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Unidades</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{stats.totalUnits.toLocaleString('es-MX')}</p>
            </div>
          </div>

          {/* ── Revenue Trend ── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#6a9a04]" /> Tendencia de Ventas
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6a9a04" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6a9a04" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="$ Ingresos" stroke="#6a9a04" fill="url(#revGradient)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Top Products Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top by Qty */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Más Vendidos (Unidades)
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topByQty} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="shortName" tick={<CustomYAxisTick data={stats.topByQty} />} width={160} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quantity" name="Unidades" fill="#6a9a04" radius={[0, 6, 6, 0]} barSize={20}>
                      {stats.topByQty.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top by Revenue */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" /> Más Vendidos (Ingresos)
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topByRevenue} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="shortName" tick={<CustomYAxisTick data={stats.topByRevenue} />} width={160} interval={0} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="$ Ingresos" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20}>
                      {stats.topByRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Payment + Hours Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" /> Métodos de Pago
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                      paddingAngle={4} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {stats.paymentData.map((entry, i) => (
                        <Cell key={i} fill={PAYMENT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${fmt(value)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {stats.paymentData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ background: PAYMENT_COLORS[entry.name] || COLORS[i] }}></div>
                    <span className="font-bold text-slate-700">{entry.name}: ${fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-purple-500" /> Ventas por Hora del Día
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="tickets" name="Tickets" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Top Customers ── */}
          {stats.topCustomers.filter(c => c.name !== 'Público General').length > 0 && (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" /> Clientes Frecuentes
              </h3>
              <div className="divide-y divide-slate-100">
                {stats.topCustomers.filter(c => c.name !== 'Público General').map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">{i + 1}</span>
                      <span className="text-sm font-bold text-slate-800">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">${fmt(c.total)}</p>
                      <p className="text-[10px] text-slate-400">{c.visits} visitas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── All Products Table ── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={16} className="text-slate-500" /> Detalle por Producto ({stats.products.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase">#</th>
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase">Producto</th>
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase">SKU</th>
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase text-right">Unidades</th>
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase text-right">Ingresos</th>
                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase text-right">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.products.map((p, i) => (
                    <tr key={i} className="hover:bg-white/40">
                      <td className="py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                      <td className="py-2.5 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2.5 text-xs text-slate-400 font-mono">{p.sku}</td>
                      <td className="py-2.5 text-right font-bold text-slate-700">{p.quantity.toLocaleString('es-MX')}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">${fmt(p.revenue)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs font-bold text-[#6a9a04]">
                          {((p.revenue / stats.totalRevenue) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
