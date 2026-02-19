(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EstadisticasPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/src/utils/supabase/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/calendar.js [app-client] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function EstadisticasPage() {
    _s();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isAdmin, setIsAdmin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dateRange, setDateRange] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('month'); // today, week, month, year, all
    const [customFrom, setCustomFrom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [customTo, setCustomTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Raw data
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [profiles, setProfiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [orderItems, setOrderItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EstadisticasPage.useEffect": ()=>{
            checkAdminAndFetch();
        }
    }["EstadisticasPage.useEffect"], []);
    const checkAdminAndFetch = async ()=>{
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        setIsAdmin(true);
        await fetchAllData();
    };
    const fetchAllData = async ()=>{
        setLoading(true);
        const [ordersRes, productsRes, profilesRes, itemsRes] = await Promise.all([
            supabase.from('orders').select('*').order('created_at', {
                ascending: false
            }),
            supabase.from('products').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('order_items').select('*, products(name, sku)')
        ]);
        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
        setProfiles(profilesRes.data || []);
        setOrderItems(itemsRes.data || []);
        setLoading(false);
    };
    // Date filter logic
    const getDateRange = ()=>{
        const now = new Date();
        let from = null;
        let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        switch(dateRange){
            case 'today':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                from = new Date(now);
                from.setDate(now.getDate() - 7);
                break;
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                from = customFrom ? new Date(customFrom) : null;
                to = customTo ? new Date(customTo + 'T23:59:59') : to;
                break;
            default:
                from = null;
                break;
        }
        return {
            from,
            to
        };
    };
    const filteredOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[filteredOrders]": ()=>{
            const { from, to } = getDateRange();
            return orders.filter({
                "EstadisticasPage.useMemo[filteredOrders]": (o)=>{
                    const d = new Date(o.created_at);
                    if (from && d < from) return false;
                    if (to && d > to) return false;
                    return true;
                }
            }["EstadisticasPage.useMemo[filteredOrders]"]);
        }
    }["EstadisticasPage.useMemo[filteredOrders]"], [
        orders,
        dateRange,
        customFrom,
        customTo
    ]);
    // KPIs
    const kpis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[kpis]": ()=>{
            const totalOrders = filteredOrders.length;
            const nonCancelled = filteredOrders.filter({
                "EstadisticasPage.useMemo[kpis].nonCancelled": (o)=>o.status !== 'cancelled'
            }["EstadisticasPage.useMemo[kpis].nonCancelled"]);
            const totalRevenue = nonCancelled.reduce({
                "EstadisticasPage.useMemo[kpis].totalRevenue": (sum, o)=>sum + (parseFloat(o.total_amount) || 0)
            }["EstadisticasPage.useMemo[kpis].totalRevenue"], 0);
            const pendingOrders = filteredOrders.filter({
                "EstadisticasPage.useMemo[kpis]": (o)=>o.status === 'pending'
            }["EstadisticasPage.useMemo[kpis]"]).length;
            const lowStockProducts = products.filter({
                "EstadisticasPage.useMemo[kpis]": (p)=>p.stock_quantity <= (p.stock_minimum || 10)
            }["EstadisticasPage.useMemo[kpis]"]).length;
            const activeDistributors = profiles.filter({
                "EstadisticasPage.useMemo[kpis]": (p)=>p.role === 'distributor' && p.is_active
            }["EstadisticasPage.useMemo[kpis]"]).length;
            const avgTicket = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
            return {
                totalOrders,
                totalRevenue,
                pendingOrders,
                lowStockProducts,
                activeDistributors,
                avgTicket
            };
        }
    }["EstadisticasPage.useMemo[kpis]"], [
        filteredOrders,
        products,
        profiles
    ]);
    // Status breakdown
    const statusBreakdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[statusBreakdown]": ()=>{
            const counts = {
                pending: 0,
                processing: 0,
                shipped: 0,
                delivered: 0,
                cancelled: 0
            };
            filteredOrders.forEach({
                "EstadisticasPage.useMemo[statusBreakdown]": (o)=>{
                    if (counts.hasOwnProperty(o.status)) counts[o.status]++;
                }
            }["EstadisticasPage.useMemo[statusBreakdown]"]);
            return counts;
        }
    }["EstadisticasPage.useMemo[statusBreakdown]"], [
        filteredOrders
    ]);
    // Orders by city
    const ordersByCity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[ordersByCity]": ()=>{
            const cityMap = {};
            filteredOrders.forEach({
                "EstadisticasPage.useMemo[ordersByCity]": (order)=>{
                    const profile = profiles.find({
                        "EstadisticasPage.useMemo[ordersByCity].profile": (p)=>p.id === order.distributor_id
                    }["EstadisticasPage.useMemo[ordersByCity].profile"]);
                    const city = profile?.city || 'Sin ciudad';
                    if (!cityMap[city]) cityMap[city] = {
                        count: 0,
                        revenue: 0
                    };
                    cityMap[city].count++;
                    if (order.status !== 'cancelled') {
                        cityMap[city].revenue += parseFloat(order.total_amount) || 0;
                    }
                }
            }["EstadisticasPage.useMemo[ordersByCity]"]);
            return Object.entries(cityMap).map({
                "EstadisticasPage.useMemo[ordersByCity]": ([city, data])=>({
                        city,
                        ...data
                    })
            }["EstadisticasPage.useMemo[ordersByCity]"]).sort({
                "EstadisticasPage.useMemo[ordersByCity]": (a, b)=>b.revenue - a.revenue
            }["EstadisticasPage.useMemo[ordersByCity]"]).slice(0, 10);
        }
    }["EstadisticasPage.useMemo[ordersByCity]"], [
        filteredOrders,
        profiles
    ]);
    // Top distributors
    const topDistributors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[topDistributors]": ()=>{
            const distMap = {};
            filteredOrders.forEach({
                "EstadisticasPage.useMemo[topDistributors]": (order)=>{
                    const id = order.distributor_id;
                    if (!distMap[id]) distMap[id] = {
                        count: 0,
                        revenue: 0
                    };
                    distMap[id].count++;
                    if (order.status !== 'cancelled') {
                        distMap[id].revenue += parseFloat(order.total_amount) || 0;
                    }
                }
            }["EstadisticasPage.useMemo[topDistributors]"]);
            return Object.entries(distMap).map({
                "EstadisticasPage.useMemo[topDistributors]": ([id, data])=>{
                    const profile = profiles.find({
                        "EstadisticasPage.useMemo[topDistributors].profile": (p)=>p.id === id
                    }["EstadisticasPage.useMemo[topDistributors].profile"]);
                    return {
                        name: profile?.full_name || 'Desconocido',
                        city: profile?.city || '—',
                        ...data
                    };
                }
            }["EstadisticasPage.useMemo[topDistributors]"]).sort({
                "EstadisticasPage.useMemo[topDistributors]": (a, b)=>b.revenue - a.revenue
            }["EstadisticasPage.useMemo[topDistributors]"]).slice(0, 10);
        }
    }["EstadisticasPage.useMemo[topDistributors]"], [
        filteredOrders,
        profiles
    ]);
    // Top selling products
    const topProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[topProducts]": ()=>{
            const confirmedOrderIds = new Set(filteredOrders.filter({
                "EstadisticasPage.useMemo[topProducts]": (o)=>o.status !== 'cancelled' && o.status !== 'pending'
            }["EstadisticasPage.useMemo[topProducts]"]).map({
                "EstadisticasPage.useMemo[topProducts]": (o)=>o.id
            }["EstadisticasPage.useMemo[topProducts]"]));
            const prodMap = {};
            orderItems.forEach({
                "EstadisticasPage.useMemo[topProducts]": (item)=>{
                    if (!confirmedOrderIds.has(item.order_id)) return;
                    const pid = item.product_id;
                    if (!prodMap[pid]) prodMap[pid] = {
                        qty: 0,
                        revenue: 0
                    };
                    prodMap[pid].qty += item.quantity;
                    prodMap[pid].revenue += parseFloat(item.subtotal) || item.quantity * parseFloat(item.unit_price);
                }
            }["EstadisticasPage.useMemo[topProducts]"]);
            return Object.entries(prodMap).map({
                "EstadisticasPage.useMemo[topProducts]": ([id, data])=>{
                    const p = products.find({
                        "EstadisticasPage.useMemo[topProducts].p": (pr)=>pr.id === id
                    }["EstadisticasPage.useMemo[topProducts].p"]);
                    return {
                        name: p?.name || 'Producto',
                        sku: p?.sku || '—',
                        ...data
                    };
                }
            }["EstadisticasPage.useMemo[topProducts]"]).sort({
                "EstadisticasPage.useMemo[topProducts]": (a, b)=>b.revenue - a.revenue
            }["EstadisticasPage.useMemo[topProducts]"]).slice(0, 10);
        }
    }["EstadisticasPage.useMemo[topProducts]"], [
        filteredOrders,
        orderItems,
        products
    ]);
    // Critical inventory
    const criticalInventory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "EstadisticasPage.useMemo[criticalInventory]": ()=>{
            return products.filter({
                "EstadisticasPage.useMemo[criticalInventory]": (p)=>p.stock_quantity <= (p.stock_minimum || 10)
            }["EstadisticasPage.useMemo[criticalInventory]"]).sort({
                "EstadisticasPage.useMemo[criticalInventory]": (a, b)=>a.stock_quantity - b.stock_quantity
            }["EstadisticasPage.useMemo[criticalInventory]"]).slice(0, 10);
        }
    }["EstadisticasPage.useMemo[criticalInventory]"], [
        products
    ]);
    const fmt = (n)=>new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(n);
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "loading",
        children: "Cargando estadísticas..."
    }, void 0, false, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
        lineNumber: 197,
        columnNumber: 25
    }, this);
    if (!isAdmin) return null;
    const statusConfig = {
        pending: {
            label: 'Pendientes',
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.15)'
        },
        processing: {
            label: 'En Proceso',
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.15)'
        },
        shipped: {
            label: 'Enviados',
            color: '#a855f7',
            bg: 'rgba(168,85,247,0.15)'
        },
        delivered: {
            label: 'Entregados',
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.15)'
        },
        cancelled: {
            label: 'Cancelados',
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.15)'
        }
    };
    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-6fb237f953163f0c" + " " + "stats-page",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6fb237f953163f0c" + " " + "page-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "jsx-6fb237f953163f0c",
                                children: "📊 Estadísticas"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 214,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-6fb237f953163f0c",
                                children: "Panel de análisis y métricas del negocio"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 215,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 213,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: fetchAllData,
                        className: "jsx-6fb237f953163f0c" + " " + "btn btn-glass refresh-btn",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 218,
                                columnNumber: 21
                            }, this),
                            " Actualizar"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 217,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                lineNumber: 212,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6fb237f953163f0c" + " " + "filters-bar glass-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "filter-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                size: 18,
                                className: "filter-icon"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 225,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-6fb237f953163f0c" + " " + "filter-label",
                                children: "Periodo:"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 226,
                                columnNumber: 21
                            }, this),
                            [
                                'today',
                                'week',
                                'month',
                                'year',
                                'all'
                            ].map((key)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setDateRange(key),
                                    className: "jsx-6fb237f953163f0c" + " " + `filter-chip ${dateRange === key ? 'active' : ''}`,
                                    children: {
                                        today: 'Hoy',
                                        week: 'Semana',
                                        month: 'Mes',
                                        year: 'Año',
                                        all: 'Todo'
                                    }[key]
                                }, key, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 228,
                                    columnNumber: 25
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setDateRange('custom'),
                                className: "jsx-6fb237f953163f0c" + " " + `filter-chip ${dateRange === 'custom' ? 'active' : ''}`,
                                children: "Personalizado"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 236,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 224,
                        columnNumber: 17
                    }, this),
                    dateRange === 'custom' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "custom-range",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                value: customFrom,
                                onChange: (e)=>setCustomFrom(e.target.value),
                                className: "jsx-6fb237f953163f0c" + " " + "date-input"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 245,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-6fb237f953163f0c" + " " + "range-sep",
                                children: "—"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 246,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                value: customTo,
                                onChange: (e)=>setCustomTo(e.target.value),
                                className: "jsx-6fb237f953163f0c" + " " + "date-input"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 247,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 244,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                lineNumber: 223,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6fb237f953163f0c" + " " + "kpi-grid",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(59,130,246,0.15)',
                                    color: '#60a5fa'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 255,
                                    columnNumber: 113
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 255,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: kpis.totalOrders
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 257,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Total Pedidos"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 258,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 256,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 254,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(34,197,94,0.15)',
                                    color: '#4ade80'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 262,
                                    columnNumber: 112
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 262,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: fmt(kpis.totalRevenue)
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 264,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Ingresos Totales"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 265,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 263,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 261,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(245,158,11,0.15)',
                                    color: '#fbbf24'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 269,
                                    columnNumber: 113
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 269,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: kpis.pendingOrders
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 271,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Pendientes"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 272,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 270,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 268,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#f87171'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 276,
                                    columnNumber: 112
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 276,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: kpis.lowStockProducts
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 278,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Stock Bajo"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 279,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 277,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 275,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(168,85,247,0.15)',
                                    color: '#c084fc'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 283,
                                    columnNumber: 113
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 283,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: kpis.activeDistributors
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 285,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Distribuidores Activos"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 286,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 284,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 282,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "kpi-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(6,182,212,0.15)',
                                    color: '#22d3ee'
                                },
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-icon",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 290,
                                    columnNumber: 112
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 290,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "kpi-data",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-value",
                                        children: fmt(kpis.avgTicket)
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 292,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-6fb237f953163f0c" + " " + "kpi-label",
                                        children: "Ticket Promedio"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 293,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 291,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 289,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                lineNumber: 253,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6fb237f953163f0c" + " " + "main-grid",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "section-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "jsx-6fb237f953163f0c",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 302,
                                        columnNumber: 25
                                    }, this),
                                    " Desglose por Estado"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 302,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "status-bars",
                                children: Object.entries(statusBreakdown).map(([key, count])=>{
                                    const cfg = statusConfig[key];
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-6fb237f953163f0c" + " " + "status-bar-row",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-6fb237f953163f0c" + " " + "status-bar-label",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            background: cfg.color
                                                        },
                                                        className: "jsx-6fb237f953163f0c" + " " + "status-dot"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 309,
                                                        columnNumber: 41
                                                    }, this),
                                                    cfg.label
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 308,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-6fb237f953163f0c" + " " + "status-bar-track",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        width: `${count / maxStatusCount * 100}%`,
                                                        background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`
                                                    },
                                                    className: "jsx-6fb237f953163f0c" + " " + "status-bar-fill"
                                                }, void 0, false, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                    lineNumber: 313,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 312,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: cfg.color
                                                },
                                                className: "jsx-6fb237f953163f0c" + " " + "status-bar-count",
                                                children: count
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 321,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, key, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 307,
                                        columnNumber: 33
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 303,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 301,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "section-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "jsx-6fb237f953163f0c",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 330,
                                        columnNumber: 25
                                    }, this),
                                    " Pedidos por Ciudad"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 330,
                                columnNumber: 21
                            }, this),
                            ordersByCity.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "mini-table-wrap",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "jsx-6fb237f953163f0c" + " " + "mini-table",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                className: "jsx-6fb237f953163f0c",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Ciudad"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 335,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Pedidos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 335,
                                                        columnNumber: 56
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Ingresos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 335,
                                                        columnNumber: 72
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 335,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 334,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: ordersByCity.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "jsx-6fb237f953163f0c",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "city-cell",
                                                            children: row.city
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 340,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell",
                                                            children: row.count
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 341,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell revenue",
                                                            children: fmt(row.revenue)
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 342,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                    lineNumber: 339,
                                                    columnNumber: 41
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 337,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 333,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 332,
                                columnNumber: 25
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-6fb237f953163f0c" + " " + "no-data",
                                children: "Sin datos para este periodo"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 348,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 329,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "section-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "jsx-6fb237f953163f0c",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 353,
                                        columnNumber: 25
                                    }, this),
                                    " Top Distribuidores"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 353,
                                columnNumber: 21
                            }, this),
                            topDistributors.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "mini-table-wrap",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "jsx-6fb237f953163f0c" + " " + "mini-table",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                className: "jsx-6fb237f953163f0c",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Distribuidor"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 358,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Ciudad"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 358,
                                                        columnNumber: 62
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Pedidos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 358,
                                                        columnNumber: 77
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Ingresos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 358,
                                                        columnNumber: 93
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 358,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 357,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: topDistributors.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "jsx-6fb237f953163f0c",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c",
                                                            children: row.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 363,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "muted",
                                                            children: row.city
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 364,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell",
                                                            children: row.count
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 365,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell revenue",
                                                            children: fmt(row.revenue)
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 366,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                    lineNumber: 362,
                                                    columnNumber: 41
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 360,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 356,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 355,
                                columnNumber: 25
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-6fb237f953163f0c" + " " + "no-data",
                                children: "Sin datos para este periodo"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 372,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 352,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "section-card glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "jsx-6fb237f953163f0c",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 377,
                                        columnNumber: 25
                                    }, this),
                                    " Productos Más Vendidos"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 377,
                                columnNumber: 21
                            }, this),
                            topProducts.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "mini-table-wrap",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "jsx-6fb237f953163f0c" + " " + "mini-table",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                className: "jsx-6fb237f953163f0c",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Producto"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 382,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "SKU"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 382,
                                                        columnNumber: 58
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Cantidad"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 382,
                                                        columnNumber: 70
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Revenue"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 382,
                                                        columnNumber: 87
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 382,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 381,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: topProducts.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "jsx-6fb237f953163f0c",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c",
                                                            children: row.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 387,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "muted",
                                                            children: row.sku
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 388,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell",
                                                            children: row.qty
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 389,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell revenue",
                                                            children: fmt(row.revenue)
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 390,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                    lineNumber: 386,
                                                    columnNumber: 41
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 384,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 380,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 379,
                                columnNumber: 25
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-6fb237f953163f0c" + " " + "no-data",
                                children: "Sin datos para este periodo"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 396,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 376,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-6fb237f953163f0c" + " " + "section-card glass-panel full-width",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "jsx-6fb237f953163f0c",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 401,
                                        columnNumber: 25
                                    }, this),
                                    " Inventario Crítico"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 401,
                                columnNumber: 21
                            }, this),
                            criticalInventory.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "mini-table-wrap",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "jsx-6fb237f953163f0c" + " " + "mini-table",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                className: "jsx-6fb237f953163f0c",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Producto"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 406,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "SKU"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 406,
                                                        columnNumber: 58
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Stock Actual"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 406,
                                                        columnNumber: 70
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Mínimo"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 406,
                                                        columnNumber: 91
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "jsx-6fb237f953163f0c",
                                                        children: "Estado"
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                        lineNumber: 406,
                                                        columnNumber: 106
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                lineNumber: 406,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 405,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "jsx-6fb237f953163f0c",
                                            children: criticalInventory.map((p, i)=>{
                                                const pct = p.stock_minimum ? p.stock_quantity / p.stock_minimum * 100 : 0;
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "jsx-6fb237f953163f0c",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c",
                                                            children: p.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 413,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "muted",
                                                            children: p.sku
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 414,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell",
                                                            children: p.stock_quantity
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 415,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c" + " " + "num-cell",
                                                            children: p.stock_minimum || 10
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 416,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "jsx-6fb237f953163f0c",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-6fb237f953163f0c" + " " + "stock-bar-wrap",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    style: {
                                                                        width: `${Math.min(pct, 100)}%`,
                                                                        background: pct <= 25 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#22c55e'
                                                                    },
                                                                    className: "jsx-6fb237f953163f0c" + " " + "stock-bar"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                                    lineNumber: 419,
                                                                    columnNumber: 57
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                                lineNumber: 418,
                                                                columnNumber: 53
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                            lineNumber: 417,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                                    lineNumber: 412,
                                                    columnNumber: 45
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                            lineNumber: 408,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                    lineNumber: 404,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 403,
                                columnNumber: 25
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-6fb237f953163f0c" + " " + "no-critical",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontSize: '2rem'
                                        },
                                        className: "jsx-6fb237f953163f0c",
                                        children: "✅"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 433,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "jsx-6fb237f953163f0c",
                                        children: "Todos los productos tienen stock adecuado"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                        lineNumber: 434,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                                lineNumber: 432,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                        lineNumber: 400,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
                lineNumber: 299,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "6fb237f953163f0c",
                children: ".stats-page.jsx-6fb237f953163f0c{max-width:1400px;margin:0 auto}.page-header.jsx-6fb237f953163f0c{justify-content:space-between;align-items:flex-start;margin-bottom:2rem;display:flex}.page-header.jsx-6fb237f953163f0c h1.jsx-6fb237f953163f0c{color:var(--color-text-main);margin:0;font-size:2rem}.page-header.jsx-6fb237f953163f0c p.jsx-6fb237f953163f0c{color:var(--color-text-muted);margin-top:.25rem}.refresh-btn.jsx-6fb237f953163f0c{align-items:center;gap:.5rem;padding:.6rem 1.25rem;display:flex}.filters-bar.jsx-6fb237f953163f0c{border:1px solid var(--color-border);background:#fff;margin-bottom:1.5rem;padding:1rem 1.25rem}.filter-row.jsx-6fb237f953163f0c{flex-wrap:wrap;align-items:center;gap:.75rem;display:flex}.filter-icon.jsx-6fb237f953163f0c{color:var(--color-text-muted)}.filter-label.jsx-6fb237f953163f0c{color:var(--color-text-muted);font-size:.85rem;font-weight:600}.filter-chip.jsx-6fb237f953163f0c{border:1px solid var(--color-border);color:var(--color-text-muted);cursor:pointer;background:#fff;border-radius:99px;padding:.4rem 1rem;font-size:.82rem;transition:all .2s}.filter-chip.jsx-6fb237f953163f0c:hover{border-color:var(--color-primary);color:var(--color-primary-dark);background:var(--color-bg-alt)}.filter-chip.active.jsx-6fb237f953163f0c{background:var(--color-primary);border-color:var(--color-primary);color:#064e3b;font-weight:600}.custom-range.jsx-6fb237f953163f0c{align-items:center;gap:.75rem;margin-top:.75rem;display:flex}.date-input.jsx-6fb237f953163f0c{border:1px solid var(--color-border);color:var(--color-text-main);border-radius:var(--radius-sm);background:#fff;padding:.5rem .75rem}.date-input.jsx-6fb237f953163f0c:focus{border-color:var(--color-primary);outline:none}.range-sep.jsx-6fb237f953163f0c{color:var(--color-text-muted)}.kpi-grid.jsx-6fb237f953163f0c{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem;display:grid}.kpi-card.jsx-6fb237f953163f0c{border:1px solid var(--color-border);background:#fff;align-items:center;gap:1.25rem;padding:1.5rem;transition:transform .2s,box-shadow .2s;display:flex}.kpi-card.jsx-6fb237f953163f0c:hover{border-color:var(--color-primary);transform:translateY(-2px);box-shadow:0 8px 15px #0000001a}.kpi-icon.jsx-6fb237f953163f0c{border-radius:14px;flex-shrink:0;justify-content:center;align-items:center;width:52px;height:52px;display:flex}.kpi-data.jsx-6fb237f953163f0c{flex-direction:column;display:flex}.kpi-value.jsx-6fb237f953163f0c{color:var(--color-text-main);font-size:1.5rem;font-weight:700;line-height:1.2}.kpi-label.jsx-6fb237f953163f0c{color:var(--color-text-muted);margin-top:.15rem;font-size:.78rem}.main-grid.jsx-6fb237f953163f0c{grid-template-columns:repeat(2,1fr);gap:1.5rem;display:grid}.section-card.jsx-6fb237f953163f0c{border:1px solid var(--color-border);background:#fff;padding:1.5rem}.section-card.full-width.jsx-6fb237f953163f0c{grid-column:1/-1}.section-card.jsx-6fb237f953163f0c h3.jsx-6fb237f953163f0c{color:var(--color-text-main);align-items:center;gap:.6rem;margin:0 0 1.25rem;font-size:1.05rem;display:flex}.status-bars.jsx-6fb237f953163f0c{flex-direction:column;gap:.9rem;display:flex}.status-bar-row.jsx-6fb237f953163f0c{align-items:center;gap:1rem;display:flex}.status-bar-label.jsx-6fb237f953163f0c{min-width:120px;color:var(--color-text-muted);align-items:center;gap:.5rem;font-size:.85rem;display:flex}.status-dot.jsx-6fb237f953163f0c{border-radius:50%;flex-shrink:0;width:8px;height:8px}.status-bar-track.jsx-6fb237f953163f0c{background:var(--color-bg-alt);border-radius:99px;flex:1;height:10px;overflow:hidden}.status-bar-fill.jsx-6fb237f953163f0c{border-radius:99px;min-width:4px;height:100%;transition:width .5s}.status-bar-count.jsx-6fb237f953163f0c{text-align:right;min-width:30px;font-size:.95rem;font-weight:700}.mini-table-wrap.jsx-6fb237f953163f0c{overflow-x:auto}.mini-table.jsx-6fb237f953163f0c{border-collapse:collapse;width:100%;font-size:.85rem}.mini-table.jsx-6fb237f953163f0c th.jsx-6fb237f953163f0c{text-align:left;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--color-border);background:var(--color-bg-alt);padding:.6rem .75rem;font-size:.75rem}.mini-table.jsx-6fb237f953163f0c td.jsx-6fb237f953163f0c{color:var(--color-text-muted);border-bottom:1px solid var(--color-bg-alt);padding:.6rem .75rem}.mini-table.jsx-6fb237f953163f0c tbody.jsx-6fb237f953163f0c tr.jsx-6fb237f953163f0c:hover{background:var(--color-bg-surface)}.num-cell.jsx-6fb237f953163f0c{text-align:right;font-variant-numeric:tabular-nums}.num-cell.revenue.jsx-6fb237f953163f0c{color:var(--color-primary-dark);font-weight:600}.city-cell.jsx-6fb237f953163f0c{color:var(--color-text-main);font-weight:500}.muted.jsx-6fb237f953163f0c{color:var(--color-text-muted);font-size:.8rem}.stock-bar-wrap.jsx-6fb237f953163f0c{background:var(--color-bg-alt);border-radius:99px;width:80px;height:8px;overflow:hidden}.stock-bar.jsx-6fb237f953163f0c{border-radius:99px;height:100%;transition:width .4s}.no-data.jsx-6fb237f953163f0c{color:var(--color-text-muted);text-align:center;padding:2rem;font-size:.9rem}.no-critical.jsx-6fb237f953163f0c{text-align:center;color:var(--color-text-muted);padding:2rem}.loading.jsx-6fb237f953163f0c{text-align:center;color:var(--color-text-muted);padding:4rem;font-size:1.1rem}@media (width<=768px){.main-grid.jsx-6fb237f953163f0c{grid-template-columns:1fr}.kpi-grid.jsx-6fb237f953163f0c{grid-template-columns:repeat(2,1fr)}.page-header.jsx-6fb237f953163f0c{flex-direction:column;gap:1rem}}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/estadisticas/page.js",
        lineNumber: 211,
        columnNumber: 9
    }, this);
}
_s(EstadisticasPage, "O9pTMDZg/d/yNBdz0aeYv/4DwYM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = EstadisticasPage;
var _c;
__turbopack_context__.k.register(_c, "EstadisticasPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=next-app_src_app_%28dashboard%29_dashboard_estadisticas_page_f1c5ea6a.js.map