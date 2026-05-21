'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Factory, Plus, Search, Loader2, X, Save, Edit3, Mail, Phone, MapPin,
  CheckCircle, Package, Trash2, ChevronDown, ChevronUp, FileSpreadsheet, Clock
} from 'lucide-react';

export default function ManufacturersPage() {
  const supabase = createClient();
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [skuMappings, setSkuMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    company_name: '', short_name: '', contact_name: '', email: '', phone: '',
    address: '', production_lead_weeks: 4, transit_lead_weeks: 5, notes: '',
    tax_id: '', default_incoterm: 'FOB', payment_terms: ''
  });
  // SKU mapping editing
  const [editingMappings, setEditingMappings] = useState(false);
  const [mappingChanges, setMappingChanges] = useState({});
  const [newMappingProduct, setNewMappingProduct] = useState('');
  const [newMappingSku, setNewMappingSku] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [mfgRes, prodRes, mapRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('type', 'manufacturer').order('short_name'),
      supabase.from('products').select('id, name, sku').eq('is_active', true).order('sku'),
      supabase.from('supplier_sku_mapping').select('*'),
    ]);
    setManufacturers(mfgRes.data || []);
    setProducts(prodRes.data || []);
    setSkuMappings(mapRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => setForm({
    company_name: '', short_name: '', contact_name: '', email: '', phone: '',
    address: '', production_lead_weeks: 4, transit_lead_weeks: 5, notes: '',
    tax_id: '', default_incoterm: 'FOB', payment_terms: ''
  });

  const openCreate = () => { resetForm(); setEditingId(null); setShowModal(true); };

  const openEdit = (mfg) => {
    setForm({
      company_name: mfg.company_name || mfg.name || '',
      short_name: mfg.short_name || '',
      contact_name: mfg.contact_name || '',
      email: mfg.email || '',
      phone: mfg.phone || '',
      address: mfg.address || '',
      production_lead_weeks: mfg.production_lead_weeks || 4,
      transit_lead_weeks: mfg.transit_lead_weeks || 5,
      notes: mfg.notes || '',
      tax_id: mfg.tax_id || '',
      default_incoterm: mfg.default_incoterm || 'FOB',
      payment_terms: mfg.payment_terms || '',
    });
    setEditingId(mfg.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.short_name.trim()) {
      alert('Nombre de empresa y nombre corto son obligatorios.');
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      name: form.company_name.trim(),
      short_name: form.short_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      production_lead_weeks: parseInt(form.production_lead_weeks) || 4,
      transit_lead_weeks: parseInt(form.transit_lead_weeks) || 5,
      notes: form.notes.trim() || null,
      type: 'manufacturer',
      is_active: true,
      tax_id: form.tax_id.trim() || null,
      default_incoterm: form.default_incoterm.trim() || 'FOB',
      payment_terms: form.payment_terms.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('suppliers').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('suppliers').insert(payload));
    }
    if (error) {
      alert('Error: ' + error.message);
    } else {
      showToast(editingId ? 'Fabricante actualizado' : 'Fabricante creado');
      setShowModal(false);
      await fetchAll();
    }
    setSaving(false);
  };

  // SKU Mapping functions
  const getMappingsForMfg = (mfgId) => skuMappings.filter(m => m.supplier_id === mfgId);

  const startEditMappings = (mfgId) => {
    setEditingMappings(true);
    setMappingChanges({});
    setNewMappingProduct('');
    setNewMappingSku('');
  };

  const saveMappingEdit = async (mappingId, newSku) => {
    const { error } = await supabase.from('supplier_sku_mapping')
      .update({ supplier_sku: newSku }).eq('id', mappingId);
    if (error) showToast('Error: ' + error.message, 'error');
    else { showToast('SKU actualizado'); await fetchAll(); }
  };

  const deleteMapping = async (mappingId) => {
    if (!confirm('¿Eliminar este mapeo de SKU?')) return;
    const { error } = await supabase.from('supplier_sku_mapping').delete().eq('id', mappingId);
    if (error) showToast('Error: ' + error.message, 'error');
    else { showToast('Mapeo eliminado'); await fetchAll(); }
  };

  const addMapping = async (mfgId) => {
    if (!newMappingProduct || !newMappingSku.trim()) {
      showToast('Selecciona un producto y escribe el SKU del fabricante', 'error');
      return;
    }
    const { error } = await supabase.from('supplier_sku_mapping').insert({
      product_id: newMappingProduct,
      supplier_id: mfgId,
      supplier_sku: newMappingSku.trim(),
    });
    if (error) {
      if (error.message.includes('duplicate')) showToast('Este producto ya está mapeado', 'error');
      else showToast('Error: ' + error.message, 'error');
    } else {
      showToast('Mapeo agregado');
      setNewMappingProduct('');
      setNewMappingSku('');
      await fetchAll();
    }
  };

  const filtered = manufacturers.filter(m =>
    !search ||
    m.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.short_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getUnmappedProducts = (mfgId) => {
    const mappedIds = new Set(getMappingsForMfg(mfgId).map(m => m.product_id));
    return products.filter(p => !mappedIds.has(p.id));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
      <p className="font-medium">Cargando fabricantes...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          <CheckCircle size={16} /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Factory className="w-7 h-7 text-[#6a9a04]" /> Fabricantes
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Proveedores de manufactura internacional · {manufacturers.length} registrados
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 bg-[#6a9a04] hover:bg-[#5a8503] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none">
          <Plus size={18} /> Nuevo Fabricante
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o contacto..."
          className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
      </div>

      {/* Manufacturers Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay fabricantes registrados</p>
          </div>
        )}

        {filtered.map(mfg => {
          const mappings = getMappingsForMfg(mfg.id);
          const isExpanded = expandedId === mfg.id;
          const totalLead = (mfg.production_lead_weeks || 0) + (mfg.transit_lead_weeks || 0);

          return (
            <div key={mfg.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : mfg.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
                    <Factory size={22} className="text-[#6a9a04]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900">{mfg.short_name}</span>
                      <span className="text-xs text-slate-400">{mfg.company_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      {mfg.contact_name && <span className="flex items-center gap-1"><MapPin size={11} /> {mfg.contact_name}</span>}
                      {mfg.email && <span className="flex items-center gap-1"><Mail size={11} /> {mfg.email}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} /> Lead: {totalLead} sem ({mfg.production_lead_weeks}p + {mfg.transit_lead_weeks}t)</span>
                      <span className="flex items-center gap-1"><Package size={11} /> {mappings.length} SKUs</span>
                      {mfg.default_incoterm && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{mfg.default_incoterm}</span>}
                      {!mfg.tax_id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">Sin Tax ID</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(mfg); }}
                    className="p-2 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer text-slate-400 hover:text-[#6a9a04] transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <Link href="/dashboard/cobertura/nuevo-pedido" onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04] text-xs font-bold hover:bg-[#6a9a04]/20 transition-colors no-underline">
                    <FileSpreadsheet size={14} /> Crear PO
                  </Link>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded: SKU Mappings */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Package size={16} /> Mapeo de SKUs — {mappings.length} productos
                    </h3>
                  </div>

                  {mappings.length > 0 && (
                    <table className="w-full border-collapse text-sm mb-4">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">GL SKU</th>
                          <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Producto</th>
                          <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">SKU Fabricante</th>
                          <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mappings.map(mapping => {
                          const prod = products.find(p => p.id === mapping.product_id);
                          const isEditingThis = mappingChanges[mapping.id] !== undefined;
                          return (
                            <tr key={mapping.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3 py-2 font-mono text-[11px] font-black text-[#6a9a04]">{prod?.sku || '—'}</td>
                              <td className="px-3 py-2 text-xs text-slate-700">{prod?.name || '—'}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  defaultValue={mapping.supplier_sku}
                                  onBlur={(e) => {
                                    if (e.target.value !== mapping.supplier_sku) {
                                      saveMappingEdit(mapping.id, e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-[#6a9a04]/30 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/10 bg-transparent transition-all"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => deleteMapping(mapping.id)}
                                  className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 bg-transparent border-none cursor-pointer transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Add new mapping */}
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <select value={newMappingProduct} onChange={e => setNewMappingProduct(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/30">
                      <option value="">+ Agregar producto...</option>
                      {getUnmappedProducts(mfg.id).map(p => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                    <input type="text" value={newMappingSku} onChange={e => setNewMappingSku(e.target.value)}
                      placeholder="SKU del fabricante"
                      className="w-60 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/30" />
                    <button onClick={() => addMapping(mfg.id)} disabled={!newMappingProduct || !newMappingSku.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#6a9a04] text-white rounded-lg text-xs font-bold hover:bg-[#5a8503] cursor-pointer border-none transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm">
                      <Plus size={14} /> Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[600px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <Factory size={20} className="text-[#6a9a04]" />
                {editingId ? 'Editar Fabricante' : 'Nuevo Fabricante'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre de Empresa *</label>
                  <input type="text" value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Guangdong Freeman Outdoors Co."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre Corto *</label>
                  <input type="text" value={form.short_name}
                    onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))}
                    placeholder="Freeman"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-bold" />
                  <p className="text-[10px] text-slate-400 mt-1">Se usa en POs, tránsitos y cobertura</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contacto</label>
                  <input type="text" value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Patrick Huang"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="patrick@tent-tent.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+86 123 456 7890"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Dirección</label>
                  <input type="text" value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Dongguan, Guangdong, China"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
              </div>

              {/* Lead Times */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <label className="block text-xs font-bold text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={14} /> Lead Times (semanas)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-orange-600 font-bold mb-1">Producción</label>
                    <input type="number" min="1" value={form.production_lead_weeks}
                      onChange={e => setForm(f => ({ ...f, production_lead_weeks: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-300 shadow-sm font-bold text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-orange-600 font-bold mb-1">Tránsito Marítimo</label>
                    <input type="number" min="1" value={form.transit_lead_weeks}
                      onChange={e => setForm(f => ({ ...f, transit_lead_weeks: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-300 shadow-sm font-bold text-center" />
                  </div>
                </div>
                <p className="text-[10px] text-orange-500 mt-2 text-center font-bold">
                  Total: {(parseInt(form.production_lead_weeks) || 0) + (parseInt(form.transit_lead_weeks) || 0)} semanas
                </p>
              </div>

              {/* Commercial Terms */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📋 Datos Comerciales (para PO)
                </label>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Tax ID / Unified Social Credit Code</label>
                  <input type="text" value={form.tax_id}
                    onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
                    placeholder="91330XXXXXXXXXX"
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-[10px] text-blue-600 font-bold mb-1">INCOTERM</label>
                    <select value={form.default_incoterm}
                      onChange={e => setForm(f => ({ ...f, default_incoterm: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm font-bold">
                      <option value="FOB">FOB</option>
                      <option value="EXW">EXW</option>
                      <option value="CIF">CIF</option>
                      <option value="CFR">CFR</option>
                      <option value="DDP">DDP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-blue-600 font-bold mb-1">Condiciones de Pago</label>
                    <input type="text" value={form.payment_terms}
                      onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                      placeholder="30% deposit, 70% T/T before shipment"
                      className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas internas..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Crear Fabricante')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
