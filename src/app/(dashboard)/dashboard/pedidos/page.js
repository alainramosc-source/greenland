'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, DollarSign, Clock, CheckCircle,
  TrendingUp, Filter, Download, ChevronLeft, ChevronRight,
  Eye, Plus, Search, ArrowUp, ClipboardCheck
} from 'lucide-react';

const OP_STATUS = {
  pending: { label: 'Pendiente', className: 'bg-amber-100/60 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', className: 'bg-blue-100/60 text-blue-700 border-blue-200' },
  in_fulfillment: { label: 'En Surtido', className: 'bg-purple-100/60 text-purple-700 border-purple-200' },
  shipped: { label: 'Enviado', className: 'bg-emerald-100/60 text-emerald-700 border-emerald-200' },
  closed: { label: 'Cerrado', className: 'bg-slate-100/60 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100/60 text-red-600 border-red-200' },
  rejected: { label: 'Rechazado', className: 'bg-orange-100/60 text-orange-600 border-orange-200' },
};

const PAY_STATUS = {
  unpaid: { label: 'Por Cobrar', className: 'bg-red-50 text-red-600 border-red-200' },
  partial: { label: 'Parcial', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  paid: { label: 'Pagado', className: 'bg-green-50 text-green-600 border-green-200' },
};

export default function PedidosPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const actualRole = profile?.role;
      let isAdmin = actualRole === 'admin';
      let targetUserId = user.id;

      if (isAdmin && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
        const simulatedDistId = sessionStorage.getItem('test_view_distributor_id');
        if (simulatedDistId) {
          isAdmin = false;
          targetUserId = simulatedDistId;
        }
      }

      setIsAdmin(isAdmin);

      let query = supabase.from('orders').select('*, profiles:distributor_id(full_name, email, city)').order('created_at', { ascending: false });
      if (!isAdmin) {
        query = query.eq('distributor_id', targetUserId);
      }

      const { data } = await query;
      if (data) setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const safeSearch = searchTerm?.toLowerCase() || '';
    const matchSearch = !safeSearch ||
      (o.order_number && o.order_number.toLowerCase().includes(safeSearch)) ||
      (o.profiles?.full_name && o.profiles.full_name.toLowerCase().includes(safeSearch)) ||
      (o.profiles?.city && o.profiles.city.toLowerCase().includes(safeSearch));
    return matchStatus && matchSearch;
  });

  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  const totalAmount = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
  const pendingPayment = orders.filter(o => o.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(o.status)).reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

  return (
    <>
      {/* Main Content Area */}
      <div className="relative z-10 w-full">
        {/* Page Header (Search) */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-[#000000] tracking-tight">{isAdmin ? 'Pedidos' : 'Mis Pedidos'}</h1>
            <p className="text-[#747474] mt-1 font-medium">{isAdmin ? 'Gestiona y monitorea las órdenes en tiempo real.' : 'Consulta tus pedidos y realiza nuevos pedidos.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6a9a04] transition-colors" />
              <input
                type="text"
                placeholder="Buscar pedidos, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-panel pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-[#6a9a04]/30 border-none placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Pedidos */}
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Total Pedidos</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">{orders.length.toLocaleString('es-MX')}</p>
          </div>

          {/* Ingresos Totales */}
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Ingresos Totales</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          {/* Pendientes + Confirmados */}
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Activos</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">En Proceso</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">{(counts['pending'] || 0) + (counts['confirmed'] || 0) + (counts['in_fulfillment'] || 0)}</p>
          </div>

          {/* Cuentas por Cobrar */}
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{isAdmin ? 'Cuentas por Cobrar' : 'Mi Saldo Pendiente'}</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">${pendingPayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </section>

        {/* Orders Table Section */}
        <section className="glass-panel rounded-[2.5rem] p-8 mt-6 border border-white/40 shadow-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#000000]">Pedidos Recientes</h2>
              <p className="text-[#747474] text-sm mt-1">Gestiona y monitorea las órdenes en tiempo real.</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Filter dropdown */}
              <select
                className="glass-button px-4 py-2.5 rounded-xl text-slate-700 text-sm font-semibold cursor-pointer border border-white/80 outline-none bg-white/50 backdrop-blur-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmados</option>
                <option value="in_fulfillment">En Surtido</option>
                <option value="shipped">Enviados</option>
                <option value="closed">Cerrados</option>
                <option value="cancelled">Cancelados</option>
                <option value="rejected">Rechazados</option>
              </select>
              <Link
                href="/dashboard/pedidos/nuevo"
                className="bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-6 py-2.5 rounded-xl flex items-center text-sm font-bold shadow-lg shadow-[#6a9a04]/20 transition-all no-underline"
              >
                <Plus className="w-5 h-5 mr-2" /> Crear Pedido
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                  <th className="px-6 py-2">ID</th>
                  <th className="px-6 py-2">Concepto / Cliente</th>
                  <th className="px-6 py-2">Fecha</th>
                  <th className="px-6 py-2">Total</th>
                  <th className="px-6 py-2 text-center">Estado</th>
                  <th className="px-6 py-2 text-center">Pago</th>
                  <th className="px-6 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                      No se encontraron pedidos.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const opSc = OP_STATUS[order.status] || OP_STATUS.pending;
                    const paySc = PAY_STATUS[order.payment_status] || PAY_STATUS.unpaid;
                    return (
                      <tr key={order.id} className="table-row-glass transition-all rounded-2xl group">
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-l-2xl border-y border-l border-transparent group-hover:border-[#6a9a04]/10 first:rounded-l-2xl transition-colors">
                          <span className="text-slate-800 font-bold">#{order.order_number}</span>
                          {order.notes && order.notes.includes('⚠️ INCIDENCIA') && (
                            <span className="ml-2 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-red-100 text-red-600 border border-red-200 tracking-wider" title="Incidencia reportada">
                              ⚠️ Incidencia
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                          <div>
                            <p className="font-bold text-slate-800 m-0">
                              {isAdmin ? (order.profiles?.full_name || order.profiles?.email || 'Desconocido') : 'Mi Pedido de Reposición'}
                            </p>
                            <p className="text-xs text-[#747474] m-0">
                              {isAdmin ? (order.profiles?.city || 'Sin especificar') : 'Inventario General'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                          <span className="text-sm font-medium text-slate-600">
                            {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                          <span className="font-black text-[#000000]">
                            ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${opSc.className}`}>
                            {opSc.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center">
                          {!['cancelled', 'rejected'].includes(order.status) && (
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${paySc.className}`}>
                              {paySc.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-r-2xl border-y border-r border-transparent group-hover:border-[#6a9a04]/10 text-center transition-colors">
                          <Link href={`/dashboard/pedidos/${order.id}`} className="p-2 hover:bg-white rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent" title="Ver detalle">
                            <Eye className="w-5 h-5 text-slate-400 hover:text-[#6a9a04]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8 border-t border-slate-200/50 pt-6">
            <p className="text-sm text-[#747474] m-0">
              Mostrando <span className="font-bold text-slate-800">{filteredOrders.length}</span> de <span className="font-bold text-slate-800">{orders.length}</span> pedidos
            </p>
            <div className="flex space-x-2">
              <button className="glass-button w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white cursor-pointer shadow-sm border-none bg-white/50 text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#6a9a04] text-white font-bold shadow-md cursor-pointer border-none">1</button>
              <button className="glass-button w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white cursor-pointer shadow-sm border-none bg-white/50 text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .glass-card-hover {
          transition: all 0.3s ease;
        }
        .glass-card-hover:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
        }

        .glass-button {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.2s ease;
        }
        .glass-button:hover {
          background: rgba(255, 255, 255, 1);
        }

        .table-row-glass:hover {
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </>
  );
}
