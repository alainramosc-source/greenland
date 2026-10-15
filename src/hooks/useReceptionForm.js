import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';

export const cleanOperationNumber = (rawOp) => {
  if (!rawOp) return '';
  let val = rawOp.trim();
  if (/^op/i.test(val)) {
    val = val.replace(/^(op\s*)+/i, 'Op');
    return val;
  }
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

export const getWarehouseFromCode = (code, warehousesList = []) => {
  if (!code) return null;
  const c = code.toUpperCase().trim();
  if (c === 'VITO' || c === 'SLW' || c === 'SALTILLO') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('vito') || w.name?.toLowerCase().includes('saltillo'))?.id || null;
  }
  if (c === 'ECH' || c === 'ECHEVERRIA') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('echeverr'))?.id || null;
  }
  if (c === 'TL' || c === 'TLALNEPANTLA') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('tlaln'))?.id || null;
  }
  if (c === 'MRO' || c === 'MORELIA') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('morelia'))?.id || null;
  }
  if (c === 'QRO' || c === 'QUERETARO') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('queretaro'))?.id || null;
  }
  if (c === 'ALT' || c === 'ALTAMIRA') {
    return warehousesList.find(w => w.name?.toLowerCase().includes('altamira'))?.id || null;
  }
  return warehousesList.find(w => w.name?.toUpperCase().includes(c))?.id || null;
};

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

  // Multi-PO State: [{ id, po_number, supplier_id, supplier_name, destination_warehouse_id, is_final: false }]
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
  }, []);

  useEffect(() => {
    return () => {
      if (receptionScannerRef.current) {
        try {
          receptionScannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

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

    const { data: posData, error: posError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, supplier_id, destination_code')
      .in('status', ['draft', 'sent', 'partially_received'])
      .order('created_at', { ascending: false });

    if (posError) {
      console.error('PO fetch error:', posError);
    }

    const posList = posData || [];
    if (posList.length > 0) {
      const supplierIds = [...new Set(posList.map(p => p.supplier_id).filter(Boolean))];
      if (supplierIds.length > 0) {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, short_name')
          .in('id', supplierIds);
        const supplierMap = Object.fromEntries((suppliersData || []).map(s => [s.id, s.short_name]));
        posList.forEach(po => {
          po.supplier_name = supplierMap[po.supplier_id] || 'Sin proveedor';
          po.destination_warehouse_id = getWarehouseFromCode(po.destination_code, warehousesRes.data || []);
        });
      } else {
        posList.forEach(po => {
          po.supplier_name = 'Sin proveedor';
          po.destination_warehouse_id = getWarehouseFromCode(po.destination_code, warehousesRes.data || []);
        });
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
        if (reception.purchase_order_id) {
          const exists = posList.some(p => p.id === reception.purchase_order_id);
          if (!exists) {
            const { data: singlePo } = await supabase
              .from('purchase_orders')
              .select('id, po_number, status, supplier_id, destination_code')
              .eq('id', reception.purchase_order_id)
              .single();
            if (singlePo) {
              const sName = (suppliersRes.data || []).find(s => s.id === singlePo.supplier_id)?.short_name || 'Sin proveedor';
              singlePo.supplier_name = sName;
              singlePo.destination_warehouse_id = getWarehouseFromCode(singlePo.destination_code, warehousesRes.data || []);
              posList.push(singlePo);
              setPurchaseOrders([...posList]);
            }
          }

          const matchedPo = posList.find(p => p.id === reception.purchase_order_id);
          if (matchedPo) {
            setLinkedPOs([{
              id: matchedPo.id,
              po_number: matchedPo.po_number,
              supplier_id: matchedPo.supplier_id,
              supplier_name: matchedPo.supplier_name,
              destination_warehouse_id: matchedPo.destination_warehouse_id,
              is_final: false,
            }]);
          }
        }

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

        // Load items with potential warehouse_id
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
            warehouse_id: i.warehouse_id || reception.warehouse_id || '',
            purchase_order_id: reception.purchase_order_id || null,
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

    // Preload PO if query param exists
    if (poParam && !editId) {
      setForm(f => ({ ...f, purchase_order_id: poParam }));
      await handlePOChange(poParam, posList, distributorsRes.data || []);
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

    let receivedMap = {};
    if (po.status === 'partially_received') {
      const { data: pastReceptions } = await supabase
        .from('container_receptions')
        .select('id')
        .eq('purchase_order_id', poId)
        .eq('status', 'completed');
      if (pastReceptions?.length) {
        const receptionIds = pastReceptions.map(r => r.id);
        const { data: receivedItems } = await supabase
          .from('container_reception_items')
          .select('product_id, quantity')
          .in('reception_id', receptionIds);
        if (receivedItems) {
          for (const ri of receivedItems) {
            receivedMap[ri.product_id] = (receivedMap[ri.product_id] || 0) + Number(ri.quantity);
          }
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
  const handlePOChange = async (poId, posList = purchaseOrders, distList = distributors) => {
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
      if (matchDist) {
        setForm(f => ({ ...f, distributor_id: matchDist.id }));
      }
    }

    const sName = suppliers.find(s => s.id === po.supplier_id)?.short_name || 'Sin proveedor';
    const primaryLinked = {
      id: po.id,
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      supplier_name: sName,
      destination_warehouse_id: poWarehouse,
      is_final: false,
    };

    setLinkedPOs(prev => {
      const secondaries = prev.slice(1);
      return [primaryLinked, ...secondaries];
    });

    // Replace primary PO items, preserving secondary items
    setItems(prev => {
      const secondariesItems = prev.filter(i => i.purchase_order_id && i.purchase_order_id !== form.purchase_order_id);
      return [...poItems, ...secondariesItems];
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

    const sName = suppliers.find(s => s.id === po.supplier_id)?.short_name || 'Sin proveedor';
    const secondaryWarehouse = getWarehouseFromCode(po.destination_code, warehouses) || form.warehouse_id;
    const newPO = {
      id: po.id,
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      supplier_name: sName,
      destination_warehouse_id: secondaryWarehouse,
      is_final: false,
    };

    setLinkedPOs(prev => [...prev, newPO]);

    // Append items from secondary PO
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
    setLinkedPOs(prev =>
      prev.map(p => (p.id === poId ? { ...p, is_final: isFinal } : p))
    );
    if (linkedPOs.length === 1 && linkedPOs[0].id === poId) {
      setIsFinalReception(isFinal);
    }
  };

  const handleWarehouseChange = (whId) => {
    setForm(f => ({ ...f, warehouse_id: whId }));
    const matchDist = distributors.find(d => d.assigned_warehouse_id === whId);
    if (matchDist) {
      setForm(f => ({ ...f, distributor_id: matchDist.id }));
    } else {
      setForm(f => ({ ...f, distributor_id: '' }));
    }
  };

  const handleProductSearch = (q) => {
    setProductSearch(q);
    if (q.length >= 2) {
      const s = q.toLowerCase();
      const existingIds = items.map(i => i.product_id);
      setSearchResults(
        products.filter(p =>
          (p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)) &&
          !existingIds.includes(p.id)
        ).slice(0, 5)
      );
    } else {
      setSearchResults([]);
    }
  };

  const addProduct = (product) => {
    setItems(prev => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 0,
        warehouse_id: form.warehouse_id || '', // Defaults to header warehouse
        purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
        po_number: linkedPOs[0]?.po_number || null,
        unit_origin_cost: '',
        unit_pro_price: '',
      },
    ]);
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
  const handleReceptionScan = (scannedSku) => {
    const sku = scannedSku.trim().toUpperCase();
    const product = products.find(p => p.sku?.toUpperCase() === sku);

    if (!product) {
      setScanFeedback({ type: 'error', message: `Código "${sku}" no encontrado` });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    const existingIndex = items.findIndex(i => i.product_id === product.id);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: (Number(updatedItems[existingIndex].quantity) || 0) + 1,
      };
      setItems(updatedItems);
      setScanFeedback({
        type: 'success',
        message: `${sku} — ${product.name} (${updatedItems[existingIndex].quantity} pzas)`,
      });
    } else {
      setItems(prev => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          warehouse_id: form.warehouse_id || '',
          purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
          po_number: linkedPOs[0]?.po_number || null,
          unit_origin_cost: '',
          unit_pro_price: '',
        },
      ]);
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
          decodedText => {
            handleReceptionScan(decodedText);
          },
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
      if (now - lastScanKeystrokeRef.current > 300) {
        scanBarcodeBufferRef.current = '';
      }
      scanBarcodeBufferRef.current += e.key;
      lastScanKeystrokeRef.current = now;
    }
  };

  // Calculations (MXN)
  const tcGoods = Number(form.exchange_rate_goods) || 1;
  const tcFreight = Number(form.exchange_rate_freight) || 1;
  const totalOriginCostUSD = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_origin_cost) || 0), 0);
  }, [items]);
  const totalOriginCostMXN = totalOriginCostUSD * tcGoods;
  const freightMaritimeMXN = (Number(form.freight_maritime) || 0) * tcFreight;
  const totalAdditionalCosts = useMemo(() => {
    return (
      freightMaritimeMXN +
      (Number(form.freight_national) || 0) +
      (Number(form.import_taxes) || 0) +
      (Number(form.port_handling) || 0) +
      (Number(form.customs_broker) || 0) +
      (Number(form.other_costs) || 0)
    );
  }, [
    freightMaritimeMXN,
    form.freight_national,
    form.import_taxes,
    form.port_handling,
    form.customs_broker,
    form.other_costs,
  ]);
  const totalLandedCost = totalOriginCostMXN + totalAdditionalCosts;
  const totalQuantity = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  }, [items]);

  const getLandedPerUnit = (item) => {
    if (totalOriginCostMXN === 0 || !item.quantity) return 0;
    const itemOriginMXN = (Number(item.quantity) || 0) * (Number(item.unit_origin_cost) || 0) * tcGoods;
    const proportion = itemOriginMXN / totalOriginCostMXN;
    const additionalShare = totalAdditionalCosts * proportion;
    return (itemOriginMXN + additionalShare) / (Number(item.quantity) || 1);
  };

  const chargeAmount = useMemo(() => {
    return form.distributor_id
      ? items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_pro_price) || 0), 0)
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

  // Helper to compute unified destination string for transport
  const getUnifiedDestination = () => {
    const usedWarehouseIds = [
      ...new Set(items.map(i => i.warehouse_id || form.warehouse_id).filter(Boolean)),
    ];
    const warehouseNames = usedWarehouseIds
      .map(id => warehouses.find(w => w.id === id)?.name || '')
      .filter(Boolean);

    if (warehouseNames.length > 1) {
      return (
        warehouseNames
          .map(n => (n.toLowerCase().includes('bodega') ? n : `Bodega ${n}`))
          .join(' / ') + ' (Full)'
      );
    } else if (warehouseNames.length === 1) {
      const singleName = warehouseNames[0];
      return singleName.toLowerCase().includes('bodega') ? singleName : `Bodega ${singleName}`;
    }
    return suppliers.find(s => s.id === form.supplier_id)?.short_name || 'Puerto';
  };

  // Save changes on an ALREADY COMPLETED reception (Alain Ramos only)
  const handleSaveCompleted = async () => {
    setSaving(true);
    const formattedOp = cleanOperationNumber(form.operation_number);

    const payload = {
      container_label: form.container_label || null,
      pedimento_number: form.pedimento_number || null,
      operation_number: formattedOp || null,
      customs_broker_ref: form.customs_broker_ref || null,
      reception_date: form.reception_date,
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
      notes: form.notes || null,
    };

    const { error: recErr } = await supabase
      .from('container_receptions')
      .update(payload)
      .eq('id', editId);

    if (recErr) {
      alert('Error al actualizar la recepción: ' + recErr.message);
      setSaving(false);
      return;
    }

    for (const item of items) {
      const landedCost = getLandedPerUnit(item);
      await supabase
        .from('container_reception_items')
        .update({ unit_landed_cost: landedCost })
        .eq('reception_id', editId)
        .eq('product_id', item.product_id);
    }

    for (const item of items) {
      if (!item.product_id) continue;
      const { data: recItems } = await supabase
        .from('container_reception_items')
        .select('quantity, unit_landed_cost, reception:container_receptions!inner(status)')
        .eq('product_id', item.product_id)
        .eq('reception.status', 'completed');

      if (recItems && recItems.length > 0) {
        const totalQty = recItems.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
        const totalVal = recItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_landed_cost) || 0), 0);
        if (totalQty > 0) {
          const newAvg = Math.round((totalVal / totalQty) * 100) / 100;
          await supabase.from('products').update({ avg_cost: newAvg }).eq('id', item.product_id);
        }
      }
    }

    try {
      const freightAmount = Number(form.freight_national) || 0;
      const destLocation = getUnifiedDestination();

      const refParts = [];
      if (form.container_label) refParts.push(`Contenedor: ${form.container_label}`);
      if (form.pedimento_number) refParts.push(`Pedimento: ${form.pedimento_number}`);
      if (form.customs_broker_ref) refParts.push(`Ref. Aduanal: ${form.customs_broker_ref}`);
      if (formattedOp) refParts.push(`Operación: ${formattedOp}`);
      if (linkedPOs.length > 0) refParts.push(`POs: ${linkedPOs.map(p => p.po_number).join(' / ')}`);
      if (destLocation) refParts.push(`Destino: ${destLocation}`);

      const cleanDesc = `Flete contenedor ${form.container_label || ''} — ${formattedOp || ''}`.replace(/\s+/g, ' ').trim();
      const refString = refParts.join(' | ');

      let { data: existingSO } = await supabase
        .from('service_orders')
        .select('id')
        .eq('reception_id', editId)
        .maybeSingle();

      if (!existingSO && formattedOp) {
        const { data: matchedSO } = await supabase
          .from('service_orders')
          .select('id')
          .ilike('description', `%${formattedOp}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (matchedSO && matchedSO.length > 0) {
          existingSO = matchedSO[0];
        }
      }

      if (existingSO) {
        await supabase.from('service_orders').update({
          reception_id: editId,
          description: cleanDesc,
          location: destLocation,
          reference_info: refString,
          agreed_amount: freightAmount,
          scheduled_date: form.reception_date,
        }).eq('id', existingSO.id);
      } else {
        const { data: fleteSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .contains('service_types', ['flete'])
          .eq('is_active', true)
          .limit(1);

        if (fleteSuppliers && fleteSuppliers.length > 0) {
          await supabase.from('service_orders').insert({
            supplier_id: fleteSuppliers[0].id,
            service_type: 'flete',
            description: cleanDesc,
            location: destLocation,
            reference_info: refString,
            agreed_amount: freightAmount,
            status: 'completada',
            scheduled_date: form.reception_date,
            reception_id: editId,
          });
        }
      }
    } catch (soErr) {
      console.error('Error syncing service order:', soErr);
    }

    setSaving(false);
    alert('✅ Recepción actualizada exitosamente. Costos ponderados y orden de flete sincronizados.');
    router.push('/dashboard/recepciones');
  };

  // Save Draft
  const handleSave = async () => {
    if (!form.warehouse_id) {
      alert('Selecciona una bodega principal en el encabezado');
      return;
    }
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    setSaving(true);
    const formattedOp = cleanOperationNumber(form.operation_number);

    // Format notes to include multi-PO info if more than 1 PO
    let finalNotes = form.notes || '';
    if (linkedPOs.length > 1) {
      const poListTag = `[Full - POs vinculadas: ${linkedPOs.map(p => p.po_number).join(' / ')}]`;
      if (!finalNotes.includes(poListTag)) {
        finalNotes = finalNotes ? `${poListTag}\n${finalNotes}` : poListTag;
      }
    }

    const payload = {
      supplier_id: form.supplier_id || linkedPOs[0]?.supplier_id || null,
      purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
      warehouse_id: form.warehouse_id,
      distributor_id: form.distributor_id || null,
      reception_date: form.reception_date,
      container_label: form.container_label || null,
      pedimento_number: form.pedimento_number || null,
      operation_number: formattedOp || null,
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
      notes: finalNotes || null,
      status: 'draft',
      created_by: userId,
    };

    let id = receptionId;
    if (id) {
      const { error } = await supabase.from('container_receptions').update(payload).eq('id', id);
      if (error) {
        alert('Error: ' + error.message);
        setSaving(false);
        return;
      }
      await supabase.from('container_reception_items').delete().eq('reception_id', id);
    } else {
      const { data, error } = await supabase.from('container_receptions').insert(payload).select('id').single();
      if (error) {
        alert('Error: ' + error.message);
        setSaving(false);
        return;
      }
      id = data.id;
      setReceptionId(id);
    }

    const itemsPayload = items.map(i => ({
      reception_id: id,
      product_id: i.product_id,
      quantity: Number(i.quantity) || 0,
      unit_origin_cost: Number(i.unit_origin_cost) || 0,
      unit_landed_cost: getLandedPerUnit(i),
      unit_pro_price: form.distributor_id ? (Number(i.unit_pro_price) || null) : null,
      warehouse_id: i.warehouse_id || form.warehouse_id || null,
    }));

    let { error: itemsError } = await supabase.from('container_reception_items').insert(itemsPayload);
    if (itemsError && itemsError.code === 'PGRST204') {
      const fallbackPayload = itemsPayload.map(({ warehouse_id, ...rest }) => rest);
      const res = await supabase.from('container_reception_items').insert(fallbackPayload);
      itemsError = res.error;
    }

    if (itemsError) {
      alert('Error guardando items: ' + itemsError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    alert('Recepción guardada como borrador');
  };

  // Confirm Reception
  const handleConfirm = async () => {
    if (!form.warehouse_id) {
      alert('Selecciona una bodega principal en el encabezado');
      return;
    }
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    if (items.some(i => !i.quantity || Number(i.quantity) <= 0)) {
      alert('Todos los productos deben tener cantidad mayor a 0');
      return;
    }
    if (form.distributor_id && items.some(i => !i.unit_pro_price || Number(i.unit_pro_price) <= 0)) {
      alert('Todos los productos deben tener precio PRO asignado');
      return;
    }

    // Warehouse breakdown text for confirmation modal
    const whSummaryMap = {};
    items.forEach(i => {
      const wid = i.warehouse_id || form.warehouse_id;
      const wName = warehouses.find(w => w.id === wid)?.name || 'Bodega';
      whSummaryMap[wName] = (whSummaryMap[wName] || 0) + Number(i.quantity);
    });
    const whSummaryText = Object.entries(whSummaryMap)
      .map(([name, qty]) => `  • ${name}: ${qty} pzas`)
      .join('\n');

    // Multi-PO breakdown text
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
          : `• Ingreso a ${warehouses.find(w => w.id === form.warehouse_id)?.name}\n`) +
        poSummaryText +
        (form.distributor_id
          ? `• Se generará un cargo de $${chargeAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} al distribuidor PRO\n`
          : '') +
        `\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setConfirming(true);
    const formattedOp = cleanOperationNumber(form.operation_number);

    let finalNotes = form.notes || '';
    if (linkedPOs.length > 1) {
      const poListTag = `[Full - POs vinculadas: ${linkedPOs.map(p => p.po_number).join(' / ')}]`;
      if (!finalNotes.includes(poListTag)) {
        finalNotes = finalNotes ? `${poListTag}\n${finalNotes}` : poListTag;
      }
    }

    const payload = {
      supplier_id: form.supplier_id || linkedPOs[0]?.supplier_id || null,
      purchase_order_id: linkedPOs[0]?.id || form.purchase_order_id || null,
      warehouse_id: form.warehouse_id,
      distributor_id: form.distributor_id || null,
      reception_date: form.reception_date,
      container_label: form.container_label || null,
      pedimento_number: form.pedimento_number || null,
      operation_number: formattedOp || null,
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
      notes: finalNotes || null,
      status: 'completed',
      created_by: userId,
    };

    let id = receptionId;
    if (id) {
      const { error } = await supabase.from('container_receptions').update(payload).eq('id', id);
      if (error) {
        alert('Error: ' + error.message);
        setConfirming(false);
        return;
      }
      await supabase.from('container_reception_items').delete().eq('reception_id', id);
    } else {
      const { data, error } = await supabase.from('container_receptions').insert(payload).select('id').single();
      if (error) {
        alert('Error: ' + error.message);
        setConfirming(false);
        return;
      }
      id = data.id;
    }

    const itemsPayload = items.map(i => ({
      reception_id: id,
      product_id: i.product_id,
      quantity: Number(i.quantity) || 0,
      unit_origin_cost: Number(i.unit_origin_cost) || 0,
      unit_landed_cost: getLandedPerUnit(i),
      unit_pro_price: form.distributor_id ? (Number(i.unit_pro_price) || null) : null,
      warehouse_id: i.warehouse_id || form.warehouse_id || null,
    }));

    let { error: itemsError } = await supabase.from('container_reception_items').insert(itemsPayload);
    if (itemsError && itemsError.code === 'PGRST204') {
      const fallbackPayload = itemsPayload.map(({ warehouse_id, ...rest }) => rest);
      const res = await supabase.from('container_reception_items').insert(fallbackPayload);
      itemsError = res.error;
    }

    if (itemsError) {
      alert('Error items: ' + itemsError.message);
      setConfirming(false);
      return;
    }

    // 2. Adjust warehouse stock for each item routing to its SPECIFIC destination warehouse!
    const stockErrors = [];
    for (const item of items) {
      const targetWarehouse = item.warehouse_id || form.warehouse_id;
      const targetWarehouseName = warehouses.find(w => w.id === targetWarehouse)?.name || targetWarehouse;

      const { error } = await supabase.rpc('adjust_warehouse_stock', {
        p_product_id: item.product_id,
        p_warehouse_id: targetWarehouse,
        p_quantity_change: Number(item.quantity),
        p_reason: `Recepción contenedor: ${form.container_label || id} (${targetWarehouseName})`,
      });
      if (error) {
        stockErrors.push(`${item.sku} en ${targetWarehouseName}: ${error.message}`);
      }
    }

    // 2b. Update weighted average cost per product
    for (const item of items) {
      const landedCost = getLandedPerUnit(item);
      const qtyReceived = Number(item.quantity) || 0;
      if (landedCost <= 0 || qtyReceived <= 0) continue;

      const { data: stockRows } = await supabase
        .from('warehouse_stock')
        .select('stock_quantity')
        .eq('product_id', item.product_id);
      const totalStockNow = (stockRows || []).reduce((s, r) => s + (r.stock_quantity || 0), 0);

      const { data: prod } = await supabase
        .from('products')
        .select('avg_cost')
        .eq('id', item.product_id)
        .single();
      const oldAvg = Number(prod?.avg_cost) || 0;

      const stockBefore = totalStockNow - qtyReceived;
      let newAvg;
      if (stockBefore <= 0 || oldAvg <= 0) {
        newAvg = landedCost;
      } else {
        newAvg = ((stockBefore * oldAvg) + (qtyReceived * landedCost)) / totalStockNow;
      }

      await supabase
        .from('products')
        .update({ avg_cost: Math.round(newAvg * 100) / 100 })
        .eq('id', item.product_id);
    }

    // 3. Resolve Transits and update status for ALL linked POs
    const activePOs = linkedPOs.length > 0
      ? linkedPOs
      : form.purchase_order_id
      ? [{ id: form.purchase_order_id, is_final: isFinalReception }]
      : [];

    for (const lpo of activePOs) {
      const poIsFinal = lpo.is_final;
      if (poIsFinal) {
        await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', lpo.id);
      } else {
        await supabase.from('purchase_orders').update({ status: 'partially_received' }).eq('id', lpo.id);
      }

      // Filter items belonging to this PO (or all items if items don't have purchase_order_id)
      const poItems = items.filter(i => !i.purchase_order_id || i.purchase_order_id === lpo.id);

      for (const item of poItems) {
        const qtyReceived = Number(item.quantity) || 0;
        if (qtyReceived <= 0) continue;
        const targetWarehouse = item.warehouse_id || form.warehouse_id;

        // Try exact warehouse first
        let { data: transits } = await supabase
          .from('transit_shipments')
          .select('id, quantity')
          .eq('purchase_order_id', lpo.id)
          .eq('product_id', item.product_id)
          .eq('warehouse_id', targetWarehouse)
          .eq('status', 'in_transit')
          .order('created_at', { ascending: true });

        // Fallback to header warehouse
        if (!transits || transits.length === 0) {
          const { data: headerTransits } = await supabase
            .from('transit_shipments')
            .select('id, quantity')
            .eq('purchase_order_id', lpo.id)
            .eq('product_id', item.product_id)
            .eq('warehouse_id', form.warehouse_id)
            .eq('status', 'in_transit')
            .order('created_at', { ascending: true });
          transits = headerTransits;
        }

        // Fallback to any warehouse for this PO
        if (!transits || transits.length === 0) {
          const { data: poTransits } = await supabase
            .from('transit_shipments')
            .select('id, quantity')
            .eq('purchase_order_id', lpo.id)
            .eq('product_id', item.product_id)
            .eq('status', 'in_transit')
            .order('created_at', { ascending: true });
          transits = poTransits;
        }

        if (!transits || transits.length === 0) continue;

        let remaining = qtyReceived;
        for (const t of transits) {
          if (remaining <= 0) break;
          if (remaining >= t.quantity) {
            await supabase.from('transit_shipments').delete().eq('id', t.id);
            remaining -= t.quantity;
          } else {
            await supabase
              .from('transit_shipments')
              .update({ quantity: t.quantity - remaining })
              .eq('id', t.id);
            remaining = 0;
          }
        }
      }

      if (poIsFinal) {
        await supabase.from('transit_shipments').delete().eq('purchase_order_id', lpo.id);
      }
    }

    // 4. Create unified freight service order in service_orders
    try {
      const { data: fleteSuppliers } = await supabase
        .from('suppliers')
        .select('id')
        .contains('service_types', ['flete'])
        .eq('is_active', true)
        .limit(1);

      if (fleteSuppliers && fleteSuppliers.length > 0) {
        const freightAmount = Number(form.freight_national) || 0;
        const destLocation = getUnifiedDestination();

        const refParts = [];
        if (form.container_label) refParts.push(`Contenedor: ${form.container_label}`);
        if (form.pedimento_number) refParts.push(`Pedimento: ${form.pedimento_number}`);
        if (form.customs_broker_ref) refParts.push(`Ref. Aduanal: ${form.customs_broker_ref}`);
        if (formattedOp) refParts.push(`Operación: ${formattedOp}`);
        if (activePOs.length > 0) refParts.push(`POs: ${activePOs.map(p => p.po_number || p.id).join(' / ')}`);
        if (destLocation) refParts.push(`Destino: ${destLocation}`);

        await supabase.from('service_orders').insert({
          supplier_id: fleteSuppliers[0].id,
          service_type: 'flete',
          description: `Flete contenedor ${form.container_label || ''} — ${formattedOp || ''}`.replace(/\s+/g, ' ').trim(),
          location: destLocation,
          reference_info: refParts.join(' | '),
          agreed_amount: freightAmount,
          status: 'completada',
          scheduled_date: form.reception_date,
          reception_id: id,
        });
      }
    } catch (soErr) {
      console.error('Error creating service order:', soErr);
    }

    if (stockErrors.length) {
      alert(`Recepción confirmada con algunos errores de stock:\n${stockErrors.join('\n')}`);
    } else {
      alert('✅ Recepción confirmada exitosamente');
    }

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
