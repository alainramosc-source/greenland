'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Calendar, DollarSign, MapPin, FileText, CheckCircle, XCircle, Truck, PackageCheck, Loader2, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(234, 179, 8, 0.15)' },
  processing: { label: 'En Proceso', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
  shipped: { label: 'Enviado', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' },
  delivered: { label: 'Entregado', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled: { label: 'Cancelado', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const supabase = createClient();

  const fetchOrderDetails = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Check admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    setIsAdmin(profile?.role === 'admin');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:distributor_id(full_name, email, city, phone),
        order_items (
          *,
          products (
            name,
            sku,
            image_url,
            stock_quantity
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const handleConfirmPayment = async () => {
    if (!confirm('¿Confirmar pago y descontar inventario? Esta acción no se puede deshacer.')) return;
    setActionLoading('confirm');
    const { data, error } = await supabase.rpc('confirm_order_payment', { p_order_id: id });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  const handleUpdateStatus = async (newStatus, label) => {
    if (!confirm(`¿Cambiar estado a "${label}"?`)) return;
    setActionLoading(newStatus);
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: id,
      p_new_status: newStatus
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#ec5b13]" />
        <p className="font-medium">Cargando detalles del pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <p className="font-medium text-lg">No se encontró el pedido o no tienes permiso para verlo.</p>
        <Link href="/dashboard/pedidos" className="bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[#ec5b13]/20 transition-all flex items-center no-underline">
          Volver a Pedidos
        </Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <Link href="/dashboard/pedidos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium no-underline">
            <ArrowLeft size={16} />
            Volver a pedidos
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 m-0">Pedido #{order.order_number}</h1>
            <span
              className="px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm border"
              style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}40` }}
            >
              {sc.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (Order Items) */}
          <div className="flex-1">
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden p-6 mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6 pb-4 border-b border-slate-200">Productos en el Pedido</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Unitario</th>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Cantidad</th>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.order_items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200/50 shrink-0">
                              {item.products?.image_url ? (
                                <img src={item.products.image_url} alt={item.products?.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{item.products?.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">SKU: {item.products?.sku}</div>
                              {isAdmin && (
                                <div className="text-[11px] font-medium text-[#ec5b13] mt-0.5 bg-[#ec5b13]/10 inline-block px-1.5 py-0.5 rounded">
                                  Stock: {item.products?.stock_quantity} uds
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-medium text-slate-600">
                          ${Number(item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-center font-medium text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2.5 py-1 rounded-lg">
                            ${Number(item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="w-full lg:w-96 flex flex-col gap-6">
            {/* Distributor Info (admin only) */}
            {isAdmin && order.profiles && (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-200">
                  <User size={18} className="text-[#ec5b13]" /> Distribuidor
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="font-bold text-slate-900">{order.profiles.full_name || '—'}</div>
                  <div className="text-sm shadow-sm border border-slate-100 bg-white/50 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">@</span> {order.profiles.email}
                  </div>
                  {order.profiles.city && (
                    <div className="text-sm shadow-sm border border-slate-100 bg-white/50 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">📍</span> {order.profiles.city}
                    </div>
                  )}
                  {order.profiles.phone && (
                    <div className="text-sm shadow-sm border border-slate-100 bg-white/50 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">📱</span> {order.profiles.phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-200">Resumen</h3>

              <div className="flex gap-4 mb-5">
                <div className="mt-1 text-[#6a9a04] bg-[#6a9a04]/10 p-2 rounded-lg w-fit h-fit"><Calendar size={18} /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha del Pedido</label>
                  <div className="text-slate-800 font-medium">
                    {new Date(order.created_at).toLocaleDateString('es-MX')} {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-5">
                <div className="mt-1 text-[#ec5b13] bg-[#ec5b13]/10 p-2 rounded-lg w-fit h-fit"><DollarSign size={18} /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</label>
                  <div className="text-3xl font-black tracking-tight text-[#ec5b13]">
                    ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="flex gap-4 mb-5">
                  <div className="mt-1 text-slate-400 bg-slate-100 p-2 rounded-lg w-fit h-fit"><FileText size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notas</label>
                    <div className="text-sm text-slate-700 bg-slate-50/80 p-3 rounded-lg border border-slate-100 italic">
                      "{order.notes}"
                    </div>
                  </div>
                </div>
              )}

              {order.shipping_address && (
                <div className="flex gap-4">
                  <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-lg w-fit h-fit"><MapPin size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección de Envío</label>
                    <div className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-slate-100">
                      {order.shipping_address}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-200">Acciones</h3>

                {order.status === 'pending' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white px-5 py-3 rounded-xl font-bold font-sm shadow-md shadow-[#ec5b13]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleConfirmPayment}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'confirm' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      Confirmar Pago
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-3 rounded-xl font-bold font-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleUpdateStatus('cancelled', 'Cancelado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'cancelled' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                      Cancelar Pedido
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-1 font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">Al confirmar pago, el inventario se descontará automáticamente.</p>
                  </div>
                )}

                {order.status === 'processing' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-bold font-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleUpdateStatus('shipped', 'Enviado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'shipped' ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                      Marcar como Enviado
                    </button>
                  </div>
                )}

                {order.status === 'shipped' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-5 py-3 rounded-xl font-bold font-sm shadow-md shadow-[#6a9a04]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleUpdateStatus('delivered', 'Entregado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'delivered' ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}
                      Marcar como Entregado
                    </button>
                  </div>
                )}

                {(order.status === 'delivered' || order.status === 'cancelled') && (
                  <p className="text-sm italic text-center text-slate-500 py-3 bg-slate-50/50 rounded-lg border border-slate-100">
                    Este pedido ha alcanzado su estado final.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
