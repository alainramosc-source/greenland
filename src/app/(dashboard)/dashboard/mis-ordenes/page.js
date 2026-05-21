'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileBox, Loader2, Clock, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', icon: Clock, color: '#fbbf24', bg: 'rgba(234,179,8,0.15)' },
  aceptada: { label: 'Aceptada', icon: CheckCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  en_proceso: { label: 'En Proceso', icon: Play, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  completada: { label: 'Completada', icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  rechazada: { label: 'Rechazada', icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  cancelada: { label: 'Cancelada', icon: AlertTriangle, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

export default function SupplierOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      // Supplier sees their own orders thanks to RLS
      const { data } = await supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setOrders(data);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="font-medium">Cargando órdenes de servicio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Órdenes de Servicio</h1>
        <p className="text-slate-500 font-medium mt-1">Consulta y gestiona tus órdenes asignadas</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
          <FileBox size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Sin órdenes de servicio</h3>
          <p className="text-sm text-slate-400">Cuando Greenland te asigne una orden, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendiente;
            const StatusIcon = sc.icon;
            return (
              <Link key={order.id} href={`/dashboard/mis-ordenes/${order.id}`} className="block">
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 hover:shadow-md hover:border-[#6a9a04]/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: sc.bg }}>
                        <StatusIcon size={22} style={{ color: sc.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">OS #{order.order_number} — <span className="capitalize">{order.service_type}</span></div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {order.scheduled_date ? formatDateOnly(order.scheduled_date, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha programada'}
                          {order.location && <> · {order.location}</>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full capitalize" style={{ color: sc.color, background: sc.bg }}>
                        {sc.label}
                      </span>
                      <div className="text-sm font-bold text-slate-700 mt-2">
                        ${Number(order.agreed_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {order.description && (
                    <p className="mt-3 text-sm text-slate-500 line-clamp-2">{order.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
