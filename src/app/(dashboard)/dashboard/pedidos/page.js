'use client';
import React from 'react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, DollarSign, Clock, CheckCircle,
  TrendingUp, Filter, Download, ChevronLeft, ChevronRight, ChevronDown,
  Eye, Plus, Search, ArrowUp, ClipboardCheck, Trash2, Printer,
  Store, Package, CreditCard, Calendar, X, ShoppingBag, Loader2, AlertTriangle
} from 'lucide-react';

const RETAIL_STATUS = {
  pending: { label: 'Pendiente', className: 'bg-amber-100/60 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', className: 'bg-blue-100/60 text-blue-700 border-blue-200' },
  delivered: { label: 'Entregado', className: 'bg-emerald-100/60 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100/60 text-red-600 border-red-200' },
};

const RETAIL_PAY = {
  unpaid: { label: 'Por Cobrar', className: 'bg-red-50 text-red-600 border-red-200' },
  paid: { label: 'Pagado', className: 'bg-green-50 text-green-600 border-green-200' },
};

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
  const [activeTab, setActiveTab] = useState('distributor');
  const [retailOrders, setRetailOrders] = useState([]);
  const [retailLoading, setRetailLoading] = useState(true);
  const [showNewSale, setShowNewSale] = useState(false);
  const [expandedRetail, setExpandedRetail] = useState({});
  const supabase = createClient();

  // Refresh retail orders
  const refreshRetailOrders = async () => {
    const { data } = await supabase
      .from('lastmile_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRetailOrders(data);
  };

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

    // Fetch retail orders
    async function fetchRetailOrders() {
      const { data } = await supabase
        .from('lastmile_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRetailOrders(data);
      setRetailLoading(false);
    }
    fetchRetailOrders();
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

  const deleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`¿Eliminar pedido #${orderNumber} permanentemente?`)) return;
    const supabaseClient = createClient();
    await supabaseClient.from('order_items').delete().eq('order_id', orderId);
    const { error, count } = await supabaseClient.from('orders').delete().eq('id', orderId).select();
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    // Re-fetch to confirm deletion actually took effect
    const { data: check } = await supabaseClient.from('orders').select('id').eq('id', orderId).maybeSingle();
    if (check) {
      alert('No se pudo eliminar el pedido. Permisos insuficientes.');
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  const totalAmount = orders.filter(o => !['cancelled', 'rejected'].includes(o.status)).reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
  const pendingPayment = orders.filter(o => o.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(o.status)).reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

  const handlePrintOrders = async () => {
    // Only print active orders (exclude cancelled/rejected)
    const activeStatuses = ['pending', 'confirmed', 'in_fulfillment'];
    const printOrders = filteredOrders.filter(o => activeStatuses.includes(o.status));
    if (printOrders.length === 0) { alert('No hay pedidos activos para imprimir.'); return; }

    // Fetch order items for each order
    const orderIds = printOrders.map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity, products:product_id(name, sku)')
      .in('order_id', orderIds);

    const itemsByOrder = {};
    (items || []).forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    const ordersHtml = printOrders.map(order => {
      const opSc = OP_STATUS[order.status] || OP_STATUS.pending;
      const orderItems = itemsByOrder[order.id] || [];
      const itemsRows = orderItems.map(item => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-family:monospace;">${item.products?.sku || '—'}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${item.products?.name || 'Producto'}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:13px;">${item.quantity}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">☐</td>
        </tr>`).join('');
      const totalPcs = orderItems.reduce((s, i) => s + i.quantity, 0);
      return `
        <div style="page-break-inside:avoid;border:1px solid #d1d5db;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:2px solid #1e293b;padding-bottom:8px;">
            <div>
              <strong style="font-size:14px;">#${order.order_number}</strong>
              <span style="color:#64748b;font-size:11px;margin-left:8px;">${new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
            </div>
            <div style="text-align:right;">
              <span style="background:#f1f5f9;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${opSc.label}</span>
            </div>
          </div>
          <div style="font-size:12px;margin-bottom:8px;">
            <strong>${order.profiles?.full_name || '—'}</strong>
            <span style="color:#64748b;margin-left:8px;">${order.profiles?.city || ''}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:4px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">SKU</th>
                <th style="padding:4px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Producto</th>
                <th style="padding:4px 8px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Cant</th>
                <th style="padding:4px 8px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">✓</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="text-align:right;margin-top:4px;font-size:11px;font-weight:700;color:#334155;">
            ${totalPcs} pzas · $${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>`;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Revisión de Pedidos — ${today}</title>
      <style>
        @page { size: letter; margin: 1cm; }
        body { font-family: -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 16px; color: #1e293b; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <h1 style="margin:0;font-size:20px;">Hoja de Revisión de Pedidos</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">GreenLand Products · ${today}</p>
          </div>
          <div style="text-align:right;font-size:11px;">
            <strong>${printOrders.length}</strong> pedidos · 
            Filtro: <strong>${statusFilter === 'all' ? 'Activos' : (OP_STATUS[statusFilter]?.label || statusFilter)}</strong>
          </div>
        </div>
        ${ordersHtml}
        <div style="margin-top:20px;border-top:2px solid #1e293b;padding-top:12px;display:flex;justify-content:space-between;font-size:12px;">
          <div>Revisado por: ________________________</div>
          <div>Firma: ________________________</div>
          <div>Fecha: ________________________</div>
        </div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <>
      {/* Main Content Area */}
      <div className="relative z-10 w-full">
        {/* Page Header (Search) */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
                className="w-full glass-panel pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-[#6a9a04]/30 border-none placeholder:text-slate-400 outline-none text-slate-800"
              />
            </div>
          </div>
        </header>

        {/* Tab Switcher */}
        {isAdmin && (
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('distributor')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'distributor'
                  ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-lg shadow-[#6a9a04]/20'
                  : 'bg-white/50 text-slate-600 border-white/80 hover:bg-white'
              }`}
            >
              <Package className="w-4 h-4" /> Distribuidores
            </button>
            <button
              onClick={() => setActiveTab('retail')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                activeTab === 'retail'
                  ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-lg shadow-[#6a9a04]/20'
                  : 'bg-white/50 text-slate-600 border-white/80 hover:bg-white'
              }`}
            >
              <Store className="w-4 h-4" /> Venta a Público
              {retailOrders.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  activeTab === 'retail' ? 'bg-white/20 text-white' : 'bg-[#6a9a04]/10 text-[#6a9a04]'
                }`}>{retailOrders.length}</span>
              )}
            </button>
          </div>
        )}

        {/* KPI Cards — only show for distributor tab */}
        {activeTab === 'distributor' && isAdmin && (() => {
          const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
          const overdueOrders = orders.filter(o => 
            o.payment_status !== 'paid' && 
            o.status !== 'cancelled' && 
            o.status !== 'rejected' && 
            new Date(o.created_at) < fourteenDaysAgo
          );
          if (overdueOrders.length === 0) return null;
          const overdueTotal = overdueOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
          return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800">
                  ⚠️ {overdueOrders.length} pedido{overdueOrders.length !== 1 ? 's' : ''} con más de 14 días sin pago
                  <span className="font-normal text-red-600 ml-2">(${overdueTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })})</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {overdueOrders.slice(0, 8).map(o => (
                    <span key={o.id} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                      #{o.order_number} · {o.profiles?.full_name?.split(' ')[0] || '—'} · ${Number(o.total_amount).toLocaleString('es-MX')}
                    </span>
                  ))}
                  {overdueOrders.length > 8 && (
                    <span className="text-[10px] text-red-500 font-bold">+{overdueOrders.length - 8} más</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {activeTab === 'distributor' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl"><ShoppingCart className="w-6 h-6 text-blue-600" /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Total Pedidos</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">{orders.length.toLocaleString('es-MX')}</p>
          </div>
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl"><DollarSign className="w-6 h-6 text-purple-600" /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{isAdmin ? 'Ingresos Totales' : 'Compras Totales'}</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl"><Clock className="w-6 h-6 text-orange-600" /></div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Activos</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">En Proceso</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">{(counts['pending'] || 0) + (counts['confirmed'] || 0) + (counts['in_fulfillment'] || 0)}</p>
          </div>
          <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-2xl"><TrendingUp className="w-6 h-6 text-red-600" /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{isAdmin ? 'Cuentas por Cobrar' : 'Mi Saldo Pendiente'}</h3>
            <p className="text-2xl font-bold text-[#000000] mt-1">${pendingPayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </section>
        )}

        {/* Orders Table Section */}
        {activeTab === 'distributor' && (
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
              {isAdmin && (
                <button
                  onClick={handlePrintOrders}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white/50 border border-white/80 hover:bg-white cursor-pointer transition-all backdrop-blur-md shadow-sm"
                  title="Imprimir hoja de revisión"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              )}
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
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/dashboard/pedidos/${order.id}`} className="p-2 hover:bg-white rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent" title="Ver detalle">
                              <Eye className="w-5 h-5 text-slate-400 hover:text-[#6a9a04]" />
                            </Link>
                            {isAdmin && ['cancelled', 'rejected'].includes(order.status) && (
                              <button onClick={() => deleteOrder(order.id, order.order_number)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer border-none bg-transparent" title="Eliminar pedido">
                                <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
                              </button>
                            )}
                          </div>
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
        )}
      {/* ========== RETAIL SALES TAB ========== */}
      {isAdmin && activeTab === 'retail' && (() => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const thisWeek = new Date(Date.now() - 7 * 86400000).toISOString();
        const retailActive = retailOrders.filter(o => o.status !== 'cancelled');
        const totalRetail = retailActive.reduce((s, o) => s + Number(o.total || 0), 0);
        const todaySales = retailActive.filter(o => {
          if (!o.created_at) return false;
          const d = new Date(o.created_at);
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return local === today;
        });
        const todayTotal = todaySales.reduce((s, o) => s + Number(o.total || 0), 0);
        const unpaidTotal = retailActive.filter(o => o.payment_status !== 'paid').reduce((s, o) => s + Number(o.total || 0), 0);

        const filteredRetail = retailOrders.filter(o => {
          const s = searchTerm?.toLowerCase() || '';
          if (!s) return true;
          return (o.order_number || '').toLowerCase().includes(s) || (o.notes || '').toLowerCase().includes(s);
        });

        const toggleRetailPayment = async (order) => {
          const newStatus = order.payment_status === 'paid' ? 'unpaid' : 'paid';
          await supabase.from('lastmile_orders').update({ payment_status: newStatus }).eq('id', order.id);
          setRetailOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: newStatus } : o));
        };

        const updateRetailStatus = async (order, newStatus) => {
          await supabase.from('lastmile_orders').update({ status: newStatus }).eq('id', order.id);
          setRetailOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
        };

        return (
          <>
            {/* Retail KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-2xl"><Store className="w-6 h-6 text-green-600" /></div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Total Ventas</h3>
                <p className="text-2xl font-bold text-[#000000] mt-1">{retailActive.length}</p>
              </div>

              <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-2xl"><DollarSign className="w-6 h-6 text-purple-600" /></div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Monto Total</h3>
                <p className="text-2xl font-bold text-[#000000] mt-1">${totalRetail.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-2xl"><Calendar className="w-6 h-6 text-blue-600" /></div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Hoy</span>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Ventas Hoy</h3>
                <p className="text-2xl font-bold text-[#000000] mt-1">{todaySales.length} · ${todayTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="glass-panel glass-card-hover p-6 rounded-[2rem]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 rounded-2xl"><CreditCard className="w-6 h-6 text-red-600" /></div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Pendiente de Cobro</h3>
                <p className="text-2xl font-bold text-[#000000] mt-1">${unpaidTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </section>

            {/* Retail Table */}
            <section className="glass-panel rounded-[2.5rem] p-8 mt-6 border border-white/40 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#000000]">Ventas a Público</h2>
                  <p className="text-[#747474] text-sm mt-1">Click en pago para marcar como cobrado.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const rows = ['Orden,Fecha,SKU,Producto,Cantidad,Precio Unit.,Subtotal,Total Orden,Bodega,Entrega,Método Pago,Pago,Estado,Notas'];
                      filteredRetail.forEach(o => {
                        const items = o.items || [];
                        const date = new Date(o.created_at).toLocaleDateString('es-MX');
                        if (items.length === 0) {
                          const pm = o.payment_method === 'transfer' ? 'Transferencia' : o.payment_method === 'cash' ? 'Efectivo' : '';
                          rows.push(`${o.order_number},${date},,,,,,$${o.total},${o.warehouse_name || ''},${o.delivery_type},${pm},${o.payment_status},${o.status},"${(o.notes || '').replace(/"/g, '""')}"`);
                        } else {
                          items.forEach(item => {
                            const sub = (item.quantity * (item.sale_price || 0)).toFixed(2);
                            const pm = o.payment_method === 'transfer' ? 'Transferencia' : o.payment_method === 'cash' ? 'Efectivo' : '';
                            rows.push(`${o.order_number},${date},${item.sku || ''},"${item.name || ''}",${item.quantity},${item.sale_price || 0},${sub},$${o.total},${o.warehouse_name || ''},${o.delivery_type},${pm},${o.payment_status},${o.status},"${(o.notes || '').replace(/"/g, '""')}"`);
                          });
                        }
                      });
                      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `ventas_publico_${new Date().toISOString().slice(0,10)}.csv`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl flex items-center text-sm font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </button>
                  <button
                    onClick={() => setShowNewSale(true)}
                    className="bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-6 py-2.5 rounded-xl flex items-center text-sm font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Nueva Venta
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                      <th className="px-4 py-2">Orden</th>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Productos</th>
                      <th className="px-4 py-2">Total</th>
                      <th className="px-4 py-2">Bodega</th>
                      <th className="px-4 py-2 text-center">Entrega</th>
                      <th className="px-4 py-2 text-center">Método</th>
                      <th className="px-4 py-2 text-center">Pago</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retailLoading ? (
                      <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-400">Cargando...</td></tr>
                    ) : filteredRetail.length === 0 ? (
                      <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-400">No hay ventas registradas. Crea una desde el chat del inbox.</td></tr>
                    ) : filteredRetail.map(order => {
                      const items = order.items || [];
                      const itemsSummary = items.map(i => `${i.quantity}x ${i.sku || i.name}`).join(', ');
                      const rtSt = RETAIL_STATUS[order.status] || RETAIL_STATUS.pending;
                      const rtPay = RETAIL_PAY[order.payment_status] || RETAIL_PAY.unpaid;
                      const isExpanded = expandedRetail[order.id];
                      return (
                        <React.Fragment key={order.id}>
                        <tr className="table-row-glass transition-all rounded-2xl group cursor-pointer" onClick={() => setExpandedRetail(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-l-2xl border-y border-l border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              <div>
                                <span className="font-bold text-slate-800">#{order.order_number}</span>
                                {order.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{order.notes}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                            <span className="text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                            <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                            <p className="text-xs text-slate-700 font-medium">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-slate-400">{items.reduce((s, i) => s + (i.quantity || 0), 0)} pzas total</p>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                            <span className="font-black text-[#000000]">${Number(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors">
                            <span className="text-xs text-slate-600">{order.warehouse_name || '—'}</span>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border ${order.delivery_type === 'pickup' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                              {order.delivery_type === 'pickup' ? '🏪 Sitio' : '🚚 Envío'}
                            </span>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async () => {
                                const newMethod = order.payment_method === 'cash' ? 'transfer' : 'cash';
                                await supabase.from('lastmile_orders').update({ payment_method: newMethod }).eq('id', order.id);
                                refreshRetailOrders();
                              }}
                              className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border cursor-pointer transition-all hover:scale-105 ${
                                order.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : order.payment_method === 'transfer' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                              title="Click para cambiar método de pago"
                            >
                              {order.payment_method === 'cash' ? '💵 Efectivo' : order.payment_method === 'transfer' ? '🏦 Transfer.' : '—'}
                            </button>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 border-y border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleRetailPayment(order)}
                              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border cursor-pointer transition-all hover:scale-105 ${rtPay.className}`}
                              title="Click para cambiar estado de pago"
                            >
                              {rtPay.label}
                            </button>
                          </td>
                          <td className="px-4 py-4 bg-white/30 group-hover:bg-[#6a9a04]/5 rounded-r-2xl border-y border-r border-transparent group-hover:border-[#6a9a04]/10 transition-colors text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={order.status}
                              onChange={(e) => updateRetailStatus(order, e.target.value)}
                              className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider border cursor-pointer outline-none ${rtSt.className}`}
                            >
                              <option value="pending">Pendiente</option>
                              <option value="confirmed">Confirmado</option>
                              <option value="delivered">Entregado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" className="px-4 pb-4 pt-0">
                              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden ml-6">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Cantidad</th>
                                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Precio Unit.</th>
                                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-white/50">
                                        <td className="px-4 py-2.5 font-mono text-xs text-[#6a9a04] font-bold">{item.sku || '—'}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-800">{item.name || '—'}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-800 text-center font-bold">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-600 text-right">${Number(item.sale_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-900 text-right font-bold">${(item.quantity * (item.sale_price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-8 border-t border-slate-200/50 pt-6">
                <p className="text-sm text-[#747474] m-0">
                  Mostrando <span className="font-bold text-slate-800">{filteredRetail.length}</span> ventas
                </p>
              </div>
            </section>
            {/* New Sale Modal */}
            {showNewSale && (
              <NewRetailSaleModal
                supabase={supabase}
                onClose={() => setShowNewSale(false)}
                onSaleCreated={() => { setShowNewSale(false); refreshRetailOrders(); }}
              />
            )}
          </>
        );
      })()}
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

// ================================================================
// NEW RETAIL SALE MODAL
// ================================================================
function NewRetailSaleModal({ supabase, onClose, onSaleCreated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const searchInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name');
      if (data && data.length > 0) {
        setWarehouses(data);
        const vitoAlessio = data.find(w => w.code === 'vito-alessio');
        setSelectedWarehouse(vitoAlessio?.id || data[0].id);
      }
    })();
    setTimeout(() => searchInputRef.current?.focus(), 200);
  }, [supabase]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, price')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  function addToCart(product) {
    if (cart.find(c => c.product_id === product.id)) return;
    setCart(prev => [...prev, {
      product_id: product.id, sku: product.sku, name: product.name,
      quantity: 1, sale_price: product.price ? String(product.price) : '',
    }]);
    setSearchTerm('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  }

  function updateCartItem(idx, field, value) {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeFromCart(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.sale_price) || 0)), 0);
  const isValid = cart.length > 0 && cart.every(item => item.quantity > 0 && item.sale_price && parseFloat(item.sale_price) > 0);

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id, sku: item.sku, name: item.name,
        quantity: parseInt(item.quantity), sale_price: parseFloat(item.sale_price),
      }));

      const noteText = (customerName ? `Cliente: ${customerName}. ` : '') + (notes || '');
      const { data, error } = await supabase.rpc('create_retail_sale', {
        p_conversation_id: null,
        p_warehouse_id: selectedWarehouse,
        p_delivery_type: deliveryType,
        p_items: items,
        p_notes: noteText,
      });

      if (error) throw error;
      if (data?.success) {
        // Save payment_method and auto-mark as paid
        if (data.order_id) {
          await supabase.from('lastmile_orders').update({
            payment_method: paymentMethod,
            payment_status: 'paid',
          }).eq('id', data.order_id);

          // Auto-insert cash entry if payment is cash
          if (paymentMethod === 'cash') {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('cash_movements').insert({
              type: 'entry',
              amount: subtotal,
              concept: `Venta a público: ${data.order_number}${customerName ? ` — ${customerName}` : ''}`,
              responsible: 'Venta directa',
              reference_id: data.order_id,
              reference_type: 'retail_sale',
              movement_date: new Date().toISOString().split('T')[0],
              created_by: user?.id
            });
          }
        }
        const methodLabel = paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';
        alert(`✅ Venta ${data.order_number} registrada (${methodLabel}) — $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        onSaleCreated && onSaleCreated();
      } else {
        alert('Error: ' + (data?.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Sale error:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#6a9a04]" /> Nueva Venta a Público
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer name */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del cliente (opcional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
            />
          </div>

          {/* Product search */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Agregar productos</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={cart.find(c => c.product_id === p.id)}
                    className="w-full text-left px-4 py-3 hover:bg-[#6a9a04]/5 transition-colors text-sm border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent"
                  >
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span>
                    <span className="font-medium text-slate-700 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-slate-400">${Number(p.price || 0).toLocaleString('es-MX')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 ? (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Productos ({cart.length})</label>
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={item.product_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                      </div>
                      <button onClick={() => removeFromCart(idx)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer border-none bg-transparent">
                        <X className="w-4 h-4 text-slate-300 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 mb-0.5 block">Cantidad</label>
                        <input
                          type="number" min="1" value={item.quantity}
                          onChange={(e) => updateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30 text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 mb-0.5 block">Precio de venta</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input
                            type="number" min="0" step="0.01" value={item.sale_price}
                            onChange={(e) => updateCartItem(idx, 'sale_price', e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30"
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right pt-4">
                        <p className="text-sm font-bold text-slate-700">${(item.quantity * (parseFloat(item.sale_price) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-sm text-slate-400">Busca y agrega productos al carrito</p>
            </div>
          )}

          {/* Delivery + Warehouse */}
          {cart.length > 0 && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Tipo de entrega</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      deliveryType === 'pickup' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >🏪 Recoger en sitio</button>
                  <button
                    onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      deliveryType === 'delivery' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >🚚 Envío</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Método de pago</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >💵 Efectivo</button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      paymentMethod === 'transfer' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >🏦 Transferencia</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Bodega de salida</label>
                <select
                  value={selectedWarehouse || ''}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 cursor-pointer font-medium text-slate-700"
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas sobre esta venta..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Total</span>
              <span className="text-2xl font-black text-slate-900">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            {!isValid && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">⚠️ Todos los productos deben tener precio de venta</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full py-3.5 text-sm font-bold bg-[#6a9a04] text-white rounded-xl hover:bg-[#5a8403] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6a9a04]/20 border-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : '✓ Confirmar Venta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
