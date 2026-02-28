'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  DollarSign, CreditCard, Clock, CheckCircle, XCircle, Upload,
  Loader2, Plus, FileText, AlertTriangle, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

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
    notes: '', order_id: '', receipt_url: ''
  });

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

    // Orders for dropdown
    const { data: ordData } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('distributor_id', targetUserId)
      .not('status', 'in', '("cancelled","rejected")')
      .order('created_at', { ascending: false });
    if (ordData) setOrders(ordData);

    // Calculate balance
    const approved = (payData || []).filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0);
    const totalOrders = (ordData || []).reduce((s, o) => s + Number(o.total_amount), 0);
    setBalance({ total_orders: totalOrders, total_paid: approved, balance: totalOrders - approved });

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
    // Generate signed URL
    const { data: signedData } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 86400 * 365);
    setForm(f => ({ ...f, receipt_url: signedData?.signedUrl || '' }));
    setUploadingReceipt(false);
  };

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { alert('Ingresa un monto válido'); return; }
    if (!form.order_id) { alert('Selecciona un pedido para aplicar el pago'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('submit_distributor_payment', {
      p_amount: Number(form.amount),
      p_payment_method: form.payment_method,
      p_reference: form.reference || null,
      p_payment_date: form.payment_date,
      p_receipt_url: form.receipt_url || null,
      p_notes: form.notes || null,
      p_order_id: form.order_id || null
    });
    setSubmitting(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && !data.success) { alert(data.error); return; }
    setShowModal(false);
    setForm({ amount: '', payment_method: 'transferencia', reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '', order_id: '', receipt_url: '' });
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
          onClick={() => setShowModal(true)}
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

      {/* Reference Banner */}
      {clientNumber && !isSimulating && (
        <div className="bg-[#6a9a04]/10 border border-[#6a9a04]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/20 flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-[#6a9a04]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 m-0">Tu referencia para pagos:</p>
            <p className="text-lg font-black text-[#6a9a04] font-mono m-0">{clientNumber}</p>
          </div>
          <p className="text-xs text-slate-500 ml-auto max-w-[250px] m-0">
            Usa este código como CONCEPTO al hacer transferencias para que tu pago se identifique automáticamente.
          </p>
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
            {recentPayments.map(p => <PaymentRow key={p.id} p={p} onViewReceipt={setLightboxImg} />)}
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
                {olderPayments.map(p => <PaymentRow key={p.id} p={p} onViewReceipt={setLightboxImg} />)}
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

              {/* Apply to */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Aplicar a Pedido *</label>
                <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none" required>
                  <option value="">— Selecciona un pedido —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      Pedido {new Date(o.created_at).toLocaleDateString('es-MX')} — ${Number(o.total_amount).toLocaleString()}
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> No tienes pedidos activos
                  </p>
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
                <button onClick={handleSubmit} disabled={submitting || uploadingReceipt}
                  className="flex-1 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  {submitting ? 'Enviando...' : 'Registrar Pago'}
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
            {new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            {p.reference && ` — Ref: ${p.reference}`}
            {p.order_id && ` — Pedido vinculado`}
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
