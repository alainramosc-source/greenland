'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, DollarSign, Clock, AlertTriangle, Users, TrendingUp, TrendingDown,
    Calendar, RefreshCw, BarChart3, MapPin, ShoppingCart, Box, Download,
    Warehouse, Timer, CheckCircle, Truck, ArrowRight, Zap, ChevronDown, ChevronUp, Search, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function EstadisticasPage() {
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
        // Excludes weekend block: Saturday 14:00 → Monday 09:00 (43 hrs)
        // All other hours (weekday nights, etc.) count normally
        const diffHours = (a, b) => {
            if (!a || !b) return null;
            const start = new Date(a);
            const end = new Date(b);
            if (end <= start) return 0;

            let totalMs = 0;
            const cursor = new Date(start);

            while (cursor < end) {
                const day = cursor.getDay(); // 0=Sun, 6=Sat
                const hour = cursor.getHours();

                // Check if current hour is in the weekend block:
                // Saturday 14:00+ OR all Sunday OR Monday before 9:00
                const isWeekendBlock =
                    (day === 6 && hour >= 14) ||  // Saturday 2pm+
                    (day === 0) ||                  // All Sunday
                    (day === 1 && hour < 9);        // Monday before 9am

                if (!isWeekendBlock) {
                    // Count this hour (or partial hour at boundaries)
                    const nextHour = new Date(cursor);
                    nextHour.setHours(nextHour.getHours() + 1);
                    const sliceEnd = nextHour > end ? end : nextHour;
                    totalMs += sliceEnd - cursor;
                }

                // Advance to next hour
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

        // Count stock per warehouse
        warehouseStock.forEach(ws => {
            if (whMap[ws.warehouse_id]) {
                whMap[ws.warehouse_id].totalStock += (ws.stock_quantity || 0);
            }
        });

        // Count dispatched items by warehouse
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

    // --- Distributor Month-over-Month Performance Matrix (Since Portal Launch: March 2026) ---
    const distributorMatrixData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthIdx = now.getMonth(); // 0-based (10 = Nov)
        const mNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

        // Build all month columns from March 2026 (month index 2) up to current month
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

        // Filter month columns according to selected matrixRange
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

        // Pre-aggregate units and product mix per order from orderItems
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

        // Map all valid orders (since March 2026) to distributors
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

                // Momentum / Trend: compare last 2 closed months vs earlier closed months in selected range
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
            // Keep distributors who have at least 1 order OR are active distributor profiles
            .filter(r => r.totalOrders > 0 || r.isActiveProfile)
            .sort((a, b) => {
                if (matrixMetric === 'units') return b.totalUnits - a.totalUnits;
                if (matrixMetric === 'orders') return b.totalOrders - a.totalOrders;
                return b.totalRev - a.totalRev;
            });

        // Monthly totals across all distributors
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

    // --- Export ---
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

    if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-slate-500"><div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" /></div>;
    if (!isAdmin) return null;

    const statusConfig = {
        pending: { label: 'Pendientes', color: '#f59e0b' },
        confirmed: { label: 'Confirmados', color: '#3b82f6' },
        in_fulfillment: { label: 'En Surtido', color: '#8b5cf6' },
        shipped: { label: 'Enviados', color: '#10b981' },
        closed: { label: 'Cerrados', color: '#6b7280' },
        cancelled: { label: 'Cancelados', color: '#ef4444' },
        rejected: { label: 'Rechazados', color: '#f97316' },
    };
    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 m-0">Centro de Inteligencia GreenLand</h2>
                        <p className="text-slate-500 mt-1 font-medium m-0">KPIs, eficiencia operativa y análisis geográfico en tiempo real</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Exportar Reporte
                        </button>
                        <button
                            onClick={fetchAllData}
                            className="bg-[#6a9a04] text-white flex items-center gap-2 px-5 py-2 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:scale-[1.02] transition-transform cursor-pointer border-none"
                        >
                            <RefreshCw className="w-4 h-4" /> Actualizar
                        </button>
                    </div>
                </header>

                {/* Date Filters */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-4 mb-8 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700 mr-2">Periodo:</span>
                        {['today', 'week', 'month', 'year', 'all'].map(key => (
                            <button
                                key={key}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-none ${dateRange === key ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                                onClick={() => setDateRange(key)}
                            >
                                {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo' }[key]}
                            </button>
                        ))}
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-none transition-all ${dateRange === 'custom' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                            onClick={() => setDateRange('custom')}
                        >Personalizado</button>
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 ml-4">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                                <span className="text-slate-400">—</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Total Pedidos</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.totalOrders}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><DollarSign className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ingresos</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.totalRevenue)}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><TrendingUp className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ticket Prom.</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.avgTicket)}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-4 h-4" /></span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Distribuidores</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.activeDistributors}</h3>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`p-2 rounded-lg ${parseFloat(conversionRate.rate) >= 70 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                <Zap className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Conversión</p>
                        <h3 className="text-2xl font-black text-slate-900 m-0">{conversionRate.rate}%</h3>
                        <p className="text-[10px] text-slate-400 m-0">{conversionRate.confirmed}/{conversionRate.total} pedidos</p>
                    </div>
                </div>

                {/* Fulfillment Metrics */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-8">
                    <h4 className="text-lg font-bold text-slate-900 m-0 mb-5 flex items-center gap-2">
                        <Timer className="w-5 h-5 text-[#6a9a04]" /> Eficiencia de Surtimiento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Confirm Time */}
                        <div className="flex items-center gap-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CheckCircle className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider m-0">Confirmación</p>
                                <p className="text-xs text-slate-500 m-0">Pedido → Confirmado</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgConfirmTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.confirmCount} pedidos medidos</p>
                            </div>
                        </div>
                        {/* Fulfill Time */}
                        <div className="flex items-center gap-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Package className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider m-0">Surtido</p>
                                <p className="text-xs text-slate-500 m-0">Confirmado → Enviado</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgFulfillTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.fulfillCount} pedidos medidos</p>
                            </div>
                        </div>
                        {/* Lead time */}
                        <div className="flex items-center gap-4 bg-green-50/50 rounded-xl p-4 border border-green-100">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Truck className="w-5 h-5" /></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider m-0">Lead Time Total</p>
                                <p className="text-xs text-slate-500 m-0">Pedido → Entrega a paquetería</p>
                                <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgLeadTime}</p>
                                <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.leadCount} pedidos medidos</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Bar Chart: Monthly Revenue */}
                    <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-8 rounded-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h4 className="text-lg font-bold text-slate-900 m-0">Ventas Mensuales</h4>
                            <span className="flex items-center gap-1 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#6a9a04]" /> {new Date().getFullYear()}</span>
                        </div>
                        <div className="flex items-end justify-between gap-2" style={{ height: '192px' }}>
                            {monthlyRevenue.map((rev, i) => {
                                const barH = Math.max((rev / maxMonthly) * 180, rev > 0 ? 6 : 0);
                                return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 cursor-default" style={{ height: '100%' }} onMouseEnter={() => setHoveredMonth(i)} onMouseLeave={() => setHoveredMonth(null)}>
                                    <div className="w-full relative" style={{ height: `${barH}px` }}>
                                        <div className={`absolute bottom-0 w-full bg-[#6a9a04] rounded-t-lg transition-all h-full ${hoveredMonth === i ? 'brightness-110' : ''}`} />
                                        {hoveredMonth === i && (
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                                                {fmt(rev)}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold ${i === new Date().getMonth() ? 'text-[#6a9a04]' : 'text-slate-400'}`}>{monthNames[i]}</span>
                                </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-6 rounded-2xl flex flex-col">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 m-0">Estado de Pedidos</h4>
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                            {Object.entries(statusBreakdown).filter(([, c]) => c > 0).map(([key, count]) => {
                                const cfg = statusConfig[key];
                                if (!cfg) return null;
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 min-w-[100px]">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                                            <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
                                        </div>
                                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{
                                                width: `${(count / maxStatusCount) * 100}%`,
                                                background: cfg.color,
                                                minWidth: count > 0 ? '8px' : '0'
                                            }} />
                                        </div>
                                        <span className="font-bold text-sm min-w-[30px] text-right" style={{ color: cfg.color }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* City Heatmap + Warehouse Sales */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
                    {/* City Heatmap */}
                    <div className="lg:col-span-3 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#6a9a04]" />
                            <h4 className="font-bold text-slate-900 m-0">Mapa de Calor por Ciudad</h4>
                        </div>
                        {cityHeatmap.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3">Ciudad</th>
                                            <th className="px-3 py-3 text-center">Pedidos</th>
                                            <th className="px-3 py-3 text-center">Dist.</th>
                                            <th className="px-3 py-3">Ingresos</th>
                                            <th className="px-3 py-3 text-right">Ticket</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cityHeatmap.map((row, i) => {
                                            const intensity = row.revenue / maxCityRevenue;
                                            const hue = intensity > 0.7 ? '106, 154, 4' : intensity > 0.3 ? '245, 158, 11' : '239, 68, 68';
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-8 rounded-full" style={{
                                                                background: `rgba(${hue}, ${0.3 + intensity * 0.7})`,
                                                                boxShadow: `0 0 8px rgba(${hue}, ${intensity * 0.4})`
                                                            }} />
                                                            <span className="font-bold text-sm text-slate-900">{row.city}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.orders}</td>
                                                    <td className="px-3 py-3 text-center text-sm text-slate-500">{row.distributors}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                                <div className="h-full rounded-full transition-all duration-700" style={{
                                                                    width: `${intensity * 100}%`,
                                                                    background: `rgba(${hue}, 0.85)`
                                                                }} />
                                                            </div>
                                                            <span className="font-bold text-xs text-slate-700">{fmt(row.revenue)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-xs font-bold text-slate-500">{fmt(row.avgTicket)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-slate-400 text-sm">Sin datos para este periodo</div>
                        )}
                    </div>

                    {/* Warehouse Sales */}
                    <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                            <Warehouse className="w-5 h-5 text-[#6a9a04]" />
                            <h4 className="font-bold text-slate-900 m-0">Despacho por Bodega</h4>
                        </div>
                        <div className="p-6 space-y-5">
                            {warehouseSales.map((wh, i) => (
                                <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-sm text-slate-900">{wh.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                            {wh.totalStock} en stock
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Items despachados</p>
                                            <p className="text-lg font-black text-slate-900 m-0">{wh.items}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ingresos</p>
                                            <p className="text-lg font-black text-[#6a9a04] m-0">{fmt(wh.revenue)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {warehouseSales.length === 0 && (
                                <p className="text-center text-slate-400 text-sm py-4">Sin bodegas configuradas</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Distributor Month-over-Month Performance Matrix (March -> Present) */}
                <div className="bg-white/70 backdrop-blur-md border border-white/60 shadow-sm rounded-2xl overflow-hidden mb-8">
                    <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-xl">
                                    <BarChart3 className="w-5 h-5" />
                                </span>
                                <div>
                                    <h4 className="text-lg font-black text-slate-900 m-0">
                                        Rendimiento Mensual de Distribuidores
                                    </h4>
                                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                                        Evolución mes a mes ({distributorMatrixData.numClosedMonths} meses cerrados{includeCurrentMonth ? ' + mes en curso' : ''}). Haz clic en un distribuidor para ver su mix de productos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Period / Year Range Selector */}
                            <select
                                value={matrixRange}
                                onChange={e => setMatrixRange(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 cursor-pointer"
                                title="Seleccionar rango de meses a visualizar"
                            >
                                {(distributorMatrixData.availableYears || ['2026']).map(yr => (
                                    <option key={yr} value={yr}>📅 Año {yr}</option>
                                ))}
                                <option value="last6">⏱️ Últimos 6 meses</option>
                                <option value="last12">📆 Últimos 12 meses</option>
                                <option value="all">🗂️ Todo el historial</option>
                            </select>

                            {/* Metric Toggle */}
                            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
                                {[
                                    { id: 'revenue', label: '💰 Monto ($)' },
                                    { id: 'units', label: '📦 Unidades' },
                                    { id: 'orders', label: '🧾 Pedidos' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setMatrixMetric(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                                            matrixMetric === tab.id
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'bg-transparent text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Include Current Month Toggle */}
                            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={includeCurrentMonth}
                                    onChange={e => setIncludeCurrentMonth(e.target.checked)}
                                    className="accent-[#6a9a04] rounded cursor-pointer"
                                />
                                <span>Incluir mes en curso</span>
                            </label>

                            {/* Excel Export */}
                            <button
                                type="button"
                                onClick={handleExportDistributorMatrixXLSX}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                title="Descargar Sábana Mensual en Excel (Ingresos, Unidades y Pedidos)"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Exportar Sábana Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Status Summary Pills & Search Filter */}
                    <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            {[
                                { id: 'all', label: `Todos (${distributorMatrixData.rows.length})`, cls: 'bg-slate-800 text-white' },
                                { id: 'growing', label: `🚀 Creciendo (${distributorMatrixData.rows.filter(r => r.trend === 'growing').length})`, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                                { id: 'stable', label: `➖ Estables (${distributorMatrixData.rows.filter(r => r.trend === 'stable').length})`, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                                { id: 'cooling', label: `📉 Enfriándose (${distributorMatrixData.rows.filter(r => r.trend === 'cooling').length})`, cls: 'bg-amber-100 text-amber-800 border-amber-200' },
                                { id: 'inactive', label: `⚠️ Inactivos +45d (${distributorMatrixData.rows.filter(r => r.trend === 'inactive').length})`, cls: 'bg-rose-100 text-rose-800 border-rose-200' },
                            ].map(pill => (
                                <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => setDistTrendFilter(pill.id)}
                                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                                        distTrendFilter === pill.id
                                            ? 'ring-2 ring-[#6a9a04] shadow-sm ' + pill.cls
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={distSearch}
                                onChange={e => setDistSearch(e.target.value)}
                                placeholder="Buscar distribuidor o ciudad..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30"
                            />
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 pl-5 pr-3 sticky left-0 bg-slate-100 z-10 min-w-[210px]">Distribuidor</th>
                                    {distributorMatrixData.visibleMonthCols.map(c => (
                                        <th key={c.key} className={`px-2.5 py-3 text-right min-w-[88px] ${c.isCurrent ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : ''}`}>
                                            <div>{distributorMatrixData.spansMultipleYears ? c.fullLabel : c.label}</div>
                                            {c.isCurrent && <div className="text-[8px] font-semibold normal-case opacity-80">En curso</div>}
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-right bg-slate-200/50 text-slate-800 min-w-[105px]">Total</th>
                                    <th className="px-3 py-3 text-right min-w-[95px]" title={`Promedio sobre los ${distributorMatrixData.numClosedMonths} meses cerrados del periodo`}>
                                        Prom / Mes
                                    </th>
                                    <th className="px-3 py-3 text-center min-w-[90px]" title="Meses con al menos 1 pedido dentro de los meses cerrados del periodo">
                                        Consistencia
                                    </th>
                                    <th className="px-3 py-3 text-center min-w-[115px]" title="Comparativa últimos 2 meses cerrados vs promedio previo">
                                        Tendencia
                                    </th>
                                    <th className="px-4 py-3 text-right min-w-[90px]">Últ. Pedido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredMatrixRows.length > 0 ? filteredMatrixRows.map((row) => {
                                    const isExpanded = expandedDistId === row.id;
                                    const rowTotal = matrixMetric === 'revenue' ? row.totalRev : matrixMetric === 'units' ? row.totalUnits : row.totalOrders;
                                    const rowAvg = matrixMetric === 'revenue' ? row.avgMonthlyRev : matrixMetric === 'units' ? row.avgMonthlyUnits : row.avgMonthlyOrders;
                                    const rowActiveAvg = row.activeClosedMonths > 0
                                        ? (matrixMetric === 'revenue' ? row.closedRev : matrixMetric === 'units' ? row.closedUnits : row.closedOrders) / row.activeClosedMonths
                                        : 0;

                                    const formatCell = (val) => {
                                        if (!val || val <= 0) return '—';
                                        if (matrixMetric === 'revenue') {
                                            return '$' + Math.round(val).toLocaleString('es-MX');
                                        }
                                        return val.toLocaleString('es-MX');
                                    };

                                    return (
                                        <React.Fragment key={row.id}>
                                            <tr
                                                onClick={() => setExpandedDistId(isExpanded ? null : row.id)}
                                                className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${isExpanded ? 'bg-[#6a9a04]/5' : ''}`}
                                            >
                                                {/* Distributor Name + City */}
                                                <td className="py-3 pl-5 pr-3 sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-100">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                                                <span>{row.name}</span>
                                                                {row.clientNumber && (
                                                                    <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                                        {row.clientNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 truncate">{row.city}</div>
                                                        </div>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                                    </div>
                                                </td>

                                                {/* Month Cells with Heatmap */}
                                                {distributorMatrixData.visibleMonthCols.map(c => {
                                                    const mData = row.months[c.key] || { revenue: 0, units: 0, orders: 0 };
                                                    const val = mData[matrixMetric] || 0;
                                                    let cellBg = '';
                                                    let textCls = 'text-slate-300';

                                                    if (val > 0) {
                                                        const ratio = rowActiveAvg > 0 ? val / rowActiveAvg : 1;
                                                        if (ratio >= 1.2) {
                                                            cellBg = 'rgba(106, 154, 4, 0.18)';
                                                            textCls = 'text-[#4d7003] font-black';
                                                        } else if (ratio >= 0.7) {
                                                            cellBg = 'rgba(106, 154, 4, 0.08)';
                                                            textCls = 'text-slate-800 font-bold';
                                                        } else {
                                                            cellBg = 'rgba(245, 158, 11, 0.10)';
                                                            textCls = 'text-amber-800 font-semibold';
                                                        }
                                                    }

                                                    return (
                                                        <td
                                                            key={c.key}
                                                            className={`px-2.5 py-3 text-right font-mono text-[11px] ${textCls} ${c.isCurrent ? 'border-l border-dashed border-[#6a9a04]/30' : ''}`}
                                                            style={cellBg ? { backgroundColor: cellBg } : undefined}
                                                            title={`${c.label}: ${fmt(mData.revenue)} • ${mData.units} pzas • ${mData.orders} ped.`}
                                                        >
                                                            {formatCell(val)}
                                                        </td>
                                                    );
                                                })}

                                                {/* Total */}
                                                <td className="px-3 py-3 text-right font-black text-slate-900 bg-slate-50/80 font-mono text-xs">
                                                    {matrixMetric === 'revenue' ? fmt(rowTotal) : rowTotal.toLocaleString('es-MX')}
                                                </td>

                                                {/* Average / Month */}
                                                <td className="px-3 py-3 text-right font-bold text-slate-600 font-mono text-[11px]">
                                                    {matrixMetric === 'revenue'
                                                        ? '$' + Math.round(rowAvg).toLocaleString('es-MX')
                                                        : rowAvg.toFixed(1)}
                                                </td>

                                                {/* Consistency (Active Months / 8) */}
                                                <td className="px-3 py-3 text-center">
                                                    <div className="inline-flex flex-col items-center gap-1">
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                            {row.activeClosedMonths}/{row.numClosedMonths} m
                                                        </span>
                                                        <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-[#6a9a04]"
                                                                style={{ width: `${(row.activeClosedMonths / row.numClosedMonths) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Trend Badge */}
                                                <td className="px-3 py-3 text-center">
                                                    {row.trend === 'growing' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            🚀 {row.trendPct > 0 ? `+${row.trendPct}%` : 'Creciendo'}
                                                        </span>
                                                    )}
                                                    {row.trend === 'stable' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            ➖ Estable
                                                        </span>
                                                    )}
                                                    {row.trend === 'cooling' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            📉 {row.trendPct}%
                                                        </span>
                                                    )}
                                                    {row.trend === 'inactive' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            ⚠️ Inactivo
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Days Since Last Order */}
                                                <td className="px-4 py-3 text-right">
                                                    {row.daysSinceLastOrder === null ? (
                                                        <span className="text-[10px] text-slate-400 italic">Sin pedidos</span>
                                                    ) : (
                                                        <span className={`text-[11px] font-bold ${
                                                            row.daysSinceLastOrder > 45
                                                                ? 'text-rose-600'
                                                                : row.daysSinceLastOrder > 25
                                                                    ? 'text-amber-600'
                                                                    : 'text-emerald-600'
                                                        }`}>
                                                            {row.daysSinceLastOrder === 0 ? 'Hoy' : `hace ${row.daysSinceLastOrder}d`}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Detail Row: Best Month, Ticket, and Product Mix */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                                    <td colSpan={distributorMatrixData.visibleMonthCols.length + 6} className="px-6 py-4">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                            {/* KPI Cards for this Distributor */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Mejor Mes</p>
                                                                    <p className="text-sm font-black text-slate-900 m-0 mt-1">
                                                                        {row.bestMonth.label} — <span className="text-[#6a9a04]">{fmt(row.bestMonth.revenue)}</span>
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 m-0">{row.bestMonth.orders} pedidos • {row.bestMonth.units} pzas</p>
                                                                </div>
                                                                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ticket Promedio</p>
                                                                    <p className="text-sm font-black text-slate-900 m-0 mt-1">{fmt(row.avgTicket)}</p>
                                                                    <p className="text-[10px] text-slate-400 m-0">{row.totalOrders} pedidos totales • {row.totalUnits} pzas</p>
                                                                </div>
                                                                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Prom. en Meses Activos</p>
                                                                    <p className="text-sm font-black text-slate-900 m-0 mt-1">{fmt(row.avgActiveMonthRev)}</p>
                                                                    <p className="text-[10px] text-slate-400 m-0">Cuando sí mete pedido ({row.activeClosedMonths} meses)</p>
                                                                </div>
                                                                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Última Compra</p>
                                                                    <p className="text-sm font-black text-slate-900 m-0 mt-1">
                                                                        {row.lastOrderDate ? row.lastOrderDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 m-0">
                                                                        {row.daysSinceLastOrder !== null ? `Hace ${row.daysSinceLastOrder} días` : 'Nunca ha pedido'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Top 5 Products Bought by this Distributor */}
                                                            <div className="lg:col-span-2 bg-white rounded-xl p-3.5 border border-slate-200/80">
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0 mb-2.5">
                                                                    🪑 Top 5 Productos que más compra {row.name}
                                                                </p>
                                                                {row.topSkus.length > 0 ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                                                        {row.topSkus.map((skuItem, idx) => (
                                                                            <div key={idx} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-mono text-[10px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded">
                                                                                        {skuItem.sku}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-bold text-slate-700">{skuItem.qty} pzas</span>
                                                                                </div>
                                                                                <p className="text-[11px] font-semibold text-slate-800 truncate m-0 mt-1" title={skuItem.name}>
                                                                                    {skuItem.name}
                                                                                </p>
                                                                                <p className="text-[10px] font-bold text-slate-500 m-0 mt-0.5">
                                                                                    {fmt(skuItem.rev)}
                                                                                </p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-slate-400 italic m-0">Sin productos registrados</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={distributorMatrixData.visibleMonthCols.length + 6} className="py-10 text-center text-slate-400 text-sm">
                                            No se encontraron distribuidores con ese filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* Monthly Totals Footer */}
                            <tfoot className="bg-slate-900 text-white text-xs font-bold">
                                <tr>
                                    <td className="py-3.5 pl-5 pr-3 sticky left-0 bg-slate-900 z-10">
                                        <div>TOTAL MENSUAL</div>
                                        <div className="text-[9px] font-normal text-slate-400">Distribuidores activos por mes</div>
                                    </td>
                                    {distributorMatrixData.visibleMonthCols.map(c => {
                                        const mTot = distributorMatrixData.monthTotals[c.key] || { revenue: 0, units: 0, orders: 0, activeDists: 0 };
                                        const val = mTot[matrixMetric] || 0;
                                        return (
                                            <td key={c.key} className="px-2.5 py-3.5 text-right font-mono">
                                                <div>
                                                    {matrixMetric === 'revenue'
                                                        ? '$' + Math.round(val).toLocaleString('es-MX')
                                                        : val.toLocaleString('es-MX')}
                                                </div>
                                                <div className="text-[9px] font-normal text-lime-400">
                                                    {mTot.activeDists} dist.
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3.5 text-right font-mono text-lime-400 text-xs">
                                        {matrixMetric === 'revenue'
                                            ? fmt(distributorMatrixData.grandTotals.revenue)
                                            : distributorMatrixData.grandTotals[matrixMetric].toLocaleString('es-MX')}
                                    </td>
                                    <td className="px-3 py-3.5 text-right font-mono text-slate-300 text-[11px]">
                                        {matrixMetric === 'revenue'
                                            ? '$' + Math.round(distributorMatrixData.grandTotals.closedRev / distributorMatrixData.numClosedMonths).toLocaleString('es-MX')
                                            : (distributorMatrixData.grandTotals[matrixMetric === 'units' ? 'closedUnits' : 'closedOrders'] / distributorMatrixData.numClosedMonths).toFixed(1)}
                                    </td>
                                    <td colSpan={3} className="px-4 py-3.5 text-right text-[10px] font-normal text-slate-400">
                                        Promedio mensual calculado sobre {distributorMatrixData.numClosedMonths} meses cerrados del periodo
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Top Products + Top Distributors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-200">
                            <h4 className="font-bold text-slate-900 m-0">🏆 Productos Estrella</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Producto</th>
                                        <th className="px-3 py-3 text-center">Vendidos</th>
                                        <th className="px-3 py-3 text-right">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topProducts.length > 0 ? topProducts.map((row, i) => (
                                        <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.qty}</td>
                                            <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-200">
                            <h4 className="font-bold text-slate-900 m-0">👥 Top Distribuidores</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Distribuidor</th>
                                        <th className="px-3 py-3 text-center">Pedidos</th>
                                        <th className="px-3 py-3 text-right">Volumen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topDistributors.length > 0 ? topDistributors.map((row, i) => (
                                        <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                                <div className="text-[10px] text-slate-400">{row.city}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.count}</td>
                                            <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
