import { todayMX } from '@/utils/formatters';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';

export const cleanOperationNumber = (rawOp) => {
  if (!rawOp) return '';
  const val = rawOp.trim();
  if (/^op/i.test(val)) return val.replace(/^(op\s*)+/i, 'Op');
  return `Op${val}`;
};

export const isUserAuthorizedToEdit = (email, name) => {
  const e = (email || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  return (
    e === 'alain.ramosc@gmail.com' ||
    e === 'alain.ramos@greenland-products.com.mx' ||
    e.includes('alain.ramos') ||
    n.includes('alain ramos')
  );
};

// Código de destino de la PO → palabras clave en el nombre de la bodega
const WAREHOUSE_CODE_KEYWORDS = {
  VITO: ['vito', 'saltillo'], SLW: ['vito', 'saltillo'], SALTILLO: ['vito', 'saltillo'],
  ECH: ['echeverr'], ECHEVERRIA: ['echeverr'],
  TL: ['tlaln'], TLALNEPANTLA: ['tlaln'],
  MRO: ['morelia'], MORELIA: ['morelia'],
  QRO: ['queretaro'], QUERETARO: ['queretaro'],
  ALT: ['altamira'], ALTAMIRA: ['altamira'],
};

const plain = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const getWarehouseFromCode = (code, warehousesList = []) => {
  if (!code) return null;
  const c = code.toUpperCase().trim();
  const keywords = WAREHOUSE_CODE_KEYWORDS[c] || [plain(c)];
  return warehousesList.find(w => keywords.some(k => plain(w.name).includes(k)))?.id || null;
};

// Etiquetas técnicas que versiones anteriores guardaban dentro de las notas.
// Ya no se usan (la bodega vive en container_reception_items.warehouse_id).
const stripTechnicalTags = (notes) =>
  (notes || '')
    .replace(/\[ITEM_WAREHOUSES:[^\]]*\]/g, '')
    .replace(/\[BODEGAS:[^\]]*\]/g, '')
    .replace(/\[Full - POs vinculadas:[^\]]*\]/g, '')
    .trim();

const toNum = (v) => Number(v) || 0;
const today = () => todayMX();

export function useReceptionForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const poParam = searchParams.get('po');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Catalogs
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // User
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Form State
  const [form, setForm] = useState({
    supplier_id: '',
    purchase_order_id: '', // PO Principal
    warehouse_id: '', // Bodega Principal / Predeterminada
    distributor_id: '',
    reception_date: today(),
    container_label: '',
    pedimento_number: '',
    bl_number: '',
    operation_number: '',
    customs_broker_ref: '',
    freight_maritime: '',
    freight_national: '',
    freight_external: false, // true = transportista externo/no frecuente: no se genera orden de flete
    freight_external_carrier: '',
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

  // Multi-PO State: [{ id, po_number, supplier_id, supplier_name, destination_warehouse_id, is_final }]
  const [linkedPOs, setLinkedPOs] = useState([]);
  const [items, setItems] = useState([]); // [{ id, product_id, name, sku, quantity, warehouse_id, purchase_order_id, po_number, unit_origin_cost, unit_pro_price }]
  const [isFinalReception, setIsFinalReception] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [receptionId, setReceptionId] = useState(editId);
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Barcode / Scanner
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' | 'scan'
  const [showReceptionScanner, setShowReceptionScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const receptionScannerRef = useRef(null);
  const receptionScannerStoppingRef = useRef(false);
  const scanSearchRef = useRef(null);
  const lastScanKeystrokeRef = useRef(0);
  const scanBarcodeBufferRef = useRef('');

  useEffect(() => {
    fetchData();
    return () => {
      if (receptionScannerRef.current) {
        try {
          receptionScannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toLinkedPO = (po, destinationWarehouseId = po.destination_warehouse_id) => ({
    id: po.id,
    po_number: po.po_number,
    supplier_id: po.supplier_id,
    supplier_name: po.supplier_name || suppliers.find(s => s.id === po.supplier_id)?.short_name || 'Sin proveedor',
    destination_warehouse_id: destinationWarehouseId,
    is_final: false,
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email || profile?.email || '');
    setUserName(profile?.full_name || '');

    const [productsRes, warehousesRes, distributorsRes, suppliersRes, posRes] = await Promise.all([
      supabase.from('products').select('id, name, sku, price').eq('is_active', true).order('sku'),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      supabase.from('profiles').select('id, full_name, client_number, assigned_warehouse_id').eq('role', 'distributor').eq('sub_role', 'distributor_pro').eq('is_active', true).order('full_name'),
      supabase.from('suppliers').select('id, name, short_name, is_active').order('short_name'),
      supabase.from('purchase_orders').select('id, po_number, status, supplier_id, destination_code').in('status', ['draft', 'sent', 'partially_received']).order('created_at', { ascending: false }),
    ]);
    if (posRes.error) console.error('PO fetch error:', posRes.error);

    const allWarehouses = warehousesRes.data || [];
    const allSuppliers = suppliersRes.data || [];
    setProducts(productsRes.data || []);
    setWarehouses(allWarehouses);
    setDistributors(distributorsRes.data || []);
    setSuppliers(allSuppliers.filter(s => s.is_active));

    const supplierMap = Object.fromEntries(allSuppliers.map(s => [s.id, s.short_name]));
    const enrichPO = (po) => ({
      ...po,
      supplier_name: supplierMap[po.supplier_id] || 'Sin proveedor',
      destination_warehouse_id: getWarehouseFromCode(po.destination_code, allWarehouses),
    });
    const posList = (posRes.data || []).map(enrichPO);

    // If editing, load existing data
    if (editId) {
      const { data: reception } = await supabase
        .from('container_receptions')
        .select('*')
        .eq('id', editId)
        .single();

      if (reception) {
        if (reception.purchase_order_id) {
          let matchedPo = posList.find(p => p.id === reception.purchase_order_id);
          if (!matchedPo) {
            // PO ya cerrada: no viene en la lista de POs activas
            const { data: singlePo } = await supabase
              .from('purchase_orders')
              .select('id, po_number, status, supplier_id, destination_code')
              .eq('id', reception.purchase_order_id)
              .single();
            if (singlePo) {
              matchedPo = enrichPO(singlePo);
              posList.push(matchedPo);
            }
          }
          if (matchedPo) setLinkedPOs([toLinkedPO(matchedPo)]);
        }

        setForm({
          supplier_id: reception.supplier_id || '',
          purchase_order_id: reception.purchase_order_id || '',
          warehouse_id: reception.warehouse_id || '',
          distributor_id: reception.distributor_id || '',
          reception_date: reception.reception_date || today(),
          container_label: reception.container_label || '',
          pedimento_number: reception.pedimento_number || '',
          bl_number: reception.bl_number || '',
          operation_number: reception.operation_number || '',
          customs_broker_ref: reception.customs_broker_ref || '',
          freight_maritime: reception.freight_maritime || '',
          freight_national: reception.freight_national || '',
          freight_external: !!reception.freight_external,
          freight_external_carrier: reception.freight_external_carrier || '',
          import_taxes: reception.import_taxes || '',
          port_handling: reception.port_handling || '',
          customs_broker: reception.customs_broker || '',
          other_costs: reception.other_costs || '',
          other_costs_description: reception.other_costs_description || '',
          exchange_rate_goods: reception.exchange_rate_goods || '',
          exchange_rate_freight: reception.exchange_rate_freight || '',
          notes: stripTechnicalTags(reception.notes),
          status: reception.status,
        });

        const [{ data: existingItems }, { data: existingDocs }] = await Promise.all([
          supabase.from('container_reception_items').select('*, product:products(name, sku)').eq('reception_id', editId),
          supabase.from('reception_documents').select('*').eq('reception_id', editId).order('created_at'),
        ]);

        setItems((existingItems || []).map(i => ({
          id: i.id,
          product_id: i.product_id,
          name: i.product?.name,
          sku: i.product?.sku,
          quantity: i.quantity,
          warehouse_id: i.warehouse_id || reception.warehouse_id || '',
          purchase_order_id: reception.purchase_order_id || null,
          unit_origin_cost: i.unit_origin_cost || '',
          unit_pro_price: i.unit_pro_price || '',
        })));
        setDocuments(existingDocs || []);
      }
    }

    setPurchaseOrders(posList);

    // Preload PO if query param exists
    if (poParam && !editId) {
      setForm(f => ({ ...f, purchase_order_id: poParam }));
      await handlePOChange(poParam, distributorsRes.data || []);
    }

    setLoading(false);
  };

  // Helper to fetch PO items with pending quantities
  const fetchPOItems = async (poId, defaultWarehouseFallback = '') => {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, items:purchase_order_items(product_id, quantity, unit_price_usd, products(name, sku))')
      .eq('id', poId)
      .single();
    if (!po) return { po: null, items: [] };

    const receivedMap = {};
    if (po.status === 'partially_received') {
      const { data: pastReceptions } = await supabase
        .from('container_receptions')
        .select('id')
        .eq('purchase_order_id', poId)
        .eq('status', 'completed');
      if (pastReceptions?.length) {
        const { data: receivedItems } = await supabase
          .from('container_reception_items')
          .select('product_id, quantity')
          .in('reception_id', pastReceptions.map(r => r.id));
        for (const ri of receivedItems || []) {
          receivedMap[ri.product_id] = (receivedMap[ri.product_id] || 0) + Number(ri.quantity);
        }
      }
    }

    const assignedWarehouse = getWarehouseFromCode(po.destination_code, warehouses) || defaultWarehouseFallback || '';
    const remaining = (po.items || [])
      .map(i => ({
        product_id: i.product_id,
        name: i.products?.name || '',
        sku: i.products?.sku || '',
        quantity: i.quantity - (receivedMap[i.product_id] || 0),
        warehouse_id: assignedWarehouse,
        purchase_order_id: po.id,
        po_number: po.po_number,
        unit_origin_cost: i.unit_price_usd || '',
        unit_pro_price: '',
      }))
      .filter(i => i.quantity > 0);

    return { po, items: remaining };
  };

  // Handle Primary PO selection change
  const handlePOChange = async (poId, distList = distributors) => {
    if (!poId) {
      setForm(f => ({ ...f, purchase_order_id: '' }));
      setLinkedPOs(prev => prev.slice(1));
      setItems(prev => prev.filter(i => i.purchase_order_id !== form.purchase_order_id));
      return;
    }

    const { po, items: poItems } = await fetchPOItems(poId, form.warehouse_id);
    if (!po) return;

    const poWarehouse = getWarehouseFromCode(po.destination_code, warehouses) || form.warehouse_id;
    setForm(f => ({
      ...f,
      purchase_order_id: poId,
      warehouse_id: f.warehouse_id || poWarehouse,
      supplier_id: f.supplier_id || po.supplier_id || '',
    }));

    // Auto-detect distributor by warehouse if not selected
    if (poWarehouse && !form.distributor_id) {
      const matchDist = distList.find(d => d.assigned_warehouse_id === poWarehouse);
      if (matchDist) setForm(f => ({ ...f, distributor_id: matchDist.id }));
    }

    setLinkedPOs(prev => [toLinkedPO(po, poWarehouse), ...prev.slice(1)]);

    // Replace primary PO items, preserving secondary items
    setItems(prev => {
      const secondaryItems = prev.filter(i => i.purchase_order_id && i.purchase_order_id !== form.purchase_order_id);
      return [...poItems, ...secondaryItems];
    });
  };

  // Add Secondary PO (For Full double container arrival)
  const addSecondaryPO = async (poId) => {
    if (!poId) return;
    if (linkedPOs.some(p => p.id === poId)) {
      alert('Esta Orden de Compra ya está vinculada a esta recepción');
      return;
    }

    const { po, items: poItems } = await fetchPOItems(poId, form.warehouse_id);
    if (!po) return;

    const secondaryWarehouse = getWarehouseFromCode(po.destination_code, warehouses) || form.warehouse_id;
    setLinkedPOs(prev => [...prev, toLinkedPO(po, secondaryWarehouse)]);
    setItems(prev => [...prev, ...poItems]);
  };

  // Remove a linked PO
  const removeLinkedPO = (poId) => {
    setLinkedPOs(prev => prev.filter(p => p.id !== poId));
    setItems(prev => prev.filter(i => i.purchase_order_id !== poId));
    if (form.purchase_order_id === poId) {
      const remaining = linkedPOs.filter(p => p.id !== poId);
      setForm(f => ({ ...f, purchase_order_id: remaining[0]?.id || '' }));
    }
  };

  // Toggle closure for a specific PO
  const togglePOFinal = (poId, isFinal) => {
    setLinkedPOs(prev => prev.map(p => (p.id === poId ? { ...p, is_final: isFinal } : p)));
    if (linkedPOs.length === 1 && linkedPOs[0].id === poId) {
      setIsFinalReception(isFinal);
    }
  };

  const handleWarehouseChange = (whId) => {
    const matchDist = distributors.find(d => d.assigned_warehouse_id === whId);
    setForm(f => ({ ...f, warehouse_id: whId, distributor_id: matchDist?.id || '' }));
  };

  const handleProductSearch = (q) => {
    setProductSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const s = q.toLowerCase();
    const existingIds = items.map(i => i.product_id);
    setSearchResults(
      products
        .filter(p => (p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)) && !existingIds.includes(p.id))
        .slice(0, 5)
    );
  };

  // New line item, defaulting to the header warehouse and primary PO
  const newItem = (product, quantity) => ({
    product_id: product.id,
    name: product.name,
    sku: product.sku,
    quantity,
    warehouse_id: form.warehouse_id || '',
    purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
    po_number: linkedPOs[0]?.po_number || null,
    unit_origin_cost: '',
    unit_pro_price: '',
  });

  const addProduct = (product) => {
    setItems(prev => [...prev, newItem(product, 0)]);
    setProductSearch('');
    setSearchResults([]);
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  // Barcode / Scanner
  const flashScanFeedback = (type, message, ms) => {
    setScanFeedback({ type, message });
    setTimeout(() => setScanFeedback(null), ms);
  };

  const handleReceptionScan = (scannedSku) => {
    const sku = scannedSku.trim().toUpperCase();
    const product = products.find(p => p.sku?.toUpperCase() === sku);

    if (!product) {
      flashScanFeedback('error', `Código "${sku}" no encontrado`, 3000);
      return;
    }

    const existingIndex = items.findIndex(i => i.product_id === product.id);
    if (existingIndex >= 0) {
      const newQty = (Number(items[existingIndex].quantity) || 0) + 1;
      setItems(prev => prev.map((it, i) => (i === existingIndex ? { ...it, quantity: newQty } : it)));
      flashScanFeedback('success', `${sku} — ${product.name} (${newQty} pzas)`, 2000);
    } else {
      setItems(prev => [...prev, newItem(product, 1)]);
      flashScanFeedback('success', `${sku} — ${product.name} agregado (1 pza)`, 2000);
    }
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
          decodedText => handleReceptionScan(decodedText),
          () => {}
        );
      } catch (err) {
        setShowReceptionScanner(false);
        flashScanFeedback('error', 'No se pudo acceder a la cámara', 3000);
      }
    }, 350);
  };

  const closeReceptionScanner = async () => {
    if (receptionScannerRef.current && !receptionScannerStoppingRef.current) {
      receptionScannerStoppingRef.current = true;
      try {
        await receptionScannerRef.current.stop();
      } catch {}
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
      if (now - lastScanKeystrokeRef.current > 300) scanBarcodeBufferRef.current = '';
      scanBarcodeBufferRef.current += e.key;
      lastScanKeystrokeRef.current = now;
    }
  };

  // Calculations (MXN)
  const tcGoods = Number(form.exchange_rate_goods) || 1;
  const tcFreight = Number(form.exchange_rate_freight) || 1;
  const totalOriginCostUSD = useMemo(() => {
    return items.reduce((s, i) => s + toNum(i.quantity) * toNum(i.unit_origin_cost), 0);
  }, [items]);
  const totalOriginCostMXN = totalOriginCostUSD * tcGoods;
  const totalAdditionalCosts =
    toNum(form.freight_maritime) * tcFreight +
    toNum(form.freight_national) +
    toNum(form.import_taxes) +
    toNum(form.port_handling) +
    toNum(form.customs_broker) +
    toNum(form.other_costs);
  const totalLandedCost = totalOriginCostMXN + totalAdditionalCosts;
  const totalQuantity = useMemo(() => items.reduce((s, i) => s + toNum(i.quantity), 0), [items]);

  const getLandedPerUnit = (item) => {
    if (totalOriginCostMXN === 0 || !item.quantity) return 0;
    const itemOriginMXN = toNum(item.quantity) * toNum(item.unit_origin_cost) * tcGoods;
    const additionalShare = totalAdditionalCosts * (itemOriginMXN / totalOriginCostMXN);
    return (itemOriginMXN + additionalShare) / (toNum(item.quantity) || 1);
  };

  const chargeAmount = useMemo(() => {
    return form.distributor_id
      ? items.reduce((s, i) => s + toNum(i.quantity) * toNum(i.unit_pro_price), 0)
      : 0;
  }, [form.distributor_id, items]);

  // Documents
  const handleUploadDoc = async (file, docType = 'other') => {
    if (!file) return;
    let rid = receptionId;
    if (!rid) {
      if (!form.warehouse_id) {
        alert('Primero selecciona una bodega para guardar');
        return;
      }
      const { data: newRec, error } = await supabase
        .from('container_receptions')
        .insert({
          supplier_id: form.supplier_id || null,
          purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
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
      if (error || !newRec) {
        alert('Error al guardar borrador: ' + (error?.message || ''));
        return;
      }
      rid = newRec.id;
      setReceptionId(rid);
    }

    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${rid}/${docType}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('reception-docs').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: docRow, error: dbErr } = await supabase
        .from('reception_documents')
        .insert({
          reception_id: rid,
          file_name: file.name,
          file_type: docType,
          storage_path: path,
          uploaded_by: userId,
        })
        .select('*')
        .single();
      if (dbErr) throw dbErr;
      setDocuments(prev => [...prev, docRow]);
    } catch (err) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId, storagePath) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await supabase.storage.from('reception-docs').remove([storagePath]);
    await supabase.from('reception_documents').delete().eq('id', docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleViewDoc = async (storagePath) => {
    const { data } = await supabase.storage.from('reception-docs').createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  // ─── Shared save helpers ────────────────────────────────────────────────

  const warehouseOf = (item) => item.warehouse_id || form.warehouse_id;
  const warehouseName = (id) => warehouses.find(w => w.id === id)?.name || '';

  // Unified destination string for the freight service order
  const getUnifiedDestination = () => {
    const names = [...new Set(items.map(warehouseOf).filter(Boolean))].map(warehouseName).filter(Boolean);
    const withPrefix = (n) => (n.toLowerCase().includes('bodega') ? n : `Bodega ${n}`);
    if (names.length > 1) return names.map(withPrefix).join(' / ') + ' (Full)';
    if (names.length === 1) return withPrefix(names[0]);
    return suppliers.find(s => s.id === form.supplier_id)?.short_name || 'Puerto';
  };

  const buildNotes = () => {
    let notes = stripTechnicalTags(form.notes);
    if (linkedPOs.length > 1) {
      const poListTag = `[Full - POs vinculadas: ${linkedPOs.map(p => p.po_number).join(' / ')}]`;
      notes = notes ? `${poListTag}\n${notes}` : poListTag;
    }
    return notes || null;
  };

  // Fields that can be edited even after the reception is completed
  const buildEditableFields = () => ({
    container_label: form.container_label || null,
    pedimento_number: form.pedimento_number || null,
    bl_number: form.bl_number?.trim() || null,
    operation_number: cleanOperationNumber(form.operation_number) || null,
    customs_broker_ref: form.customs_broker_ref || null,
    reception_date: form.reception_date,
    freight_maritime: toNum(form.freight_maritime),
    freight_national: toNum(form.freight_national),
    freight_external: !!form.freight_external,
    freight_external_carrier: form.freight_external ? (form.freight_external_carrier?.trim() || null) : null,
    import_taxes: toNum(form.import_taxes),
    port_handling: toNum(form.port_handling),
    customs_broker: toNum(form.customs_broker),
    other_costs: toNum(form.other_costs),
    other_costs_description: form.other_costs_description || null,
    exchange_rate_goods: Number(form.exchange_rate_goods) || 1,
    exchange_rate_freight: Number(form.exchange_rate_freight) || 1,
    total_origin_cost: totalOriginCostMXN,
    total_additional_costs: totalAdditionalCosts,
    total_landed_cost: totalLandedCost,
    notes: buildNotes(),
  });

  const validateBasics = () => {
    if (!form.warehouse_id) {
      alert('Selecciona una bodega principal en el encabezado');
      return false;
    }
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return false;
    }
    if (form.freight_external && !form.freight_external_carrier?.trim()) {
      alert('Indica el nombre del transportista externo del flete nacional');
      return false;
    }
    return true;
  };

  // Saves header + items as a draft. Returns the reception id, or null on error.
  // New items are inserted BEFORE the old ones are deleted, so a failure
  // never leaves the reception without products.
  const saveDraft = async () => {
    const payload = {
      supplier_id: form.supplier_id || linkedPOs[0]?.supplier_id || null,
      purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
      warehouse_id: form.warehouse_id,
      distributor_id: form.distributor_id || null,
      ...buildEditableFields(),
      charge_amount: chargeAmount,
      status: 'draft',
      created_by: userId,
    };

    let id = receptionId;
    if (id) {
      const { error } = await supabase.from('container_receptions').update(payload).eq('id', id);
      if (error) {
        alert('Error: ' + error.message);
        return null;
      }
    } else {
      const { data, error } = await supabase.from('container_receptions').insert(payload).select('id').single();
      if (error) {
        alert('Error: ' + error.message);
        return null;
      }
      id = data.id;
      setReceptionId(id);
    }

    const { data: oldItems } = await supabase.from('container_reception_items').select('id').eq('reception_id', id);
    const { error: itemsError } = await supabase.from('container_reception_items').insert(
      items.map(i => ({
        reception_id: id,
        product_id: i.product_id,
        quantity: toNum(i.quantity),
        unit_origin_cost: toNum(i.unit_origin_cost),
        unit_landed_cost: getLandedPerUnit(i),
        unit_pro_price: form.distributor_id ? (Number(i.unit_pro_price) || null) : null,
        warehouse_id: warehouseOf(i) || null,
      }))
    );
    if (itemsError) {
      alert('Error guardando productos: ' + itemsError.message);
      return null;
    }
    const oldIds = (oldItems || []).map(o => o.id);
    if (oldIds.length) await supabase.from('container_reception_items').delete().in('id', oldIds);

    return id;
  };

  // Creates or updates the inland freight service order linked to this reception
  const syncFreightServiceOrder = async (id, { matchByOperation = false } = {}) => {
    try {
      const formattedOp = cleanOperationNumber(form.operation_number);
      const destLocation = getUnifiedDestination();
      const refParts = [
        form.container_label && `Contenedor: ${form.container_label}`,
        form.pedimento_number && `Pedimento: ${form.pedimento_number}`,
        form.customs_broker_ref && `Ref. Aduanal: ${form.customs_broker_ref}`,
        formattedOp && `Operación: ${formattedOp}`,
        linkedPOs.length > 0 && `POs: ${linkedPOs.map(p => p.po_number).join(' / ')}`,
        destLocation && `Destino: ${destLocation}`,
      ].filter(Boolean);

      const fields = {
        reception_id: id,
        description: `Flete contenedor ${form.container_label || ''} — ${formattedOp || ''}`.replace(/\s+/g, ' ').trim(),
        location: destLocation,
        reference_info: refParts.join(' | '),
        agreed_amount: toNum(form.freight_national),
        scheduled_date: form.reception_date,
      };

      let { data: existing } = await supabase.from('service_orders').select('id').eq('reception_id', id).maybeSingle();
      if (!existing && matchByOperation && formattedOp) {
        // Legacy orders created before reception_id existed
        const { data: matched } = await supabase
          .from('service_orders')
          .select('id')
          .ilike('description', `%${formattedOp}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        existing = matched?.[0] || null;
      }

      if (existing) {
        if (form.freight_external) {
          // No se toca una orden ya existente: se avisa para cancelarla a mano si corresponde
          return { warning: 'Esta recepción ya tenía una orden de flete con el transportista registrado. Como ahora el flete es externo, revisa y cancela esa orden en Proveedores si no aplica.' };
        }
        await supabase.from('service_orders').update(fields).eq('id', existing.id);
        return;
      }

      // Transportista externo / no frecuente: no se genera orden de servicio
      if (form.freight_external) return;

      const { data: fleteSuppliers } = await supabase
        .from('suppliers')
        .select('id')
        .contains('service_types', ['flete'])
        .eq('is_active', true)
        .limit(1);
      if (fleteSuppliers?.length) {
        await supabase.from('service_orders').insert({
          ...fields,
          supplier_id: fleteSuppliers[0].id,
          service_type: 'flete',
          status: 'completada',
        });
      }
    } catch (soErr) {
      console.error('Error syncing service order:', soErr);
    }
  };

  // In-transit rows for a PO product: exact warehouse first, then header warehouse, then any
  const findTransits = async (poId, productId, warehouseIds) => {
    for (const wh of [...new Set(warehouseIds.filter(Boolean)), null]) {
      let q = supabase
        .from('transit_shipments')
        .select('id, quantity')
        .eq('purchase_order_id', poId)
        .eq('product_id', productId)
        .eq('status', 'in_transit');
      if (wh) q = q.eq('warehouse_id', wh);
      const { data } = await q.order('created_at', { ascending: true });
      if (data?.length) return data;
    }
    return [];
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  // Save changes on an ALREADY COMPLETED reception (Alain Ramos only).
  // Does not touch stock or the product's avg_cost.
  const handleSaveCompleted = async () => {
    if (form.freight_external && !form.freight_external_carrier?.trim()) {
      alert('Indica el nombre del transportista externo del flete nacional');
      return;
    }
    setSaving(true);

    const { error: recErr } = await supabase
      .from('container_receptions')
      .update(buildEditableFields())
      .eq('id', editId);
    if (recErr) {
      alert('Error al actualizar la recepción: ' + recErr.message);
      setSaving(false);
      return;
    }

    for (const item of items) {
      const { error } = await supabase
        .from('container_reception_items')
        .update({ unit_landed_cost: getLandedPerUnit(item), warehouse_id: warehouseOf(item) || null })
        .eq('reception_id', editId)
        .eq('product_id', item.product_id);
      if (error) console.error('Error updating item', item.sku, error);
    }

    const soResult = await syncFreightServiceOrder(editId, { matchByOperation: true });

    setSaving(false);
    alert(
      form.freight_external
        ? `✅ Recepción actualizada. Flete externo (${form.freight_external_carrier}): no se generó orden de flete.` + (soResult?.warning ? `\n\n⚠️ ${soResult.warning}` : '')
        : '✅ Recepción actualizada exitosamente. Orden de flete sincronizada.'
    );
    router.push('/dashboard/recepciones');
  };

  // Save Draft
  const handleSave = async () => {
    if (!validateBasics()) return;
    setSaving(true);
    const id = await saveDraft();
    setSaving(false);
    if (id) alert('Recepción guardada como borrador');
  };

  // Confirm Reception
  const handleConfirm = async () => {
    if (!validateBasics()) return;
    if (items.some(i => !i.quantity || Number(i.quantity) <= 0)) {
      alert('Todos los productos deben tener cantidad mayor a 0');
      return;
    }
    if (form.distributor_id && items.some(i => !i.unit_pro_price || Number(i.unit_pro_price) <= 0)) {
      alert('Todos los productos deben tener precio PRO asignado');
      return;
    }

    // Warehouse breakdown for the confirmation dialog
    const whSummaryMap = {};
    items.forEach(i => {
      const wName = warehouseName(warehouseOf(i)) || 'Bodega';
      whSummaryMap[wName] = (whSummaryMap[wName] || 0) + Number(i.quantity);
    });
    const whSummaryText = Object.entries(whSummaryMap).map(([name, qty]) => `  • ${name}: ${qty} pzas`).join('\n');
    const poSummaryText = linkedPOs.length > 0
      ? `• Órdenes de Compra (POs):\n` + linkedPOs.map(p => `  • ${p.po_number} (${p.supplier_name}) ${p.is_final ? '[Cerrar PO]' : '[Parcial]'}`).join('\n') + '\n'
      : '';
    const isMultiWarehouse = Object.keys(whSummaryMap).length > 1;

    if (
      !confirm(
        `¿Confirmar recepción?\n\n` +
        `• Total: ${items.length} partidas (${totalQuantity} pzas)\n` +
        (isMultiWarehouse
          ? `• Distribución Multibodega:\n${whSummaryText}\n`
          : `• Ingreso a ${warehouseName(form.warehouse_id)}\n`) +
        poSummaryText +
        (form.distributor_id
          ? `• Se generará un cargo de $${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} al distribuidor PRO\n`
          : '') +
        (form.freight_external
          ? `• Flete nacional con transportista externo (${form.freight_external_carrier}): NO se generará orden de flete\n`
          : `• Se generará la orden de flete para el transportista registrado\n`) +
        `\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setConfirming(true);

    // 1. Save header + items, and only then mark as completed
    const id = await saveDraft();
    if (!id) {
      setConfirming(false);
      return;
    }
    const { error: statusErr } = await supabase.from('container_receptions').update({ status: 'completed' }).eq('id', id);
    if (statusErr) {
      alert('Error al confirmar: ' + statusErr.message);
      setConfirming(false);
      return;
    }

    // 2. Add stock to each item's destination warehouse
    const stockErrors = [];
    for (const item of items) {
      const targetWarehouse = warehouseOf(item);
      const targetName = warehouseName(targetWarehouse) || targetWarehouse;
      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: item.product_id,
        p_warehouse_id: targetWarehouse,
        p_quantity_change: Number(item.quantity),
        p_reason: `Recepción contenedor: ${form.container_label || id} (${targetName})`,
      });
      if (error) stockErrors.push(`${item.sku} en ${targetName}: ${error.message}`);
    }

    // 2b. Weighted average cost against current total stock
    for (const item of items) {
      const landedCost = getLandedPerUnit(item);
      const qtyReceived = toNum(item.quantity);
      if (landedCost <= 0 || qtyReceived <= 0) continue;

      const [{ data: stockRows }, { data: prod }] = await Promise.all([
        supabase.from('warehouse_stock').select('stock_quantity').eq('product_id', item.product_id),
        supabase.from('products').select('avg_cost').eq('id', item.product_id).single(),
      ]);
      const totalStockNow = (stockRows || []).reduce((s, r) => s + (r.stock_quantity || 0), 0);
      const oldAvg = Number(prod?.avg_cost) || 0;
      const stockBefore = totalStockNow - qtyReceived;
      const newAvg = stockBefore <= 0 || oldAvg <= 0
        ? landedCost
        : ((stockBefore * oldAvg) + (qtyReceived * landedCost)) / totalStockNow;

      await supabase.from('products').update({ avg_cost: Math.round(newAvg * 100) / 100 }).eq('id', item.product_id);
    }

    // 3. Resolve transits and update status for ALL linked POs
    const activePOs = linkedPOs.length > 0
      ? linkedPOs
      : form.purchase_order_id
      ? [{ id: form.purchase_order_id, is_final: isFinalReception }]
      : [];

    for (const lpo of activePOs) {
      await supabase
        .from('purchase_orders')
        .update({ status: lpo.is_final ? 'received' : 'partially_received' })
        .eq('id', lpo.id);

      const poItems = items.filter(i => !i.purchase_order_id || i.purchase_order_id === lpo.id);
      for (const item of poItems) {
        let remaining = toNum(item.quantity);
        if (remaining <= 0) continue;

        const transits = await findTransits(lpo.id, item.product_id, [warehouseOf(item), form.warehouse_id]);
        for (const t of transits) {
          if (remaining <= 0) break;
          if (remaining >= t.quantity) {
            await supabase.from('transit_shipments').delete().eq('id', t.id);
            remaining -= t.quantity;
          } else {
            await supabase.from('transit_shipments').update({ quantity: t.quantity - remaining }).eq('id', t.id);
            remaining = 0;
          }
        }
      }

      if (lpo.is_final) {
        await supabase.from('transit_shipments').delete().eq('purchase_order_id', lpo.id);
      }
    }

    // 4. Inland freight service order (se omite si el flete es con transportista externo)
    const soResult = await syncFreightServiceOrder(id);

    alert(
      (stockErrors.length
        ? `Recepción confirmada con algunos errores de stock:\n${stockErrors.join('\n')}`
        : '✅ Recepción confirmada exitosamente') +
      (soResult?.warning ? `\n\n⚠️ ${soResult.warning}` : '')
    );
    setConfirming(false);
    router.push('/dashboard/recepciones');
  };

  return {
    loading,
    saving,
    confirming,
    editId,
    form,
    setForm,
    items,
    setItems,
    warehouses,
    suppliers,
    purchaseOrders,
    distributors,
    // Multi-PO
    linkedPOs,
    addSecondaryPO,
    removeLinkedPO,
    togglePOFinal,
    isFinalReception,
    setIsFinalReception,
    productSearch,
    searchResults,
    entryMode,
    setEntryMode,
    showReceptionScanner,
    scanFeedback,
    scanSearchRef,
    documents,
    uploadingDoc,
    userId,
    userEmail,
    userName,
    isAuthorized: isUserAuthorizedToEdit(userEmail, userName),
    isCompleted: form.status === 'completed',
    // Math
    tcGoods,
    tcFreight,
    totalOriginCostUSD,
    totalOriginCostMXN,
    totalAdditionalCosts,
    totalLandedCost,
    totalQuantity,
    chargeAmount,
    getLandedPerUnit,
    // Methods
    handlePOChange,
    handleWarehouseChange,
    handleProductSearch,
    addProduct,
    removeItem,
    updateItem,
    openReceptionScanner,
    closeReceptionScanner,
    handleScanKeyDown,
    handleUploadDoc,
    handleDeleteDoc,
    handleViewDoc,
    handleSave,
    handleConfirm,
    handleSaveCompleted,
  };
}
