'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#dee24b', bg: 'rgba(222, 226, 75, 0.1)', shadow: '0 0 10px rgba(222, 226, 75, 0.3)' },
  processing: { label: 'En Proceso', color: '#FFFFFF', bg: 'rgba(106, 154, 4, 0.4)', shadow: '0 0 10px rgba(106, 154, 4, 0.4)' },
  shipped: { label: 'Enviado', color: '#dee24b', bg: 'rgba(222, 226, 75, 0.2)', shadow: '0 0 12px rgba(222, 226, 75, 0.4)' },
  delivered: { label: 'Entregado', color: '#6a9a04', bg: 'rgba(106, 154, 4, 0.2)', shadow: '0 0 12px rgba(106, 154, 4, 0.4)' },
  cancelled: { label: 'Cancelado', color: '#747474', bg: 'rgba(116, 116, 116, 0.1)', shadow: 'none' },
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
                      <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}`, boxShadow: sc.shadow }}>
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
          color: #FFFFFF;
          margin: 0;
        }
        .subtitle {
          color: #747474;
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
          background: rgba(116, 116, 116, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(116, 116, 116, 0.3);
          color: #FFFFFF;
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .filter-tab:hover {
          background: rgba(116, 116, 116, 0.25);
          border-color: rgba(222, 226, 75, 0.5);
          color: #dee24b;
          box-shadow: 0 0 15px rgba(222, 226, 75, 0.15);
        }
        .filter-tab.active {
          background: rgba(106, 154, 4, 0.25);
          color: #dee24b;
          border-color: #6a9a04;
          font-weight: 600;
          box-shadow: 0 0 20px rgba(106, 154, 4, 0.2);
        }
        .filter-tab.active .tab-count {
          background: #dee24b;
          color: #000000;
        }
        .tab-count {
          background: rgba(116, 116, 116, 0.4);
          padding: 0.1rem 0.6rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #FFFFFF;
          transition: all 0.3s;
        }
        .empty-state {
          text-align: center;
          padding: 5rem 1rem;
          color: #747474;
          font-size: 1.1rem;
        }
        .orders-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          color: #FFFFFF;
        }
        .orders-table th {
          text-align: left;
          padding: 1.25rem 1rem;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          border-bottom: 1px solid rgba(116, 116, 116, 0.4);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .orders-table th:first-child { border-top-left-radius: 12px; }
        .orders-table th:last-child { border-top-right-radius: 12px; }
        .orders-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(116, 116, 116, 0.2);
          font-size: 0.95rem;
          transition: background-color 0.2s;
        }
        .orders-table tr:hover td {
           background-color: rgba(222, 226, 75, 0.05);
        }
        .orders-table tr:last-child td {
           border-bottom: none;
        }
        .order-number {
          font-weight: 700;
          color: #dee24b;
          font-size: 1.05rem;
        }
        .amount {
          font-weight: 700;
          color: #FFFFFF;
          font-size: 1.05rem;
        }
        .status-badge {
          padding: 0.4rem 1rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          backdrop-filter: blur(4px);
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(116, 116, 116, 0.2);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(116, 116, 116, 0.4);
          color: #FFFFFF;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-action:hover {
          background: rgba(106, 154, 4, 0.8);
          border-color: #dee24b;
          color: #FFFFFF;
          box-shadow: 0 0 15px rgba(106, 154, 4, 0.4);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
