'use client';
import { createClient } from '@/utils/supabase/client';
import { validateNumber, sanitizeText } from '@/utils/sanitize';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, History, X, Search, AlertTriangle, Shield, ArrowRightLeft, Warehouse,
  ClipboardList, Plus, Loader2, ChevronRight, Calendar, User, Lock, Eye, EyeOff, Filter,
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, ShoppingCart, Trash2, Check, DollarSign
} from 'lucide-react';
import { useRef } from 'react';

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
  const [isProUser, setIsProUser] = useState(false);
  const [proWarehouseId, setProWarehouseId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [skuFilter, setSkuFilter] = useState([]);
  const [showSkuFilter, setShowSkuFilter] = useState(false);
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
  // Warehouse visibility
  const [hiddenWarehouses, setHiddenWarehouses] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('gl_hidden_warehouses') || '[]'); } catch { return []; }
    }
    return [];
  });
  const [showWhFilter, setShowWhFilter] = useState(false);
  // Movement history
  const [movementLogs, setMovementLogs] = useState([]);
  const [movementSearch, setMovementSearch] = useState('');
  // CSV upload
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvComment, setCsvComment] = useState('');
  const csvInputRef = useRef(null);
  // Bulk sale (PRO)
  const [showBulkSale, setShowBulkSale] = useState(false);
  const [saleItems, setSaleItems] = useState([]); // [{productId, quantity}]
  const [saleSearch, setSaleSearch] = useState('');
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleNote, setSaleNote] = useState('');
  // Retail sales history (PRO)
  const [retailSales, setRetailSales] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');

  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role, sub_role, assigned_warehouse_id').eq('id', user.id).single();
    const isPro = profile?.role === 'distributor' && profile?.sub_role === 'distributor_pro' && profile?.assigned_warehouse_id;
    if (profile?.role !== 'admin' && !isPro) { router.push('/dashboard/pedidos'); return; }
    setIsAdmin(profile?.role === 'admin');
    setIsProUser(!!isPro);
    if (isPro) setProWarehouseId(profile.assigned_warehouse_id);

    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sku');
    setProducts(productsData || []);

    // Fetch warehouses (PRO only sees their assigned warehouse)
    let whQuery = supabase.from('warehouses').select('*').eq('is_active', true).order('name');
    if (isPro) whQuery = whQuery.eq('id', profile.assigned_warehouse_id);
    const { data: whData } = await whQuery;
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

    // Fetch movement logs (last 200)
    let logs = [];
    try {
      const { data: logsData, error: logsErr } = await supabase
        .from('inventory_logs')
        .select('*, product:products(name, sku), user:profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (logsErr) throw logsErr;
      logs = logsData || [];
    } catch {
      // Fallback without joins
      const { data: logsData } = await supabase
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      logs = (logsData || []).map(l => ({
        ...l,
        product: products.find(p => p.id === l.product_id) || null,
        user: null
      }));
    }
    setMovementLogs(logs);

    // Fetch retail sales for PRO users (from inventory_logs — sales are stock adjustments)
    if (isPro) {
      const { data: salesLogs } = await supabase
        .from('inventory_logs')
        .select('*, product:products(name, sku, price)')
        .eq('user_id', user.id)
        .lt('quantity_change', 0)
        .order('created_at', { ascending: false })
        .limit(500);
      setRetailSales(salesLogs || []);
    }

    setUserId(user.id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustmentAmount || !selectedWarehouse) return;

    const qty = parseInt(adjustmentAmount);
    if (isNaN(qty) || qty === 0) {
      alert('Ingresa una cantidad válida.');
      return;
    }

    // For PRO sales, negate the quantity (user enters positive, we subtract)
    const finalQty = isProUser ? -Math.abs(qty) : qty;

    if (finalQty < 0) {
      const ws = getWhStock(selectedProduct.id, selectedWarehouse);
      const currentStock = ws.stock - ws.reserved;
      if (currentStock + finalQty < 0) {
        alert(`No puedes vender ${Math.abs(finalQty)} unidades. Stock disponible: ${currentStock}`);
        return;
      }
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc('adjust_warehouse_stock', {
      p_product_id: selectedProduct.id,
      p_warehouse_id: selectedWarehouse,
      p_quantity_change: finalQty,
      p_reason: sanitizeText(adjustmentReason, 300) || (isProUser ? 'Venta a público' : 'Ajuste manual')
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

    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty < 1) {
      alert('La cantidad de transferencia debe ser un número entero mayor a 0.');
      return;
    }

    setTransferring(true);
    const { data, error } = await supabase.rpc('transfer_stock', {
      p_product_id: showTransfer.id,
      p_from_warehouse_id: transferFrom,
      p_to_warehouse_id: transferTo,
      p_quantity: qty
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
    const matchesSearch = !safeSearch ||
      (p.name && p.name.toLowerCase().includes(safeSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(safeSearch));
    const matchesSku = skuFilter.length === 0 || skuFilter.includes(p.sku);
    return matchesSearch && matchesSku;
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

  // CSV Upload handler — supports two formats:
  // 1) Pivot: SKU | Bodega1 | Bodega2 | ...  (warehouse names as headers)
  // 2) Row:   SKU | Bodega | Cantidad         (one row per SKU+warehouse)
  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvErrors(['El archivo está vacío o no tiene filas de datos.']); setShowCsvModal(true); return; }

      // Detect delimiter (tab, semicolon, or comma)
      const headerLine = lines[0];
      const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
      const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      const headersLower = headers.map(h => h.toLowerCase());

      // Find SKU column
      const skuIdx = headersLower.findIndex(h => h === 'sku' || h === 'código' || h === 'codigo');
      if (skuIdx === -1) {
        setCsvErrors([`No se encontró la columna SKU. Columnas encontradas: [${headers.join(', ')}]`]);
        setCsvRows([]);
        setShowCsvModal(true);
        return;
      }

      // Check if it's pivot format (warehouse names as headers) or row format
      const whIdx = headersLower.findIndex(h => h === 'bodega' || h === 'warehouse' || h === 'almacen' || h === 'almacén');
      const qtyIdx = headersLower.findIndex(h => h === 'cantidad' || h === 'stock' || h === 'qty' || h === 'quantity');
      const isPivot = whIdx === -1 || qtyIdx === -1;

      const errors = [];
      const rows = [];

      if (isPivot) {
        // PIVOT FORMAT: Each non-SKU header is a warehouse name
        const warehouseColumns = [];
        for (let c = 0; c < headers.length; c++) {
          if (c === skuIdx) continue;
          const wh = warehouses.find(w => w.name.toLowerCase() === headers[c].toLowerCase());
          if (wh) {
            warehouseColumns.push({ idx: c, warehouse: wh });
          } else if (headers[c].trim()) {
            errors.push(`Columna "${headers[c]}" no coincide con ninguna bodega registrada`);
          }
        }

        if (warehouseColumns.length === 0) {
          setCsvErrors([`No se encontraron bodegas en las columnas. Columnas: [${headers.join(', ')}]. Bodegas registradas: [${warehouses.map(w => w.name).join(', ')}]`]);
          setCsvRows([]);
          setShowCsvModal(true);
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          const sku = cols[skuIdx]?.toUpperCase();
          if (!sku) continue;

          const product = products.find(p => p.sku?.toUpperCase() === sku);
          if (!product) { errors.push(`Fila ${i + 1}: SKU "${sku}" no encontrado`); continue; }

          for (const wc of warehouseColumns) {
            const qty = parseInt(cols[wc.idx]);
            if (isNaN(qty) || qty < 0) continue; // Skip empty/invalid cells
            rows.push({
              sku, productId: product.id, productName: product.name,
              warehouseId: wc.warehouse.id, warehouseName: wc.warehouse.name, quantity: qty
            });
          }
        }
      } else {
        // ROW FORMAT: SKU, Bodega, Cantidad
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          const sku = cols[skuIdx]?.toUpperCase();
          const whName = cols[whIdx];
          const qty = parseInt(cols[qtyIdx]);

          if (!sku || !whName) continue;

          const product = products.find(p => p.sku?.toUpperCase() === sku);
          const warehouse = warehouses.find(w => w.name.toLowerCase() === whName.toLowerCase());

          if (!product) { errors.push(`Fila ${i + 1}: SKU "${sku}" no encontrado`); continue; }
          if (!warehouse) { errors.push(`Fila ${i + 1}: Bodega "${whName}" no encontrada`); continue; }
          if (isNaN(qty) || qty < 0) { errors.push(`Fila ${i + 1}: Cantidad inválida "${cols[qtyIdx]}"`); continue; }

          rows.push({ sku, productId: product.id, productName: product.name, warehouseId: warehouse.id, warehouseName: warehouse.name, quantity: qty });
        }
      }

      setCsvRows(rows);
      setCsvErrors(errors);
      setCsvResult(null);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleCsvUpload = async () => {
    setCsvUploading(true);
    let success = 0;
    let failed = 0;
    const failedErrors = [];
    const reason = csvComment.trim() || 'Carga masiva CSV';
    for (const row of csvRows) {
      // Sum mode: CSV quantity is ADDED to existing stock
      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: row.productId,
        p_warehouse_id: row.warehouseId,
        p_quantity_change: row.quantity,
        p_reason: reason
      });

      if (error) {
        failed++;
        if (failedErrors.length < 5) failedErrors.push(`${row.sku} → ${row.warehouseName}: ${error.message}`);
      } else {
        success++;
      }
    }
    setCsvResult({ success, failed, errors: failedErrors, comment: reason });
    setCsvUploading(false);
    if (failed === 0) {
      await fetchData();
    }
  };

  const downloadCsvTemplate = () => {
    const rows = ['SKU,Bodega,Cantidad'];
    products.slice(0, 3).forEach(p => {
      warehouses.filter(w => !hiddenWarehouses.includes(w.id)).forEach(w => {
        rows.push(`${p.sku},${w.name},0`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_inventario.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <>
      <div className="relative">
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">{isProUser ? `Inventario — ${warehouses[0]?.name || 'Mi Zona'}` : 'Inventario'}</h1>
              <p className="text-slate-500 mt-1 font-medium m-0">{isProUser ? 'Stock de tu almacén asignado. Registra ventas a público.' : 'Gestión de stock por bodega y conteos físicos.'}</p>
            </div>
            {isProUser && (
              <button onClick={() => { setShowBulkSale(true); setSaleItems([]); setSaleSearch(''); setSaleNote(''); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 cursor-pointer transition-all shadow-lg shadow-green-600/25 border-none"
              >
                <ShoppingCart size={18} /> Venta a Público
              </button>
            )}
          </div>

          {/* Tabs — PRO only sees Stock */}
          <div className="flex gap-1 mb-6 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm w-fit">
            {[{ key: 'stock', label: 'Stock', icon: Package }, ...(isProUser ? [{ key: 'ventas', label: 'Ventas', icon: ShoppingCart }] : []), ...(isAdmin ? [{ key: 'historial', label: 'Historial', icon: History }, { key: 'conteos', label: 'Conteos', icon: ClipboardList }] : [])].map(t => (
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
              {/* Search + CSV Upload */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar por SKU o nombre..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none w-72 shadow-sm" />
                </div>
                {/* SKU multi-select filter */}
                <div className="relative">
                  <button onClick={() => setShowSkuFilter(!showSkuFilter)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-all shadow-sm ${
                      skuFilter.length > 0 ? 'bg-[#6a9a04] text-white border-[#6a9a04]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#6a9a04]/50'
                    }`}>
                    <Filter className="w-4 h-4" /> SKUs
                    {skuFilter.length > 0 && <span className="bg-white/30 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{skuFilter.length}</span>}
                  </button>
                  {showSkuFilter && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 min-w-[240px] max-h-[360px] flex flex-col">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 m-0 border-b border-slate-100">Filtrar por SKU</p>
                      <div className="overflow-y-auto flex-1 p-1">
                        {products.map(p => {
                          const isSelected = skuFilter.includes(p.sku);
                          return (
                            <button key={p.id} onClick={() => {
                              setSkuFilter(prev => isSelected ? prev.filter(s => s !== p.sku) : [...prev, p.sku]);
                            }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border-none cursor-pointer transition-all ${
                                isSelected ? 'bg-[#6a9a04]/10 text-slate-900 font-bold' : 'bg-transparent text-slate-600 hover:bg-slate-50'
                              }`}>
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] shrink-0 ${
                                isSelected ? 'bg-[#6a9a04] border-[#6a9a04] text-white' : 'border-slate-300 bg-white'
                              }`}>{isSelected ? '✓' : ''}</span>
                              <span className="font-mono text-[11px] text-slate-400 w-10 shrink-0">{p.sku}</span>
                              <span className="truncate text-xs">{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      {skuFilter.length > 0 && (
                        <button onClick={() => setSkuFilter([])}
                          className="w-full text-center text-xs text-[#6a9a04] font-bold py-2.5 border-t border-slate-100 bg-transparent border-l-0 border-r-0 border-b-0 cursor-pointer hover:underline">
                          Limpiar filtro
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Warehouse visibility toggle */}
                <div className="relative">
                  <button onClick={() => setShowWhFilter(!showWhFilter)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-all shadow-sm ${hiddenWarehouses.length > 0 ? 'bg-[#6a9a04] text-white border-[#6a9a04]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#6a9a04]/50'
                      }`}>
                    <Filter className="w-4 h-4" /> Bodegas
                    {hiddenWarehouses.length > 0 && <span className="bg-white/30 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{warehouses.length - hiddenWarehouses.length}/{warehouses.length}</span>}
                  </button>
                  {showWhFilter && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 min-w-[220px] p-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 m-0">Mostrar / Ocultar</p>
                      {warehouses.map(wh => {
                        const isHidden = hiddenWarehouses.includes(wh.id);
                        return (
                          <button key={wh.id} onClick={() => {
                            const updated = isHidden
                              ? hiddenWarehouses.filter(id => id !== wh.id)
                              : [...hiddenWarehouses, wh.id];
                            setHiddenWarehouses(updated);
                            localStorage.setItem('gl_hidden_warehouses', JSON.stringify(updated));
                          }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all ${isHidden ? 'text-slate-400 bg-transparent hover:bg-slate-50' : 'text-slate-800 bg-[#6a9a04]/5 hover:bg-[#6a9a04]/10'
                              }`}>
                            {isHidden ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-[#6a9a04]" />}
                            {wh.name}
                          </button>
                        );
                      })}
                      {hiddenWarehouses.length > 0 && (
                        <button onClick={() => { setHiddenWarehouses([]); localStorage.removeItem('gl_hidden_warehouses'); }}
                          className="w-full text-center text-xs text-[#6a9a04] font-bold py-2 mt-1 border-t border-slate-100 bg-transparent border-l-0 border-r-0 border-b-0 cursor-pointer hover:underline">
                          Mostrar todas
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isAdmin && (
                <>
                {/* CSV Upload Button */}
                <input type="file" ref={csvInputRef} accept=".csv,.txt" onChange={handleCsvFile} className="hidden" />
                <button onClick={() => csvInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-[#6a9a04]/30 text-[#6a9a04] bg-[#6a9a04]/5 hover:bg-[#6a9a04]/15 cursor-pointer transition-all shadow-sm ml-auto"
                >
                  <Upload className="w-4 h-4" /> Cargar CSV
                </button>
                <button onClick={downloadCsvTemplate}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" /> Plantilla
                </button>
                </>
                )}
              </div>

              {/* Products Table with Warehouse Columns */}
              <div className="glass-panel bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                        <th className="px-3 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                        {warehouses.filter(wh => !hiddenWarehouses.includes(wh.id)).map(wh => (
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
                        <tr><td colSpan={6 + warehouses.filter(wh => !hiddenWarehouses.includes(wh.id)).length} className="px-6 py-12 text-center text-slate-400">No se encontraron productos.</td></tr>
                      ) : (
                        filteredProducts.map(product => {
                          // Calculate total from warehouse_stock (source of truth) instead of products table
                          const totalStock = warehouses.reduce((sum, wh) => sum + (getWhStock(product.id, wh.id).stock || 0), 0);
                          const totalReserved = warehouses.reduce((sum, wh) => sum + (getWhStock(product.id, wh.id).reserved || 0), 0);
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
                              {warehouses.filter(wh => !hiddenWarehouses.includes(wh.id)).map(wh => {
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
                                  {isProUser && available > 0 && (
                                    <button
                                      className="px-2.5 py-1.5 rounded-lg border border-green-300 text-[11px] font-bold text-green-700 hover:bg-green-50 transition-all cursor-pointer bg-transparent flex items-center gap-1"
                                      onClick={() => { setSelectedProduct(product); setSelectedWarehouse(proWarehouseId); setAdjustmentReason('Venta a público'); }}
                                      title="Registrar venta a público"
                                    >
                                      <Plus className="w-3 h-3" /> Venta
                                    </button>
                                  )}
                                  {isAdmin && (
                                  <>
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
                                  </>
                                  )}
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
                {warehouses.filter(wh => !hiddenWarehouses.includes(wh.id)).map(wh => {
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

              {/* Inventory Valuation */}
              {isAdmin && (() => {
                const visibleWarehouses = warehouses.filter(wh => !hiddenWarehouses.includes(wh.id));
                const warehouseValues = visibleWarehouses.map(wh => {
                  const value = products.reduce((sum, p) => {
                    const ws = getWhStock(p.id, wh.id);
                    const cost = Number(p.avg_cost) || 0;
                    return sum + (ws.stock * cost);
                  }, 0);
                  return { ...wh, value };
                });
                const grandTotal = warehouseValues.reduce((sum, wh) => sum + wh.value, 0);
                const skusWithCost = products.filter(p => Number(p.avg_cost) > 0).length;
                return (
                  <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white m-0 tracking-tight">Valor de Inventario</h3>
                        <p className="text-[10px] text-slate-400 font-medium m-0">Stock actual × costo promedio ponderado ({skusWithCost}/{products.length} SKUs con costo)</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0">Valor Total</p>
                        <p className="text-2xl font-black text-emerald-400 m-0 tracking-tight">${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {warehouseValues.map(wh => (
                        <div key={wh.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0 mb-1">{wh.name.replace('Bodega ', '')}</p>
                          <p className="text-lg font-black text-white m-0">${wh.value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* ===== VENTAS TAB (PRO) ===== */}
          {activeTab === 'ventas' && isProUser && (() => {
            const filtered = retailSales.filter(s => {
              if (!salesSearch) return true;
              const q = salesSearch.toLowerCase();
              return (s.product?.name || '').toLowerCase().includes(q) || (s.product?.sku || '').toLowerCase().includes(q) || (s.reason || '').toLowerCase().includes(q);
            });
            const totalPieces = filtered.reduce((s, log) => s + Math.abs(log.quantity_change || 0), 0);
            const totalValue = filtered.reduce((s, log) => s + (Math.abs(log.quantity_change || 0) * Number(log.product?.price || 0)), 0);
            return (
              <div>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por producto, SKU, motivo..."
                      value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm" />
                  </div>
                  <p className="text-sm text-slate-500 m-0 ml-auto">{filtered.length} movimientos · {totalPieces} pzas · <span className="font-bold text-slate-800">${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span> (valor estimado)</p>
                </div>
                <div className="glass-panel bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Fecha</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">SKU</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Cantidad</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Precio Unit.</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">No hay ventas registradas.</td></tr>
                        ) : filtered.map(log => {
                          const qty = Math.abs(log.quantity_change || 0);
                          const price = Number(log.product?.price || 0);
                          const subtotal = qty * price;
                          return (
                            <tr key={log.id} className="hover:bg-white/50 transition-colors">
                              <td className="px-5 py-3">
                                <span className="text-sm text-slate-600">{new Date(log.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                <p className="text-[10px] text-slate-400 m-0">{new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-slate-500 font-bold">{log.product?.sku || '—'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-slate-800">{log.product?.name || 'Producto'}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-black text-red-500">{qty}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-slate-600">${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold text-slate-900">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-slate-500 truncate block max-w-[200px]">{log.reason || '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ===== HISTORIAL TAB ===== */}
          {activeTab === 'historial' && (() => {
            const filteredLogs = movementLogs.filter(log => {
              if (!movementSearch) return true;
              const s = movementSearch.toLowerCase();
              return (
                (log.product?.name || '').toLowerCase().includes(s) ||
                (log.product?.sku || '').toLowerCase().includes(s) ||
                (log.reason || '').toLowerCase().includes(s) ||
                (log.user?.full_name || '').toLowerCase().includes(s)
              );
            });
            return (
              <div>
                {/* Search */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por producto, SKU, motivo, usuario..."
                      value={movementSearch} onChange={(e) => setMovementSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm" />
                  </div>
                  <p className="text-sm text-slate-500 m-0 ml-auto">{filteredLogs.length} movimientos</p>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
                    <History size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-bold text-slate-400">Sin movimientos</p>
                    <p className="text-sm text-slate-400 mt-1">Los ajustes manuales y cargas CSV aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Fecha</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Cantidad</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Bodega</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Motivo</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Usuario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLogs.map(log => {
                            const qty = log.quantity_change || 0;
                            const isPositive = qty > 0;
                            // Extract warehouse name from reason if present e.g. "[Bodega: Echeverría]"
                            const whMatch = (log.reason || '').match(/\[Bodega:\s*(.+?)\]/);
                            const warehouseName = whMatch ? whMatch[1] : '—';
                            const cleanReason = (log.reason || '—').replace(/\s*\[Bodega:.*?\]/, '').trim();
                            const dateStr = new Date(log.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                            const timeStr = new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <tr key={log.id} className="hover:bg-white/50 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="text-sm font-medium text-slate-800 m-0">{dateStr}</p>
                                  <p className="text-[10px] text-slate-400 m-0">{timeStr}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-bold text-slate-800 m-0">{log.product?.name || '—'}</p>
                                  <p className="text-[10px] font-mono text-[#6a9a04] m-0">{log.product?.sku || ''}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-black ${
                                    isPositive
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : qty < 0
                                        ? 'bg-red-50 text-red-600 border border-red-200'
                                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                                  }`}>
                                    {isPositive ? '+' : ''}{qty}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-600 flex items-center gap-1">
                                    <Warehouse size={12} className="text-slate-400" />
                                    {warehouseName}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-xs text-slate-600 m-0 max-w-[200px] truncate" title={cleanReason}>{cleanReason}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <User size={12} className="text-slate-400" />
                                    {log.user?.full_name || log.user?.email?.split('@')[0] || '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-200">
                      <p className="text-xs text-slate-400 m-0">Mostrando los últimos {filteredLogs.length} movimientos</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
                <h3 className="text-lg font-bold text-slate-900 m-0">{isProUser ? '💰 Venta a Público' : 'Ajustar Stock'}: {selectedProduct.name}</h3>
                <button onClick={() => { setSelectedProduct(null); setSelectedWarehouse(''); setAdjustmentReason(''); setAdjustmentAmount(''); }} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAdjustStock} className="p-6 space-y-5">
                {!isProUser && (
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
                )}
                {isProUser && selectedWarehouse && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-medium">
                    🏢 {warehouses.find(w => w.id === selectedWarehouse)?.name} — Disponible: <strong>{getWhStock(selectedProduct.id, selectedWarehouse).stock - getWhStock(selectedProduct.id, selectedWarehouse).reserved}</strong> uds
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{isProUser ? 'Cantidad vendida' : 'Cantidad a AJUSTAR (+ agregar, - restar)'}</label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder={isProUser ? 'Ej. 5' : 'Ej. 10 o -5'}
                    min={isProUser ? '1' : undefined}
                    autoFocus
                    required
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-slate-800 outline-none text-lg shadow-sm"
                  />
                  {isProUser
                    ? <small className="block mt-1 text-xs text-green-600 font-medium">Ingresa la cantidad de piezas vendidas. Se restará del inventario.</small>
                    : <small className="block mt-1 text-xs text-slate-400">Positivos para agregar stock, negativos para restar.</small>
                  }
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
                  <button type="button" onClick={() => { setSelectedProduct(null); setSelectedWarehouse(''); setAdjustmentReason(''); setAdjustmentAmount(''); }}
                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                  >Cancelar</button>
                  <button type="submit" disabled={submitting || !selectedWarehouse}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold shadow-lg cursor-pointer transition-all border-none disabled:opacity-50 ${isProUser ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30' : 'bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-[#6a9a04]/30'}`}
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

      {/* CSV Preview Modal */}
      {
        showCsvModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
            <div className="bg-white/95 backdrop-blur-xl border border-white max-w-[700px] w-full rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-white/50">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-[#6a9a04]" />
                  <h3 className="text-lg font-bold text-slate-900 m-0">Carga Masiva de Inventario</h3>
                </div>
                <button onClick={() => { setShowCsvModal(false); setCsvRows([]); setCsvErrors([]); setCsvResult(null); setCsvComment(''); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Errors */}
                {csvErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-red-700 mb-2 m-0 flex items-center gap-2"><AlertTriangle size={14} /> {csvErrors.length} error(es)</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {csvErrors.map((e, i) => <p key={i} className="text-xs text-red-600 m-0">{e}</p>)}
                    </div>
                  </div>
                )}

                {/* Result */}
                {csvResult && (
                  <div className={`border rounded-xl p-4 ${csvResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-sm font-bold m-0 flex items-center gap-2">
                      {csvResult.failed === 0 ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                      {csvResult.success} registros actualizados exitosamente
                      {csvResult.failed > 0 && `, ${csvResult.failed} fallaron`}
                    </p>
                    {csvResult.errors && csvResult.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {csvResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600 m-0">{err}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Table */}
                {csvRows.length > 0 && !csvResult && (
                  <>
                    {/* Comment/Notes */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">📝 Comentarios / Motivo de la carga *</label>
                      <textarea
                        value={csvComment}
                        onChange={(e) => setCsvComment(e.target.value)}
                        placeholder="Ej: Inventario inicial, Reconteo Bodega 1, Ajuste post-auditoría, Recepción de mercancía lote #45..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 text-sm text-slate-800 outline-none resize-none placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 m-0">Este comentario quedará registrado en cada movimiento de inventario.</p>
                    </div>
                    <p className="text-sm text-slate-600 font-medium m-0">{csvRows.length} registros listos para cargar:</p>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">SKU</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Producto</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Bodega</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {csvRows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-sm font-mono font-bold text-[#6a9a04]">{row.sku}</td>
                              <td className="px-4 py-2 text-sm text-slate-700">{row.productName}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{row.warehouseName}</td>
                              <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right">{row.quantity.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {csvRows.length === 0 && csvErrors.length === 0 && (
                  <p className="text-center text-slate-400 py-8 m-0">No se encontraron datos válidos en el archivo.</p>
                )}
              </div>

              <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => { setShowCsvModal(false); setCsvRows([]); setCsvErrors([]); setCsvResult(null); setCsvComment(''); }}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  {csvResult ? 'Cerrar' : 'Cancelar'}
                </button>
                {csvRows.length > 0 && !csvResult && (
                  <button onClick={handleCsvUpload} disabled={csvUploading || !csvComment.trim()}
                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2">
                    {csvUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {csvUploading ? 'Cargando...' : `Aplicar ${csvRows.length} registros`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ===== BULK SALE MODAL (PRO) ===== */}
      {showBulkSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[600px] rounded-2xl shadow-2xl border border-white overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-green-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 m-0 flex items-center gap-2"><ShoppingCart size={20} className="text-green-600" /> Venta a Público</h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">{warehouses[0]?.name || 'Almacén'} — Agrega los productos vendidos</p>
              </div>
              <button onClick={() => setShowBulkSale(false)} className="p-1.5 rounded-lg hover:bg-white bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Product search & add */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                />
                {saleSearch.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[200px] overflow-y-auto">
                    {products
                      .filter(p => {
                        const s = saleSearch.toLowerCase();
                        return (p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)) && !saleItems.find(si => si.productId === p.id);
                      })
                      .slice(0, 8)
                      .map(p => {
                        const ws = getWhStock(p.id, proWarehouseId || warehouses[0]?.id);
                        const avail = ws.stock - ws.reserved;
                        return (
                          <button key={p.id} onClick={() => {
                            if (avail <= 0) return;
                            setSaleItems(prev => [...prev, { productId: p.id, quantity: 1, price: Number(p.price || 0) }]);
                            setSaleSearch('');
                          }}
                            disabled={avail <= 0}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left border-none text-sm transition-all ${avail > 0 ? 'hover:bg-green-50 cursor-pointer bg-transparent' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                          >
                            <div>
                              <span className="font-bold text-slate-800">{p.name}</span>
                              <span className="ml-2 font-mono text-[10px] text-slate-400">{p.sku}</span>
                            </div>
                            <span className={`text-xs font-bold ${avail > 0 ? 'text-green-600' : 'text-red-400'}`}>
                              {avail > 0 ? `${avail} disp.` : 'Agotado'}
                            </span>
                          </button>
                        );
                      })}
                    {products.filter(p => {
                      const s = saleSearch.toLowerCase();
                      return (p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)) && !saleItems.find(si => si.productId === p.id);
                    }).length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400 m-0">No se encontraron productos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Sale items list */}
              {saleItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium m-0">Busca y agrega productos arriba</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saleItems.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    const ws = getWhStock(item.productId, proWarehouseId || warehouses[0]?.id);
                    const avail = ws.stock - ws.reserved;
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 m-0 truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-400 m-0 font-mono">{product.sku} · Disponible: {avail}</p>
                          </div>
                          <button onClick={() => setSaleItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-none transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">Cant:</span>
                            <button onClick={() => setSaleItems(prev => prev.map((si, i) => i === idx ? { ...si, quantity: Math.max(1, si.quantity - 1) } : si))}
                              className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer bg-transparent font-bold text-xs">−</button>
                            <input type="number" min="1" max={avail} value={item.quantity}
                              onChange={(e) => {
                                const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), avail);
                                setSaleItems(prev => prev.map((si, i) => i === idx ? { ...si, quantity: val } : si));
                              }}
                              className="w-12 text-center py-0.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                            <button onClick={() => setSaleItems(prev => prev.map((si, i) => i === idx ? { ...si, quantity: Math.min(avail, si.quantity + 1) } : si))}
                              className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer bg-transparent font-bold text-xs">+</button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">Precio:</span>
                            <span className="text-slate-400 text-sm">$</span>
                            <input type="number" min="0" step="0.01" value={item.price}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setSaleItems(prev => prev.map((si, i) => i === idx ? { ...si, price: val } : si));
                              }}
                              className="w-20 text-right py-0.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-xs font-black text-green-700 m-0">${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Note */}
              {saleItems.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nota (opcional)</label>
                  <input type="text" value={saleNote} onChange={(e) => setSaleNote(e.target.value)}
                    placeholder="Ej. Cliente Juan Pérez, factura #123..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {saleItems.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">{saleItems.length}</span> productos · <span className="font-bold">{saleItems.reduce((s, i) => s + i.quantity, 0)}</span> unidades
                  </div>
                  <div className="text-lg font-black text-green-700">
                    Total: ${saleItems.reduce((s, i) => s + (i.quantity * i.price), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowBulkSale(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                  >Cancelar</button>
                  <button
                    disabled={saleSaving || saleItems.length === 0}
                    onClick={async () => {
                      setSaleSaving(true);
                      const whId = proWarehouseId || warehouses[0]?.id;
                      let success = 0, failed = 0;
                      const reason = saleNote.trim()
                        ? `Venta a público — ${saleNote.trim()} — Total: $${saleItems.reduce((s, i) => s + (i.quantity * i.price), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : `Venta a público — Total: $${saleItems.reduce((s, i) => s + (i.quantity * i.price), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                      for (const item of saleItems) {
                        const { error } = await supabase.rpc('adjust_warehouse_stock', {
                          p_product_id: item.productId,
                          p_warehouse_id: whId,
                          p_quantity_change: -Math.abs(item.quantity),
                          p_reason: reason
                        });
                        if (error) failed++; else success++;
                      }
                      setSaleSaving(false);
                      if (failed > 0) {
                        alert(`${success} productos actualizados, ${failed} con error.`);
                      }
                      await fetchData();
                      setShowBulkSale(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 cursor-pointer transition-all shadow-lg shadow-green-600/20 border-none disabled:opacity-50"
                  >
                    {saleSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {saleSaving ? 'Procesando...' : 'Confirmar Venta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
