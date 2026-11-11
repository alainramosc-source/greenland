'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/client';
import { todayMX } from '@/utils/formatters';

export const OP_STATUS = {
  pending: { label: 'Pendiente', className: 'bg-amber-100/60 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', className: 'bg-blue-100/60 text-blue-700 border-blue-200' },
  in_fulfillment: { label: 'En Surtido', className: 'bg-purple-100/60 text-purple-700 border-purple-200' },
  shipped: { label: 'Enviado', className: 'bg-emerald-100/60 text-emerald-700 border-emerald-200' },
  closed: { label: 'Cerrado', className: 'bg-slate-100/60 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100/60 text-red-600 border-red-200' },
  rejected: { label: 'Rechazado', className: 'bg-orange-100/60 text-orange-600 border-orange-200' },
};

export const PAY_STATUS = {
  unpaid: { label: 'Por Cobrar', className: 'bg-red-50 text-red-600 border-red-200' },
  partial: { label: 'Parcial', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  paid: { label: 'Pagado', className: 'bg-green-50 text-green-600 border-green-200' },
};

export function usePedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('distributor'); // 'distributor' | 'envios'
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [showNewSale, setShowNewSale] = useState(false);
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [distPayments, setDistPayments] = useState([]);
  const [distContainerCharges, setDistContainerCharges] = useState(0);
  const supabase = createClient();

  const refreshDeliveryOrders = useCallback(async () => {
    const { data } = await supabase
      .from('lastmile_orders')
      .select('*')
      .eq('delivery_type', 'delivery')
      .order('created_at', { ascending: false });
    if (data) setDeliveryOrders(data);
  }, [supabase]);

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const actualRole = profile?.role;
      let adminFlag = actualRole === 'admin';
      let targetUserId = user.id;

      if (adminFlag && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
        const simulatedDistId = sessionStorage.getItem('test_view_distributor_id');
        if (simulatedDistId) {
          adminFlag = false;
          targetUserId = simulatedDistId;
        }
      }

      setIsAdmin(adminFlag);

      let query = supabase
        .from('orders')
        .select('*, profiles:distributor_id(full_name, email, city)')
        .order('created_at', { ascending: false });
      if (!adminFlag) {
        query = query.eq('distributor_id', targetUserId);
      }

      const { data } = await query;
      if (data) setOrders(data);

      // For distributor view: fetch payments and container charges (same logic as Dashboard)
      if (!adminFlag) {
        const [paymentsRes, receptionsRes] = await Promise.all([
          supabase.from('distributor_payments')
            .select('amount')
            .eq('distributor_id', targetUserId)
            .eq('status', 'approved'),
          supabase.from('container_receptions')
            .select('charge_amount')
            .eq('distributor_id', targetUserId)
            .eq('status', 'completed')
        ]);
        setDistPayments(paymentsRes.data || []);
        const totalCont = (receptionsRes.data || []).reduce((s, r) => s + Number(r.charge_amount || 0), 0);
        setDistContainerCharges(totalCont);
      }

      setLoading(false);
    }
    fetchOrders();

    async function fetchInitialDeliveryOrders() {
      const { data } = await supabase
        .from('lastmile_orders')
        .select('*')
        .eq('delivery_type', 'delivery')
        .order('created_at', { ascending: false });
      if (data) setDeliveryOrders(data);
      setDeliveryLoading(false);
    }
    fetchInitialDeliveryOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const safeSearch = searchTerm?.toLowerCase() || '';
      const matchSearch = !safeSearch ||
        (o.order_number && o.order_number.toLowerCase().includes(safeSearch)) ||
        (o.profiles?.full_name && o.profiles.full_name.toLowerCase().includes(safeSearch)) ||
        (o.profiles?.city && o.profiles.city.toLowerCase().includes(safeSearch));
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  const deleteOrder = useCallback(async (orderId, orderNumber) => {
    if (!window.confirm(`¿Eliminar pedido #${orderNumber} permanentemente?`)) return;
    const supabaseClient = createClient();
    await supabaseClient.from('order_items').delete().eq('order_id', orderId);
    const { error } = await supabaseClient.from('orders').delete().eq('id', orderId).select();
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    const { data: check } = await supabaseClient.from('orders').select('id').eq('id', orderId).maybeSingle();
    if (check) {
      alert('No se pudo eliminar el pedido. Permisos insuficientes.');
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const counts = useMemo(() => {
    const c = {};
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const totalAmount = useMemo(() => {
    return orders
      .filter(o => !['cancelled', 'rejected'].includes(o.status))
      .reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
  }, [orders]);

  const pendingPayment = useMemo(() => {
    if (!isAdmin) {
      const totalSpent = totalAmount + distContainerCharges;
      const totalPaid = distPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      return totalSpent - totalPaid;
    }
    return orders
      .filter(o => o.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(o.status))
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  }, [isAdmin, orders, totalAmount, distContainerCharges, distPayments]);

  const overdueOrders = useMemo(() => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    return orders.filter(o =>
      o.payment_status !== 'paid' &&
      o.status !== 'cancelled' &&
      o.status !== 'rejected' &&
      new Date(o.created_at) < fourteenDaysAgo
    );
  }, [orders]);

  const handleExportOrders = useCallback(() => {
    const rows = filteredOrders.map(o => ({
      'No. Pedido': o.order_number,
      'Fecha': new Date(o.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      'Distribuidor': o.profiles?.full_name || '',
      'Ciudad': o.profiles?.city || '',
      'Total': Number(o.total_amount || 0),
      'Estado': OP_STATUS[o.status]?.label || o.status,
      'Pago': PAY_STATUS[o.payment_status]?.label || o.payment_status || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos_${todayMX()}.xlsx`);
  }, [filteredOrders]);

  const handlePrintOrders = useCallback(async () => {
    const activeStatuses = ['pending', 'confirmed', 'in_fulfillment'];
    const printOrders = filteredOrders.filter(o => activeStatuses.includes(o.status));
    if (printOrders.length === 0) { alert('No hay pedidos activos para imprimir.'); return; }

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
  }, [filteredOrders, supabase, statusFilter]);

  return {
    supabase,
    orders,
    filteredOrders,
    loading,
    isAdmin,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    deliveryOrders,
    deliveryLoading,
    refreshDeliveryOrders,
    showNewSale,
    setShowNewSale,
    showExpressModal,
    setShowExpressModal,
    selectedDeliveryOrder,
    setSelectedDeliveryOrder,
    showSettleModal,
    setShowSettleModal,
    copiedToken,
    setCopiedToken,
    counts,
    totalAmount,
    pendingPayment,
    overdueOrders,
    deleteOrder,
    handleExportOrders,
    handlePrintOrders,
  };
}

