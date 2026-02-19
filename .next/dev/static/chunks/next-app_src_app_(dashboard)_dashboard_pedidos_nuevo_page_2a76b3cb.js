(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NuevoPedidoPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/src/utils/supabase/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript) <export default as Minus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/next-app/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/next-app/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function NuevoPedidoPage() {
    _s();
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedCategory, setSelectedCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orderSuccess, setOrderSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$src$2f$utils$2f$supabase$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    // Load products & categories
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NuevoPedidoPage.useEffect": ()=>{
            async function fetchData() {
                // Products
                const { data: productsData } = await supabase.from('products').select(`
          *,
          categories:category_id (name, slug)
        `).eq('is_active', true).order('name');
                if (productsData) setProducts(productsData);
                // Unique categories
                const uniqueCats = Array.from(new Set(productsData?.map({
                    "NuevoPedidoPage.useEffect.fetchData.uniqueCats": (p)=>p.categories?.name
                }["NuevoPedidoPage.useEffect.fetchData.uniqueCats"]))).filter(Boolean);
                setCategories(uniqueCats);
                setLoading(false);
            }
            fetchData();
        }
    }["NuevoPedidoPage.useEffect"], []);
    // Filter products
    const filteredProducts = products.filter((product)=>{
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.categories?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    // Cart logic
    const addToCart = (product)=>{
        setCart((prev)=>{
            const existing = prev.find((item)=>item.id === product.id);
            if (existing) {
                return prev.map((item)=>item.id === product.id ? {
                        ...item,
                        quantity: item.quantity + 1
                    } : item);
            }
            return [
                ...prev,
                {
                    ...product,
                    quantity: 1
                }
            ];
        });
    };
    const removeFromCart = (id)=>{
        setCart((prev)=>prev.filter((item)=>item.id !== id));
    };
    const updateQuantity = (id, delta)=>{
        setCart((prev)=>prev.map((item)=>{
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return {
                        ...item,
                        quantity: newQty
                    };
                }
                return item;
            }));
    };
    const cartTotal = cart.reduce((acc, item)=>acc + item.price * item.quantity, 0);
    // Submit Order
    const handleSubmitOrder = async ()=>{
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");
            // 1. Create Order
            const { data: order, error: orderError } = await supabase.from('orders').insert({
                distributor_id: user.id,
                order_number: `ORD-${Date.now().toString().slice(-6)}`,
                status: 'pending',
                total_amount: cartTotal,
                notes: 'Pedido generado desde web'
            }).select().single();
            if (orderError) throw orderError;
            // 2. Create Order Items
            const orderItems = cart.map((item)=>({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price
                }));
            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) throw itemsError;
            setOrderSuccess(true);
            setCart([]);
            // Redirect after 2s
            setTimeout(()=>{
                router.push('/dashboard/pedidos');
            }, 2000);
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Error al crear el pedido. Intente nuevamente.');
        } finally{
            setIsSubmitting(false);
        }
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-8 text-center text-white",
        children: "Cargando catálogo..."
    }, void 0, false, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
        lineNumber: 138,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-7d9b1d92fb77c1de" + " " + "new-order-container",
        children: [
            orderSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7d9b1d92fb77c1de" + " " + "success-overlay",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-7d9b1d92fb77c1de" + " " + "success-modal glass-panel",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                            size: 64,
                            className: "text-primary mb-4"
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                            lineNumber: 145,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "jsx-7d9b1d92fb77c1de",
                            children: "¡Pedido Creado!"
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                            lineNumber: 146,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-7d9b1d92fb77c1de",
                            children: "Tu pedido ha sido registrado exitosamente."
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                            lineNumber: 147,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-7d9b1d92fb77c1de" + " " + "text-sm text-muted",
                            children: "Redirigiendo..."
                        }, void 0, false, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                            lineNumber: 148,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                    lineNumber: 144,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                lineNumber: 143,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7d9b1d92fb77c1de" + " " + "catalog-section",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "jsx-7d9b1d92fb77c1de" + " " + "mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "text-2xl font-bold text-white mb-4",
                                children: "Nuevo Pedido"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 155,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "filters",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "search-box glass-input-wrapper",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                size: 18,
                                                className: "text-muted"
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 159,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                placeholder: "Buscar productos...",
                                                value: searchQuery,
                                                onChange: (e)=>setSearchQuery(e.target.value),
                                                className: "jsx-7d9b1d92fb77c1de" + " " + "glass-input"
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 160,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 158,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "category-pills",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setSelectedCategory('all'),
                                                className: "jsx-7d9b1d92fb77c1de" + " " + `pill ${selectedCategory === 'all' ? 'active' : ''}`,
                                                children: "Todos"
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 170,
                                                columnNumber: 29
                                            }, this),
                                            categories.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setSelectedCategory(cat),
                                                    className: "jsx-7d9b1d92fb77c1de" + " " + `pill ${selectedCategory === cat ? 'active' : ''}`,
                                                    children: cat
                                                }, cat, false, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                    lineNumber: 177,
                                                    columnNumber: 33
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 169,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 157,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                        lineNumber: 154,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-7d9b1d92fb77c1de" + " " + "products-grid",
                        children: filteredProducts.map((product)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "product-card glass-panel",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "product-image",
                                        children: product.image_url ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: product.image_url,
                                            alt: product.name,
                                            className: "jsx-7d9b1d92fb77c1de"
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                            lineNumber: 194,
                                            columnNumber: 37
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-7d9b1d92fb77c1de" + " " + "placeholder-img",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                size: 32
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 196,
                                                columnNumber: 70
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                            lineNumber: 196,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 192,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "product-info",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-7d9b1d92fb77c1de" + " " + "flex justify-between items-start mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "jsx-7d9b1d92fb77c1de" + " " + "font-semibold text-white",
                                                        children: product.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                        lineNumber: 201,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "jsx-7d9b1d92fb77c1de" + " " + "price",
                                                        children: [
                                                            "$",
                                                            product.price
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                        lineNumber: 202,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 200,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "jsx-7d9b1d92fb77c1de" + " " + "text-sm text-muted mb-4 line-clamp-2",
                                                children: product.description
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 204,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-7d9b1d92fb77c1de" + " " + "flex justify-between items-center mt-auto",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "jsx-7d9b1d92fb77c1de" + " " + "text-xs text-muted",
                                                        children: [
                                                            "SKU: ",
                                                            product.sku
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                        lineNumber: 206,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>addToCart(product),
                                                        className: "jsx-7d9b1d92fb77c1de" + " " + "btn-add",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                                size: 16
                                                            }, void 0, false, {
                                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                                lineNumber: 211,
                                                                columnNumber: 41
                                                            }, this),
                                                            " Agregar"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                        lineNumber: 207,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 205,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 199,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, product.id, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 191,
                                columnNumber: 25
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                        lineNumber: 189,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                lineNumber: 153,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7d9b1d92fb77c1de" + " " + "cart-sidebar glass-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-7d9b1d92fb77c1de" + " " + "cart-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                size: 20
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 222,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "jsx-7d9b1d92fb77c1de",
                                children: "Resumen del Pedido"
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 223,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "badge",
                                children: cart.length
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 224,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                        lineNumber: 221,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-7d9b1d92fb77c1de" + " " + "cart-items",
                        children: cart.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-7d9b1d92fb77c1de" + " " + "empty-cart",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                    size: 48,
                                    className: "opacity-20 mb-2"
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                    lineNumber: 230,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "jsx-7d9b1d92fb77c1de",
                                    children: "Tu carrito está vacío"
                                }, void 0, false, {
                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                    lineNumber: 231,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                            lineNumber: 229,
                            columnNumber: 25
                        }, this) : cart.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "cart-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "item-details",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                className: "jsx-7d9b1d92fb77c1de",
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 237,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "jsx-7d9b1d92fb77c1de" + " " + "item-price",
                                                children: [
                                                    "$",
                                                    item.price * item.quantity
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 238,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 236,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "qty-controls",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id),
                                                className: "jsx-7d9b1d92fb77c1de",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__["Minus"], {
                                                    size: 14
                                                }, void 0, false, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                    lineNumber: 242,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 241,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "jsx-7d9b1d92fb77c1de",
                                                children: item.quantity
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 244,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>updateQuantity(item.id, 1),
                                                className: "jsx-7d9b1d92fb77c1de",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                    size: 14
                                                }, void 0, false, {
                                                    fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                    lineNumber: 246,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                                lineNumber: 245,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 240,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 235,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                        lineNumber: 227,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-7d9b1d92fb77c1de" + " " + "cart-footer",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-7d9b1d92fb77c1de" + " " + "total-row",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-7d9b1d92fb77c1de",
                                        children: "Total Estimado"
                                    }, void 0, false, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 256,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "jsx-7d9b1d92fb77c1de" + " " + "total-amount",
                                        children: [
                                            "$",
                                            cartTotal.toFixed(2)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                        lineNumber: 257,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 255,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                disabled: cart.length === 0 || isSubmitting,
                                onClick: handleSubmitOrder,
                                className: "jsx-7d9b1d92fb77c1de" + " " + "btn-checkout",
                                children: isSubmitting ? 'Procesando...' : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        "Confirmar Pedido ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                            lineNumber: 265,
                                            columnNumber: 48
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                                lineNumber: 259,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                        lineNumber: 254,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
                lineNumber: 220,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "7d9b1d92fb77c1de",
                children: ".new-order-container.jsx-7d9b1d92fb77c1de{grid-template-columns:1fr 340px;gap:2rem;height:calc(100vh - 120px);display:grid}.catalog-section.jsx-7d9b1d92fb77c1de{padding-right:1rem;overflow-y:auto}.filters.jsx-7d9b1d92fb77c1de{flex-direction:column;gap:1rem;display:flex}.search-box.jsx-7d9b1d92fb77c1de{border-radius:var(--radius-md);background:#ffffff0d;border:1px solid #ffffff1a;align-items:center;gap:.5rem;padding:.75rem 1rem;display:flex}.glass-input.jsx-7d9b1d92fb77c1de{color:#fff;background:0 0;border:none;outline:none;width:100%}.category-pills.jsx-7d9b1d92fb77c1de{flex-wrap:wrap;gap:.5rem;display:flex}.pill.jsx-7d9b1d92fb77c1de{color:var(--color-text-muted);cursor:pointer;background:#ffffff0d;border:1px solid #ffffff1a;border-radius:20px;padding:.4rem 1rem;font-size:.85rem;transition:all .2s}.pill.jsx-7d9b1d92fb77c1de:hover,.pill.active.jsx-7d9b1d92fb77c1de{background:var(--color-primary);color:#000;border-color:var(--color-primary);font-weight:600}.products-grid.jsx-7d9b1d92fb77c1de{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.5rem;display:grid}.product-card.jsx-7d9b1d92fb77c1de{flex-direction:column;transition:transform .2s;display:flex;overflow:hidden}.product-card.jsx-7d9b1d92fb77c1de:hover{border-color:#4ade204d;transform:translateY(-4px)}.product-image.jsx-7d9b1d92fb77c1de{background:#1a1a2e;justify-content:center;align-items:center;height:160px;display:flex}.product-image.jsx-7d9b1d92fb77c1de img.jsx-7d9b1d92fb77c1de{object-fit:cover;width:100%;height:100%}.placeholder-img.jsx-7d9b1d92fb77c1de{opacity:.3;color:#fff}.product-info.jsx-7d9b1d92fb77c1de{flex-direction:column;flex:1;padding:1rem;display:flex}.price.jsx-7d9b1d92fb77c1de{color:var(--color-primary);font-weight:700}.btn-add.jsx-7d9b1d92fb77c1de{color:#fff;cursor:pointer;background:#ffffff1a;border:none;border-radius:4px;align-items:center;gap:.5rem;padding:.4rem .8rem;font-size:.85rem;transition:background .2s;display:flex}.btn-add.jsx-7d9b1d92fb77c1de:hover{background:var(--color-primary);color:#000}.cart-sidebar.jsx-7d9b1d92fb77c1de{border:1px solid #ffffff1a;flex-direction:column;height:100%;display:flex}.cart-header.jsx-7d9b1d92fb77c1de{color:#fff;border-bottom:1px solid #ffffff1a;align-items:center;gap:.75rem;padding:1.5rem;display:flex}.cart-header.jsx-7d9b1d92fb77c1de h2.jsx-7d9b1d92fb77c1de{margin:0;font-size:1.1rem;font-weight:600}.badge.jsx-7d9b1d92fb77c1de{background:var(--color-primary);color:#000;border-radius:10px;padding:.1rem .5rem;font-size:.75rem;font-weight:700}.cart-items.jsx-7d9b1d92fb77c1de{flex:1;padding:1rem;overflow-y:auto}.empty-cart.jsx-7d9b1d92fb77c1de{height:100%;color:var(--color-text-muted);flex-direction:column;justify-content:center;align-items:center;font-size:.9rem;display:flex}.cart-item.jsx-7d9b1d92fb77c1de{border-bottom:1px solid #ffffff0d;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:1rem;display:flex}.item-details.jsx-7d9b1d92fb77c1de h4.jsx-7d9b1d92fb77c1de{color:#fff;margin:0 0 .25rem;font-size:.9rem}.item-price.jsx-7d9b1d92fb77c1de{color:var(--color-primary);font-size:.85rem;font-weight:600}.qty-controls.jsx-7d9b1d92fb77c1de{background:#ffffff0d;border-radius:4px;align-items:center;gap:.5rem;padding:.25rem;display:flex}.qty-controls.jsx-7d9b1d92fb77c1de button.jsx-7d9b1d92fb77c1de{color:#fff;cursor:pointer;background:0 0;border:none;padding:.25rem;display:flex}.qty-controls.jsx-7d9b1d92fb77c1de button.jsx-7d9b1d92fb77c1de:hover{color:var(--color-primary)}.qty-controls.jsx-7d9b1d92fb77c1de span.jsx-7d9b1d92fb77c1de{color:#fff;text-align:center;min-width:20px;font-size:.9rem}.cart-footer.jsx-7d9b1d92fb77c1de{background:#0003;border-top:1px solid #ffffff1a;padding:1.5rem}.total-row.jsx-7d9b1d92fb77c1de{color:#fff;justify-content:space-between;margin-bottom:1rem;font-size:1.1rem;display:flex}.total-amount.jsx-7d9b1d92fb77c1de{color:var(--color-primary);font-weight:700}.btn-checkout.jsx-7d9b1d92fb77c1de{background:var(--color-primary);color:#000;border-radius:var(--radius-md);cursor:pointer;border:none;justify-content:center;align-items:center;gap:.5rem;width:100%;padding:.8rem;font-weight:700;transition:filter .2s;display:flex}.btn-checkout.jsx-7d9b1d92fb77c1de:disabled{color:#666;cursor:not-allowed;background:#333}.btn-checkout.jsx-7d9b1d92fb77c1de:hover:not(:disabled){filter:brightness(1.1)}.success-overlay.jsx-7d9b1d92fb77c1de{-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:100;background:#000000b3;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.success-modal.jsx-7d9b1d92fb77c1de{text-align:center;border:1px solid var(--color-primary);padding:3rem;box-shadow:0 0 30px #4ade2033}.success-modal.jsx-7d9b1d92fb77c1de h2.jsx-7d9b1d92fb77c1de{color:#fff;margin-bottom:.5rem}.success-modal.jsx-7d9b1d92fb77c1de p.jsx-7d9b1d92fb77c1de{color:var(--color-text-muted)}@media (width<=1024px){.new-order-container.jsx-7d9b1d92fb77c1de{grid-template-columns:1fr;height:auto}.cart-sidebar.jsx-7d9b1d92fb77c1de{z-index:50;border-top:2px solid var(--color-primary);background:#0f0f1a;height:auto;max-height:50vh;position:fixed;bottom:0;left:0;right:0}.dashboard-main.jsx-7d9b1d92fb77c1de{padding-bottom:300px}}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/next-app/src/app/(dashboard)/dashboard/pedidos/nuevo/page.js",
        lineNumber: 141,
        columnNumber: 9
    }, this);
}
_s(NuevoPedidoPage, "iDZlfLDNnQhvR84kXLv0U+kLq7E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$next$2d$app$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = NuevoPedidoPage;
var _c;
__turbopack_context__.k.register(_c, "NuevoPedidoPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=next-app_src_app_%28dashboard%29_dashboard_pedidos_nuevo_page_2a76b3cb.js.map