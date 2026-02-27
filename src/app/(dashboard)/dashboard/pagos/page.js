'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  DollarSign, CheckCircle, XCircle, Clock, Loader2, Eye,
  ChevronDown, ChevronUp, AlertTriangle, CreditCard, Users, Filter
} from 'lucide-react';

const STATUS_MAP = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  approved: { label: 'Aprobado', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

export default function AdminPagosPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [lightboxImg, setLightboxImg] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [balances, setBalances] = useState([]);
  const [showBalances, setShowBalances] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);

    // All payments with distributor info
    const { data: payData } = await supabase
      .from('distributor_payments')
      .select('*, profiles!distributor_id(full_name, client_number), orders(id, total)')
      .order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    // Balances — compute client-side since view may not exist yet
    const { data: distribs } = await supabase
      .from('profiles')
      .select('id, full_name, client_number')
      .eq('role', 'distributor');

    if (distribs && payData) {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('distributor_id, total_amount, status')
        .not('status', 'in', '("cancelled","rejected")');

      const bals = distribs.map(d => {
        const dOrders = (ordersData || []).filter(o => o.distributor_id === d.id);
        const totalOrders = dOrders.reduce((s, o) => s + Number(o.total_amount), 0);
        const totalPaid = payData.filter(p => p.distributor_id === d.id && p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0);
        return { ...d, total_orders: totalOrders, total_paid: totalPaid, balance: totalOrders - totalPaid };
      });
      setBalances(bals);
    }

    setLoading(false);
  };

  const handleApprove = async (paymentId) => {
    setActionLoading(paymentId);
    const { data, error } = await supabase.rpc('review_distributor_payment', {
      p_payment_id: paymentId, p_action: 'approve'
    });
    setActionLoading(null);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && !data.success) { alert(data.error); return; }
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    const { data, error } = await supabase.rpc('review_distributor_payment', {
      p_payment_id: rejectModal, p_action: 'reject', p_rejection_reason: rejectReason || 'Sin motivo especificado'
    });
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (error) { alert('Error: ' + error.message); return; }
    if (data && !data.success) { alert(data.error); return; }
    fetchData();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
    </div>
  );

  const filtered = payments.filter(p => filterStatus === 'all' ? true : p.status === filterStatus);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const approvedMonth = payments
    .filter(p => p.status === 'approved' && new Date(p.reviewed_at).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-black text-slate-900">Gestión de Pagos</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Pagos Pendientes</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{pendingCount}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckCircle size={20} className="text-green-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Aprobado Este Mes</span>
          </div>
          <p className="text-2xl font-black text-slate-900">${approvedMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><DollarSign size={20} className="text-red-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Total por Cobrar</span>
          </div>
          <p className="text-2xl font-black text-slate-900">${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Balances Section */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <button onClick={() => setShowBalances(!showBalances)}
          className="w-full px-5 py-4 flex items-center justify-between border-none bg-transparent cursor-pointer hover:bg-slate-50/50 transition-colors">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6a9a04]" /> Saldos por Distribuidor
          </h2>
          {showBalances ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        {showBalances && (
          <div className="border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50">
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Distribuidor</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">No. Cliente</th>
                <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Total Pedidos</th>
                <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Total Pagado</th>
                <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Saldo</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{b.full_name}</td>
                    <td className="px-5 py-3 font-mono text-[#6a9a04] text-xs font-bold">{b.client_number || '—'}</td>
                    <td className="px-5 py-3 text-right text-slate-600">${b.total_orders.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium">${b.total_paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-5 py-3 text-right font-bold ${b.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${b.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments List */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6a9a04]" /> Pagos Registrados
          </h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            {['pending', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border-none cursor-pointer transition-all ${filterStatus === s ? 'bg-[#6a9a04] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {s === 'all' ? 'Todos' : STATUS_MAP[s]?.label || s}
                {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay pagos en este filtro</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(p => {
              const st = STATUS_MAP[p.status] || STATUS_MAP.pending;
              const Icon = st.icon;
              return (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                          <span className="font-bold text-slate-600">{p.profiles?.full_name}</span>
                          <span className="mx-1">·</span>
                          <span className="font-mono text-[#6a9a04]">{p.profiles?.client_number || '—'}</span>
                          <span className="mx-1">·</span>
                          {new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {p.reference && ` · Ref: ${p.reference}`}
                        </p>
                        {p.notes && <p className="text-xs text-slate-400 mt-0.5">📝 {p.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.receipt_url && (
                        <button onClick={() => setLightboxImg(p.receipt_url)}
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                          title="Ver comprobante">
                          <Eye size={16} className="text-slate-500" />
                        </button>
                      )}
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(p.id)} disabled={!!actionLoading}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 transition-colors">
                            {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Aprobar
                          </button>
                          <button onClick={() => { setRejectModal(p.id); setRejectReason(''); }} disabled={!!actionLoading}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 transition-colors">
                            <XCircle size={14} /> Rechazar
                          </button>
                        </>
                      )}
                      {p.status !== 'pending' && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.status === 'rejected' && p.rejection_reason && (
                    <p className="text-xs text-red-500 mt-2 ml-[52px]">Motivo: {p.rejection_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Rechazar Pago</h3>
            <label className="block text-sm font-bold text-slate-700 mb-1">Motivo del rechazo</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none resize-none"
              rows={3} placeholder="Ej: Comprobante ilegible, monto no coincide..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white">Cancelar</button>
              <button onClick={handleReject} disabled={!!actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Comprobante" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
