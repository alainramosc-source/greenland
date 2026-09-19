'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, ShieldCheck, MapPin, Package, RefreshCw, AlertTriangle, CheckCircle,
    Sliders, Calendar, Filter, Save, Eye, X, ShoppingBag, Store, Info
} from 'lucide-react';

export default function PlaneacionDemandaWrapper() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            </div>
        }>
            <PlaneacionDemandaPage />
        </Suspense>
    );
}

function PlaneacionDemandaPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [saltilloWarehouseIds, setSaltilloWarehouseIds] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    const [products, setProducts] = useState([]);
    const [counterSales, setCounterSales] = useState([]);
    const [orders, setOrders] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [coverageData, setCoverageData] = useState([]);
    const [warehouseStock, setWarehouseStock] = useState([]);

    // Config Filters
    const [daysWindow, setDaysWindow] = useState(60); // 30, 60, 90, 180, 365
    const [residualStockThreshold, setResidualStockThreshold] = useState(2); // Stock <= 2 with 0 sales = Out of Stock
    const [skuFilter, setSkuFilter] = useState('');

    // State for week exclusions: { [`${product_id}-${weekIndex}`]: boolean }
    const [weekExclusions, setWeekExclusions] = useState({});

    // Selected product for weekly breakdown modal
    const [modalProduct, setModalProduct] = useState(null);

    // Toast state
    const [toast, setToast] = useState(null);
    const [syncingToCobertura, setSyncingToCobertura] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sub_role, assigned_warehouse_id')
            .eq('id', user.id)
            .single();

        const isAdminUser = profile?.role === 'admin';
        const isProUser = profile?.role === 'distributor' && profile?.sub_role === 'distributor_pro' && profile?.assigned_warehouse_id;

        if (!isAdminUser && !isProUser) {
            router.push('/dashboard');
            return;
        }
        setIsAdmin(isAdminUser);

        await fetchData(isProUser ? profile.assigned_warehouse_id : null);
    };

    const [profiles, setProfiles] = useState([]);

    const fetchData = async (proWarehouseId = null) => {
        setLoading(true);

        const [whRes, prodRes, covRes, wsRes, salesRes, ordersRes, profRes] = await Promise.all([
            supabase.from('warehouses').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('products').select('id, name, sku, category_id, container_capacity').eq('is_active', true).order('sku'),
            supabase.from('coverage_inventory').select('*'),
            supabase.from('warehouse_stock').select('*'),
            supabase.from('counter_sales').select('*').eq('status', 'completed').order('created_at', { ascending: false }),
            supabase.from('orders').select(`
                id, status, created_at, distributor_id,
                order_items (id, product_id, quantity, warehouse_id)
            `).order('created_at', { ascending: false }).limit(2000),
            supabase.from('profiles').select('id, assigned_warehouse_id')
        ]);

        const SALTILLO_BODEGAS = ['Bodega Vito Alessio', 'Bodega Echeverría'];
        const allWarehouses = whRes.data || [];
        const saltilloIds = allWarehouses.filter(w => SALTILLO_BODEGAS.includes(w.name)).map(w => w.id);
        setSaltilloWarehouseIds(saltilloIds);

        let finalWarehouses = [];
        if (proWarehouseId) {
            const proWh = allWarehouses.find(w => w.id === proWarehouseId);
            if (saltilloIds.includes(proWarehouseId)) {
                finalWarehouses = [{ id: 'saltillo-combined', name: 'Saltillo (Combinado)', isCombined: true }];
            } else if (proWh) {
                finalWarehouses = [proWh];
            }
        } else {
            const wh = allWarehouses.filter(w => !SALTILLO_BODEGAS.includes(w.name));
            const saltilloTab = saltilloIds.length > 0 ? [{ id: 'saltillo-combined', name: 'Saltillo (Combinado)', isCombined: true }] : [];
            finalWarehouses = [...saltilloTab, ...wh];
        }

        setWarehouses(finalWarehouses);
        if (finalWarehouses.length > 0) {
            setSelectedWarehouse(finalWarehouses[0]);
        }

        setProducts(prodRes.data || []);
        setCoverageData(covRes.data || []);
        setWarehouseStock(wsRes.data || []);
        setCounterSales(salesRes.data || []);
        setProfiles(profRes.data || []);

        const EFFECTIVE_STATUSES = ['closed', 'shipped', 'in_fulfillment', 'confirmed', 'completed'];
        setOrders((ordersRes.data || []).filter(o => EFFECTIVE_STATUSES.includes((o.status || '').toLowerCase())));

        setLoading(false);
    };

    // Flatten distributor order items with parent order metadata and effective warehouse
    const distOrderItems = useMemo(() => {
        const profMap = new Map();
        profiles.forEach(p => profMap.set(p.id, p));

        const itemsList = [];
        orders.forEach(o => {
            const profile = profMap.get(o.distributor_id);
            const assignedWh = profile?.assigned_warehouse_id;

            (o.order_items || []).forEach(item => {
                itemsList.push({
                    ...item,
                    created_at: o.created_at,
                    effective_warehouse_id: item.warehouse_id || assignedWh
                });
            });
        });
        return itemsList;
    }, [orders, profiles]);

    // Calculate demand planning data per product based purely on sales data and active weeks
    const planningData = useMemo(() => {
        if (!selectedWarehouse || products.length === 0) return [];

        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (daysWindow * 24 * 60 * 60 * 1000));
        const totalWeeksInWindow = Math.max(1, Math.ceil(daysWindow / 7));

        const targetWarehouseIds = selectedWarehouse.isCombined
            ? saltilloWarehouseIds
            : [selectedWarehouse.id];

        return products.map(product => {
            // Get current stock
            const stockRows = warehouseStock.filter(ws => ws.product_id === product.id && targetWarehouseIds.includes(ws.warehouse_id));
            const currentStock = stockRows.reduce((sum, r) => sum + (r.stock_quantity || 0), 0);

            // Get existing weekly demand in coverage_inventory
            const covRows = coverageData.filter(c => c.product_id === product.id && targetWarehouseIds.includes(c.warehouse_id));
            const existingCoverageDemand = covRows.reduce((sum, c) => sum + (c.weekly_demand || 0), 0);

            // 1. Calculate POS Counter Sales
            const posQty = counterSales
                .filter(cs => targetWarehouseIds.includes(cs.warehouse_id))
                .filter(cs => new Date(cs.created_at || cs.sale_date) >= cutoffDate)
                .reduce((sum, sale) => {
                    const items = sale.items || [];
                    const itemMatch = items.find(i => i.product_id === product.id);
                    return sum + (itemMatch ? (parseFloat(itemMatch.quantity) || 0) : 0);
                }, 0);

            // 2. Calculate Distributor Order Sales
            const distQty = distOrderItems
                .filter(item => {
                    if (item.product_id !== product.id) return false;
                    const itemDate = new Date(item.created_at);
                    if (isNaN(itemDate.getTime()) || itemDate < cutoffDate) return false;

                    if (item.effective_warehouse_id) {
                        return targetWarehouseIds.includes(item.effective_warehouse_id);
                    }
                    return true;
                })
                .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

            const totalSales = posQty + distQty;

            // 3. Weekly Breakdown Analysis
            const weeklyBreakdown = [];
            let activeWeeksCount = 0;
            let salesInActiveWeeks = 0;

            for (let w = 0; w < totalWeeksInWindow; w++) {
                const weekStart = new Date(now.getTime() - ((totalWeeksInWindow - w) * 7 * 24 * 60 * 60 * 1000));
                const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

                const weekPos = counterSales
                    .filter(cs => targetWarehouseIds.includes(cs.warehouse_id))
                    .filter(cs => {
                        const d = new Date(cs.created_at || cs.sale_date);
                        return d >= weekStart && d < weekEnd;
                    })
                    .reduce((sum, sale) => {
                        const items = sale.items || [];
                        const itemMatch = items.find(i => i.product_id === product.id);
                        return sum + (itemMatch ? (parseFloat(itemMatch.quantity) || 0) : 0);
                    }, 0);

                const weekDist = distOrderItems
                    .filter(item => {
                        if (item.product_id !== product.id) return false;
                        const itemDate = new Date(item.created_at);
                        if (isNaN(itemDate.getTime()) || itemDate < weekStart || itemDate >= weekEnd) return false;

                        if (item.effective_warehouse_id) {
                            return targetWarehouseIds.includes(item.effective_warehouse_id);
                        }
                        return true;
                    })
                    .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

                const weekSales = weekPos + weekDist;

                const exclusionKey = `${product.id}-${w}`;
                const isManuallyExcluded = weekExclusions[exclusionKey] === true;

                // Out of stock auto-detection
                const isAutoOutOfStock = (weekSales === 0 && currentStock <= residualStockThreshold);
                
                const isActive = !isManuallyExcluded && !isAutoOutOfStock;

                if (isActive) {
                    activeWeeksCount++;
                    salesInActiveWeeks += weekSales;
                }

                weeklyBreakdown.push({
                    weekIndex: w,
                    weekStart,
                    weekEnd,
                    weekPos,
                    weekDist,
                    weekSales,
                    isAutoOutOfStock,
                    isManuallyExcluded,
                    isActive
                });
            }

            const effectiveActiveWeeks = Math.max(1, activeWeeksCount);
            const rawWeeklyDemand = salesInActiveWeeks > 0 ? (salesInActiveWeeks / effectiveActiveWeeks) : 0;
            const calculatedWeeklyDemand = Math.round(rawWeeklyDemand * 10) / 10;
            const finalWeeklyDemand = Math.round(calculatedWeeklyDemand);

            const outOfStockWeeksCount = totalWeeksInWindow - activeWeeksCount;

            return {
                product,
                currentStock,
                posQty,
                distQty,
                totalSales,
                totalWeeksInWindow,
                activeWeeksCount,
                outOfStockWeeksCount,
                weeklyBreakdown,
                calculatedWeeklyDemand,
                finalWeeklyDemand,
                existingCoverageDemand,
                isNewProduct: totalSales === 0 && currentStock > 0
            };
        });
    }, [selectedWarehouse, products, counterSales, orders, orderItems, warehouseStock, coverageData, daysWindow, residualStockThreshold, weekExclusions, saltilloWarehouseIds]);

    const filteredPlanningData = useMemo(() => {
        if (!skuFilter.trim()) return planningData;
        const term = skuFilter.toLowerCase().trim();
        return planningData.filter(item =>
            item.product.sku?.toLowerCase().includes(term) ||
            item.product.name?.toLowerCase().includes(term)
        );
    }, [planningData, skuFilter]);

    const kpis = useMemo(() => {
        const totalProducts = planningData.length;
        const totalSalesVolume = planningData.reduce((sum, item) => sum + item.totalSales, 0);
        const totalDemandRate = planningData.reduce((sum, item) => sum + item.finalWeeklyDemand, 0);
        const outOfStockProducts = planningData.filter(item => item.outOfStockWeeksCount > 0).length;

        return {
            totalProducts,
            totalSalesVolume,
            totalDemandRate,
            outOfStockProducts
        };
    }, [planningData]);

    const toggleWeekExclusion = (productId, weekIndex) => {
        const key = `${productId}-${weekIndex}`;
        setWeekExclusions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSyncToCobertura = async (singleProductId = null) => {
        if (!selectedWarehouse) return;
        setSyncingToCobertura(true);

        try {
            const itemsToSync = singleProductId
                ? planningData.filter(p => p.product.id === singleProductId)
                : planningData;

            const targetWarehouseIds = selectedWarehouse.isCombined
                ? saltilloWarehouseIds
                : [selectedWarehouse.id];

            let totalUpdated = 0;

            for (const item of itemsToSync) {
                for (const whId of targetWarehouseIds) {
                    const { error } = await supabase
                        .from('coverage_inventory')
                        .upsert({
                            warehouse_id: whId,
                            product_id: item.product.id,
                            weekly_demand: item.finalWeeklyDemand,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'warehouse_id,product_id' });

                    if (!error) totalUpdated++;
                }
            }

            showToast(
                singleProductId
                    ? 'Demanda del producto sincronizada exitosamente a Cobertura'
                    : `Demanda de ${itemsToSync.length} productos sincronizada a Cobertura`,
                'success'
            );

            const covRes = await supabase.from('coverage_inventory').select('*');
            if (covRes.data) setCoverageData(covRes.data);

        } catch (err) {
            showToast('Error al sincronizar con Cobertura: ' + (err.message || err), 'error');
        } finally {
            setSyncingToCobertura(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500 text-sm font-semibold gap-3">
                <RefreshCw size={28} className="animate-spin text-[#6a9a04]" />
                <span>Cargando Módulo de Planeación de Demanda...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-slate-800">
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all animate-bounce ${
                    toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white border border-[#6a9a04]'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} className="text-[#88c408]" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#6a9a04]/10 rounded-xl text-[#6a9a04]">
                            <TrendingUp size={22} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Planeación de Demanda
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Venta POS + Distribuidores
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl">
                        Calcula la velocidad de consumo real (unidades / semana) aislando periodos en desabasto e inventario fantasma. Sincroniza la demanda real hacia el módulo de Cobertura bajo tu decisión.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                        onClick={() => router.push('/dashboard/cobertura')}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                    >
                        <ShieldCheck size={15} />
                        <span>Ir a Cobertura</span>
                    </button>

                    <button
                        onClick={() => handleSyncToCobertura()}
                        disabled={syncingToCobertura}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-[#6a9a04] hover:bg-[#588203] shadow-md shadow-[#6a9a04]/20 transition cursor-pointer disabled:opacity-50"
                    >
                        {syncingToCobertura ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                        <span>🔄 Sincronizar Demanda a Cobertura</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <MapPin size={13} className="text-[#88c408]" /> Bodega / Sede
                        </label>
                        <select
                            value={selectedWarehouse?.id || ''}
                            onChange={(e) => {
                                const wh = warehouses.find(w => w.id === e.target.value);
                                if (wh) setSelectedWarehouse(wh);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#88c408] focus:outline-none"
                        >
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#88c408]" /> Ventana Histórica
                        </label>
                        <select
                            value={daysWindow}
                            onChange={(e) => setDaysWindow(parseInt(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#88c408] focus:outline-none"
                        >
                            <option value={30}>Últimos 30 días (~4 semanas)</option>
                            <option value={60}>Últimos 60 días (~8 semanas) - Recomendado</option>
                            <option value={90}>Últimos 90 días (~13 semanas)</option>
                            <option value={180}>Últimos 180 días (~26 semanas)</option>
                            <option value={365}>Último Año (365 días)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Sliders size={13} className="text-[#88c408]" /> Umbral Stock Fantasma
                            </span>
                            <span className="text-[10px] text-emerald-400 font-black">≤ {residualStockThreshold} pzas</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            value={residualStockThreshold}
                            onChange={(e) => setResidualStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#88c408] focus:outline-none"
                            placeholder="Ej. 2 pzas"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <Filter size={13} className="text-[#88c408]" /> Filtrar SKU / Producto
                        </label>
                        <input
                            type="text"
                            value={skuFilter}
                            onChange={(e) => setSkuFilter(e.target.value)}
                            placeholder="Buscar por SKU o Nombre..."
                            className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-xl px-3 py-2 placeholder:text-slate-500 focus:ring-2 focus:ring-[#88c408] focus:outline-none"
                        />
                    </div>

                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <Info size={14} className="text-[#88c408] shrink-0" />
                    <span>
                        Las semanas en las que el stock estuvo por debajo o igual a {residualStockThreshold} pzas y no registraron ventas son descartadas del cálculo para obtener la demanda real.
                    </span>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Package size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SKUs Analizados</div>
                        <div className="text-lg font-black text-slate-900">{kpis.totalProducts}</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <ShoppingBag size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salidas Totales ({daysWindow} días)</div>
                        <div className="text-lg font-black text-slate-900">{kpis.totalSalesVolume.toLocaleString()} unidades</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SKUs con Periodos de Desabasto</div>
                        <div className="text-lg font-black text-amber-600">{kpis.outOfStockProducts} SKUs</div>
                    </div>
                </div>
            </div>

            {/* Main Planning Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                            Tabla de Análisis de Consumo y Demanda Semanal Real
                        </h2>
                        <span className="text-xs font-semibold text-slate-400">
                            ({filteredPlanningData.length} productos)
                        </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                        Sede activa: <strong className="text-slate-800">{selectedWarehouse?.name}</strong>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                <th className="p-3 pl-4">SKU / Producto</th>
                                <th className="p-3 text-center">Stock Actual</th>
                                <th className="p-3 text-center">Ventas Mostrador</th>
                                <th className="p-3 text-center">Ventas Distribuidor</th>
                                <th className="p-3 text-center bg-slate-100/70">Total Ventas</th>
                                <th className="p-3 text-center">Semanas Activas</th>
                                <th className="p-3 text-center bg-emerald-50 text-emerald-900">Demanda Real Calculada</th>
                                <th className="p-3 text-center">En Cobertura Actual</th>
                                <th className="p-3 text-right pr-4">Acciones</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredPlanningData.map((row) => {
                                const isMismatch = row.existingCoverageDemand !== row.finalWeeklyDemand;

                                return (
                                    <tr key={row.product.id} className="hover:bg-slate-50/80 transition group">
                                        
                                        <td className="p-3 pl-4">
                                            <div className="font-bold text-slate-900">{row.product.sku}</div>
                                            <div className="text-[11px] text-slate-500 line-clamp-1">{row.product.name}</div>
                                            {row.isNewProduct && (
                                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-700">
                                                    ✨ Producto Nuevo / Lanzamiento
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-3 text-center font-bold">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                                                row.currentStock <= 0 ? 'bg-red-100 text-red-700' :
                                                row.currentStock <= residualStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {row.currentStock} u
                                            </span>
                                        </td>

                                        <td className="p-3 text-center font-semibold text-slate-600">
                                            {row.posQty > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                                    <Store size={12} className="text-blue-500" /> {row.posQty}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>

                                        <td className="p-3 text-center font-semibold text-slate-600">
                                            {row.distQty > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                                    <ShoppingBag size={12} className="text-purple-500" /> {row.distQty}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>

                                        <td className="p-3 text-center font-black bg-slate-50 text-slate-900">
                                            {row.totalSales} u
                                        </td>

                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-slate-800">
                                                    {row.activeWeeksCount} / {row.totalWeeksInWindow} sem
                                                </span>
                                                {row.outOfStockWeeksCount > 0 && (
                                                    <span className="text-[9px] font-bold text-amber-600">
                                                        ({row.outOfStockWeeksCount} sem desabasto)
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-3 text-center bg-emerald-50/50 font-black">
                                            <span className="text-sm font-black text-emerald-800">
                                                {row.finalWeeklyDemand}
                                            </span>
                                            <span className="text-[10px] text-emerald-800/60 block">u / semana</span>
                                        </td>

                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`font-bold text-xs ${isMismatch ? 'text-amber-600 font-black' : 'text-slate-600'}`}>
                                                    {row.existingCoverageDemand} u/sem
                                                </span>
                                                {isMismatch && (
                                                    <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                                        ⚠️ Pendiente Sync
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-3 text-right pr-4 space-x-1">
                                            <button
                                                onClick={() => setModalProduct(row)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                                                title="Ver desglose semana por semana"
                                            >
                                                <Eye size={12} />
                                                <span>Desglose</span>
                                            </button>

                                            <button
                                                onClick={() => handleSyncToCobertura(row.product.id)}
                                                disabled={syncingToCobertura}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white bg-[#6a9a04] hover:bg-[#588203] shadow-sm transition cursor-pointer disabled:opacity-50"
                                                title="Sincronizar a Cobertura solo este SKU"
                                            >
                                                <Save size={12} />
                                                <span>Sync</span>
                                            </button>
                                        </td>

                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Desglose Semanal */}
            {modalProduct && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100">
                        
                        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black uppercase text-[#88c408] tracking-wider">Desglose Semanal por SKU</div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <span>{modalProduct.product.name}</span>
                                    <span className="text-xs font-semibold text-slate-400">({modalProduct.product.sku})</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalProduct(null)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between items-center">
                                <div>
                                    <span className="text-slate-500 font-semibold">Stock Actual:</span>{' '}
                                    <strong className="text-slate-900">{modalProduct.currentStock} u</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500 font-semibold">Demanda Calculada:</span>{' '}
                                    <strong className="text-emerald-700 font-black">{modalProduct.calculatedWeeklyDemand} u/sem</strong>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600">
                                Puedes apagar semanas específicas manualmente si sabes que en esa fecha hubo material de muestra o inservible que no se pudo vender.
                            </p>

                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2.5 pl-3">Semana</th>
                                            <th className="p-2.5 text-center">Ventas POS</th>
                                            <th className="p-2.5 text-center">Ventas Distrib.</th>
                                            <th className="p-2.5 text-center font-black">Total Ventas</th>
                                            <th className="p-2.5 text-center">Estado Automático</th>
                                            <th className="p-2.5 text-right pr-3">Activar/Desactivar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {modalProduct.weeklyBreakdown.map((w) => {
                                            const key = `${modalProduct.product.id}-${w.weekIndex}`;
                                            const isManuallyExcluded = weekExclusions[key] === true;
                                            const isActive = !isManuallyExcluded && !w.isAutoOutOfStock;

                                            return (
                                                <tr key={w.weekIndex} className={`hover:bg-slate-50 ${!isActive ? 'bg-red-50/50' : ''}`}>
                                                    <td className="p-2.5 pl-3">
                                                        <div className="font-bold text-slate-800">Semana {w.weekIndex + 1}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {w.weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {w.weekEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                        </div>
                                                    </td>

                                                    <td className="p-2.5 text-center font-semibold text-slate-600">{w.weekPos} u</td>
                                                    <td className="p-2.5 text-center font-semibold text-slate-600">{w.weekDist} u</td>
                                                    <td className="p-2.5 text-center font-black text-slate-900">{w.weekSales} u</td>

                                                    <td className="p-2.5 text-center">
                                                        {w.isAutoOutOfStock ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                                                🛑 Agotado (Stock ≤ {residualStockThreshold})
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                🟢 Con Ventas/Stock
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="p-2.5 text-right pr-3">
                                                        <button
                                                            onClick={() => toggleWeekExclusion(modalProduct.product.id, w.weekIndex)}
                                                            className={`px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer transition ${
                                                                isActive
                                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                            }`}
                                                        >
                                                            {isActive ? '✓ Incluida' : '✕ Excluida'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setModalProduct(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
