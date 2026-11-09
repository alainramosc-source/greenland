'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export function useEstadisticas() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [dateRange, setDateRange] = useState('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseStock, setWarehouseStock] = useState([]);
    const [hoveredMonth, setHoveredMonth] = useState(null);

    // Monthly Distributor Performance Matrix state
    const [matrixMetric, setMatrixMetric] = useState('revenue'); // 'revenue' | 'units' | 'orders'
    const [matrixRange, setMatrixRange] = useState(() => String(new Date().getFullYear())); // '2026', '2027', 'last6', 'last12', 'all'
    const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true);
    const [distSearch, setDistSearch] = useState('');
    const [distTrendFilter, setDistTrendFilter] = useState('all'); // 'all' | 'growing' | 'stable' | 'cooling' | 'inactive'
    const [expandedDistId, setExpandedDistId] = useState(null);

    useEffect(() => { checkAdminAndFetch(); }, []);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
        setIsAdmin(true);
        await fetchAllData();
    };

    const fetchAllData = async () => {
        setLoading(true);
        const [ordersRes, productsRes, profilesRes, itemsRes, whRes, wsRes] = await Promise.all([
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
            supabase.from('products').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('order_items').select('*, products(name, sku)'),
            supabase.from('warehouses').select('*').eq('is_active', true),
            supabase.from('warehouse_stock').select('*')
        ]);
        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
        setProfiles(profilesRes.data || []);
        setOrderItems(itemsRes.data || []);
        setWarehouses(whRes.data || []);
        setWarehouseStock(wsRes.data || []);
        setLoading(false);
    };

    const dateRangeValues = useMemo(() => {
        const now = new Date();
        let from = null;
        let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        switch (dateRange) {
            case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
            case 'week': from = new Date(now); from.setDate(now.getDate() - 7); break;
            case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'year': from = new Date(now.getFullYear(), 0, 1); break;
            case 'custom':
                from = customFrom ? new Date(customFrom) : null;
                to = customTo ? new Date(customTo + 'T23:59:59') : to;
                break;
            default: from = null; break;
        }
        return { from, to };
    }, [dateRange, customFrom, customTo]);

    const filteredOrders = useMemo(() => {
        const { from, to } = dateRangeValues;
        return orders.filter(o => {
            const d = new Date(o.created_at);
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }, [orders, dateRangeValues]);

    // --- KPIs ---
    const kpis = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const nonCancelled = filteredOrders.filter(o => !['cancelled', 'rejected'].includes(o.status));
        const totalRevenue = nonCancelled.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
        const activeDistributors = profiles.filter(p => p.role === 'distributor' && p.is_active).length;
        const avgTicket = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
        return { totalOrders, totalRevenue, pendingOrders, activeDistributors, avgTicket };
    }, [filteredOrders, profiles]);

    // --- Conversion Rate ---
    const conversionRate = useMemo(() => {
        const total = filteredOrders.length;
        if (total === 0) return { rate: 0, confirmed: 0, total: 0 };
        const confirmed = filteredOrders.filter(o => !['pending', 'cancelled', 'rejected'].includes(o.status)).length;
        return { rate: ((confirmed / total) * 100).toFixed(1), confirmed, total };
    }, [filteredOrders]);

    // --- Fulfillment Metrics ---
    const fulfillmentMetrics = useMemo(() => {
        const diffHours = (a, b) => {
            if (!a || !b) return null;
            const start = new Date(a);
            const end = new Date(b);
            if (end <= start) return 0;

            let totalMs = 0;
            const cursor = new Date(start);

            while (cursor < end) {
                const day = cursor.getDay();
                const hour = cursor.getHours();
                const isWeekendBlock =
                    (day === 6 && hour >= 14) ||
                    (day === 0) ||
                    (day === 1 && hour < 9);

                if (!isWeekendBlock) {
                    const nextHour = new Date(cursor);
                    nextHour.setHours(nextHour.getHours() + 1);
                    const sliceEnd = nextHour > end ? end : nextHour;
                    totalMs += sliceEnd - cursor;
                }

                cursor.setHours(cursor.getHours() + 1);
                cursor.setMinutes(0, 0, 0);
            }

            return totalMs / (1000 * 60 * 60);
        };

        const confirmTimes = [];
        const fulfillTimes = [];
        const leadTimes = [];

        filteredOrders.forEach(o => {
            if (o.confirmed_at) {
                const h = diffHours(o.created_at, o.confirmed_at);
                if (h !== null && h >= 0) confirmTimes.push(h);
            }
            if (o.confirmed_at && o.shipped_at) {
                const h = diffHours(o.confirmed_at, o.shipped_at);
                if (h !== null && h >= 0) fulfillTimes.push(h);
            }
            if (o.shipped_at) {
                const h = diffHours(o.created_at, o.shipped_at);
                if (h !== null && h >= 0) leadTimes.push(h);
            }
        });

        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const fmtTime = (hours) => {
            if (hours === null) return '—';
            if (hours < 1) return `${Math.round(hours * 60)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} días`;
        };

        return {
            avgConfirmTime: fmtTime(avg(confirmTimes)),
            avgFulfillTime: fmtTime(avg(fulfillTimes)),
            avgLeadTime: fmtTime(avg(leadTimes)),
            confirmCount: confirmTimes.length,
            fulfillCount: fulfillTimes.length,
            leadCount: leadTimes.length
        };
    }, [filteredOrders]);

    // --- Status Breakdown ---
    const statusBreakdown = useMemo(() => {
        const counts = { pending: 0, confirmed: 0, in_fulfillment: 0, shipped: 0, closed: 0, cancelled: 0, rejected: 0 };
        filteredOrders.forEach(o => { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });
        return counts;
    }, [filteredOrders]);

    // --- Top Products ---
    const topProducts = useMemo(() => {
        const confirmedOrderIds = new Set(
            filteredOrders.filter(o => !['cancelled', 'rejected', 'pending'].includes(o.status)).map(o => o.id)
        );
        const prodMap = {};
        orderItems.forEach(item => {
            if (!confirmedOrderIds.has(item.order_id)) return;
            const pid = item.product_id;
            if (!prodMap[pid]) prodMap[pid] = { qty: 0, revenue: 0 };
            prodMap[pid].qty += item.quantity;
            prodMap[pid].revenue += parseFloat(item.subtotal) || (item.quantity * parseFloat(item.unit_price));
        });
        return Object.entries(prodMap)
            .map(([id, data]) => {
                const p = products.find(pr => pr.id === id);
                return { name: p?.name || 'Producto', sku: p?.sku || '—', ...data };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [filteredOrders, orderItems, products]);

    // --- Top Distributors ---
    const topDistributors = useMemo(() => {
        const distMap = {};
        filteredOrders.forEach(order => {
            const id = order.distributor_id;
            if (!distMap[id]) distMap[id] = { count: 0, revenue: 0 };
            distMap[id].count++;
            if (!['cancelled', 'rejected'].includes(order.status)) {
                distMap[id].revenue += parseFloat(order.total_amount) || 0;
            }
        });
        return Object.entries(distMap)
            .map(([id, data]) => {
                const profile = profiles.find(p => p.id === id);
                return { name: profile?.full_name || 'Desconocido', city: profile?.city || '—', ...data };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [filteredOrders, profiles]);

    // --- City Heatmap ---
    const cityHeatmap = useMemo(() => {
        const cityMap = {};
        filteredOrders.forEach(order => {
            const profile = profiles.find(p => p.id === order.distributor_id);
            const city = profile?.city || 'Sin ciudad';
            if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0, distributors: new Set() };
            cityMap[city].orders++;
            cityMap[city].distributors.add(order.distributor_id);
            if (!['cancelled', 'rejected'].includes(order.status)) {
                cityMap[city].revenue += parseFloat(order.total_amount) || 0;
            }
        });
        return Object.entries(cityMap)
            .map(([city, data]) => ({
                city,
                orders: data.orders,
                revenue: data.revenue,
                distributors: data.distributors.size,
                avgTicket: data.orders > 0 ? data.revenue / data.orders : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders, profiles]);
    const maxCityRevenue = Math.max(...cityHeatmap.map(c => c.revenue), 1);

    // --- Warehouse Sales ---
    const warehouseSales = useMemo(() => {
        const whMap = {};
        warehouses.forEach(wh => {
            whMap[wh.id] = { name: wh.name, items: 0, revenue: 0, totalStock: 0 };
        });

        warehouseStock.forEach(ws => {
            if (whMap[ws.warehouse_id]) {
                whMap[ws.warehouse_id].totalStock += (ws.stock_quantity || 0);
            }
        });

        const confirmedOrderIds = new Set(
            filteredOrders.filter(o => !['cancelled', 'rejected', 'pending'].includes(o.status)).map(o => o.id)
        );
        orderItems.forEach(item => {
            if (!confirmedOrderIds.has(item.order_id) || !item.warehouse_id) return;
            if (whMap[item.warehouse_id]) {
                whMap[item.warehouse_id].items += item.quantity;
                whMap[item.warehouse_id].revenue += parseFloat(item.subtotal) || (item.quantity * parseFloat(item.unit_price));
            }
        });

        return Object.values(whMap);
    }, [warehouses, warehouseStock, filteredOrders, orderItems]);

    // --- Monthly Revenue Chart ---
    const monthlyRevenue = useMemo(() => {
        const rev = new Array(12).fill(0);
        orders.filter(o => !['cancelled', 'rejected'].includes(o.status)).forEach(o => {
            const d = new Date(o.created_at);
            if (d.getFullYear() === new Date().getFullYear()) {
                rev[d.getMonth()] += parseFloat(o.total_amount) || 0;
            }
        });
        return rev;
    }, [orders]);
    const maxMonthly = Math.max(...monthlyRevenue, 1);

    // --- Distributor Month-over-Month Performance Matrix ---
    const distributorMatrixData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthIdx = now.getMonth();
        const mNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

        const startYear = 2026;
        const startMonth = 2; // March (0-indexed)
        const fullHistoryCols = [];
        const availableYears = [];
        for (let yr = startYear; yr <= currentYear; yr++) {
            availableYears.push(String(yr));
        }

        let y = startYear;
        let m = startMonth;
        while (y < currentYear || (y === currentYear && m <= currentMonthIdx)) {
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            const isCurrent = (y === currentYear && m === currentMonthIdx);
            fullHistoryCols.push({
                key,
                year: y,
                monthIdx: m,
                label: mNames[m],
                fullLabel: `${mNames[m]} ${String(y).slice(2)}`,
                isCurrent
            });
            m++;
            if (m > 11) { m = 0; y++; }
        }

        let allMonthCols = fullHistoryCols;
        if (matrixRange === 'last6') {
            allMonthCols = fullHistoryCols.slice(-(includeCurrentMonth ? 6 : 7));
        } else if (matrixRange === 'last12') {
            allMonthCols = fullHistoryCols.slice(-(includeCurrentMonth ? 12 : 13));
        } else if (/^\d{4}$/.test(matrixRange)) {
            const targetYr = parseInt(matrixRange, 10);
            allMonthCols = fullHistoryCols.filter(c => c.year === targetYr);
        }

        const spansMultipleYears = new Set(allMonthCols.map(c => c.year)).size > 1;
        const closedMonthCols = allMonthCols.filter(c => !c.isCurrent);
        const visibleMonthCols = includeCurrentMonth ? allMonthCols : closedMonthCols;
        const evalMonthCols = closedMonthCols.length > 0 ? closedMonthCols : visibleMonthCols;
        const numClosedMonths = Math.max(evalMonthCols.length, 1);

        const unitsByOrder = {};
        const itemsByOrder = {};
        orderItems.forEach(item => {
            const oid = item.order_id;
            const qty = Number(item.quantity) || 0;
            const rev = parseFloat(item.subtotal) || (qty * (parseFloat(item.unit_price) || 0));
            unitsByOrder[oid] = (unitsByOrder[oid] || 0) + qty;
            if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
            itemsByOrder[oid].push({
                product_id: item.product_id,
                sku: item.products?.sku || products.find(p => p.id === item.product_id)?.sku || '—',
                name: item.products?.name || products.find(p => p.id === item.product_id)?.name || 'Producto',
                qty,
                rev
            });
        });

        const validOrders = orders.filter(o => !['cancelled', 'rejected'].includes(o.status));
        const distProfiles = profiles.filter(p => p.role === 'distributor');
        const distMap = {};

        distProfiles.forEach(p => {
            distMap[p.id] = {
                id: p.id,
                name: p.full_name || 'Sin nombre',
                clientNumber: p.client_number || '',
                city: p.city || 'Sin ciudad',
                isActiveProfile: p.is_active !== false,
                months: {},
                lastOrderDate: null,
                firstOrderDate: null,
                skuMap: {}
            };
            allMonthCols.forEach(c => {
                distMap[p.id].months[c.key] = { revenue: 0, units: 0, orders: 0 };
            });
        });

        validOrders.forEach(o => {
            const d = new Date(o.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const distId = o.distributor_id;
            if (!distId) return;

            if (!distMap[distId]) {
                const prof = profiles.find(p => p.id === distId);
                distMap[distId] = {
                    id: distId,
                    name: prof?.full_name || 'Distribuidor',
                    clientNumber: prof?.client_number || '',
                    city: prof?.city || 'Sin ciudad',
                    isActiveProfile: true,
                    months: {},
                    lastOrderDate: null,
                    firstOrderDate: null,
                    skuMap: {}
                };
                allMonthCols.forEach(c => {
                    distMap[distId].months[c.key] = { revenue: 0, units: 0, orders: 0 };
                });
            }

            const entry = distMap[distId];
            const rev = parseFloat(o.total_amount) || 0;
            const units = unitsByOrder[o.id] || 0;

            if (entry.months[key]) {
                entry.months[key].revenue += rev;
                entry.months[key].units += units;
                entry.months[key].orders += 1;
            }

            if (!entry.lastOrderDate || d > entry.lastOrderDate) entry.lastOrderDate = d;
            if (!entry.firstOrderDate || d < entry.firstOrderDate) entry.firstOrderDate = d;

            (itemsByOrder[o.id] || []).forEach(it => {
                if (!entry.skuMap[it.sku]) {
                    entry.skuMap[it.sku] = { sku: it.sku, name: it.name, qty: 0, rev: 0 };
                }
                entry.skuMap[it.sku].qty += it.qty;
                entry.skuMap[it.sku].rev += it.rev;
            });
        });

        const rows = Object.values(distMap)
            .map(d => {
                let closedRev = 0, closedUnits = 0, closedOrders = 0, activeClosedMonths = 0;
                let totalRev = 0, totalUnits = 0, totalOrders = 0;
                let bestMonth = { label: '—', revenue: 0, units: 0, orders: 0 };

                evalMonthCols.forEach(c => {
                    const mData = d.months[c.key] || { revenue: 0, units: 0, orders: 0 };
                    closedRev += mData.revenue;
                    closedUnits += mData.units;
                    closedOrders += mData.orders;
                    if (mData.orders > 0) activeClosedMonths++;
                    if (mData.revenue > bestMonth.revenue) {
                        bestMonth = { label: spansMultipleYears ? c.fullLabel : c.label, revenue: mData.revenue, units: mData.units, orders: mData.orders };
                    }
                });

                visibleMonthCols.forEach(c => {
                    const mData = d.months[c.key] || { revenue: 0, units: 0, orders: 0 };
                    totalRev += mData.revenue;
                    totalUnits += mData.units;
                    totalOrders += mData.orders;
                });

                const avgMonthlyRev = closedRev / numClosedMonths;
                const avgMonthlyUnits = closedUnits / numClosedMonths;
                const avgMonthlyOrders = closedOrders / numClosedMonths;
                const avgActiveMonthRev = activeClosedMonths > 0 ? closedRev / activeClosedMonths : 0;
                const avgTicket = totalOrders > 0 ? totalRev / totalOrders : 0;

                const daysSinceLastOrder = d.lastOrderDate
                    ? Math.max(0, Math.floor((now - d.lastOrderDate) / (1000 * 60 * 60 * 24)))
                    : null;

                const last2Cols = evalMonthCols.slice(-2);
                const prevCols = evalMonthCols.slice(0, Math.max(0, evalMonthCols.length - 2));
                const last2Avg = last2Cols.length > 0
                    ? last2Cols.reduce((s, c) => s + (d.months[c.key]?.revenue || 0), 0) / last2Cols.length
                    : 0;
                const prevAvg = prevCols.length > 0
                    ? prevCols.reduce((s, c) => s + (d.months[c.key]?.revenue || 0), 0) / prevCols.length
                    : 0;

                let trend = 'inactive';
                let trendPct = 0;
                if (totalOrders === 0 || (daysSinceLastOrder !== null && daysSinceLastOrder > 45)) {
                    trend = 'inactive';
                    trendPct = prevAvg > 0 ? Math.round(((last2Avg - prevAvg) / prevAvg) * 100) : -100;
                } else if (prevAvg === 0 && last2Avg > 0) {
                    trend = 'growing';
                    trendPct = 100;
                } else if (prevAvg > 0) {
                    trendPct = Math.round(((last2Avg - prevAvg) / prevAvg) * 100);
                    if (trendPct >= 15) trend = 'growing';
                    else if (trendPct <= -25) trend = 'cooling';
                    else trend = 'stable';
                } else {
                    trend = 'stable';
                }

                const topSkus = Object.values(d.skuMap)
                    .sort((a, b) => b.rev - a.rev)
                    .slice(0, 5);

                return {
                    ...d,
                    closedRev,
                    closedUnits,
                    closedOrders,
                    activeClosedMonths,
                    numClosedMonths,
                    totalRev,
                    totalUnits,
                    totalOrders,
                    avgMonthlyRev,
                    avgMonthlyUnits,
                    avgMonthlyOrders,
                    avgActiveMonthRev,
                    avgTicket,
                    bestMonth,
                    daysSinceLastOrder,
                    trend,
                    trendPct,
                    topSkus
                };
            })
            .filter(r => r.totalOrders > 0 || r.isActiveProfile)
            .sort((a, b) => {
                if (matrixMetric === 'units') return b.totalUnits - a.totalUnits;
                if (matrixMetric === 'orders') return b.totalOrders - a.totalOrders;
                return b.totalRev - a.totalRev;
            });

        const monthTotals = {};
        visibleMonthCols.forEach(c => {
            monthTotals[c.key] = { revenue: 0, units: 0, orders: 0, activeDists: 0 };
            rows.forEach(r => {
                const mData = r.months[c.key] || { revenue: 0, units: 0, orders: 0 };
                monthTotals[c.key].revenue += mData.revenue;
                monthTotals[c.key].units += mData.units;
                monthTotals[c.key].orders += mData.orders;
                if (mData.orders > 0) monthTotals[c.key].activeDists += 1;
            });
        });

        const grandTotals = {
            revenue: rows.reduce((s, r) => s + r.totalRev, 0),
            units: rows.reduce((s, r) => s + r.totalUnits, 0),
            orders: rows.reduce((s, r) => s + r.totalOrders, 0),
            closedRev: rows.reduce((s, r) => s + r.closedRev, 0),
            closedUnits: rows.reduce((s, r) => s + r.closedUnits, 0),
            closedOrders: rows.reduce((s, r) => s + r.closedOrders, 0),
        };

        return {
            availableYears,
            spansMultipleYears,
            allMonthCols,
            closedMonthCols,
            visibleMonthCols,
            numClosedMonths,
            rows,
            monthTotals,
            grandTotals
        };
    }, [orders, orderItems, profiles, products, includeCurrentMonth, matrixMetric, matrixRange]);

    const filteredMatrixRows = useMemo(() => {
        return distributorMatrixData.rows.filter(r => {
            if (distTrendFilter !== 'all' && r.trend !== distTrendFilter) return false;
            if (distSearch.trim()) {
                const q = distSearch.toLowerCase();
                if (
                    !r.name.toLowerCase().includes(q) &&
                    !r.city.toLowerCase().includes(q) &&
                    !(r.clientNumber || '').toLowerCase().includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [distributorMatrixData.rows, distTrendFilter, distSearch]);

    const handleExportDistributorMatrixXLSX = () => {
        const { visibleMonthCols, spansMultipleYears, rows, numClosedMonths } = distributorMatrixData;
        const buildSheetRows = (metricKey) => rows.map(r => {
            const rowObj = {
                'Distribuidor': r.name,
                'No. Cliente': r.clientNumber || '—',
                'Ciudad': r.city,
            };
            visibleMonthCols.forEach(c => {
                const val = r.months[c.key]?.[metricKey] || 0;
                const colHeader = spansMultipleYears ? c.fullLabel : c.label;
                rowObj[c.isCurrent ? `${colHeader} (En curso)` : colHeader] = Math.round(val * 100) / 100;
            });
            const totalVal = metricKey === 'revenue' ? r.totalRev : metricKey === 'units' ? r.totalUnits : r.totalOrders;
            const avgClosedVal = metricKey === 'revenue' ? r.avgMonthlyRev : metricKey === 'units' ? r.avgMonthlyUnits : r.avgMonthlyOrders;
            rowObj['Total Acumulado'] = Math.round(totalVal * 100) / 100;
            rowObj[`Prom. Mensual (${numClosedMonths}m cerrados)`] = Math.round(avgClosedVal * 100) / 100;
            rowObj['Meses Activos'] = `${r.activeClosedMonths}/${numClosedMonths}`;
            rowObj['Ticket Promedio ($)'] = Math.round(r.avgTicket * 100) / 100;
            rowObj['Mejor Mes'] = `${r.bestMonth.label} ($${Math.round(r.bestMonth.revenue).toLocaleString('es-MX')})`;
            rowObj['Tendencia'] = r.trend === 'growing' ? `En crecimiento (${r.trendPct >= 0 ? '+' : ''}${r.trendPct}%)` : r.trend === 'cooling' ? `En enfriamiento (${r.trendPct}%)` : r.trend === 'stable' ? 'Estable' : 'Inactivo (+45d)';
            rowObj['Días desde último pedido'] = r.daysSinceLastOrder !== null ? r.daysSinceLastOrder : 'Sin pedidos';
            return rowObj;
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheetRows('revenue')), 'Ingresos_MXN');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheetRows('units')), 'Unidades_Piezas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheetRows('orders')), 'Numero_Pedidos');
        XLSX.writeFile(wb, `rendimiento_mensual_distribuidores_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleExport = () => {
        let csv = 'Reporte Greenland - Estadísticas\n\n';
        csv += 'KPIs\n';
        csv += `Total Pedidos,${kpis.totalOrders}\n`;
        csv += `Ingresos,${kpis.totalRevenue}\n`;
        csv += `Ticket Promedio,${kpis.avgTicket.toFixed(2)}\n`;
        csv += `Tasa Conversión,${conversionRate.rate}%\n\n`;

        csv += 'Métricas de Surtimiento\n';
        csv += `Tiempo Confirmación,${fulfillmentMetrics.avgConfirmTime}\n`;
        csv += `Tiempo Surtido,${fulfillmentMetrics.avgFulfillTime}\n`;
        csv += `Lead Time Total,${fulfillmentMetrics.avgLeadTime}\n\n`;

        csv += 'Top Productos\nProducto,SKU,Vendidos,Ingresos\n';
        topProducts.forEach(p => { csv += `${p.name},${p.sku},${p.qty},${p.revenue.toFixed(2)}\n`; });

        csv += '\nVentas por Ciudad\nCiudad,Pedidos,Ingresos,Distribuidores\n';
        cityHeatmap.forEach(c => { csv += `${c.city},${c.orders},${c.revenue.toFixed(2)},${c.distributors}\n`; });

        csv += '\nTop Distribuidores\nNombre,Ciudad,Pedidos,Ingresos\n';
        topDistributors.forEach(d => { csv += `${d.name},${d.city},${d.count},${d.revenue.toFixed(2)}\n`; });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_greenland_${dateRange}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    return {
        loading,
        isAdmin,
        dateRange, setDateRange,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        hoveredMonth, setHoveredMonth,
        kpis,
        conversionRate,
        fulfillmentMetrics,
        statusBreakdown,
        topProducts,
        topDistributors,
        cityHeatmap,
        maxCityRevenue,
        warehouseSales,
        monthlyRevenue,
        maxMonthly,
        matrixMetric, setMatrixMetric,
        matrixRange, setMatrixRange,
        includeCurrentMonth, setIncludeCurrentMonth,
        distSearch, setDistSearch,
        distTrendFilter, setDistTrendFilter,
        expandedDistId, setExpandedDistId,
        distributorMatrixData,
        filteredMatrixRows,
        fetchAllData,
        handleExport,
        handleExportDistributorMatrixXLSX,
        fmt
    };
}
