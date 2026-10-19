'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Phone, User, Users, MessageCircle, Package, Truck, CheckCircle2,
  AlertTriangle, RotateCcw, Image as ImageIcon, Check, Printer, Copy, Wallet,
  Navigation, Clock, Signpost, Landmark
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import DeliverOrderModal from './DeliverOrderModal';
import {
  getDeliveryStatus, TONE_CLASSES_DARK, hasCustomerData, isInTransit, isReturned,
  formatStreetLine, formatCityLine, formatMoney, whatsappUrl, mapsUrl, getItems,
  PAYMENT_METHODS, RETURN_REASONS
} from './deliveryUtils';

export default function DeliveryOrderDetailModal({ order, isOpen, onClose, onOrderUpdated }) {
  const supabase = createClient();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'return'
  const [warehouses, setWarehouses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Dispatch form
  const [dispatchWarehouse, setDispatchWarehouse] = useState('');
  const [dispatchDriver, setDispatchDriver] = useState('');

  // Prepayment form
  const [showPrepay, setShowPrepay] = useState(false);
  const prepayMethod = 'transfer'; // anticipos solo por transferencia
  const [prepayAmount, setPrepayAmount] = useState('');

  // Deliver dialog
  const [showDeliver, setShowDeliver] = useState(false);

  // Return state
  const [returnReason, setReturnReason] = useState('ausente');
  const [returnNotes, setReturnNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [returnedItems, setReturnedItems] = useState({});
  const [restock, setRestock] = useState(true);
  const [partialMethod, setPartialMethod] = useState('');
  const [partialAmount, setPartialAmount] = useState('');

  // Load warehouses, assignable drivers (admins + drivers) and current user
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [{ data: { user } }, { data: wh }, { data: people }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'driver']).eq('is_active', true).order('full_name'),
      ]);
      setCurrentUserId(user?.id || null);
      setWarehouses(wh || []);
      setDrivers(people || []);
    })();
  }, [isOpen, supabase]);

  // Reset per-order state
  useEffect(() => {
    if (!order) return;
    const initMap = {};
    getItems(order).forEach(item => {
      if (item.product_id) initMap[item.product_id] = item.quantity || 1;
    });
    setReturnedItems(initMap);
    setReturnReason(order.return_reason || 'ausente');
    setReturnNotes(order.return_notes || '');
    setEvidenceUrl(order.return_evidence_url || '');
    setRestock(true);
    setPartialMethod('');
    setPartialAmount('');
    setPrepayAmount(String(order.total || ''));
    setShowPrepay(false);
    setStatusMessage(null);
    setErrorMessage(null);
    setActiveTab('details');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Default dispatch selections
  useEffect(() => {
    if (!order) return;
    const fromOrder = order.warehouse_id || warehouses.find(w => w.name === order.warehouse_name)?.id;
    const vito = warehouses.find(w => w.code === 'vito-alessio' || w.name?.toLowerCase().includes('vito'));
    setDispatchWarehouse(fromOrder || vito?.id || warehouses[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, warehouses]);

  useEffect(() => {
    if (!order) return;
    setDispatchDriver(order.assigned_driver_id || currentUserId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, currentUserId]);

  // Leaflet Map Init
  useEffect(() => {
    if (!isOpen || !order || activeTab !== 'details') return;
    const lat = parseFloat(order.lat);
    const lng = parseFloat(order.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const initMap = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        const map = window.L.map(mapRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
        });
        mapInstanceRef.current = map;

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const pinIcon = window.L.divIcon({
          className: 'custom-leaflet-pin',
          html: `<div style="
            background-color: #6a9a04;
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);

        setTimeout(() => map.invalidateSize(), 200);
      };

      if (window.L) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, order, activeTab]);

  if (!isOpen || !order) return null;

  const items = getItems(order);
  const productItems = items.filter(i => i.product_id);
  const totalAmount = Number(order.total || order.subtotal || 0);
  const lat = parseFloat(order.lat);
  const lng = parseFloat(order.lng);
  const hasValidGps = !isNaN(lat) && !isNaN(lng);
  const status = getDeliveryStatus(order);
  const customerReady = hasCustomerData(order);
  const canDispatch = (order.status === 'pending' || order.status === 'confirmed') && customerReady;
  const canPrepay = order.payment_status !== 'paid' && ['pending', 'confirmed', 'in_transit', 'in_delivery'].includes(order.status);
  const canReturn = !order.settled_at && !order.restocked_at && (isInTransit(order) || isReturned(order));
  const driverName = (id) => {
    const p = drivers.find(d => d.id === id);
    return p ? (p.full_name || p.email) : null;
  };
  const checkoutLink = typeof window !== 'undefined' ? `${window.location.origin}/entrega/${order.checkout_token}` : '';

  async function runRpc(key, fn, args, successText) {
    setBusy(key);
    setErrorMessage(null);
    setStatusMessage(null);
    const { data, error } = await supabase.rpc(fn, args);
    setBusy(null);
    if (error) {
      setErrorMessage(error.message);
      return null;
    }
    if (successText) setStatusMessage(typeof successText === 'function' ? successText(data) : successText);
    onOrderUpdated && onOrderUpdated();
    return data || true;
  }

  async function handleDispatch() {
    const whName = warehouses.find(w => w.id === dispatchWarehouse)?.name || 'la bodega';
    const deductNote = order.stock_deducted_at
      ? 'El inventario de este pedido ya se había descontado al crear el link; no se descontará otra vez.'
      : `Se descontará el inventario de ${whName}.`;
    if (!window.confirm(`¿Surtir ${order.order_number} y mandarlo a ruta con ${driverName(dispatchDriver) || 'el chofer seleccionado'}?\n\n${deductNote}`)) return;
    await runRpc('dispatch', 'dispatch_lastmile_order', {
      p_order_id: order.id,
      p_driver_id: dispatchDriver,
      p_warehouse_id: dispatchWarehouse || null,
    }, (d) => d?.already_deducted
      ? '✅ Pedido en ruta. El inventario ya estaba descontado.'
      : `✅ Pedido en ruta. Inventario descontado de ${d?.warehouse || whName}.`);
  }

  async function handlePrepay() {
    const amountNum = parseFloat(prepayAmount);
    if (isNaN(amountNum) || amountNum <= 0) { setErrorMessage('Monto no válido'); return; }
    const ok = await runRpc('prepay', 'register_lastmile_prepayment', {
      p_order_id: order.id,
      p_method: prepayMethod,
      p_amount: amountNum,
    }, '✅ Pago por transferencia registrado. El pedido quedó como pagado.');
    if (ok) setShowPrepay(false);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', order.id || 'returns');
      const res = await fetch('/api/inbox/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.url) setEvidenceUrl(data.url);
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  }

  const returnPayload = productItems.map(item => ({
    product_id: item.product_id,
    sku: item.sku,
    name: item.name,
    quantity_returned: parseInt(returnedItems[item.product_id] ?? item.quantity ?? 0) || 0,
  }));
  const isPartialReturn = returnPayload.some((r, idx) => r.quantity_returned < (productItems[idx].quantity || 0));

  async function handleConfirmReturn() {
    if (isPartialReturn && !partialMethod) {
      setErrorMessage('Seleccione un método de pago');
      return;
    }
    const willRestock = restock && Boolean(order.stock_deducted_at);
    const msg = willRestock
      ? `¿Confirmar devolución y reintegrar las piezas a ${order.warehouse_name || 'la bodega'}?`
      : '¿Confirmar devolución? (no se moverá inventario)';
    if (!window.confirm(msg)) return;
    const ok = await runRpc('return', 'return_lastmile_order', {
      p_order_id: order.id,
      p_reason: returnReason,
      p_notes: returnNotes || null,
      p_evidence_url: evidenceUrl || null,
      p_returned_items: returnPayload,
      p_restock: willRestock,
      p_collected_method: isPartialReturn ? partialMethod : null,
      p_collected_amount: isPartialReturn ? (parseFloat(partialAmount) || 0) : null,
    }, (d) => d?.restocked_pieces > 0
      ? `✅ Devolución registrada. Se reintegraron ${d.restocked_pieces} piezas al inventario.`
      : '✅ Devolución registrada.');
    if (ok) setActiveTab('details');
  }

  function copyLink() {
    navigator.clipboard.writeText(checkoutLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const cardClass = 'p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl';
  const labelClass = 'text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1';
  const selectClass = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6a9a04]/20 to-emerald-500/20 border border-[#6a9a04]/40 flex items-center justify-center text-[#8cc618]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white">{order.order_number || 'Pedido Envío'}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${TONE_CLASSES_DARK[status.tone]}`}>
                  {status.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${order.payment_status === 'paid' ? TONE_CLASSES_DARK.emerald : TONE_CLASSES_DARK.slate}`}>
                  {order.payment_status === 'paid' ? 'Pagado' : 'Por cobrar'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Total: <span className="font-bold text-[#8cc618]">{formatMoney(totalAmount)}</span>
                {order.warehouse_name && <> · Bodega: {order.warehouse_name}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/dashboard/entregas/${order.id}`, '_blank')}
              disabled={!customerReady}
              title={customerReady ? 'Imprimir hoja de entrega para el chofer' : 'El cliente todavía no llena sus datos'}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" /> Hoja de entrega
            </button>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'details' ? 'bg-[#6a9a04] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                📋 Detalle
              </button>
              {canReturn && (
                <button
                  onClick={() => setActiveTab('return')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'return' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  📦 Devolución
                </button>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-xs font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Customer & Address */}
              <div className="space-y-4">
                {!customerReady && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> El cliente todavía no llena sus datos de entrega
                    </p>
                    <button onClick={copyLink} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer">
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {linkCopied ? 'Link copiado' : 'Copiar link para el cliente'}
                    </button>
                  </div>
                )}

                {/* Customer */}
                <div className={`${cardClass} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={labelClass}><User className="w-3.5 h-3.5" /> Cliente</span>
                    {whatsappUrl(order.customer_phone) && (
                      <a
                        href={whatsappUrl(order.customer_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all no-underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">{order.customer_name || 'Sin nombre registrado'}</p>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{order.customer_phone || 'Sin teléfono'}</span>
                    </p>
                  </div>

                  {/* Alternate contact */}
                  <div className="pt-3 border-t border-slate-700/50">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Users className="w-3.5 h-3.5" /> Contacto alterno (si el cliente no está)
                    </span>
                    {order.customer_alt_contact || order.customer_alt_phone ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{order.customer_alt_contact || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-400 font-mono">{order.customer_alt_phone || 'Sin teléfono'}</p>
                        </div>
                        {whatsappUrl(order.customer_alt_phone) && (
                          <a href={whatsappUrl(order.customer_alt_phone)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold no-underline flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No especificado</p>
                    )}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className={`${cardClass} space-y-2`}>
                  <span className={labelClass}><MapPin className="w-3.5 h-3.5 text-[#8cc618]" /> Dirección de entrega</span>
                  {customerReady ? (
                    <>
                      <p className="text-sm font-bold text-slate-100 leading-relaxed">{formatStreetLine(order)}</p>
                      <p className="text-xs text-slate-300">{formatCityLine(order)}</p>
                      <div className="pt-2 mt-1 border-t border-slate-700/50 space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Signpost className="w-3 h-3" /> Entre calles</span>
                          <p className="text-xs text-slate-200">{order.address_between_streets || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Referencia de la fachada</span>
                          <p className="text-xs text-slate-200">{order.address_references || '—'}</p>
                        </div>
                      </div>
                      {order.special_instructions && (
                        <div className="pt-2 border-t border-slate-700/50">
                          <span className="text-[10px] font-bold text-amber-400 block">Instrucciones especiales</span>
                          <p className="text-xs text-amber-100 italic">"{order.special_instructions}"</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Pendiente</p>
                  )}
                </div>

                {/* Leaflet GPS Map */}
                {hasValidGps && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>📍 Pin de ubicación GPS</span>
                      <a href={mapsUrl(order)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#8cc618] no-underline flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> {lat.toFixed(5)}, {lng.toFixed(5)}
                      </a>
                    </span>
                    <div ref={mapRef} className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700 z-0 shadow-inner" />
                  </div>
                )}
              </div>

              {/* Right Column: Items + Operations */}
              <div className="space-y-4">
                <div className={`${cardClass} space-y-3`}>
                  <span className={labelClass}><Package className="w-3.5 h-3.5 text-[#8cc618]" /> Productos a cargar</span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-[#6a9a04]/20 border border-[#6a9a04]/40 text-[#8cc618] rounded-lg text-xs font-black">
                            x{item.quantity}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">{formatMoney(item.sale_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Total</span>
                    <span className="text-base font-black text-[#8cc618]">{formatMoney(totalAmount)}</span>
                  </div>
                </div>

                {/* Operations */}
                <div className={`${cardClass} space-y-3`}>
                  <span className={labelClass}><Truck className="w-3.5 h-3.5 text-[#8cc618]" /> Operación</span>

                  {/* Inventory status */}
                  <p className="text-[11px] text-slate-400">
                    Inventario:{' '}
                    {order.stock_deducted_at
                      ? <span className="font-bold text-emerald-300">ya salió de {order.warehouse_name || 'bodega'}</span>
                      : <span className="font-bold text-amber-300">todavía no sale (sale al surtir)</span>}
                    {order.restocked_at && <span className="font-bold text-sky-300"> · reintegrado por devolución</span>}
                  </p>

                  {/* Awaiting data */}
                  {!customerReady && (order.status === 'pending' || order.status === 'confirmed') && (
                    <p className="text-xs text-slate-400">Podrás surtirlo cuando el cliente llene sus datos.</p>
                  )}

                  {/* Dispatch */}
                  {canDispatch && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Sale de bodega</label>
                          <select value={dispatchWarehouse} onChange={(e) => setDispatchWarehouse(e.target.value)} className={selectClass} disabled={Boolean(order.stock_deducted_at)}>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Chofer</label>
                          <select value={dispatchDriver} onChange={(e) => setDispatchDriver(e.target.value)} className={selectClass}>
                            <option value="">Seleccionar...</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>
                                {(d.full_name || d.email)}{d.id === currentUserId ? ' (yo)' : ''}{d.role === 'driver' ? ' · chofer' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleDispatch}
                        disabled={!dispatchDriver || !dispatchWarehouse || busy === 'dispatch'}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <Truck className="w-4 h-4" />
                        {busy === 'dispatch' ? 'Surtiendo...' : 'Surtir y mandar a ruta'}
                      </button>
                    </div>
                  )}

                  {/* In transit */}
                  {isInTransit(order) && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-300">
                        En ruta con <span className="font-bold text-white">{driverName(order.assigned_driver_id) || 'chofer asignado'}</span>
                        {order.dispatched_at && <span className="text-slate-500"> · desde {new Date(order.dispatched_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                      </p>
                      <button
                        onClick={() => setShowDeliver(true)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6a9a04] to-[#557e03] hover:brightness-110 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Marcar entregado
                      </button>
                    </div>
                  )}

                  {/* Delivered / returned summary */}
                  {(order.status === 'delivered' || isReturned(order)) && (
                    <div className="space-y-1.5 text-xs">
                      {order.delivered_at && (
                        <p className="text-slate-300">
                          Entregó <span className="font-bold text-white">{driverName(order.delivered_by) || '—'}</span> el {new Date(order.delivered_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {order.collected_method && (
                        <p className="text-slate-300">
                          Cobro: <span className="font-bold text-white">{PAYMENT_METHODS[order.collected_method] || order.collected_method}</span>
                          {Number(order.collected_amount) > 0 && <> · <span className="font-bold text-[#8cc618]">{formatMoney(order.collected_amount)}</span></>}
                        </p>
                      )}
                      {order.delivery_notes && <p className="text-slate-400 italic">"{order.delivery_notes}"</p>}
                      {order.settled_at ? (
                        <p className="text-emerald-300 font-bold flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Liquidado el {new Date(order.settled_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                      ) : (
                        <p className="text-violet-300 font-bold flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Pendiente de liquidar (botón "Liquidar ruta" en Envíos)</p>
                      )}
                    </div>
                  )}

                  {/* Prepayment */}
                  {canPrepay && (
                    <div className="pt-3 border-t border-slate-700/50">
                      {!showPrepay ? (
                        <button onClick={() => setShowPrepay(true)} className="text-xs font-bold text-sky-300 hover:text-sky-200 flex items-center gap-1.5 cursor-pointer">
                          <Wallet className="w-3.5 h-3.5" /> Registrar pago anticipado
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400">El cliente pagó por transferencia antes de la entrega. El chofer ya no cobrará.</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`${selectClass} flex items-center gap-1.5 font-bold`}>
                              <Landmark className="w-3.5 h-3.5 text-sky-300" /> Transferencia
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                              <input type="number" min="0" step="0.01" value={prepayAmount} onChange={(e) => setPrepayAmount(e.target.value)} className={`${selectClass} pl-6`} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setShowPrepay(false)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Cancelar</button>
                            <button onClick={handlePrepay} disabled={busy === 'prepay'} className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-40">
                              {busy === 'prepay' ? 'Guardando...' : 'Registrar pago'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Return file */}
                {isReturned(order) && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2">
                    <span className="text-[11px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <RotateCcw className="w-4 h-4" /> Expediente de devolución
                    </span>
                    <p className="text-xs font-bold text-white">Motivo: {RETURN_REASONS[order.return_reason] || order.return_reason || 'Sin especificar'}</p>
                    {order.return_notes && <p className="text-xs text-slate-300 italic">"{order.return_notes}"</p>}
                    {(order.returned_items || []).filter(r => r.quantity_returned > 0).map((r, i) => (
                      <p key={i} className="text-[11px] text-slate-300">↩ {r.quantity_returned} × {r.name || r.sku}</p>
                    ))}
                    {!order.restocked_at && order.stock_deducted_at && (
                      <p className="text-[11px] font-bold text-amber-300">Falta el VoBo de almacén para reintegrar inventario (pestaña Devolución).</p>
                    )}
                    {order.return_evidence_url && (
                      <a href={order.return_evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline font-bold inline-block pt-1">
                        📷 Ver foto de evidencia
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Return / Settlement Tab */
            <div className="space-y-5">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <h4 className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Devolución y VoBo de almacén
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {order.stock_deducted_at
                    ? <>Al confirmar con "reintegrar" marcado, las piezas devueltas regresan al inventario de <b>{order.warehouse_name || 'la bodega de origen'}</b>.</>
                    : <>El inventario de este pedido nunca salió, así que no hay nada que reintegrar.</>}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Motivo de no-entrega / devolución</label>
                  <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className={selectClass}>
                    {Object.entries(RETURN_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Evidencia fotográfica (opcional)</label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="evidence-input" />
                    <label htmlFor="evidence-input" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all">
                      <ImageIcon className="w-4 h-4" />
                      {uploadingPhoto ? 'Subiendo...' : 'Tomar / Subir Foto'}
                    </label>
                    {evidenceUrl && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Foto lista
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notas u observaciones del chofer / almacén</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Detalla cualquier información adicional sobre la entrega fallida..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Piezas devueltas físicamente</span>
                <div className="space-y-2">
                  {productItems.map((item) => {
                    const maxQty = item.quantity || 1;
                    const currentRet = returnedItems[item.product_id] ?? maxQty;
                    return (
                      <div key={item.product_id} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Enviados: {maxQty} unidades</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold">Devolver:</span>
                          <input
                            type="number"
                            min="0"
                            max={maxQty}
                            value={currentRet}
                            onChange={(e) => {
                              const val = Math.min(maxQty, Math.max(0, parseInt(e.target.value) || 0));
                              setReturnedItems(prev => ({ ...prev, [item.product_id]: val }));
                            }}
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isPartialReturn && (
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-200">Devolución parcial: ¿cuánto cobró el chofer por lo que sí se quedó el cliente?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={partialMethod} onChange={(e) => { setPartialMethod(e.target.value); setErrorMessage(null); }} className={selectClass}>
                      <option value="" disabled>Método de pago...</option>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      {order.payment_status === 'paid' && <option value="prepaid">Ya estaba pagado</option>}
                      <option value="none">No cobró</option>
                    </select>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input type="number" min="0" step="0.01" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} placeholder="0.00" className={`${selectClass} pl-6`} />
                    </div>
                  </div>
                  {errorMessage === 'Seleccione un método de pago' && (
                    <p className="text-xs font-bold text-red-400">Seleccione un método de pago</p>
                  )}
                </div>
              )}

              {order.stock_deducted_at && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="w-4 h-4 accent-[#6a9a04]" />
                  Las piezas ya están físicamente en bodega: reintegrar al inventario
                </label>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleConfirmReturn}
                  disabled={busy === 'return'}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20 disabled:opacity-40"
                >
                  <RotateCcw className="w-4 h-4" />
                  {busy === 'return' ? 'Guardando...' : (restock && order.stock_deducted_at ? 'Confirmar VoBo y reintegrar stock' : 'Confirmar devolución')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeliver && (
        <DeliverOrderModal
          order={order}
          onClose={() => setShowDeliver(false)}
          onDone={() => {
            setShowDeliver(false);
            setStatusMessage('✅ Entrega registrada. El cobro queda pendiente de liquidar.');
            onOrderUpdated && onOrderUpdated();
          }}
        />
      )}
    </div>
  );
}
