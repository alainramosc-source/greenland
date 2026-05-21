'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import {
  Package, Plus, Search, Loader2, X, Save, Edit3, CheckCircle,
  AlertTriangle, Grid, List, Factory, DollarSign, Settings
} from 'lucide-react';

export default function ProductCatalogPage() {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [skuMappings, setSkuMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [form, setForm] = useState({
    sku: '', name: '', category: '', container_capacity: 0, is_active: true, description: '',
    manufacturer_id: '', supplier_sku: '', unit_price_usd: ''
  });
  // Manufacturer config modal
  const [showMfgModal, setShowMfgModal] = useState(false);
  const [mfgForm, setMfgForm] = useState({ id: '', tax_id: '', default_incoterm: 'FOB', payment_terms: '' });
  const [savingMfg, setSavingMfg] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [prodRes, mfgRes, mapRes] = await Promise.all([
      supabase.from('products').select('*').order('sku'),
      supabase.from('suppliers').select('*').eq('type', 'manufacturer'),
      supabase.from('supplier_sku_mapping').select('*'),
    ]);
    setProducts(prodRes.data || []);
    setManufacturers(mfgRes.data || []);
    setSkuMappings(mapRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => setForm({
    sku: '', name: '', category: '', container_capacity: 0, is_active: true, description: '',
    manufacturer_id: '', supplier_sku: '', unit_price_usd: ''
  });

  const openCreate = () => { resetForm(); setEditingId(null); setShowModal(true); };

  const openEdit = (prod) => {
    const mapping = skuMappings.find(m => m.product_id === prod.id);
    setForm({
      sku: prod.sku || '',
      name: prod.name || '',
      category: prod.category || '',
      container_capacity: prod.container_capacity || 0,
      is_active: prod.is_active !== false,
      description: prod.description || '',
      manufacturer_id: mapping?.supplier_id || '',
      supplier_sku: mapping?.supplier_sku || '',
      unit_price_usd: mapping?.unit_price_usd || '',
    });
    setEditingId(prod.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      alert('SKU y nombre son obligatorios.');
      return;
    }
    setSaving(true);
    const payload = {
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category.trim() || null,
      container_capacity: parseInt(form.container_capacity) || 0,
      is_active: form.is_active,
    };

    let error, productId = editingId;
    if (editingId) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editingId));
    } else {
      const { data: newProd, error: insertErr } = await supabase.from('products').insert(payload).select('id').single();
      error = insertErr;
      if (newProd) productId = newProd.id;
    }
    if (error) {
      if (error.message.includes('duplicate')) alert('Ya existe un producto con ese SKU');
      else alert('Error: ' + error.message);
    } else {
      // Save manufacturer mapping
      if (productId && form.manufacturer_id) {
        const existingMapping = skuMappings.find(m => m.product_id === productId);
        if (existingMapping) {
          await supabase.from('supplier_sku_mapping').update({
            supplier_id: form.manufacturer_id,
            supplier_sku: form.supplier_sku.trim() || form.sku,
            unit_price_usd: parseFloat(form.unit_price_usd) || null,
          }).eq('id', existingMapping.id);
        } else {
          await supabase.from('supplier_sku_mapping').insert({
            product_id: productId,
            supplier_id: form.manufacturer_id,
            supplier_sku: form.supplier_sku.trim() || form.sku,
            unit_price_usd: parseFloat(form.unit_price_usd) || null,
          });
        }
      } else if (productId && !form.manufacturer_id) {
        // Remove mapping if manufacturer was cleared
        const existingMapping = skuMappings.find(m => m.product_id === productId);
        if (existingMapping) {
          await supabase.from('supplier_sku_mapping').delete().eq('id', existingMapping.id);
        }
      }
      showToast(editingId ? 'Producto actualizado' : 'Producto creado');
      setShowModal(false);
      await fetchAll();
    }
    setSaving(false);
  };

  const toggleActive = async (prod) => {
    const { error } = await supabase.from('products')
      .update({ is_active: !prod.is_active }).eq('id', prod.id);
    if (error) showToast('Error: ' + error.message, 'error');
    else { showToast(prod.is_active ? 'Producto desactivado' : 'Producto reactivado'); await fetchAll(); }
  };

  const getMfgForProduct = (productId) => {
    const mapping = skuMappings.find(m => m.product_id === productId);
    if (!mapping) return null;
    const mfg = manufacturers.find(m => m.id === mapping.supplier_id);
    return mfg ? { ...mfg, supplier_sku: mapping.supplier_sku, unit_price_usd: mapping.unit_price_usd } : null;
  };

  // Manufacturer config handlers
  const openMfgConfig = (mfg) => {
    setMfgForm({
      id: mfg.id,
      tax_id: mfg.tax_id || '',
      default_incoterm: mfg.default_incoterm || 'FOB',
      payment_terms: mfg.payment_terms || '',
    });
    setShowMfgModal(true);
  };

  const saveMfgConfig = async () => {
    setSavingMfg(true);
    const { error } = await supabase.from('suppliers').update({
      tax_id: mfgForm.tax_id.trim() || null,
      default_incoterm: mfgForm.default_incoterm.trim() || 'FOB',
      payment_terms: mfgForm.payment_terms.trim() || null,
    }).eq('id', mfgForm.id);
    if (error) showToast('Error: ' + error.message, 'error');
    else {
      showToast('Fabricante actualizado');
      setShowMfgModal(false);
      await fetchAll();
    }
    setSavingMfg(false);
  };

  const filtered = useMemo(() => {
    return products.filter(p =>
      !search ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const activeCount = products.filter(p => p.is_active).length;
  const inactiveCount = products.filter(p => !p.is_active).length;

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
      <p className="font-medium">Cargando productos...</p>
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
            <Package className="w-7 h-7 text-[#6a9a04]" /> Catálogo de Productos
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {activeCount} activos · {inactiveCount} inactivos · {products.length} total
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 bg-[#6a9a04] hover:bg-[#5a8503] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Manufacturer Config Bar */}
      {manufacturers.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fabricantes:</span>
          {manufacturers.map(m => (
            <button key={m.id} onClick={() => openMfgConfig(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                m.tax_id ? 'bg-[#6a9a04]/5 border-[#6a9a04]/20 text-[#6a9a04]' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
              <Settings size={12} /> {m.short_name || m.company_name}
              {!m.tax_id && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">Sin Tax ID</span>}
            </button>
          ))}
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SKU, nombre o categoría..."
            className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider w-24">SKU</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoría</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fabricante</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Precio FOB</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Cap. Contenedor</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Estatus</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {search ? 'No se encontraron productos' : 'No hay productos registrados'}
                  </td>
                </tr>
              ) : filtered.map(prod => {
                const mfg = getMfgForProduct(prod.id);
                return (
                  <tr key={prod.id} className={`hover:bg-slate-50/50 transition-colors ${!prod.is_active ? 'opacity-50' : ''}`} style={{cursor:'default'}}>
                    <td className="px-5 py-3 font-mono text-sm font-black text-[#6a9a04]">{prod.sku}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{prod.name}</td>
                    <td className="px-5 py-3">
                      {prod.category ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {prod.category}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {mfg ? (
                        <div>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Factory size={12} className="text-[#6a9a04]" /> {mfg.short_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{mfg.supplier_sku}</span>
                        </div>
                      ) : <span className="text-xs text-slate-300">Sin asignar</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {mfg?.unit_price_usd ? (
                        <span className="text-sm font-bold text-slate-700">${Number(mfg.unit_price_usd).toFixed(2)}</span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {prod.container_capacity > 0 ? (
                        <span className="text-sm font-bold text-slate-700">{prod.container_capacity.toLocaleString()}</span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => toggleActive(prod)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer border-none transition-all ${
                          prod.is_active
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-red-50 text-red-500 hover:bg-red-100'
                        }`}>
                        {prod.is_active ? <><CheckCircle size={11} /> Activo</> : <><AlertTriangle size={11} /> Inactivo</>}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => openEdit(prod)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer text-slate-400 hover:text-[#6a9a04] transition-colors">
                        <Edit3 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[550px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <Package size={20} className="text-[#6a9a04]" />
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">SKU *</label>
                  <input type="text" value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                    placeholder="GL25"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Mesa Plegable 180cm"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Categoría</label>
                  <input type="text" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="mesas / sillas / toldos"
                    list="categories"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                  <datalist id="categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Capacidad Contenedor</label>
                  <input type="number" min="0" value={form.container_capacity}
                    onChange={e => setForm(f => ({ ...f, container_capacity: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-bold text-center" />
                  <p className="text-[10px] text-slate-400 mt-1">Unidades que caben en un contenedor de 40'</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Fabricante</label>
                  <select value={form.manufacturer_id}
                    onChange={e => setForm(f => ({ ...f, manufacturer_id: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm">
                    <option value="">Sin asignar</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>{m.short_name || m.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">SKU Fabricante</label>
                  <input type="text" value={form.supplier_sku}
                    onChange={e => setForm(f => ({ ...f, supplier_sku: e.target.value }))}
                    placeholder={form.sku || 'SKU del proveedor'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-mono" />
                </div>
              </div>
              {form.manufacturer_id && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Precio FOB (USD)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" step="0.01" min="0" value={form.unit_price_usd}
                      onChange={e => setForm(f => ({ ...f, unit_price_usd: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-bold" />
                  </div>
                </div>
                <div className="flex items-end">
                  <p className="text-[10px] text-slate-400 pb-2">Precio unitario para Órdenes de Compra</p>
                </div>
              </div>
              )}

              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-[#6a9a04] cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700">Producto activo</span>
                </label>
                <p className="text-[10px] text-slate-400">Productos inactivos no aparecen en POs ni pedidos</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Crear Producto')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manufacturer Config Modal */}
      {showMfgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[101] flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[500px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <Factory size={20} className="text-[#6a9a04]" />
                Configurar Fabricante
              </h3>
              <button onClick={() => setShowMfgModal(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tax ID / Unified Social Credit Code</label>
                <input type="text" value={mfgForm.tax_id}
                  onChange={e => setMfgForm(f => ({ ...f, tax_id: e.target.value }))}
                  placeholder="91330XXXXXXXXXX"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">INCOTERM por defecto</label>
                  <select value={mfgForm.default_incoterm}
                    onChange={e => setMfgForm(f => ({ ...f, default_incoterm: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-bold">
                    <option value="FOB">FOB</option>
                    <option value="EXW">EXW</option>
                    <option value="CIF">CIF</option>
                    <option value="CFR">CFR</option>
                    <option value="DDP">DDP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Condiciones de Pago</label>
                  <input type="text" value={mfgForm.payment_terms}
                    onChange={e => setMfgForm(f => ({ ...f, payment_terms: e.target.value }))}
                    placeholder="30% deposit, 70% T/T before shipment"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowMfgModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  Cancelar
                </button>
                <button onClick={saveMfgConfig} disabled={savingMfg}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50">
                  {savingMfg ? <Loader2 size={18} className="animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
