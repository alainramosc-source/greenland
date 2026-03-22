'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, FileSpreadsheet, Clock, CheckCircle, Send, Package,
    AlertTriangle, ChevronDown, ChevronUp, Truck, Eye, History, Save, Loader2, Trash2, Plus
} from 'lucide-react';
import ExcelJS from 'exceljs';

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

const STATUS_CONFIG = {
    draft: { label: 'Borrador', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', next: 'sent' },
    sent: { label: 'Enviado', icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', next: 'received' },
    received: { label: 'Recibido', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', next: null },
    cancelled: { label: 'Cancelado', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', next: null },
};

const NEXT_STATUS_LABEL = {
    draft: 'Marcar como Enviado',
    sent: 'Marcar como Recibido',
};

export default function HistorialPedidosPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState({});
    const [products, setProducts] = useState([]);
    const [toast, setToast] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [editedQtys, setEditedQtys] = useState({});
    const [savingItems, setSavingItems] = useState(false);
    const [skuMapping, setSkuMapping] = useState([]);
    const [addingProduct, setAddingProduct] = useState(null);
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => { fetchOrders(); }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchOrders = async () => {
        setLoading(true);
        const [ordersRes, suppRes, prodRes, mapRes, whRes] = await Promise.all([
            supabase.from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase.from('suppliers').select('*'),
            supabase.from('products').select('id, name, sku').eq('is_active', true),
            supabase.from('supplier_sku_mapping').select('*'),
            supabase.from('warehouses').select('id, name').eq('is_active', true),
        ]);
        setOrders(ordersRes.data || []);
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data || []);
        setSkuMapping(mapRes.data || []);
        setWarehouses(whRes.data || []);
        setLoading(false);
    };

    const getSupplier = (supplierId) => suppliers.find(s => s.id === supplierId);

    const toggleExpand = async (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
            return;
        }
        setExpandedOrder(orderId);
        if (!orderItems[orderId]) {
            const { data } = await supabase.from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', orderId);
            setOrderItems(prev => ({ ...prev, [orderId]: data || [] }));
        }
    };

    const changeStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('purchase_orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        showToast(`Orden actualizada a: ${STATUS_CONFIG[newStatus].label}`);
    };

    // Delete cancelled order completely
    const deleteOrder = async (order) => {
        if (!window.confirm(`¿Eliminar ${order.po_number} permanentemente?\n\nEsto borrará el pedido, sus items y tránsitos asociados.`)) return;
        const supplier = getSupplier(order.supplier_id);
        // Delete transit shipments for each item
        const items = orderItems[order.id] || [];
        for (const item of items) {
            await supabase.from('transit_shipments').delete()
                .eq('product_id', item.product_id)
                .eq('origin', supplier?.short_name || '');
        }
        // Delete PO items (cascade should handle, but explicit)
        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
        // Delete PO
        const { error } = await supabase.from('purchase_orders').delete().eq('id', order.id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        setOrders(prev => prev.filter(o => o.id !== order.id));
        setExpandedOrder(null);
        showToast(`${order.po_number} eliminada permanentemente`);
    };

    // Edit quantity in expanded order
    const handleQtyEdit = (orderId, itemId, newQty) => {
        setEditedQtys(prev => ({
            ...prev,
            [orderId]: { ...(prev[orderId] || {}), [itemId]: parseInt(newQty) || 0 },
        }));
    };

    const hasEdits = (orderId) => {
        const edits = editedQtys[orderId];
        if (!edits) return false;
        const items = orderItems[orderId] || [];
        return Object.entries(edits).some(([itemId, qty]) => {
            const original = items.find(i => i.id === itemId);
            return original && original.quantity !== qty;
        });
    };

    const saveQtyEdits = async (order) => {
        const edits = editedQtys[order.id];
        if (!edits) return;
        setSavingItems(true);
        const items = orderItems[order.id] || [];
        let errors = 0;
        for (const [itemId, newQty] of Object.entries(edits)) {
            const item = items.find(i => i.id === itemId);
            if (!item || item.quantity === newQty) continue;
            // Update PO item
            const { error } = await supabase.from('purchase_order_items')
                .update({ quantity: newQty }).eq('id', itemId);
            if (error) { errors++; continue; }
            // Update matching transit_shipment
            const supplier = getSupplier(order.supplier_id);
            const { data: transits } = await supabase.from('transit_shipments')
                .select('id, quantity')
                .eq('product_id', item.product_id)
                .eq('origin', supplier?.short_name || '')
                .order('created_at', { ascending: false })
                .limit(1);
            if (transits && transits.length > 0) {
                await supabase.from('transit_shipments')
                    .update({ quantity: newQty }).eq('id', transits[0].id);
            }
        }
        // Refresh items
        const { data: refreshed } = await supabase.from('purchase_order_items')
            .select('*').eq('purchase_order_id', order.id);
        setOrderItems(prev => ({ ...prev, [order.id]: refreshed || [] }));
        setEditedQtys(prev => { const next = { ...prev }; delete next[order.id]; return next; });
        setSavingItems(false);
        showToast(errors > 0 ? `Guardado con ${errors} errores` : 'Cantidades actualizadas + tránsitos sincronizados',
            errors > 0 ? 'error' : 'success');
    };

    // Remove item from order
    const removeItem = async (order, itemId) => {
        const item = (orderItems[order.id] || []).find(i => i.id === itemId);
        if (!item) return;
        const { error } = await supabase.from('purchase_order_items').delete().eq('id', itemId);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        // Remove matching transit
        const supplier = getSupplier(order.supplier_id);
        const { data: transits } = await supabase.from('transit_shipments')
            .select('id').eq('product_id', item.product_id)
            .eq('origin', supplier?.short_name || '')
            .order('created_at', { ascending: false }).limit(1);
        if (transits?.[0]) await supabase.from('transit_shipments').delete().eq('id', transits[0].id);
        // Refresh
        const { data: refreshed } = await supabase.from('purchase_order_items')
            .select('*').eq('purchase_order_id', order.id);
        setOrderItems(prev => ({ ...prev, [order.id]: refreshed || [] }));
        showToast('Producto eliminado');
    };

    // Add item to existing order
    const addItemToOrder = async (order, productId) => {
        const supplier = getSupplier(order.supplier_id);
        const supplierSku = skuMapping.find(m => m.product_id === productId && m.supplier_id === order.supplier_id)?.supplier_sku || '—';
        const { error } = await supabase.from('purchase_order_items').insert({
            purchase_order_id: order.id,
            product_id: productId,
            supplier_sku: supplierSku,
            quantity: 1,
        });
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        // Create transit
        const DEST_WH = { 'SLW': 'Bodega Vito', 'TL': 'Tlalnepantla', 'MRO': 'Morelia', 'QRO': 'Querétaro', 'ALT': 'Altamira' };
        const whName = DEST_WH[order.destination_code] || '';
        const wh = warehouses.find(w => w.name?.includes(whName));
        if (wh) {
            const leadWeeks = (supplier?.short_name === 'Shinaier') ? 12 : 9;
            await supabase.from('transit_shipments').insert({
                product_id: productId,
                warehouse_id: wh.id,
                quantity: 1,
                estimated_arrival: new Date(Date.now() + leadWeeks * 7 * 86400000).toISOString().split('T')[0],
                origin: supplier?.short_name || '',
                status: 'in_transit',
            });
        }
        // Refresh
        const { data: refreshed } = await supabase.from('purchase_order_items')
            .select('*').eq('purchase_order_id', order.id);
        setOrderItems(prev => ({ ...prev, [order.id]: refreshed || [] }));
        setAddingProduct(null);
        showToast('Producto agregado — ajusta la cantidad');
    };

    // Get products not yet in this order
    const getAvailableProducts = (orderId) => {
        const items = orderItems[orderId] || [];
        const usedIds = new Set(items.map(i => i.product_id));
        return products.filter(p => !usedIds.has(p.id));
    };

    // Re-export Excel
    const reExportExcel = async (order) => {
        const items = orderItems[order.id];
        if (!items || items.length === 0) {
            // Fetch items if not loaded
            const { data } = await supabase.from('purchase_order_items')
                .select('*').eq('purchase_order_id', order.id);
            if (!data || data.length === 0) { showToast('No hay items en esta orden', 'error'); return; }
            setOrderItems(prev => ({ ...prev, [order.id]: data }));
            await generateExcel(order, data);
        } else {
            await generateExcel(order, items);
        }
    };

    const generateExcel = async (order, items) => {
        const supplier = getSupplier(order.supplier_id);
        if (!supplier) return;
        const supplierInfo = SUPPLIER_INFO[supplier.short_name] || {};
        const today = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Purchase Order');

        ws.columns = [
            { width: 42 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 24 },
        ];

        const boldFont = { bold: true, size: 11 };
        const titleFont = { bold: true, size: 16 };
        const labelFont = { bold: true, size: 11, color: { argb: 'FF333333' } };

        const r1 = ws.addRow(['PURCHASE ORDER']);
        r1.font = titleFont;
        ws.mergeCells(r1.number, 1, r1.number, 5);
        ws.addRow([]);

        const r3 = ws.addRow(['PO Number:', order.po_number, '', 'Date:', today]);
        r3.getCell(1).font = boldFont;
        r3.getCell(4).font = boldFont;
        ws.addRow([]);

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

        const rs1 = ws.addRow(['SUPPLIER:']);
        rs1.font = labelFont;
        ws.mergeCells(rs1.number, 1, rs1.number, 5);
        const rs2 = ws.addRow([supplier.name]);
        rs2.font = boldFont;
        ws.mergeCells(rs2.number, 1, rs2.number, 5);
        const rs3 = ws.addRow([supplierInfo.address || '']);
        ws.mergeCells(rs3.number, 1, rs3.number, 5);
        const rs4 = ws.addRow(['Attn: ' + (supplierInfo.attn || '')]);
        ws.mergeCells(rs4.number, 1, rs4.number, 5);
        ws.addRow([]);

        const rd1 = ws.addRow(['DESTINATION:', (order.destination_code || '')]);
        rd1.getCell(1).font = boldFont;
        const rd2 = ws.addRow(['DESTINATION PORT:', (order.destination_port || '')]);
        rd2.getCell(1).font = boldFont;
        ws.addRow([]);

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

        let totalQty = 0;
        items.forEach(item => {
            const product = products.find(p => p.id === item.product_id);
            const row = ws.addRow([
                item.supplier_sku || '',
                product?.sku || '',
                item.quantity,
                order.destination_code || '',
                order.destination_port || '',
            ]);
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(3).font = { bold: true };
            row.getCell(4).alignment = { horizontal: 'center' };
            row.getCell(5).alignment = { horizontal: 'center' };
            totalQty += item.quantity;
        });

        ws.addRow([]);
        const totalRow = ws.addRow(['', 'TOTAL:', totalQty, '', '']);
        totalRow.getCell(2).font = { bold: true, size: 12 };
        totalRow.getCell(3).font = { bold: true, size: 12 };
        totalRow.getCell(3).alignment = { horizontal: 'center' };

        if (order.notes) {
            ws.addRow([]);
            const notesLabel = ws.addRow(['NOTES:']);
            notesLabel.font = boldFont;
            ws.addRow([order.notes]);
        }

        const fileName = `PO_${supplier.short_name}_${order.destination_code}_${order.po_number}.xlsx`;
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Excel re-exportado: ${fileName}`);
    };

    const filteredOrders = useMemo(() => {
        if (filterStatus === 'all') return orders;
        return orders.filter(o => o.status === filterStatus);
    }, [orders, filterStatus]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
            <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            <p>Cargando historial...</p>
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
                            <History className="w-7 h-7 text-[#6a9a04]" /> Historial de Pedidos
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">{orders.length} órdenes de compra registradas</p>
                    </div>
                    <button onClick={() => router.push('/dashboard/cobertura/nuevo-pedido')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#6a9a04]/90 cursor-pointer transition-all shadow-lg shadow-[#6a9a04]/20 border-none">
                        <Package size={16} /> Nuevo Pedido
                    </button>
                </div>

                {/* Status Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {[
                        { key: 'all', label: 'Todos', count: orders.length },
                        { key: 'draft', label: 'Borradores', count: orders.filter(o => o.status === 'draft').length },
                        { key: 'sent', label: 'Enviados', count: orders.filter(o => o.status === 'sent').length },
                        { key: 'received', label: 'Recibidos', count: orders.filter(o => o.status === 'received').length },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border-none ${filterStatus === f.key
                                    ? 'bg-[#6a9a04] text-white shadow-md'
                                    : 'bg-white/60 text-slate-500 hover:bg-white'
                                }`}>
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No hay órdenes {filterStatus !== 'all' ? 'con este estatus' : 'registradas'}</p>
                    </div>
                )}

                <div className="space-y-3">
                    {filteredOrders.map(order => {
                        const supplier = getSupplier(order.supplier_id);
                        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                        const StatusIcon = status.icon;
                        const isExpanded = expandedOrder === order.id;
                        const items = orderItems[order.id] || [];
                        const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

                        return (
                            <div key={order.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                                {/* Order Header */}
                                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/30 transition-colors"
                                    onClick={() => toggleExpand(order.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl ${status.bg}`}>
                                            <StatusIcon size={18} className={status.color} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-sm text-slate-900">{order.po_number}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color} border ${status.border}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-500">{supplier?.short_name || '—'}</span>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-500">{order.destination_code} → {order.destination_port}</span>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 px-5 py-4">
                                        {/* Action buttons */}
                                        <div className="flex gap-2 mb-4 flex-wrap">
                                            <button onClick={(e) => { e.stopPropagation(); reExportExcel(order); }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#6a9a04]/30 bg-white text-[#6a9a04] font-bold text-xs hover:bg-[#6a9a04]/5 cursor-pointer transition-all shadow-sm">
                                                <FileSpreadsheet size={14} /> Exportar Excel
                                            </button>
                                            {hasEdits(order.id) && (
                                                <button onClick={(e) => { e.stopPropagation(); saveQtyEdits(order); }}
                                                    disabled={savingItems}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white border-none font-bold text-xs hover:bg-orange-600 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                                                    {savingItems ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    Guardar Cambios
                                                </button>
                                            )}
                                            {status.next && (
                                                <button onClick={(e) => { e.stopPropagation(); changeStatus(order.id, status.next); }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs hover:bg-blue-100 cursor-pointer transition-all shadow-sm">
                                                    {status.next === 'sent' ? <Send size={14} /> : <Truck size={14} />}
                                                    {NEXT_STATUS_LABEL[order.status]}
                                                </button>
                                            )}
                                            {order.status === 'cancelled' && (
                                                <button onClick={(e) => { e.stopPropagation(); deleteOrder(order); }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs hover:bg-red-100 cursor-pointer transition-all shadow-sm ml-auto">
                                                    <Trash2 size={14} /> Eliminar Pedido
                                                </button>
                                            )}
                                        </div>

                                        {/* Items table */}
                                        {items.length > 0 ? (
                                            <table className="w-full border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200">
                                                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">SKU Fabricante</th>
                                                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">GL SKU</th>
                                                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Producto</th>
                                                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Cantidad</th>
                                                        <th className="px-3 py-2 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {items.map(item => {
                                                        const product = products.find(p => p.id === item.product_id);
                                                        return (
                                                            <tr key={item.id} className="hover:bg-white/50">
                                                                <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.supplier_sku}</td>
                                                                <td className="px-3 py-2 font-mono text-[11px] font-black text-[#6a9a04]">{product?.sku || '—'}</td>
                                                                <td className="px-3 py-2 text-xs text-slate-700">{product?.name || '—'}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={editedQtys[order.id]?.[item.id] ?? item.quantity}
                                                                    onChange={e => handleQtyEdit(order.id, item.id, e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className={`w-20 text-right font-black text-sm px-2 py-1 rounded-lg border outline-none transition-colors ${
                                                                        editedQtys[order.id]?.[item.id] !== undefined && editedQtys[order.id]?.[item.id] !== item.quantity
                                                                            ? 'border-orange-300 bg-orange-50 text-orange-700 ring-2 ring-orange-200'
                                                                            : 'border-slate-200 bg-white text-slate-900'
                                                                    }`}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-1 text-center">
                                                                <button onClick={e => { e.stopPropagation(); removeItem(order, item.id); }}
                                                                    className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-slate-300">
                                                        <td colSpan="4" className="px-3 py-2 text-right text-xs font-black text-slate-500 uppercase">Total</td>
                                                        <td className="px-3 py-2 text-right font-black text-sm text-[#6a9a04]">{totalQty.toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        ) : (
                                            <p className="text-xs text-slate-400 text-center py-4 m-0">Cargando items...</p>
                                        )}

                                        {/* Add product */}
                                        {isExpanded && items.length > 0 && (
                                            <div className="mt-3 flex items-center gap-2">
                                                {addingProduct === order.id ? (
                                                    <>
                                                        <select
                                                            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#6a9a04]/30"
                                                            defaultValue=""
                                                            onChange={e => { if (e.target.value) addItemToOrder(order, e.target.value); }}>
                                                            <option value="" disabled>Seleccionar producto...</option>
                                                            {getAvailableProducts(order.id).map(p => (
                                                                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                                                            ))}
                                                        </select>
                                                        <button onClick={() => setAddingProduct(null)}
                                                            className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">Cancelar</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setAddingProduct(order.id)}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#6a9a04] hover:bg-[#6a9a04]/5 bg-transparent border border-dashed border-[#6a9a04]/30 rounded-lg cursor-pointer transition-colors">
                                                        <Plus size={14} /> Agregar Producto
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {order.notes && (
                                            <div className="mt-3 px-3 py-2 bg-slate-50 rounded-lg">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Notas: </span>
                                                <span className="text-xs text-slate-600">{order.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
