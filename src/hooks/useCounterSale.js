import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sanitizeText } from '@/utils/sanitize';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

export function useCounterSale() {
  const supabase = createClient();
  const router = useRouter();

  // Auth & profile
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [actualRole, setActualRole] = useState('');
  const [subRole, setSubRole] = useState('');

  // Data
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});

  // Pinned / Favorite Products for Quick Catalog
  const [pinnedProductIds, setPinnedProductIds] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pos_pinned_product_ids');
        return saved ? JSON.parse(saved) : [];
      } catch (_) { return []; }
    }
    return [];
  });

  const togglePinProduct = (productId) => {
    setPinnedProductIds(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      try { localStorage.setItem('pos_pinned_product_ids', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
  };

  // Active Tab: 'nueva' | 'historial' | 'estadisticas'
  const [activeTab, setActiveTab] = useState('nueva');

  // Form State
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialSearch, setHistorialSearch] = useState('');
  const [expandedSale, setExpandedSale] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Returns State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleToReturn, setSelectedSaleToReturn] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [signerAuthInput, setSignerAuthInput] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnSuccessData, setReturnSuccessData] = useState(null);

  // Seller PIN identification state
  const [activeSeller, setActiveSeller] = useState(null);
  const [showSellerPinModal, setShowSellerPinModal] = useState(false);
  const [sellerPinInput, setSellerPinInput] = useState('');
  const [sellerModalError, setSellerModalError] = useState('');
  const [rememberSeller, setRememberSeller] = useState(false);
  const [verifyingSeller, setVerifyingSeller] = useState(false);
  const [pendingSaleAction, setPendingSaleAction] = useState(false);

  // Refs
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const receiptRef = useRef(null);

  // Barcode scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const html5QrCodeRef = useRef(null);
  const scannerStoppingRef = useRef(false);
  const lastKeystrokeRef = useRef(0);
  const barcodeBufferRef = useRef('');
  const autoAddTimerRef = useRef(null);
  const scanTimerRef = useRef(null);

  // ──────────── INIT ────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, sub_role, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setActualRole(profile.role || '');
        setSubRole(profile.sub_role || '');
      }

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setUserId(user.id);
      setUserName(profile.full_name || user.email || 'Admin');

      // Fetch warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setWarehouses(whData || []);
      if (whData?.length > 0) {
        const vitoAlessio = whData.find(w => w.name.toLowerCase().includes('vito'));
        setSelectedWarehouse(vitoAlessio ? vitoAlessio.id : whData[0].id);
      }

      // Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('id, sku, name, price, image_url, is_active')
        .eq('is_active', true)
        .order('sku');
      setProducts(prodData || []);

      // Fetch warehouse stock
      const { data: wsData } = await supabase.from('warehouse_stock').select('*');
      if (wsData) {
        const stockMap = {};
        wsData.forEach(ws => {
          if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
          stockMap[ws.product_id][ws.warehouse_id] = ws;
        });
        setWarehouseStock(stockMap);
      }

      setLoading(false);
    };
    init();
  }, []);

  // ──────────── HELPERS ────────────
  const getAvailableStock = useCallback((productId, warehouseId) => {
    if (!productId || !warehouseId) return 99999;
    const ws = warehouseStock[productId]?.[warehouseId];
    if (!ws) return 99999;
    return Math.max((ws.stock_quantity || 0) - (ws.reserved_quantity || 0), 0);
  }, [warehouseStock]);

  const saleTotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // ──────────── ADD PRODUCT TO SALE ────────────
  const addProductToSale = useCallback((product) => {
    setSaleItems(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        const available = getAvailableStock(product.id, selectedWarehouse);
        if (existing.quantity >= available) {
          alert(`Stock máximo disponible: ${available}`);
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        image_url: product.image_url,
        unit_price: Number(product.price) || 0,
        quantity: 1,
      }];
    });
    setSearchTerm('');
    setShowSearchDropdown(false);
    searchInputRef.current?.focus();
  }, [getAvailableStock, selectedWarehouse]);

  // ──────────── PRODUCT SEARCH & AUTO-ADD ────────────
  useEffect(() => {
    if (autoAddTimerRef.current) { clearTimeout(autoAddTimerRef.current); autoAddTimerRef.current = null; }

    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const term = searchTerm.toLowerCase();
    const results = products.filter(p =>
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.name && p.name.toLowerCase().includes(term))
    ).slice(0, 10);
    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);

    const exactMatch = products.find(
      p => p.sku && p.sku.toLowerCase() === term
    );
    if (exactMatch) {
      autoAddTimerRef.current = setTimeout(() => {
        addProductToSale(exactMatch);
        setScanFeedback(`✓ ${exactMatch.sku} — ${exactMatch.name}`);
        setTimeout(() => setScanFeedback(''), 2000);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }, 400);
    }
  }, [searchTerm, products, addProductToSale]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ──────────── BARCODE SCANNER ────────────
  const stopScanner = useCallback(async () => {
    if (scannerStoppingRef.current) return;
    scannerStoppingRef.current = true;
    try {
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        const state = scanner.getState();
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch (_) { /* ignore cleanup errors */ }
    html5QrCodeRef.current = null;
    scannerStoppingRef.current = false;
  }, []);

  const handleBarcodeScanned = useCallback((decodedText) => {
    const sku = decodedText.trim();
    const product = products.find(
      p => p.sku && p.sku.toLowerCase() === sku.toLowerCase()
    );
    if (product) {
      addProductToSale(product);
      setScanFeedback(`${product.sku} — ${product.name} agregada`);
      setTimeout(() => setScanFeedback(''), 2500);
    } else {
      setScanFeedback(`⚠ Código "${sku}" no encontrado`);
      setTimeout(() => setScanFeedback(''), 2500);
    }
  }, [products, addProductToSale]);

  const openScanner = useCallback(async () => {
    setShowScanner(true);
    await new Promise(r => setTimeout(r, 350));
    try {
      const html5QrCode = new Html5Qrcode('barcode-reader');
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          stopScanner().then(() => {
            setShowScanner(false);
            handleBarcodeScanned(decodedText);
          });
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera error:', err);
      setScanFeedback('⚠ No se pudo acceder a la cámara');
      setTimeout(() => setScanFeedback(''), 2500);
      setShowScanner(false);
    }
  }, [stopScanner, handleBarcodeScanned]);

  const closeScanner = useCallback(() => {
    stopScanner().then(() => setShowScanner(false));
  }, [stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // ──────────── USB/BLUETOOTH BARCODE SCANNER ────────────
  const handleSearchKeyDown = useCallback((e) => {
    const now = Date.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
      const timeSinceLast = now - lastKeystrokeRef.current;
      const buffer = barcodeBufferRef.current;
      if (buffer.length >= 2 && timeSinceLast < 150) {
        handleBarcodeScanned(buffer);
        setSearchTerm('');
      } else if (searchTerm.trim().length >= 2) {
        const term = searchTerm.trim().toLowerCase();
        const match = products.find(
          p => (p.sku && p.sku.toLowerCase() === term) ||
               (p.name && p.name.toLowerCase() === term)
        );
        if (match) {
          addProductToSale(match);
        }
      }
      barcodeBufferRef.current = '';
      return;
    }

    if (e.key.length === 1) {
      const timeSinceLast = now - lastKeystrokeRef.current;
      if (timeSinceLast > 300) {
        barcodeBufferRef.current = '';
      }
      barcodeBufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        const buf = barcodeBufferRef.current;
        if (buf.length >= 2) {
          const product = products.find(
            p => p.sku && p.sku.toLowerCase() === buf.toLowerCase()
          );
          if (product) {
            addProductToSale(product);
            setScanFeedback(`✓ ${product.sku} — ${product.name} agregada`);
            setTimeout(() => setScanFeedback(''), 2500);
            setSearchTerm('');
          }
        }
        barcodeBufferRef.current = '';
      }, 300);
    }
  }, [products, searchTerm, handleBarcodeScanned, addProductToSale]);

  // ──────────── UPDATE / REMOVE ITEM ────────────
  const updateItemQuantity = (productId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;
    const available = getAvailableStock(productId, selectedWarehouse);
    if (qty > available) {
      alert(`Stock máximo disponible: ${available}`);
      return;
    }
    setSaleItems(prev =>
      prev.map(item =>
        item.product_id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const updateItemPrice = (productId, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    const rounded = Math.round(price * 100) / 100;
    setSaleItems(prev =>
      prev.map(item =>
        item.product_id === productId ? { ...item, unit_price: rounded } : item
      )
    );
  };

  const removeItem = (productId) => {
    setSaleItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const resetSale = () => {
    setSaleItems([]);
    setCustomerName('');
    setPaymentMethod('');
    setAmountReceived('');
    setNotes('');
    setSearchTerm('');
    setShowReceipt(false);
    setReceiptData(null);
  };

  // ──────────── GENERATE SALE NUMBER ────────────
  const generateSaleNumber = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `VMP-${yy}${mm}${dd}`;

    const { data } = await supabase
      .from('counter_sales')
      .select('sale_number')
      .like('sale_number', `${prefix}-%`)
      .order('sale_number', { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const lastSeq = parseInt(data[0].sale_number.split('-').pop()) || 0;
      seq = lastSeq + 1;
    }
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  };

  const shortName = (name) => {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/);
    return parts.length > 2 ? parts.slice(0, -1).join(' ') : name;
  };

  // ──────────── SUBMIT & EXECUTE SALE ────────────
  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      alert('Agrega al menos un producto a la venta.');
      return;
    }
    if (!selectedWarehouse) {
      alert('Selecciona una bodega.');
      return;
    }
    if (!paymentMethod) {
      alert('Selecciona el método de pago (Efectivo o Transferencia).');
      return;
    }
    if (paymentMethod === 'Efectivo') {
      if (!amountReceived) {
        alert('Ingresa el monto recibido del cliente.');
        return;
      }
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < saleTotal) {
        alert(`El monto recibido ($${amountReceived}) debe ser mayor o igual al total ($${saleTotal.toFixed(2)}).`);
        return;
      }
    }

    for (const item of saleItems) {
      if (item.quantity < 1) {
        alert(`Cantidad inválida para ${item.name}`);
        return;
      }
      if (item.unit_price <= 0) {
        alert(`Precio inválido para ${item.name}`);
        return;
      }
      const available = getAvailableStock(item.product_id, selectedWarehouse);
      if (item.quantity > available) {
        alert(`Stock insuficiente para ${item.name}. Disponible: ${available}, Solicitado: ${item.quantity}`);
        return;
      }
    }

    if (activeSeller) {
      await executeSale(activeSeller);
    } else {
      setSellerPinInput('');
      setSellerModalError('');
      setPendingSaleAction(true);
      setShowSellerPinModal(true);
    }
  };

  const verifySellerPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanInput = sellerPinInput.trim();
    if (!cleanInput) {
      setSellerModalError('Ingresa un PIN o escanea tu credencial.');
      return;
    }

    setVerifyingSeller(true);
    setSellerModalError('');

    try {
      const { data: matchedProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .or(`authorization_pin.eq.${cleanInput},employee_barcode.eq.${cleanInput}`);

      if (error || !matchedProfiles || matchedProfiles.length === 0) {
        setSellerModalError('PIN o Código de Barras no reconocido.');
        setVerifyingSeller(false);
        return;
      }

      const foundSeller = {
        id: matchedProfiles[0].id,
        name: matchedProfiles[0].full_name || 'Vendedor'
      };

      if (rememberSeller) {
        setActiveSeller(foundSeller);
      } else {
        setActiveSeller(null);
      }

      setShowSellerPinModal(false);
      setSellerPinInput('');
      setVerifyingSeller(false);

      if (pendingSaleAction) {
        setPendingSaleAction(false);
        await executeSale(foundSeller);
      }
    } catch (err) {
      setSellerModalError('Error de verificación: ' + (err.message || err));
      setVerifyingSeller(false);
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setSellerPinInput('');
    } else if (val === 'DEL') {
      setSellerPinInput(prev => prev.slice(0, -1));
    } else {
      if (sellerPinInput.length < 10) {
        setSellerPinInput(prev => prev + val);
      }
    }
  };

  const executeSale = async (sellerObj) => {
    setSubmitting(true);

    try {
      const saleNumber = await generateSaleNumber();
      const customerFinal = sanitizeText(customerName, 200) || 'Público General';
      const notesFinal = sanitizeText(notes, 500);

      const itemsJson = saleItems.map(item => ({
        product_id: item.product_id,
        sku: item.sku || '',
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: Math.round(item.quantity * item.unit_price * 100) / 100,
      }));

      const subtotal = Math.round(saleTotal * 100) / 100;
      const sellerId = sellerObj?.id || userId;
      const sellerName = sellerObj?.name || userName;

      const { data: saleRecord, error: insertError } = await supabase
        .from('counter_sales')
        .insert({
          sale_number: saleNumber,
          warehouse_id: selectedWarehouse,
          sold_by: sellerId,
          customer_name: customerFinal,
          payment_method: paymentMethod,
          subtotal: subtotal,
          total: subtotal,
          amount_received: paymentMethod === 'Efectivo' && amountReceived ? parseFloat(amountReceived) : null,
          notes: notesFinal || null,
          items: itemsJson,
          status: 'completed',
        })
        .select()
        .single();

      if (insertError) {
        alert('Error al registrar la venta: ' + insertError.message);
        setSubmitting(false);
        return;
      }

      for (const item of saleItems) {
        const { error } = await supabase.rpc('adjust_warehouse_stock', {
          p_product_id: item.product_id,
          p_warehouse_id: selectedWarehouse,
          p_quantity_change: -item.quantity,
          p_reason: `Venta en mostrador ${saleNumber}`
        });
        if (error) {
          console.error(`Error al descontar stock de ${item.name}: ${error.message}`);
        }
      }

      const { data: wsData } = await supabase.from('warehouse_stock').select('*');
      if (wsData) {
        const stockMap = {};
        wsData.forEach(ws => {
          if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
          stockMap[ws.product_id][ws.warehouse_id] = ws;
        });
        setWarehouseStock(stockMap);
      }

      if (paymentMethod === 'Efectivo') {
        const { error: cashErr } = await supabase.from('cash_movements').insert({
          type: 'entry',
          amount: subtotal,
          concept: `Venta mostrador #${saleNumber}`,
          responsible: sellerName,
          reference_type: 'counter_sale',
          movement_date: new Date().toLocaleDateString('en-CA'),
          created_by: sellerId,
          approval_status: 'approved'
        });
        if (cashErr) console.error('Error insertando en caja:', cashErr);
      }

      const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name || '';
      const receivedNum = paymentMethod === 'Efectivo' && amountReceived ? parseFloat(amountReceived) : subtotal;
      setReceiptData({
        sale_number: saleNumber,
        created_at: saleRecord.created_at || new Date().toISOString(),
        customer_name: customerFinal,
        payment_method: paymentMethod,
        items: itemsJson,
        total: subtotal,
        amount_received: receivedNum,
        change: Math.round((receivedNum - subtotal) * 100) / 100,
        sold_by_name: sellerName,
        warehouse_name: warehouseName,
        notes: notesFinal,
        items_count: itemsJson.reduce((s, i) => s + i.quantity, 0),
      });
      setShowReceipt(true);

      if (!rememberSeller) {
        setActiveSeller(null);
      }
    } catch (err) {
      alert('Error inesperado: ' + (err.message || err));
    }

    setSubmitting(false);
  };

  // ──────────── RE-PRINT TICKET FOR HISTORICAL SALE ────────────
  const handlePrintReceiptForSale = (sale) => {
    if (!sale) return;
    const warehouseName = sale.warehouse?.name || warehouses.find(w => w.id === sale.warehouse_id)?.name || 'Bodega Vito Alessio';
    const sellerName = sale.seller?.full_name || 'Admin';
    const itemsJson = sale.items || [];
    const subtotal = Number(sale.total || sale.subtotal || 0);
    const receivedNum = Number(sale.amount_received || subtotal);

    setReceiptData({
      sale_number: sale.sale_number,
      created_at: sale.created_at,
      customer_name: sale.customer_name || 'Público General',
      payment_method: sale.payment_method,
      items: itemsJson,
      total: subtotal,
      amount_received: receivedNum,
      change: Math.max(Math.round((receivedNum - subtotal) * 100) / 100, 0),
      sold_by_name: sellerName,
      warehouse_name: warehouseName,
      notes: sale.notes || '',
      items_count: itemsJson.reduce((s, i) => s + (i.quantity || 1), 0),
    });
    setShowReceipt(true);
  };

  // ──────────── SALES HISTORY ────────────
  const HIST_PAGE_SIZE = 100;

  const fetchHistorial = async (loadMore = false) => {
    if (loadMore) setLoadingMore(true); else setHistorialLoading(true);
    const offset = loadMore ? salesHistory.length : 0;
    const { data, error } = await supabase
      .from('counter_sales')
      .select('*, seller:profiles!counter_sales_sold_by_fkey(full_name), approver:profiles!counter_sales_approved_by_fkey(full_name), warehouse:warehouses!counter_sales_warehouse_id_fkey(name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + HIST_PAGE_SIZE - 1);

    if (!error && data) {
      if (loadMore) {
        setSalesHistory(prev => [...prev, ...data]);
      } else {
        setSalesHistory(data);
      }
      setHasMoreHistory(data.length === HIST_PAGE_SIZE);
    }
    setHistorialLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial();
    }
  }, [activeTab]);

  // ──────────── PROCESS RETURN ────────────
  const handleOpenReturnModal = (sale) => {
    setSelectedSaleToReturn(sale);
    setReturnReason('');
    setSignerAuthInput('');
    setShowReturnModal(true);
  };

  const handleProcessReturn = async () => {
    if (!selectedSaleToReturn) return;
    const reason = returnReason.trim();
    if (!reason) {
      alert('Por favor especifica un motivo obligatorio para la devolución.');
      return;
    }

    setProcessingReturn(true);
    try {
      const authInput = signerAuthInput.trim();
      let approverId = null;
      let approverName = userName;

      const isAdmin = actualRole === 'admin' || subRole === 'super_admin';

      if (authInput) {
        const { data: matchedSigners } = await supabase
          .from('profiles')
          .select('id, full_name, role, sub_role')
          .or(`authorization_pin.eq.${authInput},employee_barcode.eq.${authInput}`);

        if (matchedSigners && matchedSigners.length > 0) {
          approverId = matchedSigners[0].id;
          approverName = matchedSigners[0].full_name;
        } else if (isAdmin) {
          approverId = userId;
        } else {
          alert('Código de autorización / PIN / Credencial de Signer no válido.');
          setProcessingReturn(false);
          return;
        }
      } else if (isAdmin) {
        approverId = userId;
      } else {
        alert('Se requiere el PIN de Autorización o Escaneo de Credencial de un Signer/Admin.');
        setProcessingReturn(false);
        return;
      }

      const items = selectedSaleToReturn.items || [];
      for (const item of items) {
        let pid = item.product_id || item.id;
        if (!pid && item.sku) {
          const found = products.find(p => p.sku && p.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
          if (found) pid = found.id;
        }
        if (!pid && item.name) {
          const found = products.find(p => p.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim());
          if (found) pid = found.id;
        }
        if (pid && selectedSaleToReturn.warehouse_id) {
          await supabase.rpc('adjust_warehouse_stock', {
            p_product_id: pid,
            p_warehouse_id: selectedSaleToReturn.warehouse_id,
            p_quantity_change: item.quantity,
            p_reason: `ENTRADA_DEVOLUCION — Venta Mostrador #${selectedSaleToReturn.sale_number} — Motivo: ${reason}`,
            p_user_id: userId
          });
        }
      }

      if (selectedSaleToReturn.payment_method === 'Efectivo') {
        const { error: cashErr } = await supabase.from('cash_movements').insert({
          type: 'exit',
          amount: Number(selectedSaleToReturn.total),
          concept: `Egreso por Devolución Venta Mostrador #${selectedSaleToReturn.sale_number}`,
          responsible: approverName || userName,
          reference_type: 'counter_sale',
          notes: `Motivo devolución: ${reason}`,
          movement_date: new Date().toLocaleDateString('en-CA'),
          created_by: userId,
          approval_status: 'approved'
        });
        if (cashErr) console.error('Error insertando egreso en caja:', cashErr);
      }

      const { error: updateErr } = await supabase
        .from('counter_sales')
        .update({
          status: 'cancelled',
          cancel_reason: reason,
          cancelled_by: userId,
          approved_by: approverId,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', selectedSaleToReturn.id);

      if (updateErr) throw updateErr;

      try {
        const whName = selectedSaleToReturn.warehouse?.name || 'Bodega Vito Alessio';
        for (const item of (selectedSaleToReturn.items || [])) {
          let pid = item.product_id || item.id;
          if (!pid && item.sku) {
            const found = products.find(p => p.sku && p.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
            if (found) pid = found.id;
          }
          await supabase.from('audit_log').insert({
            user_id: userId,
            action: 'stock_increase',
            entity_type: 'counter_sale_return',
            entity_id: pid || selectedSaleToReturn.id,
            details: {
              sku: item.sku || '',
              warehouse: whName,
              change: item.quantity,
              reason: `ENTRADA_DEVOLUCION — Venta Mostrador #${selectedSaleToReturn.sale_number} — Motivo: ${reason}`,
              approved_by: approverName || userName,
            }
          });
        }
      } catch (auditErr) {
        console.error('Error logging to audit_log:', auditErr);
      }

      await fetchHistorial();
      const { data: wsData } = await supabase.from('warehouse_stock').select('*');
      if (wsData) {
        const stockMap = {};
        wsData.forEach(ws => {
          if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
          stockMap[ws.product_id][ws.warehouse_id] = ws;
        });
        setWarehouseStock(stockMap);
      }

      setReturnSuccessData(selectedSaleToReturn);
      setShowReturnModal(false);
    } catch (err) {
      alert('Error al procesar la devolución: ' + (err.message || err));
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleLoadReturnedItemsToCart = async (sale) => {
    if (!sale || !sale.items) return;

    const { data: wsData } = await supabase.from('warehouse_stock').select('*');
    if (wsData) {
      const stockMap = {};
      wsData.forEach(ws => {
        if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
        stockMap[ws.product_id][ws.warehouse_id] = ws;
      });
      setWarehouseStock(stockMap);
    }

    const newItems = sale.items.map(item => {
      let pid = item.product_id || item.id;
      let prod = products.find(p => 
        (pid && p.id === pid) || 
        (item.sku && p.sku && p.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()) ||
        (item.name && p.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim()) ||
        (item.name && p.name && (p.name.toLowerCase().includes(item.name.toLowerCase().trim()) || item.name.toLowerCase().includes(p.name.toLowerCase().trim())))
      );
      return {
        product_id: pid || prod?.id,
        sku: item.sku || prod?.sku || '',
        name: item.name || prod?.name || '',
        image_url: item.image_url || prod?.image_url,
        unit_price: Number(item.unit_price || prod?.price || 0),
        quantity: Number(item.quantity || 1),
        subtotal: Number(item.subtotal || item.unit_price * item.quantity || 0),
      };
    });

    setSaleItems(newItems);
    if (sale.warehouse_id) setSelectedWarehouse(sale.warehouse_id);
    setActiveTab('nueva');
    setReturnSuccessData(null);
    setScanFeedback('🛒 Productos cargados al carrito para corregir');
  };

  const handlePrint = () => {
    const receipt = document.getElementById('receipt-print-area');
    if (!receipt) return;

    const clone = receipt.cloneNode(true);
    clone.id = 'receipt-print-clone';
    document.body.appendChild(clone);

    const style = document.createElement('style');
    style.id = 'receipt-print-style';
    style.innerHTML = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          color: #000 !important;
          width: 80mm !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#receipt-print-clone) { display: none !important; }
        #receipt-print-clone {
          display: block !important;
          position: relative !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 4px !important;
          background: #fff !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        #receipt-print-clone * {
          overflow: visible !important;
          max-height: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();

    setTimeout(() => {
      document.body.removeChild(clone);
      document.head.removeChild(style);
    }, 1000);
  };

  return {
    supabase, loading, userId, userName, actualRole, subRole,
    warehouses, products, warehouseStock, getAvailableStock,
    pinnedProductIds, togglePinProduct,
    activeTab, setActiveTab,
    selectedWarehouse, setSelectedWarehouse,
    searchTerm, setSearchTerm, searchResults, showSearchDropdown, setShowSearchDropdown,
    saleItems, setSaleItems, addProductToSale, updateItemQuantity, updateItemPrice, removeItem, resetSale,
    customerName, setCustomerName, paymentMethod, setPaymentMethod, amountReceived, setAmountReceived, notes, setNotes,
    submitting, saleTotal, handleSubmitSale,
    showReceipt, setShowReceipt, receiptData, handlePrint, handlePrintReceiptForSale,
    salesHistory, historialLoading, historialSearch, setHistorialSearch, expandedSale, setExpandedSale, fetchHistorial,
    hasMoreHistory, loadingMore,
    showReturnModal, setShowReturnModal, selectedSaleToReturn, returnReason, setReturnReason, signerAuthInput, setSignerAuthInput,
    processingReturn, handleOpenReturnModal, handleProcessReturn, returnSuccessData, setReturnSuccessData, handleLoadReturnedItemsToCart,
    activeSeller, setActiveSeller, showSellerPinModal, setShowSellerPinModal, sellerPinInput, setSellerPinInput,
    sellerModalError, rememberSeller, setRememberSeller, verifyingSeller, verifySellerPin, handleKeypadPress,
    showScanner, setShowScanner, scanFeedback, openScanner, closeScanner,
    searchRef, searchInputRef, receiptRef, handleSearchKeyDown, shortName
  };
}
