'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bug, X, Eye, EyeOff, RefreshCw, Trash2, Database, Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminTestingPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewingAsDistributor, setViewingAsDistributor] = useState(false);
    const [distributors, setDistributors] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [log, setLog] = useState([]);
    const [dbSection, setDbSection] = useState(false);
    const [orderStats, setOrderStats] = useState(null);

    const supabase = createClient();

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'admin') {
                setIsAdmin(true);
                // Check if currently simulating
                const isSimulating = sessionStorage.getItem('test_view_role') === 'distributor';
                if (isSimulating) {
                    setViewingAsDistributor(true);
                    const currentSimulatedId = sessionStorage.getItem('test_view_distributor_id');
                    if (currentSimulatedId) {
                        setSelectedDistributor(currentSimulatedId);
                    }
                }
                // Load distributors
                const { data: dists } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'distributor');
                if (dists) setDistributors(dists);
                // Load order stats
                await refreshStats();
            }
            setLoading(false);
        }
        init();
    }, []);

    const refreshStats = async () => {
        const { data: orders } = await supabase.from('orders').select('id, status, total_amount');
        if (orders) {
            const stats = {
                total: orders.length,
                pending: orders.filter(o => o.status === 'pending').length,
                processing: orders.filter(o => o.status === 'processing').length,
                shipped: orders.filter(o => o.status === 'shipped').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                rejected: orders.filter(o => o.status === 'rejected').length,
            };
            setOrderStats(stats);
        }
    };

    const addLog = (msg) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
    };

    // Role simulation switch
    const handleRoleSwitch = (val) => {
        if (val === '') {
            sessionStorage.removeItem('test_view_role');
            sessionStorage.removeItem('test_view_distributor_id');
            setViewingAsDistributor(false);
            setSelectedDistributor('');
            window.location.reload();
        } else {
            sessionStorage.setItem('test_view_role', 'distributor');
            sessionStorage.setItem('test_view_distributor_id', val);
            setViewingAsDistributor(true);
            setSelectedDistributor(val);
            window.location.reload();
        }
    };

    // Reset all reserved_quantity to 0
    const resetReserved = async () => {
        const { error } = await supabase.from('products').update({ reserved_quantity: 0 }).gt('reserved_quantity', 0);
        if (error) addLog(`❌ Error reseteando reservas: ${error.message}`);
        else addLog('✅ Todas las reservas reseteadas a 0');
    };

    // Reset all order status to pending
    const resetOrderStatuses = async () => {
        const { error } = await supabase.from('orders').update({
            status: 'pending',
            payment_confirmed_at: null,
            shipped_at: null,
            delivered_at: null,
            cancelled_at: null,
            rejection_reason: null
        }).neq('status', 'pending');
        if (error) addLog(`❌ Error reseteando estados: ${error.message}`);
        else {
            addLog('✅ Todos los pedidos reseteados a "pending"');
            await refreshStats();
        }
    };

    // Delete all orders
    const deleteAllOrders = async () => {
        if (!confirm('¿Estás seguro? Esto eliminará TODOS los pedidos y sus items.')) return;
        // Delete order items first
        const { error: itemsErr } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (itemsErr) { addLog(`❌ Error eliminando items: ${itemsErr.message}`); return; }
        const { error: ordersErr } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (ordersErr) { addLog(`❌ Error eliminando pedidos: ${ordersErr.message}`); return; }
        addLog('✅ Todos los pedidos eliminados');
        await resetReserved();
        await refreshStats();
    };

    // Set stock for all products
    const resetStock = async (qty = 100) => {
        const { error } = await supabase.from('products').update({ stock_quantity: qty, reserved_quantity: 0 }).eq('is_active', true);
        if (error) addLog(`❌ Error reseteando stock: ${error.message}`);
        else addLog(`✅ Stock de todos los productos establecido a ${qty}`);
    };

    // Create a test order
    const createTestOrder = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { addLog('❌ No hay usuario autenticado'); return; }

        const distId = selectedDistributor || user.id;

        // Get first 3 products
        const { data: products } = await supabase.from('products').select('id, price').eq('is_active', true).limit(3);
        if (!products || products.length === 0) { addLog('❌ No hay productos activos'); return; }

        const orderNum = `TEST-${Date.now().toString().slice(-6)}`;
        const items = products.map(p => ({ product_id: p.id, quantity: Math.floor(Math.random() * 5) + 1, unit_price: p.price }));
        const total = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

        const { data: order, error: orderErr } = await supabase.from('orders').insert({
            distributor_id: distId,
            order_number: orderNum,
            status: 'pending',
            total_amount: total,
            notes: 'Pedido de prueba generado desde panel de testing'
        }).select().single();

        if (orderErr) { addLog(`❌ Error creando pedido: ${orderErr.message}`); return; }

        const orderItems = items.map(i => ({ order_id: order.id, ...i, subtotal: i.unit_price * i.quantity }));
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
        if (itemsErr) { addLog(`❌ Error creando items: ${itemsErr.message}`); return; }

        // Try to reserve inventory
        await supabase.rpc('reserve_inventory_on_order', { p_order_id: order.id });

        addLog(`✅ Pedido de prueba creado: ${orderNum}`);
        await refreshStats();
    };

    if (loading || !isAdmin) return null;

    return (
        <>
            {/* Floating toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${viewingAsDistributor ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                title="Panel de Testing (Solo Admin)"
            >
                <Bug className="w-5 h-5" />
            </button>

            {/* Role indicator badge */}
            {viewingAsDistributor && (
                <div className="fixed bottom-20 right-4 z-[100] bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    👁 Vista Distribuidor
                </div>
            )}

            {/* Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-6 z-[100] w-96 max-h-[80vh] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                        <div className="flex items-center gap-2">
                            <Bug className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-sm m-0">Panel de Testing</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 p-4 space-y-4">
                        {/* Role Switcher */}
                        <div className="bg-slate-800 rounded-xl p-3 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Eye className="w-3 h-3" /> Simulador de Rol
                            </div>
                            <select
                                className="w-full bg-slate-700 border-none rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
                                value={selectedDistributor}
                                onChange={(e) => handleRoleSwitch(e.target.value)}
                            >
                                <option value="">👑 Vista Administrador (Normal)</option>
                                <optgroup label="Ver como Distribuidor">
                                    {distributors.map(d => (
                                        <option key={d.id} value={d.id}>👁 {d.full_name || d.email}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {/* Order Stats */}
                        {orderStats && (
                            <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <Database className="w-3 h-3" /> Estado Actual
                                    </span>
                                    <button onClick={refreshStats} className="text-slate-400 hover:text-white">
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-center">
                                    <div className="bg-slate-700/50 rounded-lg p-1.5">
                                        <div className="text-sm font-bold">{orderStats.total}</div>
                                        <div className="text-[10px] text-slate-400">Total</div>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-1.5">
                                        <div className="text-sm font-bold text-amber-400">{orderStats.pending}</div>
                                        <div className="text-[10px] text-slate-400">Pend.</div>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-1.5">
                                        <div className="text-sm font-bold text-green-400">{orderStats.processing}</div>
                                        <div className="text-[10px] text-slate-400">Pagados</div>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-1.5">
                                        <div className="text-sm font-bold text-red-400">{orderStats.cancelled + orderStats.rejected}</div>
                                        <div className="text-[10px] text-slate-400">Can/Rej</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DB Actions */}
                        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                            <button
                                onClick={() => setDbSection(!dbSection)}
                                className="flex items-center justify-between w-full text-xs font-bold text-slate-400 uppercase tracking-wider"
                            >
                                <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Acciones de BD</span>
                                {dbSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {dbSection && (
                                <div className="space-y-2 pt-2">
                                    <button onClick={createTestOrder} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors">
                                        + Crear Pedido de Prueba
                                    </button>
                                    <button onClick={() => resetStock(100)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors">
                                        🔄 Resetear Stock a 100
                                    </button>
                                    <button onClick={resetReserved} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors">
                                        🔓 Liberar Todas las Reservas
                                    </button>
                                    <button onClick={resetOrderStatuses} className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors">
                                        ↩ Resetear Estados a "Pending"
                                    </button>
                                    <button onClick={deleteAllOrders} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors">
                                        🗑 Eliminar TODOS los Pedidos
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Activity Log */}
                        {log.length > 0 && (
                            <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log</div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {log.map((entry, i) => (
                                        <p key={i} className="text-[11px] text-slate-300 m-0 font-mono leading-relaxed">{entry}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
