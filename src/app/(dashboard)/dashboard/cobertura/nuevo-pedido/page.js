'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, FileSpreadsheet, Save, Send, Package, Plus, Trash2,
    CheckCircle, AlertTriangle, Search, Loader2, Container, ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

const DESTINATIONS = [
    { code: 'SLW', city: 'Saltillo', port: 'MANZANILLO' },
    { code: 'TL', city: 'Tlalnepantla', port: 'LÁZARO CÁRDENAS' },
    { code: 'MRO', city: 'Morelia', port: 'LÁZARO CÁRDENAS' },
    { code: 'QRO', city: 'Querétaro', port: 'LÁZARO CÁRDENAS' },
    { code: 'ALT', city: 'Altamira', port: 'ALTAMIRA' },
];

const SUPPLIER_INFO = {
    'Shinaier': {
        address: 'NO.11 LINGANG RD., DAIXI TOWN, WUXING DISTRICT, HUZHOU CITY, ZHEJIANG, 313000 CHINA',
        attn: 'Jacqueline Wang',
    },
    'Freeman': {
        address: 'Building 2, Xiaohe Science Park, No.24, Daxin East Road, Daojiao Town, Dongguan, Guangdong, China. 523181',
        attn: 'Patrick Huang',
    },
};

const BUYER_INFO = {
    name: 'GREENLAND PRODUCTS S.A. DE C.V.',
    address: 'BLVD. VITO ALESSIO ROBLES No. EXT. 3550, No. INT. 9, COL. NAZARIO S. ORTIZ GARZA, C.P. 25100, SALTILLO, COAHUILA DE ZARAGOZA, MÉXICO.',
    taxId: 'GPR230911971',
};

export default function NuevoPedidoPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [products, setProducts] = useState([]);
    const [skuMapping, setSkuMapping] = useState([]);
    const [destination, setDestination] = useState(DESTINATIONS[0]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [notes, setNotes] = useState('');

    // Containers: array of { id, name, collapsed, items: [{ productId, quantity }] }
    const [containers, setContainers] = useState([]);
    const [nextContainerId, setNextContainerId] = useState(1);

    useEffect(() => { fetchData(); }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const [suppRes, prodRes, mapRes] = await Promise.all([
            supabase.from('suppliers').select('*').eq('is_active', true).order('short_name'),
            supabase.from('products').select('id, name, sku').eq('is_active', true).order('sku'),
            supabase.from('supplier_sku_mapping').select('*'),
        ]);
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data || []);
        setSkuMapping(mapRes.data || []);
        if (suppRes.data?.length > 0) setSelectedSupplier(suppRes.data[0]);
        setLoading(false);
    };

    // Products for selected supplier
    const supplierProducts = useMemo(() => {
        if (!selectedSupplier) return [];
        const mappedIds = skuMapping.filter(m => m.supplier_id === selectedSupplier.id).map(m => m.product_id);
        return products.filter(p => mappedIds.includes(p.id));
    }, [selectedSupplier, products, skuMapping]);

    const getSupplierSku = (productId) => {
        if (!selectedSupplier) return '—';
        return skuMapping.find(m => m.product_id === productId && m.supplier_id === selectedSupplier.id)?.supplier_sku || '—';
    };

    // Container operations
    const addContainer = () => {
        setContainers(prev => [...prev, {
            id: nextContainerId,
            name: `Container ${nextContainerId}`,
            collapsed: false,
            items: [],
        }]);
        setNextContainerId(n => n + 1);
    };

    const removeContainer = (containerId) => {
        setContainers(prev => prev.filter(c => c.id !== containerId));
    };

    const toggleCollapse = (containerId) => {
        setContainers(prev => prev.map(c => c.id === containerId ? { ...c, collapsed: !c.collapsed } : c));
    };

    const updateContainerName = (containerId, name) => {
        setContainers(prev => prev.map(c => c.id === containerId ? { ...c, name } : c));
    };

    const addItemToContainer = (containerId, productId) => {
        if (!productId) return;
        setContainers(prev => prev.map(c => {
            if (c.id !== containerId) return c;
            if (c.items.find(i => i.productId === productId)) return c; // already exists
            return { ...c, items: [...c.items, { productId, quantity: 0 }] };
        }));
    };

    const removeItemFromContainer = (containerId, productId) => {
        setContainers(prev => prev.map(c => {
            if (c.id !== containerId) return c;
            return { ...c, items: c.items.filter(i => i.productId !== productId) };
        }));
    };

    const updateItemQty = (containerId, productId, quantity) => {
        setContainers(prev => prev.map(c => {
            if (c.id !== containerId) return c;
            return { ...c, items: c.items.map(i => i.productId === productId ? { ...i, quantity: parseInt(quantity) || 0 } : i) };
        }));
    };

    // Summary
    const allItems = useMemo(() => {
        return containers.flatMap(c => c.items.filter(i => i.quantity > 0));
    }, [containers]);

    const totalUnits = useMemo(() => allItems.reduce((s, i) => s + i.quantity, 0), [allItems]);
    const totalProducts = useMemo(() => new Set(allItems.map(i => i.productId)).size, [allItems]);

    // Products already used in any container
    const usedProductIds = useMemo(() => {
        return new Set(containers.flatMap(c => c.items.map(i => i.productId)));
    }, [containers]);

    // Available products for a container (not yet in that container)
    const getAvailableProducts = (containerId) => {
        const container = containers.find(c => c.id === containerId);
        if (!container) return supplierProducts;
        const usedInThis = new Set(container.items.map(i => i.productId));
        return supplierProducts.filter(p => !usedInThis.has(p.id));
    };

    // Generate PO number
    const generatePoNumber = () => {
        const now = new Date();
        const y = now.getFullYear(), m = (now.getMonth() + 1).toString().padStart(2, '0');
        const d = now.getDate().toString().padStart(2, '0');
        const r = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `PO-${y}${m}${d}-${r}`;
    };

    // Save draft
    const saveDraft = async () => {
        if (allItems.length === 0) { showToast('Agrega productos a al menos un contenedor', 'error'); return; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const poNumber = generatePoNumber();
        const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
            po_number: poNumber, supplier_id: selectedSupplier.id, status: 'draft',
            destination_code: destination.code, destination_port: destination.port,
            notes: notes || null, created_by: user.id,
        }).select().single();
        if (poErr) { showToast('Error: ' + poErr.message, 'error'); setSaving(false); return; }
        const items = allItems.map(i => ({
            purchase_order_id: po.id, product_id: i.productId,
            supplier_sku: getSupplierSku(i.productId), quantity: i.quantity,
        }));
        const { error: itemErr } = await supabase.from('purchase_order_items').insert(items);
        if (itemErr) showToast('Error: ' + itemErr.message, 'error');
        else showToast(`Orden ${poNumber} guardada`);
        setSaving(false);
    };

    // Export Excel with container borders
    const exportExcel = () => {
        if (allItems.length === 0) { showToast('Agrega productos a al menos un contenedor', 'error'); return; }
        const poNumber = generatePoNumber();
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const supplierInfo = SUPPLIER_INFO[selectedSupplier.short_name] || {};

        const wsData = [];
        wsData.push(['PURCHASE ORDER']);                                    // row 0
        wsData.push([]);                                                    // row 1
        wsData.push(['PO Number:', poNumber, '', 'Date:', today]);          // row 2
        wsData.push([]);                                                    // row 3
        wsData.push(['BUYER:']);                                             // row 4
        wsData.push([BUYER_INFO.name]);                                     // row 5
        wsData.push([BUYER_INFO.address]);                                  // row 6
        wsData.push(['Tax ID: ' + BUYER_INFO.taxId]);                       // row 7
        wsData.push([]);                                                    // row 8
        wsData.push(['SUPPLIER:']);                                          // row 9
        wsData.push([selectedSupplier.name]);                               // row 10
        wsData.push([supplierInfo.address || '']);                           // row 11
        wsData.push(['Attn: ' + (supplierInfo.attn || '')]);                // row 12
        wsData.push([]);                                                    // row 13
        wsData.push(['DESTINATION:', destination.city + ' (' + destination.code + ')']); // row 14
        wsData.push(['DESTINATION PORT:', destination.port]);                // row 15
        wsData.push([]);                                                    // row 16

        // Table header
        wsData.push(['PRODUCT', 'GREENLAND SKU', 'QTY', 'DESTINATION', 'DESTINATION PORT']); // row 17

        // Track container row ranges for borders
        const containerRanges = [];

        containers.forEach(container => {
            const itemsWithQty = container.items.filter(i => i.quantity > 0);
            if (itemsWithQty.length === 0) return;

            const startRow = wsData.length;
            itemsWithQty.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                wsData.push([
                    getSupplierSku(item.productId),
                    product.sku,
                    item.quantity,
                    destination.code,
                    destination.port,
                ]);
            });
            const endRow = wsData.length - 1;
            containerRanges.push({ name: container.name, startRow, endRow });
        });

        // Totals
        wsData.push([]);
        wsData.push(['', 'TOTAL:', totalUnits, '', '']);
        wsData.push([`${containers.filter(c => c.items.some(i => i.quantity > 0)).length} container(s)`]);

        if (notes) { wsData.push([]); wsData.push(['NOTES:']); wsData.push([notes]); }

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws['!cols'] = [
            { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 22 },
        ];

        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
            { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
            { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
            { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
            { s: { r: 9, c: 0 }, e: { r: 9, c: 4 } },
            { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } },
            { s: { r: 11, c: 0 }, e: { r: 11, c: 4 } },
            { s: { r: 12, c: 0 }, e: { r: 12, c: 4 } },
        ];

        // Apply thick borders around each container group
        const thinBorder = { style: 'thin', color: { rgb: '999999' } };
        const thickBorder = { style: 'medium', color: { rgb: '000000' } };

        containerRanges.forEach(({ startRow, endRow }) => {
            for (let r = startRow; r <= endRow; r++) {
                for (let c = 0; c < 5; c++) {
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    const border = {};
                    // Top border for first row of container
                    if (r === startRow) border.top = thickBorder;
                    // Bottom border for last row of container
                    if (r === endRow) border.bottom = thickBorder;
                    // Left border for first column
                    if (c === 0) border.left = thickBorder;
                    // Right border for last column
                    if (c === 4) border.right = thickBorder;
                    // Inner borders
                    if (!border.top) border.top = thinBorder;
                    if (!border.bottom) border.bottom = thinBorder;
                    if (!border.left) border.left = thinBorder;
                    if (!border.right) border.right = thinBorder;
                    ws[cellRef].s.border = border;
                }
            }
        });

        XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');
        const fileName = `PO_${selectedSupplier.short_name}_${destination.code}_${poNumber}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast(`Excel exportado: ${fileName}`);
    };

    const saveAndExport = async () => { await saveDraft(); exportExcel(); };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
            <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            <p>Cargando...</p>
        </div>
    );

    return (
        <div className="relative">
            {toast && (
                <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl backdrop-blur-md border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <button onClick={() => router.push('/dashboard/cobertura')}
                            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#6a9a04] transition-colors mb-2 bg-transparent border-none cursor-pointer p-0">
                            <ArrowLeft size={16} /> Volver a Cobertura
                        </button>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-2">
                            <FileSpreadsheet className="w-7 h-7 text-[#6a9a04]" /> Nuevo Pedido a Fabricante
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">Agrupa productos por contenedor y exporta tu orden de compra</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={saveDraft} disabled={saving || allItems.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <Save size={16} /> Guardar Borrador
                        </button>
                        <button onClick={exportExcel} disabled={allItems.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#6a9a04]/30 bg-white text-[#6a9a04] font-bold text-sm hover:bg-[#6a9a04]/5 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <FileSpreadsheet size={16} /> Exportar Excel
                        </button>
                        <button onClick={saveAndExport} disabled={saving || allItems.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#6a9a04]/90 cursor-pointer transition-all shadow-lg shadow-[#6a9a04]/20 border-none disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Guardar y Exportar
                        </button>
                    </div>
                </div>

                {/* Config Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Supplier */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Proveedor</label>
                        <div className="flex gap-2">
                            {suppliers.map(s => (
                                <button key={s.id} onClick={() => { setSelectedSupplier(s); setContainers([]); setNextContainerId(1); }}
                                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${selectedSupplier?.id === s.id
                                            ? 'bg-[#6a9a04] text-white shadow-md border-none'
                                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                                    {s.short_name}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 m-0">{selectedSupplier?.name}</p>
                    </div>

                    {/* Destination */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Destino</label>
                        <select value={destination.code}
                            onChange={e => setDestination(DESTINATIONS.find(d => d.code === e.target.value))}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm text-slate-800 outline-none shadow-sm font-bold">
                            {DESTINATIONS.map(d => (<option key={d.code} value={d.code}>{d.city} ({d.code})</option>))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-2 m-0">Puerto: <strong className="text-[#6a9a04]">{destination.port}</strong></p>
                    </div>

                    {/* Summary */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Resumen</label>
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-2xl font-black text-slate-900 m-0">{containers.length}</p>
                                <p className="text-[11px] text-slate-400 m-0">contenedores</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 m-0">{totalProducts}</p>
                                <p className="text-[11px] text-slate-400 m-0">productos</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-[#6a9a04] m-0">{totalUnits.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-400 m-0">unidades</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-xl px-4 py-3 mb-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-3">Notas:</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Notas opcionales para esta orden..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 w-full mt-1 placeholder:text-slate-300" />
                </div>

                {/* Add Container Button */}
                <button onClick={addContainer}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-[#6a9a04]/30 text-[#6a9a04] font-bold text-sm hover:bg-[#6a9a04]/5 hover:border-[#6a9a04]/50 cursor-pointer transition-all w-full justify-center mb-5 bg-transparent">
                    <Plus size={18} /> Agregar Contenedor
                </button>

                {/* Containers */}
                {containers.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No has agregado contenedores aún</p>
                        <p className="text-xs">Cada contenedor representa un envío marítimo de 40 pies</p>
                    </div>
                )}

                {containers.map((container, idx) => {
                    const containerTotal = container.items.reduce((s, i) => s + (i.quantity || 0), 0);
                    return (
                        <div key={container.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden mb-4">
                            {/* Container Header */}
                            <div className="flex items-center justify-between px-5 py-4 bg-slate-800 text-white cursor-pointer"
                                onClick={() => toggleCollapse(container.id)}>
                                <div className="flex items-center gap-3">
                                    <Package size={18} className="text-[#dee24b]" />
                                    <input
                                        type="text"
                                        value={container.name}
                                        onChange={e => updateContainerName(container.id, e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="bg-transparent border-none outline-none text-white font-black text-sm w-48 placeholder:text-white/50"
                                        placeholder="Nombre del contenedor"
                                    />
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[11px] font-bold">
                                        {container.items.length} productos · {containerTotal.toLocaleString()} uds
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); removeContainer(container.id); }}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 bg-transparent border-none cursor-pointer transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                    {container.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                </div>
                            </div>

                            {!container.collapsed && (
                                <div className="p-4">
                                    {/* Add Product to Container */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <select
                                            onChange={e => { addItemToContainer(container.id, e.target.value); e.target.value = ''; }}
                                            defaultValue=""
                                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm">
                                            <option value="" disabled>+ Agregar producto...</option>
                                            {getAvailableProducts(container.id).map(p => (
                                                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Items Table */}
                                    {container.items.length > 0 && (
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">GL SKU</th>
                                                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Descripción</th>
                                                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 w-40">SKU Fabricante</th>
                                                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Cantidad</th>
                                                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {container.items.map(item => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    if (!product) return null;
                                                    return (
                                                        <tr key={item.productId} className={`hover:bg-white/50 transition-colors ${item.quantity > 0 ? 'bg-[#6a9a04]/5' : ''}`}>
                                                            <td className="px-3 py-2 font-mono text-[11px] font-black text-[#6a9a04]">{product.sku}</td>
                                                            <td className="px-3 py-2 text-xs text-slate-700">{product.name}</td>
                                                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{getSupplierSku(item.productId)}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <input type="number" min="0" value={item.quantity || ''}
                                                                    onChange={e => updateItemQty(container.id, item.productId, e.target.value)}
                                                                    placeholder="0"
                                                                    className={`w-24 px-3 py-1.5 border rounded-xl text-center text-sm outline-none transition-all shadow-sm ${item.quantity > 0
                                                                            ? 'border-[#6a9a04]/40 bg-[#6a9a04]/5 text-[#6a9a04] font-black'
                                                                            : 'border-slate-200 bg-white text-slate-700'}`} />
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <button onClick={() => removeItemFromContainer(container.id, item.productId)}
                                                                    className="p-1 rounded-lg text-red-400 hover:bg-red-50 bg-transparent border-none cursor-pointer transition-all">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}

                                    {container.items.length === 0 && (
                                        <p className="text-center text-xs text-slate-400 py-6 m-0">Selecciona productos del dropdown para agregarlos a este contenedor</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
