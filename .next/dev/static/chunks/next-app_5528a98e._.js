(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>InventariosPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/src/utils/supabase/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/history.js [app-client] (ecmascript) <export default as History>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function InventariosPage() {
    _s();
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [inventory, setInventory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [selectedProduct, setSelectedProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null); // For adjustment modal
    const [adjustmentAmount, setAdjustmentAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [adjustmentReason, setAdjustmentReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    // Fetch initial data
    const fetchData = async ()=>{
        setLoading(true);
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // 2. Fetch all products
        const { data: productsData } = await supabase.from('products').select('*').eq('is_active', true).order('name');
        // 3. Fetch inventory logs for this user to calculate current stock
        const { data: logsData } = await supabase.from('inventory_logs').select('product_id, quantity_change').eq('user_id', user.id);
        // 4. Calculate stock per product
        const stockMap = {};
        if (logsData) {
            logsData.forEach((log)=>{
                stockMap[log.product_id] = (stockMap[log.product_id] || 0) + log.quantity_change;
            });
        }
        setProducts(productsData || []);
        setInventory(stockMap);
        setLoading(false);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InventariosPage.useEffect": ()=>{
            fetchData();
        }
    }["InventariosPage.useEffect"], []);
    const handleAdjustStock = async (e)=>{
        e.preventDefault();
        if (!selectedProduct || !adjustmentAmount) return;
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const qty = parseInt(adjustmentAmount);
        const { error } = await supabase.from('inventory_logs').insert({
            user_id: user.id,
            product_id: selectedProduct.id,
            quantity_change: qty,
            reason: adjustmentReason || 'Manual adjustment'
        });
        if (error) {
            alert('Error adjusting stock: ' + error.message);
        } else {
            // Refresh data
            await fetchData();
            setSelectedProduct(null);
            setAdjustmentAmount('');
            setAdjustmentReason('');
        }
        setSubmitting(false);
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "loading-container",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "spinner"
                }, void 0, false, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                    lineNumber: 88,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "Cargando inventario..."
                }, void 0, false, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                    lineNumber: 89,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
            lineNumber: 87,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-6deea0d2ed886a40" + " " + "inventory-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6deea0d2ed886a40" + " " + "page-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "jsx-6deea0d2ed886a40",
                        children: "Mi Inventario"
                    }, void 0, false, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                        lineNumber: 97,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "jsx-6deea0d2ed886a40",
                        children: "Gestiona el stock de tus productos disponibles."
                    }, void 0, false, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                        lineNumber: 98,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                lineNumber: 96,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6deea0d2ed886a40" + " " + "glass-panel",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "jsx-6deea0d2ed886a40" + " " + "inventory-table",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            className: "jsx-6deea0d2ed886a40",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: "jsx-6deea0d2ed886a40",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-6deea0d2ed886a40",
                                        children: "Producto"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                        lineNumber: 105,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-6deea0d2ed886a40",
                                        children: "SKU"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                        lineNumber: 106,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-6deea0d2ed886a40",
                                        children: "Stock Actual"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                        lineNumber: 107,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "jsx-6deea0d2ed886a40",
                                        children: "Acciones"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                        lineNumber: 108,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                lineNumber: 104,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                            lineNumber: 103,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "jsx-6deea0d2ed886a40",
                            children: products.map((product)=>{
                                const currentStock = inventory[product.id] || 0;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "jsx-6deea0d2ed886a40",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-6deea0d2ed886a40" + " " + "product-info",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-6deea0d2ed886a40" + " " + "product-icon",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                            size: 20
                                                        }, void 0, false, {
                                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                            lineNumber: 119,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                        lineNumber: 118,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "jsx-6deea0d2ed886a40",
                                                        children: product.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                        lineNumber: 121,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                lineNumber: 117,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 116,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: product.sku
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 124,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "jsx-6deea0d2ed886a40" + " " + `stock-badge ${currentStock > 0 ? 'in-stock' : 'out-of-stock'}`,
                                                children: [
                                                    currentStock,
                                                    " unidades"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                lineNumber: 126,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 125,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setSelectedProduct(product),
                                                title: "Ajustar Stock",
                                                className: "jsx-6deea0d2ed886a40" + " " + "btn-icon",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__["History"], {
                                                        size: 18
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                        lineNumber: 136,
                                                        columnNumber: 45
                                                    }, this),
                                                    " Ajustar"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                lineNumber: 131,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 130,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, product.id, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 115,
                                    columnNumber: 33
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                            lineNumber: 111,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                    lineNumber: 102,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                lineNumber: 101,
                columnNumber: 13
            }, this),
            selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-6deea0d2ed886a40" + " " + "modal-overlay",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-6deea0d2ed886a40" + " " + "modal-content",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-6deea0d2ed886a40" + " " + "modal-header",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "jsx-6deea0d2ed886a40",
                                    children: [
                                        "Ajustar Stock: ",
                                        selectedProduct.name
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 151,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setSelectedProduct(null),
                                    className: "jsx-6deea0d2ed886a40" + " " + "close-btn",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                        lineNumber: 152,
                                        columnNumber: 100
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 152,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                            lineNumber: 150,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleAdjustStock,
                            className: "jsx-6deea0d2ed886a40",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-6deea0d2ed886a40" + " " + "form-group",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: "Cantidad a AJUSTAR (+ comprar, - vender)"
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 157,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-6deea0d2ed886a40" + " " + "input-group",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                value: adjustmentAmount,
                                                onChange: (e)=>setAdjustmentAmount(e.target.value),
                                                placeholder: "Ej. 10 o -5",
                                                autoFocus: true,
                                                required: true,
                                                className: "jsx-6deea0d2ed886a40"
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                                lineNumber: 159,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 158,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: "Usa números positivos para agregar stock, negativos para restar."
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 168,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 156,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-6deea0d2ed886a40" + " " + "form-group",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "jsx-6deea0d2ed886a40",
                                            children: "Motivo"
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 172,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: adjustmentReason,
                                            onChange: (e)=>setAdjustmentReason(e.target.value),
                                            placeholder: "Ej. Venta local, Compra, Merma...",
                                            className: "jsx-6deea0d2ed886a40"
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 173,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 171,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-6deea0d2ed886a40" + " " + "modal-actions",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setSelectedProduct(null),
                                            className: "jsx-6deea0d2ed886a40" + " " + "btn btn-ghost",
                                            children: "Cancelar"
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 182,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: submitting,
                                            className: "jsx-6deea0d2ed886a40" + " " + "btn btn-primary",
                                            children: submitting ? 'Guardando...' : 'Guardar Movimiento'
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                            lineNumber: 183,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                                    lineNumber: 181,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                            lineNumber: 155,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                    lineNumber: 149,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
                lineNumber: 148,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "6deea0d2ed886a40",
                children: ".inventory-container.jsx-6deea0d2ed886a40{max-width:1200px;margin:0 auto}.loading-container.jsx-6deea0d2ed886a40{min-height:50vh;color:var(--color-text-muted);flex-direction:column;justify-content:center;align-items:center;gap:1rem;display:flex}.spinner.jsx-6deea0d2ed886a40{border:3px solid #ffffff1a;border-left-color:var(--color-primary);border-radius:50%;width:40px;height:40px;animation:1s linear infinite spin}@keyframes spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.page-header.jsx-6deea0d2ed886a40{margin-bottom:2rem}.page-header.jsx-6deea0d2ed886a40 h1.jsx-6deea0d2ed886a40{color:#fff;margin:0 0 .5rem;font-size:2rem}.page-header.jsx-6deea0d2ed886a40 p.jsx-6deea0d2ed886a40{color:var(--color-text-muted);margin:0}.glass-panel.jsx-6deea0d2ed886a40{background:#ffffff08;border:1px solid #ffffff0d;border-radius:16px;padding:1.5rem}.inventory-table.jsx-6deea0d2ed886a40{border-collapse:collapse;color:#fff;width:100%}.inventory-table.jsx-6deea0d2ed886a40 th.jsx-6deea0d2ed886a40{text-align:left;color:var(--color-text-muted);border-bottom:1px solid #ffffff1a;padding:1rem;font-weight:500}.inventory-table.jsx-6deea0d2ed886a40 td.jsx-6deea0d2ed886a40{vertical-align:middle;border-bottom:1px solid #ffffff0d;padding:1rem}.product-info.jsx-6deea0d2ed886a40{align-items:center;gap:.75rem;display:flex}.product-icon.jsx-6deea0d2ed886a40{color:var(--color-primary);opacity:.8}.stock-badge.jsx-6deea0d2ed886a40{border-radius:99px;padding:.25rem .75rem;font-size:.85rem;font-weight:600}.stock-badge.in-stock.jsx-6deea0d2ed886a40{color:#4ade80;background:#22c55e1a}.stock-badge.out-of-stock.jsx-6deea0d2ed886a40{color:#9ca3af;background:#ffffff0d}.btn-icon.jsx-6deea0d2ed886a40{color:#fff;cursor:pointer;background:0 0;border:1px solid #fff3;border-radius:6px;align-items:center;gap:.5rem;padding:.4rem .8rem;font-size:.8rem;transition:all .2s;display:flex}.btn-icon.jsx-6deea0d2ed886a40:hover{background:#ffffff1a;border-color:#fff}.modal-overlay.jsx-6deea0d2ed886a40{-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:50;background:#000000b3;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.modal-content.jsx-6deea0d2ed886a40{background:#1e1e24;border:1px solid #ffffff1a;border-radius:12px;width:100%;max-width:450px;padding:1.5rem;box-shadow:0 20px 50px #00000080}.modal-header.jsx-6deea0d2ed886a40{color:#fff;justify-content:space-between;align-items:center;margin-bottom:1.5rem;display:flex}.modal-header.jsx-6deea0d2ed886a40 h3.jsx-6deea0d2ed886a40{margin:0;font-size:1.25rem;font-weight:600}.close-btn.jsx-6deea0d2ed886a40{color:var(--color-text-muted);cursor:pointer;background:0 0;border:none;padding:4px}.close-btn.jsx-6deea0d2ed886a40:hover{color:#fff}.form-group.jsx-6deea0d2ed886a40{margin-bottom:1.5rem}.form-group.jsx-6deea0d2ed886a40 label.jsx-6deea0d2ed886a40{color:var(--color-text-muted);margin-bottom:.5rem;font-size:.9rem;display:block}.form-group.jsx-6deea0d2ed886a40 input.jsx-6deea0d2ed886a40{color:#fff;background:#0003;border:1px solid #ffffff1a;border-radius:8px;width:100%;padding:.75rem;font-size:1rem}.form-group.jsx-6deea0d2ed886a40 small.jsx-6deea0d2ed886a40{color:var(--color-text-muted);margin-top:.4rem;font-size:.8rem;display:block}.modal-actions.jsx-6deea0d2ed886a40{justify-content:flex-end;gap:1rem;margin-top:2rem;display:flex}.btn.jsx-6deea0d2ed886a40{cursor:pointer;border:none;border-radius:8px;padding:.6rem 1.2rem;font-weight:500}.btn-primary.jsx-6deea0d2ed886a40{background:var(--color-primary);color:#000}.btn-ghost.jsx-6deea0d2ed886a40{color:#fff;background:0 0}.btn-ghost.jsx-6deea0d2ed886a40:hover{background:#ffffff1a}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/inventarios/page.js",
        lineNumber: 95,
        columnNumber: 9
    }, this);
}
_s(InventariosPage, "dRtNAeLgMHRIiB33JKS3Hi+LnyY=");
_c = InventariosPage;
var _c;
__turbopack_context__.k.register(_c, "InventariosPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/history.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>History
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
            d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
            key: "1357e3"
        }
    ],
    [
        "path",
        {
            d: "M3 3v5h5",
            key: "1xhq8a"
        }
    ],
    [
        "path",
        {
            d: "M12 7v5l4 2",
            key: "1fdv2h"
        }
    ]
];
const History = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("history", __iconNode);
;
 //# sourceMappingURL=history.js.map
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/history.js [app-client] (ecmascript) <export default as History>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "History",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/history.js [app-client] (ecmascript)");
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>X
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
            d: "M18 6 6 18",
            key: "1bl5f8"
        }
    ],
    [
        "path",
        {
            d: "m6 6 12 12",
            key: "d8bk6v"
        }
    ]
];
const X = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("x", __iconNode);
;
 //# sourceMappingURL=x.js.map
}),
"[project]/next-app/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "X",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=next-app_5528a98e._.js.map