'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, FileSpreadsheet, Save, Send, Package, ShieldCheck,
    CheckCircle, AlertTriangle, Search, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const DESTINATIONS = [
    { code: 'SLW', city: 'Saltillo', port: 'MANZANILLO' },
    { code: 'TL', city: 'Tlalnepantla', port: 'LÁZARO CÁRDENAS' },
    { code: 'MRO', city: 'Morelia', port: 'LÁZARO CÁRDENAS' },
    { code: 'QRO', city: 'Querétaro', port: 'LÁZARO CÁRDENAS' },
    { code: 'ALT', city: 'Altamira', port: 'ALTAMIRA' },
];

export default function NuevoPedidoPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [products, setProducts] = useState([]);
    const [skuMapping, setSkuMapping] = useState([]);
    const [destination, setDestination] = useState(DESTINATIONS[0]);
    const [quantities, setQuantities] = useState({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [notes, setNotes] = useState('');

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

        if (suppRes.data?.length > 0) {
            setSelectedSupplier(suppRes.data[0]);
        }
        setLoading(false);
    };

    // Products filtered by selected supplier
    const supplierProducts = useMemo(() => {
        if (!selectedSupplier) return [];
        const mappedProductIds = skuMapping
            .filter(m => m.supplier_id === selectedSupplier.id)
            .map(m => m.product_id);
        return products.filter(p => mappedProductIds.includes(p.id));
    }, [selectedSupplier, products, skuMapping]);

    // Filtered by search
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return supplierProducts;
        const term = searchTerm.toLowerCase();
        return supplierProducts.filter(p =>
            p.sku?.toLowerCase().includes(term) || p.name?.toLowerCase().includes(term)
        );
    }, [supplierProducts, searchTerm]);

    const getSupplierSku = (productId) => {
        if (!selectedSupplier) return '—';
        const mapping = skuMapping.find(m => m.product_id === productId && m.supplier_id === selectedSupplier.id);
        return mapping?.supplier_sku || '—';
    };

    const handleQtyChange = (productId, value) => {
        const qty = parseInt(value) || 0;
        setQuantities(prev => ({ ...prev, [productId]: qty }));
    };

    const itemsWithQty = useMemo(() => {
        return supplierProducts.filter(p => (quantities[p.id] || 0) > 0);
    }, [supplierProducts, quantities]);

    const totalUnits = useMemo(() => {
        return itemsWithQty.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);
    }, [itemsWithQty, quantities]);

    // Generate PO number
    const generatePoNumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `PO-${year}${month}${day}-${rand}`;
    };

    // Save as draft
    const saveDraft = async () => {
        if (itemsWithQty.length === 0) { showToast('Agrega cantidades a al menos un producto', 'error'); return; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const poNumber = generatePoNumber();

        const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
            po_number: poNumber,
            supplier_id: selectedSupplier.id,
            status: 'draft',
            destination_code: destination.code,
            destination_port: destination.port,
            notes: notes || null,
            created_by: user.id,
        }).select().single();

        if (poErr) { showToast('Error: ' + poErr.message, 'error'); setSaving(false); return; }

        const items = itemsWithQty.map(p => ({
            purchase_order_id: po.id,
            product_id: p.id,
            supplier_sku: getSupplierSku(p.id),
            quantity: quantities[p.id],
        }));

        const { error: itemErr } = await supabase.from('purchase_order_items').insert(items);
        if (itemErr) { showToast('Error en items: ' + itemErr.message, 'error'); }
        else { showToast(`Orden ${poNumber} guardada como borrador`); }
        setSaving(false);
    };

    // Export to Excel
    const exportExcel = () => {
        if (itemsWithQty.length === 0) { showToast('Agrega cantidades a al menos un producto', 'error'); return; }

        const poNumber = generatePoNumber();
        const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

        // Build worksheet data
        const wsData = [];

        // Header section
        wsData.push(['GREENLAND PRODUCTS']);
        wsData.push(['ORDEN DE COMPRA / PURCHASE ORDER']);
        wsData.push([]);
        wsData.push(['No. Orden:', poNumber, '', 'Fecha:', today]);
        wsData.push([]);
        wsData.push(['PROVEEDOR / SUPPLIER:']);
        wsData.push([selectedSupplier.name]);
        wsData.push([]);
        wsData.push(['DESTINO / DESTINATION:', destination.city + ' (' + destination.code + ')']);
        wsData.push(['PUERTO DESTINO / DESTINATION PORT:', destination.port]);
        wsData.push([]);

        // Table header
        wsData.push(['PRODUCT', 'GREENLAND SKU', 'QTY', 'DESTINATION', 'DESTINATION PORT']);

        // Items
        itemsWithQty.forEach(p => {
            wsData.push([
                getSupplierSku(p.id),
                p.sku,
                quantities[p.id],
                destination.code,
                destination.port,
            ]);
        });

        // Totals
        wsData.push([]);
        wsData.push(['', 'TOTAL:', totalUnits, '', '']);
        wsData.push([]);
        wsData.push(['NOTAS / NOTES:']);
        wsData.push([notes || '—']);

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Column widths
        ws['!cols'] = [
            { wch: 38 },  // Product
            { wch: 16 },  // GL SKU
            { wch: 10 },  // QTY
            { wch: 16 },  // Destination
            { wch: 22 },  // Port
        ];

        // Merge header cells
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },  // GREENLAND
            { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },  // ORDEN DE COMPRA
            { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },  // PROVEEDOR label
            { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },  // Supplier name
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');

        // Generate filename
        const supplierShort = selectedSupplier.short_name;
        const fileName = `PO_${supplierShort}_${destination.code}_${poNumber}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showToast(`Excel exportado: ${fileName}`);
    };

    // Save AND export
    const saveAndExport = async () => {
        await saveDraft();
        exportExcel();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
            <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            <p>Cargando...</p>
        </div>
    );

    return (
        <div className="relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl backdrop-blur-md border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                        toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
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
                        <p className="text-slate-500 mt-1 font-medium m-0">Crea una orden de compra y exporta como Excel profesional</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={saveDraft} disabled={saving || itemsWithQty.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <Save size={16} /> Guardar Borrador
                        </button>
                        <button onClick={exportExcel} disabled={itemsWithQty.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#6a9a04]/30 bg-white text-[#6a9a04] font-bold text-sm hover:bg-[#6a9a04]/5 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <FileSpreadsheet size={16} /> Exportar Excel
                        </button>
                        <button onClick={saveAndExport} disabled={saving || itemsWithQty.length === 0}
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
                                <button key={s.id} onClick={() => { setSelectedSupplier(s); setQuantities({}); }}
                                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border-none cursor-pointer ${selectedSupplier?.id === s.id
                                            ? 'bg-[#6a9a04] text-white shadow-md'
                                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                                        }`}>
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
                            {DESTINATIONS.map(d => (
                                <option key={d.code} value={d.code}>{d.city} ({d.code})</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-2 m-0">Puerto: <strong className="text-[#6a9a04]">{destination.port}</strong></p>
                    </div>

                    {/* Summary */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Resumen</label>
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-2xl font-black text-slate-900 m-0">{itemsWithQty.length}</p>
                                <p className="text-[11px] text-slate-400 m-0">productos</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-[#6a9a04] m-0">{totalUnits.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-400 m-0">unidades total</p>
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

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por SKU o nombre..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none w-72 shadow-sm" />
                </div>

                {/* Products Table */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">GL SKU</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Descripción</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">SKU Fabricante</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 w-[140px]">Cantidad a Pedir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(product => {
                                    const supplierSku = getSupplierSku(product.id);
                                    const qty = quantities[product.id] || 0;
                                    return (
                                        <tr key={product.id} className={`hover:bg-white/50 transition-colors ${qty > 0 ? 'bg-[#6a9a04]/5' : ''}`}>
                                            <td className="px-5 py-3 font-mono text-[12px] font-black text-[#6a9a04]">{product.sku}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{product.name}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-500">{supplierSku}</td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={qty || ''}
                                                    onChange={e => handleQtyChange(product.id, e.target.value)}
                                                    placeholder="0"
                                                    className={`w-24 px-3 py-2 border rounded-xl text-center text-sm outline-none transition-all shadow-sm ${qty > 0
                                                            ? 'border-[#6a9a04]/40 bg-[#6a9a04]/5 text-[#6a9a04] font-black focus:ring-2 focus:ring-[#6a9a04]/20'
                                                            : 'border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-slate-200'
                                                        }`}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500 m-0">
                            {filteredProducts.length} productos de {selectedSupplier?.short_name}
                        </p>
                        {totalUnits > 0 && (
                            <p className="text-sm font-black text-[#6a9a04] m-0">
                                Total: {totalUnits.toLocaleString()} unidades en {itemsWithQty.length} productos
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
