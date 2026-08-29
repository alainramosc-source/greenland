'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  DollarSign, CheckCircle, XCircle, Clock, Loader2, Eye,
  ChevronDown, ChevronUp, AlertTriangle, CreditCard, Users, Filter,
  Upload, FileSpreadsheet, Zap, ArrowRight, X, Banknote, ArrowDownCircle, ArrowUpCircle, Wallet, Plus, Calendar, Paperclip,
  PenTool, ShieldCheck, Download, ClipboardCheck, Scale, Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertCircle, Link2 } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

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
  const [filterDistributor, setFilterDistributor] = useState('all');
  const [lightboxImg, setLightboxImg] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [balances, setBalances] = useState([]);
  const [showBalances, setShowBalances] = useState(false);
  // Tab: 'pagos' or 'conciliacion'
  const [activeTab, setActiveTab] = useState('pagos');
  const [userSubRole, setUserSubRole] = useState(null);
  // Reconciliation state
  const [parsedMovements, setParsedMovements] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [reconciling, setReconciling] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [unmatchedFromDB, setUnmatchedFromDB] = useState([]);
  const [manualMatchModal, setManualMatchModal] = useState(null);
  const [manualMatchPaymentId, setManualMatchPaymentId] = useState('');
  // Cash control
  const [cashReceivedBy, setCashReceivedBy] = useState({});
  const [uploadingReceiptId, setUploadingReceiptId] = useState(null);
  const [cashMovements, setCashMovements] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitForm, setExitForm] = useState({ amount: '', concept: '', responsible: '', notes: '', movement_date: new Date().toISOString().split('T')[0] });
  const [exitSubmitting, setExitSubmitting] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', concept: '', responsible: '', notes: '', movement_date: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({ amount: '', concept: '', responsible: '', notes: '', movement_date: new Date().toISOString().split('T')[0] });
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  // Cash audits (arqueo de caja)
  const [cashAudits, setCashAudits] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditForm, setAuditForm] = useState({ counted: '', notes: '', performed_by: '' });
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [cajaDateFrom, setCajaDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [cajaDateTo, setCajaDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [cajaSubTab, setCajaSubTab] = useState('movimientos'); // 'movimientos' | 'diario'
  const [dailySearchTerm, setDailySearchTerm] = useState('');
  // Order lookup map: uuid -> { order_number, total_amount }
  const [orderMap, setOrderMap] = useState({});
  // Dual signature
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const SIGNERS = ['Alain Ramos', 'Didier Fernandez'];

  // Generate signed URL for receipt viewing
  const handleViewReceipt = async (receiptUrl) => {
    if (!receiptUrl) return;
    // Extract just the storage path from full URLs or use as-is for plain paths
    let storagePath = receiptUrl;
    const match = receiptUrl.match(/payment-receipts\/([^?]+)/);
    if (match) {
      storagePath = decodeURIComponent(match[1]);
    }
    // Try signed URL first (for private buckets)
    const { data, error } = await supabase.storage.from('payment-receipts').createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) {
      setLightboxImg(data.signedUrl);
    } else {
      // Fallback: try public URL
      const { data: pubData } = supabase.storage.from('payment-receipts').getPublicUrl(storagePath);
      if (pubData?.publicUrl) {
        setLightboxImg(pubData.publicUrl);
      } else {
        alert('No se pudo cargar el comprobante. El archivo puede no existir en el almacenamiento.');
      }
    }
  };

  useEffect(() => {
    fetchData();
    // Get current user info for dual signature
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('full_name, sub_role').eq('id', user.id).single();
        setCurrentUserName(profile?.full_name || '');
        if (profile?.sub_role) {
          setUserSubRole(profile.sub_role);
          if (profile.sub_role === 'warehouse_admin') {
            setActiveTab('caja');
          }
        }
      }
    };
    getUser();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: payData } = await supabase
      .from('distributor_payments')
      .select('*, profiles!distributor_id(full_name, client_number), orders(id, order_number, total_amount)')
      .order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    const { data: distribs } = await supabase
      .from('profiles')
      .select('id, full_name, client_number')
      .eq('role', 'distributor');

    if (distribs && payData) {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, distributor_id, total_amount, status')
        .neq('status', 'cancelled')
        .neq('status', 'rejected');

      // Build order lookup map for resolving UUIDs to order numbers
      if (ordersData) {
        const map = {};
        ordersData.forEach(o => { map[o.id] = { order_number: o.order_number, total_amount: o.total_amount }; });
        setOrderMap(map);
      }

      // Use order_payments as single source of truth for paid amounts
      // (approved distributor_payments are already inserted into order_payments by handleApprove)
      const { data: orderPaymentsData } = await supabase
        .from('order_payments')
        .select('order_id, amount, payment_date');

      const bals = distribs.map(d => {
        const dOrders = (ordersData || []).filter(o => o.distributor_id === d.id);
        const totalOrders = dOrders.reduce((s, o) => s + Number(o.total_amount), 0);
        const dOrderIds = dOrders.map(o => o.id);
        const totalPaid = (orderPaymentsData || []).filter(p => dOrderIds.includes(p.order_id)).reduce((s, p) => s + Number(p.amount), 0);
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

    // Fetch cash movements
    const { data: cashData } = await supabase
      .from('cash_movements')
      .select('*')
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (cashData) setCashMovements(cashData);

    // Fetch cash audits
    const { data: auditData } = await supabase
      .from('cash_audits')
      .select('*')
      .order('created_at', { ascending: false });
    if (auditData) setCashAudits(auditData);

    setLoading(false);
  };

  // Send payment status notification email
  const sendPaymentNotification = async (payment, status, rejectionReason) => {
    try {
      // Get distributor email from auth
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payment.distributor_id)
        .single();

      // Get email from the user_emails view or auth
      const { data: userData } = await supabase.rpc('get_user_email', { p_user_id: payment.distributor_id });
      const distributorEmail = userData;
      if (!distributorEmail) return;

      const distributorName = profile?.full_name || payment.profiles?.full_name || 'Distribuidor';
      await fetch('/api/send-payment-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributorEmail,
          distributorName,
          amount: payment.amount,
          paymentDate: formatDateOnly(payment.payment_date),
          paymentMethod: payment.payment_method || '—',
          reference: payment.reference || '',
          status,
          rejectionReason: rejectionReason || '',
        }),
      });
    } catch (err) {
      console.error('Error sending payment notification:', err);
    }
  };

  const handleApprove = async (paymentId) => {
    setActionLoading(paymentId);
    try {
      // Pre-validate received_by for cash payments (avoid unnecessary RPC call)
      const payment = payments.find(p => p.id === paymentId);
      const receivedBy = cashReceivedBy[paymentId] || '';
      if (payment?.payment_method === 'efectivo' && !receivedBy.trim()) {
        alert('Para pagos en efectivo, debes llenar el campo "Recibido por"');
        setActionLoading(null);
        return;
      }

      // Single atomic RPC call — all validations and writes happen server-side
      const { data, error } = await supabase.rpc('approve_distributor_payment_atomic', {
        p_payment_id: paymentId,
        p_received_by: receivedBy.trim() || null
      });

      if (error) { alert('Error: ' + error.message); setActionLoading(null); return; }
      if (data && !data.success) { alert(data.error); setActionLoading(null); return; }

      // Send email notification (stays client-side — requires API route)
      if (payment) sendPaymentNotification(payment, 'approved');
      setCashReceivedBy(prev => { const n = { ...prev }; delete n[paymentId]; return n; });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(null);
  };

  // Register cash exit (starts as pending_signatures)
  const handleRegisterExit = async () => {
    const amount = parseFloat(exitForm.amount);
    if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return; }
    if (!exitForm.concept.trim()) { alert('Ingresa un concepto'); return; }
    if (!exitForm.responsible.trim()) { alert('Ingresa quién retiró el efectivo'); return; }
    setExitSubmitting(true);
    const userId = (await supabase.auth.getUser()).data.user.id;
    const { error } = await supabase.from('cash_movements').insert({
      type: 'exit',
      amount,
      concept: exitForm.concept.trim(),
      responsible: exitForm.responsible.trim(),
      notes: exitForm.notes.trim() || null,
      reference_type: 'manual',
      movement_date: exitForm.movement_date,
      created_by: userId,
      registered_by: currentUserName,
      approval_status: 'pending_signatures'
    });
    setExitSubmitting(false);
    if (error) { alert('Error: ' + error.message); return; }
    setShowExitModal(false);
    setExitForm({ amount: '', concept: '', responsible: '', notes: '', movement_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleEditMovement = async () => {
    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return; }
    if (!editForm.concept.trim()) { alert('Ingresa un concepto'); return; }
    setEditSubmitting(true);
    const { error } = await supabase.from('cash_movements').update({
      amount,
      concept: editForm.concept.trim(),
      responsible: editForm.responsible.trim(),
      notes: editForm.notes.trim() || null,
      movement_date: editForm.movement_date
    }).eq('id', editModal.id);
    setEditSubmitting(false);
    if (error) { alert('Error: ' + error.message); return; }
    setEditModal(null);
    fetchData();
  };

  const handleRegisterEntry = async () => {
    const amount = parseFloat(entryForm.amount);
    if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return; }
    if (!entryForm.concept.trim()) { alert('Ingresa un concepto'); return; }
    if (!entryForm.responsible.trim()) { alert('Ingresa quién trajo el efectivo'); return; }
    setEntrySubmitting(true);
    const userId = (await supabase.auth.getUser()).data.user.id;
    const { error } = await supabase.from('cash_movements').insert({
      type: 'entry',
      amount,
      concept: entryForm.concept.trim(),
      responsible: entryForm.responsible.trim(),
      notes: entryForm.notes.trim() || null,
      reference_type: 'manual',
      movement_date: entryForm.movement_date,
      created_by: userId,
      registered_by: currentUserName
    });
    setEntrySubmitting(false);
    if (error) { alert('Error: ' + error.message); return; }
    setShowEntryModal(false);
    setEntryForm({ amount: '', concept: '', responsible: '', notes: '', movement_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  // Dual signature handler
  const handleSignExit = async (movementId) => {
    setActionLoading(movementId);
    // Fetch fresh data from DB to avoid race conditions
    const { data: movement, error: fetchErr } = await supabase
      .from('cash_movements')
      .select('id, approved_by_1, approved_by_2')
      .eq('id', movementId)
      .single();
    if (fetchErr || !movement) { setActionLoading(null); return; }
    const updateData = {};
    // Check if signer 1 slot is free or already taken by someone else
    if (!movement.approved_by_1) {
      updateData.approved_by_1 = currentUserId;
      updateData.approved_at_1 = new Date().toISOString();
      updateData.approval_status = movement.approved_by_2 ? 'approved' : 'partially_signed';
    } else if (!movement.approved_by_2 && movement.approved_by_1 !== currentUserId) {
      updateData.approved_by_2 = currentUserId;
      updateData.approved_at_2 = new Date().toISOString();
      updateData.approval_status = 'approved';
    } else {
      setActionLoading(null);
      return; // Already signed by this user
    }
    await supabase.from('cash_movements').update(updateData).eq('id', movementId);
    setActionLoading(null);
    fetchData();
  };

  const canSign = (movement) => {
    if (!currentUserName) return false;
    const isSigner = SIGNERS.some(s => currentUserName.toLowerCase().includes(s.toLowerCase().split(' ')[0]));
    if (!isSigner) return false;
    // Check if this user already signed
    if (movement.approved_by_1 === currentUserId || movement.approved_by_2 === currentUserId) return false;
    return true;
  };

  const getSignatureCount = (m) => {
    let count = 0;
    if (m.approved_by_1) count++;
    if (m.approved_by_2) count++;
    return count;
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    const reason = rejectReason || 'Sin motivo especificado';
    const { error } = await supabase
      .from('distributor_payments')
      .update({
        status: 'rejected',
        reviewed_by: (await supabase.auth.getUser()).data.user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', rejectModal)
      .eq('status', 'pending');
    const rejectedPayment = payments.find(p => p.id === rejectModal);
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (error) { alert('Error: ' + error.message); return; }
    if (rejectedPayment) sendPaymentNotification(rejectedPayment, 'rejected', reason);
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
    // Send email notifications for all approved payments
    for (const match of toApprove) {
      if (match.matchedPayment) sendPaymentNotification(match.matchedPayment, 'approved');
    }
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

  const filtered = payments.filter(p => {
    const statusMatch = filterStatus === 'all' ? true : p.status === filterStatus;
    const distribMatch = filterDistributor === 'all' ? true : p.distributor_id === filterDistributor;
    return statusMatch && distribMatch;
  });

  const exportPaymentsXLSX = () => {
    const rows = [];
    for (const p of payments) {
      const pType = p.payment_type || 'order';
      const typeLabel = pType === 'containers' ? 'Contenedores' : pType === 'mixed' ? 'Mixto' : 'Pedido';
      const base = {
        'Fecha': p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
        'Distribuidor': p.profiles?.full_name || '',
        'No. Cliente': p.profiles?.client_number || '',
        'Monto Total Pago': Number(p.amount || 0),
        'Tipo': typeLabel,
        'Metodo': p.payment_method || '',
        'Referencia': p.reference_number || '',
        'Status': p.status || '',
        'Recibido Por': p.cash_received_by || '',
        'Notas': p.notes || '',
        'Aprobado': p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString('es-MX') : '',
      };
      // Show allocations detail
      if (p.allocations && p.allocations.length > 0) {
        for (const alloc of p.allocations) {
          if (!alloc.order_id) {
            rows.push({ ...base, 'Monto Aplicado': Number(alloc.amount || 0), 'Pedido': pType === 'containers' || pType === 'mixed' ? 'Contenedores' : 'Sin asignar' });
          } else {
            const ord = orderMap[alloc.order_id];
            const orderNum = ord ? `ORD-${ord.order_number}` : (p.orders?.order_number ? `ORD-${p.orders.order_number}` : alloc.order_id || '');
            rows.push({ ...base, 'Monto Aplicado': Number(alloc.amount || 0), 'Pedido': orderNum });
          }
        }
        // For mixed payments, add container line if container_amount exists
        if (pType === 'mixed' && p.container_amount > 0 && !p.allocations.some(a => !a.order_id)) {
          rows.push({ ...base, 'Monto Aplicado': Number(p.container_amount), 'Pedido': 'Contenedores' });
        }
      } else {
        rows.push({ ...base, 'Monto Aplicado': Number(p.amount || 0), 'Pedido': pType === 'containers' ? 'Contenedores' : (p.orders?.order_number ? `ORD-${p.orders.order_number}` : '') });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
    XLSX.writeFile(wb, `pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
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
          {userSubRole !== 'warehouse_admin' && (
            <button onClick={() => setActiveTab('pagos')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === 'pagos' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
              <CreditCard size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> Pagos
            </button>
          )}
          <button onClick={() => setActiveTab('caja')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === 'caja' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            <Wallet size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> Caja
          </button>
          {userSubRole !== 'warehouse_admin' && (
            <button onClick={() => setActiveTab('conciliacion')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === 'conciliacion' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
              <FileSpreadsheet size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> Conciliación
            </button>
          )}
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
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterDistributor}
                  onChange={e => setFilterDistributor(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all hover:border-[#6a9a04] focus:outline-none focus:border-[#6a9a04] appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%2394a3b8\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
                >
                  <option value="all">Todos los distribuidores</option>
                  {[...new Map(payments.filter(p => p.profiles?.full_name).map(p => [p.distributor_id, p.profiles.full_name])).entries()]
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))
                  }
                </select>
                <Filter size={14} className="text-slate-400" />
                {['pending', 'approved', 'rejected', 'all'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-none cursor-pointer transition-all ${filterStatus === s ? 'bg-[#6a9a04] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {s === 'all' ? 'Todos' : STATUS_MAP[s]?.label || s}
                    {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
                  </button>
                ))}
                <button onClick={() => exportPaymentsXLSX()} title="Exportar todos los pagos a Excel"
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-all">
                  <Download size={12} /> Exportar
                </button>
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
                              {formatDateOnly(p.payment_date)}
                              {p.reference && ` · Ref: ${p.reference}`}
                            </p>
                            {p.notes && <p className="text-xs text-slate-400 mt-0.5">📝 {p.notes}</p>}
                            {/* Show applied orders — always, not just for multi-allocation */}
                            {p.allocations && p.allocations.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {p.allocations.map((alloc, i) => {
                                  if (!alloc.order_id) {
                                    return (
                                      <span key={i} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                        🏭 {p.payment_type === 'containers' || p.payment_type === 'mixed' ? 'Contenedores' : 'Sin asignar'}
                                        <span className="font-bold ml-1">→ ${Number(alloc.amount).toLocaleString('es-MX')}</span>
                                      </span>
                                    );
                                  }
                                  const ord = orderMap[alloc.order_id];
                                  return (
                                    <span key={i} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                      📦 {ord ? `#${ord.order_number}` : 'Pedido'}
                                      {ord && <span className="text-blue-400 ml-0.5">(${Number(ord.total_amount).toLocaleString('es-MX')})</span>}
                                      <span className="font-bold ml-1">→ ${Number(alloc.amount).toLocaleString('es-MX')}</span>
                                    </span>
                                  );
                                })}
                                {(p.payment_type === 'containers' || p.payment_type === 'mixed') && p.container_amount > 0 && !p.allocations.some(a => !a.order_id) && (
                                  <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                    🏭 Contenedores <span className="font-bold ml-1">→ ${Number(p.container_amount).toLocaleString('es-MX')}</span>
                                  </span>
                                )}
                              </div>
                            ) : p.orders?.order_number ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                  📦 #{p.orders.order_number}
                                  <span className="text-blue-400 ml-0.5">(${Number(p.orders.total_amount).toLocaleString('es-MX')})</span>
                                  <span className="font-bold ml-1">→ ${Number(p.amount).toLocaleString('es-MX')}</span>
                                </span>
                              </div>
                            ) : p.payment_type === 'containers' ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                  🏭 Contenedores <span className="font-bold ml-1">→ ${Number(p.amount).toLocaleString('es-MX')}</span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.receipt_url ? (
                            <button onClick={() => handleViewReceipt(p.receipt_url)}
                              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                              title="Ver comprobante">
                              <Eye size={16} className="text-slate-500" />
                            </button>
                          ) : (
                            <label
                              className={`w-9 h-9 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-center cursor-pointer transition-colors ${uploadingReceiptId === p.id ? 'animate-pulse' : ''}`}
                              title="Subir comprobante"
                            >
                              {uploadingReceiptId === p.id ? <Loader2 size={14} className="animate-spin text-amber-500" /> : <Paperclip size={14} className="text-amber-500" />}
                              <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingReceiptId(p.id);
                                const ext = file.name.split('.').pop();
                                const path = `${Date.now()}_${p.id}.${ext}`;
                                const { error: upErr } = await supabase.storage.from('payment-receipts').upload(path, file, { contentType: file.type });
                                if (upErr) { alert('Error al subir: ' + upErr.message); setUploadingReceiptId(null); return; }
                                const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(path);
                                const publicUrl = urlData?.publicUrl || path;
                                await supabase.from('distributor_payments').update({ receipt_url: publicUrl }).eq('id', p.id);
                                setPayments(prev => prev.map(pp => pp.id === p.id ? { ...pp, receipt_url: publicUrl } : pp));
                                setUploadingReceiptId(null);
                              }} />
                            </label>
                          )}
                          {p.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              {p.payment_method === 'efectivo' && (
                                <div className="flex items-center gap-1.5">
                                  <Banknote size={12} className="text-emerald-500 shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Recibido por..."
                                    value={cashReceivedBy[p.id] || ''}
                                    onChange={e => setCashReceivedBy(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    onClick={e => e.stopPropagation()}
                                    className="px-2 py-1.5 text-xs rounded-lg border border-emerald-200 focus:border-emerald-400 outline-none w-36 bg-emerald-50/50 placeholder:text-emerald-300 text-slate-800 font-medium"
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleApprove(p.id)} disabled={!!actionLoading || (p.payment_method === 'efectivo' && !(cashReceivedBy[p.id] || '').trim())}
                                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                  {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Aprobar
                                </button>
                                <button onClick={() => { setRejectModal(p.id); setRejectReason(''); }} disabled={!!actionLoading}
                                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 transition-colors">
                                  <XCircle size={14} /> Rechazar
                                </button>
                              </div>
                            </div>
                          )}
                          {p.status !== 'pending' && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
                              {st.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {p.status === 'approved' && p.received_by && (
                        <p className="text-xs text-emerald-600 mt-1 ml-[52px] flex items-center gap-1">
                          <Banknote size={12} /> Recibido por: <span className="font-bold">{p.received_by}</span>
                        </p>
                      )}
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

      {/* =============== TAB: CAJA =============== */}
      {activeTab === 'caja' && (() => {
        const filteredCash = cashMovements.filter(m => m.movement_date >= cajaDateFrom && m.movement_date <= cajaDateTo);
        const totalEntries = filteredCash.filter(m => m.type === 'entry').reduce((s, m) => s + Number(m.amount), 0);
        const totalExits = filteredCash.filter(m => m.type === 'exit' && m.approval_status === 'approved').reduce((s, m) => s + Number(m.amount), 0);
        const pendingExits = filteredCash.filter(m => m.type === 'exit' && m.approval_status !== 'approved').reduce((s, m) => s + Number(m.amount), 0);
        const saldoDebido = totalEntries - totalExits;
        
        // Global balance anchored to the latest applied audit
        const latestAppliedAudit = (cashAudits || [])
          .filter(a => a.applied)
          .sort((a, b) => new Date(b.created_at || b.audit_date) - new Date(a.created_at || a.audit_date))[0];

        const auditBaseBalance = latestAppliedAudit ? Number(latestAppliedAudit.counted_balance || 0) : 0;
        const auditCutoffTime = latestAppliedAudit ? new Date(latestAppliedAudit.created_at || latestAppliedAudit.audit_date).getTime() : 0;

        const activeCash = latestAppliedAudit
          ? cashMovements.filter(m => {
              if (m.concept && m.concept.includes('Ajuste por arqueo de caja')) return false;
              const mTime = new Date(m.created_at || m.movement_date).getTime();
              return mTime > auditCutoffTime;
            })
          : cashMovements;

        const activeEntries = activeCash.filter(m => m.type === 'entry').reduce((s, m) => s + Number(m.amount), 0);
        const activeExits = activeCash.filter(m => m.type === 'exit' && m.approval_status === 'approved').reduce((s, m) => s + Number(m.amount), 0);
        const globalBalance = auditBaseBalance + activeEntries - activeExits;

        // Calculate daily running balance historically across ALL movements
        const sortedMovements = [...cashMovements].sort((a, b) => {
          if (a.movement_date !== b.movement_date) {
            return a.movement_date.localeCompare(b.movement_date);
          }
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });

        let accumulatedBalance = 0;
        const dailyMap = {};

        sortedMovements.forEach(m => {
          const amt = Number(m.amount) || 0;
          const isApproved = m.type === 'entry' || (m.type === 'exit' && m.approval_status === 'approved');
          const startBal = accumulatedBalance;

          if (isApproved) {
            if (m.type === 'entry') accumulatedBalance += amt;
            else accumulatedBalance -= amt;
          }

          const dateKey = m.movement_date || 'Sin Fecha';
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = {
              date: dateKey,
              entries: 0,
              exits: 0,
              startBalance: startBal,
              endBalance: accumulatedBalance,
              count: 0,
              movements: [],
              hasDrasticDrop: false,
              netChange: 0,
            };
          }

          dailyMap[dateKey].count++;
          dailyMap[dateKey].movements.push(m);
          if (m.type === 'entry') dailyMap[dateKey].entries += amt;
          if (m.type === 'exit' && m.approval_status === 'approved') dailyMap[dateKey].exits += amt;
          dailyMap[dateKey].endBalance = accumulatedBalance;
          dailyMap[dateKey].netChange = dailyMap[dateKey].entries - dailyMap[dateKey].exits;

          if (dailyMap[dateKey].netChange <= -100000 || (dailyMap[dateKey].endBalance < 0 && dailyMap[dateKey].startBalance >= 0)) {
            dailyMap[dateKey].hasDrasticDrop = true;
          }
        });

        const dailyList = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
        const filteredDailyList = dailyList.filter(row => {
          if (!dailySearchTerm) return true;
          const s = dailySearchTerm.toLowerCase();
          return row.date.includes(s) || 
                 row.endBalance.toString().includes(s) ||
                 row.netChange.toString().includes(s);
        });

        return (
          <div className="space-y-5">
            {/* Caja KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Wallet size={20} className="text-blue-600" /></div>
                  <span className="text-sm text-slate-500 font-medium">Saldo Debido en Caja</span>
                </div>
                <p className={`text-2xl font-black ${globalBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>${globalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400 mt-1">Histórico total</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ArrowDownCircle size={20} className="text-emerald-500" /></div>
                  <span className="text-sm text-slate-500 font-medium">Entradas Periodo</span>
                </div>
                <p className="text-2xl font-black text-emerald-600">${totalEntries.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><ArrowUpCircle size={20} className="text-red-500" /></div>
                  <span className="text-sm text-slate-500 font-medium">Salidas Periodo</span>
                </div>
                <p className="text-2xl font-black text-red-600">${totalExits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><DollarSign size={20} className="text-purple-500" /></div>
                  <span className="text-sm text-slate-500 font-medium">Balance Periodo</span>
                </div>
                <p className={`text-2xl font-black ${saldoDebido >= 0 ? 'text-purple-600' : 'text-red-600'}`}>${saldoDebido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/50 shadow-inner">
                <button
                  onClick={() => setCajaSubTab('movimientos')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                    cajaSubTab === 'movimientos'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wallet size={15} className={cajaSubTab === 'movimientos' ? 'text-[#6a9a04]' : ''} />
                  Movimientos del Periodo
                </button>
                <button
                  onClick={() => setCajaSubTab('diario')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                    cajaSubTab === 'diario'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar size={15} className={cajaSubTab === 'diario' ? 'text-[#6a9a04]' : ''} />
                  📅 Desglose de Saldo Diario (Histórico)
                  {dailyList.some(d => d.hasDrasticDrop) && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping ml-1" title="Hay días con alertas de saldo"></span>
                  )}
                </button>
              </div>
            </div>

            {/* View Mode: Daily Breakdown vs. Period Movements */}
            {cajaSubTab === 'diario' ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden space-y-4">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#6a9a04]" /> Desglose de Saldo Diario Acumulado
                      <span className="text-xs font-normal text-slate-400">({dailyList.length} días registrados)</span>
                    </h2>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Evolución del saldo al cierre de cada día. Las caídas drásticas se resaltan en rojo.</p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por fecha o monto..."
                      value={dailySearchTerm}
                      onChange={e => setDailySearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#6a9a04]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="py-3 px-5">Fecha</th>
                        <th className="py-3 px-5">Movimientos</th>
                        <th className="py-3 px-5 text-right">Entradas del Día</th>
                        <th className="py-3 px-5 text-right">Salidas Aprobadas</th>
                        <th className="py-3 px-5 text-right">Balance Neto del Día</th>
                        <th className="py-3 px-5 text-right">Saldo Acumulado (Cierre)</th>
                        <th className="py-3 px-5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredDailyList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                            No se encontraron registros de caja para la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredDailyList.map((row) => (
                          <tr
                            key={row.date}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              row.hasDrasticDrop ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''
                            }`}
                          >
                            <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                              <span>{row.date}</span>
                              {row.hasDrasticDrop && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black flex items-center gap-1">
                                  <AlertTriangle size={11} /> ⚠️ Caída Drástica
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">
                              {row.count} movimiento{row.count !== 1 ? 's' : ''}
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-emerald-600">
                              +${row.entries.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-red-600">
                              -${row.exits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-3.5 px-5 text-right font-black ${row.netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {row.netChange >= 0 ? '+' : ''}${row.netChange.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-3.5 px-5 text-right font-black text-sm ${row.endBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                              ${row.endBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <button
                                onClick={() => {
                                  setCajaDateFrom(row.date);
                                  setCajaDateTo(row.date);
                                  setCajaSubTab('movimientos');
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-colors border-none shadow-sm flex items-center gap-1 mx-auto"
                              >
                                <Search size={12} /> Inspeccionar Día
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* Date Filter + Actions */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Desde</label>
                      <input type="date" value={cajaDateFrom} onChange={e => setCajaDateFrom(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Hasta</label>
                      <input type="date" value={cajaDateTo} onChange={e => setCajaDateTo(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]" />
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => { setAuditForm({ counted: '', notes: '', performed_by: '' }); setShowAuditModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-lg shadow-indigo-500/20 transition-all">
                        <ClipboardCheck size={16} /> Arqueo de Caja
                      </button>
                      {SIGNERS.some(s => currentUserName.toLowerCase().includes(s.toLowerCase().split(' ')[0])) && (
                        <button onClick={() => setShowEntryModal(true)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-lg shadow-emerald-500/20 transition-all">
                          <Plus size={16} /> Registrar Entrada
                        </button>
                      )}
                      <button onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-lg shadow-red-500/20 transition-all">
                        <ArrowUpCircle size={16} /> Registrar Salida
                      </button>
                    </div>
                  </div>
                </div>

                {/* Movements History */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-[#6a9a04]" /> Movimientos de Caja
                      <span className="text-xs font-normal text-slate-400 ml-1">({filteredCash.length})</span>
                    </h2>
                  </div>
              {filteredCash.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay movimientos en este periodo</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCash.map(m => {
                    const isPendingSig = m.type === 'exit' && m.approval_status && m.approval_status !== 'approved';
                    const sigCount = getSignatureCount(m);
                    const refLabel = m.reference_type === 'distributor_payment' ? 'Pago Dist.'
                      : m.reference_type === 'counter_sale' ? 'Venta Mostrador'
                      : m.reference_type === 'recycling_purchase' ? 'Compra Recycling'
                      : 'Manual';
                    return (
                      <div key={m.id} className={`px-5 py-4 flex items-center gap-4 ${isPendingSig ? 'bg-amber-50/50' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.type === 'entry' ? 'bg-emerald-50' : isPendingSig ? 'bg-amber-50 border-2 border-amber-200' : 'bg-red-50'}`}>
                          {m.type === 'entry'
                            ? <ArrowDownCircle size={18} className="text-emerald-500" />
                            : isPendingSig ? <PenTool size={18} className="text-amber-500" />
                            : <ArrowUpCircle size={18} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            <span className={m.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}>
                              {m.type === 'entry' ? '+' : '-'}${Number(m.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="font-normal text-slate-400 ml-2 text-xs capitalize">{m.type === 'entry' ? 'Entrada' : 'Salida'}</span>
                          </p>
                          <p className="text-xs text-slate-600 font-medium">{m.concept}</p>
                          <p className="text-[10px] text-slate-400">
                            {m.movement_date} · {m.responsible}
                            {m.registered_by && ` · Registró: ${m.registered_by}`}
                            {m.notes && ` · ${m.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {SIGNERS.some(s => currentUserName.toLowerCase().includes(s.toLowerCase().split(' ')[0])) && m.reference_type === 'manual' && (
                            <button onClick={() => { setEditModal(m); setEditForm({ amount: m.amount, concept: m.concept, responsible: m.responsible || '', notes: m.notes || '', movement_date: m.movement_date }); }}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center border-none cursor-pointer transition-colors"
                              title="Editar movimiento">
                              <Edit3 size={14} className="text-slate-500 hover:text-blue-600" />
                            </button>
                          )}
                          {isPendingSig && (
                            <>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sigCount === 0 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                ⏳ Firmas {sigCount}/2
                              </span>
                              {canSign(m) && (
                                <button onClick={() => handleSignExit(m.id)} disabled={actionLoading === m.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50">
                                  {actionLoading === m.id ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />} Firmar
                                </button>
                              )}
                            </>
                          )}
                          {m.approval_status === 'approved' && m.type === 'exit' && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                              <ShieldCheck size={10} /> Aprobado
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${m.type === 'entry' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {refLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

            {/* ===== ARQUEO DE CAJA HISTORY ===== */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-500" /> Historial de Arqueos
                  <span className="text-xs font-normal text-slate-400 ml-1">({cashAudits.length})</span>
                </h2>
              </div>
              {cashAudits.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ClipboardCheck size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No hay arqueos registrados</p>
                  <p className="text-xs">Realiza tu primer arqueo para iniciar el historial</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cashAudits.map(audit => {
                    const diff = Number(audit.difference || 0);
                    const absDiff = Math.abs(diff);
                    const diffColor = absDiff === 0 ? 'text-emerald-600' : absDiff <= 500 ? 'text-amber-600' : 'text-red-600';
                    const diffBg = absDiff === 0 ? 'bg-emerald-50' : absDiff <= 500 ? 'bg-amber-50' : 'bg-red-50';
                    const diffIcon = audit.applied ? '✅' : absDiff === 0 ? '✅' : absDiff <= 500 ? '⚠️' : '🔴';

                    const handleApplyAudit = async () => {
                      const userId = (await supabase.auth.getUser()).data.user?.id;
                      if (absDiff > 0) {
                        const tipo = diff < 0 ? 'faltante' : 'sobrante';
                        if (!confirm(`¿Asentar corte de caja y aplicar ajuste por ${tipo} de $${absDiff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}?`)) return;
                        
                        const { error: moveErr } = await supabase.from('cash_movements').insert({
                          type: diff < 0 ? 'exit' : 'entry',
                          amount: absDiff,
                          concept: `Ajuste por arqueo de caja — ${tipo}`,
                          responsible: audit.performed_by,
                          notes: `Arqueo ${new Date(audit.created_at).toLocaleDateString('es-MX')}. Esperado: $${Number(audit.expected_balance).toLocaleString('es-MX')} / Contado: $${Number(audit.counted_balance).toLocaleString('es-MX')}`,
                          reference_type: 'manual',
                          movement_date: audit.audit_date,
                          created_by: userId,
                          registered_by: currentUserName,
                          approval_status: 'approved',
                        });
                        if (moveErr) { alert('Error al crear movimiento: ' + moveErr.message); return; }
                      } else {
                        if (!confirm(`¿Asentar el corte de caja con saldo de $${Number(audit.counted_balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}? Esto fijará el punto de partida oficial para las siguientes operaciones.`)) return;
                      }

                      await supabase.from('cash_audits').update({ applied: true, applied_at: new Date().toISOString() }).eq('id', audit.id);
                      fetchData();
                    };

                    return (
                      <div key={audit.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/40 transition-colors">
                        <div className={`w-10 h-10 rounded-xl ${diffBg} flex items-center justify-center text-lg`}>
                          {diffIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {new Date(audit.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(audit.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {audit.applied && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600">Aplicado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">Esperado: <strong>${Number(audit.expected_balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                            <span className="text-xs text-slate-500">Contado: <strong>${Number(audit.counted_balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                          </div>
                          {audit.notes && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{audit.notes}</p>}
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className={`text-sm font-black ${diffColor}`}>
                              {diff >= 0 ? '+' : ''}${diff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400">{audit.performed_by}</p>
                          </div>
                          {!audit.applied && (
                            <button
                              onClick={handleApplyAudit}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors"
                            >
                              {absDiff > 0 ? 'Aplicar Ajuste' : '✅ Asentar Corte'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===== ARQUEO MODAL ===== */}
            {showAuditModal && (() => {
              const expectedBalance = globalBalance;
              const countedVal = parseFloat(auditForm.counted) || 0;
              const diff = countedVal - expectedBalance;
              const absDiff = Math.abs(diff);
              const diffColor = auditForm.counted === '' ? 'text-slate-400' : absDiff === 0 ? 'text-emerald-600' : absDiff <= 500 ? 'text-amber-600' : 'text-red-600';
              const diffBg = auditForm.counted === '' ? 'bg-slate-50' : absDiff === 0 ? 'bg-emerald-50 border-emerald-200' : absDiff <= 500 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

              const handleSubmitAudit = async () => {
                if (!auditForm.counted || countedVal < 0) { alert('Ingresa el monto contado'); return; }
                if (!auditForm.performed_by.trim()) { alert('Ingresa quién realizó el conteo'); return; }
                setAuditSubmitting(true);
                const userId = (await supabase.auth.getUser()).data.user?.id;
                const { error } = await supabase.from('cash_audits').insert({
                  audit_date: new Date().toISOString().split('T')[0],
                  expected_balance: expectedBalance,
                  counted_balance: countedVal,
                  notes: auditForm.notes.trim() || null,
                  performed_by: auditForm.performed_by.trim(),
                  created_by: userId,
                });
                setAuditSubmitting(false);
                if (error) { alert('Error: ' + error.message); return; }
                setShowAuditModal(false);
                fetchData();
              };

              return (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuditModal(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Scale size={20} className="text-indigo-500" /> Arqueo de Caja
                      </h3>
                      <button onClick={() => setShowAuditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 bg-transparent border-none cursor-pointer">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                      {/* Expected balance */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Esperado en Caja (Sistema)</p>
                        <p className="text-3xl font-black text-slate-900">${expectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {latestAppliedAudit ? 'Saldo actual en sistema (anclado al último arqueo aplicado + movimientos posteriores)' : 'Histórico total: entradas - salidas aprobadas'}
                        </p>
                      </div>

                      {/* Counted input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Monto Contado (Efectivo Físico)</label>
                        <input type="number" step="0.01" min="0" value={auditForm.counted}
                          onChange={e => setAuditForm(f => ({ ...f, counted: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-2xl font-black text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                      </div>

                      {/* Difference display */}
                      <div className={`rounded-xl p-4 border ${diffBg} transition-all`}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diferencia</p>
                        <p className={`text-2xl font-black ${diffColor}`}>
                          {auditForm.counted === '' ? '—' : `${diff >= 0 ? '+' : ''}$${diff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                        </p>
                        {auditForm.counted !== '' && (
                          <p className={`text-xs mt-1 ${diffColor}`}>
                            {absDiff === 0 ? '✅ Cuadra perfecto' : absDiff <= 500 ? '⚠️ Diferencia menor — revisar' : '🔴 Diferencia significativa — investigar'}
                          </p>
                        )}
                      </div>

                      {/* Performed by */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">¿Quién realizó el conteo?</label>
                        <input type="text" value={auditForm.performed_by}
                          onChange={e => setAuditForm(f => ({ ...f, performed_by: e.target.value }))}
                          placeholder="Nombre del responsable"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400" />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notas / Observaciones</label>
                        <textarea value={auditForm.notes}
                          onChange={e => setAuditForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Ej: Faltaron $200 del cambio de la venta de mostrador..."
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 resize-none" />
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                      <button onClick={() => setShowAuditModal(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer">Cancelar</button>
                      <button onClick={handleSubmitAudit} disabled={auditSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                        {auditSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                        Registrar Arqueo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        );
      })()}

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
                // Send email notification
                const approvedPayment = payments.find(p => p.id === manualMatchPaymentId);
                if (approvedPayment) sendPaymentNotification(approvedPayment, 'approved');
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

      {/* Cash Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExitModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><ArrowUpCircle size={20} className="text-red-500" /> Registrar Salida de Caja</h3>
            <p className="text-sm text-slate-500 mb-5">Registra retiros de efectivo de la caja.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" step="0.01" value={exitForm.amount}
                    onChange={e => setExitForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none text-lg font-bold"
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Concepto *</label>
                <input type="text" value={exitForm.concept}
                  onChange={e => setExitForm(f => ({ ...f, concept: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none"
                  placeholder="Ej: Compra tungsteno, nómina, gastos..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">¿Quién retiró el efectivo? *</label>
                <input type="text" value={exitForm.responsible}
                  onChange={e => setExitForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none"
                  placeholder="Nombre de quien se lo llevó" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                <input type="date" value={exitForm.movement_date}
                  onChange={e => setExitForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <input type="text" value={exitForm.notes}
                  onChange={e => setExitForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none"
                  placeholder="Detalles adicionales..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowExitModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white hover:bg-slate-50">Cancelar</button>
                <button onClick={handleRegisterExit} disabled={exitSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm border-none cursor-pointer hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {exitSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />} Registrar Salida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEntryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><ArrowDownCircle size={20} className="text-emerald-500" /> Registrar Entrada de Caja</h3>
            <p className="text-sm text-slate-500 mb-5">Registra ingreso de efectivo externo a la caja.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" step="0.01" value={entryForm.amount}
                    onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none text-lg font-bold"
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Concepto *</label>
                <input type="text" value={entryForm.concept}
                  onChange={e => setEntryForm(f => ({ ...f, concept: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none"
                  placeholder="Ej: Reposición de caja, transferencia interna..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">¿Quién trajo el efectivo? *</label>
                <input type="text" value={entryForm.responsible}
                  onChange={e => setEntryForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none"
                  placeholder="Nombre de quien trajo el efectivo" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                <input type="date" value={entryForm.movement_date}
                  onChange={e => setEntryForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <input type="text" value={entryForm.notes}
                  onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 outline-none"
                  placeholder="Detalles adicionales..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEntryModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white hover:bg-slate-50">Cancelar</button>
                <button onClick={handleRegisterEntry} disabled={entrySubmitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {entrySubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />} Registrar Entrada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Movement Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Edit3 size={20} className="text-blue-500" /> Editar Movimiento de Caja</h3>
            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" step="0.01" value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none text-lg font-bold"
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Concepto *</label>
                <input type="text" value={editForm.concept}
                  onChange={e => setEditForm(f => ({ ...f, concept: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Responsable *</label>
                <input type="text" value={editForm.responsible}
                  onChange={e => setEditForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                <input type="date" value={editForm.movement_date}
                  onChange={e => setEditForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <input type="text" value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white hover:bg-slate-50">Cancelar</button>
                <button onClick={handleEditMovement} disabled={editSubmitting}
                  className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm border-none cursor-pointer hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {editSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />} Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center border-none cursor-pointer transition-colors z-10">
            <X size={20} className="text-white" />
          </button>
          {lightboxImg.toLowerCase().includes('.pdf') ? (
            <iframe src={lightboxImg} className="w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl bg-white" title="Comprobante PDF" />
          ) : (
            <img
              src={lightboxImg}
              alt="Comprobante"
              className="max-w-full max-h-full rounded-xl shadow-2xl"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.insertAdjacentHTML('beforeend', '<div style="background:white;padding:40px;border-radius:16px;text-align:center"><p style="font-size:18px;font-weight:bold;color:#334155;margin-bottom:8px">⚠️ No se pudo cargar el comprobante</p><p style="font-size:14px;color:#94a3b8">El archivo puede no existir o el bucket de almacenamiento no tiene los permisos correctos.</p></div>');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
