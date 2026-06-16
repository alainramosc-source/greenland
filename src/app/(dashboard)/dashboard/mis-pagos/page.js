'use client';
import { createClient } from '@/utils/supabase/client';
import { validateAmount, sanitizeText } from '@/utils/sanitize';
import { useEffect, useState } from 'react';
import {
  DollarSign, CreditCard, Clock, CheckCircle, XCircle, Upload,
  Loader2, Plus, FileText, AlertTriangle, ChevronDown, ChevronUp, Eye,
  Copy, Building2, Mail, Shield
} from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

const STATUS_MAP = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  approved: { label: 'Aprobado', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

export default function MisPagosPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [balance, setBalance] = useState({ total_orders: 0, total_paid: 0, balance: 0 });
  const [clientNumber, setClientNumber] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [form, setForm] = useState({
    amount: '', payment_method: 'transferencia', reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '', receipt_url: ''
  });
  const [allocations, setAllocations] = useState([]); // [{order_id, amount}]
  const [receptions, setReceptions] = useState([]); // container receptions for PRO
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check Vista Distribuidor mode
    let targetUserId = user.id;
    if (typeof window !== 'undefined') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin' && sessionStorage.getItem('test_view_role') === 'distributor') {
        const simId = sessionStorage.getItem('test_view_distributor_id');
        if (simId) {
          targetUserId = simId;
          setIsSimulating(true);
        }
      }
    }

    // Profile of target user
    const { data: targetProfile } = await supabase.from('profiles').select('client_number, full_name').eq('id', targetUserId).single();
    if (targetProfile?.client_number) setClientNumber(targetProfile.client_number);

    // Payments
    const { data: payData } = await supabase
      .from('distributor_payments')
      .select('*, orders(id, total_amount)')
      .eq('distributor_id', targetUserId)
      .order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    // Orders with payment info for balance calculation
    const { data: ordData } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, payment_status, created_at, order_payments(amount)')
      .eq('distributor_id', targetUserId)
      .not('status', 'in', '("cancelled","rejected")')
      .order('created_at', { ascending: false });
    if (ordData) {
      // Calculate paid amount per order
      ordData.forEach(o => {
        o.total_paid = (o.order_payments || []).reduce((s, p) => s + Number(p.amount), 0);
        o.balance = Number(o.total_amount) - o.total_paid;
      });
      setOrders(ordData);
    }

    // Fetch container receptions (charges to PRO)
    const { data: recData } = await supabase
      .from('container_receptions')
      .select('id, container_label, reception_date, charge_amount, status, warehouse:warehouses(name)')
      .eq('distributor_id', targetUserId)
      .eq('status', 'completed')
      .order('reception_date', { ascending: false });
    setReceptions(recData || []);

    // Calculate balance (orders + containers - payments)
    const approved = (payData || []).filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0);
    const totalOrders = (ordData || []).reduce((s, o) => s + Number(o.total_amount), 0);
    const totalContainers = (recData || []).reduce((s, r) => s + Number(r.charge_amount || 0), 0);
    setBalance({ total_orders: totalOrders, total_containers: totalContainers, total_paid: approved, balance: (totalOrders + totalContainers) - approved });

    setLoading(false);
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setUploadingReceipt(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('payment-receipts').upload(path, file, { contentType: file.type });
    if (error) {
      alert('Error subiendo comprobante: ' + error.message);
      setUploadingReceipt(false);
      return;
    }
    // Store just the path — signed URLs will be generated on-the-fly when viewing
    setForm(f => ({ ...f, receipt_url: path }));
    setUploadingReceipt(false);
  };

  // Generate signed URL for receipt viewing (handles both old signed URLs and new paths)
  const handleViewReceipt = async (receiptUrl) => {
    if (!receiptUrl) return;
    // If it's already a signed URL (old data) or a full URL, extract path
    let storagePath = receiptUrl;
    const match = receiptUrl.match(/payment-receipts\/([^?]+)/);
    if (match) {
      storagePath = match[1];
    }
    const { data } = await supabase.storage.from('payment-receipts').createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) {
      setLightboxImg(data.signedUrl);
    } else {
      // Fallback: try opening the URL directly
      setLightboxImg(receiptUrl);
    }
  };

  // Toggle order in allocations
  const toggleOrderAllocation = (orderId) => {
    setAllocations(prev => {
      const exists = prev.find(a => a.order_id === orderId);
      if (exists) return prev.filter(a => a.order_id !== orderId);
      return [...prev, { order_id: orderId, amount: '' }];
    });
  };

  const updateAllocationAmount = (orderId, amount) => {
    setAllocations(prev => prev.map(a => a.order_id === orderId ? { ...a, amount } : a));
  };

  const allocTotal = Math.round(allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0) * 100) / 100;

  const handleSubmit = async () => {
    const validAmount = validateAmount(form.amount);
    if (!validAmount) { alert('Ingresa un monto válido (mayor a 0)'); return; }
    if (allocations.length === 0) { alert('Selecciona al menos un pedido o saldo de contenedores para aplicar el pago'); return; }

    // Validate each allocation has an amount
    for (const alloc of allocations) {
      if (!alloc.amount || Number(alloc.amount) <= 0) {
        alert('Ingresa el monto a aplicar para cada pedido seleccionado');
        return;
      }
    }

    // Validate allocations don't exceed each order's remaining balance
    for (const alloc of allocations) {
      if (alloc.order_id === '__containers__') continue;
      const order = orders.find(o => o.id === alloc.order_id);
      if (order && Number(alloc.amount) > order.balance + 0.01) {
        alert(`No puedes aplicar $${Number(alloc.amount).toLocaleString('es-MX', {minimumFractionDigits:2})} al pedido #${order.order_number || 'N/A'} porque su saldo pendiente es solo $${order.balance.toLocaleString('es-MX', {minimumFractionDigits:2})}`);
        return;
      }
    }

    // Validate total allocations EXACTLY match payment amount — every peso must be applied
    if (Math.round(allocTotal * 100) !== Math.round(validAmount * 100)) {
      alert(`El total aplicado ($${allocTotal.toFixed(2)}) debe ser exactamente igual al monto del pago ($${validAmount.toFixed(2)}). Cada peso debe estar asignado a un pedido.`);
      return;
    }

    setSubmitting(true);
    const allocsPayload = allocations
      .filter(a => a.order_id !== '__containers__')
      .map(a => ({ order_id: a.order_id, amount: Number(a.amount) }));
    const containerAlloc = allocations.find(a => a.order_id === '__containers__');
    const hasOrders = allocsPayload.length > 0;
    const hasContainers = !!containerAlloc;
    const paymentType = hasContainers && hasOrders ? 'mixed' : hasContainers ? 'containers' : 'order';
    const containerAmt = containerAlloc ? Number(containerAlloc.amount) : 0;

    const { data, error } = await supabase.rpc('submit_distributor_payment', {
      p_amount: validAmount,
      p_payment_method: form.payment_method,
      p_reference: sanitizeText(form.reference, 200) || null,
      p_payment_date: form.payment_date,
      p_receipt_url: form.receipt_url || null,
      p_notes: sanitizeText(form.notes, 500) || (containerAlloc ? `Incluye $${Number(containerAlloc.amount).toLocaleString('es-MX', {minimumFractionDigits:2})} aplicado a saldo de contenedores` : null),
      p_order_id: allocsPayload[0]?.order_id || null,
      p_allocations: allocsPayload.length > 0 ? allocsPayload : [{ order_id: null, amount: validAmount }],
      p_payment_type: paymentType,
      p_container_amount: containerAmt
    });
    setSubmitting(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && !data.success) { alert(data.error || 'Error al registrar el pago. Contacta al administrador.'); return; }

    setShowModal(false);
    setForm({ amount: '', payment_method: 'transferencia', reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '', receipt_url: '' });
    setAllocations([]);
    fetchData();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
    </div>
  );

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const recentPayments = payments.slice(0, 5);
  const olderPayments = payments.slice(5);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis Pagos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tu número de cliente: <span className="font-bold text-[#6a9a04]">{clientNumber || '—'}</span>
          </p>
        </div>
        <button
          onClick={() => { setForm(f => ({ ...f, reference: clientNumber || '' })); setAllocations([]); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
        >
          <Plus size={18} /> Registrar Pago
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><DollarSign size={20} className="text-red-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Saldo por Pagar</span>
          </div>
          <p className="text-2xl font-black text-slate-900">${balance.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckCircle size={20} className="text-green-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Total Pagado</span>
          </div>
          <p className="text-2xl font-black text-slate-900">${balance.total_paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock size={20} className="text-amber-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Pendientes de Revisión</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
        </div>
      </div>

      {/* Banking Information Card */}
      {!isSimulating && (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #1a365d 50%, #2d4a7a 100%)' }}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <Building2 size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base m-0">Datos Bancarios</h3>
                  <p className="text-blue-200/70 text-xs m-0 font-medium">Greenland Products S.A. de C.V.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                <Shield size={12} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Verificado</span>
              </div>
            </div>

            {/* Banking Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* Banco */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">Banco</span>
                <span className="text-white font-bold text-sm">BANORTE</span>
              </div>
              {/* Beneficiario */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">Beneficiario</span>
                <span className="text-white font-bold text-sm">GREENLAND PRODUCTS SA DE CV</span>
              </div>
              {/* Cuenta */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">Cuenta Bancaria</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm font-mono tracking-wider">1302256025</span>
                  <button onClick={() => copyToClipboard('1302256025', 'cuenta')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border-none cursor-pointer transition-all">
                    {copiedField === 'cuenta' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} className="text-blue-300/60" />}
                  </button>
                </div>
              </div>
              {/* CLABE */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">CLABE Interbancaria</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm font-mono tracking-wider">072078013022560258</span>
                  <button onClick={() => copyToClipboard('072078013022560258', 'clabe')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border-none cursor-pointer transition-all">
                    {copiedField === 'clabe' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} className="text-blue-300/60" />}
                  </button>
                </div>
              </div>
              {/* RFC */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">RFC</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm font-mono">GPR230911971</span>
                  <button onClick={() => copyToClipboard('GPR230911971', 'rfc')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border-none cursor-pointer transition-all">
                    {copiedField === 'rfc' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} className="text-blue-300/60" />}
                  </button>
                </div>
              </div>
              {/* Email */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider block mb-1">Enviar Comprobante a</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm flex items-center gap-1.5"><Mail size={13} className="text-blue-300/60" /> ventas@greenland-products.com.mx</span>
                  <button onClick={() => copyToClipboard('ventas@greenland-products.com.mx', 'email')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border-none cursor-pointer transition-all">
                    {copiedField === 'email' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} className="text-blue-300/60" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Reference/Concept Reminder */}
            {clientNumber && (
              <div className="bg-gradient-to-r from-[#6a9a04]/20 to-[#dee24b]/10 border border-[#6a9a04]/30 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/30 flex items-center justify-center shrink-0 border border-[#6a9a04]/20">
                  <CreditCard size={22} className="text-[#6a9a04]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-100/80 m-0 mb-1 font-medium">Al realizar tu transferencia, coloca como concepto:</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-[#6a9a04] font-mono tracking-wider">{clientNumber}</span>
                    <button onClick={() => copyToClipboard(clientNumber, 'ref')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border-none cursor-pointer transition-all">
                      {copiedField === 'ref' ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} className="text-blue-300/60" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-blue-200/50 m-0 mt-1">Tu ID de distribuidor permite la conciliación automática de pagos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container Charges Section (PRO only) */}
      {receptions.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 m-0">
              📦 Cargos por Contenedores
            </h2>
            <span className="text-sm font-black text-[#6a9a04]">
              ${(balance.total_containers || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {receptions.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 m-0">{r.container_label || 'Recepción'}</p>
                  <p className="text-xs text-slate-400 m-0">
                    {formatDateOnly(r.reception_date)}
                    {r.warehouse?.name && ` — ${r.warehouse.name}`}
                  </p>
                </div>
                <span className="font-bold text-slate-800">
                  ${Number(r.charge_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6a9a04]" /> Historial de Pagos
          </h2>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay pagos registrados</p>
            <p className="text-sm mt-1">Usa el botón "Registrar Pago" para comenzar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPayments.map(p => <PaymentRow key={p.id} p={p} onViewReceipt={handleViewReceipt} />)}
          </div>
        )}

        {olderPayments.length > 0 && (
          <>
            <button onClick={() => setShowHistory(!showHistory)}
              className="w-full py-3 text-sm font-bold text-[#6a9a04] hover:bg-[#6a9a04]/5 flex items-center justify-center gap-1 border-none bg-transparent cursor-pointer border-t border-slate-100">
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showHistory ? 'Ocultar' : `Ver ${olderPayments.length} pagos más`}
            </button>
            {showHistory && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {olderPayments.map(p => <PaymentRow key={p.id} p={p} onViewReceipt={handleViewReceipt} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Registrar Pago</h3>
            <p className="text-sm text-slate-500 mb-5">Tu referencia de cliente: <b className="text-[#6a9a04]">{clientNumber}</b></p>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" step="0.01" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-lg font-bold"
                    placeholder="0.00" />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Método de Pago</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none">
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="deposito">Depósito Bancario</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Referencia Bancaria</label>
                <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none"
                  placeholder="Ej: REF-123456" />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha del Pago</label>
                <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none" />
              </div>

              {/* Apply to Orders (Multi-select) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Aplicar a *</label>
                {/* Allocation tracker */}
                {form.amount && Number(form.amount) > 0 && (
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 text-xs font-bold ${
                    Math.round(allocTotal * 100) === Math.round(Number(form.amount) * 100)
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : allocTotal > Number(form.amount)
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                  }`}>
                    <span>Aplicado: ${allocTotal.toLocaleString('es-MX', {minimumFractionDigits:2})} de ${Number(form.amount).toLocaleString('es-MX', {minimumFractionDigits:2})}</span>
                    {Math.round(allocTotal * 100) === Math.round(Number(form.amount) * 100)
                      ? <span className="text-green-600">✓ Completo</span>
                      : <span>Falta: ${(Number(form.amount) - allocTotal).toLocaleString('es-MX', {minimumFractionDigits:2})}</span>
                    }
                  </div>
                )}
                {orders.length === 0 ? (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> No tienes pedidos activos
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {orders.filter(o => o.balance > 0).map(o => {
                      const isSelected = allocations.some(a => a.order_id === o.id);
                      const alloc = allocations.find(a => a.order_id === o.id);
                      return (
                        <div key={o.id}
                          className={`rounded-xl border transition-all ${
                            isSelected
                              ? 'border-[#6a9a04] bg-[#6a9a04]/5'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleOrderAllocation(o.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-[#6a9a04] bg-[#6a9a04]' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 m-0">
                                Pedido #{o.order_number || new Date(o.created_at).toLocaleDateString('es-MX')}
                              </p>
                              <p className="text-xs text-slate-400 m-0">
                                Total: ${Number(o.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                <span className={`ml-2 font-bold ${o.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  Saldo: ${o.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </p>
                            </div>
                          </button>
                          {isSelected && (
                            <div className="px-4 pb-3 flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium shrink-0">Aplicar:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={alloc?.amount || ''}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    // Auto-cap to order balance
                                    if (val > o.balance) {
                                      updateAllocationAmount(o.id, String(o.balance));
                                    } else {
                                      updateAllocationAmount(o.id, e.target.value);
                                    }
                                  }}
                                  max={o.balance}
                                  placeholder={`Máx $${o.balance.toLocaleString('es-MX')}`}
                                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] outline-none text-sm font-bold"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => updateAllocationAmount(o.id, String(Math.round(Math.min(o.balance, Number(form.amount || 0) - allocTotal + (Number(alloc?.amount) || 0)) * 100) / 100))}
                                className="text-[10px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 hover:bg-[#6a9a04]/20 px-2 py-1 rounded-lg border-none cursor-pointer transition-all shrink-0"
                                title="Aplicar el máximo posible a este pedido"
                              >Max</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {orders.filter(o => o.balance > 0).length === 0 && (
                      <p className="text-xs text-green-600 text-center py-3 flex items-center justify-center gap-1">
                        <CheckCircle size={12} /> Todos tus pedidos están pagados
                      </p>
                    )}
                  </div>
                )}

                {/* Container charges block */}
                {(() => {
                  const containerBalance = receptions.reduce((s, r) => s + Number(r.charge_amount || 0), 0);
                  // Subtract approved payments with container notes (rough estimation)
                  // For now, show total container charges
                  if (containerBalance <= 0) return null;
                  const isSelected = allocations.some(a => a.order_id === '__containers__');
                  const alloc = allocations.find(a => a.order_id === '__containers__');
                  return (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saldo de Contenedores</p>
                      <div
                        className={`rounded-xl border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleOrderAllocation('__containers__')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer"
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <CheckCircle size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 m-0">📦 Cargo por Contenedores</p>
                            <p className="text-xs text-slate-400 m-0">
                              {receptions.length} contenedor(es) recibido(s)
                              <span className="ml-2 font-bold text-red-500">
                                Saldo: ${containerBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </p>
                          </div>
                        </button>
                        {isSelected && (
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium shrink-0">Aplicar:</span>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={alloc?.amount || ''}
                                onChange={e => updateAllocationAmount('__containers__', e.target.value)}
                                placeholder=""
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => updateAllocationAmount('__containers__', String(Math.round(Math.min(containerBalance, Number(form.amount || 0) - allocTotal + (Number(alloc?.amount) || 0)) * 100) / 100))}
                              className="text-[10px] font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-lg border-none cursor-pointer transition-all shrink-0"
                              title="Aplicar el máximo posible"
                            >Max</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {/* Allocation Summary */}
                {allocations.length > 0 && (
                  <div className={`mt-3 p-3 rounded-xl text-sm font-bold flex justify-between items-center ${
                    allocTotal > Number(form.amount || 0)
                      ? 'bg-red-50 border border-red-200 text-red-600'
                      : allocTotal === Number(form.amount || 0) && allocTotal > 0
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-slate-50 border border-slate-200 text-slate-600'
                  }`}>
                    <span>Asignado: ${allocTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    <span>
                      {Math.round(allocTotal * 100) > Math.round(Number(form.amount || 0) * 100)
                        ? '⚠️ Excede el monto'
                        : Math.round(allocTotal * 100) === Math.round(Number(form.amount || 0) * 100) && allocTotal > 0
                          ? '✓ Completo'
                          : `Restante: $${(Math.round((Number(form.amount || 0) - allocTotal) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Comprobante de Pago</label>
                {form.receipt_url ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-sm text-green-700 font-medium flex-1">Comprobante cargado</span>
                    <button onClick={() => setForm(f => ({ ...f, receipt_url: '' }))} className="text-xs text-red-500 font-bold hover:underline bg-transparent border-none cursor-pointer">Quitar</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#6a9a04]/50 hover:bg-[#6a9a04]/5 transition-all">
                    {uploadingReceipt ? <Loader2 size={20} className="animate-spin text-[#6a9a04]" /> : <Upload size={20} className="text-slate-400" />}
                    <span className="text-sm text-slate-500">{uploadingReceipt ? 'Subiendo...' : 'Subir imagen o PDF del comprobante'}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploadingReceipt}
                      onChange={e => e.target.files[0] && handleReceiptUpload(e.target.files[0])} />
                  </label>
                )}
                {form.payment_method === 'efectivo' && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Pagos en efectivo requieren confirmación del administrador
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none"
                  placeholder="Ej: Pago parcial, abono a saldo..." />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer bg-white">
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={submitting || uploadingReceipt || allocations.length === 0 || allocTotal <= 0 || Math.round(allocTotal * 100) !== Math.round(Number(form.amount || 0) * 100)}
                  className="flex-1 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  {submitting ? 'Enviando...' : allocations.length > 1 ? `Registrar Pago (${allocations.length} pedidos)` : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Lightbox */}
      {
        lightboxImg && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
            <img src={lightboxImg} alt="Comprobante" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          </div>
        )
      }
    </div >
  );
}

function PaymentRow({ p, onViewReceipt }) {
  const st = STATUS_MAP[p.status] || STATUS_MAP.pending;
  const Icon = st.icon;
  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
          <Icon size={18} style={{ color: st.color }} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-sm">
            ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <span className="font-normal text-slate-400 ml-2 capitalize">{p.payment_method}</span>
          </p>
          <p className="text-xs text-slate-400 truncate">
             {formatDateOnly(p.payment_date)}
            {p.reference && ` — Ref: ${p.reference}`}
            {p.allocations && p.allocations.length > 1
              ? ` — Aplicado a ${p.allocations.length} pedidos`
              : p.order_id && ` — Pedido vinculado`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {p.receipt_url && (
          <button onClick={() => onViewReceipt(p.receipt_url)}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
            title="Ver comprobante">
            <Eye size={14} className="text-slate-500" />
          </button>
        )}
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
          {st.label}
        </span>
      </div>
      {p.status === 'rejected' && p.rejection_reason && (
        <p className="text-xs text-red-500 w-full mt-1">Motivo: {p.rejection_reason}</p>
      )}
    </div>
  );
}
