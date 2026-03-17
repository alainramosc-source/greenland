'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DeliverySheetPage({ params }) {
  const supabase = createClient();
  const router = useRouter();
  const { id } = use(params);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Support both UUID and order_number (e.g. LM-260317-4163)
      const isOrderNumber = id.startsWith('LM-');
      const { data, error } = await supabase
        .from('lastmile_orders')
        .select('*')
        .eq(isOrderNumber ? 'order_number' : 'id', id)
        .single();

      if (data) setOrder(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500">Orden no encontrada</p>
      </div>
    );
  }

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  const createdDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const fullAddress = [
    order.address_street && `${order.address_street} #${order.address_ext_number || 'S/N'}`,
    order.address_int_number && `Int. ${order.address_int_number}`,
    order.address_colony && `Col. ${order.address_colony}`,
    order.address_municipality,
    order.address_zip && `C.P. ${order.address_zip}`,
    order.address_state,
  ].filter(Boolean).join(', ');

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
        }
        @page { margin: 12mm; size: letter; }
      `}</style>

      {/* Print button (hidden on print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-lg"
        >
          ← Volver
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 text-sm font-bold text-white bg-[#6a9a04] rounded-xl hover:bg-[#5a8403] transition-colors cursor-pointer shadow-lg shadow-[#6a9a04]/20"
        >
          🖨️ Imprimir
        </button>
      </div>

      <div className="print-page max-w-[800px] mx-auto p-8 bg-white min-h-screen font-sans">
        {/* ======== HEADER ======== */}
        <div className="flex items-start justify-between border-b-4 border-[#6a9a04] pb-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-[#6a9a04] rounded-xl flex items-center justify-center">
                <span className="text-2xl font-black text-white">G</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Green<span className="text-[#6a9a04]">Land</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase">Outdoor Furniture & Equipment</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-xs">
              GREENLAND PRODUCTS S.A. DE C.V.<br />
              BLVD. VITO ALESSIO ROBLES #3550 INT. 9<br />
              COL. NAZARIO S. ORTIZ GARZA, C.P. 25100<br />
              SALTILLO, COAHUILA, MÉXICO
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">Hoja de Entrega</h2>
            <p className="text-sm font-mono font-bold text-[#6a9a04] mt-1">{order.order_number || '—'}</p>
            <p className="text-xs text-slate-500 mt-1">{createdDate}</p>
            <div className="mt-2">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                order.status === 'in_delivery' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {order.status === 'delivered' ? '✓ Entregado' :
                 order.status === 'confirmed' ? 'Confirmado' :
                 order.status === 'in_delivery' ? 'En camino' :
                 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* ======== CUSTOMER INFO ======== */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Destinatario */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6a9a04] mb-3 flex items-center gap-1.5">
              <span>👤</span> Destinatario
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Nombre</span>
                <span className="text-xs font-bold text-slate-800 text-right">{order.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Teléfono</span>
                <span className="text-xs font-bold text-slate-800">{order.customer_phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Contacto alterno */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
              <span>👥</span> Contacto Alterno
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Nombre</span>
                <span className="text-xs font-bold text-slate-800 text-right">{order.customer_alt_contact || 'No especificado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Teléfono</span>
                <span className="text-xs font-bold text-slate-800">{order.customer_alt_phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======== PRODUCTS TABLE ======== */}
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#6a9a04] mb-2 flex items-center gap-1.5">
            <span>📦</span> Productos
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider rounded-tl-lg">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider">SKU</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider">Producto</th>
                <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider">Cant.</th>
                <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider">P. Unit.</th>
                <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider rounded-tr-lg">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.sku}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium text-slate-800">{item.name}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-800 text-center">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 text-right">${parseFloat(item.sale_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-800 text-right">
                    ${(item.quantity * parseFloat(item.sale_price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#6a9a04]/10 border-t-2 border-[#6a9a04]">
                <td colSpan={5} className="px-3 py-3 text-right text-xs font-black text-slate-700 uppercase tracking-wider">Total</td>
                <td className="px-3 py-3 text-right text-base font-black text-[#6a9a04]">
                  ${parseFloat(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ======== DELIVERY ADDRESS ======== */}
        {order.delivery_type === 'delivery' && (
          <div className="mb-6 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-1.5">
              <span>📍</span> Dirección de Entrega
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div className="col-span-2 mb-1">
                <span className="text-[10px] text-slate-400 uppercase block">Dirección completa</span>
                <span className="text-sm font-bold text-slate-800">{fullAddress || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Calle y número</span>
                <span className="text-xs font-medium text-slate-700">{order.address_street} #{order.address_ext_number}{order.address_int_number ? ` Int. ${order.address_int_number}` : ''}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Colonia</span>
                <span className="text-xs font-medium text-slate-700">{order.address_colony || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Municipio</span>
                <span className="text-xs font-medium text-slate-700">{order.address_municipality || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">C.P. / Estado</span>
                <span className="text-xs font-medium text-slate-700">{order.address_zip || '—'}, {order.address_state || '—'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Entre calles</span>
                <span className="text-xs font-medium text-slate-700">{order.address_between_streets || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Referencia</span>
                <span className="text-xs font-medium text-slate-700">{order.address_references || '—'}</span>
              </div>
            </div>

            {/* Map static image if coordinates exist */}
            {order.lat && order.lng && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">📍 Ubicación exacta (zoom a nivel calle)</span>
                <div className="w-full h-56 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${order.lat},${order.lng}&zoom=18&size=760x448&scale=2&maptype=roadmap&markers=color:green%7Csize:mid%7C${order.lat},${order.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`}
                    alt="Ubicación de entrega"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-mono">Coordenadas: {order.lat}, {order.lng}</p>
              </div>
            )}
          </div>
        )}

        {/* ======== PICKUP NOTICE ======== */}
        {order.delivery_type === 'pickup' && (
          <div className="mb-6 border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/50 text-center">
            <p className="text-lg font-bold text-blue-700">🏪 Recoger en sitio</p>
            <p className="text-xs text-blue-500 mt-1">El cliente pasará a recoger su pedido</p>
          </div>
        )}

        {/* ======== SPECIAL INSTRUCTIONS ======== */}
        {order.special_instructions && (
          <div className="mb-6 border border-amber-200 rounded-xl p-4 bg-amber-50/50">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1.5">
              <span>⚠️</span> Instrucciones Especiales
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{order.special_instructions}</p>
          </div>
        )}

        {/* ======== NOTES ======== */}
        {order.notes && (
          <div className="mb-6 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">📝 Notas internas</p>
            <p className="text-xs text-slate-600">{order.notes}</p>
          </div>
        )}

        {/* ======== SIGNATURES ======== */}
        <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-200">
          <div className="text-center">
            <div className="border-b-2 border-slate-300 h-16 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Firma del repartidor</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-300 h-16 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Firma de recibido</p>
          </div>
        </div>

        {/* ======== FOOTER ======== */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[9px] text-slate-300">
            Documento generado automáticamente — GreenLand Products S.A. de C.V.
          </p>
          <p className="text-[9px] text-slate-300 font-mono">
            {order.order_number} · {new Date().toLocaleDateString('es-MX')}
          </p>
        </div>
      </div>
    </>
  );
}
