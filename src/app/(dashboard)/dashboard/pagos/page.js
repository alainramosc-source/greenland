'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  DollarSign, CheckCircle, XCircle, Clock, Loader2, Eye,
  ChevronDown, ChevronUp, AlertTriangle, CreditCard, Users, Filter,
  Upload, FileSpreadsheet, Zap, ArrowRight, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertCircle, Link2 } from 'lucide-react';

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
  // Tab: 'pagos' or 'conciliacion'
  const [activeTab, setActiveTab] = useState('pagos');
  // Reconciliation state
  const [parsedMovements, setParsedMovements] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [reconciling, setReconciling] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [unmatchedFromDB, setUnmatchedFromDB] = useState([]);
  const [manualMatchModal, setManualMatchModal] = useState(null);
  const [manualMatchPaymentId, setManualMatchPaymentId] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: payData } = await supabase
      .from('distributor_payments')
      .select('*, profiles!distributor_id(full_name, client_number), orders(id, total_amount)')
      .order('created_at', { ascending: false });
    if (payData) setPayments(payData);

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

    // Fetch unmatched bank movements
    const { data: unmatchedData } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('match_status', 'unmatched')
      .order('uploaded_at', { ascending: false });
    if (unmatchedData) setUnmatchedFromDB(unmatchedData);

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

  // ========== RECONCILIATION LOGIC ==========

  const handleExcelUpload = async (file) => {
    if (!file) return;
    setUploadFileName(file.name);
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find header row (look for "DEPÓSITOS" or "DEPOSITOS")
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      if (row && row.some(cell => typeof cell === 'string' && (cell.includes('DEPÓSITO') || cell.includes('DEPOSITO')))) {
        headerIdx = i;
        break;
      }
    }

    // Parse deposits from data rows
    const deposits = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 8) continue;

      const amount = Number(row[7]); // Column H (index 7) = Depósitos
      if (!amount || amount <= 0) continue;

      const operationDate = row[1] || row[2]; // Column B or C
      const description = String(row[4] || ''); // Column E = Descripción
      const descriptionL = String(row[11] || ''); // Column L = Descripción/concepto

      // Extract DIST-XXX pattern from description columns
      const fullDesc = `${description} ${descriptionL}`;
      const distMatch = fullDesc.match(/DIST[-\s]?(\d{3,})/i);
      const referenceExtracted = distMatch ? `DIST-${distMatch[1]}` : null;

      // Also try to find it in the CONCEPTO part
      let conceptoRef = null;
      const conceptoMatch = fullDesc.match(/CONCEPTO\s*[:\s]*([^\s]*DIST[-\s]?\d{3,}[^\s]*)/i);
      if (conceptoMatch) conceptoRef = conceptoMatch[1];

      deposits.push({
        idx: i,
        operation_date: parseDate(operationDate),
        amount,
        description: description.substring(0, 100),
        description_full: fullDesc,
        reference_extracted: referenceExtracted || conceptoRef,
        raw_row: row,
      });
    }

    setParsedMovements(deposits);
    setMatchResults([]);
  };

  const parseDate = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      // Excel serial date
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    // Try DD/MM/YYYY format
    const parts = String(val).split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return String(val);
  };

  const runMatching = () => {
    setReconciling(true);
    const pendingPayments = payments.filter(p => p.status === 'pending');

    const results = parsedMovements.map(mov => {
      let matchedPayment = null;
      let matchType = 'unmatched';

      // Strategy 1: Exact amount + client number match
      if (mov.reference_extracted) {
        matchedPayment = pendingPayments.find(p =>
          Number(p.amount) === mov.amount &&
          p.profiles?.client_number === mov.reference_extracted
        );
        if (matchedPayment) matchType = 'exact';
      }

      // Strategy 2: Amount-only match (if only one pending payment with same amount)
      if (!matchedPayment) {
        const amountMatches = pendingPayments.filter(p => Number(p.amount) === mov.amount);
        if (amountMatches.length === 1) {
          matchedPayment = amountMatches[0];
          matchType = 'amount_only';
        }
      }

      return {
        ...mov,
        matchedPayment,
        matchType,
        selected: matchType === 'exact', // auto-select exact matches
      };
    });

    setMatchResults(results);
    setReconciling(false);
  };

  const toggleMatchSelection = (idx) => {
    setMatchResults(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
  };

  const approveMatches = async () => {
    const toApprove = matchResults.filter(r => r.selected && r.matchedPayment);
    const unmatched = matchResults.filter(r => r.matchType === 'unmatched');

    if (toApprove.length === 0 && unmatched.length === 0) { alert('No hay movimientos para procesar'); return; }

    setApproving(true);
    const batchId = `batch_${Date.now()}`;
    const userId = (await supabase.auth.getUser()).data.user?.id;

    // Insert matched bank movements
    for (const match of toApprove) {
      await supabase.from('bank_movements').insert({
        bank_name: 'banorte',
        operation_date: match.operation_date,
        amount: match.amount,
        description: match.description_full?.substring(0, 500),
        reference_extracted: match.reference_extracted,
        raw_data: match.raw_row,
        match_status: 'matched',
        matched_payment_id: match.matchedPayment.id,
        batch_id: batchId,
        uploaded_by: userId
      });
    }

    // Insert unmatched bank movements for later review
    for (const mov of unmatched) {
      await supabase.from('bank_movements').insert({
        bank_name: 'banorte',
        operation_date: mov.operation_date,
        amount: mov.amount,
        description: mov.description_full?.substring(0, 500),
        reference_extracted: mov.reference_extracted,
        raw_data: mov.raw_row,
        match_status: 'unmatched',
        batch_id: batchId,
        uploaded_by: userId
      });
    }

    // Auto-approve all matched payments via RPC
    let approvedCount = 0;
    if (toApprove.length > 0) {
      const { data, error } = await supabase.rpc('approve_matched_payments', { p_batch_id: batchId });
      if (error) {
        alert('Error en aprobación: ' + error.message);
        setApproving(false);
        return;
      }
      approvedCount = data?.approved_count || 0;
    }

    setApproving(false);
    alert(`✅ ${approvedCount} pagos aprobados\n⚠️ ${unmatched.length} movimientos sin match guardados para revisión`);
    setParsedMovements([]);
    setMatchResults([]);
    setUploadFileName('');
    fetchData();
  };

  // ========== RENDER ==========

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
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-900">Gestión de Pagos</h1>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab('pagos')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === 'pagos' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            <CreditCard size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> Pagos
          </button>
          <button onClick={() => setActiveTab('conciliacion')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === 'conciliacion' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            <FileSpreadsheet size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> Conciliación
          </button>
        </div>
      </div>

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

      {/* =============== TAB: PAGOS =============== */}
      {activeTab === 'pagos' && (
        <>
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
        </>
      )}

      {/* =============== TAB: CONCILIACIÓN =============== */}
      {activeTab === 'conciliacion' && (
        <div className="space-y-5">
          {/* Upload Section */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-[#6a9a04]" /> Subir Estado de Cuenta — Banorte
            </h2>

            {!uploadFileName ? (
              <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-[#6a9a04]/50 hover:bg-[#6a9a04]/5 transition-all">
                <Upload size={32} className="text-slate-300" />
                <span className="text-sm text-slate-500 font-medium">
                  Arrastra o haz clic para subir el archivo Excel (.xlsx / .xls)
                </span>
                <span className="text-xs text-slate-400">Formato Banorte — Se procesarán solo los depósitos</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => e.target.files[0] && handleExcelUpload(e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <FileSpreadsheet size={20} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium flex-1">{uploadFileName} — {parsedMovements.length} depósitos encontrados</span>
                <button onClick={() => { setParsedMovements([]); setMatchResults([]); setUploadFileName(''); }}
                  className="text-xs text-red-500 font-bold hover:underline bg-transparent border-none cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Parsed Movements Preview */}
          {parsedMovements.length > 0 && matchResults.length === 0 && (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  📊 {parsedMovements.length} depósitos encontrados
                </h2>
                <button onClick={runMatching} disabled={reconciling}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#6a9a04] text-white font-bold text-sm rounded-xl border-none cursor-pointer hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 disabled:opacity-50 transition-all">
                  <Zap size={16} /> Ejecutar Matching
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-bold text-slate-500 text-xs">Fecha</th>
                    <th className="text-right px-4 py-2.5 font-bold text-slate-500 text-xs">Monto</th>
                    <th className="text-left px-4 py-2.5 font-bold text-slate-500 text-xs">Ref. Extraída</th>
                    <th className="text-left px-4 py-2.5 font-bold text-slate-500 text-xs">Descripción</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedMovements.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-600">{m.operation_date}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">${m.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5">
                          {m.reference_extracted
                            ? <span className="font-mono text-xs font-bold text-[#6a9a04] bg-green-50 px-2 py-0.5 rounded">{m.reference_extracted}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs truncate max-w-[200px]">{m.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Match Results */}
          {matchResults.length > 0 && (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">⚡ Resultados del Matching</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {matchResults.filter(r => r.matchType === 'exact').length} matches exactos ·
                    {matchResults.filter(r => r.matchType === 'amount_only').length} por monto ·
                    {matchResults.filter(r => r.matchType === 'unmatched').length} sin match
                  </p>
                </div>
                <button onClick={approveMatches} disabled={approving || matchResults.filter(r => r.selected).length === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-green-500 text-white font-bold text-sm rounded-xl border-none cursor-pointer hover:bg-green-600 shadow-lg shadow-green-500/20 disabled:opacity-50 transition-all">
                  {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Aprobar {matchResults.filter(r => r.selected).length} Seleccionados
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {matchResults.map((r, i) => (
                  <div key={i} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${r.matchType === 'exact' ? 'bg-green-50/50' : r.matchType === 'amount_only' ? 'bg-amber-50/30' : ''}`}>
                    {/* Checkbox */}
                    {r.matchedPayment && (
                      <input type="checkbox" checked={r.selected}
                        onChange={() => toggleMatchSelection(i)}
                        className="w-5 h-5 accent-[#6a9a04] shrink-0 cursor-pointer" />
                    )}

                    {/* Bank Movement */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        ${r.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        <span className="text-xs text-slate-400 font-normal ml-2">{r.operation_date}</span>
                      </p>
                      {r.reference_extracted && (
                        <span className="text-xs font-mono font-bold text-[#6a9a04]">{r.reference_extracted}</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={16} className="text-slate-300 shrink-0 hidden sm:block" />

                    {/* Matched Payment or No Match */}
                    <div className="flex-1 min-w-0">
                      {r.matchedPayment ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {r.matchedPayment.profiles?.full_name}
                            <span className="font-mono text-[#6a9a04] text-xs ml-1">{r.matchedPayment.profiles?.client_number}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            ${Number(r.matchedPayment.amount).toLocaleString()} · {r.matchedPayment.payment_method}
                            {r.matchedPayment.reference && ` · Ref: ${r.matchedPayment.reference}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin match — revisión manual</span>
                      )}
                    </div>

                    {/* Match Badge */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${r.matchType === 'exact' ? 'bg-green-100 text-green-700' :
                      r.matchType === 'amount_only' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                      {r.matchType === 'exact' ? '✓ Match Exacto' :
                        r.matchType === 'amount_only' ? '~ Solo Monto' :
                          '✗ Sin Match'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!uploadFileName && matchResults.length === 0 && parsedMovements.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">Conciliación Bancaria</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                Sube el estado de cuenta de Banorte para hacer match automático con los pagos pendientes de tus distribuidores.
              </p>
            </div>
          )}

          {/* Unmatched Movements from DB */}
          {unmatchedFromDB.length > 0 && (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Movimientos Pendientes de Revisión
                  <span className="text-xs font-normal text-slate-400 ml-2">({unmatchedFromDB.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Depósitos bancarios que no tuvieron match automático. Vincúlalos manualmente a un pago pendiente o ignóralos.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {unmatchedFromDB.map(mov => (
                  <div key={mov.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        ${Number(mov.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        <span className="text-xs text-slate-400 font-normal ml-2">{mov.operation_date}</span>
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[300px]">{mov.description?.substring(0, 80) || '—'}</p>
                      {mov.reference_extracted && (
                        <span className="text-xs font-mono font-bold text-[#6a9a04]">{mov.reference_extracted}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setManualMatchModal(mov); setManualMatchPaymentId(''); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#6a9a04] text-white text-xs font-bold border-none cursor-pointer hover:bg-[#6a9a04]/90 transition-colors">
                        <Link2 size={14} /> Vincular
                      </button>
                      <button onClick={async () => {
                        await supabase.from('bank_movements').update({ match_status: 'ignored' }).eq('id', mov.id);
                        setUnmatchedFromDB(prev => prev.filter(m => m.id !== mov.id));
                      }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold border-none cursor-pointer hover:bg-slate-200 transition-colors">
                        <X size={14} /> Ignorar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Match Modal */}
      {manualMatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setManualMatchModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Vincular Movimiento</h3>
            <p className="text-sm text-slate-500 mb-4">
              Depósito: <span className="font-bold text-slate-900">${Number(manualMatchModal.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span className="ml-2 text-xs">{manualMatchModal.operation_date}</span>
            </p>
            <label className="block text-sm font-bold text-slate-700 mb-1">Selecciona el pago pendiente</label>
            <select value={manualMatchPaymentId} onChange={e => setManualMatchPaymentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none mb-4">
              <option value="">— Selecciona un pago —</option>
              {payments.filter(p => p.status === 'pending').map(p => (
                <option key={p.id} value={p.id}>
                  {p.profiles?.full_name} · ${Number(p.amount).toLocaleString()} · {p.profiles?.client_number || '—'} · {p.payment_method}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setManualMatchModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white">Cancelar</button>
              <button disabled={!manualMatchPaymentId || approving} onClick={async () => {
                setApproving(true);
                // Update bank_movement to matched
                await supabase.from('bank_movements').update({
                  match_status: 'matched',
                  matched_payment_id: manualMatchPaymentId
                }).eq('id', manualMatchModal.id);
                // Approve the payment via existing RPC
                const { data, error } = await supabase.rpc('review_distributor_payment', {
                  p_payment_id: manualMatchPaymentId, p_action: 'approve'
                });
                setApproving(false);
                if (error) { alert('Error: ' + error.message); return; }
                if (data && !data.success) { alert(data.error); return; }
                setManualMatchModal(null);
                setManualMatchPaymentId('');
                setUnmatchedFromDB(prev => prev.filter(m => m.id !== manualMatchModal.id));
                fetchData();
              }}
                className="flex-1 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {approving ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} Vincular y Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

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
