'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export function usePayments() {

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
        return {
    handleApplyAudit, ...d, total_orders: totalOrders, total_paid: totalPaid, balance: totalOrders - totalPaid };
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
    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    if (!userId) {
      setActionLoading(null);
      alert('No se pudo verificar el usuario actual.');
      return;
    }

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
      updateData.approved_by_1 = userId;
      updateData.approved_at_1 = new Date().toISOString();
      updateData.approval_status = movement.approved_by_2 ? 'approved' : 'partially_signed';
    } else if (!movement.approved_by_2 && movement.approved_by_1 !== userId) {
      updateData.approved_by_2 = userId;
      updateData.approved_at_2 = new Date().toISOString();
      updateData.approval_status = 'approved';
    } else {
      setActionLoading(null);
      return; // Already signed by this user
    }
    await supabase.from('cash_movements').update(updateData).eq('id', movementId);
    setActionLoading(null);
    await fetchData();
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

  const handlePerformAudit = async () => {
    if (!auditForm.counted || parseFloat(auditForm.counted) < 0) {
      alert('Ingresa el monto contado');
      return;
    }
    if (!auditForm.performed_by.trim()) {
      alert('Ingresa quién realizó el conteo');
      return;
    }
    setAuditSubmitting(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('cash_audits').insert({
      audit_date: new Date().toISOString().split('T')[0],
      expected_balance: Number(balances.reduce((s, b) => s + b.balance, 0)) || 0,
      counted_balance: parseFloat(auditForm.counted),
      notes: auditForm.notes.trim() || null,
      performed_by: auditForm.performed_by.trim(),
      created_by: userId,
    });
    setAuditSubmitting(false);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    setShowAuditModal(false);
    setAuditForm({ counted: '', notes: '', performed_by: '' });
    fetchData();
  };

  
  const parseBankCSV = handleExcelUpload;
  const parsePDFStatement = handleExcelUpload;

  
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

  
  
  const handleDeleteMovement = async (movementId) => {
    if (!movementId) return;
    if (!confirm('¿Seguro que deseas eliminar este movimiento de caja?')) return;
    setActionLoading(movementId);
    const { error } = await supabase.from('cash_movements').delete().eq('id', movementId);
    if (error) {
      alert('Error al eliminar el movimiento: ' + error.message);
    } else {
      setEditModal(null);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handleApplyAudit = async (audit) => {
    if (!audit || audit.applied) return;
    const diff = Number(audit.counted_balance) - Number(audit.expected_balance);
    if (diff !== 0) {
      await supabase.from('cash_movements').insert({
        movement_date: new Date().toISOString().split('T')[0],
        type: diff > 0 ? 'entry' : 'exit',
        amount: Math.abs(diff),
        concept: `Ajuste por arqueo (${new Date(audit.created_at).toLocaleDateString('es-MX')})`,
        notes: `Arqueo ${new Date(audit.created_at).toLocaleDateString('es-MX')}. Esperado: $${Number(audit.expected_balance).toLocaleString('es-MX')} / Contado: $${Number(audit.counted_balance).toLocaleString('es-MX')}`,
        approval_status: 'approved',
        reference_type: 'audit_adjustment',
      });
    }
    await supabase.from('cash_audits').update({ applied: true, applied_at: new Date().toISOString() }).eq('id', audit.id);
    fetchData();
  };

  return {
    supabase,
    payments, setPayments, loading, setLoading, actionLoading, setActionLoading,
    filterStatus, setFilterStatus, filterDistributor, setFilterDistributor,
    lightboxImg, setLightboxImg, rejectModal, setRejectModal, rejectReason, setRejectReason,
    balances, setBalances, showBalances, setShowBalances, activeTab, setActiveTab,
    userSubRole, setUserSubRole, parsedMovements, setParsedMovements, matchResults, setMatchResults,
    reconciling, setReconciling, approving, setApproving, uploadFileName, setUploadFileName,
    unmatchedFromDB, setUnmatchedFromDB, manualMatchModal, setManualMatchModal, manualMatchPaymentId, setManualMatchPaymentId,
    cashReceivedBy, setCashReceivedBy, uploadingReceiptId, setUploadingReceiptId,
    cashMovements, setCashMovements, showExitModal, setShowExitModal, exitForm, setExitForm, exitSubmitting, setExitSubmitting,
    editModal, setEditModal, editForm, setEditForm, editSubmitting, setEditSubmitting,
    showEntryModal, setShowEntryModal, entryForm, setEntryForm, entrySubmitting, setEntrySubmitting,
    cashAudits, setCashAudits, showAuditModal, setShowAuditModal, auditForm, setAuditForm, auditSubmitting, setAuditSubmitting,
    cajaDateFrom, setCajaDateFrom, cajaDateTo, setCajaDateTo, cajaSubTab, setCajaSubTab, dailySearchTerm, setDailySearchTerm,
    orderMap, setOrderMap, currentUserId, setCurrentUserId, currentUserName, setCurrentUserName,
    fetchData, handleApprovePayment: handleApprove, handleRejectPayment: handleReject, handleRegisterEntry, handleRegisterExit,
    handleSignExit, handleEditMovement, handleDeleteMovement, handlePerformAudit, parseBankCSV, parsePDFStatement, exportPaymentsXLSX, handleViewReceipt
  };
}
