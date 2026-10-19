'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  Truck, MapPin, Phone, MessageCircle, CheckCircle2, RotateCcw, Navigation,
  Camera, Check, X, RefreshCw, Users, Signpost, LogOut, Wallet, ShieldAlert
} from 'lucide-react';
import DeliverOrderModal from '@/components/delivery/DeliverOrderModal';
import {
  formatStreetLine, formatCityLine, formatMoney, whatsappUrl, mapsUrl, getItems,
  amountToCollect, PAYMENT_METHODS, RETURN_REASONS, isPendingSettlement
} from '@/components/delivery/deliveryUtils';

export default function ChoferRoutePage() {
  const supabase = createClient();
  const router = useRouter();

  const [authState, setAuthState] = useState('checking'); // checking | allowed | denied
  const [me, setMe] = useState(null); // { id, full_name, role }
  const [scope, setScope] = useState('mine'); // admins only: mine | all
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [deliverOrder, setDeliverOrder] = useState(null);
  const [returnOrder, setReturnOrder] = useState(null);

  // Return state
  const [returnReason, setReturnReason] = useState('ausente');
  const [returnNotes, setReturnNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnError, setReturnError] = useState(null);

  // Auth gate: only admins and drivers
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('id', user.id)
        .single();
      if (!profile || profile.is_active === false || !['admin', 'driver'].includes(profile.role)) {
        setAuthState('denied');
        return;
      }
      setMe(profile);
      setAuthState('allowed');
    })();
  }, [supabase, router]);

  const loadRouteOrders = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    setLoadError(null);
    // RLS already limits drivers to their assigned orders; admins see everything.
    let query = supabase
      .from('lastmile_orders')
      .select('*')
      .eq('delivery_type', 'delivery')
      .in('status', ['in_transit', 'in_delivery', 'delivered', 'returned', 'partially_returned'])
      .is('settled_at', null)
      .order('dispatched_at', { ascending: true, nullsFirst: false });
    if (me.role === 'driver' || scope === 'mine') {
      query = query.eq('assigned_driver_id', me.id);
    }
    const { data, error } = await query;
    if (error) setLoadError(error.message);
    setOrders(data || []);
    setLoading(false);
  }, [me, scope, supabase]);

  useEffect(() => { loadRouteOrders(); }, [loadRouteOrders]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', returnOrder?.id || 'chofer_returns');
      const res = await fetch('/api/inbox/upload', { method: 'POST', body: formData });
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

  function openReturn(order) {
    setReturnOrder(order);
    setReturnReason('ausente');
    setReturnNotes('');
    setEvidenceUrl('');
    setReturnError(null);
  }

  // Driver registers a full return; an admin gives VoBo and restocks at the warehouse.
  async function handleMarkReturn() {
    if (!returnOrder || submitting) return;
    setSubmitting(true);
    setReturnError(null);
    const { error } = await supabase.rpc('return_lastmile_order', {
      p_order_id: returnOrder.id,
      p_reason: returnReason,
      p_notes: returnNotes || null,
      p_evidence_url: evidenceUrl || null,
      p_returned_items: null,
      p_restock: false,
    });
    setSubmitting(false);
    if (error) { setReturnError(error.message); return; }
    setReturnOrder(null);
    loadRouteOrders();
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center gap-3">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h1 className="text-lg font-black">Sin acceso a la ruta de entregas</h1>
        <p className="text-sm text-slate-400 max-w-xs">Esta pantalla es solo para choferes y administradores de Greenland.</p>
        <button onClick={handleLogout} className="mt-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold cursor-pointer">Cerrar sesión</button>
      </div>
    );
  }

  const active = orders.filter(o => o.status === 'in_transit' || o.status === 'in_delivery');
  const closed = orders.filter(o => isPendingSettlement(o));
  const cashInHand = closed.filter(o => o.collected_method === 'cash').reduce((s, o) => s + Number(o.collected_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Mobile Top Bar */}
      <header className="px-4 py-3 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#6a9a04] to-[#557e03] flex items-center justify-center text-white shadow-md shadow-[#6a9a04]/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white tracking-wide uppercase">Ruta de Entregas</h1>
            <p className="text-[10px] font-bold text-[#8cc618] truncate">{me?.full_name || 'Chofer'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRouteOrders} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer" title="Actualizar ruta" aria-label="Actualizar ruta">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer" title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4 pb-20">
        {me?.role === 'admin' && (
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[['mine', 'Mis entregas'], ['all', 'Todas las rutas']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${scope === key ? 'bg-[#6a9a04] text-white' : 'text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between">
            <span className="text-xs font-bold text-violet-200 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Efectivo por entregar en bodega</span>
            <span className="text-base font-black text-violet-100">{formatMoney(cashInHand)}</span>
          </div>
        )}

        {loadError && <p className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{loadError}</p>}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-slate-700 border-t-[#6a9a04] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Cargando paradas de la ruta...</p>
          </div>
        ) : active.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-200">No tienes entregas en ruta</h3>
            <p className="text-xs text-slate-500 mt-1">Cuando un admin surta un envío y te lo asigne, aparecerá aquí.</p>
          </div>
        ) : (
          active.map((order, idx) => {
            const items = getItems(order);
            const navUrl = mapsUrl(order);
            const toCollect = amountToCollect(order);
            return (
              <article key={order.id} className="p-4 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#6a9a04]/20 border border-[#6a9a04]/40 text-[#8cc618] text-xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">{order.order_number}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${toCollect > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                    {toCollect > 0 ? `Cobrar ${formatMoney(toCollect)}` : 'Ya pagado'}
                  </span>
                </div>

                {/* Customer */}
                <div>
                  <h3 className="text-base font-extrabold text-white">{order.customer_name || 'Cliente sin nombre'}</h3>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <a href={`tel:${order.customer_phone}`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 no-underline">
                        <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                      </a>
                      {whatsappUrl(order.customer_phone) && (
                        <a href={whatsappUrl(order.customer_phone)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 no-underline">
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Alternate contact */}
                {(order.customer_alt_contact || order.customer_alt_phone) && (
                  <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Si no está, contactar a</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-200">{order.customer_alt_contact || 'Contacto alterno'}</span>
                      {order.customer_alt_phone && (
                        <a href={`tel:${order.customer_alt_phone}`} className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 no-underline">
                          <Phone className="w-3 h-3" /> {order.customer_alt_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <p className="text-sm text-slate-100 font-bold flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-[#8cc618] shrink-0 mt-0.5" />
                    <span>{formatStreetLine(order)}</span>
                  </p>
                  <p className="text-xs text-slate-300 pl-5">{formatCityLine(order)}</p>
                  {order.address_between_streets && (
                    <p className="text-xs text-slate-400 pl-5 flex items-start gap-1"><Signpost className="w-3 h-3 mt-0.5 shrink-0" /> Entre {order.address_between_streets}</p>
                  )}
                  {order.address_references && (
                    <p className="text-xs text-slate-300 pl-5"><span className="text-slate-500">Referencia:</span> {order.address_references}</p>
                  )}
                  {order.special_instructions && (
                    <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl italic">"{order.special_instructions}"</p>
                  )}
                </div>

                {/* Products */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga a entregar</p>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="text-xs flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="font-bold text-slate-200">{item.name}</span>
                        <span className="font-black text-[#8cc618]">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  {navUrl && (
                    <a href={navUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 no-underline">
                      <Navigation className="w-4 h-4" /> Abrir navegación GPS
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setDeliverOrder(order)} className="py-3 bg-gradient-to-r from-[#6a9a04] to-[#557e03] text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-[#6a9a04]/20 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" /> Entregado
                    </button>
                    <button onClick={() => openReturn(order)} className="py-3 bg-gradient-to-r from-red-600 to-rose-700 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer">
                      <RotateCcw className="w-4 h-4" /> No se entregó
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}

        {/* Closed today, pending settlement */}
        {closed.length > 0 && (
          <section className="space-y-2 pt-2">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Cerradas · por liquidar en bodega</h2>
            {closed.map(o => (
              <div key={o.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 opacity-90">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{o.order_number} · {o.customer_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {o.status === 'delivered' ? '✓ Entregado' : '↩ Devolución'}
                    {o.collected_method && ` · ${PAYMENT_METHODS[o.collected_method] || o.collected_method}`}
                  </p>
                </div>
                {Number(o.collected_amount) > 0 && <span className="text-sm font-black text-[#8cc618] shrink-0">{formatMoney(o.collected_amount)}</span>}
              </div>
            ))}
          </section>
        )}
      </main>

      {deliverOrder && (
        <DeliverOrderModal
          order={deliverOrder}
          onClose={() => setDeliverOrder(null)}
          onDone={() => { setDeliverOrder(null); loadRouteOrders(); }}
        />
      )}

      {/* Return Modal for Mobile Driver */}
      {returnOrder && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" /> No se entregó · {returnOrder.order_number}
              </h3>
              <button onClick={() => setReturnOrder(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">Regresa la mercancía a bodega. Ahí un admin la recibe y la reintegra al inventario.</p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Motivo</label>
              <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none">
                {Object.entries(RETURN_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Foto evidencia (fachada / motivo)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" id="driver-camera-input" />
                <label htmlFor="driver-camera-input" className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  {uploadingPhoto ? 'Subiendo foto...' : 'Tomar foto con cámara'}
                </label>
                {evidenceUrl && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> Tomada</span>
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

            {returnError && <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">{returnError}</p>}

            <button
              onClick={handleMarkReturn}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Confirmar no-entrega'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
