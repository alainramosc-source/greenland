'use client';
import { Package, ShoppingCart, TrendingUp, Clock, Eye } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalSpent: 0,
    productsCount: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Fetch products count
        const { count: prodCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Fetch user's role to determine if we should aggregate by specific user or all
        const { data: { user } } = await supabase.auth.getUser();

        let ordersQuery = supabase.from('orders').select('*');

        // RLS might handle the filtering automatically, but we can just fetch all orders available to the user
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, status, total_amount, created_at')
          .order('created_at', { ascending: false });

        if (!ordersError && ordersData) {
          // Calculate active orders ('pending', 'processing')
          const activeOrders = ordersData.filter(o => ['pending', 'processing'].includes(o.status?.toLowerCase())).length;

          // Calculate total spent (we can sum all orders or just completed ones. Let's sum all non-cancelled ones)
          const totalSpent = ordersData
            .filter(o => o.status?.toLowerCase() !== 'cancelled')
            .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

          setStats({
            activeOrders: activeOrders,
            totalSpent: totalSpent,
            productsCount: prodCount || 0
          });

          // Set 5 most recent orders
          setRecentOrders(ordersData.slice(0, 5));
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const statusNames = {
    pending: 'Pendiente',
    processing: 'En Proceso',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 m-0">Tablero General</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Bienvenido a tu panel de control, resumen de tu actividad.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#ec5b13]/10 flex items-center justify-center text-[#ec5b13]">
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Total Comprado</p>
                  <h3 className="text-3xl font-black text-slate-900 m-0">{formatCurrency(stats.totalSpent)}</h3>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Package size={28} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Productos Disponibles</p>
                  <h3 className="text-3xl font-black text-slate-900 m-0">{stats.productsCount}</h3>
                </div>
              </div>
            </div>

            {/* Recent Orders Component */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden mb-8">
              <div className="p-6 border-b border-slate-200/50 bg-white/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 m-0">Pedidos Recientes</h2>
                <Link href="/dashboard/pedidos" className="text-sm font-bold text-[#ec5b13] hover:underline flex items-center gap-1">
                  Ver todos <Eye size={16} />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="font-medium text-lg text-slate-600 m-0">No hay pedidos recientes para mostrar.</p>
                  <p className="text-sm mt-1">Tus nuevos pedidos aparecerán aquí.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#6a9a04]/5 border-b border-[#6a9a04]/10">
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <Link href={`/dashboard/pedidos/${order.id}`} className="font-bold text-slate-700 hover:text-[#ec5b13] transition-colors">
                              #{order.order_number}
                            </Link>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-400" />
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[order.status?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                              {statusNames[order.status?.toLowerCase()] || order.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">
                            {formatCurrency(order.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
