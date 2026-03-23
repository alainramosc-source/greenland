'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building, Mail, Phone, MapPin, FileText, Loader2,
  CheckCircle, XCircle, Truck, Edit, Save, X
} from 'lucide-react';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setSupplier(data);

      // Fetch service orders
      const { data: soData } = await supabase
        .from('service_orders')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (soData) setOrders(soData);

      // Fetch contracts
      const { data: scData } = await supabase
        .from('service_contracts')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (scData) setContracts(scData);

      setLoading(false);
    }
    if (id) fetch();
  }, [id]);

  const toggleActive = async () => {
    const newStatus = !supplier.is_active;
    await supabase.from('suppliers').update({ is_active: newStatus }).eq('id', id);
    setSupplier(prev => ({ ...prev, is_active: newStatus }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <p className="font-medium text-lg">Proveedor no encontrado.</p>
        <Link href="/dashboard/proveedores" className="text-[#6a9a04] font-bold hover:underline">← Volver</Link>
      </div>
    );
  }

  const STATUS_COLORS = {
    pendiente: { color: '#fbbf24', bg: 'rgba(234,179,8,0.15)' },
    aceptada: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    en_proceso: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    completada: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    rechazada: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    cancelada: { color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proveedores" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{supplier.company_name}</h1>
            <p className="text-sm text-slate-500">Registrado {new Date(supplier.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <button
          onClick={toggleActive}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-none transition-all ${
            supplier.is_active
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {supplier.is_active ? <><XCircle size={16} /> Desactivar</> : <><CheckCircle size={16} /> Activar</>}
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Información General</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{supplier.company_name}</span>
            </div>
            {supplier.contact_name && (
              <div className="flex items-center gap-3">
                <Truck size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{supplier.contact_name}</span>
              </div>
            )}
            {supplier.rfc && (
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600 font-mono">{supplier.rfc}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contacto</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400" />
              <span className="text-sm text-slate-600">{supplier.email}</span>
            </div>
            {supplier.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{supplier.phone}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{supplier.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Servicios</h3>
          <div className="flex flex-wrap gap-2">
            {(supplier.service_types || []).map(st => (
              <span key={st} className="text-xs font-bold px-3 py-1 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] uppercase tracking-wider">
                {st}
              </span>
            ))}
            {(!supplier.service_types || supplier.service_types.length === 0) && (
              <span className="text-sm text-slate-400 italic">Sin servicios definidos</span>
            )}
          </div>
          {supplier.notes && (
            <p className="mt-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">{supplier.notes}</p>
          )}
        </div>
      </div>

      {/* Recent Service Orders */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Órdenes de Servicio Recientes</h3>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Sin órdenes de servicio aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">OS #</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pendiente;
                  return (
                    <tr key={o.id}>
                      <td className="py-3 font-bold text-slate-900">#{o.order_number}</td>
                      <td className="py-3 text-slate-600 capitalize">{o.service_type}</td>
                      <td className="py-3 text-slate-500">{o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('es-MX') : '—'}</td>
                      <td className="py-3 font-medium text-slate-700">${Number(o.agreed_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-center">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize" style={{ color: sc.color, background: sc.bg }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contracts */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Contratos de Servicio</h3>
        </div>
        {contracts.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Sin contratos activos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato #</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Periodicidad</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 font-bold text-slate-900">#{c.contract_number}</td>
                    <td className="py-3 text-slate-600 capitalize">{c.service_type}</td>
                    <td className="py-3 font-medium text-slate-700">${Number(c.agreed_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-slate-500 capitalize">{c.periodicity}</td>
                    <td className="py-3 text-center">
                      {c.is_active
                        ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Activo</span>
                        : <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Inactivo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
