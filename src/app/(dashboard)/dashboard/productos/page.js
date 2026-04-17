'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import {
  Package, Plus, Search, Loader2, X, Save, Edit3, CheckCircle,
  AlertTriangle, Grid, List, Factory
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
    sku: '', name: '', category: '', container_capacity: 0, is_active: true, description: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [prodRes, mfgRes, mapRes] = await Promise.all([
      supabase.from('products').select('*').order('sku'),
      supabase.from('suppliers').select('id, short_name, company_name').eq('type', 'manufacturer'),
      supabase.from('supplier_sku_mapping').select('*'),
    ]);
    setProducts(prodRes.data || []);
    setManufacturers(mfgRes.data || []);
    setSkuMappings(mapRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => setForm({
    sku: '', name: '', category: '', container_capacity: 0, is_active: true, description: ''
  });

  const openCreate = () => { resetForm(); setEditingId(null); setShowModal(true); };

  const openEdit = (prod) => {
    setForm({
      sku: prod.sku || '',
      name: prod.name || '',
      category: prod.category || '',
      container_capacity: prod.container_capacity || 0,
      is_active: prod.is_active !== false,
      description: prod.description || '',
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

    let error;
    if (editingId) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('products').insert(payload));
    }
    if (error) {
      if (error.message.includes('duplicate')) alert('Ya existe un producto con ese SKU');
      else alert('Error: ' + error.message);
    } else {
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
    return mfg ? { ...mfg, supplier_sku: mapping.supplier_sku } : null;
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
                  <tr key={prod.id} className={`hover:bg-slate-50/50 transition-colors ${!prod.is_active ? 'opacity-50' : ''}`}>
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
    </div>
  );
}
