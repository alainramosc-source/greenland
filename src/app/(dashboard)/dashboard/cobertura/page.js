'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    ShieldCheck, MapPin, Package, Upload, Edit3, X, Save,
    RefreshCw, AlertTriangle, CheckCircle, TrendingDown, Warehouse, FileSpreadsheet, History,
    Clock, Truck, Calendar, ArrowRight, Plus, Trash2, Ship, Loader2, ChevronRight
} from 'lucide-react';

export default function CoberturaPage() {
    const supabase = createClient();
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [saltilloWarehouseIds, setSaltilloWarehouseIds] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [products, setProducts] = useState([]);
    const [coverageData, setCoverageData] = useState([]);
    const [transitShipments, setTransitShipments] = useState([]);
    const [editingRow, setEditingRow] = useState(null);
    const [editForm, setEditForm] = useState({ stock_bodega: 0, stock_transito: 0, weekly_demand: 0 });
    const [saving, setSaving] = useState(false);
    const [csvImporting, setCsvImporting] = useState(false);
    const [toast, setToast] = useState(null);

    // Smart coverage state
    const [transitPanel, setTransitPanel] = useState(null); // product_id of open panel
    const [transitForm, setTransitForm] = useState({ quantity: '', estimated_arrival: '', origin: '' });
    const [showTransitCsvModal, setShowTransitCsvModal] = useState(false);
    const [transitCsvText, setTransitCsvText] = useState('');
    const [transitCsvImporting, setTransitCsvImporting] = useState(false);

    // Manufacturer lead time configs
    const MANUFACTURERS = [
        { id: 'freeman', name: 'Freeman', production: 4, transit: 5, total: 9 },
        { id: 'shinaier', name: 'Shinaier', production: 8, transit: 5, total: 12 },
    ];
    const [selectedManufacturer, setSelectedManufacturer] = useState(MANUFACTURERS[0]);
    const LEAD_TIME_WEEKS = selectedManufacturer.total;

    // Dynamic: weeks remaining until end of 2026
    const NUM_WEEKS = Math.ceil((new Date('2026-12-31') - new Date()) / (7 * 24 * 60 * 60 * 1000));
    const ORDER_CYCLE_WEEKS = 4; // Pedido nuevo cada 4 semanas (mensual)
    const REORDER_TARGET_WEEKS = LEAD_TIME_WEEKS + ORDER_CYCLE_WEEKS;
    const SAFETY_STOCK_WEEKS = 0; // Desactivado por ahora — se activará por SKU después

    useEffect(() => { checkAdminAndFetch(); }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
        setIsAdmin(true);
        await fetchBaseData();
    };

    const fetchBaseData = async () => {
        setLoading(true);
        const [whRes, prodRes] = await Promise.all([
            supabase.from('warehouses').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('products').select('id, name, sku, container_capacity').eq('is_active', true).order('sku'),
        ]);
        const SALTILLO_BODEGAS = ['Bodega Vito Alessio', 'Bodega Echeverría'];
        const allWarehouses = whRes.data || [];
        const saltilloIds = allWarehouses.filter(w => SALTILLO_BODEGAS.includes(w.name)).map(w => w.id);
        setSaltilloWarehouseIds(saltilloIds);
        const wh = allWarehouses.filter(w => !SALTILLO_BODEGAS.includes(w.name));
        // Add virtual Saltillo tab at the beginning if both bodegas exist
        const saltilloTab = saltilloIds.length > 0 ? [{ id: 'saltillo-combined', name: 'Saltillo', isCombined: true }] : [];
        const finalWarehouses = [...saltilloTab, ...wh];
        setWarehouses(finalWarehouses);
        setProducts(prodRes.data || []);
        if (finalWarehouses.length > 0) {
            setSelectedWarehouse(finalWarehouses[0]);
            await Promise.all([
                fetchCoverage(finalWarehouses[0], saltilloIds),
                fetchTransits(finalWarehouses[0], saltilloIds),
            ]);
        }
        setLoading(false);
    };

    const fetchCoverage = async (warehouse, saltilloIds = saltilloWarehouseIds) => {
        if (warehouse?.isCombined) {
            // Fetch actual stock from warehouse_stock for both Saltillo bodegas
            const [wsRes, covRes] = await Promise.all([
                supabase.from('warehouse_stock').select('*').in('warehouse_id', saltilloIds),
                supabase.from('coverage_inventory').select('*').in('warehouse_id', saltilloIds),
            ]);
            const merged = {};
            // First, load stock data from warehouse_stock
            for (const row of (wsRes.data || [])) {
                if (!merged[row.product_id]) {
                    merged[row.product_id] = {
                        product_id: row.product_id,
                        warehouse_id: 'saltillo-combined',
                        stock_bodega: row.stock_quantity || 0,
                        stock_transito: 0,
                        weekly_demand: 0,
                    };
                } else {
                    merged[row.product_id].stock_bodega += (row.stock_quantity || 0);
                }
            }
            // Then, overlay weekly_demand and stock_transito from coverage_inventory if available
            for (const row of (covRes.data || [])) {
                if (merged[row.product_id]) {
                    merged[row.product_id].stock_transito += (row.stock_transito || 0);
                    merged[row.product_id].weekly_demand += (row.weekly_demand || 0);
                } else {
                    merged[row.product_id] = {
                        product_id: row.product_id,
                        warehouse_id: 'saltillo-combined',
                        stock_bodega: row.stock_bodega || 0,
                        stock_transito: row.stock_transito || 0,
                        weekly_demand: row.weekly_demand || 0,
                    };
                }
            }
            setCoverageData(Object.values(merged));
        } else {
            const { data } = await supabase.from('coverage_inventory').select('*').eq('warehouse_id', warehouse.id);
            setCoverageData(data || []);
        }
    };

    // Fetch transit shipments for current warehouse context
    const fetchTransits = async (warehouse, saltIds) => {
        const ids = saltIds || saltilloWarehouseIds;
        let query = supabase.from('transit_shipments').select('*').eq('status', 'in_transit');
        if (warehouse?.isCombined) {
            query = query.in('warehouse_id', ids);
        } else if (warehouse?.id) {
            query = query.eq('warehouse_id', warehouse.id);
        }
        const { data } = await query.order('estimated_arrival', { ascending: true });
        setTransitShipments(data || []);
    };

    const handleWarehouseChange = async (wh) => {
        setSelectedWarehouse(wh);
        setEditingRow(null);
        setTransitPanel(null);
        await Promise.all([fetchCoverage(wh), fetchTransits(wh)]);
    };

    const handleRefresh = async () => {
        if (selectedWarehouse) {
            await Promise.all([fetchCoverage(selectedWarehouse), fetchTransits(selectedWarehouse)]);
            showToast('Datos actualizados');
        }
    };

    const isCombinedView = selectedWarehouse?.isCombined === true;

    // Build heatmap data with SMART reorder intelligence
    const heatmapData = useMemo(() => {
        const now = new Date();
        return products.map(product => {
            const coverage = coverageData.find(c => c.product_id === product.id);
            const stockBodega = coverage?.stock_bodega || 0;
            const weeklyDemand = coverage?.weekly_demand || 0;

            // Get transit shipments for this product
            const productTransits = transitShipments.filter(t => t.product_id === product.id);
            const totalTransitQty = productTransits.reduce((s, t) => s + t.quantity, 0);

            // Calculate which week each transit arrives
            const getTransitWeek = (arrivalDate) => {
                // Normalize both dates to noon to avoid UTC vs local timezone mismatch
                const parts = arrivalDate.toString().split(/[-T]/);
                const arrival = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                const diffMs = arrival - today;
                const diffWeeks = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
                return diffWeeks;
            };

            // SMART projection: week-by-week simulation
            const weeks = [];
            let running = stockBodega; // Start with bodega only, NOT transit
            for (let i = 0; i < NUM_WEEKS; i++) {
                // Inject transits arriving this week
                for (const t of productTransits) {
                    if (getTransitWeek(t.estimated_arrival) === i) {
                        running += t.quantity;
                    }
                }
                // Dead demand: only subtract if stock > 0
                if (running > 0 && weeklyDemand > 0) {
                    running = Math.max(0, running - weeklyDemand);
                }
                weeks.push(running);
            }

            // Coverage weeks: when does stock first hit 0?
            const totalStock = stockBodega; // For display, just bodega (transit shown separately)
            const coverageWeeks = weeklyDemand > 0 ? (() => {
                for (let i = 0; i < NUM_WEEKS; i++) { if (weeks[i] <= 0) return i; }
                return NUM_WEEKS;
            })() : 999;

            // Reorder intelligence
            let stockoutWeek = null;
            let stockoutDate = null;
            let reorderStatus = 'no_demand';
            let reorderMargin = 999;
            let suggestedQty = 0;

            if (weeklyDemand > 0) {
                stockoutWeek = coverageWeeks;
                const stockoutDateObj = new Date(now);
                stockoutDateObj.setDate(now.getDate() + (coverageWeeks * 7));
                stockoutDate = stockoutDateObj;

                reorderMargin = coverageWeeks - LEAD_TIME_WEEKS;

                if (reorderMargin > 4) reorderStatus = 'ok';
                else if (reorderMargin > 0) reorderStatus = 'plan';
                else if (reorderMargin > -4) reorderStatus = 'order_now';
                else reorderStatus = 'late';

                // SMART suggested qty: simulate what stock will be when new order arrives
                // Account for existing transits already in the simulation
                const stockAtLeadTime = weeks[Math.min(LEAD_TIME_WEEKS - 1, NUM_WEEKS - 1)] || 0;
                const neededForTarget = weeklyDemand * (REORDER_TARGET_WEEKS + SAFETY_STOCK_WEEKS);
                suggestedQty = Math.max(0, Math.ceil(neededForTarget - stockAtLeadTime));
            }

            return {
                product, stockBodega, stockTransito: totalTransitQty, weeklyDemand, totalStock,
                coverageWeeks, weeks, coverageId: coverage?.id || null,
                stockoutWeek, stockoutDate, reorderStatus, reorderMargin, suggestedQty,
                transitCount: productTransits.length,
                nextArrival: productTransits[0]?.estimated_arrival || null
            };
        });
    }, [products, coverageData, transitShipments, LEAD_TIME_WEEKS]);

    // KPIs
    const kpis = useMemo(() => {
        const withDemand = heatmapData.filter(r => r.weeklyDemand > 0);
        const green = withDemand.filter(r => r.coverageWeeks >= 8).length;
        const yellow = withDemand.filter(r => r.coverageWeeks >= 4 && r.coverageWeeks < 8).length;
        const red = withDemand.filter(r => r.coverageWeeks < 4).length;
        const noDemand = heatmapData.filter(r => r.weeklyDemand === 0).length;
        const avgCoverage = withDemand.length > 0
            ? withDemand.reduce((sum, r) => sum + Math.min(r.coverageWeeks, NUM_WEEKS), 0) / withDemand.length : 0;
        const needReorder = withDemand.filter(r => r.reorderStatus === 'order_now' || r.reorderStatus === 'late').length;
        return { green, yellow, red, noDemand, avgCoverage, total: heatmapData.length, needReorder };
    }, [heatmapData]);

    // Products that need urgent reorder
    const reorderAlerts = useMemo(() => {
        return heatmapData
            .filter(r => r.weeklyDemand > 0 && (r.reorderStatus === 'order_now' || r.reorderStatus === 'late' || r.reorderStatus === 'plan'))
            .sort((a, b) => a.reorderMargin - b.reorderMargin);
    }, [heatmapData]);

    // Cell color
    const getCellColor = (remaining, weeklyDemand) => {
        if (weeklyDemand === 0) return 'bg-slate-100 text-slate-400';
        if (remaining <= 0) return 'bg-red-100 text-red-700 font-black';
        const ratio = remaining / (weeklyDemand * 4);
        if (ratio >= 2) return 'bg-green-100 text-green-800';
        if (ratio >= 1) return 'bg-green-50 text-green-700';
        if (ratio >= 0.5) return 'bg-yellow-100 text-yellow-800';
        if (ratio > 0) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-700 font-black';
    };

    // Reorder badge
    const getReorderBadge = (row) => {
        const configs = {
            no_demand: { label: '—', bg: 'bg-slate-100', text: 'text-slate-400', icon: null },
            ok: { label: 'OK', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: <CheckCircle size={10} /> },
            plan: { label: 'Planear', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <Clock size={10} /> },
            order_now: { label: '¡Pedir!', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Truck size={10} /> },
            late: { label: 'TARDE', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertTriangle size={10} /> },
        };
        const c = configs[row.reorderStatus] || configs.no_demand;
        if (row.reorderStatus === 'no_demand') {
            return <span className="text-slate-400 text-[10px]">—</span>;
        }

        const dateStr = row.stockoutDate
            ? row.stockoutDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
            : '';

        return (
            <div className="flex flex-col items-center gap-0.5" title={`Quiebre: ${dateStr}\nMargen: ${row.reorderMargin.toFixed(1)} sem\nSugerido: ${row.suggestedQty} uds`}>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                    {c.icon} {c.label}
                </span>
                {row.stockoutDate && (
                    <span className={`text-[8px] font-bold ${row.reorderStatus === 'late' ? 'text-red-500' : row.reorderStatus === 'order_now' ? 'text-orange-500' : 'text-slate-400'}`}>
                        ⚡ {dateStr}
                    </span>
                )}
            </div>
        );
    };

    // Week labels
    const weekLabels = useMemo(() => {
        const now = new Date();
        const labels = [];
        for (let i = 0; i < NUM_WEEKS; i++) {
            const weekDate = new Date(now);
            weekDate.setDate(now.getDate() + (i * 7));
            const weekNum = getWeekNumber(weekDate);
            labels.push(`WK${weekNum.toString().padStart(2, '0')}`);
        }
        return labels;
    }, []);

    function getWeekNumber(d) {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    // Edit handlers
    const startEdit = (row) => {
        setEditingRow(row.product.id);
        setEditForm({ stock_bodega: row.stockBodega, stock_transito: row.stockTransito, weekly_demand: row.weeklyDemand });
    };
    const cancelEdit = () => { setEditingRow(null); setEditForm({ stock_bodega: 0, stock_transito: 0, weekly_demand: 0 }); };

    const saveEdit = async (productId) => {
        if (!selectedWarehouse) return;
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const newStock = parseInt(editForm.stock_bodega) || 0;
        const newTransito = parseInt(editForm.stock_transito) || 0;
        const newDemand = parseInt(editForm.weekly_demand) || 0;

        // For combined Saltillo view, save transit/demand to the first Saltillo bodega
        const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse.id;

        const payload = {
            warehouse_id: targetWarehouseId, product_id: productId,
            stock_bodega: isCombinedView ? 0 : newStock,
            stock_transito: newTransito, weekly_demand: newDemand,
            updated_at: new Date().toISOString(), updated_by: user.id,
        };

        // For combined view, also zero out the second bodega's transit/demand to avoid double-counting
        if (isCombinedView && saltilloWarehouseIds.length > 1) {
            await supabase.from('coverage_inventory').upsert({
                warehouse_id: saltilloWarehouseIds[1], product_id: productId,
                stock_bodega: 0, stock_transito: 0, weekly_demand: 0,
                updated_at: new Date().toISOString(), updated_by: user.id,
            }, { onConflict: 'warehouse_id,product_id' });
        }

        const { error } = await supabase.from('coverage_inventory').upsert(payload, { onConflict: 'warehouse_id,product_id' });
        if (error) { showToast('Error: ' + error.message, 'error'); }
        else {
            // Optimistic update — update local state immediately
            setCoverageData(prev => {
                const exists = prev.find(c => c.product_id === productId);
                if (exists) {
                    return prev.map(c => c.product_id === productId
                        ? { ...c, stock_transito: newTransito, weekly_demand: newDemand, ...(isCombinedView ? {} : { stock_bodega: newStock }) }
                        : c);
                }
                return [...prev, { product_id: productId, warehouse_id: targetWarehouseId, stock_bodega: isCombinedView ? 0 : newStock, stock_transito: newTransito, weekly_demand: newDemand }];
            });
            setEditingRow(null);
            showToast('Datos guardados');
        }
        setSaving(false);
    };

    // CSV Import — format: sku, weekly_demand, transit_qty, transit_date, transit_origin
    const handleCsvImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedWarehouse) return;
        setCsvImporting(true);
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].toLowerCase();
        const hasHeader = header.includes('sku') || header.includes('demand') || header.includes('demanda');
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const { data: { user } } = await supabase.auth.getUser();
        const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
        let demandUpdated = 0, transitsCreated = 0, errors = 0;
        for (const line of dataLines) {
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            if (cols.length < 2) { errors++; continue; }
            const [sku, demanda, transitQty, transitDate, transitOrigin] = cols;
            const product = products.find(p => p.sku === sku);
            if (!product) { errors++; continue; }

            // Always update weekly_demand
            const { error: demandErr } = await supabase.from('coverage_inventory').upsert({
                warehouse_id: targetWarehouseId, product_id: product.id,
                weekly_demand: parseInt(demanda) || 0,
                updated_at: new Date().toISOString(), updated_by: user.id,
            }, { onConflict: 'warehouse_id,product_id' });
            if (demandErr) { errors++; } else { demandUpdated++; }

            // Optionally create transit shipment if qty + date provided
            if (transitQty && parseInt(transitQty) > 0 && transitDate) {
                const parsedDate = new Date(transitDate);
                if (!isNaN(parsedDate.getTime())) {
                    const { error: transitErr } = await supabase.from('transit_shipments').insert({
                        product_id: product.id,
                        warehouse_id: targetWarehouseId,
                        quantity: parseInt(transitQty),
                        estimated_arrival: transitDate.trim(),
                        origin: transitOrigin || null,
                        created_by: user.id,
                    });
                    if (transitErr) errors++; else transitsCreated++;
                }
            }
        }
        await Promise.all([fetchCoverage(selectedWarehouse), fetchTransits(selectedWarehouse)]);
        setCsvImporting(false);
        e.target.value = '';
        showToast(`${demandUpdated} demandas actualizadas${transitsCreated > 0 ? `, ${transitsCreated} tránsitos creados` : ''}.${errors > 0 ? ` ${errors} errores.` : ''}`, errors > 0 ? 'warning' : 'success');
    };

    // --- Transit Shipment Management ---
    const addTransit = async (productId) => {
        if (!transitForm.quantity || !transitForm.estimated_arrival) {
            showToast('Cantidad y fecha de llegada son obligatorios', 'error');
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
        const { error } = await supabase.from('transit_shipments').insert({
            product_id: productId,
            warehouse_id: targetWarehouseId,
            quantity: parseInt(transitForm.quantity),
            estimated_arrival: transitForm.estimated_arrival,
            origin: transitForm.origin || null,
            created_by: user.id,
        });
        if (error) { showToast('Error: ' + error.message, 'error'); }
        else {
            setTransitForm({ quantity: '', estimated_arrival: '', origin: '' });
            await fetchTransits(selectedWarehouse);
            showToast('Embarque registrado');
        }
    };

    const deleteTransit = async (transitId) => {
        if (!confirm('¿Eliminar este embarque?')) return;
        const { error } = await supabase.from('transit_shipments').delete().eq('id', transitId);
        if (error) showToast('Error: ' + error.message, 'error');
        else { await fetchTransits(selectedWarehouse); showToast('Embarque eliminado'); }
    };

    const markTransitArrived = async (transitId) => {
        const { error } = await supabase.from('transit_shipments')
            .update({ status: 'arrived' }).eq('id', transitId);
        if (error) showToast('Error: ' + error.message, 'error');
        else { await fetchTransits(selectedWarehouse); showToast('Embarque marcado como llegado'); }
    };

    // Bulk CSV transit import (file-based)
    const transitFileRef = useRef(null);
    const handleTransitCsvImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTransitCsvImporting(true);
        const text = await file.text();
        const { data: { user } } = await supabase.auth.getUser();
        const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].toLowerCase();
        const hasHeader = header.includes('sku') || header.includes('fecha') || header.includes('cantidad');
        const dataLines = hasHeader ? lines.slice(1) : lines;
        let imported = 0, errors = 0;
        for (const line of dataLines) {
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            if (cols.length < 3) { errors++; continue; }
            const [sku, qty, fecha, origen] = cols;
            const product = products.find(p => p.sku === sku);
            if (!product) { errors++; continue; }
            const parsedDate = new Date(fecha);
            if (isNaN(parsedDate.getTime())) { errors++; continue; }
            const { error } = await supabase.from('transit_shipments').insert({
                product_id: product.id,
                warehouse_id: targetWarehouseId,
                quantity: parseInt(qty) || 0,
                estimated_arrival: fecha.trim(),
                origin: origen || null,
                created_by: user.id,
            });
            if (error) errors++; else imported++;
        }
        await fetchTransits(selectedWarehouse);
        setTransitCsvImporting(false);
        e.target.value = '';
        showToast(`${imported} tránsitos importados.${errors > 0 ? ` ${errors} errores.` : ''}`, errors > 0 ? 'warning' : 'success');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
            <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            <p>Cargando cobertura...</p>
        </div>
    );
    if (!isAdmin) return null;

    return (
        <>
        <div className="relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl animate-in slide-in-from-right backdrop-blur-md border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                    toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}

            <div className="relative z-10 max-w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-2">
                            <ShieldCheck className="w-7 h-7 text-[#6a9a04]" /> Cobertura de Producto
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">Seguimiento de inventario y cobertura semanal por localidad · <span className="text-orange-500 font-bold">Lead time: {LEAD_TIME_WEEKS} semanas</span></p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* Manufacturer toggle */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            {MANUFACTURERS.map(m => (
                                <button key={m.id} onClick={() => setSelectedManufacturer(m)}
                                    className={`px-3 py-2.5 text-xs font-bold transition-all border-none cursor-pointer ${selectedManufacturer.id === m.id
                                        ? 'bg-orange-500 text-white' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
                                    {m.name} ({m.total}s)
                                </button>
                            ))}
                        </div>
                        <button onClick={() => transitFileRef.current?.click()} disabled={transitCsvImporting}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 font-bold text-sm hover:bg-orange-100 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <Ship size={16} /> {transitCsvImporting ? 'Importando...' : 'Importar Tránsitos'}
                        </button>
                        <input ref={transitFileRef} type="file" accept=".csv" className="hidden" onChange={handleTransitCsvImport} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={csvImporting}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                            <Upload size={16} /> {csvImporting ? 'Importando...' : 'CSV Cobertura'}
                        </button>
                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
                        <button onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                            <RefreshCw size={16} />
                        </button>
                        <button onClick={() => router.push('/dashboard/cobertura/nuevo-pedido')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#6a9a04]/90 cursor-pointer transition-all shadow-lg shadow-[#6a9a04]/20 border-none">
                            <FileSpreadsheet size={16} /> Crear Pedido
                        </button>
                    </div>
                </div>

                {/* Warehouse Tabs */}
                <div className="flex items-center gap-2 mb-5 bg-white/60 backdrop-blur-md rounded-xl p-1.5 border border-white/50 shadow-sm w-fit">
                    <Warehouse size={16} className="text-slate-400 ml-2" />
                    {warehouses.map(wh => (
                        <button key={wh.id} onClick={() => handleWarehouseChange(wh)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer whitespace-nowrap ${selectedWarehouse?.id === wh.id
                                ? 'bg-[#6a9a04] text-white shadow-md'
                                : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}>
                            {wh.name}
                        </button>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-4 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500"><CheckCircle className="w-5 h-5" /></div>
                        <div><p className="text-xl font-black text-slate-900 m-0">{kpis.green}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">OK (8+ sem)</p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-4 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500"><AlertTriangle className="w-5 h-5" /></div>
                        <div><p className="text-xl font-black text-slate-900 m-0">{kpis.yellow}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Precaución (4-8)</p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-4 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><TrendingDown className="w-5 h-5" /></div>
                        <div><p className="text-xl font-black text-slate-900 m-0">{kpis.red}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Crítico (&lt;4)</p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-4 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]"><Package className="w-5 h-5" /></div>
                        <div><p className="text-xl font-black text-slate-900 m-0">{kpis.avgCoverage.toFixed(1)}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Promedio Sem</p></div>
                    </div>
                    <div className={`backdrop-blur-md border shadow-lg p-4 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all ${kpis.needReorder > 0 ? 'bg-orange-50/80 border-orange-200' : 'bg-white/60 border-white/50'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.needReorder > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-xl font-black m-0 ${kpis.needReorder > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{kpis.needReorder}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Pedir Ahora</p>
                        </div>
                    </div>
                </div>

                {/* CSV Help */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-xl px-4 py-2.5 mb-4 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <strong>Formato CSV:</strong>
                    <code className="bg-slate-100 px-2 py-0.5 rounded text-[#6a9a04] font-bold text-[11px]">sku, stock_bodega, stock_transito, weekly_demand</code>
                    <span className="text-slate-400">Ejemplo: <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">GL01, 500, 100, 80</code></span>
                </div>

                {/* Heatmap Table */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden mb-4">
                    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
                        <table className="w-max min-w-full border-collapse text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
                                    <th className="sticky left-0 z-20 bg-slate-50/95 px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px]">PN</th>
                                    <th className="sticky left-[70px] z-20 bg-slate-50/95 px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[160px]">Descripción</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px]">Bodega</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px]">Tránsito</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px]">Dem/Sem</th>
                                    <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-orange-500 min-w-[65px] bg-orange-50/50">Reorden</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[55px]">Editar</th>
                                    {weekLabels.map((label, i) => (
                                        <th key={i} className={`px-1.5 py-3 text-center text-[10px] font-black uppercase tracking-wider min-w-[52px] ${i === LEAD_TIME_WEEKS - 1 ? 'text-orange-500 border-r-2 border-orange-300' : 'text-slate-400'}`}>
                                            {label}
                                            {i === LEAD_TIME_WEEKS - 1 && <div className="text-[7px] text-orange-400 font-bold">🚢 LLEGA</div>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {heatmapData.map(row => {
                                    const isEditing = editingRow === row.product.id;
                                    return (
                                        <tr key={row.product.id} className={`hover:bg-white/50 transition-colors ${isEditing ? 'bg-[#6a9a04]/5' : ''}`}>
                                            <td className="sticky left-0 z-5 bg-white/95 px-3 py-2 font-mono text-[11px] font-black text-[#6a9a04]">{row.product.sku}</td>
                                            <td className="sticky left-[70px] z-5 bg-white/95 px-3 py-2 text-xs text-slate-700 truncate max-w-[200px]">{row.product.name}</td>
                                            <td className="px-3 py-2 text-center">
                                                {isEditing && !isCombinedView ? (
                                                    <input type="number" value={editForm.stock_bodega}
                                                        onChange={e => setEditForm(f => ({ ...f, stock_bodega: e.target.value }))}
                                                        className="w-16 px-2 py-1 border border-[#6a9a04]/30 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-sm" />
                                                ) : <span className="text-xs tabular-nums text-slate-700">{row.stockBodega.toLocaleString()}</span>}
                                            </td>
                            <td className="px-3 py-2 text-center">
                                {isEditing ? (
                                    <input type="number" value={editForm.stock_transito}
                                        onChange={e => setEditForm(f => ({ ...f, stock_transito: e.target.value }))}
                                        className="w-16 px-2 py-1 border border-[#6a9a04]/30 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-sm" />
                                ) : (
                                    <button onClick={() => setTransitPanel(row.product.id)}
                                        className="text-xs tabular-nums cursor-pointer bg-transparent border-none hover:bg-orange-50 px-2 py-1 rounded-lg transition-all"
                                        title="Click para gestionar tránsitos">
                                        <span className={row.transitCount > 0 ? 'text-orange-600 font-bold' : 'text-slate-400'}>
                                            {row.stockTransito > 0 ? row.stockTransito.toLocaleString() : '—'}
                                        </span>
                                        {row.transitCount > 0 && (
                                            <span className="ml-1 text-[9px] text-orange-400">({row.transitCount})</span>
                                        )}
                                    </button>
                                )}
                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {isEditing ? (
                                                    <input type="number" value={editForm.weekly_demand}
                                                        onChange={e => setEditForm(f => ({ ...f, weekly_demand: e.target.value }))}
                                                        className="w-16 px-2 py-1 border border-[#6a9a04]/30 rounded-lg text-center text-xs outline-none focus:ring-2 focus:ring-[#6a9a04]/20 bg-white shadow-sm" />
                                                ) : <span className="text-xs tabular-nums text-slate-700">{row.weeklyDemand.toLocaleString()}</span>}
                                            </td>
                                            <td className="px-2 py-2 text-center bg-orange-50/20">
                                                {getReorderBadge(row)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {isEditing ? (
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => saveEdit(row.product.id)} disabled={saving}
                                                            className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 cursor-pointer bg-transparent transition-all">
                                                            <Save size={12} />
                                                        </button>
                                                        <button onClick={cancelEdit}
                                                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer bg-transparent transition-all">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEdit(row)}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-[#6a9a04] cursor-pointer bg-transparent transition-all"
                                                        title={isCombinedView ? 'Editar tránsito y demanda' : 'Editar'}>
                                                        <Edit3 size={12} />
                                                    </button>
                                                )}
                                            </td>
                                            {row.weeks.map((remaining, i) => (
                                                <td key={i} className={`px-1 py-2 text-center text-[11px] tabular-nums font-bold transition-colors ${getCellColor(remaining, row.weeklyDemand)} ${i === LEAD_TIME_WEEKS - 1 ? 'border-r-2 border-orange-300' : ''}`}
                                                    title={`${weekLabels[i]}: ${remaining.toLocaleString()} unidades`}>
                                                    {row.weeklyDemand > 0 ? remaining.toLocaleString() : '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reorder Suggestion Panel */}
                {reorderAlerts.length > 0 && (
                    <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-md border border-orange-200 shadow-xl rounded-2xl overflow-hidden mb-4">
                        <div className="px-5 py-4 border-b border-orange-200/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 m-0">Sugerencia de Reorden</h3>
                                    <p className="text-[11px] text-slate-500 m-0">Basado en lead time de {LEAD_TIME_WEEKS} semanas · Objetivo: cubrir {REORDER_TARGET_WEEKS} semanas</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-orange-100/30 border-b border-orange-200/50">
                                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Stock Actual</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Dem/Sem</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Sem Restantes</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-orange-500">Quiebre Est.</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-[#6a9a04]">Qty Sugerida</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100/50">
                                    {reorderAlerts.map(row => (
                                        <tr key={row.product.id} className="hover:bg-orange-50/50 transition-colors">
                                            <td className="px-4 py-2.5 font-mono text-[11px] font-black text-[#6a9a04]">{row.product.sku}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-700">{row.product.name}</td>
                                            <td className="px-4 py-2.5 text-center text-xs tabular-nums font-bold text-slate-700">{row.totalStock.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-center text-xs tabular-nums text-slate-600">{row.weeklyDemand.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-center text-xs tabular-nums font-bold text-slate-700">{row.coverageWeeks.toFixed(1)}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={`text-xs font-bold ${row.reorderStatus === 'late' ? 'text-red-600' : row.reorderStatus === 'order_now' ? 'text-orange-600' : 'text-blue-600'}`}>
                                                    <Calendar size={10} className="inline mr-1" />
                                                    {row.stockoutDate?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">{getReorderBadge(row)}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04] text-xs font-black">
                                                    {row.suggestedQty.toLocaleString()} uds
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-xl px-4 py-3 flex items-center gap-5 flex-wrap text-xs text-slate-500">
                    <span className="font-bold text-slate-600">Leyenda:</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Stock holgado</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Precaución</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Bajo</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Sin stock</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Sin demanda</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1.5 text-orange-500 font-bold">
                        <span className="w-3 h-3 rounded border-2 border-orange-300 inline-block" />
                        🚢 {selectedManufacturer.name}: {selectedManufacturer.production}p + {selectedManufacturer.transit}t = {LEAD_TIME_WEEKS}sem · Ciclo: {ORDER_CYCLE_WEEKS}sem
                    </span>
                </div>
            </div>
        </div>

        {/* ============ Transit Slide-Over Panel ============ */}
        {transitPanel && (() => {
            const product = products.find(p => p.id === transitPanel);
            const productTransits = transitShipments.filter(t => t.product_id === transitPanel);
            const totalQty = productTransits.reduce((s, t) => s + t.quantity, 0);
            return (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setTransitPanel(null)} />
                    <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right" style={{animationDuration:'200ms'}}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Ship className="w-5 h-5 text-orange-500" />
                                    <h2 className="text-lg font-black text-slate-900 m-0">Tránsitos</h2>
                                </div>
                                <button onClick={() => setTransitPanel(null)} className="p-2 rounded-lg hover:bg-white/80 cursor-pointer bg-transparent border-none text-slate-400 hover:text-slate-600 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-sm font-bold text-[#6a9a04] m-0">{product?.sku} — {product?.name}</p>
                            <p className="text-xs text-slate-500 m-0 mt-1">Total en tránsito: <span className="font-black text-orange-600">{totalQty.toLocaleString()} uds</span> en {productTransits.length} embarque(s)</p>
                        </div>

                        {/* Shipments list */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {productTransits.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Ship className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold text-sm">Sin embarques en tránsito</p>
                                    <p className="text-xs">Agrega un embarque abajo</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {productTransits.map(t => {
                                        const arrParts = t.estimated_arrival.toString().split(/[-T]/);
                                        const arrDate = new Date(parseInt(arrParts[0]), parseInt(arrParts[1]) - 1, parseInt(arrParts[2]), 12, 0, 0);
                                        const todayNoon = new Date(); todayNoon.setHours(12, 0, 0, 0);
                                        const daysUntil = Math.ceil((arrDate - todayNoon) / (1000 * 60 * 60 * 24));
                                        const weeksUntil = Math.ceil(daysUntil / 7);
                                        return (
                                            <div key={t.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-orange-200 transition-all">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <span className="text-lg font-black text-slate-900">{t.quantity.toLocaleString()}</span>
                                                        <span className="text-xs text-slate-400 ml-1">uds</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => markTransitArrived(t.id)} title="Marcar como llegado"
                                                            className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 cursor-pointer bg-transparent transition-all text-xs">
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button onClick={() => deleteTransit(t.id)} title="Eliminar"
                                                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer bg-transparent transition-all text-xs">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="flex items-center gap-1 text-slate-600">
                                                        <Calendar size={12} />
                                                        {arrDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className={`font-bold ${daysUntil <= 0 ? 'text-green-600' : daysUntil <= 14 ? 'text-orange-600' : 'text-slate-500'}`}>
                                                        {daysUntil <= 0 ? '🟢 Llegando' : `${weeksUntil} sem (${daysUntil}d)`}
                                                    </span>
                                                </div>
                                                {t.origin && <span className="inline-block mt-2 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{t.origin}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Add new transit form */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 m-0">Agregar embarque</p>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cantidad</label>
                                    <input type="number" placeholder="500" value={transitForm.quantity}
                                        onChange={e => setTransitForm(f => ({ ...f, quantity: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha llegada</label>
                                    <input type="date" value={transitForm.estimated_arrival}
                                        onChange={e => setTransitForm(f => ({ ...f, estimated_arrival: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Origen</label>
                                    <select value={transitForm.origin} onChange={e => setTransitForm(f => ({ ...f, origin: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                                        <option value="">—</option>
                                        {MANUFACTURERS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={() => addTransit(transitPanel)} disabled={!transitForm.quantity || !transitForm.estimated_arrival}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 cursor-pointer transition-all border-none disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
                                <Plus size={16} /> Agregar Embarque
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Transit CSV import is now file-based — no modal needed */}
        </>
    );
}
