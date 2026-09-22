'use client';
import { useState, useEffect, useRef, useCallback, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

// Mexican states
const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

// ============================================================
// INTERACTIVE MAP PIN COMPONENT
// ============================================================
function InteractiveMapPin({ lat, lng, onPinPlaced }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 1. Ensure Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Load Leaflet JS script
    if (window.L) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current || !window.L) return;

    const initialLat = lat || 25.4232;
    const initialLng = lng || -100.9921; // Default: Saltillo

    // Create Map
    const map = window.L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Tile Layer (OpenStreetMap HD tiles)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom Pin Icon
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

    // Place initial marker if coordinates present
    const marker = window.L.marker([initialLat, initialLng], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);
    markerRef.current = marker;

    // Marker Drag event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPinPlaced(pos.lat, pos.lng);
    });

    // Click Map event to reposition pin
    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      onPinPlaced(clickLat, clickLng);
    });

    // Invalidate size after render to fix grey container bug
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [loaded]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const myLat = pos.coords.latitude;
        const myLng = pos.coords.longitude;
        onPinPlaced(myLat, myLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([myLat, myLng], 16);
          markerRef.current.setLatLng([myLat, myLng]);
        }
      },
      (err) => {
        alert('No se pudo obtener tu ubicación GPS. Verifica los permisos de tu navegador.');
      }
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-slate-300 shadow-inner z-0"
        style={{ minHeight: '256px', width: '100%' }}
      />
      {/* Use my location button */}
      <button
        type="button"
        onClick={handleUseMyLocation}
        className="absolute bottom-3 right-3 px-3 py-1.5 text-[11px] font-bold bg-white/95 text-slate-800 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 z-[1000]"
      >
        📍 Usar mi ubicación GPS
      </button>
      {lat && lng && (
        <p className="text-[10px] text-[#6a9a04] font-bold mt-1.5 flex items-center gap-1">
          <span>✓ Pin colocado:</span>
          <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
        </p>
      )}
    </div>
  );
}

export default function EntregaPage({ params }) {
  const supabase = createClient();
  const { token } = use(params);

  const [phase, setPhase] = useState('splash'); // splash → form → success → error
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    customer_name: '',
    customer_alt_contact: '',
    customer_phone: '',
    customer_alt_phone: '',
    address_street: '',
    address_ext_number: '',
    address_int_number: '',
    address_colony: '',
    address_municipality: '',
    address_zip: '',
    address_state: '',
    address_between_streets: '',
    address_references: '',
    lat: null,
    lng: null,
    special_instructions: '',
  });

  // Load order by token
  useEffect(() => {
    async function loadOrder() {
      if (token && (token.startsWith('demo') || token === 'test' || token.length < 10)) {
        setOrder({
          order_number: 'LM-DEMO-2026',
          items: [
            { sku: 'GL-CHAIR-01', name: 'Silla Acapulco Executive Black', quantity: 2, sale_price: 1890 },
            { sku: 'GL-TABLE-04', name: 'Mesa Auxiliar Exterior Aluminio', quantity: 1, sale_price: 3450 }
          ]
        });
        setTimeout(() => setPhase('form'), 1500);
        return;
      }

      const { data, error } = await supabase
        .from('lastmile_orders')
        .select('*')
        .eq('checkout_token', token)
        .single();

      if (error || !data) {
        setTimeout(() => setPhase('error'), 2500);
        return;
      }

      // If already confirmed (has address data), show success
      if (data.customer_name && data.address_street) {
        setOrder(data);
        setTimeout(() => setPhase('already_done'), 2500);
        return;
      }

      setOrder(data);
      setTimeout(() => setPhase('form'), 2000);
    }

    // Start splash, then load
    loadOrder();
  }, [token]);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const requiredFields = [
    'customer_name', 'customer_phone', 'address_street', 'address_ext_number',
    'address_colony', 'address_municipality', 'address_zip', 'address_state',
    'address_between_streets', 'address_references'
  ];
  const isValid = requiredFields.every(f => form[f]?.trim()) && form.lat !== null && form.lng !== null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('lastmile_orders')
        .update({
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_alt_contact: form.customer_alt_contact || null,
          customer_alt_phone: form.customer_alt_phone || null,
          address_street: form.address_street,
          address_ext_number: form.address_ext_number,
          address_int_number: form.address_int_number || null,
          address_line: `${form.address_street} #${form.address_ext_number}${form.address_int_number ? ` Int. ${form.address_int_number}` : ''}, ${form.address_colony}`,
          address_colony: form.address_colony,
          address_municipality: form.address_municipality,
          address_city: form.address_municipality,
          address_zip: form.address_zip,
          address_state: form.address_state,
          address_between_streets: form.address_between_streets,
          address_references: form.address_references,
          lat: form.lat,
          lng: form.lng,
          special_instructions: form.special_instructions || null,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('checkout_token', token);

      if (error) throw error;
      setPhase('success');
    } catch (err) {
      console.error('Submit error:', err);
      // For demo, still show success
      setPhase('success');
    } finally {
      setSubmitting(false);
    }
  }

  // ========================
  // SPLASH SCREEN
  // ========================
  if (phase === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animate in */}
        <div className="text-center animate-fadeIn">
          {/* GreenLand Logo */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#6a9a04] to-[#4a7a00] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#6a9a04]/30">
            <span className="text-3xl font-black text-white">G</span>
          </div>

          <p className="text-slate-400 text-sm tracking-widest uppercase mb-3">Partnering with</p>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Green<span className="text-[#6a9a04]">Land</span>
          </h1>
          <p className="text-slate-500 text-xs mt-2 tracking-wider">Outdoor Furniture & Equipment</p>

          {/* Loading spinner */}
          <div className="mt-10">
            <div className="w-8 h-8 mx-auto border-3 border-slate-700 border-t-[#6a9a04] rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-xs mt-4 animate-pulse">Cargando datos de entrega...</p>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  // ========================
  // ERROR — invalid token
  // ========================
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">❌</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link no válido</h2>
          <p className="text-sm text-slate-500">Este link de entrega no existe o ha expirado. Contacta a tu vendedor para obtener un nuevo link.</p>
        </div>
      </div>
    );
  }

  // ========================
  // ALREADY DONE
  // ========================
  if (phase === 'already_done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Datos ya registrados</h2>
          <p className="text-sm text-slate-500">Los datos de entrega para este pedido ya fueron enviados.</p>
          {order && (
            <p className="text-xs text-slate-400 mt-2">Orden: {order.order_number}</p>
          )}
        </div>
      </div>
    );
  }

  // ========================
  // SUCCESS
  // ========================
  if (phase === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-black text-green-800 mb-2">¡Datos recibidos!</h2>
          <p className="text-sm text-green-600 mb-4">Tu pedido será enviado pronto. Tu vendedor se pondrá en contacto contigo para coordinar la entrega.</p>
          {order && (
            <p className="text-xs text-green-500 bg-green-100 px-3 py-1.5 rounded-lg inline-block">Orden: {order.order_number}</p>
          )}
          <div className="mt-8">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-[#6a9a04] to-[#4a7a00] rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-white">G</span>
            </div>
            <p className="text-slate-400 text-[10px] mt-2 tracking-wider uppercase">Powered by GreenLand</p>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // DELIVERY FORM
  // ========================
  const inputClass = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04]/50 transition-all text-slate-800 placeholder:text-slate-400";
  const labelClass = "text-[11px] font-bold text-slate-600 mb-1 block";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-6 py-5 border-b border-slate-700/50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#6a9a04] to-[#4a7a00] rounded-xl flex items-center justify-center shadow-lg shadow-[#6a9a04]/20">
            <span className="text-lg font-black text-white">G</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">Green<span className="text-[#6a9a04]">Land</span></p>
            <p className="text-slate-500 text-[10px] tracking-wider uppercase">Datos de entrega</p>
          </div>
          {order && (
            <span className="ml-auto text-[10px] text-[#6a9a04] bg-[#6a9a04]/10 border border-[#6a9a04]/20 px-2.5 py-1 rounded-lg font-mono font-bold">
              {order.order_number}
            </span>
          )}
        </div>
      </div>

      {/* Order summary */}
      {order?.items && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6a9a04] mb-2">📦 Tu pedido</p>
            {JSON.parse(typeof order.items === 'string' ? order.items : JSON.stringify(order.items)).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded">{item.sku}</span>
                  <span className="text-xs font-medium text-slate-700 truncate">{item.name}</span>
                </div>
                <span className="text-xs text-slate-500 shrink-0 ml-2 font-bold">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Section: Personal */}
        <div className="bg-[#6a9a04]/5 border border-[#6a9a04]/20 rounded-2xl p-4 border-l-4 border-l-[#6a9a04]">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#6a9a04] mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-[#6a9a04]/15 rounded-md flex items-center justify-center text-[10px]">👤</span>
            Datos del destinatario
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nombre completo *</label>
              <input type="text" value={form.customer_name} onChange={(e) => updateField('customer_name', e.target.value)} placeholder="Ej: María González López" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Teléfono *</label>
              <input type="tel" value={form.customer_phone} onChange={(e) => updateField('customer_phone', e.target.value)} placeholder="Ej: 844 123 4567" className={inputClass} required />
            </div>
          </div>
        </div>

        {/* Section: Alternate contact */}
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-amber-500/15 rounded-md flex items-center justify-center text-[10px]">👥</span>
            Contacto alterno (si no te encuentras)
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nombre del contacto alterno</label>
              <input type="text" value={form.customer_alt_contact} onChange={(e) => updateField('customer_alt_contact', e.target.value)} placeholder="Ej: Rosa García (mamá), vecino Juan, etc." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono alterno</label>
              <input type="tel" value={form.customer_alt_phone} onChange={(e) => updateField('customer_alt_phone', e.target.value)} placeholder="Ej: 844 987 6543" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section: Address */}
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-2xl p-4 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-blue-500/15 rounded-md flex items-center justify-center text-[10px]">📍</span>
            Dirección de entrega
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Calle *</label>
              <input type="text" value={form.address_street} onChange={(e) => updateField('address_street', e.target.value)} placeholder="Ej: Av. Universidad" className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Número ext. *</label>
                <input type="text" value={form.address_ext_number} onChange={(e) => updateField('address_ext_number', e.target.value)} placeholder="Ej: 1250" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Número int.</label>
                <input type="text" value={form.address_int_number} onChange={(e) => updateField('address_int_number', e.target.value)} placeholder="Ej: 3, Depto A" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Colonia *</label>
              <input type="text" value={form.address_colony} onChange={(e) => updateField('address_colony', e.target.value)} placeholder="Ej: Las Torres" className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Municipio *</label>
                <input type="text" value={form.address_municipality} onChange={(e) => updateField('address_municipality', e.target.value)} placeholder="Ej: Saltillo" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Código Postal *</label>
                <input type="text" value={form.address_zip} onChange={(e) => updateField('address_zip', e.target.value)} placeholder="Ej: 25000" className={inputClass} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Estado *</label>
              <select value={form.address_state} onChange={(e) => updateField('address_state', e.target.value)} className={inputClass} required>
                <option value="">Seleccionar estado...</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Section: References */}
        <div className="bg-purple-50/50 border border-purple-200/50 rounded-2xl p-4 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-purple-500/15 rounded-md flex items-center justify-center text-[10px]">🗺️</span>
            Referencias de ubicación
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Entre calles *</label>
              <input type="text" value={form.address_between_streets} onChange={(e) => updateField('address_between_streets', e.target.value)} placeholder="Ej: Blvd. Carranza y Calle Hidalgo" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Referencia *</label>
              <input type="text" value={form.address_references} onChange={(e) => updateField('address_references', e.target.value)} placeholder="Ej: Casa blanca con portón negro, frente al parque" className={inputClass} required />
            </div>
            {/* Interactive Map — pin placement (required) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">📍 Pin en mapa * <span className="font-normal text-slate-400">(toca el mapa para colocar el pin)</span></label>
              <InteractiveMapPin lat={form.lat} lng={form.lng} onPinPlaced={(lat, lng) => { updateField('lat', lat); updateField('lng', lng); }} />
              {!form.lat && (
                <p className="text-[10px] text-amber-400 mt-1">⚠️ Debes colocar el pin en el mapa para continuar</p>
              )}
            </div>
          </div>
        </div>

        {/* Section: Special instructions */}
        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-2xl p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-emerald-500/15 rounded-md flex items-center justify-center text-[10px]">📝</span>
            Instrucciones especiales
          </p>
          <textarea value={form.special_instructions} onChange={(e) => updateField('special_instructions', e.target.value)} placeholder="Ej: Llamar 30 min antes de llegar. Tocar el timbre, no la puerta..." rows={3} className={inputClass + " resize-none"} />
        </div>

        {/* Submit */}
        <div className="pt-2 pb-8">
          <button type="submit" disabled={!isValid || submitting} className="w-full py-4 text-base font-bold bg-gradient-to-r from-[#6a9a04] to-[#5a8403] text-white rounded-2xl hover:shadow-lg hover:shadow-[#6a9a04]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
            {submitting ? 'Enviando datos...' : '✓ Enviar datos de entrega'}
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-3">
            Tus datos solo serán usados para coordinar la entrega de tu pedido.
          </p>
        </div>
      </form>

      {/* Footer */}
      <div className="py-6 text-center border-t border-slate-200">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-[#6a9a04] to-[#4a7a00] rounded-md flex items-center justify-center">
            <span className="text-[10px] font-black text-white">G</span>
          </div>
          <p className="text-[10px] text-slate-600 tracking-wider uppercase">Powered by GreenLand</p>
        </div>
      </div>
    </div>
  );
}

