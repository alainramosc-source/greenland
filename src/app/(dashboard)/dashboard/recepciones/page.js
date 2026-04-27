'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container, Plus, Search, Calendar, Warehouse, User, DollarSign,
  Loader2, Package, ChevronRight, Filter, X
} from 'lucide-react';

const STATUS_MAP = {
  draft: { label: 'Borrador', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Completada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export default function RecepcionesPage() {
  const [receptions, setReceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }

    const { data } = await supabase
      .from('container_receptions')
      .select(`
        *,
        warehouse:warehouses(name),
        distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
        po:purchase_orders(po_number),
        items:container_reception_items(id, quantity, product_id, unit_pro_price)
      `)
      .order('created_at', { ascending: false });

    setReceptions(data || []);
    setLoading(false);
  };

  const filtered = receptions.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match = (r.container_label || '').toLowerCase().includes(s)
        || (r.pedimento_number || '').toLowerCase().includes(s)
        || (r.distributor?.full_name || '').toLowerCase().includes(s)
        || (r.distributor?.client_number || '').toLowerCase().includes(s)
        || (r.warehouse?.name || '').toLowerCase().includes(s)
        || (r.po?.po_number || '').toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
      <p className="font-medium">Cargando recepciones...</p>
    </div>
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Recepciones de Contenedores</h1>
          <p className="text-slate-500 mt-1 font-medium m-0">
            Registra la llegada de contenedores, costos y cargos a distribuidores PRO.
          </p>
        </div>
        <Link
          href="/dashboard/recepciones/nueva"
          className="flex items-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#6a9a04]/20 transition-all no-underline"
        >
          <Plus size={18} /> Nueva Recepción
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por contenedor, pedimento, distribuidor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'draft', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${statusFilter === s
                ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/20'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
              }`}
            >
              {s === 'all' ? 'Todas' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Container size={20} className="text-blue-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Total Recepciones</span>
          </div>
          <p className="text-2xl font-black text-slate-900 m-0">{receptions.length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Package size={20} className="text-amber-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Borradores</span>
          </div>
          <p className="text-2xl font-black text-slate-900 m-0">{receptions.filter(r => r.status === 'draft').length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><DollarSign size={20} className="text-green-500" /></div>
            <span className="text-sm text-slate-500 font-medium">Cargos Generados</span>
          </div>
          <p className="text-2xl font-black text-[#6a9a04] m-0">
            ${receptions.filter(r => r.status === 'completed').reduce((s, r) => s + Number(r.charge_amount || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Container size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium m-0">No hay recepciones{statusFilter !== 'all' ? ` con status "${STATUS_MAP[statusFilter]?.label}"` : ''}</p>
            <p className="text-sm mt-1 m-0">Crea una nueva recepción para registrar la llegada de un contenedor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Contenedor</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Bodega</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">PRO</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Pedimento</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">SKUs</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Cargo PRO</th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.draft;
                  const totalQty = (r.items || []).reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={r.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Container size={16} className="text-blue-500" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{r.container_label || 'Sin etiqueta'}</div>
                            {r.po?.po_number && <div className="text-[11px] text-slate-400">PO: {r.po.po_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{r.warehouse?.name || '—'}</td>
                      <td className="px-4 py-4">
                        {r.distributor ? (
                          <div>
                            <span className="text-sm font-medium text-slate-700">{r.distributor.full_name}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{r.distributor.client_number}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Saltillo (sin PRO)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {new Date(r.reception_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-xs font-mono text-slate-500">{r.pedimento_number || '—'}</td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-slate-700">{(r.items || []).length}</span>
                        <span className="text-xs text-slate-400 ml-1">({totalQty} pzas)</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {r.distributor ? (
                          <span className="font-bold text-[#6a9a04]">
                            ${Number(r.charge_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/recepciones/nueva?id=${r.id}`}
                          className="text-[#6a9a04] hover:text-[#6a9a04]/80 transition-colors no-underline"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
