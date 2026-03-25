'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Globe, ShoppingCart, Search, Filter, ChevronRight, Package,
  Clock, CheckCircle, Truck, XCircle, Loader2, RefreshCw, User
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
  in_fulfillment: { label: 'En Surtido', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Package },
  shipped: { label: 'Enviado', color: 'bg-green-100 text-green-700 border-green-200', icon: Truck },
  closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200', icon: XCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-600 border-red-200', icon: XCircle },
};

export default function PedidosZonaPage() {
  const [orders, setOrders] = useState([]);
  const [subDistributors, setSubDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDistributor, setFilterDistributor] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Verify distributor_pro role
    const { data: profile } = await supabase.from('profiles').select('role, sub_role').eq('id', user.id).single();
    if (profile?.role !== 'distributor' || profile?.sub_role !== 'distributor_pro') {
      router.push('/dashboard');
      return;
    }

    // Fetch sub-distributors assigned to this PRO
    const { data: subs } = await supabase
      .from('profiles')
      .select('id, full_name, email, city, client_number, company_name')
      .eq('parent_distributor_id', user.id)
      .eq('is_active', true)
      .order('full_name');

    setSubDistributors(subs || []);

    if (!subs || subs.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Fetch orders from sub-distributors
    const subIds = subs.map(s => s.id);
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total_amount, created_at, notes,
        distributor_id,
        order_items (
          id, quantity, unit_price, subtotal,
          products:product_id (name, sku)
        )
      `)
      .in('distributor_id', subIds)
      .order('created_at', { ascending: false });

    setOrders(ordersData || []);
    setLoading(false);
  };

  // Status change handler
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      await fetchData();
    }
    setUpdatingStatus(null);
  };

  // Get next valid status transitions
  const getNextStatuses = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return ['confirmed', 'rejected'];
      case 'confirmed': return ['in_fulfillment', 'cancelled'];
      case 'in_fulfillment': return ['shipped', 'cancelled'];
      case 'shipped': return ['closed'];
      default: return [];
    }
  };

  // Get distributor info for an order
  const getDistributor = (distributorId) => {
    return subDistributors.find(s => s.id === distributorId);
  };

  // Filters
  const filteredOrders = orders.filter(o => {
    const dist = getDistributor(o.distributor_id);
    const search = searchTerm.toLowerCase();
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search) ||
      dist?.full_name?.toLowerCase().includes(search) ||
      dist?.company_name?.toLowerCase().includes(search) ||
      dist?.city?.toLowerCase().includes(search);
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchDist = filterDistributor === 'all' || o.distributor_id === filterDistributor;
    return matchSearch && matchStatus && matchDist;
  });

  // Stats
  const activeOrders = orders.filter(o => !['cancelled', 'rejected', 'closed'].includes(o.status)).length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.filter(o => !['cancelled', 'rejected'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-purple-500 rounded-full animate-spin" />
        <p>Cargando pedidos de zona...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-3">
            <Globe className="w-8 h-8 text-purple-500" />
            Pedidos de Zona
          </h1>
          <p className="text-slate-500 mt-1 font-medium m-0">
            Gestiona los pedidos de tus sub-distribuidores asignados.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Sub-Distribuidores</p>
          <p className="text-2xl font-black text-slate-900 m-0 mt-1">{subDistributors.length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Pedidos Activos</p>
          <p className="text-2xl font-black text-purple-600 m-0 mt-1">{activeOrders}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Pendientes</p>
          <p className="text-2xl font-black text-amber-600 m-0 mt-1">{pendingOrders}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">Ventas Totales</p>
          <p className="text-2xl font-black text-green-600 m-0 mt-1">${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-200 shadow-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none shadow-sm"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        {subDistributors.length > 1 && (
          <select
            value={filterDistributor}
            onChange={(e) => setFilterDistributor(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none shadow-sm"
          >
            <option value="all">Todos los sub-distribuidores</option>
            {subDistributors.map(s => (
              <option key={s.id} value={s.id}>{s.full_name || s.email} {s.city ? `— ${s.city}` : ''}</option>
            ))}
          </select>
        )}
      </div>

      {/* Empty State */}
      {subDistributors.length === 0 && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-12 text-center">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 m-0">Sin sub-distribuidores asignados</h3>
          <p className="text-slate-500 mt-2 m-0">Contacta al administrador para que te asigne sub-distribuidores a tu zona.</p>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 && subDistributors.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium m-0">No hay pedidos que coincidan con los filtros.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredOrders.map(order => {
          const dist = getDistributor(order.distributor_id);
          const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusCfg.icon;
          const nextStatuses = getNextStatuses(order.status);
          const itemCount = order.order_items?.length || 0;

          return (
            <div key={order.id} className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all">
              <div className="p-5">
                {/* Order Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 m-0">
                        {dist?.full_name || 'Sin nombre'}
                        <span className="text-xs text-slate-400 ml-2 font-mono">{dist?.client_number || ''}</span>
                      </p>
                      <p className="text-xs text-slate-500 m-0">
                        {dist?.city || ''} {dist?.company_name ? `• ${dist.company_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusCfg.label}
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-600">#{order.order_number}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-slate-50/50 rounded-xl p-3 mb-4">
                  <div className="grid gap-2">
                    {order.order_items?.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{item.products?.name || 'Producto'}</span>
                          <span className="text-xs text-slate-400 font-mono">{item.products?.sku}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500">×{item.quantity}</span>
                          <span className="font-bold text-slate-700">${(item.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                    {itemCount > 5 && (
                      <p className="text-xs text-slate-400 m-0 text-center">...y {itemCount - 5} productos más</p>
                    )}
                  </div>
                </div>

                {/* Footer: Total + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-slate-900">
                      ${(order.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextStatuses.map(ns => {
                      const nsCfg = STATUS_CONFIG[ns];
                      const isCancel = ns === 'cancelled' || ns === 'rejected';
                      return (
                        <button
                          key={ns}
                          disabled={updatingStatus === order.id}
                          onClick={() => {
                            if (isCancel && !confirm(`¿Seguro que deseas ${nsCfg.label.toLowerCase()} este pedido?`)) return;
                            handleStatusChange(order.id, ns);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all disabled:opacity-50 ${
                            isCancel
                              ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                              : 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : nsCfg.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => router.push(`/dashboard/pedidos/${order.id}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all flex items-center gap-1"
                    >
                      Ver detalle <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
