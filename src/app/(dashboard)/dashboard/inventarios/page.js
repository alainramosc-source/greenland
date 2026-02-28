'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, History, X, Search, AlertTriangle, Shield, ArrowRightLeft, Warehouse,
  ClipboardList, Plus, Loader2, ChevronRight, Calendar, User, Lock
} from 'lucide-react';

const STATUS_LABELS = {
  draft: { label: 'Borrador', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  in_progress: { label: 'En Progreso', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  submitted: { label: 'Enviado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  approved: { label: 'Aprobado', color: '#6a9a04', bg: 'rgba(106,154,4,0.12)' },
  posted: { label: 'Aplicado', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

export default function InventariosPage() {
  const [activeTab, setActiveTab] = useState('stock');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(null);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferring, setTransferring] = useState(false);
  // Counting sessions
  const [countSessions, setCountSessions] = useState([]);
  const [showNewCount, setShowNewCount] = useState(false);
  const [newCount, setNewCount] = useState({ warehouse_id: '', count_type: 'full', responsible_user_id: '', notes: '', freeze: false });
  const [admins, setAdmins] = useState([]);
  const [creatingSession, setCreatingSession] = useState(false);
  const [userId, setUserId] = useState(null);

  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard/pedidos'); return; }
    setIsAdmin(true);

    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setProducts(productsData || []);

    // Fetch warehouses
    const { data: whData } = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');
    setWarehouses(whData || []);

    // Fetch all warehouse stock
    const { data: wsData } = await supabase.from('warehouse_stock').select('*');
    if (wsData) {
      const stockMap = {};
      wsData.forEach(ws => {
        if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
        stockMap[ws.product_id][ws.warehouse_id] = ws;
      });
      setWarehouseStock(stockMap);
    }

    // Fetch counting sessions
    const { data: sessions } = await supabase
      .from('inventory_count_sessions')
      .select('*, warehouse:warehouses(name), responsible:profiles!inventory_count_sessions_responsible_user_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    setCountSessions(sessions || []);

    // Fetch admin users for responsible dropdown
    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin');
    setAdmins(adminUsers || []);

    setUserId(user.id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustmentAmount || !selectedWarehouse) return;

    setSubmitting(true);
    const { data, error } = await supabase.rpc('adjust_warehouse_stock', {
      p_product_id: selectedProduct.id,
      p_warehouse_id: selectedWarehouse,
      p_quantity_change: parseInt(adjustmentAmount),
      p_reason: adjustmentReason || 'Ajuste manual'
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      await fetchData();
      setSelectedProduct(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setSelectedWarehouse('');
    }
    setSubmitting(false);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!showTransfer || !transferFrom || !transferTo || !transferQty) return;
    if (transferFrom === transferTo) { alert('Las bodegas deben ser diferentes.'); return; }

    setTransferring(true);
    const { data, error } = await supabase.rpc('transfer_stock', {
      p_product_id: showTransfer.id,
      p_from_warehouse_id: transferFrom,
      p_to_warehouse_id: transferTo,
      p_quantity: parseInt(transferQty)
    });

    if (error) {
      alert('Error: ' + error.message);
    } else if (data && !data.success) {
      alert(data.error);
    } else {
      await fetchData();
      setShowTransfer(null);
      setTransferFrom('');
      setTransferTo('');
      setTransferQty('');
    }
    setTransferring(false);
  };

  const filteredProducts = products.filter(p => {
    const safeSearch = searchTerm?.toLowerCase() || '';
    return !safeSearch ||
      (p.name && p.name.toLowerCase().includes(safeSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(safeSearch));
  });

  const totalItems = products.reduce((sum, p) => sum + Math.max((p.stock_quantity || 0) - (p.reserved_quantity || 0), 0), 0);
  const outOfStockCount = products.filter(p => ((p.stock_quantity || 0) - (p.reserved_quantity || 0)) <= 0).length;
  const lowStockCount = products.filter(p => {
    const s = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
    return s > 0 && s <= 10;
  }).length;

  const getStockStatus = (stock) => {
    if (stock <= 0) return { label: 'Agotado', dotClass: 'bg-red-500', textClass: 'text-red-500' };
    if (stock <= 10) return { label: 'Stock Bajo', dotClass: 'bg-amber-500 animate-pulse', textClass: 'text-amber-500' };
    return { label: 'Disponible', dotClass: 'bg-[#6a9a04]', textClass: 'text-[#6a9a04]' };
  };

  const getWhStock = (productId, warehouseId) => {
    const ws = warehouseStock[productId]?.[warehouseId];
    return ws ? { stock: ws.stock_quantity || 0, reserved: ws.reserved_quantity || 0 } : { stock: 0, reserved: 0 };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p>Cargando inventario...</p>
      </div>
    );
  }

  const handleCreateSession = async () => {
    if (!newCount.warehouse_id) { alert('Selecciona una bodega'); return; }
    setCreatingSession(true);
    const { data, error } = await supabase.rpc('create_count_session', {
      p_warehouse_id: newCount.warehouse_id,
      p_count_type: newCount.count_type,
      p_responsible_user_id: newCount.responsible_user_id || userId,
      p_notes: newCount.notes || null,
      p_freeze: newCount.freeze
    });
    setCreatingSession(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && !data.success) { alert(data.error); return; }
    setShowNewCount(false);
    setNewCount({ warehouse_id: '', count_type: 'full', responsible_user_id: '', notes: '', freeze: false });
    router.push(`/dashboard/inventarios/conteo/${data.session_id}`);
  };

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Inventario</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Gestión de stock por bodega y conteos físicos.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm w-fit">
          {[{ key: 'stock', label: 'Stock', icon: Package }, { key: 'conteos', label: 'Conteos', icon: ClipboardList }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${activeTab === t.key
                  ? 'bg-[#6a9a04] text-white shadow-md'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'stock' && (
          <>
            {/* Search */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar por SKU o nombre..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none w-72 shadow-sm" />
              </div>
            </div>

            {/* Products Table with Warehouse Columns */}
            <div className="glass-panel bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                      <th className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                      {warehouses.map(wh => (
                        <th key={wh.id} className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center" style={{ minWidth: 120 }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <Warehouse className="w-3.5 h-3.5 text-[#6a9a04]" />
                            <span>{wh.name.replace('Bodega ', '')}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Total</th>
                      <th className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Estado</th>
                      <th className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={6 + warehouses.length} className="px-6 py-12 text-center text-slate-400">No se encontraron productos.</td></tr>
                    ) : (
                      filteredProducts.map(product => {
                        const totalStock = product.stock_quantity || 0;
                        const totalReserved = product.reserved_quantity || 0;
                        const available = totalStock - totalReserved;
                        const status = getStockStatus(available);
                        return (
                          <tr key={product.id} className="hover:bg-white/50 transition-colors group">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-white/80 border border-slate-100 shadow-sm overflow-hidden p-0.5 flex-shrink-0 ${totalStock <= 0 ? 'opacity-70' : ''}`}>
                                  <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center">
                                    <Package className="w-4 h-4 text-slate-400" />
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-900 m-0">{product.name}</p>
                                  <p className="text-[11px] text-[#6a9a04] font-bold m-0">${Number(product.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                            {warehouses.map(wh => {
                              const ws = getWhStock(product.id, wh.id);
                              const whAvail = ws.stock - ws.reserved;
                              return (
                                <td key={wh.id} className="px-3 py-3 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-sm font-black ${whAvail <= 0 ? 'text-red-400' : whAvail <= 10 ? 'text-amber-500' : 'text-slate-900'}`}>
                                      {whAvail}
                                    </span>
                                    {ws.reserved > 0 && (
                                      <span className="text-[10px] text-amber-500 font-bold">
                                        ({ws.reserved} res.)
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center">
                              <span className={`text-sm font-black ${available <= 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                {available}
                              </span>
                              <span className="text-[10px] text-slate-400 block">de {totalStock}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`flex items-center justify-center gap-1.5 text-[11px] font-bold ${status.textClass}`}>
                                <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-white hover:text-[#6a9a04] transition-all cursor-pointer bg-transparent flex items-center gap-1"
                                  onClick={() => setSelectedProduct(product)}
                                  title="Ajustar stock"
                                >
                                  <History className="w-3 h-3" /> Ajustar
                                </button>
                                <button
                                  className="px-2.5 py-1.5 rounded-lg border border-[#6a9a04]/30 text-[11px] font-bold text-[#6a9a04] hover:bg-[#6a9a04]/10 transition-all cursor-pointer bg-transparent flex items-center gap-1"
                                  onClick={() => setShowTransfer(product)}
                                  title="Transferir entre bodegas"
                                >
                                  <ArrowRightLeft className="w-3 h-3" /> Transferir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 m-0">Mostrando {filteredProducts.length} de {products.length} productos</p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-5 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
                  <Package className="w-5 h-5 border-none" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 m-0">Disponible Total</p>
                  <p className="text-xl font-black text-slate-900 m-0">{totalItems.toLocaleString('es-MX')}</p>
                </div>
              </div>
              {warehouses.map(wh => {
                const whTotal = products.reduce((sum, p) => {
                  const ws = getWhStock(p.id, wh.id);
                  return sum + Math.max(ws.stock - ws.reserved, 0);
                }, 0);
                return (
                  <div key={wh.id} className="bg-white/60 backdrop-blur-md shadow-lg p-5 rounded-2xl flex items-center gap-3 border-l-4 border-l-[#6a9a04] hover:bg-white/80 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 m-0">{wh.name.replace('Bodega ', '')}</p>
                      <p className="text-xl font-black text-slate-900 m-0">{whTotal.toLocaleString('es-MX')}</p>
                    </div>
                  </div>
                );
              })}
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg p-5 rounded-2xl flex items-center gap-3 hover:bg-white/80 transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-5 h-5 border-none" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 m-0">Agotados</p>
                  <p className="text-xl font-black text-slate-900 m-0">{outOfStockCount}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== CONTEOS TAB ===== */}
        {activeTab === 'conteos' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 m-0">{countSessions.length} sesiones de conteo</p>
              <button onClick={() => setShowNewCount(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#6a9a04] text-white font-bold text-sm rounded-xl border-none cursor-pointer hover:bg-[#6a9a04]/90 transition-all shadow-lg shadow-[#6a9a04]/20">
                <Plus size={16} /> Nuevo Conteo
              </button>
            </div>

            {/* Sessions List */}
            {countSessions.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
                <ClipboardList size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-bold text-slate-400">Sin conteos</p>
                <p className="text-sm text-slate-400 mt-1">Crea tu primera sesión de conteo para iniciar.</p>
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {countSessions.map(session => {
                    const st = STATUS_LABELS[session.status] || STATUS_LABELS.draft;
                    return (
                      <div key={session.id}
                        onClick={() => router.push(`/dashboard/inventarios/conteo/${session.id}`)}
                        className="px-6 py-5 flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer group">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                          <ClipboardList size={20} style={{ color: st.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 m-0">{session.session_code}</p>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                            {session.freeze_inventory && <Lock size={12} className="text-amber-500" title="Inventario congelado" />}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Warehouse size={12} /> {session.warehouse?.name || '—'}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1"><User size={12} /> {session.responsible?.full_name || '—'}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> {new Date(session.created_at).toLocaleDateString('es-MX')}</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-[#6a9a04] transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-[450px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0">Ajustar Stock: {selectedProduct.name}</h3>
              <button onClick={() => { setSelectedProduct(null); setSelectedWarehouse(''); }} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Bodega *</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                >
                  <option value="">— Seleccionar bodega —</option>
                  {warehouses.map(wh => {
                    const ws = getWhStock(selectedProduct.id, wh.id);
                    return (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} (actual: {ws.stock - ws.reserved} disp.)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad a AJUSTAR (+ agregar, - restar)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Ej. 10 o -5"
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none text-lg shadow-sm"
                />
                <small className="block mt-1 text-xs text-slate-400">Positivos para agregar stock, negativos para restar.</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Motivo</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ej. Venta local, Compra, Merma..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setSelectedProduct(null); setSelectedWarehouse(''); }}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >Cancelar</button>
                <button type="submit" disabled={submitting || !selectedWarehouse}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/30 cursor-pointer transition-all border-none disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-[450px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#6a9a04]" />
                Transferir: {showTransfer.name}
              </h3>
              <button onClick={() => { setShowTransfer(null); setTransferFrom(''); setTransferTo(''); setTransferQty(''); }}
                className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-5">
              {/* Current stock summary */}
              <div className="grid grid-cols-2 gap-3">
                {warehouses.map(wh => {
                  const ws = getWhStock(showTransfer.id, wh.id);
                  return (
                    <div key={wh.id} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase m-0">{wh.name.replace('Bodega ', '')}</p>
                      <p className="text-xl font-black text-slate-900 m-0">{ws.stock - ws.reserved}</p>
                      <p className="text-[10px] text-slate-400 m-0">disponibles</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">De bodega *</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                >
                  <option value="">— Origen —</option>
                  {warehouses.map(wh => {
                    const ws = getWhStock(showTransfer.id, wh.id);
                    return <option key={wh.id} value={wh.id}>{wh.name} ({ws.stock - ws.reserved} disp.)</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">A bodega *</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none shadow-sm"
                >
                  <option value="">— Destino —</option>
                  {warehouses.filter(wh => wh.id !== transferFrom).map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad a transferir *</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  placeholder="Ej. 10"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none text-lg shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowTransfer(null); setTransferFrom(''); setTransferTo(''); setTransferQty(''); }}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >Cancelar</button>
                <button type="submit" disabled={transferring || !transferFrom || !transferTo || !transferQty}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/30 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {transferring ? 'Transfiriendo...' : 'Transferir Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Counting Session Modal */}
      {showNewCount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowNewCount(false)}>
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-[500px] rounded-2xl shadow-2xl border border-white overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#6a9a04]" /> Nuevo Conteo Físico
              </h3>
              <button onClick={() => setShowNewCount(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Bodega *</label>
                <select value={newCount.warehouse_id} onChange={e => setNewCount(p => ({ ...p, warehouse_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm">
                  <option value="">— Seleccionar bodega —</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Conteo</label>
                <select value={newCount.count_type} onChange={e => setNewCount(p => ({ ...p, count_type: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm">
                  <option value="full">Completo (todos los SKUs)</option>
                  <option value="partial">Parcial (SKUs con stock)</option>
                  <option value="free">Libre (agregar manualmente)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Responsable</label>
                <select value={newCount.responsible_user_id} onChange={e => setNewCount(p => ({ ...p, responsible_user_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm">
                  <option value="">— Yo mismo —</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas</label>
                <textarea value={newCount.notes} onChange={e => setNewCount(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas opcionales sobre este conteo..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm resize-none"
                  rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={newCount.freeze}
                  onChange={e => setNewCount(p => ({ ...p, freeze: e.target.checked }))}
                  id="freeze-check" className="w-5 h-5 accent-[#6a9a04] cursor-pointer" />
                <label htmlFor="freeze-check" className="text-sm text-slate-700 cursor-pointer">
                  <span className="font-bold">Congelar inventario</span>
                  <span className="text-xs text-slate-400 block">Bloquea movimientos de stock durante el conteo</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowNewCount(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  Cancelar</button>
                <button onClick={handleCreateSession} disabled={creatingSession || !newCount.warehouse_id}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/30 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2">
                  {creatingSession ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creatingSession ? 'Creando...' : 'Crear Conteo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
