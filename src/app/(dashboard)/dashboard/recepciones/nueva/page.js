'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Container, ArrowLeft, Save, Loader2, Package, Plus, Trash2, DollarSign,
  Warehouse, User, Calendar, FileText, AlertTriangle, CheckCircle, Search, X,
  Upload, Paperclip, Download, Eye, Camera, QrCode
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function NuevaRecepcionPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const poParam = searchParams.get('po');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [userId, setUserId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    supplier_id: '',
    purchase_order_id: '',
    warehouse_id: '',
    distributor_id: '',
    reception_date: new Date().toISOString().split('T')[0],
    container_label: '',
    pedimento_number: '',
    operation_number: '',
    customs_broker_ref: '',
    freight_maritime: '',
    freight_national: '',
    import_taxes: '',
    port_handling: '',
    customs_broker: '',
    other_costs: '',
    other_costs_description: '',
    exchange_rate_goods: '',
    exchange_rate_freight: '',
    notes: '',
    status: 'draft',
  });

  const [items, setItems] = useState([]); // [{product_id, quantity, unit_origin_cost, unit_pro_price}]
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [receptionId, setReceptionId] = useState(editId);
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' | 'scan'
  const [showReceptionScanner, setShowReceptionScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const receptionScannerRef = useRef(null);
  const receptionScannerStoppingRef = useRef(false);
  const scanSearchRef = useRef(null);
  const lastScanKeystrokeRef = useRef(0);
  const scanBarcodeBufferRef = useRef('');

  useEffect(() => { fetchData(); }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (receptionScannerRef.current) {
        try { receptionScannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
    setUserId(user.id);

    const [productsRes, warehousesRes, distributorsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('id, name, sku, price').eq('is_active', true).order('sku'),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      supabase.from('profiles').select('id, full_name, client_number, assigned_warehouse_id').eq('role', 'distributor').eq('sub_role', 'distributor_pro').eq('is_active', true).order('full_name'),
      supabase.from('suppliers').select('id, name, short_name').eq('is_active', true).order('short_name'),
    ]);

    setProducts(productsRes.data || []);
    setWarehouses(warehousesRes.data || []);
    setDistributors(distributorsRes.data || []);
    setSuppliers(suppliersRes.data || []);

    // Fetch POs separately to avoid FK alias failures breaking everything
    const { data: posData, error: posError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, supplier_id')
      .in('status', ['draft', 'sent'])
      .order('created_at', { ascending: false });

    if (posError) {
      console.error('PO fetch error:', posError);
    }

    // Enrich POs with supplier names
    const posList = posData || [];
    if (posList.length > 0) {
      const supplierIds = [...new Set(posList.map(p => p.supplier_id).filter(Boolean))];
      if (supplierIds.length > 0) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, short_name')
          .in('id', supplierIds);
        const supplierMap = Object.fromEntries((suppliers || []).map(s => [s.id, s.short_name]));
        posList.forEach(po => { po.supplier_name = supplierMap[po.supplier_id] || 'Sin proveedor'; });
      }
    }
    setPurchaseOrders(posList);

    // If editing, load existing data
    if (editId) {
      const { data: reception } = await supabase
        .from('container_receptions')
        .select('*')
        .eq('id', editId)
        .single();
      if (reception) {
        setForm({
          supplier_id: reception.supplier_id || '',
          purchase_order_id: reception.purchase_order_id || '',
          warehouse_id: reception.warehouse_id || '',
          distributor_id: reception.distributor_id || '',
          reception_date: reception.reception_date || new Date().toISOString().split('T')[0],
          container_label: reception.container_label || '',
          pedimento_number: reception.pedimento_number || '',
          operation_number: reception.operation_number || '',
          customs_broker_ref: reception.customs_broker_ref || '',
          freight_maritime: reception.freight_maritime || '',
          freight_national: reception.freight_national || '',
          import_taxes: reception.import_taxes || '',
          port_handling: reception.port_handling || '',
          customs_broker: reception.customs_broker || '',
          other_costs: reception.other_costs || '',
          other_costs_description: reception.other_costs_description || '',
          exchange_rate_goods: reception.exchange_rate_goods || '',
          exchange_rate_freight: reception.exchange_rate_freight || '',
          notes: reception.notes || '',
          status: reception.status,
        });
        // Load items
        const { data: existingItems } = await supabase
          .from('container_reception_items')
          .select('*, product:products(name, sku)')
          .eq('reception_id', editId);
        if (existingItems) {
          setItems(existingItems.map(i => ({
            id: i.id,
            product_id: i.product_id,
            name: i.product?.name,
            sku: i.product?.sku,
            quantity: i.quantity,
            unit_origin_cost: i.unit_origin_cost || '',
            unit_pro_price: i.unit_pro_price || '',
          })));
        }

        // Load documents
        const { data: existingDocs } = await supabase
          .from('reception_documents')
          .select('*')
          .eq('reception_id', editId)
          .order('created_at');
        setDocuments(existingDocs || []);
      }
    }

    // If coming from PO param, preload PO data
    if (poParam && !editId) {
      setForm(f => ({ ...f, purchase_order_id: poParam }));
      await loadPOData(poParam, productsRes.data || [], distributorsRes.data || []);
    }

    setLoading(false);
  };

  const loadPOData = async (poId, productsList, distList) => {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, items:purchase_order_items(product_id, quantity, unit_cost, products(name, sku))')
      .eq('id', poId)
      .single();
    if (!po) return;

    setForm(f => ({
      ...f,
      warehouse_id: po.destination_warehouse_id || f.warehouse_id,
    }));

    // Auto-detect distributor by warehouse
    if (po.destination_warehouse_id) {
      const matchDist = distList.find(d => d.assigned_warehouse_id === po.destination_warehouse_id);
      if (matchDist) {
        setForm(f => ({ ...f, distributor_id: matchDist.id }));
      }
    }

    // Load items from PO
    if (po.items?.length) {
      setItems(po.items.map(i => ({
        product_id: i.product_id,
        name: i.products?.name || '',
        sku: i.products?.sku || '',
        quantity: i.quantity,
        unit_origin_cost: i.unit_cost || '',
        unit_pro_price: '',
      })));
    }
  };

  // Handle PO selection change
  const handlePOChange = async (poId) => {
    setForm(f => ({ ...f, purchase_order_id: poId }));
    if (poId) {
      await loadPOData(poId, products, distributors);
    }
  };

  // Handle warehouse change - auto-detect distributor
  const handleWarehouseChange = (whId) => {
    setForm(f => ({ ...f, warehouse_id: whId }));
    const matchDist = distributors.find(d => d.assigned_warehouse_id === whId);
    if (matchDist) {
      setForm(f => ({ ...f, distributor_id: matchDist.id }));
    } else {
      setForm(f => ({ ...f, distributor_id: '' }));
    }
  };

  // Product search
  const handleProductSearch = (q) => {
    setProductSearch(q);
    if (q.length >= 2) {
      const s = q.toLowerCase();
      const existingIds = items.map(i => i.product_id);
      setSearchResults(products.filter(p =>
        (p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s))
        && !existingIds.includes(p.id)
      ).slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const addProduct = (product) => {
    setItems(prev => [...prev, {
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      quantity: 0,
      unit_origin_cost: '',
      unit_pro_price: '',
    }]);
    setProductSearch('');
    setSearchResults([]);
  };

  // === Barcode Scanning Functions ===
  const handleReceptionScan = (scannedSku) => {
    const sku = scannedSku.trim().toUpperCase();
    const product = products.find(p => p.sku?.toUpperCase() === sku);

    if (!product) {
      setScanFeedback({ type: 'error', message: `Código "${sku}" no encontrado` });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    // Check if product already in items list
    const existingIndex = items.findIndex(i => i.product_id === product.id);

    if (existingIndex >= 0) {
      // Increment quantity
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: (Number(updatedItems[existingIndex].quantity) || 0) + 1
      };
      setItems(updatedItems);
      setScanFeedback({ type: 'success', message: `${sku} — ${product.name} (${updatedItems[existingIndex].quantity} pzas)` });
    } else {
      // Add new item with quantity 1
      setItems(prev => [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_origin_cost: '',
        unit_pro_price: '',
      }]);
      setScanFeedback({ type: 'success', message: `${sku} — ${product.name} agregado (1 pza)` });
    }

    setTimeout(() => setScanFeedback(null), 2000);
  };

  const openReceptionScanner = async () => {
    setShowReceptionScanner(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('reception-barcode-reader');
        receptionScannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => { handleReceptionScan(decodedText); },
          () => {}
        );
      } catch (err) {
        setScanFeedback({ type: 'error', message: 'No se pudo acceder a la cámara' });
        setShowReceptionScanner(false);
        setTimeout(() => setScanFeedback(null), 3000);
      }
    }, 350);
  };

  const closeReceptionScanner = async () => {
    if (receptionScannerRef.current && !receptionScannerStoppingRef.current) {
      receptionScannerStoppingRef.current = true;
      try { await receptionScannerRef.current.stop(); } catch {}
      receptionScannerRef.current = null;
      receptionScannerStoppingRef.current = false;
    }
    setShowReceptionScanner(false);
  };

  const handleScanKeyDown = (e) => {
    const now = Date.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = scanSearchRef.current?.value?.trim();
      if (val) {
        handleReceptionScan(val);
        scanSearchRef.current.value = '';
      }
      scanBarcodeBufferRef.current = '';
      return;
    }
    if (e.key.length === 1) {
      if (now - lastScanKeystrokeRef.current > 300) {
        scanBarcodeBufferRef.current = '';
      }
      scanBarcodeBufferRef.current += e.key;
      lastScanKeystrokeRef.current = now;
    }
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Calculations — all converted to MXN
  const tcGoods = Number(form.exchange_rate_goods) || 1;
  const tcFreight = Number(form.exchange_rate_freight) || 1;
  const totalOriginCostUSD = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_origin_cost) || 0), 0);
  const totalOriginCostMXN = totalOriginCostUSD * tcGoods;
  const freightMaritimeMXN = (Number(form.freight_maritime) || 0) * tcFreight;
  const totalAdditionalCosts = freightMaritimeMXN + (Number(form.freight_national) || 0) +
    (Number(form.import_taxes) || 0) + (Number(form.port_handling) || 0) +
    (Number(form.customs_broker) || 0) + (Number(form.other_costs) || 0);
  const totalLandedCost = totalOriginCostMXN + totalAdditionalCosts;
  const totalQuantity = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  // Landed cost per unit (prorated by origin cost weight) — all in MXN
  const getLandedPerUnit = (item) => {
    if (totalOriginCostMXN === 0 || !item.quantity) return 0;
    const itemOriginMXN = (Number(item.quantity) || 0) * (Number(item.unit_origin_cost) || 0) * tcGoods;
    const proportion = itemOriginMXN / totalOriginCostMXN;
    const additionalShare = totalAdditionalCosts * proportion;
    return (itemOriginMXN + additionalShare) / (Number(item.quantity) || 1);
  };

  const chargeAmount = form.distributor_id
    ? items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_pro_price) || 0), 0)
    : 0;

  // Save draft
  const handleSave = async () => {
    if (!form.warehouse_id) { alert('Selecciona una bodega'); return; }
    if (items.length === 0) { alert('Agrega al menos un producto'); return; }

    setSaving(true);
    const payload = {
      supplier_id: form.supplier_id || null,
      purchase_order_id: form.purchase_order_id || null,
      warehouse_id: form.warehouse_id,
      distributor_id: form.distributor_id || null,
      reception_date: form.reception_date,
      container_label: form.container_label || null,
      pedimento_number: form.pedimento_number || null,
      operation_number: form.operation_number || null,
      customs_broker_ref: form.customs_broker_ref || null,
      freight_maritime: Number(form.freight_maritime) || 0,
      freight_national: Number(form.freight_national) || 0,
      import_taxes: Number(form.import_taxes) || 0,
      port_handling: Number(form.port_handling) || 0,
      customs_broker: Number(form.customs_broker) || 0,
      other_costs: Number(form.other_costs) || 0,
      other_costs_description: form.other_costs_description || null,
      exchange_rate_goods: Number(form.exchange_rate_goods) || 1,
      exchange_rate_freight: Number(form.exchange_rate_freight) || 1,
      total_origin_cost: totalOriginCostMXN,
      total_additional_costs: totalAdditionalCosts,
      total_landed_cost: totalLandedCost,
      charge_amount: chargeAmount,
      notes: form.notes || null,
      status: 'draft',
      created_by: userId,
    };

    let id = receptionId;

    if (id) {
      // Update existing
      const { error } = await supabase.from('container_receptions').update(payload).eq('id', id);
      if (error) { alert('Error: ' + error.message); setSaving(false); return; }
      // Delete existing items and re-insert
      await supabase.from('container_reception_items').delete().eq('reception_id', id);
    } else {
      // Insert new
      const { data, error } = await supabase.from('container_receptions').insert(payload).select('id').single();
      if (error) { alert('Error: ' + error.message); setSaving(false); return; }
      id = data.id;
      setReceptionId(id);
    }

    // Insert items
    const itemsPayload = items.map(i => ({
      reception_id: id,
      product_id: i.product_id,
      quantity: Number(i.quantity) || 0,
      unit_origin_cost: Number(i.unit_origin_cost) || 0,
      unit_landed_cost: getLandedPerUnit(i),
      unit_pro_price: form.distributor_id ? (Number(i.unit_pro_price) || null) : null,
    }));

    const { error: itemsError } = await supabase.from('container_reception_items').insert(itemsPayload);
    if (itemsError) { alert('Error guardando items: ' + itemsError.message); setSaving(false); return; }

    setSaving(false);
    alert('Recepción guardada como borrador');
  };

  // Confirm reception: stock entry + charge + resolve transits
  const handleConfirm = async () => {
    if (!form.warehouse_id) { alert('Selecciona una bodega'); return; }
    if (items.length === 0) { alert('Agrega al menos un producto'); return; }
    if (items.some(i => !i.quantity || Number(i.quantity) <= 0)) {
      alert('Todos los productos deben tener cantidad mayor a 0');
      return;
    }
    if (form.distributor_id && items.some(i => !i.unit_pro_price || Number(i.unit_pro_price) <= 0)) {
      alert('Todos los productos deben tener precio PRO asignado');
      return;
    }

    if (!confirm(
      `¿Confirmar recepción?\n\n` +
      `• Se ingresarán ${items.length} SKUs (${totalQuantity} pzas) al inventario de ${warehouses.find(w => w.id === form.warehouse_id)?.name}\n` +
      (form.distributor_id ? `• Se generará un cargo de $${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} al distribuidor PRO\n` : '') +
      (form.purchase_order_id ? `• Se resolverán los tránsitos asociados al PO\n` : '') +
      `\nEsta acción no se puede deshacer.`
    )) return;

    setConfirming(true);

    // 1. Save first (to persist any unsaved changes)
    const payload = {
      supplier_id: form.supplier_id || null,
      purchase_order_id: form.purchase_order_id || null,
      warehouse_id: form.warehouse_id,
      distributor_id: form.distributor_id || null,
      reception_date: form.reception_date,
      container_label: form.container_label || null,
      pedimento_number: form.pedimento_number || null,
      operation_number: form.operation_number || null,
      customs_broker_ref: form.customs_broker_ref || null,
      freight_maritime: Number(form.freight_maritime) || 0,
      freight_national: Number(form.freight_national) || 0,
      import_taxes: Number(form.import_taxes) || 0,
      port_handling: Number(form.port_handling) || 0,
      customs_broker: Number(form.customs_broker) || 0,
      other_costs: Number(form.other_costs) || 0,
      other_costs_description: form.other_costs_description || null,
      exchange_rate_goods: Number(form.exchange_rate_goods) || 1,
      exchange_rate_freight: Number(form.exchange_rate_freight) || 1,
      total_origin_cost: totalOriginCostMXN,
      total_additional_costs: totalAdditionalCosts,
      total_landed_cost: totalLandedCost,
      charge_amount: chargeAmount,
      notes: form.notes || null,
      status: 'completed',
      created_by: userId,
    };

    let id = receptionId;
    if (id) {
      const { error } = await supabase.from('container_receptions').update(payload).eq('id', id);
      if (error) { alert('Error: ' + error.message); setConfirming(false); return; }
      await supabase.from('container_reception_items').delete().eq('reception_id', id);
    } else {
      const { data, error } = await supabase.from('container_receptions').insert(payload).select('id').single();
      if (error) { alert('Error: ' + error.message); setConfirming(false); return; }
      id = data.id;
    }

    // Insert items
    const itemsPayload = items.map(i => ({
      reception_id: id,
      product_id: i.product_id,
      quantity: Number(i.quantity) || 0,
      unit_origin_cost: Number(i.unit_origin_cost) || 0,
      unit_landed_cost: getLandedPerUnit(i),
      unit_pro_price: form.distributor_id ? (Number(i.unit_pro_price) || null) : null,
    }));
    const { error: itemsError } = await supabase.from('container_reception_items').insert(itemsPayload);
    if (itemsError) { alert('Error items: ' + itemsError.message); setConfirming(false); return; }

    // 2. Adjust warehouse stock for each item
    const stockErrors = [];
    for (const item of items) {
      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: item.product_id,
        p_warehouse_id: form.warehouse_id,
        p_quantity_change: Number(item.quantity),
        p_reason: `Recepción contenedor: ${form.container_label || id}`
      });
      if (error) stockErrors.push(`${item.sku}: ${error.message}`);
    }

    // 2b. Update weighted average cost per product
    for (const item of items) {
      const landedCost = getLandedPerUnit(item);
      const qtyReceived = Number(item.quantity) || 0;
      if (landedCost <= 0 || qtyReceived <= 0) continue;

      // Get current total stock across all warehouses (already includes this reception)
      const { data: stockRows } = await supabase
        .from('warehouse_stock')
        .select('stock_quantity')
        .eq('product_id', item.product_id);
      const totalStockNow = (stockRows || []).reduce((s, r) => s + (r.stock_quantity || 0), 0);

      // Get current avg_cost
      const { data: prod } = await supabase
        .from('products')
        .select('avg_cost')
        .eq('id', item.product_id)
        .single();
      const oldAvg = Number(prod?.avg_cost) || 0;

      // Stock before this reception
      const stockBefore = totalStockNow - qtyReceived;

      let newAvg;
      if (stockBefore <= 0 || oldAvg <= 0) {
        // No previous stock or no previous cost — use this reception's landed cost
        newAvg = landedCost;
      } else {
        // Weighted average: (old_value + new_value) / total_qty
        newAvg = ((stockBefore * oldAvg) + (qtyReceived * landedCost)) / totalStockNow;
      }

      await supabase
        .from('products')
        .update({ avg_cost: Math.round(newAvg * 100) / 100 })
        .eq('id', item.product_id);
    }

    // 3. If PO exists, mark as received and resolve transits
    if (form.purchase_order_id) {
      await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', form.purchase_order_id);
      await supabase.from('transit_shipments').delete().eq('purchase_order_id', form.purchase_order_id);
    }

    if (stockErrors.length) {
      alert(`Recepción confirmada con algunos errores de stock:\n${stockErrors.join('\n')}`);
    } else {
      alert('✅ Recepción confirmada exitosamente');
    }

    setConfirming(false);
    router.push('/dashboard/recepciones');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
      <p className="font-medium">Cargando...</p>
    </div>
  );

  const isCompleted = form.status === 'completed';

  return (
    <div className="relative z-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/recepciones" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium no-underline">
          <ArrowLeft size={16} /> Volver a recepciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">
              {isCompleted ? '📦 Recepción Completada' : editId ? 'Editar Recepción' : 'Nueva Recepción'}
            </h1>
            <p className="text-slate-500 mt-1 font-medium m-0">
              {isCompleted ? 'Esta recepción ya fue procesada.' : 'Registra la llegada de un contenedor y sus costos.'}
            </p>
          </div>
          {isCompleted && (
            <span className="text-xs font-bold px-4 py-2 rounded-full bg-green-50 text-green-600 border border-green-200">
              ✓ Completada
            </span>
          )}
        </div>
      </div>

      {/* Section 1: General Data */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
          <Container size={18} className="text-[#6a9a04]" /> Datos Generales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Proveedor *</label>
            <select
              value={form.supplier_id}
              onChange={e => {
                const sid = e.target.value;
                setForm(f => ({ ...f, supplier_id: sid, purchase_order_id: '' }));
              }}
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            >
              <option value="">— Seleccionar Proveedor —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.short_name}</option>
              ))}
            </select>
          </div>
          {/* PO Selector - filtered by supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Orden de Compra (opcional)</label>
            <select
              value={form.purchase_order_id}
              onChange={e => handlePOChange(e.target.value)}
              disabled={isCompleted || !form.supplier_id}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            >
              <option value="">{form.supplier_id ? '— Sin PO vinculada —' : '— Selecciona proveedor primero —'}</option>
              {purchaseOrders
                .filter(po => !form.supplier_id || po.supplier_id === form.supplier_id)
                .map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — {po.supplier_name || 'Sin proveedor'} ({po.status})
                </option>
              ))}
            </select>
          </div>
          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Bodega de Ingreso *</label>
            <select
              value={form.warehouse_id}
              onChange={e => handleWarehouseChange(e.target.value)}
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            >
              <option value="">— Seleccionar Bodega —</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          {/* Distributor PRO */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Distribuidor PRO</label>
            <select
              value={form.distributor_id}
              onChange={e => setForm(f => ({ ...f, distributor_id: e.target.value }))}
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            >
              <option value="">— Ninguno (Saltillo) —</option>
              {distributors.map(d => (
                <option key={d.id} value={d.id}>{d.full_name} ({d.client_number})</option>
              ))}
            </select>
            {!form.distributor_id && form.warehouse_id && (
              <p className="text-[11px] text-slate-400 mt-1 m-0">Sin PRO = solo ingreso de inventario, sin cargo.</p>
            )}
          </div>
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de Recepción *</label>
            <input
              type="date"
              value={form.reception_date}
              onChange={e => setForm(f => ({ ...f, reception_date: e.target.value }))}
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            />
          </div>
          {/* Container Label */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Etiqueta del Contenedor</label>
            <input
              type="text"
              value={form.container_label}
              onChange={e => setForm(f => ({ ...f, container_label: e.target.value }))}
              placeholder="Ej: Container 1 - Freeman QRO"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 disabled:opacity-60"
            />
          </div>
          {/* Pedimento */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Número de Pedimento</label>
            <input
              type="text"
              value={form.pedimento_number}
              onChange={e => setForm(f => ({ ...f, pedimento_number: e.target.value }))}
              placeholder="Ej: 26 51 3412 6001234"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 font-mono disabled:opacity-60"
            />
          </div>
          {/* Operation Number */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nº de Operación *</label>
            <input
              type="text"
              value={form.operation_number}
              onChange={e => setForm(f => ({ ...f, operation_number: e.target.value }))}
              placeholder="Ej: Op19"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 font-bold disabled:opacity-60"
            />
          </div>
          {/* Customs Broker Ref */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Ref. Agente Aduanal</label>
            <input
              type="text"
              value={form.customs_broker_ref}
              onChange={e => setForm(f => ({ ...f, customs_broker_ref: e.target.value }))}
              placeholder="Referencia del agente aduanal"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm placeholder:text-slate-400 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Products */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
          <Package size={18} className="text-[#6a9a04]" /> Productos Recibidos
        </h3>

        {/* Entry Mode Toggle */}
        {!isCompleted && (
          <div className="flex gap-1 mb-4 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm w-fit">
            <button onClick={() => setEntryMode('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${
                entryMode === 'manual' ? 'bg-[#6a9a04] text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}>
              Manual
            </button>
            <button onClick={() => setEntryMode('scan')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${
                entryMode === 'scan' ? 'bg-[#6a9a04] text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <QrCode size={15} /> Escaneo
            </button>
          </div>
        )}

        {/* Scan Mode UI */}
        {!isCompleted && entryMode === 'scan' && (
          <div className="bg-[#6a9a04]/5 border-2 border-[#6a9a04]/20 rounded-xl p-4 mb-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#6a9a04] mb-3 m-0 flex items-center gap-2">
              <QrCode size={13} /> Modo Escaneo — Escanea productos para agregarlos
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={scanSearchRef}
                  type="text"
                  placeholder="Escanea o escribe SKU..."
                  onKeyDown={handleScanKeyDown}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04]/50 placeholder:text-slate-400 font-bold"
                />
              </div>
              <button onClick={showReceptionScanner ? closeReceptionScanner : openReceptionScanner}
                className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer border-none transition-all ${
                  showReceptionScanner ? 'bg-red-500 text-white' : 'bg-[#6a9a04]/10 text-[#6a9a04] hover:bg-[#6a9a04]/20'
                }`}>
                <Camera size={18} /> {showReceptionScanner ? 'Cerrar' : 'Cámara'}
              </button>
            </div>
            {showReceptionScanner && (
              <div className="mt-3 rounded-xl overflow-hidden border-2 border-[#6a9a04]/30">
                <div id="reception-barcode-reader" style={{ minHeight: 280, background: '#000' }} />
              </div>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center" style={{width:'100px'}}>Cantidad</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center" style={{width:'130px'}}>Costo Origen/ud (USD)</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right" style={{width:'120px'}}>Subtotal USD</th>
                  {form.distributor_id && (
                    <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center" style={{width:'140px'}}>Precio PRO/ud (MXN)</th>
                  )}
                  {form.distributor_id && (
                    <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right" style={{width:'120px'}}>Cargo PRO</th>
                  )}
                  {!isCompleted && <th style={{width:'50px'}}></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_origin_cost) || 0);
                  const proSubtotal = (Number(item.quantity) || 0) * (Number(item.unit_pro_price) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="py-3 text-sm font-medium text-slate-800">{item.name}</td>
                      <td className="py-3 text-center">
                        <input
                          type="number" min="0"
                          value={item.quantity || ''}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          disabled={isCompleted}
                          className="w-20 px-2 py-1.5 text-center text-sm font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/20 disabled:opacity-60"
                        />
                      </td>
                      <td className="py-3 text-center">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">USD</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={item.unit_origin_cost || ''}
                            onChange={e => updateItem(idx, 'unit_origin_cost', e.target.value)}
                            disabled={isCompleted}
                            className="w-24 pl-8 pr-2 py-1.5 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/20 text-right disabled:opacity-60"
                          />
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm font-bold text-slate-600">
                        ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      {form.distributor_id && (
                        <td className="py-3 text-center">
                          <div className="relative inline-block">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#6a9a04] text-[10px] font-bold">MXN</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={item.unit_pro_price || ''}
                              onChange={e => updateItem(idx, 'unit_pro_price', e.target.value)}
                              disabled={isCompleted}
                              className="w-28 pl-9 pr-2 py-1.5 text-sm font-bold border border-[#6a9a04]/30 bg-[#6a9a04]/5 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/30 text-right disabled:opacity-60"
                            />
                          </div>
                        </td>
                      )}
                      {form.distributor_id && (
                        <td className="py-3 text-right text-sm font-black text-[#6a9a04]">
                          ${proSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isCompleted && (
                        <td className="py-3 text-center">
                          <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={2} className="py-3 text-sm font-bold text-slate-700 text-right">Total Origen (USD):</td>
                  <td className="py-3 text-center text-sm font-black text-slate-800">{totalQuantity}</td>
                  <td></td>
                  <td className="py-3 text-right text-sm font-black text-slate-800">
                    <div>${totalOriginCostUSD.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD</div>
                    <div className="text-[10px] text-slate-400 font-medium">${totalOriginCostMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</div>
                  </td>
                  {form.distributor_id && <td></td>}
                  {form.distributor_id && (
                    <td className="py-3 text-right text-sm font-black text-[#6a9a04]">
                      ${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {!isCompleted && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Add product search */}
        {!isCompleted && (
          <div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={e => handleProductSearch(e.target.value)}
                placeholder="Buscar producto por SKU o nombre..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6a9a04]/50 transition-colors cursor-pointer text-left"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-2">SKU: {p.sku}</span>
                    </div>
                    <Plus size={16} className="text-[#6a9a04]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Additional Costs */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
          <DollarSign size={18} className="text-[#6a9a04]" /> Costos Adicionales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'freight_maritime', label: 'Flete Marítimo (USD)', prefix: 'USD' },
            { key: 'freight_national', label: 'Flete Nacional (MXN)' },
            { key: 'import_taxes', label: 'Impuestos Importación (MXN)' },
            { key: 'port_handling', label: 'Maniobras en Puerto (MXN)' },
            { key: 'customs_broker', label: 'Despacho Aduanal (MXN)' },
            { key: 'other_costs', label: 'Otros Costos (MXN)' },
          ].map(({ key, label, prefix }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  disabled={isCompleted}
                  className="w-full pl-7 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm text-right font-bold disabled:opacity-60"
                />
              </div>
            </div>
          ))}
        </div>
        {form.other_costs && Number(form.other_costs) > 0 && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-600 mb-1">Descripción de otros costos</label>
            <input
              type="text"
              value={form.other_costs_description || ''}
              onChange={e => setForm(f => ({ ...f, other_costs_description: e.target.value }))}
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm disabled:opacity-60"
            />
          </div>
        )}
        {/* Exchange rates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">TC Mercancía (USD→MXN)</label>
            <input
              type="number" min="0" step="0.0001"
              value={form.exchange_rate_goods || ''}
              onChange={e => setForm(f => ({ ...f, exchange_rate_goods: e.target.value }))}
              placeholder="Ej: 17.50"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm font-mono disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">TC Flete Marítimo (USD→MXN)</label>
            <input
              type="number" min="0" step="0.0001"
              value={form.exchange_rate_freight || ''}
              onChange={e => setForm(f => ({ ...f, exchange_rate_freight: e.target.value }))}
              placeholder="Ej: 17.80"
              disabled={isCompleted}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm font-mono disabled:opacity-60"
            />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 text-right">
          <span className="text-sm text-slate-500">Total Costos Adicionales:</span>
          <span className="text-lg font-black text-slate-800 ml-3">
            ${totalAdditionalCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Section 4: Summary */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
          <FileText size={18} className="text-[#6a9a04]" /> Resumen de Costeo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50/80 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-1">Costo Origen (USD→MXN)</p>
            <p className="text-xl font-black text-slate-900 m-0">
              ${totalOriginCostMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 m-0 mt-1">${totalOriginCostUSD.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD × {tcGoods}</p>
          </div>
          <div className="bg-slate-50/80 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-1">Costos Adicionales</p>
            <p className="text-xl font-black text-slate-900 m-0">
              ${totalAdditionalCosts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-blue-50/80 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider m-0 mb-1">Costo Landed Total</p>
            <p className="text-xl font-black text-blue-700 m-0">
              ${totalLandedCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Landed per SKU */}
        {items.length > 0 && totalAdditionalCosts > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Costo Landed por SKU (prorrateo)</p>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase">Producto</th>
                    <th className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase text-center">Qty</th>
                    <th className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase text-right">Landed/ud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-xs font-mono text-slate-500">{item.sku}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-center font-bold">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-blue-600">
                        ${getLandedPerUnit(item).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRO Charge summary */}
        {form.distributor_id && (
          <div className="bg-[#6a9a04]/5 border border-[#6a9a04]/20 rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
                  <User size={20} className="text-[#6a9a04]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#6a9a04] uppercase tracking-wider m-0">Cargo al Distribuidor PRO</p>
                  <p className="text-sm text-slate-600 m-0">
                    {distributors.find(d => d.id === form.distributor_id)?.full_name || '—'}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-black text-[#6a9a04] m-0">
                ${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-600 mb-1">Notas</label>
          <textarea
            value={form.notes || ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            disabled={isCompleted}
            rows={2}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm resize-none disabled:opacity-60"
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>

      {/* Section 5: Documents */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 m-0 mb-5 pb-4 border-b border-slate-200 flex items-center gap-2">
          <Paperclip size={18} className="text-[#6a9a04]" /> Documentos de la Operación
        </h3>

        {/* Upload area */}
        <div className="mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              id="doc-type-select"
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
              defaultValue="other"
            >
              <option value="po">Orden de Compra</option>
              <option value="invoice">Invoice / Factura</option>
              <option value="bl">Bill of Lading (BL)</option>
              <option value="debit_note">Debit Note (Forwarder)</option>
              <option value="pedimento">Pedimento</option>
              <option value="packing_list">Packing List</option>
              <option value="certificate">Certificado</option>
              <option value="other">Otro documento</option>
            </select>
            <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-colors cursor-pointer">
              <Upload size={16} />
              {uploadingDoc ? 'Subiendo...' : 'Subir archivo'}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                disabled={uploadingDoc}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const docType = document.getElementById('doc-type-select')?.value || 'other';

                  // Need a reception ID first
                  let rid = receptionId;
                  if (!rid) {
                    if (!form.warehouse_id) { alert('Primero selecciona una bodega para guardar'); return; }
                    // Auto-save as draft to get an ID
                    const { data: newRec, error } = await supabase
                      .from('container_receptions')
                      .insert({
                        supplier_id: form.supplier_id || null,
                        purchase_order_id: form.purchase_order_id || null,
                        warehouse_id: form.warehouse_id,
                        distributor_id: form.distributor_id || null,
                        reception_date: form.reception_date,
                        container_label: form.container_label || null,
                        operation_number: form.operation_number || null,
                        status: 'draft',
                        created_by: userId,
                      })
                      .select('id')
                      .single();
                    if (error || !newRec) { alert('Error al guardar borrador: ' + (error?.message || '')); return; }
                    rid = newRec.id;
                    setReceptionId(rid);
                  }

                  setUploadingDoc(true);
                  try {
                    const ext = file.name.split('.').pop();
                    const path = `${rid}/${docType}_${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage.from('reception-docs').upload(path, file, { contentType: file.type });
                    if (upErr) throw upErr;
                    // Save record
                    const { data: docRow, error: dbErr } = await supabase.from('reception_documents').insert({
                      reception_id: rid,
                      file_name: file.name,
                      file_type: docType,
                      storage_path: path,
                      uploaded_by: userId,
                    }).select('*').single();
                    if (dbErr) throw dbErr;
                    setDocuments(prev => [...prev, docRow]);
                  } catch (err) {
                    alert('Error al subir: ' + err.message);
                  } finally {
                    setUploadingDoc(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm m-0">No hay documentos adjuntos aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => {
              const typeLabels = {
                po: 'Orden de Compra', invoice: 'Invoice', bl: 'Bill of Lading',
                debit_note: 'Debit Note', pedimento: 'Pedimento', packing_list: 'Packing List',
                certificate: 'Certificado', other: 'Documento',
              };
              return (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText size={14} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 m-0">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-400 m-0">{typeLabels[doc.file_type] || doc.file_type} • {new Date(doc.created_at).toLocaleDateString('es-MX')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        const { data } = await supabase.storage.from('reception-docs').createSignedUrl(doc.storage_path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }}
                      className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer"
                      title="Ver / Descargar"
                    >
                      <Eye size={14} />
                    </button>
                    {!isCompleted && (
                      <button
                        onClick={async () => {
                          if (!confirm('¿Eliminar este documento?')) return;
                          await supabase.storage.from('reception-docs').remove([doc.storage_path]);
                          await supabase.from('reception_documents').delete().eq('id', doc.id);
                          setDocuments(prev => prev.filter(d => d.id !== doc.id));
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/dashboard/recepciones"
            className="px-5 py-3 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm no-underline text-sm"
          >
            Cancelar
          </Link>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || confirming}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Borrador
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || confirming}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
            >
              {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {confirming ? 'Procesando...' : 'Confirmar Recepción'}
            </button>
          </div>
        </div>
      )}

      {/* Scan Feedback Toast */}
      {scanFeedback && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm ${
          scanFeedback.type === 'success' ? 'bg-emerald-500' : scanFeedback.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
        }`} style={{animation: 'slideUp 0.3s ease-out'}}>
          {scanFeedback.type === 'success' ? '✅' : scanFeedback.type === 'warning' ? '⚠️' : '❌'}
          {scanFeedback.message}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}
