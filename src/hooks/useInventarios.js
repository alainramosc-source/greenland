import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { sanitizeText } from '@/utils/sanitize';

export const STATUS_LABELS = {
  draft: { label: 'Borrador', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  in_progress: { label: 'En Progreso', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  submitted: { label: 'Enviado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  approved: { label: 'Aprobado', color: '#6a9a04', bg: 'rgba(106,154,4,0.12)' },
  posted: { label: 'Aplicado', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

export function useInventarios() {
  const supabase = createClient();
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState('stock');

  // Core Data
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});
  const [loading, setLoading] = useState(true);

  // User Profile Roles
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [proWarehouseId, setProWarehouseId] = useState(null);
  const [userId, setUserId] = useState(null);

  // Stock Adjustment State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search & SKU Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [skuFilter, setSkuFilter] = useState([]);
  const [showSkuFilter, setShowSkuFilter] = useState(false);

  // Transfer Modal State
  const [showTransfer, setShowTransfer] = useState(null);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferCreditAmount, setTransferCreditAmount] = useState('');
  const [transferProInfo, setTransferProInfo] = useState(null);
  const [proDistributors, setProDistributors] = useState([]);

  // Counting Sessions State
  const [countSessions, setCountSessions] = useState([]);
  const [showNewCount, setShowNewCount] = useState(false);
  const [newCount, setNewCount] = useState({ warehouse_id: '', count_type: 'full', responsible_user_id: '', notes: '', freeze: false });
  const [admins, setAdmins] = useState([]);
  const [creatingSession, setCreatingSession] = useState(false);

  // Warehouse Column Visibility
  const [hiddenWarehouses, setHiddenWarehouses] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('gl_hidden_warehouses') || '[]'); } catch { return []; }
    }
    return [];
  });
  const [showWhFilter, setShowWhFilter] = useState(false);

  // Movement Logs History
  const [movementLogs, setMovementLogs] = useState([]);
  const [movementSearch, setMovementSearch] = useState('');

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvComment, setCsvComment] = useState('');
  const csvInputRef = useRef(null);

  // Bulk Sale (PRO) State
  const [showBulkSale, setShowBulkSale] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [saleSearch, setSaleSearch] = useState('');
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleNote, setSaleNote] = useState('');

  // Retail Sales History (PRO)
  const [retailSales, setRetailSales] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');

  // Primary Data Fetching
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, sub_role, assigned_warehouse_id')
        .eq('id', user.id)
        .single();

      const isPro = profile?.role === 'distributor' && profile?.sub_role === 'distributor_pro' && profile?.assigned_warehouse_id;
      if (profile?.role !== 'admin' && !isPro) {
        router.push('/dashboard/pedidos');
        return;
      }

      setIsAdmin(profile?.role === 'admin');
      setIsProUser(!!isPro);
      if (isPro) setProWarehouseId(profile.assigned_warehouse_id);

      // 1. Fetch active products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sku');
      setProducts(productsData || []);

      // 2. Fetch active warehouses
      let whQuery = supabase.from('warehouses').select('*').eq('is_active', true).order('name');
      if (isPro) whQuery = whQuery.eq('id', profile.assigned_warehouse_id);
      const { data: whData } = await whQuery;
      setWarehouses(whData || []);

      // 3. Fetch PRO distributors
      if (profile?.role === 'admin') {
        const { data: proDistData } = await supabase
          .from('profiles')
          .select('id, full_name, client_number, assigned_warehouse_id')
          .eq('role', 'distributor')
          .eq('sub_role', 'distributor_pro')
          .eq('is_active', true);
        setProDistributors(proDistData || []);
      }

      // 4. Fetch warehouse stock matrix
      const { data: wsData } = await supabase.from('warehouse_stock').select('*');
      if (wsData) {
        const stockMap = {};
        wsData.forEach(ws => {
          if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
          stockMap[ws.product_id][ws.warehouse_id] = ws;
        });
        setWarehouseStock(stockMap);
      }

      // 5. Fetch count sessions
      const { data: sessions } = await supabase
        .from('inventory_count_sessions')
        .select('*, warehouse:warehouses(name), responsible:profiles!inventory_count_sessions_responsible_user_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      setCountSessions(sessions || []);

      // 6. Fetch admin users for dropdown
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'admin');
      setAdmins(adminUsers || []);

      // 7. Fetch movement logs (last 200)
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
        const { data: logsData } = await supabase
          .from('inventory_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, email');
        const profMap = {};
        (allProfiles || []).forEach(p => { profMap[p.id] = p; });

        logs = (logsData || []).map(l => ({
          ...l,
          product: (productsData || []).find(p => p.id === l.product_id) || null,
          user: profMap[l.user_id || l.created_by] || null
        }));
      }

      // 8. Fetch order movements (confirmed/shipped/closed orders)
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select(`
            id, order_number, status, created_at, confirmed_at, shipped_at,
            profiles:distributor_id(full_name),
            order_items(id, quantity, product_id, warehouse_id,
              products(name, sku))
          `)
          .in('status', ['confirmed', 'in_fulfillment', 'shipped', 'closed'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (ordersData) {
          const orderLogs = [];
          ordersData.forEach(o => {
            const dateUsed = o.shipped_at || o.confirmed_at || o.created_at;
            const statusLabel = o.status === 'shipped' || o.status === 'closed' ? 'Enviado' :
                                o.status === 'in_fulfillment' ? 'En Surtido' : 'Confirmado';
            (o.order_items || []).forEach(item => {
              const whName = (whData || []).find(w => w.id === item.warehouse_id)?.name || '';
              orderLogs.push({
                id: `order-${item.id}`,
                created_at: dateUsed,
                quantity_change: -(item.quantity),
                reason: `Pedido #${o.order_number} (${statusLabel}) [Bodega: ${whName}]`,
                product: item.products,
                user: { full_name: o.profiles?.full_name || 'Distribuidor' },
                _source: 'order'
              });
            });
          });
          logs = [...logs, ...orderLogs];
        }
      } catch (e) { console.error('Error fetching order movements:', e); }

      logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMovementLogs(logs);

      // 9. Fetch retail sales for PRO users
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
    } catch (err) {
      console.error('Fetch data error in inventarios:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper: Get stock for product & warehouse
  const getWhStock = useCallback((productId, warehouseId) => {
    const ws = warehouseStock[productId]?.[warehouseId];
    return ws ? { stock: ws.stock_quantity || 0, reserved: ws.reserved_quantity || 0 } : { stock: 0, reserved: 0 };
  }, [warehouseStock]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const safeSearch = searchTerm?.toLowerCase() || '';
      const matchesSearch = !safeSearch ||
        (p.name && p.name.toLowerCase().includes(safeSearch)) ||
        (p.sku && p.sku.toLowerCase().includes(safeSearch));
      const matchesSku = skuFilter.length === 0 || skuFilter.includes(p.sku);
      return matchesSearch && matchesSku;
    });
  }, [products, searchTerm, skuFilter]);

  // KPI Calculations
  const totalItems = useMemo(() => {
    return products.reduce((sum, p) => sum + Math.max((p.stock_quantity || 0) - (p.reserved_quantity || 0), 0), 0);
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => ((p.stock_quantity || 0) - (p.reserved_quantity || 0)) <= 0).length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const s = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
      return s > 0 && s <= 10;
    }).length;
  }, [products]);

  // Stock Status Indicator
  const getStockStatus = useCallback((stock) => {
    if (stock <= 0) return { label: 'Agotado', dotClass: 'bg-red-500', textClass: 'text-red-500' };
    if (stock <= 10) return { label: 'Stock Bajo', dotClass: 'bg-amber-500 animate-pulse', textClass: 'text-amber-500' };
    return { label: 'Disponible', dotClass: 'bg-[#6a9a04]', textClass: 'text-[#6a9a04]' };
  }, []);

  // Action Handler: Adjust Stock / Create Retail Sale
  const handleAdjustStock = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedProduct || !adjustmentAmount || !selectedWarehouse) return;

    const qty = parseInt(adjustmentAmount);
    if (isNaN(qty) || qty === 0) {
      alert('Ingresa una cantidad válida.');
      return;
    }

    if (isProUser) {
      const absQty = Math.abs(qty);
      const ws = getWhStock(selectedProduct.id, selectedWarehouse);
      const currentStock = ws.stock - ws.reserved;
      if (absQty > currentStock) {
        alert(`No puedes vender ${absQty} unidades. Stock disponible: ${currentStock}`);
        return;
      }

      setSubmitting(true);
      const items = [{
        product_id: selectedProduct.id,
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        quantity: absQty,
        sale_price: Number(selectedProduct.price || 0),
      }];
      const noteText = sanitizeText(adjustmentReason, 300) || 'Venta a público';
      const { data, error } = await supabase.rpc('create_retail_sale', {
        p_conversation_id: null,
        p_warehouse_id: selectedWarehouse,
        p_delivery_type: 'pickup',
        p_items: items,
        p_notes: noteText,
      });

      if (error) {
        alert('Error: ' + error.message);
      } else if (data && !data.success) {
        alert(data.error || 'Error al registrar la venta.');
      } else {
        if (data?.order_id) {
          await supabase.from('lastmile_orders').update({
            payment_method: 'cash',
            payment_status: 'paid',
          }).eq('id', data.order_id);
        }
        await fetchData();
        setSelectedProduct(null);
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setSelectedWarehouse('');
      }
      setSubmitting(false);
    } else {
      const finalQty = qty;
      if (finalQty < 0) {
        const ws = getWhStock(selectedProduct.id, selectedWarehouse);
        const currentStock = ws.stock - ws.reserved;
        if (currentStock + finalQty < 0) {
          alert(`Stock insuficiente. Disponible: ${currentStock}`);
          return;
        }
      }

      setSubmitting(true);
      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: selectedProduct.id,
        p_warehouse_id: selectedWarehouse,
        p_quantity_change: finalQty,
        p_reason: sanitizeText(adjustmentReason, 300) || 'Ajuste manual'
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
    }
  }, [selectedProduct, adjustmentAmount, selectedWarehouse, isProUser, getWhStock, adjustmentReason, supabase, fetchData]);

  // Action Handler: Transfer Stock between Warehouses
  const handleTransferFromChange = useCallback((warehouseId) => {
    setTransferFrom(warehouseId);
    if (!warehouseId) { setTransferProInfo(null); setTransferCreditAmount(''); return; }
    const pro = proDistributors.find(d => d.assigned_warehouse_id === warehouseId);
    setTransferProInfo(pro ? { id: pro.id, name: pro.full_name, clientNumber: pro.client_number } : null);
    if (!pro) setTransferCreditAmount('');
  }, [proDistributors]);

  const handleTransfer = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!showTransfer || !transferFrom || !transferTo || !transferQty) return;
    if (transferFrom === transferTo) { alert('Las bodegas deben ser diferentes.'); return; }

    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty < 1) {
      alert('La cantidad de transferencia debe ser un número entero mayor a 0.');
      return;
    }

    const creditAmt = Number(transferCreditAmount) || 0;
    if (transferProInfo && creditAmt > 0) {
      const destName = warehouses.find(w => w.id === transferTo)?.name || 'otra bodega';
      if (!confirm(
        `¿Confirmar transferencia con crédito PRO?\n\n` +
        `• ${qty} pzas de ${showTransfer.sku} — ${showTransfer.name}\n` +
        `• De: ${warehouses.find(w => w.id === transferFrom)?.name} → A: ${destName}\n` +
        `• Crédito de $${creditAmt.toLocaleString('es-MX', { minimumFractionDigits: 2 })} al saldo de ${transferProInfo.name}\n\n` +
        `El saldo pendiente del distribuidor PRO se reducirá por este monto.`
      )) { return; }
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
      if (transferProInfo && creditAmt > 0) {
        const destName = warehouses.find(w => w.id === transferTo)?.name || 'otra bodega';
        const fromName = warehouses.find(w => w.id === transferFrom)?.name || 'bodega origen';
        const unitPrice = Math.round((creditAmt / qty) * 100) / 100;
        const { data: creditData, error: creditError } = await supabase
          .from('container_receptions')
          .insert({
            distributor_id: transferProInfo.id,
            warehouse_id: transferFrom,
            reception_date: new Date().toISOString().split('T')[0],
            container_label: `Traspaso ${fromName} → ${destName}`,
            charge_amount: -creditAmt,
            total_origin_cost: 0,
            total_additional_costs: 0,
            total_landed_cost: 0,
            status: 'completed',
            notes: `Crédito por traspaso de ${qty} pzas de ${showTransfer.sku} (${showTransfer.name}) de ${fromName} a ${destName}. Precio unitario: $${unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            created_by: userId,
          })
          .select('id')
          .single();

        if (creditError) {
          alert('⚠️ Stock transferido, pero error al crear crédito: ' + creditError.message);
        } else if (creditData) {
          await supabase.from('container_reception_items').insert({
            reception_id: creditData.id,
            product_id: showTransfer.id,
            quantity: qty,
            unit_origin_cost: 0,
            unit_landed_cost: 0,
            unit_pro_price: unitPrice,
          });
        }
      }
      await fetchData();
      setShowTransfer(null);
      setTransferFrom('');
      setTransferTo('');
      setTransferQty('');
      setTransferCreditAmount('');
      setTransferProInfo(null);
    }
    setTransferring(false);
  }, [showTransfer, transferFrom, transferTo, transferQty, transferCreditAmount, transferProInfo, warehouses, supabase, userId, fetchData]);

  // Action Handler: Create Count Session
  const handleCreateSession = useCallback(async () => {
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
  }, [newCount, userId, supabase, router]);

  // Action Handler: Delete Count Session
  const handleDeleteSession = useCallback(async (e, session) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!confirm(`¿Eliminar conteo ${session.session_code}? Esta acción no se puede deshacer.`)) return;
    await supabase.from('inventory_count_lines').delete().eq('session_id', session.id);
    const { error } = await supabase.from('inventory_count_sessions').delete().eq('id', session.id);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    setCountSessions(prev => prev.filter(s => s.id !== session.id));
  }, [supabase]);

  // Action Handler: CSV Import File Processing
  const handleCsvFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setCsvErrors(['El archivo está vacío o no tiene filas de datos.']);
        setShowCsvModal(true);
        return;
      }

      const headerLine = lines[0];
      const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
      const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      const headersLower = headers.map(h => h.toLowerCase());

      const skuIdx = headersLower.findIndex(h => h === 'sku' || h === 'código' || h === 'codigo');
      if (skuIdx === -1) {
        setCsvErrors([`No se encontró la columna SKU. Columnas encontradas: [${headers.join(', ')}]`]);
        setCsvRows([]);
        setShowCsvModal(true);
        return;
      }

      const whIdx = headersLower.findIndex(h => h === 'bodega' || h === 'almacen' || h === 'almacén' || h === 'warehouse');
      const qtyIdx = headersLower.findIndex(h => h === 'cantidad' || h === 'stock' || h === 'existencia' || h === 'cant' || h === 'quantity');

      const parsedRows = [];
      const errors = [];
      const productMapBySku = {};
      products.forEach(p => { productMapBySku[p.sku.toUpperCase()] = p; });

      if (whIdx !== -1 && qtyIdx !== -1) {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          const sku = cols[skuIdx]?.toUpperCase();
          const whName = cols[whIdx];
          const qtyStr = cols[qtyIdx];

          if (!sku) continue;
          const prod = productMapBySku[sku];
          if (!prod) { errors.push(`Línea ${i + 1}: SKU "${sku}" no existe en el catálogo.`); continue; }

          const targetWh = warehouses.find(w =>
            w.name.toLowerCase() === whName?.toLowerCase() ||
            w.code?.toLowerCase() === whName?.toLowerCase()
          );
          if (!targetWh) { errors.push(`Línea ${i + 1}: Bodega "${whName}" no encontrada.`); continue; }

          const targetQty = parseInt(qtyStr);
          if (isNaN(targetQty)) { errors.push(`Línea ${i + 1}: Cantidad inválida "${qtyStr}".`); continue; }

          const currentWs = getWhStock(prod.id, targetWh.id);
          const diff = targetQty - currentWs.stock;

          parsedRows.push({
            lineNumber: i + 1,
            productId: prod.id,
            sku: prod.sku,
            productName: prod.name,
            warehouseId: targetWh.id,
            warehouseName: targetWh.name,
            currentStock: currentWs.stock,
            targetStock: targetQty,
            diff,
          });
        }
      } else {
        const whCols = [];
        headers.forEach((h, idx) => {
          if (idx === skuIdx) return;
          const matchedWh = warehouses.find(w =>
            w.name.toLowerCase() === h.toLowerCase() ||
            w.code?.toLowerCase() === h.toLowerCase() ||
            h.toLowerCase().includes(w.name.toLowerCase())
          );
          if (matchedWh) whCols.push({ colIdx: idx, warehouse: matchedWh });
        });

        if (whCols.length === 0) {
          setCsvErrors([`No se identificaron columnas de bodegas. Columnas: [${headers.join(', ')}]. Agrega columnas con nombres de bodegas o "Bodega" + "Cantidad".`]);
          setCsvRows([]);
          setShowCsvModal(true);
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          const sku = cols[skuIdx]?.toUpperCase();
          if (!sku) continue;

          const prod = productMapBySku[sku];
          if (!prod) { errors.push(`Línea ${i + 1}: SKU "${sku}" no existe en catálogo.`); continue; }

          whCols.forEach(({ colIdx, warehouse }) => {
            const valStr = cols[colIdx];
            if (valStr !== undefined && valStr !== '') {
              const targetQty = parseInt(valStr);
              if (isNaN(targetQty)) {
                errors.push(`Línea ${i + 1} (${warehouse.name}): Valor no numérico "${valStr}".`);
                return;
              }
              const currentWs = getWhStock(prod.id, warehouse.id);
              const diff = targetQty - currentWs.stock;
              if (diff !== 0) {
                parsedRows.push({
                  lineNumber: i + 1,
                  productId: prod.id,
                  sku: prod.sku,
                  productName: prod.name,
                  warehouseId: warehouse.id,
                  warehouseName: warehouse.name,
                  currentStock: currentWs.stock,
                  targetStock: targetQty,
                  diff,
                });
              }
            }
          });
        }
      }

      setCsvRows(parsedRows);
      setCsvErrors(errors);
      setCsvResult(null);
      setShowCsvModal(true);
    };
    reader.readAsText(file, 'UTF-8');
    if (csvInputRef.current) csvInputRef.current.value = '';
  }, [products, warehouses, getWhStock]);

  // Action Handler: Apply CSV Stock Adjustments
  const handleApplyCsv = useCallback(async () => {
    if (csvRows.length === 0 || csvUploading) return;
    setCsvUploading(true);

    let successCount = 0;
    let failCount = 0;
    const reasonText = csvComment.trim() ? `Ajuste masivo CSV: ${csvComment.trim()}` : 'Ajuste masivo por importación CSV';

    for (const row of csvRows) {
      if (row.diff === 0) continue;
      try {
        const { error } = await supabase.rpc('adjust_warehouse_stock', {
          p_product_id: row.productId,
          p_warehouse_id: row.warehouseId,
          p_quantity_change: row.diff,
          p_reason: reasonText,
        });
        if (error) { failCount++; } else { successCount++; }
      } catch {
        failCount++;
      }
    }

    setCsvResult({ successCount, failCount });
    setCsvUploading(false);
    fetchData();
  }, [csvRows, csvUploading, csvComment, supabase, fetchData]);

  // Action Handler: Toggle Hidden Warehouses
  const toggleWarehouseVisibility = useCallback((whId) => {
    setHiddenWarehouses(prev => {
      const updated = prev.includes(whId) ? prev.filter(id => id !== whId) : [...prev, whId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('gl_hidden_warehouses', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Category and Stock Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [selectedSkus, setSelectedSkus] = useState([]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Visible warehouses map
  const visibleWarehouses = useMemo(() => {
    const map = {};
    warehouses.forEach(wh => {
      map[wh.id] = !hiddenWarehouses.includes(wh.id);
    });
    return map;
  }, [warehouses, hiddenWarehouses]);

  // Matrix computation
  const matrix = useMemo(() => {
    return products.map(p => {
      const whQtyMap = {};
      let totalAvailable = 0;
      let totalPhysical = 0;
      let totalReserved = 0;

      warehouses.forEach(wh => {
        const { stock: physical, reserved } = getWhStock(p.id, wh.id);
        const available = physical - reserved;

        whQtyMap[wh.id] = {
          available,
          physical,
          reserved
        };

        totalAvailable += available;
        totalPhysical += physical;
        totalReserved += reserved;
      });

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category || 'Sin categoría',
        price: p.price || 0,
        productId: p.id,
        warehouses: whQtyMap,
        totalAvailable,
        totalPhysical,
        totalReserved,
        totalStock: totalAvailable
      };
    }).filter(row => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesSku = row.sku.toLowerCase().includes(q);
        const matchesName = row.name.toLowerCase().includes(q);
        if (!matchesSku && !matchesName) return false;
      }
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) {
        return false;
      }
      if (stockFilter === 'LOW' && (row.totalAvailable <= 0 || row.totalAvailable > 10)) {
        return false;
      }
      if (stockFilter === 'OUT' && row.totalAvailable !== 0) {
        return false;
      }
      if (stockFilter === 'AVAILABLE' && row.totalAvailable <= 0) {
        return false;
      }
      return true;
    });
  }, [products, warehouses, warehouseStock, searchTerm, categoryFilter, stockFilter]);

  // Valuation calculations
  const valuationData = useMemo(() => {
    const visibleWhs = warehouses.filter(wh => !hiddenWarehouses.includes(wh.id));
    const whValues = visibleWhs.map(wh => {
      const value = products.reduce((sum, p) => {
        const { stock: physical } = getWhStock(p.id, wh.id);
        const cost = Number(p.avg_cost) || 0;
        return sum + (physical * cost);
      }, 0);
      return { ...wh, value };
    });

    const grandTotal = whValues.reduce((sum, wh) => sum + wh.value, 0);
    const skusWithCost = products.filter(p => Number(p.avg_cost) > 0).length;

    return {
      warehouseValues: whValues,
      grandTotal,
      skusWithCost,
      totalSkus: products.length
    };
  }, [products, warehouses, hiddenWarehouses, getWhStock]);

  // Overview stats
  const stats = useMemo(() => {
    let totalUnits = 0;
    let lowStockAlerts = 0;
    let outOfStockCount = 0;

    matrix.forEach(row => {
      totalUnits += row.totalAvailable;
      if (row.totalAvailable <= 10 && row.totalAvailable > 0) lowStockAlerts++;
      if (row.totalAvailable <= 0) outOfStockCount++;
    });

    const warehouseTotals = warehouses
      .filter(w => !hiddenWarehouses.includes(w.id))
      .map(wh => {
        const total = products.reduce((sum, p) => {
          const { stock: physical, reserved } = getWhStock(p.id, wh.id);
          return sum + Math.max(0, physical - reserved);
        }, 0);
        return { ...wh, total };
      });

    return {
      totalSkus: products.length,
      totalUnits,
      activeWarehouses: warehouses.filter(w => !hiddenWarehouses.includes(w.id)).length,
      lowStockAlerts,
      outOfStockCount,
      warehouseTotals
    };
  }, [products, matrix, warehouses, hiddenWarehouses, getWhStock]);

  // Select SKU toggling
  const toggleSelectSku = useCallback((sku) => {
    setSelectedSkus(prev =>
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  }, []);

  const selectAllSkus = useCallback(() => {
    if (selectedSkus.length === matrix.length) {
      setSelectedSkus([]);
    } else {
      setSelectedSkus(matrix.map(m => m.sku));
    }
  }, [selectedSkus, matrix]);

  // Action Handler: Adjust Stock
  const handleAdjustStockWrapper = useCallback(async ({ warehouseId, sku, type, quantity, reason }) => {
    const prod = products.find(p => p.sku === sku);
    if (!prod) return;

    let qtyChange = quantity;
    if (type === 'SET') {
      const currentWs = getWhStock(prod.id, warehouseId);
      qtyChange = quantity - currentWs.stock;
    } else if (type === 'SUB') {
      qtyChange = -quantity;
    }

    if (qtyChange === 0) return;

    setLoading(true);
    const { error } = await supabase.rpc('adjust_warehouse_stock', {
      p_product_id: prod.id,
      p_warehouse_id: warehouseId,
      p_quantity_change: qtyChange,
      p_reason: sanitizeText(reason, 300) || 'Ajuste manual'
    });

    if (error) {
      alert('Error en ajuste: ' + error.message);
    } else {
      await fetchData();
    }
    setLoading(false);
  }, [products, getWhStock, supabase, fetchData]);

  // Action Handler: Transfer Stock
  const handleTransferStockWrapper = useCallback(async ({ originWarehouseId, destWarehouseId, items, notes }) => {
    setLoading(true);
    for (const item of items) {
      const prod = products.find(p => p.sku === item.sku);
      if (!prod || item.qty <= 0) continue;

      const { error } = await supabase.rpc('transfer_stock', {
        p_product_id: prod.id,
        p_from_warehouse_id: originWarehouseId,
        p_to_warehouse_id: destWarehouseId,
        p_quantity: item.qty,
        p_notes: sanitizeText(notes, 300) || 'Transferencia entre bodegas'
      });

      if (error) {
        alert(`Error al transferir ${item.sku}: ` + error.message);
        break;
      }
    }
    await fetchData();
    setLoading(false);
  }, [products, supabase, fetchData]);

  // Action Handler: Count Session
  const handleCreateCountSessionWrapper = useCallback(async ({ warehouseId, notes }) => {
    setLoading(true);
    const { error } = await supabase.rpc('create_count_session', {
      p_warehouse_id: warehouseId,
      p_notes: sanitizeText(notes, 300) || 'Sesión de conteo físico'
    });
    if (error) {
      alert('Error al crear sesión: ' + error.message);
    } else {
      await fetchData();
    }
    setLoading(false);
  }, [supabase, fetchData]);

  // Action Handler: Pro Retail Sale
  const handleProRetailSaleWrapper = useCallback(async ({ warehouseId, items, clientName, notes }) => {
    setLoading(true);
    for (const item of items) {
      const prod = products.find(p => p.sku === item.sku);
      if (!prod || item.qty <= 0) continue;

      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: prod.id,
        p_warehouse_id: warehouseId,
        p_quantity_change: -item.qty,
        p_reason: `Venta Mostrador PRO - Cliente: ${clientName || 'Gral'} - ${notes || ''}`
      });

      if (error) {
        alert(`Error al registrar venta de ${item.sku}: ` + error.message);
        break;
      }
    }
    await fetchData();
    setLoading(false);
  }, [products, supabase, fetchData]);

  // CSV Select Wrapper
  const handleCsvFileSelect = useCallback((file) => {
    handleCsvFile({ target: { files: [file] } });
  }, [handleCsvFile]);

  return {
    supabase,
    router,
    activeTab,
    setActiveTab,
    products,
    warehouses,
    warehouseStock,
    loading,
    isAdmin,
    isProUser,
    proWarehouseId,
    userId,
    userRole: isAdmin ? 'ADMIN' : isProUser ? 'PRO' : 'USER',
    isPro: isProUser,

    // Matrix and Filters
    matrix,
    stats,
    valuationData,
    categories,
    visibleWarehouses,
    searchFilter: searchTerm,
    setSearchFilter: setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    selectedSkus,
    toggleSelectSku,
    selectAllSkus,
    toggleWarehouseVisibility,
    refreshData: fetchData,

    // Stock Data raw format
    stockData: Object.values(warehouseStock),

    // Subcomponents Handlers
    handleAdjustStock: handleAdjustStockWrapper,
    handleTransferStock: handleTransferStockWrapper,
    handleCreateCountSession: handleCreateCountSessionWrapper,
    handleProRetailSale: handleProRetailSaleWrapper,

    // CSV Handlers
    handleCsvFileSelect,
    csvPreviewData: csvRows,
    csvInvalidRows: csvErrors.map((err, idx) => ({ row: idx + 1, reason: err })),
    handleBulkCsvImport: handleApplyCsv,

    // Sessions and Logs
    countSessions,
    movementLogs,

    // Legacy helpers
    filteredProducts,
    totalItems,
    outOfStockCount,
    lowStockCount,
    getStockStatus,
    getWhStock,
  };
}

export default useInventarios;


