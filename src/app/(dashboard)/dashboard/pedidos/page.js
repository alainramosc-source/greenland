'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(234, 179, 8, 0.15)' },
  processing: { label: 'En Proceso', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
  shipped: { label: 'Enviado', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' },
  delivered: { label: 'Entregado', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled: { label: 'Cancelado', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
};

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'processing', label: 'En Proceso' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const admin = profile?.role === 'admin';
      setIsAdmin(admin);

      // Fetch orders — admin sees all, distributor sees own
      let query = supabase
        .from('orders')
        .select('*, profiles:distributor_id(full_name, email, city)')
        .order('created_at', { ascending: false });

      if (!admin) {
        query = query.eq('distributor_id', user.id);
      }

      const { data } = await query;
      if (data) setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  // Count per status for badges
  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  return (
    <div className="pedidos-container">
      <div className="page-header">
        <div>
          <h1>{isAdmin ? 'Gestión de Pedidos' : 'Mis Pedidos'}</h1>
          {isAdmin && <p className="subtitle">Administra todos los pedidos de distribuidores</p>}
        </div>
        {!isAdmin && (
          <Link href="/dashboard/pedidos/nuevo" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} />
            Nuevo Pedido
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            className={`filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            {tab.key !== 'all' && counts[tab.key] > 0 && (
              <span className="tab-count">{counts[tab.key]}</span>
            )}
            {tab.key === 'all' && (
              <span className="tab-count">{orders.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div className="text-center text-muted">Cargando pedidos...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>{statusFilter === 'all' ? 'No hay pedidos.' : `No hay pedidos con status "${FILTER_TABS.find(t => t.key === statusFilter)?.label}".`}</p>
            {!isAdmin && statusFilter === 'all' && (
              <Link href="/dashboard/pedidos/nuevo" className="btn btn-outline-light btn-sm mt-4" style={{ display: 'inline-block', textDecoration: 'none' }}>Crear mi primer pedido</Link>
            )}
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                {isAdmin && <th>Distribuidor</th>}
                {isAdmin && <th>Ciudad</th>}
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={order.id}>
                    <td className="order-number">#{order.order_number}</td>
                    <td>{new Date(order.created_at).toLocaleDateString('es-MX')}</td>
                    {isAdmin && <td>{order.profiles?.full_name || order.profiles?.email || '—'}</td>}
                    {isAdmin && <td>{order.profiles?.city || '—'}</td>}
                    <td>
                      <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="amount">${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <Link href={`/dashboard/pedidos/${order.id}`} className="btn-action" title="Ver detalle">
                        <Eye size={16} /> Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .pedidos-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .page-header h1 {
          font-size: 1.75rem;
          color: var(--color-text-main);
          margin: 0;
        }
        .subtitle {
          color: var(--color-text-muted);
          margin: 0.25rem 0 0;
          font-size: 0.9rem;
        }
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .filter-tab {
          background: white;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .filter-tab:hover {
          background: var(--color-bg-alt);
          color: var(--color-text-main);
          border-color: var(--color-primary);
        }
        .filter-tab.active {
          background: var(--color-primary);
          color: #0d351b;
          border-color: var(--color-primary);
          font-weight: 600;
        }
        .filter-tab.active .tab-count {
          background: rgba(0,0,0,0.1);
          color: inherit;
        }
        .tab-count {
          background: var(--color-bg-alt);
          padding: 0.1rem 0.5rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--color-text-muted);
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          color: var(--color-text-main);
        }
        .orders-table th {
          text-align: left;
          padding: 1rem;
          background-color: var(--color-bg-alt);
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-weight: 600;
          font-size: 0.85rem;
        }
        .orders-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--color-bg-alt);
          font-size: 0.95rem;
        }
        .orders-table tr:hover td {
           background-color: var(--color-bg-surface);
        }
        .order-number {
          font-weight: 600;
          color: var(--color-primary-dark);
        }
        .amount {
          font-weight: 600;
        }
        .status-badge {
          padding: 0.25rem 0.65rem;
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--color-bg-alt);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.82rem;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background: var(--color-accent-bg);
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
        }
      `}</style>
    </div>
  );
}
