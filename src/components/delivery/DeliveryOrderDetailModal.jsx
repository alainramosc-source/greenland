'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Phone, User, MessageCircle, Package, Truck, CheckCircle2,
  AlertTriangle, RotateCcw, Image as ImageIcon, Save, Check
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DeliveryOrderDetailModal({ order, isOpen, onClose, onOrderUpdated }) {
  const supabase = createClient();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'return'
  const [vitoAlessioWarehouseId, setVitoAlessioWarehouseId] = useState(null);

  // Return state
  const [returnReason, setReturnReason] = useState(order?.return_reason || 'ausente');
  const [returnNotes, setReturnNotes] = useState(order?.return_notes || '');
  const [evidenceUrl, setEvidenceUrl] = useState(order?.return_evidence_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [returnedItems, setReturnedItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Load Vito Alessio warehouse ID
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('warehouses').select('id, name, code').eq('is_active', true);
      if (data && data.length > 0) {
        const vito = data.find(w => w.code === 'vito-alessio' || w.name?.toLowerCase().includes('vito'));
        setVitoAlessioWarehouseId(vito?.id || data[0].id);
      }
    })();
  }, [supabase]);

  // Init returned items selection from order items
  useEffect(() => {
    if (!order) return;
    const items = order.items || [];
    const initMap = {};
    items.forEach((item, idx) => {
      initMap[item.product_id || item.sku || idx] = item.quantity || 1;
    });
    setReturnedItems(initMap);
    setReturnReason(order.return_reason || 'ausente');
    setReturnNotes(order.return_notes || '');
    setEvidenceUrl(order.return_evidence_url || '');
    setStatusMessage(null);
  }, [order]);

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

  const items = order.items || [];
  const totalAmount = order.total || order.subtotal || 0;
  const lat = parseFloat(order.lat);
  const lng = parseFloat(order.lng);
  const hasValidGps = !isNaN(lat) && !isNaN(lng);

  // Handle Photo Upload
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', order.id || 'returns');

      const res = await fetch('/api/inbox/upload', {
        method: 'POST',
        body: formData,
      });

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

  // Handle Confirm Return & Restock to Vito Alessio
  async function handleConfirmReturn() {
    if (!vitoAlessioWarehouseId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Prepare return payload
      const returnPayload = items.map((item, idx) => {
        const key = item.product_id || item.sku || idx;
        const qtyReturned = parseInt(returnedItems[key] || 0);
        return {
          product_id: item.product_id,
          sku: item.sku,
          name: item.name,
          quantity_returned: qtyReturned,
        };
      });

      const isPartial = returnPayload.some(r => r.quantity_returned < items.find(i => (i.product_id || i.sku) === (r.product_id || r.sku))?.quantity);
      const newStatus = isPartial ? 'partially_returned' : 'returned';

      // 2. Update order record in Supabase
      const { error: updateErr } = await supabase
        .from('lastmile_orders')
        .update({
          status: newStatus,
          return_reason: returnReason,
          return_notes: returnNotes,
          return_evidence_url: evidenceUrl,
          returned_items: returnPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateErr) throw updateErr;

      // 3. Restock returned items to Vito Alessio Warehouse via RPC adjust_warehouse_stock
      const { data: { user } } = await supabase.auth.getUser();
      let totalReintegrated = 0;

      for (const item of returnPayload) {
        if (item.product_id && item.quantity_returned > 0) {
          try {
            await supabase.rpc('adjust_warehouse_stock', {
              p_product_id: item.product_id,
              p_warehouse_id: vitoAlessioWarehouseId,
              p_quantity_change: item.quantity_returned,
              p_reason: `Devolución ${newStatus === 'partially_returned' ? 'parcial' : 'total'} - Orden ${order.order_number}`,
              p_user_id: user?.id || null,
            });
            totalReintegrated += item.quantity_returned;
          } catch (rpcErr) {
            console.error('RPC restock error for product:', item.sku, rpcErr);
          }
        }
      }

      setStatusMessage(`✅ Devolución procesada con éxito. Se reintegraron ${totalReintegrated} piezas a la bodega Vito Alessio.`);
      onOrderUpdated && onOrderUpdated();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Return settlement error:', err);
      alert('Error al procesar la devolución: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6a9a04]/20 to-emerald-500/20 border border-[#6a9a04]/40 flex items-center justify-center text-[#8cc618]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">{order.order_number || 'Pedido Envío'}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  order.status === 'returned' || order.status === 'partially_returned' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  order.status === 'in_transit' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {order.status === 'delivered' ? 'Entregado' :
                   order.status === 'returned' ? 'Devolución Total' :
                   order.status === 'partially_returned' ? 'Devolución Parcial' :
                   order.status === 'in_transit' ? 'En Ruta' : 'Pendiente Almacén'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Monto Total: <span className="font-bold text-[#8cc618]">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'details' ? 'bg-[#6a9a04] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📋 Detalle de Carga
              </button>
              <button
                onClick={() => setActiveTab('return')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'return' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📦 Devolución / VoBo
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {statusMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Customer & Address */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Datos del Cliente
                    </span>
                    {order.customer_phone && (
                      <a
                        href={`https://wa.me/52${order.customer_phone.replace(/\D/g, '')}`}
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
                </div>

                {/* Delivery Address */}
                <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8cc618]" /> Dirección de Entrega
                  </span>
                  <p className="text-xs font-bold text-slate-200 leading-relaxed">
                    {order.address_street} #{order.address_ext_number} {order.address_int_number ? `Int. ${order.address_int_number}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {order.address_municipality || order.city}, {order.state} {order.zip_code ? `C.P. ${order.zip_code}` : ''}
                  </p>
                  {order.special_instructions && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-[10px] font-bold text-amber-400 block">Referencias de la fachada / Entrega:</span>
                      <p className="text-xs text-slate-300 italic">"{order.special_instructions}"</p>
                    </div>
                  )}
                </div>

                {/* Leaflet GPS Map */}
                {hasValidGps ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>📍 Pin de Ubicación GPS</span>
                      <span className="font-mono text-[10px] text-[#8cc618]">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                    </span>
                    <div
                      ref={mapRef}
                      className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700 z-0 shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-center">
                    <p className="text-xs text-slate-400 italic">Pin de mapa no especificado por el cliente</p>
                  </div>
                )}
              </div>

              {/* Right Column: Items Breakdown */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-[#8cc618]" /> Productos a Cargar (Almacén)
                  </span>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">${(item.sale_price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Return Summary if already returned */}
                {(order.status === 'returned' || order.status === 'partially_returned') && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2">
                    <span className="text-[11px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <RotateCcw className="w-4 h-4" /> Expediente de Devolución
                    </span>
                    <p className="text-xs font-bold text-white">Motivo: <span className="capitalize">{order.return_reason || 'Sin especificar'}</span></p>
                    {order.return_notes && <p className="text-xs text-slate-300 italic">"{order.return_notes}"</p>}
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
                  <AlertTriangle className="w-4 h-4" /> Registro de Devolución e Ingreso a Almacén
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Al confirmar esta devolución, las piezas físicas seleccionadas serán **reintegradas automáticamente** al inventario disponible de la bodega **Vito Alessio**.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Motivo de No-Entrega / Devolución</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    <option value="ausente">👤 Cliente ausente / No atendió</option>
                    <option value="rechazado">🚫 Cliente rechazó el producto</option>
                    <option value="direccion_incorrecta">📍 Dirección incorrecta / Inaccesible</option>
                    <option value="no_pago">💵 No realizó el pago requerido</option>
                    <option value="otro">❓ Otro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Evidencia Fotográfica (opcional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="evidence-input"
                    />
                    <label
                      htmlFor="evidence-input"
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                    >
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
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notas u observaciones del chófer / almacén</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Detalla cualquier información adicional sobre la entrega fallida..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {/* Items Return Quantity Picker */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Selecciona la cantidad de piezas devueltas físicamente
                </span>
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const key = item.product_id || item.sku || idx;
                    const maxQty = item.quantity || 1;
                    const currentRet = returnedItems[key] ?? maxQty;
                    return (
                      <div key={idx} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
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
                              setReturnedItems(prev => ({ ...prev, [key]: val }));
                            }}
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleConfirmReturn}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20 disabled:opacity-40"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isSubmitting ? 'Reintegrando Stock...' : 'Confirmar VoBo y Reintegrar Stock a Vito Alessio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
