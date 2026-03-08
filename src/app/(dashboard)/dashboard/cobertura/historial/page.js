'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, FileSpreadsheet, Clock, CheckCircle, Send, Package,
    AlertTriangle, ChevronDown, ChevronUp, Truck, Eye, History
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

    useEffect(() => { fetchOrders(); }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchOrders = async () => {
        setLoading(true);
        const [ordersRes, suppRes, prodRes] = await Promise.all([
            supabase.from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase.from('suppliers').select('*'),
            supabase.from('products').select('id, name, sku').eq('is_active', true),
        ]);
        setOrders(ordersRes.data || []);
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data || []);
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
                                            {status.next && (
                                                <button onClick={(e) => { e.stopPropagation(); changeStatus(order.id, status.next); }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs hover:bg-blue-100 cursor-pointer transition-all shadow-sm">
                                                    {status.next === 'sent' ? <Send size={14} /> : <Truck size={14} />}
                                                    {NEXT_STATUS_LABEL[order.status]}
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
                                                                <td className="px-3 py-2 text-right font-black text-sm text-slate-900">{item.quantity?.toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-slate-300">
                                                        <td colSpan="3" className="px-3 py-2 text-right text-xs font-black text-slate-500 uppercase">Total</td>
                                                        <td className="px-3 py-2 text-right font-black text-sm text-[#6a9a04]">{totalQty.toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        ) : (
                                            <p className="text-xs text-slate-400 text-center py-4 m-0">Cargando items...</p>
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
