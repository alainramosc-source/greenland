'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Loader2, Search, Filter, Eye, Copy, Pencil,
  CheckCircle, Clock, XCircle, Send, AlertTriangle, Download,
  ChevronDown, Trash2
} from 'lucide-react';

const STATUS_MAP = {
  draft: { label: 'Borrador', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: FileText },
  sent: { label: 'Enviada', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Send },
  accepted: { label: 'Aceptada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  expired: { label: 'Vencida', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  rejected: { label: 'Rechazada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

const BRAND_MAP = {
  spaces: { label: 'Spaces', color: '#2d7d46', bg: 'rgba(45,125,70,0.1)' },
  products: { label: 'Products', color: '#6a9a04', bg: 'rgba(106,154,4,0.1)' },
  deco: { label: 'Deco', color: '#5a8a3c', bg: 'rgba(90,138,60,0.1)' },
};

export default function CotizacionesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quotations')
      .select('*, creator:profiles!quotations_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });
    setQuotations(data || []);
    setLoading(false);
  };

  const handleDuplicate = async (q) => {
    const { data: folio } = await supabase.rpc('generate_quotation_folio');
    // Get items from original
    const { data: origItems } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', q.id)
      .order('sort_order');

    const { data: { user } } = await supabase.auth.getUser();

    // Create new quotation
    const { data: newQ, error } = await supabase.from('quotations').insert({
      folio,
      brand: q.brand,
      template_id: q.template_id,
      client_name: q.client_name,
      client_company: q.client_company,
      client_email: q.client_email,
      client_phone: q.client_phone,
      city: q.city,
      quote_date: new Date().toISOString().split('T')[0],
      validity_days: q.validity_days,
      currency: q.currency,
      status: 'draft',
      intro_text: q.intro_text,
      conditions: q.conditions,
      notes: q.notes,
      includes_iva: q.includes_iva,
      subtotal: q.subtotal,
      iva_amount: q.iva_amount,
      total: q.total,
      created_by: user?.id,
    }).select().single();

    if (error) { alert('Error al duplicar: ' + error.message); return; }

    // Copy items
    if (origItems?.length && newQ) {
      await supabase.from('quotation_items').insert(
        origItems.map(i => ({
          quotation_id: newQ.id,
          product_id: i.product_id,
          sku: i.sku,
          name: i.name,
          description: i.description,
          image_url: i.image_url,
          unit_price: i.unit_price,
          quantity: i.quantity,
          quantity_unit: i.quantity_unit,
          total: i.total,
          sort_order: i.sort_order,
        }))
      );
    }

    router.push(`/dashboard/cotizaciones/nueva?edit=${newQ.id}`);
  };

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('quotations').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id) => {
    await supabase.from('quotations').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchData();
  };

  const handleDownloadPdf = async (q) => {
    if (!q.pdf_url) {
      alert('Esta cotización no tiene PDF generado. Edítala y genera el PDF.');
      return;
    }
    const { data } = await supabase.storage.from('quotation-pdfs').createSignedUrl(q.pdf_url, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  // Filters
  const filtered = quotations.filter(q => {
    const matchSearch = !searchTerm ||
      q.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.client_company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBrand = filterBrand === 'all' || q.brand === filterBrand;
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchSearch && matchBrand && matchStatus;
  });

  // KPIs
  const thisMonth = new Date();
  const monthQuotes = quotations.filter(q => {
    const d = new Date(q.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  });
  const totalMonth = monthQuotes.reduce((s, q) => s + Number(q.total || 0), 0);
  const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
  const pendingCount = quotations.filter(q => q.status === 'draft' || q.status === 'sent').length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Cotizaciones</h1>
          <p className="text-sm text-slate-500 mt-1">Genera y gestiona cotizaciones profesionales.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/cotizaciones/nueva')}
          className="flex items-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
        >
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText size={20} className="text-blue-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Este Mes</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{monthQuotes.length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-[#6a9a04]" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Aceptadas</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{acceptedCount}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Pendientes</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="text-emerald-500 font-black text-sm">$</span>
            </div>
            <span className="text-sm text-slate-500 font-medium">Monto Mes</span>
          </div>
          <p className="text-xl font-black text-slate-900">${totalMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, cliente..."
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 shadow-sm focus:ring-2 focus:ring-[#6a9a04]/20"
          />
        </div>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm cursor-pointer">
          <option value="all">Todas las marcas</option>
          <option value="spaces">Greenland Spaces</option>
          <option value="products">Greenland Products</option>
          <option value="deco">Greenland Deco</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm cursor-pointer">
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="accepted">Aceptada</option>
          <option value="expired">Vencida</option>
          <option value="rejected">Rechazada</option>
        </select>
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} cotizaciones</span>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-bold">Sin cotizaciones</p>
            <p className="text-sm mt-1">Crea tu primera cotización con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(q => {
                  const st = STATUS_MAP[q.status] || STATUS_MAP.draft;
                  const brand = BRAND_MAP[q.brand] || BRAND_MAP.products;
                  const StIcon = st.icon;
                  return (
                    <tr key={q.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-sm text-slate-900">{q.folio}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: brand.color, background: brand.bg }}>
                          {brand.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800 m-0">{q.client_name}</p>
                        {q.client_company && <p className="text-xs text-slate-400 m-0">{q.client_company}</p>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-sm text-slate-900">
                          {q.currency === 'USD' ? 'US' : ''}${Number(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{q.currency}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-500">
                          {new Date(q.quote_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative group inline-block">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 w-fit" style={{ color: st.color, background: st.bg }}>
                            <StIcon size={12} /> {st.label}
                            <ChevronDown size={10} className="ml-0.5" />
                          </span>
                          <div className="absolute left-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-slate-200 py-1 z-20 hidden group-hover:block min-w-[140px]">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <button key={key} onClick={() => handleStatusChange(q.id, key)}
                                className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 border-none bg-transparent cursor-pointer ${q.status === key ? 'text-[#6a9a04]' : 'text-slate-600'}`}>
                                <val.icon size={12} style={{ color: val.color }} /> {val.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {q.pdf_url && (
                            <button onClick={() => handleDownloadPdf(q)} title="Descargar PDF"
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                              <Download size={14} className="text-slate-500" />
                            </button>
                          )}
                          <button onClick={() => router.push(`/dashboard/cotizaciones/nueva?edit=${q.id}`)} title="Editar"
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                            <Pencil size={14} className="text-slate-500" />
                          </button>
                          <button onClick={() => handleDuplicate(q)} title="Duplicar"
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                            <Copy size={14} className="text-slate-500" />
                          </button>
                          <button onClick={() => setDeleteConfirm(q.id)} title="Eliminar"
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center border-none cursor-pointer transition-colors">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 m-0">Eliminar cotización</h3>
                <p className="text-sm text-slate-500 m-0">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 cursor-pointer bg-white">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 border-none cursor-pointer">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
