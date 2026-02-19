(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PedidosPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/src/utils/supabase/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
const STATUS_CONFIG = {
    pending: {
        label: 'Pendiente',
        color: '#fbbf24',
        bg: 'rgba(234, 179, 8, 0.15)'
    },
    processing: {
        label: 'En Proceso',
        color: '#60a5fa',
        bg: 'rgba(59, 130, 246, 0.15)'
    },
    shipped: {
        label: 'Enviado',
        color: '#4ade80',
        bg: 'rgba(34, 197, 94, 0.15)'
    },
    delivered: {
        label: 'Entregado',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.15)'
    },
    cancelled: {
        label: 'Cancelado',
        color: '#fca5a5',
        bg: 'rgba(239, 68, 68, 0.15)'
    }
};
const FILTER_TABS = [
    {
        key: 'all',
        label: 'Todos'
    },
    {
        key: 'pending',
        label: 'Pendientes'
    },
    {
        key: 'processing',
        label: 'En Proceso'
    },
    {
        key: 'shipped',
        label: 'Enviados'
    },
    {
        key: 'delivered',
        label: 'Entregados'
    },
    {
        key: 'cancelled',
        label: 'Cancelados'
    }
];
function PedidosPage() {
    _s();
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isAdmin, setIsAdmin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [statusFilter, setStatusFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PedidosPage.useEffect": ()=>{
            async function fetchOrders() {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                // Check if admin
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                const admin = profile?.role === 'admin';
                setIsAdmin(admin);
                // Fetch orders — admin sees all, distributor sees own
                let query = supabase.from('orders').select('*, profiles:distributor_id(full_name, email, city)').order('created_at', {
                    ascending: false
                });
                if (!admin) {
                    query = query.eq('distributor_id', user.id);
                }
                const { data } = await query;
                if (data) setOrders(data);
                setLoading(false);
            }
            fetchOrders();
        }
    }["PedidosPage.useEffect"], []);
    const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o)=>o.status === statusFilter);
    // Count per status for badges
    const counts = {};
    orders.forEach((o)=>{
        counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-c88cede8bc4a6ae3" + " " + "pedidos-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-c88cede8bc4a6ae3" + " " + "page-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-c88cede8bc4a6ae3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "jsx-c88cede8bc4a6ae3",
                                children: isAdmin ? 'Gestión de Pedidos' : 'Mis Pedidos'
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this),
                            isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-c88cede8bc4a6ae3" + " " + "subtitle",
                                children: "Administra todos los pedidos de distribuidores"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 76,
                                columnNumber: 23
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                        lineNumber: 74,
                        columnNumber: 9
                    }, this),
                    !isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/dashboard/pedidos/nuevo",
                        className: "btn btn-primary btn-sm",
                        style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 80,
                                columnNumber: 13
                            }, this),
                            "Nuevo Pedido"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                        lineNumber: 79,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-c88cede8bc4a6ae3" + " " + "filter-tabs",
                children: FILTER_TABS.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setStatusFilter(tab.key),
                        className: "jsx-c88cede8bc4a6ae3" + " " + `filter-tab ${statusFilter === tab.key ? 'active' : ''}`,
                        children: [
                            tab.label,
                            tab.key !== 'all' && counts[tab.key] > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-c88cede8bc4a6ae3" + " " + "tab-count",
                                children: counts[tab.key]
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 96,
                                columnNumber: 15
                            }, this),
                            tab.key === 'all' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-c88cede8bc4a6ae3" + " " + "tab-count",
                                children: orders.length
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 99,
                                columnNumber: 15
                            }, this)
                        ]
                    }, tab.key, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                        lineNumber: 89,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '1.5rem'
                },
                className: "jsx-c88cede8bc4a6ae3" + " " + "glass-panel",
                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-c88cede8bc4a6ae3" + " " + "text-center text-muted",
                    children: "Cargando pedidos..."
                }, void 0, false, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                    lineNumber: 107,
                    columnNumber: 11
                }, this) : filteredOrders.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-c88cede8bc4a6ae3" + " " + "empty-state",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-c88cede8bc4a6ae3",
                            children: statusFilter === 'all' ? 'No hay pedidos.' : `No hay pedidos con status "${FILTER_TABS.find((t)=>t.key === statusFilter)?.label}".`
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                            lineNumber: 110,
                            columnNumber: 13
                        }, this),
                        !isAdmin && statusFilter === 'all' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/dashboard/pedidos/nuevo",
                            className: "btn btn-outline-light btn-sm mt-4",
                            style: {
                                display: 'inline-block',
                                textDecoration: 'none'
                            },
                            children: "Crear mi primer pedido"
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                            lineNumber: 112,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                    lineNumber: 109,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "jsx-c88cede8bc4a6ae3" + " " + "orders-table",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            className: "jsx-c88cede8bc4a6ae3",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: "jsx-c88cede8bc4a6ae3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Pedido"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 119,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Fecha"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 120,
                                        columnNumber: 17
                                    }, this),
                                    isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Distribuidor"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 121,
                                        columnNumber: 29
                                    }, this),
                                    isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Ciudad"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 122,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Estado"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 123,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 124,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-c88cede8bc4a6ae3",
                                        children: "Acciones"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                        lineNumber: 125,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                lineNumber: 118,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                            lineNumber: 117,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "jsx-c88cede8bc4a6ae3",
                            children: filteredOrders.map((order)=>{
                                const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "jsx-c88cede8bc4a6ae3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3" + " " + "order-number",
                                            children: [
                                                "#",
                                                order.order_number
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 133,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3",
                                            children: new Date(order.created_at).toLocaleDateString('es-MX')
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 134,
                                            columnNumber: 21
                                        }, this),
                                        isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3",
                                            children: order.profiles?.full_name || order.profiles?.email || '—'
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 135,
                                            columnNumber: 33
                                        }, this),
                                        isAdmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3",
                                            children: order.profiles?.city || '—'
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 136,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    background: sc.bg,
                                                    color: sc.color
                                                },
                                                className: "jsx-c88cede8bc4a6ae3" + " " + "status-badge",
                                                children: sc.label
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                                lineNumber: 138,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 137,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3" + " " + "amount",
                                            children: [
                                                "$",
                                                Number(order.total_amount).toLocaleString('es-MX', {
                                                    minimumFractionDigits: 2
                                                })
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 142,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-c88cede8bc4a6ae3",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: `/dashboard/pedidos/${order.id}`,
                                                className: "btn-action",
                                                title: "Ver detalle",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                        size: 16
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                                        lineNumber: 145,
                                                        columnNumber: 25
                                                    }, this),
                                                    " Ver"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                                lineNumber: 144,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                            lineNumber: 143,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, order.id, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                                    lineNumber: 132,
                                    columnNumber: 19
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                            lineNumber: 128,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                    lineNumber: 116,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "c88cede8bc4a6ae3",
                children: ".pedidos-container.jsx-c88cede8bc4a6ae3{max-width:1200px;margin:0 auto}.page-header.jsx-c88cede8bc4a6ae3{justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;display:flex}.page-header.jsx-c88cede8bc4a6ae3 h1.jsx-c88cede8bc4a6ae3{color:var(--color-text-main);margin:0;font-size:1.75rem}.subtitle.jsx-c88cede8bc4a6ae3{color:var(--color-text-muted);margin:.25rem 0 0;font-size:.9rem}.filter-tabs.jsx-c88cede8bc4a6ae3{flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;display:flex}.filter-tab.jsx-c88cede8bc4a6ae3{border:1px solid var(--color-border);color:var(--color-text-muted);cursor:pointer;background:#fff;border-radius:8px;align-items:center;gap:.5rem;padding:.5rem 1rem;font-size:.85rem;transition:all .2s;display:flex}.filter-tab.jsx-c88cede8bc4a6ae3:hover{background:var(--color-bg-alt);color:var(--color-text-main);border-color:var(--color-primary)}.filter-tab.active.jsx-c88cede8bc4a6ae3{background:var(--color-primary);color:#0d351b;border-color:var(--color-primary);font-weight:600}.filter-tab.active.jsx-c88cede8bc4a6ae3 .tab-count.jsx-c88cede8bc4a6ae3{color:inherit;background:#0000001a}.tab-count.jsx-c88cede8bc4a6ae3{background:var(--color-bg-alt);border-radius:99px;padding:.1rem .5rem;font-size:.75rem;font-weight:600}.empty-state.jsx-c88cede8bc4a6ae3{text-align:center;color:var(--color-text-muted);padding:4rem 1rem}.orders-table.jsx-c88cede8bc4a6ae3{border-collapse:collapse;width:100%;color:var(--color-text-main)}.orders-table.jsx-c88cede8bc4a6ae3 th.jsx-c88cede8bc4a6ae3{text-align:left;background-color:var(--color-bg-alt);border-bottom:1px solid var(--color-border);color:var(--color-text-muted);padding:1rem;font-size:.85rem;font-weight:600}.orders-table.jsx-c88cede8bc4a6ae3 td.jsx-c88cede8bc4a6ae3{border-bottom:1px solid var(--color-bg-alt);padding:1rem;font-size:.95rem}.orders-table.jsx-c88cede8bc4a6ae3 tr.jsx-c88cede8bc4a6ae3:hover td.jsx-c88cede8bc4a6ae3{background-color:var(--color-bg-surface)}.order-number.jsx-c88cede8bc4a6ae3{color:var(--color-primary-dark);font-weight:600}.amount.jsx-c88cede8bc4a6ae3{font-weight:600}.status-badge.jsx-c88cede8bc4a6ae3{text-transform:uppercase;letter-spacing:.03em;border-radius:99px;padding:.25rem .65rem;font-size:.78rem;font-weight:700}.btn-action.jsx-c88cede8bc4a6ae3{background:var(--color-bg-alt);border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:6px;align-items:center;gap:.4rem;padding:.35rem .75rem;font-size:.82rem;text-decoration:none;transition:all .2s;display:inline-flex}.btn-action.jsx-c88cede8bc4a6ae3:hover{background:var(--color-accent-bg);border-color:var(--color-primary);color:var(--color-primary-dark)}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/page.js",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(PedidosPage, "0/eTybYforVjKsCEKgx1lSpQ2M0=");
_c = PedidosPage;
var _c;
__turbopack_context__.k.register(_c, "PedidosPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Plus
]);
/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M5 12h14",
            key: "1ays0h"
        }
    ],
    [
        "path",
        {
            d: "M12 5v14",
            key: "s699le"
        }
    ]
];
const Plus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("plus", __iconNode);
;
 //# sourceMappingURL=plus.js.map
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Plus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript)");
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Eye
]);
/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
            key: "1nclc0"
        }
    ],
    [
        "circle",
        {
            cx: "12",
            cy: "12",
            r: "3",
            key: "1v7zrd"
        }
    ]
];
const Eye = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("eye", __iconNode);
;
 //# sourceMappingURL=eye.js.map
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Eye",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=next-app_076bf0bc._.js.map