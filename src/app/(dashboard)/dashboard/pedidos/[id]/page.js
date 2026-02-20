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
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando detalles del pedido...</p>
        <style jsx>{`
          .loading-container { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; color:var(--color-text-muted); gap:1rem; }
          .spinner { border:3px solid rgba(255,255,255,0.1); border-left-color:var(--color-primary); border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite; }
          @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        `}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error-container">
        <p>No se encontró el pedido o no tienes permiso para verlo.</p>
        <Link href="/dashboard/pedidos" className="btn btn-primary">Volver a Pedidos</Link>
        <style jsx>{`
          .error-container { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; color:var(--color-text-muted); gap:1rem; }
        `}</style>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <div className="details-container">
      <div className="page-header">
        <Link href="/dashboard/pedidos" className="back-link">
          <ArrowLeft size={20} />
          Volver
        </Link>
        <div className="header-title">
          <h1>Pedido #{order.order_number}</h1>
          <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
            {sc.label}
          </span>
        </div>
      </div>

      <div className="details-grid">
        {/* Order Items */}
        <div className="main-content">
          <div className="glass-panel items-list">
            <h3>Productos en el Pedido</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio Unitario</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="product-info">
                        <div className="product-thumb">
                          {item.products?.image_url ? (
                            <img src={item.products.image_url} alt={item.products?.name} />
                          ) : (
                            <Package size={24} color="#aaa" />
                          )}
                        </div>
                        <div>
                          <div className="product-name">{item.products?.name}</div>
                          <div className="product-sku">SKU: {item.products?.sku}</div>
                          {isAdmin && (
                            <div className="product-stock">Stock: {item.products?.stock_quantity} uds</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>${Number(item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td>{item.quantity}</td>
                    <td className="subtotal">${Number(item.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar-info">
          {/* Distributor Info (admin only) */}
          {isAdmin && order.profiles && (
            <div className="glass-panel summary-card">
              <h3><User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />Distribuidor</h3>
              <div className="dist-info">
                <div className="dist-name">{order.profiles.full_name || '—'}</div>
                <div className="dist-detail">{order.profiles.email}</div>
                {order.profiles.city && <div className="dist-detail">📍 {order.profiles.city}</div>}
                {order.profiles.phone && <div className="dist-detail">📱 {order.profiles.phone}</div>}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="glass-panel summary-card">
            <h3>Resumen</h3>

            <div className="summary-row date">
              <div className="icon"><Calendar size={18} /></div>
              <div>
                <label>Fecha del Pedido</label>
                <div>{new Date(order.created_at).toLocaleDateString('es-MX')} {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            <div className="summary-row total">
              <div className="icon"><DollarSign size={18} /></div>
              <div>
                <label>Total</label>
                <div className="amount">${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {order.notes && (
              <div className="summary-row notes">
                <div className="icon"><FileText size={18} /></div>
                <div>
                  <label>Notas</label>
                  <div>{order.notes}</div>
                </div>
              </div>
            )}

            {order.shipping_address && (
              <div className="summary-row address">
                <div className="icon"><MapPin size={18} /></div>
                <div>
                  <label>Dirección de Envío</label>
                  <div>{order.shipping_address}</div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="glass-panel summary-card actions-card">
              <h3>Acciones</h3>

              {order.status === 'pending' && (
                <div className="action-buttons">
                  <button
                    className="btn-action-lg confirm"
                    onClick={handleConfirmPayment}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'confirm' ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />}
                    Confirmar Pago
                  </button>
                  <button
                    className="btn-action-lg cancel"
                    onClick={() => handleUpdateStatus('cancelled', 'Cancelado')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'cancelled' ? <Loader2 size={18} className="spin" /> : <XCircle size={18} />}
                    Cancelar Pedido
                  </button>
                  <p className="action-hint">Al confirmar pago, el inventario se descontará automáticamente.</p>
                </div>
              )}

              {order.status === 'processing' && (
                <div className="action-buttons">
                  <button
                    className="btn-action-lg ship"
                    onClick={() => handleUpdateStatus('shipped', 'Enviado')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'shipped' ? <Loader2 size={18} className="spin" /> : <Truck size={18} />}
                    Marcar como Enviado
                  </button>
                </div>
              )}

              {order.status === 'shipped' && (
                <div className="action-buttons">
                  <button
                    className="btn-action-lg deliver"
                    onClick={() => handleUpdateStatus('delivered', 'Entregado')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'delivered' ? <Loader2 size={18} className="spin" /> : <PackageCheck size={18} />}
                    Marcar como Entregado
                  </button>
                </div>
              )}

              {(order.status === 'delivered' || order.status === 'cancelled') && (
                <p className="action-hint final">Este pedido ha alcanzado su estado final.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .details-container { max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 2rem; }
        .back-link { display:inline-flex; align-items:center; gap:0.5rem; color:#747474; text-decoration:none; margin-bottom:1rem; font-size:0.9rem; transition:color 0.2s; }
        .back-link:hover { color: #FFFFFF; }
        .header-title { display:flex; align-items:center; gap:1.5rem; }
        .header-title h1 { font-size:2rem; margin:0; color:#FFFFFF; }
        .status-badge { padding:0.3rem 0.85rem; border-radius:99px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; }
        .details-grid { display:grid; grid-template-columns:1fr 380px; gap:2rem; }
        .glass-panel { padding:1.5rem; }
        .items-list h3, .summary-card h3 { margin:0 0 1.5rem; font-size:1.1rem; color:#FFFFFF; border-bottom:1px solid rgba(116, 116, 116, 0.4); padding-bottom:0.75rem; }
        .items-table { width:100%; border-collapse:collapse; color:#FFFFFF; }
        .items-table th { text-align:left; padding:0.75rem; color:#747474; font-weight:500; font-size:0.85rem; border-bottom:1px solid rgba(116, 116, 116, 0.4); }
        .items-table td { padding:1rem 0.75rem; border-bottom:1px solid rgba(116, 116, 116, 0.4); vertical-align:middle; }
        .product-info { display:flex; align-items:center; gap:1rem; }
        .product-thumb { width:48px; height:48px; background:rgba(116, 116, 116, 0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .product-thumb img { width:100%; height:100%; object-fit:cover; }
        .product-name { font-weight:500; color:#FFFFFF; }
        .product-sku { font-size:0.75rem; color:#747474; }
        .product-stock { font-size:0.72rem; color:#dee24b; margin-top:2px; }
        .subtotal { font-weight:600; color:#6a9a04; }

        /* Distributor Info */
        .dist-info { display:flex; flex-direction:column; gap:0.35rem; }
        .dist-name { font-weight:600; color:#FFFFFF; font-size:1rem; }
        .dist-detail { color:#747474; font-size:0.88rem; }

        /* Summary */
        .summary-card + .summary-card { margin-top: 1rem; }
        .summary-row { display:flex; gap:1rem; margin-bottom:1.5rem; }
        .summary-row .icon { color:#6a9a04; margin-top:0.25rem; }
        .summary-row label { display:block; font-size:0.8rem; color:#747474; margin-bottom:0.25rem; }
        .summary-row div:last-child { color:#FFFFFF; font-size:0.95rem; }
        .summary-row.total .amount { font-size:1.5rem; font-weight:700; color:#6a9a04; }

        /* Admin Action Buttons */
        .actions-card { border-color: rgba(116, 116, 116, 0.4); }
        .action-buttons { display:flex; flex-direction:column; gap:0.75rem; }
        .btn-action-lg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.85rem 1.2rem;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s;
          width: 100%;
        }
        .btn-action-lg:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-action-lg.confirm { background: #22c55e; color: white; }
        .btn-action-lg.confirm:hover:not(:disabled) { background: #16a34a; }
        .btn-action-lg.cancel { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
        .btn-action-lg.cancel:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
        .btn-action-lg.ship { background: #3b82f6; color: white; }
        .btn-action-lg.ship:hover:not(:disabled) { background: #2563eb; }
        .btn-action-lg.deliver { background: #10b981; color: white; }
        .btn-action-lg.deliver:hover:not(:disabled) { background: #059669; }
        .action-hint { font-size:0.8rem; color:var(--color-text-muted); margin:0.5rem 0 0; text-align:center; }
        .action-hint.final { font-style:italic; padding: 1rem 0; }

        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        :global(.spin) { animation: spin 1s linear infinite; }

        @media (max-width: 900px) {
          .details-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
