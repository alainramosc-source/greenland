'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building, Mail, Phone, MapPin, FileText, Loader2,
  CheckCircle, XCircle, Truck, DollarSign, Eye, Download, Check, X,
  Upload, Clock, AlertTriangle, CreditCard, ExternalLink, Send
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  aceptada: { label: 'Aceptada', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  en_proceso: { label: 'En Proceso', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  completada: { label: 'Completada', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rechazada: { label: 'Rechazada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  cancelada: { label: 'Cancelada', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const DOC_LABELS = {
  factura_pdf: 'Factura PDF',
  factura_xml: 'Factura XML',
  carta_porte: 'Carta Porte',
  pedimento: 'Pedimento',
  cita_carga: 'Cita de Carga',
  evidence: 'Evidencia',
};

export default function SupplierDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [rejectingInvoice, setRejectingInvoice] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingInvoice, setApprovingInvoice] = useState(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [approveReason, setApproveReason] = useState('');
  const [payProofUploading, setPayProofUploading] = useState(null);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);

  // New States
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile || { id: user.id, full_name: user.email });
    }

    const [supplierRes, ordersRes, contractsRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('service_orders').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      supabase.from('service_contracts').select('*').eq('supplier_id', id).order('created_at', { ascending: false }).limit(10),
    ]);
    if (supplierRes.data) setSupplier(supplierRes.data);
    const ords = ordersRes.data || [];
    setOrders(ords);
    if (contractsRes.data) setContracts(contractsRes.data);

    // Fetch invoices, evidence and comments for all orders
    if (ords.length > 0) {
      const orderIds = ords.map(o => o.id);
      const [invRes, evRes, commRes] = await Promise.all([
        supabase.from('service_order_invoices').select('*').in('service_order_id', orderIds).order('created_at', { ascending: false }),
        supabase.from('service_order_evidence').select('*').in('service_order_id', orderIds).order('created_at', { ascending: false }),
        supabase.from('service_order_comments').select('*').in('service_order_id', orderIds).order('created_at', { ascending: true }),
      ]);
      setInvoices(invRes.data || []);
      setEvidence(evRes.data || []);
      setComments(commRes.data || []);
    }
    setLoading(false);
  };

  const toggleActive = async () => {
    const newStatus = !supplier.is_active;
    await supabase.from('suppliers').update({ is_active: newStatus }).eq('id', id);
    setSupplier(prev => ({ ...prev, is_active: newStatus }));
  };

  const handlePostComment = async (orderId) => {
    if (!newComment.trim() || !currentUser) return;
    setPostingComment(true);
    const { data, error } = await supabase.from('service_order_comments').insert([{
      service_order_id: orderId,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      message: newComment.trim()
    }]).select();
    
    if (error) {
      alert('Error al publicar comentario: ' + error.message);
    } else if (data && data.length > 0) {
      setComments(prev => [...prev, data[0]]);
      setNewComment('');
    }
    setPostingComment(false);
  };

  const sendWelcomeEmail = async () => {
    if (!supplier?.email) { alert('El proveedor no tiene correo asignado'); return; }
    setSendingWelcome(true);
    try {
      const res = await fetch('/api/suppliers/send-welcome', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: id }),
      });
      const data = await res.json();
      if (data.success) { setWelcomeSent(true); alert('✅ Email enviado a ' + supplier.email); }
      else alert('Error: ' + (data.error || 'No se pudo enviar'));
    } catch (err) { alert('Error: ' + err.message); }
    setSendingWelcome(false);
  };

  const startApproveInvoice = (inv, order) => {
    setApprovingInvoice(inv.id);
    setApproveAmount(inv.invoiced_amount || order?.agreed_amount || order?.amount || '');
    setApproveReason('');
  };

  const handleConfirmApproveInvoice = async (inv, order) => {
    try {
      const numericAmount = Number(approveAmount) || Number(inv.invoiced_amount) || Number(order?.agreed_amount) || 0;
      const originalAmount = Number(order?.agreed_amount || inv.invoiced_amount || 0);
      const hasAdjustment = numericAmount !== originalAmount || approveReason.trim().length > 0;

      // 1. Update invoice status & amount
      const { error: invErr } = await supabase.from('service_order_invoices').update({
        validation_status: 'aprobada',
        invoiced_amount: numericAmount,
      }).eq('id', inv.id);

      if (invErr) {
        alert('Error al aprobar factura: ' + invErr.message);
        return;
      }

      // 2. Update service order agreed_amount so system total matches invoice 100%
      if (order?.id) {
        const { error: ordErr } = await supabase.from('service_orders').update({
          agreed_amount: numericAmount,
        }).eq('id', order.id);

        if (ordErr) {
          alert('Error al actualizar la orden de servicio: ' + ordErr.message);
          return;
        }

        // 3. Insert audit comment
        if (hasAdjustment) {
          const diff = numericAmount - originalAmount;
          const diffText = diff !== 0 ? ` (Diferencia: ${diff > 0 ? '+' : ''}$${fmt(diff)})` : '';
          const msg = `[Factura Aprobada] Se aprobó factura por $${fmt(numericAmount)}${diffText}.${approveReason.trim() ? ' Motivo: ' + approveReason.trim() : ''}`;
          await supabase.from('service_order_comments').insert([{
            service_order_id: order.id,
            user_id: currentUser?.id || null,
            user_name: currentUser?.full_name || 'Admin',
            message: msg
          }]);
        }
      }

      setApprovingInvoice(null);
      setApproveAmount('');
      setApproveReason('');
      fetchAll();
    } catch (err) {
      console.error('Error en aprobación de factura:', err);
      alert('Error al procesar la aprobación: ' + (err?.message || err));
    }
  };

  const handleRejectInvoice = async (inv) => {
    if (!rejectReason.trim()) { alert('Ingresa un motivo de rechazo.'); return; }
    await supabase.from('service_order_invoices').update({ validation_status: 'rechazada', rejection_reason: rejectReason.trim() }).eq('id', inv.id);
    setRejectingInvoice(null);
    setRejectReason('');
    fetchAll();
  };

  const handleMarkPaid = async (inv) => {
    if (!confirm(`¿Marcar factura de $${fmt(inv.invoiced_amount)} como pagada?`)) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('service_order_invoices').update({
      payment_status: 'paid', paid_at: new Date().toISOString(), paid_by: userId,
    }).eq('id', inv.id);
    fetchAll();
  };

  const handlePayProofUpload = async (inv, file) => {
    if (!file) return;
    setPayProofUploading(inv.id);
    const path = `payment-proofs/${inv.id}/${file.name}`;
    const { error: upErr } = await supabase.storage.from('supplier-documents').upload(path, file, { upsert: true });
    if (upErr) { alert('Error al subir: ' + upErr.message); setPayProofUploading(null); return; }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('service_order_invoices').update({
      payment_proof_url: path, payment_status: 'paid', paid_at: new Date().toISOString(), paid_by: userId,
    }).eq('id', inv.id);
    setPayProofUploading(null);
    fetchAll();
  };

  const viewFile = async (path) => {
    const { data } = await supabase.storage.from('supplier-documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert('No se pudo generar URL del archivo.');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
    </div>
  );

  if (!supplier) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <p className="font-medium text-lg">Proveedor no encontrado.</p>
      <Link href="/dashboard/proveedores" className="text-[#6a9a04] font-bold hover:underline">← Volver</Link>
    </div>
  );

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'orders', label: `Órdenes (${orders.length})` },
    { id: 'invoices', label: `Facturas (${invoices.length})` },
  ];

  // KPIs
  const totalAgreed = orders.reduce((s, o) => s + Number(o.agreed_amount || 0), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.invoiced_amount || 0), 0);
  const totalPaid = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.invoiced_amount || 0), 0);
  const pendingPayment = invoices.filter(i => i.validation_status === 'aprobada' && i.payment_status !== 'paid');
  const pendingReview = invoices.filter(i => i.validation_status === 'pendiente');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proveedores" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/60 border border-white/50 hover:bg-white transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{supplier.company_name}</h1>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${supplier.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {supplier.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-slate-500">{supplier.contact_name} · {supplier.email} · {(supplier.service_types || []).join(', ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sendWelcomeEmail} disabled={sendingWelcome || welcomeSent}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-none transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {sendingWelcome ? <Loader2 size={16} className="animate-spin" /> : welcomeSent ? <CheckCircle size={16} /> : <Send size={16} />}
            {sendingWelcome ? 'Enviando...' : welcomeSent ? 'Email Enviado' : 'Enviar Email de Acceso'}
          </button>
          <button onClick={toggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-none transition-all ${supplier.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
            {supplier.is_active ? <><XCircle size={16} /> Desactivar</> : <><CheckCircle size={16} /> Activar</>}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Servicios</p>
          <p className="text-xl font-black text-slate-900">{orders.length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Facturado</p>
          <p className="text-xl font-black text-slate-900">${fmt(totalInvoiced)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Pagado</p>
          <p className="text-xl font-black text-emerald-600">${fmt(totalPaid)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Por Pagar</p>
          <p className="text-xl font-black text-amber-600">${fmt(pendingPayment.reduce((s, i) => s + Number(i.invoiced_amount || 0), 0))}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-none transition-all ${activeTab === t.id ? 'bg-[#6a9a04] text-white shadow-lg shadow-[#6a9a04]/20' : 'bg-white/60 text-slate-600 hover:bg-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Información General</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Building size={16} className="text-slate-400" /><span className="text-sm font-medium text-slate-700">{supplier.company_name}</span></div>
              {supplier.contact_name && <div className="flex items-center gap-3"><Truck size={16} className="text-slate-400" /><span className="text-sm text-slate-600">{supplier.contact_name}</span></div>}
              {supplier.rfc && <div className="flex items-center gap-3"><FileText size={16} className="text-slate-400" /><span className="text-sm text-slate-600 font-mono">{supplier.rfc}</span></div>}
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Mail size={16} className="text-slate-400" /><span className="text-sm text-slate-600">{supplier.email}</span></div>
              {supplier.phone && <div className="flex items-center gap-3"><Phone size={16} className="text-slate-400" /><span className="text-sm text-slate-600">{supplier.phone}</span></div>}
              {supplier.address && <div className="flex items-center gap-3"><MapPin size={16} className="text-slate-400" /><span className="text-sm text-slate-600">{supplier.address}</span></div>}
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Servicios</h3>
            <div className="flex flex-wrap gap-2">
              {(supplier.service_types || []).map(st => (
                <span key={st} className="text-xs font-bold px-3 py-1 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] uppercase tracking-wider">{st}</span>
              ))}
            </div>
            {supplier.notes && <p className="mt-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">{supplier.notes}</p>}
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
          {orders.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sin órdenes de servicio</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map(o => {
                const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pendiente;
                const orderInvoices = invoices.filter(i => i.service_order_id === o.id);
                const orderDocs = evidence.filter(e => e.service_order_id === o.id);
                const orderComments = comments.filter(c => c.service_order_id === o.id);
                const docCount = orderDocs.length;
                const invStatus = orderInvoices.length > 0 ? orderInvoices[0].validation_status : null;
                const payStatus = orderInvoices.length > 0 ? orderInvoices[0].payment_status : null;
                const isExpanded = selectedOrder === o.id;
                const inv = orderInvoices.length > 0 ? orderInvoices[0] : null;

                return (
                  <div key={o.id} className="flex flex-col">
                    <div 
                      onClick={() => setSelectedOrder(isExpanded ? null : o.id)}
                      className="px-5 py-4 hover:bg-white/40 transition-colors cursor-pointer flex items-center justify-between flex-wrap gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">
                            {(o.description || `Flete #${o.order_number || ''}`).replace(/Op\s+Op/gi, 'Op')}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                          {docCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{docCount} docs</span>}
                          {invStatus === 'pendiente' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Factura pendiente</span>}
                          {invStatus === 'aprobada' && payStatus !== 'paid' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Factura aprobada</span>}
                          {payStatus === 'paid' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">💰 Pagada</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {o.scheduled_date && new Date(o.scheduled_date).toLocaleDateString('es-MX')} · {o.location || '—'} · ${fmt(o.agreed_amount)}
                        </p>
                        {o.reference_info && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{o.reference_info}</p>}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-5 bg-white/40 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6" onClick={e => e.stopPropagation()}>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documentos de la Orden</h4>
                          {orderDocs.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No hay documentos subidos</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {orderDocs.map(doc => {
                                const catColors = {
                                  factura_pdf: 'border-l-blue-500 bg-blue-50/30',
                                  factura_xml: 'border-l-blue-400 bg-blue-50/20',
                                  carta_porte: 'border-l-indigo-500 bg-indigo-50/20',
                                  pedimento: 'border-l-amber-500 bg-amber-50/20',
                                  cita_carga: 'border-l-orange-500 bg-orange-50/20',
                                  evidence: 'border-l-slate-400 bg-slate-50/20',
                                };
                                const catClass = catColors[doc.document_category] || catColors.evidence;
                                return (
                                  <div key={doc.id} className={`p-3 rounded-lg border border-slate-100 border-l-4 ${catClass} flex flex-col gap-2`}>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900">{DOC_LABELS[doc.document_category] || doc.document_category}</p>
                                      <p className="text-[10px] text-slate-500 truncate" title={doc.file_name}>{doc.file_name}</p>
                                    </div>
                                    <button onClick={() => viewFile(doc.file_url)}
                                      className="self-start px-3 py-1 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                                      Ver Documento
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Comentarios</h4>
                            <div className="bg-white/80 border border-slate-200 rounded-xl overflow-hidden flex flex-col h-64">
                              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {orderComments.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center italic">Sin comentarios</p>
                                ) : (
                                  orderComments.map(c => (
                                    <div key={c.id} className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-slate-800 text-xs">{c.user_name}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('es-MX')}</span>
                                      </div>
                                      <p className="text-slate-600 whitespace-pre-wrap">{c.message}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="border-t border-slate-200 p-3 bg-slate-50 flex gap-2">
                                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} 
                                  placeholder="Escribe un comentario..." 
                                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-[#6a9a04]"
                                  onKeyDown={e => { if (e.key === 'Enter') handlePostComment(o.id); }}
                                />
                                <button onClick={() => handlePostComment(o.id)} disabled={postingComment || !newComment.trim()}
                                  className="px-4 py-2 bg-[#6a9a04] text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-[#5b8503]">
                                  {postingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {inv && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Acciones de Pago / Factura</h4>
                              <div className="bg-white/80 p-4 border border-slate-200 rounded-xl flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">
                                      Factura por ${fmt(inv.invoiced_amount)}
                                      {Number(inv.invoiced_amount) !== Number(o.agreed_amount || o.amount) && (
                                        <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                          Tarifa base: ${fmt(o.agreed_amount || o.amount)}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-slate-500">Estado: <span className="uppercase font-semibold">{inv.validation_status}</span></p>
                                    {inv.notes && <p className="text-xs text-slate-600 mt-1 italic">Nota: "{inv.notes}"</p>}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {inv.validation_status === 'pendiente' && approvingInvoice !== inv.id && (
                                      <>
                                        <button onClick={() => startApproveInvoice(inv, o)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200">
                                          <Check size={14} /> Aprobar
                                        </button>
                                        {rejectingInvoice === inv.id ? (
                                          <div className="flex items-center gap-2">
                                            <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                              placeholder="Motivo..." className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg w-32 outline-none" autoFocus />
                                            <button onClick={() => handleRejectInvoice(inv)} className="text-red-600 font-bold bg-red-50 p-1.5 rounded-lg border border-red-200"><Check size={14}/></button>
                                            <button onClick={() => { setRejectingInvoice(null); setRejectReason(''); }} className="text-slate-500 font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-200"><X size={14}/></button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setRejectingInvoice(inv.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                                            <X size={14} /> Rechazar
                                          </button>
                                        )}
                                      </>
                                    )}

                                    {inv.validation_status === 'aprobada' && inv.payment_status !== 'paid' && (
                                      <>
                                        <button onClick={() => handleMarkPaid(inv)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">
                                            <DollarSign size={14} /> Marcar Pagada
                                        </button>
                                        <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 cursor-pointer">
                                          <Upload size={14} /> {payProofUploading === inv.id ? 'Subiendo...' : 'Comp. Pago'}
                                          <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => handlePayProofUpload(inv, e.target.files?.[0])} />
                                        </label>
                                      </>
                                    )}

                                    {inv.payment_status === 'paid' && (
                                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200">Pagada</span>
                                    )}
                                  </div>
                                </div>

                                {inv.validation_status === 'pendiente' && approvingInvoice === inv.id && (
                                  <div className="w-full bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3 mt-1">
                                    <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Aprobar Factura - Confirmar Monto y Justificación</span>
                                      <button onClick={() => setApprovingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Monto Real Facturado ($)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={approveAmount}
                                          onChange={e => setApproveAmount(e.target.value)}
                                          className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Motivo de Cargos Extra / Ajuste</label>
                                        <input
                                          type="text"
                                          value={approveReason}
                                          onChange={e => setApproveReason(e.target.value)}
                                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
                                          placeholder="Ej: Maniobras en puerto y sobrepeso"
                                        />
                                      </div>
                                    </div>

                                    {Number(approveAmount) !== Number(o.agreed_amount || o.amount) && (
                                      <div className="p-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 flex justify-between items-center flex-wrap gap-2 shadow-xs">
                                        <span>Tarifa Base Original: <strong>${fmt(o.agreed_amount || o.amount)}</strong></span>
                                        <span className="text-emerald-700 font-bold">
                                          Nuevo Total: ${fmt(approveAmount)} ({Number(approveAmount) - Number(o.agreed_amount || o.amount) > 0 ? '+' : ''}${fmt(Number(approveAmount) - Number(o.agreed_amount || o.amount))})
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
                                      <button onClick={() => setApprovingInvoice(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                                        Cancelar
                                      </button>
                                      <button onClick={() => handleConfirmApproveInvoice(inv, o)} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-sm">
                                        <Check size={14} /> Confirmar Aprobación
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Pending Review Alert */}
          {pendingReview.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <p className="text-sm font-bold text-amber-700">{pendingReview.length} factura(s) pendientes de revisión</p>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin facturas registradas</p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden divide-y divide-slate-100">
              {invoices.map(inv => {
                const order = orders.find(o => o.id === inv.service_order_id);
                const isPending = inv.validation_status === 'pendiente';
                const isApproved = inv.validation_status === 'aprobada';
                const isRejected = inv.validation_status === 'rechazada';
                const isPaid = inv.payment_status === 'paid';

                return (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">${fmt(inv.invoiced_amount)}</span>
                          {isPending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">⏳ Pendiente de revisión</span>}
                          {isApproved && !isPaid && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">✅ Aprobada — Pendiente de pago</span>}
                          {isApproved && isPaid && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">💰 Pagada</span>}
                          {isRejected && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">❌ Rechazada</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {order?.description || 'Orden'} · {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('es-MX') : new Date(inv.created_at).toLocaleDateString('es-MX')}
                          {inv.paid_at && ` · Pagada ${new Date(inv.paid_at).toLocaleDateString('es-MX')}`}
                        </p>
                        {isRejected && inv.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 bg-red-50 px-3 py-1.5 rounded-lg">Motivo: {inv.rejection_reason}</p>
                        )}
                        {/* File links */}
                        <div className="flex items-center gap-3 mt-2">
                          {inv.pdf_url && (
                            <button onClick={() => viewFile(inv.pdf_url)} className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline bg-transparent border-none cursor-pointer">
                              <Eye size={12} /> Ver PDF
                            </button>
                          )}
                          {inv.xml_url && (
                            <button onClick={() => viewFile(inv.xml_url)} className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline bg-transparent border-none cursor-pointer">
                              <Download size={12} /> XML
                            </button>
                          )}
                          {inv.payment_proof_url && (
                            <button onClick={() => viewFile(inv.payment_proof_url)} className="flex items-center gap-1 text-[11px] text-green-600 font-bold hover:underline bg-transparent border-none cursor-pointer">
                              <Eye size={12} /> Comp. Pago
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending && (
                          <>
                            <button onClick={() => handleApproveInvoice(inv)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors">
                              <Check size={14} /> Aprobar
                            </button>
                            {rejectingInvoice === inv.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                  placeholder="Motivo de rechazo..." className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 outline-none w-48" autoFocus />
                                <button onClick={() => handleRejectInvoice(inv)}
                                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 cursor-pointer"><Check size={12} /></button>
                                <button onClick={() => { setRejectingInvoice(null); setRejectReason(''); }}
                                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 cursor-pointer"><X size={12} /></button>
                              </div>
                            ) : (
                              <button onClick={() => setRejectingInvoice(inv.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors">
                                <X size={14} /> Rechazar
                              </button>
                            )}
                          </>
                        )}
                        {isApproved && !isPaid && (
                          <>
                            <button onClick={() => handleMarkPaid(inv)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 cursor-pointer transition-colors">
                              <DollarSign size={14} /> Marcar Pagada
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors">
                              <Upload size={14} /> {payProofUploading === inv.id ? 'Subiendo...' : 'Comp. Pago'}
                              <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => handlePayProofUpload(inv, e.target.files?.[0])} />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documents */}

      {/* Contracts (always visible at bottom) */}
      {contracts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Contratos de Servicio</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Contrato</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Servicio</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Monto</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Periodicidad</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase text-center">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 font-bold text-slate-900">#{c.contract_number}</td>
                    <td className="py-3 text-slate-600 capitalize">{c.service_type}</td>
                    <td className="py-3 font-medium text-slate-700">${fmt(c.agreed_amount)}</td>
                    <td className="py-3 text-slate-500 capitalize">{c.periodicity}</td>
                    <td className="py-3 text-center">
                      {c.is_active
                        ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Activo</span>
                        : <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Inactivo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
