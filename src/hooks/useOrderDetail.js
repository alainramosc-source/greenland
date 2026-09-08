'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';

export const OP_STATUS = {
  pending: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(234, 179, 8, 0.15)' },
  confirmed: { label: 'Confirmado', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  in_fulfillment: { label: 'En Surtido', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  shipped: { label: 'Enviado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  closed: { label: 'Cerrado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  rejected: { label: 'Rechazado', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
};

export const PAY_STATUS = {
  unpaid: { label: 'Por Cobrar', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  partial: { label: 'Parcial', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  paid: { label: 'Pagado', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
};

export const PRODUCT_WEIGHTS = {
  GL01: 12.35, GL02: 8.45, GL03: 4.3, GL04: 11.1, GL05: 9.7,
  GL06: 18.25, GL07: 19.7, GL08: 16.15, GL09: 10.65, GL10: 14.5,
  GL11: 18, GL12: 23.7, GL13: 32.9, GL14: 4.3, GL15: 13,
  GL16: 11.1, GL17: 4.5, GL18: 21.55, GL19: 4.5, GL20: 12.35,
  GL21: 0, GL22: 4.3, GL23: 4.3, GL24: 0, GL25: 0,
  GL26: 2.581, GL27: 0.58, GL28: 5.075, GL29: 2.03,
};

export function useOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_method: 'transferencia', reference: '',
    payment_date: new Date().toISOString().split('T')[0], notes: ''
  });
  
  const [editingItems, setEditingItems] = useState({});
  const [editingPrices, setEditingPrices] = useState({});
  const [evidence, setEvidence] = useState([]);
  const [evidenceTab, setEvidenceTab] = useState('embarque');
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});
  
  const [receivingOrder, setReceivingOrder] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ type: 'discrepancia', description: '' });
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportData, setTransportData] = useState({ placas: '', operador: '', sello: '' });
  const [pendingPrintWindow, setPendingPrintWindow] = useState(null);
  
  const [showFulfillmentScan, setShowFulfillmentScan] = useState(false);
  const [fulfilledQty, setFulfilledQty] = useState({});
  const [scanFeedback, setScanFeedback] = useState(null);
  const [showFulfillScanner, setShowFulfillScanner] = useState(false);
  
  const fulfillScannerRef = useRef(null);
  const fulfillScannerStoppingRef = useRef(false);
  const fulfillSearchRef = useRef(null);
  const lastFulfillKeystrokeRef = useRef(0);
  const fulfillBarcodeBufferRef = useRef('');
  const [fulfillSearchTerm, setFulfillSearchTerm] = useState('');
  const fulfillAutoScanTimerRef = useRef(null);

  const validateQuantity = (val) => {
    const num = parseInt(val, 10);
    return (!isNaN(num) && num >= 0) ? num : null;
  };

  const validatePrice = (val) => {
    const num = parseFloat(val);
    return (!isNaN(num) && num >= 0) ? num : null;
  };

  const sendStatusEmail = async (newStatus) => {
    try {
      await fetch('/api/send-status-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          newStatus,
          recipientEmail: order?.profiles?.email,
          recipientName: order?.profiles?.full_name,
          orderNumber: order?.order_number,
        }),
      });
    } catch (e) {
      console.error('Failed to send status update email:', e);
    }
  };

  const fetchOrderDetails = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, sub_role')
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
    setIsSuperAdmin(admin && profile?.sub_role === 'super_admin');

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
      if (data.order_items) {
        data.order_items.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      }
      setOrder(data);

      const { data: whData } = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');
      if (whData) setWarehouses(whData);

      if (data.order_items?.length) {
        const productIds = data.order_items.map(i => i.product_id);
        const { data: wsData } = await supabase
          .from('warehouse_stock')
          .select('warehouse_id, product_id, stock_quantity, reserved_quantity')
          .in('product_id', productIds);
        if (wsData) {
          const stockMap = {};
          wsData.forEach(ws => {
            if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
            stockMap[ws.product_id][ws.warehouse_id] = ws;
          });
          setWarehouseStock(stockMap);
        }
      }
    }

    const { data: paymentsData } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsData) setPayments(paymentsData);

    const { data: evidenceData } = await supabase
      .from('order_evidence')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });
    if (evidenceData && evidenceData.length > 0) {
      const withSignedUrls = await Promise.all(evidenceData.map(async (ev) => {
        let storagePath = ev.file_url;
        const match = ev.file_url?.match(/order-evidence\/(.+)$/);
        if (match) {
          storagePath = match[1];
        }
        if (storagePath) {
          const { data: signedData } = await supabase.storage
            .from('order-evidence')
            .createSignedUrl(storagePath, 3600);
          return { ...ev, file_url: signedData?.signedUrl || ev.file_url };
        }
        return ev;
      }));
      setEvidence(withSignedUrls);
    } else {
      setEvidence([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setAvailableProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${productSearch}%,sku.ilike.%${productSearch}%`)
        .limit(10);
      setAvailableProducts(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleAssignWarehouse = async (itemId, warehouseId) => {
    const { data, error } = await supabase.rpc('assign_item_warehouse', {
      p_item_id: itemId,
      p_warehouse_id: warehouseId || null
    });
    if (error) {
      alert('Error al asignar bodega: ' + error.message);
    } else {
      setOrder(prev => ({
        ...prev,
        order_items: prev.order_items.map(i =>
          i.id === itemId ? { ...i, warehouse_id: warehouseId || null } : i
        )
      }));
    }
  };

  const handleReceiveOrder = async () => {
    if (!confirm('¿Confirmas que recibiste físicamente este pedido? Se agregará a tu inventario.')) return;
    setReceivingOrder(true);
    const { data, error } = await supabase.rpc('receive_order', { p_order_id: id });
    if (error) {
      alert('Error al recibir pedido: ' + error.message);
    } else if (data && !data.success) {
      alert(data.error || 'Error al recibir pedido');
    } else {
      alert('✅ ¡Pedido recibido! Los productos se agregaron a tu inventario.');
      await fetchOrderDetails();
    }
    setReceivingOrder(false);
  };

  const handleReportIncident = async () => {
    if (!incidentForm.description.trim()) {
      alert('Por favor describe la incidencia.');
      return;
    }
    setSubmittingIncident(true);
    try {
      const incidentData = {
        order_id: id,
        incident_type: incidentForm.type,
        description: incidentForm.description.trim(),
        reported_at: new Date().toISOString(),
        status: 'open'
      };
      const { error } = await supabase.from('order_incidents').insert(incidentData);
      if (error) {
        const incNote = `\n\n⚠️ INCIDENCIA (${incidentForm.type}): ${incidentForm.description.trim()} — ${new Date().toLocaleDateString('es-MX')}`;
        await supabase.from('orders').update({ notes: (order.notes || '') + incNote }).eq('id', id);
      }
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'incident_report',
            orderNumber: order.order_number,
            orderId: id,
            status: 'shipped',
            distributorName: order.profiles?.full_name || 'Distribuidor',
            total: order.total_amount,
            incidentType: incidentForm.type,
            incidentDescription: incidentForm.description.trim(),
          }),
        });
      } catch (e) { console.error(e); }
      alert('✅ Incidencia reportada exitosamente. El equipo de Greenland la revisará.');
      setShowIncidentModal(false);
      setIncidentForm({ type: 'discrepancia', description: '' });
      await fetchOrderDetails();
    } catch (err) {
      alert('Error al reportar incidencia: ' + err.message);
    }
    setSubmittingIncident(false);
  };

  const allItemsHaveWarehouse = order?.order_items?.every(item => item.warehouse_id) ?? false;

  const initFulfillmentScan = async () => {
    await fetchOrderDetails();
    const initial = {};
    order.order_items.forEach(item => {
      initial[item.id] = item.fulfilled_quantity || 0;
    });
    setFulfilledQty(initial);
    setScanFeedback(null);
    setFulfillSearchTerm('');
  };

  const handleFulfillmentScan = async (scannedSku) => {
    const sku = scannedSku.trim().toUpperCase();
    const matchingItem = order.order_items.find(i => i.products?.sku?.toUpperCase() === sku);
    if (!matchingItem) {
      setScanFeedback({ type: 'error', message: `${sku} — No está en este pedido`, sku });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }
    const currentFulfilled = fulfilledQty[matchingItem.id] || 0;
    const required = matchingItem.quantity;
    if (currentFulfilled >= required) {
      setScanFeedback({ type: 'warning', message: `${sku} — Ya surtido (${required}/${required})`, sku });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }
    const newQty = currentFulfilled + 1;
    setFulfilledQty(prev => ({ ...prev, [matchingItem.id]: newQty }));
    await supabase.from('scan_logs').insert({
      context: 'fulfillment',
      reference_id: order.id,
      product_id: matchingItem.product_id,
      sku: sku,
      scanned_by: (await supabase.auth.getUser()).data.user?.id,
      warehouse_id: matchingItem.warehouse_id
    });
    await supabase.from('order_items').update({ fulfilled_quantity: newQty }).eq('id', matchingItem.id);
    const productName = matchingItem.products?.name || sku;
    setScanFeedback({ type: 'success', message: `${sku} — ${productName} (${newQty}/${required})`, sku });
    setTimeout(() => setScanFeedback(null), 2000);
  };

  const openFulfillScanner = async () => {
    setShowFulfillScanner(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('fulfill-barcode-reader');
        fulfillScannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            handleFulfillmentScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setScanFeedback({ type: 'error', message: 'No se pudo acceder a la cámara', sku: '' });
        setShowFulfillScanner(false);
        setTimeout(() => setScanFeedback(null), 3000);
      }
    }, 350);
  };

  const closeFulfillScanner = async () => {
    if (fulfillScannerRef.current && !fulfillScannerStoppingRef.current) {
      fulfillScannerStoppingRef.current = true;
      try { await fulfillScannerRef.current.stop(); } catch {}
      fulfillScannerRef.current = null;
      fulfillScannerStoppingRef.current = false;
    }
    setShowFulfillScanner(false);
  };

  const handleFulfillSearchKeyDown = (e) => {
    const now = Date.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (fulfillAutoScanTimerRef.current) { clearTimeout(fulfillAutoScanTimerRef.current); fulfillAutoScanTimerRef.current = null; }
      const val = fulfillSearchTerm.trim();
      if (val) {
        handleFulfillmentScan(val);
        setFulfillSearchTerm('');
      }
      fulfillBarcodeBufferRef.current = '';
      return;
    }
    if (e.key.length === 1) {
      if (now - lastFulfillKeystrokeRef.current > 300) {
        fulfillBarcodeBufferRef.current = '';
      }
      fulfillBarcodeBufferRef.current += e.key;
      lastFulfillKeystrokeRef.current = now;
    }
  };

  const handleFulfillSearchChange = (e) => {
    const val = e.target.value;
    setFulfillSearchTerm(val);
    if (fulfillAutoScanTimerRef.current) clearTimeout(fulfillAutoScanTimerRef.current);
    if (val.trim().length >= 2) {
      fulfillAutoScanTimerRef.current = setTimeout(() => {
        handleFulfillmentScan(val.trim());
        setFulfillSearchTerm('');
        fulfillSearchRef.current?.focus();
      }, 400);
    }
  };

  const handleConfirmOrder = async () => {
    if (!allItemsHaveWarehouse) {
      alert('Debes asignar una bodega de salida a todos los productos antes de confirmar.');
      return;
    }
    if (!confirm('¿Confirmar este pedido? Se reservará el inventario para los productos incluidos.')) return;
    setActionLoading('confirm');
    const { data, error } = await supabase.rpc('confirm_order', { p_order_id: id });
    if (error) {
      alert('Error al confirmar: ' + error.message);
    } else if (data && !data.success) {
      alert('Error al confirmar: ' + data.error);
    } else {
      await fetchOrderDetails();
      sendStatusEmail('confirmed');
    }
    setActionLoading(null);
  };

  // Open transport modal BEFORE printing loading sheet (matching original main)
  const openLoadingSheetPrompt = () => {
    const pw = window.open('', '_blank');
    if (pw) {
      setTransportData({ placas: '', operador: '', sello: '' });
      setPendingPrintWindow(pw);
      setShowTransportModal(true);
    } else {
      alert('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e intenta de nuevo.');
    }
  };

  const printLoadingSheet = (explicitWindow, customTransport) => {
    const win = explicitWindow || pendingPrintWindow || window.open('', '_blank');
    if (!win) { alert('No se pudo abrir la ventana de impresión.'); return; }
    setPendingPrintWindow(null);

    const transport = customTransport || transportData || {};
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const distributor = order.profiles || {};
    const addr = order.shipping_address;

    // Address formatting: match exact main rule (fallback to "Recoger en sitio")
    let addrText = 'Recoger en sitio';
    if (addr && typeof addr === 'object' && (addr.street || addr.city || addr.state || addr.zip_code)) {
      const parts = [];
      if (addr.label) parts.push(addr.label);
      if (addr.street) parts.push(addr.street);
      if (addr.city) parts.push(addr.city);
      if (addr.state) parts.push(addr.state);
      if (addr.zip_code) parts.push(`C.P. ${addr.zip_code}`);
      addrText = parts.join(', ');
    } else if (typeof addr === 'string' && addr.trim()) {
      addrText = addr;
    } else if (order.notes && order.notes.toLowerCase().includes('recoger')) {
      addrText = 'Recoger en sitio';
    }

    const totalPieces = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

    const itemsHtml = order.order_items.map((item, idx) => {
      const whName = warehouses.find(w => w.id === item.warehouse_id)?.name || 'Sin asignar';
      const weight = PRODUCT_WEIGHTS[item.products?.sku] || 0;
      const totalW = (weight * item.quantity).toFixed(1);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;">${idx + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;font-family:monospace;">${item.products?.sku || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${item.products?.name || 'Producto'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;font-size:18px;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;color:#475569;">${weight > 0 ? totalW + ' kg' : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${whName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">☐</td>
        </tr>
      `;
    }).join('');

    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://greenland-products.com.mx';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hoja de Carga — Pedido #${order.order_number}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 13px; line-height: 1.5; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #6a9a04; padding-bottom:16px; margin-bottom:20px; }
    .company { display:flex; align-items:center; gap:12px; }
    .company img { height:50px; width:auto; }
    .company small { display:block; font-size:11px; color:#64748b; font-weight:600; letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
    .meta { text-align:right; }
    .meta .order-num { font-size:22px; font-weight:900; color:#1e293b; }
    .meta .date { font-size:12px; color:#64748b; margin-top:4px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
    .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
    .info-box h4 { font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:#94a3b8; font-weight:700; margin-bottom:6px; }
    .info-box p { font-size:13px; color:#1e293b; font-weight:500; }
    .info-box .big { font-size:15px; font-weight:700; }
    .transport-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
    .transport-box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px; }
    .transport-box h4 { font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:#0284c7; font-weight:700; margin-bottom:6px; }
    .transport-box p { font-size:14px; color:#0c4a6e; font-weight:700; min-height:20px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    thead th { background:#f1f5f9; padding:10px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; font-weight:700; border-bottom:2px solid #cbd5e1; }
    .totals { display:flex; justify-content:space-around; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:20px; text-align:center; }
    .totals div .label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; }
    .totals div .val { font-size:20px; font-weight:900; color:#1e293b; }
    .notes { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 14px; margin-bottom:20px; }
    .notes h4 { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#92400e; font-weight:700; margin-bottom:4px; }
    .notes p { font-size:12px; color:#78350f; }
    .signatures { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:40px; }
    .sig-box { text-align:center; border-top:1px solid #94a3b8; padding-top:8px; }
    .sig-box .title { font-size:11px; font-weight:700; color:#475569; }
    .footer { margin-top:30px; text-align:center; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <img src="${appUrl}/logo-new.jpg" alt="GreenLand" />
      <div>
        <strong>GREENLAND PRODUCTS S.A. DE C.V.</strong>
        <small>Hoja de Carga / Orden de Surtido</small>
      </div>
    </div>
    <div class="meta">
      <div class="order-num">Pedido #${order.order_number}</div>
      <div class="date">${today}</div>
      <div class="date">Impreso: ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>DISTRIBUIDOR</h4>
      <p class="big">${distributor.full_name || '—'}</p>
      <p>${distributor.email || ''}</p>
      <p>${distributor.phone || ''} ${distributor.city ? '· ' + distributor.city : ''}</p>
    </div>
    <div class="info-box">
      <h4>DIRECCIÓN DE ENVÍO</h4>
      <p class="big">${addrText}</p>
    </div>
  </div>

  ${(transport.placas || transport.operador || transport.sello) ? `
  <div class="transport-grid">
    <div class="transport-box">
      <h4>PLACAS</h4>
      <p>${transport.placas || '—'}</p>
    </div>
    <div class="transport-box">
      <h4>OPERADOR / CHOFER</h4>
      <p>${transport.operador || '—'}</p>
    </div>
    <div class="transport-box">
      <h4>NÚMERO DE SELLO</h4>
      <p>${transport.sello || '—'}</p>
    </div>
  </div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">#</th>
        <th style="width:90px;">SKU</th>
        <th>PRODUCTO / MODELO</th>
        <th style="width:70px;text-align:center;">CANTIDAD</th>
        <th style="width:80px;text-align:right;">PESO</th>
        <th style="width:130px;">BODEGA</th>
        <th style="width:40px;text-align:center;">✓</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div>
      <div class="label">Total Piezas</div>
      <div class="val">${totalPieces}</div>
    </div>
    <div>
      <div class="label">Total Modelos</div>
      <div class="val">${order.order_items.length}</div>
    </div>
    <div>
      <div class="label">Peso Total</div>
      <div class="val">${order.order_items.reduce((s,i) => s + (PRODUCT_WEIGHTS[i.products?.sku]||0) * i.quantity, 0).toFixed(1)} kg</div>
    </div>
  </div>

  ${order.notes ? `
  <div class="notes">
    <h4>📌 INSTRUCCIONES / COMENTARIOS</h4>
    <p>${order.notes}</p>
  </div>` : ''}

  <div class="signatures">
    <div class="sig-box">
      <div class="title">Coordinador de Almacén</div>
    </div>
    <div class="sig-box">
      <div class="title">Armador / Cargador</div>
    </div>
    <div class="sig-box">
      <div class="title">Entrega / Transporte</div>
    </div>
  </div>

  <div class="footer">
    Greenland Products — greenland-products.com.mx — Documento generado automáticamente
  </div>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleUpdateStatus = async (newStatus, label) => {
    if (!confirm(`¿Cambiar estado a "${label}"?`)) return;

    let printWindow = null;
    if (newStatus === 'in_fulfillment') {
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Preparando Hoja de Carga...</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#64748b;"><h2>⏳ Preparando hoja de carga...</h2></body></html>');
      }
    }

    setActionLoading(newStatus);
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: id,
      p_new_status: newStatus
    });
    if (error) {
      alert('Error: ' + error.message);
      if (printWindow) printWindow.close();
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
      if (printWindow) printWindow.close();
    } else {
      await fetchOrderDetails();
      sendStatusEmail(newStatus);
      if (newStatus === 'in_fulfillment' && printWindow) {
        setTransportData({ placas: '', operador: '', sello: '' });
        setPendingPrintWindow(printWindow);
        setShowTransportModal(true);
      }
    }
    setActionLoading(null);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor escribe un motivo de cancelación.');
      return;
    }
    setActionLoading('cancelled');
    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: id,
      p_reason: cancelReason.trim()
    });
    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      const msg = data?.message || 'Pedido cancelado exitosamente.';
      alert('✅ ' + msg);
      setShowCancelModal(false);
      setCancelReason('');
      await fetchOrderDetails();
      sendStatusEmail('cancelled');
    }
    setActionLoading(null);
  };

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

  const handleDeleteItem = async (itemId) => {
    if (order.order_items.length <= 1) {
      alert('No puedes eliminar el único producto del pedido. Cancela el pedido si es necesario.');
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar este producto del pedido?')) return;
    setActionLoading(`del-${itemId}`);
    const { data, error } = await supabase.rpc('remove_item_from_order', {
      p_order_id: id,
      p_item_id: itemId
    });
    if (error) {
      alert('Error al eliminar producto: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      setEditingItems(prev => { const next = { ...prev }; delete next[itemId]; return next; });
      setEditingPrices(prev => { const next = { ...prev }; delete next[itemId]; return next; });
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity === 0) {
      return handleDeleteItem(itemId);
    }
    const validQty = validateQuantity(newQuantity);
    if (!validQty) {
      alert('La cantidad debe ser un número entero mayor a 0.');
      setEditingItems(prev => { const next = { ...prev }; delete next[itemId]; return next; });
      return;
    }
    setActionLoading(`qty-${itemId}`);
    const { data, error } = await supabase.rpc('update_order_item_quantity', {
      p_order_id: id,
      p_item_id: itemId,
      p_new_quantity: validQty
    });

    if (error) {
      alert('Error al actualizar cantidad: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      setEditingItems(prev => { const next = { ...prev }; delete next[itemId]; return next; });
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  const handleUpdatePrice = async (itemId, newPrice) => {
    const validP = validatePrice(newPrice);
    if (validP === null) {
      alert('El precio debe ser un número válido mayor o igual a 0.');
      setEditingPrices(prev => { const next = { ...prev }; delete next[itemId]; return next; });
      return;
    }
    setActionLoading(`price-${itemId}`);

    const updatedItems = order.order_items.map(i =>
      i.id === itemId ? { ...i, unit_price: validP, subtotal: validP * i.quantity } : i
    );
    const newTotal = updatedItems.reduce((acc, i) => acc + i.subtotal, 0);

    const { error: itemError } = await supabase
      .from('order_items')
      .update({ unit_price: validP, subtotal: validP * (editingItems[itemId] ?? updatedItems.find(i=>i.id===itemId).quantity) })
      .eq('id', itemId);

    if (itemError) {
      alert('Error al actualizar precio del producto: ' + itemError.message);
    } else {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', id);

      if (orderError) {
        alert('Error al actualizar total del pedido: ' + orderError.message);
      } else {
        setEditingPrices(prev => { const next = { ...prev }; delete next[itemId]; return next; });
        await fetchOrderDetails();
      }
    }
    setActionLoading(null);
  };

  const handleRegisterPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert('Por favor ingresa un monto válido.');
      return;
    }
    setActionLoading('payment');
    const { data, error } = await supabase.from('order_payments').insert({
      order_id: id,
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference || null,
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || null,
      recorded_by: (await supabase.auth.getUser()).data.user?.id
    }).select().single();

    if (error) {
      alert('Error al registrar pago: ' + error.message);
    } else {
      const newTotalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0) + parseFloat(paymentForm.amount);
      const totalAmount = Number(order.total_amount);
      let newPayStatus = 'partial';
      if (newTotalPaid >= totalAmount) newPayStatus = 'paid';
      if (newTotalPaid <= 0) newPayStatus = 'unpaid';

      await supabase.from('orders').update({ payment_status: newPayStatus }).eq('id', id);

      setShowPaymentModal(false);
      setPaymentForm({
        amount: '', payment_method: 'transferencia', reference: '',
        payment_date: new Date().toISOString().split('T')[0], notes: ''
      });
      await fetchOrderDetails();
    }
    setActionLoading(null);
  };

  const handleEvidenceUpload = async (files, type) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const user = (await supabase.auth.getUser()).data.user;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const filename = `${id}/${type}_${Date.now()}_${i}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('order-evidence')
        .upload(filename, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) {
        alert('Error al subir imagen: ' + uploadErr.message);
        continue;
      }

      await supabase.from('order_evidence').insert({
        order_id: id,
        file_url: filename,
        evidence_type: type,
        file_name: file.name,
        uploaded_by: user?.id
      });
    }

    setUploading(false);
    await fetchOrderDetails();
  };

  const handleDeleteEvidence = async (ev) => {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    let storagePath = ev.file_url;
    const match = ev.file_url?.match(/order-evidence\/(.+)$/);
    if (match) {
      storagePath = match[1];
    }

    if (storagePath) {
      await supabase.storage.from('order-evidence').remove([storagePath]);
    }
    await supabase.from('order_evidence').delete().eq('id', ev.id);
    await fetchOrderDetails();
  };

  const handleAddProduct = async (product) => {
    const { data, error } = await supabase.rpc('add_item_to_order', {
      p_order_id: id,
      p_product_id: product.id,
      p_quantity: 1,
      p_unit_price: product.price || 0
    });
    if (error) {
      alert('Error al agregar producto: ' + error.message);
    } else if (data && !data.success) {
      alert('Error: ' + data.error);
    } else {
      setShowAddProduct(false);
      setProductSearch('');
      setAvailableProducts([]);
      await fetchOrderDetails();
    }
  };

  const handleReorder = async () => {
    if (!confirm('¿Deseas volver a pedir estos mismos productos en un nuevo pedido?')) return;
    try {
      const reorderItems = order.order_items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: item.products?.name,
        sku: item.products?.sku,
        image_url: item.products?.image_url
      }));
      sessionStorage.setItem('reorder_items', JSON.stringify(reorderItems));
      router.push('/dashboard/pedidos/nuevo');
    } catch (e) {
      alert('Error al preparar el re-pedido');
    }
  };

  return {
    id, router, supabase,
    order, setOrder, payments, evidence, evidenceTab, setEvidenceTab, uploading, lightboxImg, setLightboxImg,
    loading, actionLoading, receivingOrder, submittingIncident,
    isAdmin, isSuperAdmin,
    warehouses, warehouseStock,
    showRejectModal, setShowRejectModal, rejectionReason, setRejectionReason,
    showPaymentModal, setShowPaymentModal, paymentForm, setPaymentForm,
    showCancelModal, setShowCancelModal, cancelReason, setCancelReason,
    showIncidentModal, setShowIncidentModal, incidentForm, setIncidentForm,
    showTransportModal, setShowTransportModal, transportData, setTransportData, pendingPrintWindow, setPendingPrintWindow,
    showFulfillmentScan, setShowFulfillmentScan, fulfilledQty, setFulfilledQty, scanFeedback, setScanFeedback,
    showFulfillScanner, setShowFulfillScanner,
    fulfillSearchTerm, setFulfillSearchTerm, fulfillSearchRef,
    editingItems, setEditingItems, editingPrices, setEditingPrices,
    showAddProduct, setShowAddProduct, productSearch, setProductSearch, availableProducts,
    allItemsHaveWarehouse,
    fetchOrderDetails,
    handleAssignWarehouse,
    handleReceiveOrder,
    handleReportIncident,
    initFulfillmentScan,
    handleFulfillmentScan,
    openFulfillScanner,
    closeFulfillScanner,
    handleFulfillSearchKeyDown,
    handleFulfillSearchChange,
    handleConfirmOrder,
    openLoadingSheetPrompt,
    printLoadingSheet,
    handleUpdateStatus,
    handleCancelOrder,
    handleReject,
    handleDeleteItem,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleRegisterPayment,
    handleEvidenceUpload,
    handleDeleteEvidence,
    handleAddProduct,
    handleReorder,
  };
}
