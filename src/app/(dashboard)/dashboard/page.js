'use client';
import { Package, ShoppingCart, TrendingUp, Clock, Eye, DollarSign, Users, Filter, Search, CheckCircle, XCircle, ArrowUp, CreditCard, BarChart3, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/utils/formatters';

// ============================================================
// DISTRIBUTOR DASHBOARD
// ============================================================
function DistributorDashboard({ userId, profile }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from('orders')
          .select('id, order_number, status, total_amount, created_at, confirmed_at, shipped_at')
          .eq('distributor_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('order_payments')
          .select('*')
          .eq('distributor_id', userId)
          .order('created_at', { ascending: false })
      ]);
      setOrders(ordersRes.data || []);
      setPayments(paymentsRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [userId]);

  const kpis = useMemo(() => {
    const total = orders.length;
    const active = orders.filter(o => ['pending', 'confirmed', 'in_fulfillment', 'shipped'].includes(o.status)).length;
    const nonCancelled = orders.filter(o => !['cancelled', 'rejected'].includes(o.status));
    const totalSpent = nonCancelled.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const balance = totalSpent - totalPaid;
    return { total, active, totalSpent, totalPaid, balance };
  }, [orders, payments]);

  const statusConfig = {
    pending: { label: 'Pendiente', color: '#f59e0b', bg: 'bg-amber-50 border-amber-200 text-amber-700' },
    confirmed: { label: 'Confirmado', color: '#3b82f6', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
    in_fulfillment: { label: 'En Surtido', color: '#8b5cf6', bg: 'bg-purple-50 border-purple-200 text-purple-700' },
    shipped: { label: 'Enviado', color: '#10b981', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    closed: { label: 'Cerrado', color: '#6b7280', bg: 'bg-slate-100 border-slate-200 text-slate-600' },
    cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'bg-red-50 border-red-200 text-red-700' },
    rejected: { label: 'Rechazado', color: '#f97316', bg: 'bg-orange-50 border-orange-200 text-orange-700' },
  };

  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'in_fulfillment', 'shipped'].includes(o.status));
  const recentOrders = orders.slice(0, 8);

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
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Distribuidor'}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium m-0">Aquí tienes el resumen de tu actividad en GreenLand.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Total Pedidos</p>
            <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.total}</h3>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><DollarSign className="w-4 h-4" /></span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Total Compras</p>
            <h3 className="text-2xl font-black text-slate-900 m-0">{formatCurrency(kpis.totalSpent)}</h3>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-green-50 text-green-600 rounded-lg"><CreditCard className="w-4 h-4" /></span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Total Pagado</p>
            <h3 className="text-2xl font-black text-green-600 m-0">{formatCurrency(kpis.totalPaid)}</h3>
          </div>

          <div className={`backdrop-blur-md border shadow-sm p-5 rounded-2xl ${kpis.balance > 0 ? 'bg-red-50/60 border-red-100' : 'bg-green-50/60 border-green-100'}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`p-2 rounded-lg ${kpis.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {kpis.balance > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Saldo Pendiente</p>
            <h3 className={`text-2xl font-black m-0 ${kpis.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(kpis.balance))}
            </h3>
            {kpis.balance <= 0 && <p className="text-[10px] text-green-500 font-bold m-0 mt-0.5">✓ Al corriente</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Active Orders */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#6a9a04]" /> Pedidos Activos
              </h4>
              <Link href="/dashboard/pedidos" className="text-xs font-bold text-[#6a9a04] hover:underline">
                Ver todos →
              </Link>
            </div>
            {activeOrders.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activeOrders.slice(0, 5).map(order => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <Link key={order.id} href={`/dashboard/pedidos/${order.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${sc.color}15` }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 m-0">#{order.order_number}</p>
                          <p className="text-[10px] text-slate-400 m-0">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${sc.bg}`}>{sc.label}</span>
                        <span className="font-bold text-sm text-slate-900">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 m-0">No tienes pedidos activos</p>
                <Link href="/dashboard/pedidos/nuevo" className="text-xs font-bold text-[#6a9a04] hover:underline mt-2 inline-block">
                  + Crear nuevo pedido
                </Link>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#6a9a04]" /> Pagos Recientes
              </h4>
            </div>
            {payments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {payments.slice(0, 6).map(payment => (
                  <div key={payment.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 m-0">{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] text-slate-400 m-0">{formatDate(payment.created_at)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Registrado
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                No tienes pagos registrados
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 m-0">Historial de Pedidos</h4>
            <Link href="/dashboard/pedidos" className="text-xs font-bold text-[#6a9a04] hover:underline">
              Ver todos →
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map(order => {
                    const sc = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <tr key={order.id} className="hover:bg-white/50 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="font-bold text-sm text-slate-900 hover:text-[#6a9a04]">
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-500">{formatDate(order.created_at)}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${sc.bg}`}>{sc.label}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-sm text-slate-900">{formatCurrency(order.total_amount)}</td>
                        <td className="px-3 py-3 text-center">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="p-1.5 hover:bg-white rounded-lg transition-colors inline-flex">
                            <Eye className="w-4 h-4 text-slate-400 hover:text-[#6a9a04]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">Aún no tienes pedidos</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4 justify-center">
          <Link href="/dashboard/pedidos/nuevo" className="flex items-center gap-2 px-6 py-3 bg-[#6a9a04] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:scale-[1.02] transition-transform">
            <ShoppingCart className="w-4 h-4" /> Nuevo Pedido
          </Link>
          <Link href="/dashboard/pedidos" className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
            <Package className="w-4 h-4" /> Mis Pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD (existing)
// ============================================================
export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalRevenue: 0,
    productsCount: 0,
    distributorsCount: 0,
    pendingOrders: 0,
  });
  const [orders, setOrders] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDistributor, setIsDistributor] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Filters
  const [distributorFilter, setDistributorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setUserId(user.id);

        // Check role
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

        if (profile?.role === 'distributor') {
          setIsDistributor(true);
          setLoading(false);
          return;
        }

        if (profile?.role !== 'admin') {
          router.push('/dashboard/pedidos');
          return;
        }
        setIsAdmin(true);

        // Fetch all data in parallel
        const [ordersRes, productsRes, profilesRes] = await Promise.all([
          supabase.from('orders')
            .select('id, order_number, status, total_amount, created_at, distributor_id, payment_confirmed_at, shipped_at, delivered_at, profiles:distributor_id(full_name, email, city)')
            .order('created_at', { ascending: false }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('id, full_name, email, city, role').eq('role', 'distributor').eq('is_active', true),
        ]);

        const ordersData = ordersRes.data || [];
        const distributorsData = profilesRes.data || [];

        setOrders(ordersData);
        setDistributors(distributorsData);

        const activeOrders = ordersData.filter(o => ['pending', 'confirmed', 'in_fulfillment'].includes(o.status?.toLowerCase())).length;
        const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
        const totalRevenue = ordersData
          .filter(o => !['cancelled', 'rejected'].includes(o.status?.toLowerCase()))
          .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

        setStats({
          activeOrders,
          totalRevenue,
          productsCount: productsRes.count || 0,
          distributorsCount: distributorsData.length,
          pendingOrders,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchDist = distributorFilter === 'all' || o.distributor_id === distributorFilter;
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchDate = (!dateFrom || new Date(o.created_at) >= new Date(dateFrom)) &&
        (!dateTo || new Date(o.created_at) <= new Date(dateTo + 'T23:59:59'));
      const safeSearch = searchTerm?.toLowerCase() || '';
      const matchSearch = !safeSearch ||
        (o.order_number && o.order_number.toLowerCase().includes(safeSearch)) ||
        (o.profiles?.full_name && o.profiles.full_name.toLowerCase().includes(safeSearch)) ||
        (o.profiles?.city && o.profiles.city.toLowerCase().includes(safeSearch));
      return matchDist && matchStatus && matchDate && matchSearch;
    });
  }, [orders, distributorFilter, statusFilter, dateFrom, dateTo, searchTerm]);

  const statusConfig = {
    pending: { label: 'Pendiente', className: 'bg-amber-100/80 text-amber-700 border-amber-200' },
    confirmed: { label: 'Confirmado', className: 'bg-blue-100/80 text-blue-700 border-blue-200' },
    in_fulfillment: { label: 'En Surtido', className: 'bg-purple-100/80 text-purple-700 border-purple-200' },
    shipped: { label: 'Enviado', className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200' },
    closed: { label: 'Cerrado', className: 'bg-slate-100/80 text-slate-600 border-slate-200' },
    cancelled: { label: 'Cancelado', className: 'bg-red-100/80 text-red-700 border-red-200' },
    rejected: { label: 'Rechazado', className: 'bg-orange-100/80 text-orange-700 border-orange-200' },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show distributor dashboard
  if (isDistributor) {
    return <DistributorDashboard userId={userId} profile={userProfile} />;
  }

  if (!isAdmin) return null;

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 m-0">Tablero General</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Control total de pedidos, distribuidores e inventario.</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
              <ShoppingCart size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Pedidos Activos</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">{stats.activeOrders}</h3>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-[#6a9a04]">
            <div className="w-14 h-14 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Ingresos Totales</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Pedidos por Revisar</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">{stats.pendingOrders}</h3>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Users size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Distribuidores</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">{stats.distributorsCount}</h3>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-bold text-slate-700 mr-1 shrink-0">Filtros:</span>

            <select
              value={distributorFilter}
              onChange={(e) => setDistributorFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 cursor-pointer"
            >
              <option value="all">Todos los distribuidores</option>
              {distributors.map(d => (
                <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="in_fulfillment">En Surtido</option>
              <option value="shipped">Enviado</option>
              <option value="closed">Cerrado</option>
              <option value="cancelled">Cancelado</option>
              <option value="rejected">Rechazado</option>
            </select>

            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
              />
              <span className="text-slate-400">—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
              />
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar folio, distribuidor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-400"
              />
            </div>

            {(distributorFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
              <button
                onClick={() => { setDistributorFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}
                className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer bg-transparent border border-red-200"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-200/50 bg-white/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Todos los Pedidos</h2>
              <p className="text-sm text-slate-500 m-0 mt-1">
                Mostrando <span className="font-bold text-slate-800">{filteredOrders.length}</span> de <span className="font-bold text-slate-800">{orders.length}</span> pedidos
              </p>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <ShoppingCart size={32} />
              </div>
              <p className="font-medium text-lg text-slate-600 m-0">No hay pedidos que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#6a9a04]/5 border-b border-[#6a9a04]/10">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Distribuidor</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const sc = statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
                    return (
                      <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="font-bold text-slate-700 hover:text-[#6a9a04] transition-colors">
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-slate-800 m-0 text-sm">{order.profiles?.full_name || 'Desconocido'}</p>
                            <p className="text-xs text-slate-400 m-0">{order.profiles?.city || '—'}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            {formatDate(order.created_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${sc.className}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="p-4 text-center">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="p-2 hover:bg-white rounded-lg transition-colors inline-flex cursor-pointer" title="Ver detalle">
                            <Eye className="w-5 h-5 text-slate-400 hover:text-[#6a9a04]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
