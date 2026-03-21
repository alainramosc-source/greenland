'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, FileSpreadsheet, Save, Send, Package, Plus, Trash2,
    CheckCircle, AlertTriangle, Search, Loader2, Container, ChevronDown, ChevronUp
} from 'lucide-react';
import ExcelJS from 'exceljs';

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
        email: 'jacqueline@foldingtable.cn',
    },
    'Freeman': {
        address: 'Building 2, Xiaohe Science Park, No.24, Daxin East Road, Daojiao Town, Dongguan, Guangdong, China. 523181',
        attn: 'Patrick Huang',
        email: 'patrick.huang@tent-tent.com',
    },
};

const BUYER_INFO = {
    name: 'GREENLAND PRODUCTS S.A. DE C.V.',
    address: 'BLVD. VITO ALESSIO ROBLES No. EXT. 3550, No. INT. 9, COL. NAZARIO S. ORTIZ GARZA, C.P. 25100, SALTILLO, COAHUILA DE ZARAGOZA, MÉXICO.',
    taxId: 'GPR230911971',
};

const LEAD_TIMES = {
    'Shinaier': { weeks: 12 },  // 8 prod + 5 transit - Shinaier is 12 actually 
    'Freeman': { weeks: 9 },    // 4 prod + 5 transit
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
    const [allWarehouses, setAllWarehouses] = useState([]);

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
        const [suppRes, prodRes, mapRes, whRes] = await Promise.all([
            supabase.from('suppliers').select('*').eq('is_active', true).order('short_name'),
            supabase.from('products').select('id, name, sku, container_capacity').eq('is_active', true).order('sku'),
            supabase.from('supplier_sku_mapping').select('*'),
            supabase.from('warehouses').select('id, name').eq('is_active', true),
        ]);
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data || []);
        setSkuMapping(mapRes.data || []);
        setAllWarehouses(whRes.data || []);
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

    // Map destination to warehouse_id
    const getWarehouseForDestination = (destCode) => {
        const DEST_WAREHOUSE_MAP = {
            'SLW': ['Bodega Vito Alessio', 'Bodega Echeverría'],
            'TL': ['Tlalnepantla'],
            'MRO': ['Morelia'],
            'QRO': ['Querétaro'],
            'ALT': ['Altamira'],
        };
        const names = DEST_WAREHOUSE_MAP[destCode] || [];
        const wh = allWarehouses.find(w => names.some(n => w.name?.includes(n)));
        return wh?.id || allWarehouses[0]?.id;
    };

    // Container operations
    const addContainer = () => {
        setContainers(prev => [...prev, {
            id: nextContainerId,
            name: `Container ${nextContainerId}`,
            collapsed: false,
            departure_date: '',
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

    const updateContainerDeparture = (containerId, departure_date) => {
        setContainers(prev => prev.map(c => c.id === containerId ? { ...c, departure_date } : c));
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

    // Save draft — returns poNumber on success
    const saveDraft = async (poNumberOverride) => {
        if (allItems.length === 0) { showToast('Agrega productos a al menos un contenedor', 'error'); return null; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const poNumber = poNumberOverride || generatePoNumber();
        const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
            po_number: poNumber, supplier_id: selectedSupplier.id, status: 'draft',
            destination_code: destination.code, destination_port: destination.port,
            notes: notes || null, created_by: user.id,
        }).select().single();
        if (poErr) { showToast('Error: ' + poErr.message, 'error'); setSaving(false); return null; }
        const items = allItems.map(i => ({
            purchase_order_id: po.id, product_id: i.productId,
            supplier_sku: getSupplierSku(i.productId), quantity: i.quantity,
        }));
        const { error: itemErr } = await supabase.from('purchase_order_items').insert(items);
        if (itemErr) { showToast('Error: ' + itemErr.message, 'error'); }
        else {
            // Auto-create transit_shipments for coverage system
            const leadTimeConfig = LEAD_TIMES[selectedSupplier.short_name];
            const leadWeeks = leadTimeConfig?.weeks || 9;
            const arrivalDate = new Date();
            arrivalDate.setDate(arrivalDate.getDate() + (leadWeeks * 7));
            const arrivalStr = arrivalDate.toISOString().split('T')[0];
            const warehouseId = getWarehouseForDestination(destination.code);

            // Aggregate quantities per product across all containers
            const productQtys = {};
            allItems.forEach(i => {
                productQtys[i.productId] = (productQtys[i.productId] || 0) + i.quantity;
            });

            const transitEntries = Object.entries(productQtys).map(([productId, qty]) => ({
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: qty,
                estimated_arrival: arrivalStr,
                origin: selectedSupplier.short_name,
                status: 'in_transit',
                created_by: user.id,
            }));

            const { error: transitErr } = await supabase.from('transit_shipments').insert(transitEntries);
            if (transitErr) console.error('Transit auto-create error:', transitErr);

            showToast(`Orden ${poNumber} guardada · ${transitEntries.length} tránsitos creados automáticamente`);
        }
        setSaving(false);
        return poNumber;
    };

    // Export Excel — accepts poNumber, returns { buffer, fileName } or downloads directly
    const exportExcel = async (poNumberOverride) => {
        if (allItems.length === 0) { showToast('Agrega productos a al menos un contenedor', 'error'); return null; }
        const poNumber = poNumberOverride || generatePoNumber();
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const supplierInfo = SUPPLIER_INFO[selectedSupplier.short_name] || {};
        const activeContainers = containers.filter(c => c.items.some(i => i.quantity > 0));

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Purchase Order');

        // Column widths
        ws.columns = [
            { width: 42 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 24 },
        ];

        const boldFont = { bold: true, size: 11 };
        const titleFont = { bold: true, size: 16 };
        const labelFont = { bold: true, size: 11, color: { argb: 'FF333333' } };

        // --- Header ---
        const r1 = ws.addRow(['PURCHASE ORDER']);
        r1.font = titleFont;
        ws.mergeCells(r1.number, 1, r1.number, 5);
        ws.addRow([]);

        const r3 = ws.addRow(['PO Number:', poNumber, '', 'Date:', today]);
        r3.getCell(1).font = boldFont;
        r3.getCell(4).font = boldFont;
        ws.addRow([]);

        // --- Buyer ---
        const rb1 = ws.addRow(['BUYER:']);
        rb1.font = labelFont;
        ws.mergeCells(rb1.number, 1, rb1.number, 5);
        const rb2 = ws.addRow([BUYER_INFO.name]);
        rb2.font = boldFont;
        ws.mergeCells(rb2.number, 1, rb2.number, 5);
        const rb3 = ws.addRow([BUYER_INFO.address]);
        ws.mergeCells(rb3.number, 1, rb3.number, 5);
        const rb4 = ws.addRow(['Tax ID: ' + BUYER_INFO.taxId]);
        ws.mergeCells(rb4.number, 1, rb4.number, 5);
        ws.addRow([]);

        // --- Supplier ---
        const rs1 = ws.addRow(['SUPPLIER:']);
        rs1.font = labelFont;
        ws.mergeCells(rs1.number, 1, rs1.number, 5);
        const rs2 = ws.addRow([selectedSupplier.name]);
        rs2.font = boldFont;
        ws.mergeCells(rs2.number, 1, rs2.number, 5);
        const rs3 = ws.addRow([supplierInfo.address || '']);
        ws.mergeCells(rs3.number, 1, rs3.number, 5);
        const rs4 = ws.addRow(['Attn: ' + (supplierInfo.attn || '')]);
        ws.mergeCells(rs4.number, 1, rs4.number, 5);
        ws.addRow([]);

        // --- Destination ---
        const rd1 = ws.addRow(['DESTINATION:', destination.city + ' (' + destination.code + ')']);
        rd1.getCell(1).font = boldFont;
        const rd2 = ws.addRow(['DESTINATION PORT:', destination.port]);
        rd2.getCell(1).font = boldFont;
        ws.addRow([]);

        // --- Table Header ---
        const headerRow = ws.addRow(['PRODUCT', 'GREENLAND SKU', 'QTY', 'DESTINATION', 'DESTINATION PORT']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium' }, bottom: { style: 'medium' },
                left: { style: 'medium' }, right: { style: 'medium' },
            };
        });

        // --- Container groups ---
        const thickBorder = { style: 'medium', color: { argb: 'FF000000' } };
        const thinBorder = { style: 'thin', color: { argb: 'FFB0B0B0' } };

        activeContainers.forEach(container => {
            const itemsWithQty = container.items.filter(i => i.quantity > 0);
            if (itemsWithQty.length === 0) return;

            const startRowNum = ws.rowCount + 1;

            // Container label row
            const labelRow = ws.addRow([container.name]);
            ws.mergeCells(labelRow.number, 1, labelRow.number, 5);
            labelRow.getCell(1).font = { bold: true, size: 10, italic: true, color: { argb: 'FF1a365d' } };
            labelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

            // Departure date row (prominent, separate)
            if (container.departure_date) {
                const depRow = ws.addRow([`DEPARTURE DATE: ${container.departure_date}`]);
                ws.mergeCells(depRow.number, 1, depRow.number, 5);
                depRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF92400E' } };
                depRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
            }

            itemsWithQty.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                const row = ws.addRow([
                    getSupplierSku(item.productId),
                    product.sku,
                    item.quantity,
                    destination.code,
                    destination.port,
                ]);
                row.getCell(3).alignment = { horizontal: 'center' };
                row.getCell(3).font = { bold: true };
                row.getCell(4).alignment = { horizontal: 'center' };
                row.getCell(5).alignment = { horizontal: 'center' };
            });

            const endRowNum = ws.rowCount;

            // Apply thick borders around the container group
            for (let r = startRowNum; r <= endRowNum; r++) {
                const row = ws.getRow(r);
                for (let c = 1; c <= 5; c++) {
                    const cell = row.getCell(c);
                    const border = {};
                    border.top = (r === startRowNum) ? thickBorder : thinBorder;
                    border.bottom = (r === endRowNum) ? thickBorder : thinBorder;
                    border.left = (c === 1) ? thickBorder : thinBorder;
                    border.right = (c === 5) ? thickBorder : thinBorder;
                    cell.border = border;
                }
            }
        });

        // --- Totals ---
        ws.addRow([]);
        const totalRow = ws.addRow(['', 'TOTAL:', totalUnits, '', '']);
        totalRow.getCell(2).font = { bold: true, size: 12 };
        totalRow.getCell(3).font = { bold: true, size: 12 };
        totalRow.getCell(3).alignment = { horizontal: 'center' };
        const contRow = ws.addRow([`${activeContainers.length} container(s)`]);
        contRow.font = { italic: true, color: { argb: 'FF666666' } };

        if (notes) {
            ws.addRow([]);
            const notesLabel = ws.addRow(['NOTES:']);
            notesLabel.font = boldFont;
            ws.addRow([notes]);
        }

        // Generate and download
        const fileName = `PO_${selectedSupplier.short_name}_${destination.code}_${poNumber}.xlsx`;
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Excel exportado: ${fileName}`);
        return { buffer, fileName };
    };

    const saveAndExport = async () => {
        const poNumber = generatePoNumber();
        const saved = await saveDraft(poNumber);
        if (!saved) return;
        const result = await exportExcel(poNumber);
        // Attach Excel to email
        if (result?.buffer) {
            try {
                const supplierInfo = SUPPLIER_INFO[selectedSupplier.short_name] || {};
                const poItems = allItems.map(i => {
                    const p = products.find(pr => pr.id === i.productId);
                    return { sku: p?.sku || '—', supplierSku: getSupplierSku(i.productId), quantity: i.quantity };
                });
                // Convert buffer to base64
                const uint8 = new Uint8Array(result.buffer);
                let binary = '';
                uint8.forEach(b => binary += String.fromCharCode(b));
                const excelBase64 = btoa(binary);
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'purchase_order',
                        orderNumber: poNumber,
                        supplierName: selectedSupplier.short_name,
                        supplierEmail: supplierInfo.email || null,
                        destinationCity: destination.city,
                        destinationPort: destination.port,
                        poItems,
                        totalQty: totalUnits,
                        excelBase64,
                        excelFileName: result.fileName,
                    }),
                });
            } catch (emailErr) { console.error('PO email error:', emailErr); }
        }
    };

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
                    // Calculate container fill percentage
                    const containerFillFraction = container.items.reduce((sum, item) => {
                        const product = products.find(p => p.id === item.productId);
                        const cap = product?.container_capacity || 0;
                        return sum + (cap > 0 ? (item.quantity || 0) / cap : 0);
                    }, 0);
                    const fillPct = Math.round(containerFillFraction * 100);
                    const fillColor = fillPct > 100 ? '#ef4444' : fillPct >= 80 ? '#f59e0b' : '#6a9a04';
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
                                    {/* Fill percentage badge */}
                                    {containerTotal > 0 && (
                                        <span className="px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5"
                                            style={{ backgroundColor: `${fillColor}30`, color: fillColor }}>
                                            📦 {fillPct}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                        <span className="text-[10px] text-white/60 font-bold">DEPARTURE:</span>
                                        <input
                                            type="date"
                                            value={container.departure_date || ''}
                                            onChange={e => updateContainerDeparture(container.id, e.target.value)}
                                            className="bg-white/15 border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeContainer(container.id); }}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 bg-transparent border-none cursor-pointer transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                    {container.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                </div>
                            </div>

                            {!container.collapsed && (
                                <div className="p-4">
                                    {/* Fill bar */}
                                    {containerTotal > 0 && (
                                        <div className="mb-3 bg-slate-100 rounded-full h-3 overflow-hidden relative">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(fillPct, 100)}%`, backgroundColor: fillColor }} />
                                            {fillPct > 100 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-red-700">
                                                    ⚠ Sobrecargado ({fillPct}%)
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">% Contenedor</th>
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
                                                                {(() => {
                                                                    const cap = product.container_capacity || 0;
                                                                    if (cap === 0) return <span className="text-[10px] text-slate-300">—</span>;
                                                                    const pct = Math.round(((item.quantity || 0) / cap) * 100);
                                                                    return (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={`text-[11px] font-black ${pct > 100 ? 'text-red-500' : pct >= 50 ? 'text-orange-500' : 'text-slate-500'}`}>
                                                                                {pct}%
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-400">{(item.quantity || 0).toLocaleString()}/{cap.toLocaleString()}</span>
                                                                        </div>
                                                                    );
                                                                })()}
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
