'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    DollarSign, Search, Save, Upload, Percent, X, Check,
    AlertTriangle, Package, ArrowUpDown, Download, FileSpreadsheet, History, ChevronDown, ChevronUp
} from 'lucide-react';

export default function PreciosPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editedPrices, setEditedPrices] = useState({});
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    // Percentage modal
    const [showPercent, setShowPercent] = useState(false);
    const [percentValue, setPercentValue] = useState('');
    const [percentTarget, setPercentTarget] = useState('all');
    // CSV modal
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvData, setCsvData] = useState(null);
    const [csvPreview, setCsvPreview] = useState([]);
    const fileInputRef = useRef(null);
    // Sort
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    // Price history
    const [priceHistory, setPriceHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') { router.push('/dashboard/pedidos'); return; }

        const [productsRes, historyRes] = await Promise.all([
            supabase
                .from('products')
                .select('id, name, sku, price, category_id, categories:category_id(name)')
                .eq('is_active', true)
                .order('name'),
            supabase
                .from('price_history')
                .select('*')
                .order('changed_at', { ascending: false })
                .limit(100)
        ]);

        const data = productsRes.data || [];
        setProducts(data);
        setPriceHistory(historyRes.data || []);
        const cats = [...new Set(data.map(p => p.categories?.name).filter(Boolean))];
        setCategories(cats);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- Save edited prices ---
    const handleSaveAll = async () => {
        const entries = Object.entries(editedPrices);
        if (entries.length === 0) return;
        setSaving(true);

        let errors = [];
        for (const [id, newPrice] of entries) {
            const { error } = await supabase
                .from('products')
                .update({ price: parseFloat(newPrice) })
                .eq('id', id);
            if (error) errors.push(error.message);
        }

        if (errors.length) {
            alert('Algunos errores: ' + errors.join(', '));
        } else {
            setEditedPrices({});
            await fetchData();
        }
        setSaving(false);
    };

    // --- Apply percentage ---
    const handleApplyPercent = async () => {
        const pct = parseFloat(percentValue);
        if (isNaN(pct) || pct === 0) return;

        const targetProducts = percentTarget === 'all'
            ? products
            : products.filter(p => p.categories?.name === percentTarget);

        const newEdits = { ...editedPrices };
        targetProducts.forEach(p => {
            const current = editedPrices[p.id] !== undefined ? parseFloat(editedPrices[p.id]) : p.price;
            const newPrice = Math.round(current * (1 + pct / 100) * 100) / 100;
            newEdits[p.id] = newPrice;
        });

        setEditedPrices(newEdits);
        setShowPercent(false);
        setPercentValue('');
    };

    // --- CSV Import ---
    const handleCsvFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const header = lines[0].toLowerCase();

            // Detect separator
            const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ',';
            const rows = lines.slice(1).map(l => {
                const parts = l.split(sep);
                return { sku: (parts[0] || '').trim(), price: parseFloat((parts[1] || '').replace(/[$,]/g, '').trim()) };
            }).filter(r => r.sku && !isNaN(r.price));

            setCsvPreview(rows);
            setCsvData(rows);
            setShowCsvModal(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleApplyCsv = () => {
        if (!csvData) return;
        const newEdits = { ...editedPrices };
        let matched = 0;
        csvData.forEach(row => {
            const product = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
            if (product) {
                newEdits[product.id] = row.price;
                matched++;
            }
        });
        setEditedPrices(newEdits);
        setShowCsvModal(false);
        setCsvData(null);
        setCsvPreview([]);
        alert(`Se actualizaron ${matched} de ${csvData.length} productos del CSV.`);
    };

    // --- Export CSV ---
    const handleExportCsv = () => {
        const header = 'SKU,Nombre,Precio Actual\n';
        const rows = products.map(p => `${p.sku || ''},${p.name},${p.price}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'precios_greenland.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Sorting ---
    const handleSort = (field) => {
        if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortDir('asc'); }
    };

    // --- Filter & Sort ---
    const filteredProducts = products
        .filter(p => {
            const s = searchTerm.toLowerCase();
            const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s);
            const matchCat = selectedCategory === 'all' || p.categories?.name === selectedCategory;
            return matchSearch && matchCat;
        })
        .sort((a, b) => {
            let va, vb;
            if (sortBy === 'name') { va = a.name; vb = b.name; }
            else if (sortBy === 'sku') { va = a.sku || ''; vb = b.sku || ''; }
            else if (sortBy === 'price') { va = a.price; vb = b.price; }
            else { va = a.name; vb = b.name; }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === 'asc' ? va - vb : vb - va;
        });

    const editCount = Object.keys(editedPrices).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
                <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
                <p>Cargando precios...</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Gestión de Precios</h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">
                            Edita precios individuales, aplica ajustes porcentuales o importa desde CSV.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Export */}
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar CSV
                        </button>
                        {/* Import */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-all"
                        >
                            <Upload className="w-3.5 h-3.5" /> Importar CSV
                        </button>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCsvFile} className="hidden" />
                        {/* Percentage */}
                        <button
                            onClick={() => setShowPercent(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-all"
                        >
                            <Percent className="w-3.5 h-3.5" /> Ajuste %
                        </button>
                        {/* Save */}
                        {editCount > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Guardando...' : `Guardar ${editCount} cambio${editCount > 1 ? 's' : ''}`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${selectedCategory === 'all'
                                ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/20'
                                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white cursor-pointer'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${selectedCategory === cat
                                    ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/20'
                                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pending changes banner */}
                {editCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-bold text-amber-700">
                                {editCount} precio{editCount > 1 ? 's' : ''} modificado{editCount > 1 ? 's' : ''} sin guardar
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditedPrices({})}
                                className="px-3 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="px-3 py-1 text-xs font-bold text-white bg-[#6a9a04] rounded-lg cursor-pointer hover:bg-[#6a9a04]/90 border-none disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Todo'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                        <span className="flex items-center gap-1">Producto <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('sku')}>
                                        <span className="flex items-center gap-1">SKU <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Categoría</th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('price')}>
                                        <span className="flex items-center gap-1">Precio Actual <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Nuevo Precio</th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No se encontraron productos.</td></tr>
                                ) : (
                                    filteredProducts.map(product => {
                                        const hasEdit = editedPrices[product.id] !== undefined;
                                        const newPrice = hasEdit ? parseFloat(editedPrices[product.id]) : product.price;
                                        const diff = newPrice - product.price;
                                        const diffPct = product.price > 0 ? ((diff / product.price) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={product.id} className={`transition-colors ${hasEdit ? 'bg-amber-50/50' : 'hover:bg-white/50'}`}>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <Package className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-900">{product.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                                                        {product.categories?.name || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-black ${hasEdit ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                        ${Number(product.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={hasEdit ? editedPrices[product.id] : ''}
                                                            placeholder={product.price.toString()}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || parseFloat(val) === product.price) {
                                                                    setEditedPrices(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                                                } else {
                                                                    setEditedPrices(prev => ({ ...prev, [product.id]: val }));
                                                                }
                                                            }}
                                                            className={`w-32 pl-7 pr-3 py-1.5 text-sm font-bold rounded-lg border outline-none transition-all ${hasEdit
                                                                ? 'border-[#6a9a04] bg-white text-[#6a9a04] ring-2 ring-[#6a9a04]/20'
                                                                : 'border-slate-200 bg-white/50 text-slate-700 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20'
                                                                }`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {hasEdit ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-sm font-black ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff > 0 ? 'bg-green-50 text-green-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                                                                }`}>
                                                                {diff > 0 ? '+' : ''}{diffPct}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500 m-0">
                            {filteredProducts.length} productos · {editCount} modificados
                        </p>
                    </div>
                </div>

                {/* Price History Section */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden mt-6">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-white/30 transition-colors"
                    >
                        <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2 text-sm">
                            <History className="w-4 h-4 text-[#6a9a04]" /> Historial de Cambios de Precio
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{priceHistory.length}</span>
                        </h4>
                        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {showHistory && (
                        <div className="border-t border-slate-200">
                            {priceHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Precio Anterior</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">→</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Precio Nuevo</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cambio</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {priceHistory.map(h => {
                                                const product = products.find(p => p.id === h.product_id);
                                                const diff = (h.new_price || 0) - (h.old_price || 0);
                                                const pct = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '—';
                                                return (
                                                    <tr key={h.id} className="hover:bg-white/50 transition-colors">
                                                        <td className="px-5 py-2.5">
                                                            <span className="font-bold text-sm text-slate-900">{product?.name || 'Producto eliminado'}</span>
                                                            <span className="text-[10px] text-slate-400 ml-2 font-mono">{product?.sku || ''}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-500">
                                                            ${Number(h.old_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center text-slate-300">→</td>
                                                        <td className="px-3 py-2.5 text-sm font-black text-slate-900">
                                                            ${Number(h.new_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-green-50 text-green-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                                                                }`}>
                                                                {diff > 0 ? '+' : ''}{pct}%
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-[11px] text-slate-400">
                                                            {new Date(h.changed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-slate-400">
                                    No hay cambios de precios registrados aún. Los cambios se registrarán automáticamente al guardar.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Percentage Modal */}
            {showPercent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-[420px] rounded-2xl shadow-2xl border border-white overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                                <Percent className="w-5 h-5 text-purple-600" /> Ajuste Porcentual
                            </h3>
                            <button onClick={() => setShowPercent(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Aplicar a</label>
                                <select
                                    value={percentTarget}
                                    onChange={(e) => setPercentTarget(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 text-slate-800 outline-none shadow-sm"
                                >
                                    <option value="all">Todos los productos</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Porcentaje</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={percentValue}
                                        onChange={(e) => setPercentValue(e.target.value)}
                                        placeholder="Ej. 10 para +10%, -5 para -5%"
                                        autoFocus
                                        className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 text-slate-800 outline-none text-lg shadow-sm"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                </div>
                                <small className="block mt-1 text-xs text-slate-400">
                                    Positivo para subir, negativo para bajar. Los cambios se aplican a la columna "Nuevo Precio" sin guardar.
                                </small>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowPercent(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                >Cancelar</button>
                                <button onClick={handleApplyPercent} disabled={!percentValue}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/30 cursor-pointer transition-all border-none disabled:opacity-50"
                                >
                                    Aplicar Ajuste
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Preview Modal */}
            {showCsvModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-[550px] rounded-2xl shadow-2xl border border-white overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Previsualización CSV
                            </h3>
                            <button onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                                className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Se encontraron <strong>{csvPreview.length}</strong> filas. Los SKUs que coincidan con productos existentes se actualizarán.
                            </p>
                            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 sticky top-0">
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">SKU</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Nuevo Precio</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Match</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {csvPreview.slice(0, 50).map((row, i) => {
                                            const match = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
                                            return (
                                                <tr key={i} className={match ? '' : 'bg-red-50/50'}>
                                                    <td className="px-4 py-2 font-mono text-xs">{row.sku}</td>
                                                    <td className="px-4 py-2 font-bold text-[#6a9a04]">${row.price.toFixed(2)}</td>
                                                    <td className="px-4 py-2">
                                                        {match ? (
                                                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> {match.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-red-400">No encontrado</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                >Cancelar</button>
                                <button onClick={handleApplyCsv}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 cursor-pointer transition-all border-none flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Aplicar Precios del CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
