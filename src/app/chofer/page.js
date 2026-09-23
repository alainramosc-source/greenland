'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Truck, MapPin, Phone, MessageCircle, CheckCircle2, AlertTriangle,
  RotateCcw, Navigation, Camera, Check, X, RefreshCw
} from 'lucide-react';

export default function ChoferRoutePage() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalType, setModalType] = useState(null); // 'deliver' | 'return'

  // Return state
  const [returnReason, setReturnReason] = useState('ausente');
  const [returnNotes, setReturnNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRouteOrders();
  }, []);

  async function loadRouteOrders() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('lastmile_orders')
        .select('*')
        .order('created_at', { ascending: false });

      setOrders(data || []);
    } catch (err) {
      console.error('Error loading chofer route orders:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Photo Upload from mobile camera
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', selectedOrder?.id || 'chofer_returns');

      const res = await fetch('/api/inbox/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) setEvidenceUrl(data.url);
      }
    } catch (err) {
      console.error('Camera upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Mark as Delivered
  async function handleMarkDelivered(order) {
    setSubmitting(true);
    try {
      await supabase
        .from('lastmile_orders')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o));
      setModalType(null);
      setSelectedOrder(null);
    } catch (err) {
      alert('Error al actualizar estatus');
    } finally {
      setSubmitting(false);
    }
  }

  // Mark as Return
  async function handleMarkReturn() {
    if (!selectedOrder || submitting) return;
    setSubmitting(true);
    try {
      const returnPayload = (selectedOrder.items || []).map(item => ({
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        quantity_returned: item.quantity || 1,
      }));

      await supabase
        .from('lastmile_orders')
        .update({
          status: 'returned',
          return_reason: returnReason,
          return_notes: returnNotes,
          return_evidence_url: evidenceUrl,
          returned_items: returnPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
        ...o,
        status: 'returned',
        return_reason: returnReason,
        return_notes: returnNotes,
        return_evidence_url: evidenceUrl,
      } : o));

      setModalType(null);
      setSelectedOrder(null);
    } catch (err) {
      alert('Error al registrar devolución');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Mobile Top Bar */}
      <header className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#6a9a04] to-[#557e03] flex items-center justify-center text-white font-black shadow-md shadow-[#6a9a04]/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide uppercase">Ruta de Entregas</h1>
            <p className="text-[10px] font-bold text-[#8cc618]">Greenland Logistics Móvil</p>
          </div>
        </div>

        <button
          onClick={loadRouteOrders}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
          title="Actualizar ruta"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4 pb-20">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-slate-700 border-t-[#6a9a04] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Cargando paradas de la ruta...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-200">No hay entregas pendientes en esta ruta</h3>
            <p className="text-xs text-slate-500 mt-1">Las nuevas entregas asignadas aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const isDelivered = order.status === 'delivered';
            const isReturned = order.status === 'returned' || order.status === 'partially_returned';
            const lat = parseFloat(order.lat);
            const lng = parseFloat(order.lng);
            const hasGps = !isNaN(lat) && !isNaN(lng);

            return (
              <div
                key={order.id || idx}
                className={`p-4 rounded-3xl border transition-all shadow-xl bg-slate-900/90 ${
                  isDelivered ? 'border-emerald-500/40 opacity-75' :
                  isReturned ? 'border-red-500/40 opacity-75' :
                  'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#6a9a04]/20 border border-[#6a9a04]/40 text-[#8cc618] text-xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">{order.order_number}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isDelivered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    isReturned ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isDelivered ? '✓ Entregado' : isReturned ? '❌ Devolución' : 'Pendiente'}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{order.customer_name || 'Cliente sin nombre'}</h3>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 no-underline"
                        >
                          <Phone className="w-3.5 h-3.5" /> Llama
                        </a>
                        <a
                          href={`https://wa.me/52${order.customer_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 no-underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <p className="text-xs text-slate-300 font-medium flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-[#8cc618] shrink-0 mt-0.5" />
                      <span>
                        {order.address_street} #{order.address_ext_number} {order.address_int_number ? `Int ${order.address_int_number}` : ''}, {order.address_municipality || order.city}
                      </span>
                    </p>
                    {order.special_instructions && (
                      <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mt-2 italic">
                        "{order.special_instructions}"
                      </p>
                    )}
                  </div>

                  {/* Products summary */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga a entregar:</p>
                    <div className="space-y-1">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="text-xs flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                          <span className="font-bold text-slate-200">{item.name}</span>
                          <span className="font-black text-[#8cc618]">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile Actions */}
                {!isDelivered && !isReturned && (
                  <div className="pt-4 mt-3 border-t border-slate-800 space-y-2">
                    {hasGps && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 no-underline transition-all shadow-md"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Abrir Navegación GPS (Waze / Google Maps)</span>
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleMarkDelivered(order)}
                        className="py-2.5 bg-gradient-to-r from-[#6a9a04] to-[#557e03] text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-[#6a9a04]/20 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Entregado
                      </button>

                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setModalType('return');
                          setReturnReason('ausente');
                          setReturnNotes('');
                          setEvidenceUrl('');
                        }}
                        className="py-2.5 bg-gradient-to-r from-red-600 to-rose-700 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" /> Devolución
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Return Modal for Mobile Driver */}
      {modalType === 'return' && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" /> Registrar No-Entrega / Devolución
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Motivo</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
              >
                <option value="ausente">👤 Cliente ausente / No contestó</option>
                <option value="rechazado">🚫 Cliente rechazó la entrega</option>
                <option value="direccion_incorrecta">📍 Dirección no encontrada / Inaccesible</option>
                <option value="no_pago">💵 No se realizó el pago</option>
                <option value="otro">❓ Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Foto Evidencia (Fachada / Motivo)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="driver-camera-input"
                />
                <label
                  htmlFor="driver-camera-input"
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  {uploadingPhoto ? 'Subiendo Foto...' : 'Tomar Foto con Cámara'}
                </label>
                {evidenceUrl && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Tomada
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Notas adicionales</label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Ej. Se esperó 15 minutos fuera del domicilio..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleMarkReturn}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              {submitting ? 'Guardando Devolución...' : 'Confirmar Devolución'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
