'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, CircleDollarSign, Clock, CheckCircle,
  TrendingUp, TrendingDown, Filter, Download, MoreVertical,
  ChevronLeft, ChevronRight, Eye, Package, Plus
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#9ca3af', bg: 'rgba(107, 114, 128, 0.1)', shadow: 'none', border: 'rgba(107, 114, 128, 0.3)' },
  processing: { label: 'Procesando', color: '#6a9a04', bg: 'rgba(106, 154, 4, 0.1)', shadow: 'none', border: 'rgba(106, 154, 4, 0.3)' },
  shipped: { label: 'Enviado', color: '#dee24b', bg: 'rgba(222, 226, 75, 0.1)', shadow: '0 0 10px rgba(222, 226, 75, 0.2)', border: 'rgba(222, 226, 75, 0.3)' },
  delivered: { label: 'Completado', color: '#6a9a04', bg: 'rgba(106, 154, 4, 0.1)', shadow: 'none', border: 'rgba(106, 154, 4, 0.3)' },
  cancelled: { label: 'Cancelado', color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'none', border: 'rgba(239, 68, 68, 0.3)' },
};

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

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);

      let query = supabase.from('orders').select('*, profiles:distributor_id(full_name, email, city)').order('created_at', { ascending: false });
      if (!admin) query = query.eq('distributor_id', user.id);

      const { data } = await query;
      if (data) setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const totalAmount = orders.reduce((acc, order) => acc + Number(order.total_amount), 0);

  return (
    <div className="pedidos-container fade-in">
      {/* KPI Stats Row */}
      <div className="kpi-grid">
        {/* Card 1 */}
        <div className="kpi-card group">
          <div className="kpi-bg-icon">
            <ShoppingCart size={64} className="icon-primary" />
          </div>
          <p className="kpi-title">Total Pedidos</p>
          <div className="kpi-value-row">
            <h3 className="kpi-value">{orders.length}</h3>
            <span className="kpi-badge up">
              <TrendingUp size={12} style={{ marginRight: 4 }} /> +12%
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="kpi-card group">
          <div className="kpi-bg-icon">
            <CircleDollarSign size={64} className="icon-white" />
          </div>
          <p className="kpi-title">Ingresos Totales</p>
          <div className="kpi-value-row">
            <h3 className="kpi-value">${totalAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</h3>
            <span className="kpi-badge up">
              <TrendingUp size={12} style={{ marginRight: 4 }} /> +5.3%
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="kpi-card group">
          <div className="kpi-bg-icon">
            <Clock size={64} className="icon-primary" />
          </div>
          <p className="kpi-title">En Proceso</p>
          <div className="kpi-value-row">
            <h3 className="kpi-value">{counts['processing'] || 0}</h3>
            {counts['processing'] > 0 ? (
              <span className="kpi-badge up">
                <TrendingUp size={12} style={{ marginRight: 4 }} /> +
              </span>
            ) : (
              <span className="kpi-badge down">
                <TrendingDown size={12} style={{ marginRight: 4 }} /> -
              </span>
            )}
          </div>
        </div>

        {/* Card 4 */}
        <div className="kpi-card group">
          <div className="kpi-bg-icon">
            <CheckCircle size={64} className="icon-corporate" />
          </div>
          <p className="kpi-title">Completados</p>
          <div className="kpi-value-row">
            <h3 className="kpi-value">{counts['delivered'] || 0}</h3>
            <span className="kpi-badge up">
              <TrendingUp size={12} style={{ marginRight: 4 }} /> +8%
            </span>
          </div>
        </div>
      </div>

      {/* Main Glass Table Container */}
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h3>Pedidos Recientes</h3>
            <p>Gestión y seguimiento de envíos actuales.</p>
          </div>
          <div className="table-actions">
            <Link href="/dashboard/pedidos/nuevo" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#6a9a04', color: '#fff', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s', textDecoration: 'none' }}>
              <Plus size={18} /> Crear Pedido
            </Link>
            <button className="btn-glass" onClick={() => setStatusFilter(statusFilter === 'all' ? 'processing' : 'all')}>
              <Filter size={18} /> Filtros {statusFilter !== 'all' && '(Activo)'}
            </button>
            <button className="btn-glass">
              <Download size={18} /> Exportar
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>ID</th>
                <th>Concepto / Cliente</th>
                <th>Fecha</th>
                <th className="td-right">Total</th>
                <th className="td-center">Estado</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="td-center py-4 text-muted">Cargando pedidos...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="td-center py-4 text-muted">No se encontraron pedidos.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={order.id} className="group-row">
                      <td className="td-id">#{order.order_number}</td>
                      <td>
                        <div className="td-product">
                          <div className="td-img-box">
                            <Package size={20} color="#cbd5e1" />
                          </div>
                          <div>
                            <p className="td-prod-name">{isAdmin ? (order.profiles?.full_name || order.profiles?.email || 'Desconocido') : 'Mi Pedido de Reposición'}</p>
                            <p className="td-prod-sub">{isAdmin ? (order.profiles?.city || 'Sin especificar') : 'Inventario General'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(order.created_at).toLocaleDateString('es-MX')}</td>
                      <td className="td-right td-amount">
                        ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-center">
                        <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, boxShadow: sc.shadow }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="td-right">
                        <Link href={`/dashboard/pedidos/${order.id}`} className="btn-icon-glass" title="Ver detalle">
                          <Eye size={20} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p className="footer-text">Mostrando <span>{filteredOrders.length}</span> pedidos</p>
          <div className="pagination">
            <button className="btn-icon-glass"><ChevronLeft size={18} /></button>
            <button className="btn-icon-glass"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pedidos-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .kpi-card {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1.5rem;
          border-radius: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        .kpi-bg-icon {
          position: absolute;
          top: -0.5rem;
          right: 0;
          padding: 1rem;
          opacity: 0.05;
          transition: opacity 0.3s;
        }
        .kpi-card:hover .kpi-bg-icon { opacity: 0.15; }
        
        .icon-primary { color: #dee24b; }
        .icon-corporate { color: #6a9a04; }
        .icon-white { color: #FFFFFF; }

        .kpi-title {
          color: #747474;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
          z-index: 1;
        }

        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          z-index: 1;
        }

        .kpi-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .kpi-badge {
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
        }
        .kpi-badge.up {
          background: rgba(106, 154, 4, 0.1);
          color: #6a9a04;
        }
        .kpi-badge.down {
          background: rgba(244, 63, 94, 0.1);
          color: #fb7185;
        }

        /* Table Panel */
        .table-panel {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          min-height: 500px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .table-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
        }

        .table-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .table-header p {
          font-size: 0.875rem;
          color: #747474;
          margin: 0.25rem 0 0 0;
        }

        .table-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-glass {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          cursor: pointer;
        }
        .btn-glass:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .table-responsive {
          flex: 1;
          overflow-x: auto;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-table th {
          padding: 1rem 1.5rem;
          background: rgba(0, 0, 0, 0.4);
          color: #747474;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: sticky;
          top: 0;
          backdrop-filter: blur(4px);
          z-index: 10;
        }

        .orders-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .group-row:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .td-id {
          color: #dee24b !important;
          font-weight: 600;
        }

        .td-product {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .td-img-box {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .td-prod-name {
          color: #FFFFFF;
          font-weight: 500;
          margin: 0 0 0.125rem 0;
        }

        .td-prod-sub {
          color: #747474;
          font-size: 0.75rem;
          margin: 0;
        }

        .td-amount {
          font-weight: 600;
          color: #FFFFFF !important;
        }

        .td-center {
          text-align: center;
        }

        .td-right {
          text-align: right;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn-icon-glass {
          padding: 0.375rem;
          border-radius: 0.375rem;
          background: transparent;
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
        }
        .btn-icon-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }

        .table-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
        }

        .footer-text {
          font-size: 0.875rem;
          color: #747474;
          margin: 0;
        }

        .footer-text span {
          color: #FFFFFF;
          font-weight: 600;
        }

        .pagination {
          display: flex;
          gap: 0.5rem;
        }
        
        .py-4 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
        .text-muted { color: #747474; }
      `}</style>
    </div>
  );
}
