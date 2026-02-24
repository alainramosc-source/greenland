'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Package, Calendar, DollarSign, MapPin, FileText,
  CheckCircle, XCircle, Truck, PackageCheck, Loader2, User,
  AlertTriangle, X, Plus, Minus, CreditCard, ClipboardCheck,
  PackageOpen, Lock, Camera, Image, Trash2
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const OP_STATUS = {
  pending: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(234, 179, 8, 0.15)' },
  confirmed: { label: 'Confirmado', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  in_fulfillment: { label: 'En Surtido', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  shipped: { label: 'Enviado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  closed: { label: 'Cerrado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  rejected: { label: 'Rechazado', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
};

const PAY_STATUS = {
  unpaid: { label: 'Por Cobrar', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  partial: { label: 'Parcial', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  paid: { label: 'Pagado', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_method: 'transferencia', reference: '',
    payment_date: new Date().toISOString().split('T')[0], notes: ''
  });
  const [editingItems, setEditingItems] = useState({});
  const [evidence, setEvidence] = useState([]);
  const [evidenceTab, setEvidenceTab] = useState('embarque');
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const supabase = createClient();

  const fetchOrderDetails = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let admin = profile?.role === 'admin';
    let targetUserId = user.id;

    if (admin && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
      const simulatedDistId = sessionStorage.getItem('test_view_distributor_id');
      if (simulatedDistId) {
        admin = false;
        targetUserId = simulatedDistId;
      }
    }

    setIsAdmin(admin);

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
            stock_quantity,
            reserved_quantity
          )
        ),
        shipping_address:shipping_address_id(label, street, city, state, zip_code)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
    } else {
      if (!admin && data.distributor_id !== targetUserId) {
        router.push('/dashboard/pedidos');
        return;
      }
      setOrder(data);
    }

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsData) setPayments(paymentsData);

    // Fetch evidence
    const { data: evidenceData } = await supabase
      .from('order_evidence')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });
    if (evidenceData) setEvidence(evidenceData);

    setLoading(false);
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);
  // --- Helper: Send email after status change ---
  const sendStatusEmail = async (newStatus) => {
    if (!order) return;
    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_change',
          orderNumber: order.order_number,
          orderId: id,
          status: newStatus,
          distributorName: order.profiles?.full_name || 'Distribuidor',
          distributorEmail: order.profiles?.email,
          total: order.total_amount,
        }),
      });
    } catch (emailErr) { console.error('Email notification error:', emailErr); }
  };

  // --- Admin: Confirm Order ---
  const handleConfirmOrder = async () => {
    if (!confirm('¿Confirmar este pedido? Se reservará el inventario para los productos incluidos.')) return;
    setActionLoading('confirm');
    const { data, error } = await supabase.rpc('confirm_order', { p_order_id: id });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      await fetchOrderDetails();
      sendStatusEmail('confirmed');
    }
    setActionLoading(null);
  };

  // --- Admin: Update Status ---
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
      sendStatusEmail(newStatus);
    }
    setActionLoading(null);
  };

  // --- Admin: Reject ---
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor, ingresa un motivo de rechazo.');
      return;
    }
    setActionLoading('rejected');
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: id,
      p_new_status: 'rejected',
      p_rejection_reason: rejectionReason.trim()
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      setShowRejectModal(false);
      setRejectionReason('');
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  // --- Admin: Edit Item Quantity ---
  const handleUpdateQuantity = async (itemId, newQuantity) => {
    setActionLoading(`qty-${itemId}`);
    const { data, error } = await supabase.rpc('update_order_item_quantity', {
      p_order_id: id,
      p_item_id: itemId,
      p_new_quantity: newQuantity
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      await fetchOrderDetails();
    }
    setEditingItems(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    setActionLoading(null);
  };

  // --- Admin: Register Payment ---
  const handleRegisterPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }
    setActionLoading('payment');
    const { data, error } = await supabase.rpc('register_payment', {
      p_order_id: id,
      p_amount: Number(paymentForm.amount),
      p_payment_method: paymentForm.payment_method,
      p_reference: paymentForm.reference,
      p_payment_date: paymentForm.payment_date,
      p_notes: paymentForm.notes || null
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'transferencia', reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  // --- Evidence Upload ---
  const handleEvidenceUpload = async (files, type) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      for (const file of files) {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${id}/${type}/${timestamp}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('order-evidence')
          .upload(path, file, { contentType: file.type });
        if (uploadError) { alert('Error al subir: ' + uploadError.message); continue; }
        const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/order-evidence/${path}`;
        await supabase.from('order_evidence').insert({
          order_id: id, evidence_type: type, file_url: fileUrl,
          file_name: file.name, uploaded_by: user?.id
        });
      }
      await fetchOrderDetails();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setUploading(false);
  };

  const handleDeleteEvidence = async (ev) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    // Extract path from URL
    const urlParts = ev.file_url.split('/order-evidence/');
    if (urlParts.length > 1) {
      await supabase.storage.from('order-evidence').remove([urlParts[1]]);
    }
    await supabase.from('order_evidence').delete().eq('id', ev.id);
    await fetchOrderDetails();
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

  const sc = OP_STATUS[order.status] || OP_STATUS.pending;
  const ps = PAY_STATUS[order.payment_status] || PAY_STATUS.unpaid;
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = Number(order.total_amount) - totalPaid;

  return (
    <div className="relative">
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[450px] rounded-2xl shadow-2xl border border-white overflow-hidden mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Rechazar Pedido
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Esta acción rechazará el pedido <strong>#{order.order_number}</strong>{order.status === 'confirmed' ? ' y liberará el inventario reservado.' : '.'}</p>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Motivo del rechazo *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: Falta de documentación, error en cantidades..."
                  rows={3}
                  autoFocus
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 text-slate-800 outline-none resize-none shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowRejectModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >Cancelar</button>
                <button onClick={handleReject} disabled={!!actionLoading}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 cursor-pointer transition-all border-none disabled:opacity-50"
                >
                  {actionLoading === 'rejected' ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[500px] rounded-2xl shadow-2xl border border-white overflow-hidden mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#6a9a04]" /> Registrar Pago
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Saldo pendiente: <strong className="text-[#ec5b13]">${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Monto *</label>
                  <input type="number" step="0.01" value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Método</label>
                  <select value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="deposito">Depósito</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Referencia</label>
                  <input type="text" value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Folio bancario"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Fecha *</label>
                  <input type="date" value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas</label>
                <input type="text" value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >Cancelar</button>
                <button onClick={handleRegisterPayment} disabled={!!actionLoading}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/30 cursor-pointer transition-all border-none disabled:opacity-50"
                >
                  {actionLoading === 'payment' ? <Loader2 size={18} className="animate-spin" /> : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <Link href="/dashboard/pedidos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium no-underline">
            <ArrowLeft size={16} />
            Volver a pedidos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 m-0">Pedido #{order.order_number}</h1>
            {/* Operational Badge */}
            <span
              className="px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm border"
              style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}40` }}
            >
              {sc.label}
            </span>
            {/* Financial Badge */}
            <span
              className="px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm border"
              style={{ background: ps.bg, color: ps.color, borderColor: `${ps.color}40` }}
            >
              {ps.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Order Items */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden p-6 mb-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 m-0">Productos en el Pedido</h3>
                {isAdmin && order.status === 'pending' && (
                  <span className="text-xs font-bold text-[#ec5b13] bg-[#ec5b13]/10 px-3 py-1 rounded-full">
                    ✏️ Cantidades editables
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                      <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Unit.</th>
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
                                  Stock: {item.products?.stock_quantity} | Reservado: {item.products?.reserved_quantity || 0}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-medium text-slate-600">
                          ${Number(item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-center">
                          {isAdmin && order.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                              <button
                                onClick={() => {
                                  const newQty = (editingItems[item.id] ?? item.quantity) - 1;
                                  if (newQty <= 0) {
                                    if (confirm('¿Eliminar este producto del pedido?')) handleUpdateQuantity(item.id, 0);
                                  } else {
                                    setEditingItems(prev => ({ ...prev, [item.id]: newQty }));
                                  }
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#ec5b13] rounded transition-colors cursor-pointer border-none bg-transparent"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={editingItems[item.id] ?? item.quantity}
                                onChange={(e) => setEditingItems(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                onBlur={() => {
                                  const newQty = editingItems[item.id];
                                  if (newQty !== undefined && newQty !== item.quantity) {
                                    handleUpdateQuantity(item.id, newQty);
                                  }
                                }}
                                className="font-bold text-sm text-slate-700 w-12 text-center border-none outline-none bg-transparent"
                              />
                              <button
                                onClick={() => setEditingItems(prev => ({ ...prev, [item.id]: (prev[item.id] ?? item.quantity) + 1 }))}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#ec5b13] rounded transition-colors cursor-pointer border-none bg-transparent"
                              >
                                <Plus size={14} />
                              </button>
                              {editingItems[item.id] !== undefined && editingItems[item.id] !== item.quantity && (
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, editingItems[item.id])}
                                  disabled={actionLoading === `qty-${item.id}`}
                                  className="ml-1 px-2 py-1 bg-[#6a9a04] text-white rounded text-xs font-bold cursor-pointer border-none disabled:opacity-50"
                                >
                                  {actionLoading === `qty-${item.id}` ? '...' : '✓'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="font-medium text-slate-700">{item.quantity}</span>
                          )}
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

            {/* Rejection reason */}
            {order.status === 'rejected' && order.rejection_reason && (
              <div className="bg-orange-50/80 backdrop-blur-md border border-orange-200 shadow-sm rounded-2xl p-6 mb-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-orange-700 mb-2">
                  <AlertTriangle size={18} /> Motivo del Rechazo
                </h3>
                <p className="text-orange-800 text-sm italic m-0">&quot;{order.rejection_reason}&quot;</p>
              </div>
            )}

            {/* Evidence Section — visible when in_fulfillment, shipped, or closed */}
            {['in_fulfillment', 'shipped', 'closed'].includes(order.status) && (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden p-6 mb-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 m-0 flex items-center gap-2">
                    <Camera size={20} className="text-[#ec5b13]" /> Evidencias Fotográficas
                  </h3>
                  {evidence.filter(e => e.evidence_type === 'embarque').length >= 2 ? (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">✓ Requisito cumplido</span>
                  ) : (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">Mín. 2 fotos de embarque</span>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setEvidenceTab('embarque')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border-none ${evidenceTab === 'embarque'
                      ? 'bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    📦 Embarque ({evidence.filter(e => e.evidence_type === 'embarque').length})
                  </button>
                  <button
                    onClick={() => setEvidenceTab('guia')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border-none ${evidenceTab === 'guia'
                      ? 'bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    📄 Guía / Remisión ({evidence.filter(e => e.evidence_type === 'guia').length})
                  </button>
                </div>

                {/* Upload buttons — only when order is in_fulfillment (still in warehouse) */}
                {isAdmin && order.status === 'in_fulfillment' && (
                  <div className="flex gap-3 mb-6">
                    {/* Camera capture button — works on mobile/tablet */}
                    <label className="flex-1 flex items-center justify-center gap-3 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#ec5b13]/20 transition-all cursor-pointer border-none min-h-[60px]">
                      <Camera size={24} />
                      {uploading ? 'Subiendo...' : 'Tomar Foto'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => handleEvidenceUpload(e.target.files, evidenceTab)}
                      />
                    </label>
                    {/* Gallery upload button */}
                    <label className="flex-1 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 py-4 rounded-2xl font-bold text-base shadow-sm border border-slate-200 transition-all cursor-pointer min-h-[60px]">
                      <Image size={24} />
                      Subir de Galería
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => handleEvidenceUpload(e.target.files, evidenceTab)}
                      />
                    </label>
                  </div>
                )}

                {/* Photo Grid */}
                {(() => {
                  const filtered = evidence.filter(e => e.evidence_type === evidenceTab);
                  if (filtered.length === 0) return (
                    <div className="text-center py-10 text-slate-400">
                      <Camera size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium m-0">
                        {evidenceTab === 'embarque' ? 'No hay fotos de embarque' : 'No hay fotos de guía / remisión'}
                      </p>
                      {isAdmin && order.status === 'in_fulfillment' && (
                        <p className="text-sm m-0 mt-1">Usa los botones de arriba para tomar o subir fotos.</p>
                      )}
                    </div>
                  );
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filtered.map(ev => (
                        <div key={ev.id} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-square bg-slate-100">
                          <img
                            src={ev.file_url}
                            alt={ev.file_name || 'Evidencia'}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightboxImg(ev.file_url)}
                          />
                          {isAdmin && order.status === 'in_fulfillment' && (
                            <button
                              onClick={() => handleDeleteEvidence(ev)}
                              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                            <p className="text-[10px] text-white font-medium m-0 truncate">
                              {new Date(ev.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Lightbox */}
            {lightboxImg && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
                <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center cursor-pointer border-none z-10">
                  <X size={24} />
                </button>
                <img src={lightboxImg} alt="Evidencia" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              </div>
            )}

            {/* Payments Section (visible to all) */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 m-0 flex items-center gap-2">
                  <CreditCard size={20} className="text-[#6a9a04]" /> Pagos
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
                  >
                    <Plus size={16} /> Registrar Pago
                  </button>
                )}
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50/80 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-1">Total Pedido</p>
                  <p className="text-lg font-black text-slate-900 m-0">
                    ${Number(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-[#6a9a04]/5 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-[#6a9a04] uppercase tracking-wider m-0 mb-1">Pagado</p>
                  <p className="text-lg font-black text-[#6a9a04] m-0">
                    ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider m-0 mb-1 ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>Saldo</p>
                  <p className={`text-lg font-black m-0 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <p className="text-sm text-center text-slate-400 py-4 italic m-0">No hay pagos registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Método</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Referencia</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-sm text-slate-700">
                            {new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 text-sm text-slate-600 capitalize">{p.payment_method}</td>
                          <td className="py-3 text-sm text-slate-500 font-mono">{p.reference || '—'}</td>
                          <td className="py-3 text-right">
                            <span className="font-bold text-[#6a9a04]">
                              ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

              {order.confirmed_at && (
                <div className="flex gap-4 mb-5">
                  <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-lg w-fit h-fit"><ClipboardCheck size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirmado</label>
                    <div className="text-slate-800 font-medium">
                      {new Date(order.confirmed_at).toLocaleDateString('es-MX')} {new Date(order.confirmed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}

              {order.shipped_at && (
                <div className="flex gap-4 mb-5">
                  <div className="mt-1 text-purple-500 bg-purple-50 p-2 rounded-lg w-fit h-fit"><Truck size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Envío</label>
                    <div className="text-slate-800 font-medium">
                      {new Date(order.shipped_at).toLocaleDateString('es-MX')} {new Date(order.shipped_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}

              {order.delivered_at && (
                <div className="flex gap-4 mb-5">
                  <div className="mt-1 text-slate-500 bg-slate-100 p-2 rounded-lg w-fit h-fit"><Lock size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cierre Operativo</label>
                    <div className="text-slate-800 font-medium">
                      {new Date(order.delivered_at).toLocaleDateString('es-MX')} {new Date(order.delivered_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}

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
                      &quot;{order.notes}&quot;
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {(order.shipping_address || order.shipping_address_id) && (
                <div className="flex gap-4">
                  <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-lg w-fit h-fit"><MapPin size={18} /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección de Envío</label>
                    {order.shipping_address_id && order.shipping_address && typeof order.shipping_address === 'object' ? (
                      <div className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-slate-100">
                        <strong>{order.shipping_address.label}</strong><br />
                        {order.shipping_address.street}<br />
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-slate-100">
                        {order.shipping_address}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Actions — ONLY for admin users */}
            {isAdmin && (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-200">Acciones Operativas</h3>

                {order.status === 'pending' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md shadow-[#3b82f6]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
                      onClick={handleConfirmOrder}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'confirm' ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
                      Confirmar Pedido
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      onClick={() => setShowRejectModal(true)}
                      disabled={!!actionLoading}
                    >
                      <AlertTriangle size={18} /> Rechazar Pedido
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      onClick={() => handleUpdateStatus('cancelled', 'Cancelado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'cancelled' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                      Cancelar Pedido
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-1 font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      Al confirmar, se revisarán las cantidades y se reservará inventario.
                    </p>
                  </div>
                )}

                {order.status === 'confirmed' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md shadow-[#8b5cf6]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
                      onClick={() => handleUpdateStatus('in_fulfillment', 'En Surtido')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'in_fulfillment' ? <Loader2 size={18} className="animate-spin" /> : <PackageOpen size={18} />}
                      Pasar a Surtido
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      onClick={() => setShowRejectModal(true)}
                      disabled={!!actionLoading}
                    >
                      <AlertTriangle size={18} /> Rechazar (libera inventario)
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      onClick={() => handleUpdateStatus('cancelled', 'Cancelado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'cancelled' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                      Cancelar (libera inventario)
                    </button>
                  </div>
                )}

                {order.status === 'in_fulfillment' && (() => {
                  const embarqueCount = evidence.filter(e => e.evidence_type === 'embarque').length;
                  const canShip = embarqueCount >= 2;
                  return (
                    <div className="flex flex-col gap-3">
                      <button
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer ${canShip ? 'bg-[#10b981] hover:bg-[#10b981]/90 text-white shadow-[#10b981]/20' : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                          }`}
                        onClick={() => canShip && handleUpdateStatus('shipped', 'Enviado')}
                        disabled={!!actionLoading || !canShip}
                      >
                        {actionLoading === 'shipped' ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                        Marcar como Enviado
                      </button>
                      {!canShip && (
                        <p className="text-xs text-center text-orange-600 font-medium bg-orange-50 p-2 rounded-lg border border-orange-200 m-0">
                          📸 Sube mín. 2 fotos de embarque para habilitar ({embarqueCount}/2)
                        </p>
                      )}
                    </div>
                  );
                })()}

                {order.status === 'shipped' && (
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
                      onClick={() => handleUpdateStatus('closed', 'Cerrado')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'closed' ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                      Cerrar Pedido
                    </button>
                  </div>
                )}

                {['closed', 'cancelled', 'rejected'].includes(order.status) && (
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
