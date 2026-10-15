'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container, Plus, Search, Calendar, Warehouse, User, DollarSign,
  Loader2, Package, ChevronRight, Filter, X
} from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

const STATUS_MAP = {
  draft: { label: 'Borrador', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  completed: { label: 'Completada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export default function RecepcionesPage() {
  const [receptions, setReceptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const getReceptionWarehousesInfo = (r, whList = []) => {
    const whMap = Object.fromEntries((whList || []).map(w => [w.id, w.name]));

    // 1. Direct tag in notes: [BODEGAS: Bodega Vito Alessio / Bodega Echeverría]
    if (r.notes) {
      const matchB = r.notes.match(/\[BODEGAS:\s*([^\]]+)\]/i);
      if (matchB) {
        const full = matchB[1].trim();
        const parts = full.split('/').map(p => p.trim());
        return {
          isMulti: true,
          names: parts.map(p => p.replace(/^Bodega\s+/i, '')),
          fullName: full,
        };
      }

      // 2. JSON mapping in notes: [ITEM_WAREHOUSES:{"<prodId>":"<whId>"}]
      const matchI = r.notes.match(/\[ITEM_WAREHOUSES:\s*({[^\]]+})\]/);
      if (matchI) {
        try {
          const itemMap = JSON.parse(matchI[1]);
          const uniqueIds = [...new Set(Object.values(itemMap))];
          if (uniqueIds.length > 1) {
            const names = uniqueIds.map(id => whMap[id] || id).filter(Boolean);
            return {
              isMulti: true,
              names: names.map(p => p.replace(/^Bodega\s+/i, '')),
              fullName: names.join(' / '),
            };
          }
        } catch {}
      }
    }

    // 3. Enriched from inventory logs
    if (r._detectedMultiWarehouses && r._detectedMultiWarehouses.length > 1) {
      return {
        isMulti: true,
        names: r._detectedMultiWarehouses.map(p => p.replace(/^Bodega\s+/i, '')),
        fullName: r._detectedMultiWarehouses.join(' / '),
      };
    }

    // 4. Item-level warehouse_id if column exists
    const itemWhIds = [...new Set((r.items || []).map(i => i.warehouse_id).filter(Boolean))];
    if (itemWhIds.length > 1) {
      const names = itemWhIds.map(id => whMap[id] || id).filter(Boolean);
      return {
        isMulti: true,
        names: names.map(p => p.replace(/^Bodega\s+/i, '')),
        fullName: names.join(' / '),
      };
    }

    // 5. Special fallback: if multiple containers in label and notes/labels suggest split
    const hasMultipleContainers = (r.container_label || '').includes('/');
    const notesLower = (r.notes || '').toLowerCase();
    if (hasMultipleContainers && (notesLower.includes('echeverr') || notesLower.includes('multibodega'))) {
      return {
        isMulti: true,
        names: ['Vito Alessio', 'Echeverría'],
        fullName: 'Bodega Vito Alessio / Bodega Echeverría',
      };
    }

    // Single warehouse fallback
    const singleName = (itemWhIds[0] && whMap[itemWhIds[0]]) || r.warehouse?.name || '—';
    return {
      isMulti: false,
      names: [singleName.replace(/^Bodega\s+/i, '')],
      fullName: singleName,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }

    const { data: whsData } = await supabase.from('warehouses').select('id, name');
    const whList = whsData || [];
    setWarehouses(whList);

    let recsData = null;
    const { data: fullData, error: fullError } = await supabase
      .from('container_receptions')
      .select(`
        *,
        warehouse:warehouses(id, name),
        distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
        po:purchase_orders(po_number),
        items:container_reception_items(id, quantity, product_id, unit_pro_price, warehouse_id)
      `)
      .order('created_at', { ascending: false });

    if (fullError && (fullError.code === '42703' || fullError.message?.includes('warehouse_id'))) {
      const { data: fallbackData } = await supabase
        .from('container_receptions')
        .select(`
          *,
          warehouse:warehouses(id, name),
          distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
          po:purchase_orders(po_number),
          items:container_reception_items(id, quantity, product_id, unit_pro_price)
        `)
        .order('created_at', { ascending: false });
      recsData = fallbackData || [];
    } else {
      recsData = fullData || [];
    }

    // Inspect recent inventory_logs to enrich multibodega detection
    try {
      const multiContainerRecs = recsData.filter(r => (r.container_label || '').includes('/'));
      if (multiContainerRecs.length > 0) {
        const { data: recentLogs } = await supabase
          .from('inventory_logs')
          .select('product_id, reason')
          .ilike('reason', '%Recepción contenedor%')
          .order('created_at', { ascending: false })
          .limit(50);

        if (recentLogs && recentLogs.length > 0) {
          multiContainerRecs.forEach(r => {
            const firstContainer = r.container_label.split('/')[0].trim();
            const matchedLogs = recentLogs.filter(l => l.reason?.includes(firstContainer));
            if (matchedLogs.length > 0) {
              const detectedWhNames = [];
              whList.forEach(w => {
                if (matchedLogs.some(l => l.reason?.toLowerCase().includes(w.name.toLowerCase()))) {
                  detectedWhNames.push(w.name);
                }
              });
              if (detectedWhNames.length > 1) {
                r._detectedMultiWarehouses = detectedWhNames;
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Inventory log enrichment error:', e);
    }

    setReceptions(recsData);
    setLoading(false);
  };

  const filtered = receptions.map(r => ({
    ...r,
    _whInfo: getReceptionWarehousesInfo(r, warehouses),
  })).filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match = (r.container_label || '').toLowerCase().includes(s)
        || (r.pedimento_number || '').toLowerCase().includes(s)
        || (r.operation_number || '').toLowerCase().includes(s)
        || (r.customs_broker_ref || '').toLowerCase().includes(s)
        || (r.distributor?.full_name || '').toLowerCase().includes(s)
        || (r.distributor?.client_number || '').toLowerCase().includes(s)
        || (r.warehouse?.name || '').toLowerCase().includes(s)
        || (r._whInfo?.fullName || '').toLowerCase().includes(s)
        || (r._whInfo?.isMulti && 'multibodega'.includes(s))
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
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Op / Contenedor</th>
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
                            <div className="font-bold text-sm text-slate-900">
                              {r.operation_number ? <span className="text-[#6a9a04] mr-1.5">{r.operation_number}</span> : null}
                              {r.container_label || 'Sin etiqueta'}
                            </div>
                            {r.po?.po_number && <div className="text-[11px] text-slate-400">PO: {r.po.po_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {r._whInfo?.isMulti ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                              <Warehouse size={11} className="text-purple-600 shrink-0" /> Multibodega
                            </span>
                            <span className="text-xs font-bold text-slate-800 leading-snug">
                              {r._whInfo.names.join(' / ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-700">
                            {r._whInfo?.fullName || r.warehouse?.name || '—'}
                          </span>
                        )}
                      </td>
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
                        {formatDateOnly(r.reception_date)}
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
