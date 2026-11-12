'use client';
import { todayMX } from '@/utils/formatters';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Loader2, Search, Copy, Pencil,
  CheckCircle, Clock, XCircle, Send, AlertTriangle, Download,
  ChevronDown, Trash2, DollarSign
} from 'lucide-react';

const STATUS_MAP = {
  draft: { label: 'Borrador', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: FileText },
  sent: { label: 'Enviada', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', icon: Send },
  accepted: { label: 'Aceptada', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: CheckCircle },
  expired: { label: 'Vencida', color: '#d97706', bg: 'rgba(217,119,6,0.12)', icon: Clock },
  rejected: { label: 'Rechazada', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: XCircle },
};

const BRAND_MAP = {
  spaces: { label: 'Greenland Spaces', short: 'Spaces', color: '#2d7d46', bg: 'rgba(45,125,70,0.1)' },
  products: { label: 'Greenland Products', short: 'Products', color: '#6a9a04', bg: 'rgba(106,154,4,0.1)' },
  deco: { label: 'Greenland Deco', short: 'Deco', color: '#5a8a3c', bg: 'rgba(90,138,60,0.1)' },
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
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quotations')
      .select('*, creator:profiles!quotations_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDuplicate = async (q) => {
    const { data: folio } = await supabase.rpc('generate_quotation_folio');
    const { data: origItems } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', q.id)
      .order('sort_order');

    const { data: { user } } = await supabase.auth.getUser();

    const { data: newQ, error } = await supabase.from('quotations').insert({
      folio,
      brand: q.brand,
      template_id: q.template_id,
      client_name: q.client_name,
      client_company: q.client_company,
      client_email: q.client_email,
      client_phone: q.client_phone,
      city: q.city,
      quote_date: todayMX(),
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
    setDownloadingId(q.id);
    try {
      if (q.pdf_url) {
        if (q.pdf_url.startsWith('http://') || q.pdf_url.startsWith('https://')) {
          window.open(q.pdf_url, '_blank');
          setDownloadingId(null);
          return;
        }
        const { data } = await supabase.storage.from('quotation-pdfs').createSignedUrl(q.pdf_url, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          setDownloadingId(null);
          return;
        }
        const { data: pubData } = supabase.storage.from('quotation-pdfs').getPublicUrl(q.pdf_url);
        if (pubData?.publicUrl) {
          window.open(pubData.publicUrl, '_blank');
          setDownloadingId(null);
          return;
        }
      }

      const { data: items } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', q.id)
        .order('sort_order');

      const generateQuotationPDF = (await import('./pdf-generator')).default;
      const doc = await generateQuotationPDF({ quotation: q, items: items || [] });

      const folio = q.folio || 'cotizacion';
      doc.save(`${folio}.pdf`);

      try {
        const pdfBlob = doc.output('blob');
        const pdfPath = `${q.id}/${folio}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('quotation-pdfs')
          .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('quotation-pdfs').getPublicUrl(pdfPath);
          if (urlData?.publicUrl) {
            await supabase.from('quotations').update({ pdf_url: urlData.publicUrl }).eq('id', q.id);
            setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, pdf_url: urlData.publicUrl } : item));
          }
        }
      } catch (uploadErr) {
        console.warn('Could not cache generated PDF to storage:', uploadErr);
      }
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('Error al descargar el PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
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
    <div className="w-full max-w-full space-y-4">
      {/* ============================================================ */}
      {/* ENTERPRISE HEADER CARD */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#6a9a04]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 m-0">
                  Gestión de Cotizaciones
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04]">
                  COMERCIAL & B2B
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Genera propuestas ejecutivas en PDF, duplica cotizaciones y da seguimiento al embudo comercial
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/cotizaciones/nueva')}
            className="flex items-center justify-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#6a9a04]/20 transition-all border-none cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMPACT KPI STRIP */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">Cotizaciones (Mes)</p>
            <p className="text-2xl font-black text-slate-900 mt-1 m-0">{monthQuotes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">Aceptadas</p>
            <p className="text-2xl font-black text-emerald-600 mt-1 m-0">{acceptedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">En Seguimiento</p>
            <p className="text-2xl font-black text-amber-600 mt-1 m-0">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">Monto Cotizado (Mes)</p>
            <p className="text-xl font-black text-slate-900 mt-1 m-0 truncate">
              ${totalMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-[#6a9a04]" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER TOOLBAR + TABLE CARD */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, cliente o empresa..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 transition-all"
              />
            </div>

            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all"
            >
              <option value="all">Todas las marcas</option>
              <option value="spaces">Greenland Spaces</option>
              <option value="products">Greenland Products</option>
              <option value="deco">Greenland Deco</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviada</option>
              <option value="accepted">Aceptada</option>
              <option value="expired">Vencida</option>
              <option value="rejected">Rechazada</option>
            </select>
          </div>

          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            {filtered.length} {filtered.length === 1 ? 'cotización' : 'cotizaciones'}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-14 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-600 m-0">Sin cotizaciones encontradas</p>
            <p className="text-xs text-slate-400 mt-1 m-0">Ajusta los filtros o crea una nueva cotización.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Folio</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Marca</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Cliente / Empresa</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ciudad</th>
                  <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Importe Total</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Estado</th>
                  <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(q => {
                  const st = STATUS_MAP[q.status] || STATUS_MAP.draft;
                  const brand = BRAND_MAP[q.brand] || BRAND_MAP.products;
                  const StIcon = st.icon;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                          {q.folio}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-block"
                          style={{ color: brand.color, background: brand.bg }}
                        >
                          {brand.short}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-slate-800 m-0">{q.client_name}</p>
                        {q.client_company && <p className="text-[11px] text-slate-400 m-0">{q.client_company}</p>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-500">{q.city || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="font-black text-xs text-slate-900">
                          {q.currency === 'USD' ? 'US' : ''}${Number(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">{q.currency}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {new Date(q.quote_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="relative group inline-block">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1.5 w-fit whitespace-nowrap"
                            style={{ color: st.color, background: st.bg }}
                          >
                            <StIcon size={12} /> {st.label}
                            <ChevronDown size={10} className="ml-0.5" />
                          </span>
                          <div className="absolute left-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-slate-200 py-1 z-20 hidden group-hover:block min-w-[140px]">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(q.id, key)}
                                className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 border-none bg-transparent cursor-pointer whitespace-nowrap ${
                                  q.status === key ? 'text-[#6a9a04]' : 'text-slate-600'
                                }`}
                              >
                                <val.icon size={12} style={{ color: val.color }} /> {val.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadPdf(q)}
                            disabled={downloadingId === q.id}
                            title="Descargar PDF"
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {downloadingId === q.id ? (
                              <Loader2 size={14} className="animate-spin text-[#6a9a04]" />
                            ) : (
                              <Download size={14} className="text-slate-600" />
                            )}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/cotizaciones/nueva?edit=${q.id}`)}
                            title="Editar"
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                          >
                            <Pencil size={14} className="text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(q)}
                            title="Duplicar"
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                          >
                            <Copy size={14} className="text-slate-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(q.id)}
                            title="Eliminar"
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center border-none cursor-pointer transition-colors"
                          >
                            <Trash2 size={14} className="text-red-500" />
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setDeleteConfirm(null)}
        >
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
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 border-none cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
