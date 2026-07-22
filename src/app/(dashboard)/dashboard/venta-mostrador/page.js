'use client';
import { createClient } from '@/utils/supabase/client';
import { sanitizeText } from '@/utils/sanitize';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, Package, Loader2,
  ShoppingCart, Receipt, Calendar, User, Warehouse, CreditCard, X, Check,
  ChevronDown, RotateCcw, Clock, ChevronUp, Hash, Camera
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function VentaMostradorPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth & profile
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');

  // Data
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});

  // Tabs
  const [activeTab, setActiveTab] = useState('nueva');

  // Nueva Venta state
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

  // Receipt view
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Historial state
  const [salesHistory, setSalesHistory] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialSearch, setHistorialSearch] = useState('');
  const [expandedSale, setExpandedSale] = useState(null);

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

  // ──────────── INIT ────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

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
    const ws = warehouseStock[productId]?.[warehouseId];
    if (!ws) return 0;
    return Math.max((ws.stock_quantity || 0) - (ws.reserved_quantity || 0), 0);
  }, [warehouseStock]);

  const saleTotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // ──────────── PRODUCT SEARCH + AUTO-SCAN DETECTION ────────────
  const autoAddTimerRef = useRef(null);

  useEffect(() => {
    // Clear any pending auto-add timer
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

    // Auto-add: if searchTerm matches a product SKU exactly, auto-add after 400ms
    const exactMatch = products.find(
      p => p.sku && p.sku.toLowerCase() === term
    );
    if (exactMatch) {
      autoAddTimerRef.current = setTimeout(() => {
        addProductToSale(exactMatch);
        setScanFeedback(`✓ ${exactMatch.sku} — ${exactMatch.name}`);
        setTimeout(() => setScanFeedback(''), 2000);
        // Refocus input for next scan
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }, 400);
    }
  }, [searchTerm, products]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ──────────── ADD PRODUCT TO SALE ────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ──────────── BARCODE SCANNER ────────────
  const stopScanner = useCallback(async () => {
    if (scannerStoppingRef.current) return;
    scannerStoppingRef.current = true;
    try {
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        const state = scanner.getState();
        // 2 = SCANNING, 3 = PAUSED
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
    // Wait for DOM element to mount
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
        () => {} // ignore per-frame errors
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

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // ──────────── USB/BLUETOOTH BARCODE SCANNER (keystroke detection) ────────────
  const scanTimerRef = useRef(null);

  const handleSearchKeyDown = useCallback((e) => {
    const now = Date.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      // Clear any pending auto-scan timer
      if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
      const timeSinceLast = now - lastKeystrokeRef.current;
      const buffer = barcodeBufferRef.current;
      // If characters were typed rapidly (< 100ms between keystrokes on average) and we have content
      if (buffer.length >= 2 && timeSinceLast < 150) {
        handleBarcodeScanned(buffer);
        setSearchTerm('');
      } else if (searchTerm.trim().length >= 2) {
        // Normal Enter: try to add the first matching product
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
    // Track rapid keystrokes for barcode scanner detection
    if (e.key.length === 1) {
      const timeSinceLast = now - lastKeystrokeRef.current;
      if (timeSinceLast > 300) {
        barcodeBufferRef.current = ''; // reset if too slow (human typing)
      }
      barcodeBufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      // Auto-add after rapid input stops (for scanners that don't send Enter)
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

  // ──────────── UPDATE ITEM QUANTITY ────────────
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

  // ──────────── UPDATE ITEM PRICE ────────────
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

  // ──────────── REMOVE ITEM ────────────
  const removeItem = (productId) => {
    setSaleItems(prev => prev.filter(item => item.product_id !== productId));
  };

  // ──────────── RESET FORM ────────────
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

    // Find the highest existing sale_number for today to avoid collisions from deleted records
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

  // ──────────── SUBMIT SALE ────────────
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
    if (paymentMethod === 'Efectivo' && amountReceived) {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < saleTotal) {
        alert(`El monto recibido ($${amountReceived}) debe ser mayor o igual al total ($${saleTotal.toFixed(2)}).`);
        return;
      }
    }

    // Validate all items
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

    setSubmitting(true);

    try {
      const saleNumber = await generateSaleNumber();
      const customerFinal = sanitizeText(customerName, 200) || 'Público General';
      const notesFinal = sanitizeText(notes, 500);

      // Build items JSON
      const itemsJson = saleItems.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: Math.round(item.quantity * item.unit_price * 100) / 100,
      }));

      const subtotal = Math.round(saleTotal * 100) / 100;

      // FIRST: Insert counter_sales record (if this fails, stock is untouched)
      const { data: saleRecord, error: insertError } = await supabase
        .from('counter_sales')
        .insert({
          sale_number: saleNumber,
          warehouse_id: selectedWarehouse,
          sold_by: userId,
          customer_name: customerFinal,
          payment_method: paymentMethod,
          subtotal: subtotal,
          total: subtotal,
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

      // THEN: Deduct stock for each item (sale is already saved)
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

      // Refresh warehouse stock
      const { data: wsData } = await supabase.from('warehouse_stock').select('*');
      if (wsData) {
        const stockMap = {};
        wsData.forEach(ws => {
          if (!stockMap[ws.product_id]) stockMap[ws.product_id] = {};
          stockMap[ws.product_id][ws.warehouse_id] = ws;
        });
        setWarehouseStock(stockMap);
      }

      // Auto-insert cash entry if payment is Efectivo
      if (paymentMethod === 'Efectivo') {
        const { error: cashErr } = await supabase.from('cash_movements').insert({
          type: 'entry',
          amount: subtotal,
          concept: `Venta mostrador #${saleNumber}`,
          responsible: userName,
          reference_type: 'counter_sale',
          movement_date: new Date().toLocaleDateString('en-CA'),
          created_by: userId,
          approval_status: 'approved'
        });
        if (cashErr) console.error('Error insertando en caja:', cashErr);
      }

      // Show receipt
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
        sold_by_name: userName,
        warehouse_name: warehouseName,
        notes: notesFinal,
        items_count: itemsJson.reduce((s, i) => s + i.quantity, 0),
      });
      setShowReceipt(true);

    } catch (err) {
      alert('Error inesperado: ' + (err.message || err));
    }

    setSubmitting(false);
  };

  // ──────────── FETCH HISTORIAL ────────────
  const HIST_PAGE_SIZE = 100;
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchHistorial = async (loadMore = false) => {
    if (loadMore) setLoadingMore(true); else setHistorialLoading(true);
    const offset = loadMore ? salesHistory.length : 0;
    const { data, error } = await supabase
      .from('counter_sales')
      .select('*, seller:profiles!counter_sales_sold_by_fkey(full_name), warehouse:warehouses!counter_sales_warehouse_id_fkey(name)')
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

  // ──────────── PRINT RECEIPT ────────────
  const handlePrint = () => {
    window.print();
  };

  // ──────────── FILTERED HISTORIAL ────────────
  const filteredHistory = salesHistory.filter(sale => {
    if (!historialSearch) return true;
    const s = historialSearch.toLowerCase();
    const itemNames = (sale.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
    return (
      (sale.sale_number || '').toLowerCase().includes(s) ||
      (sale.customer_name || '').toLowerCase().includes(s) ||
      itemNames.includes(s)
    );
  });

  // ──────────── LOADING ────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p>Cargando punto de venta...</p>
      </div>
    );
  }

  // ──────────── RECEIPT VIEW ────────────
  if (showReceipt && receiptData) {
    const receiptDate = new Date(receiptData.created_at);
    return (
      <>
        {/* Print-only styles - optimized for 80mm thermal printer */}
        <style>{`
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * { visibility: hidden !important; }
            #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
            #receipt-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 2mm !important;
              margin: 0 !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              font-size: 11px !important;
            }
            #receipt-print-area h1 { font-size: 16px !important; }
            #receipt-print-area h4 { font-size: 14px !important; }
            #receipt-print-area .text-2xl { font-size: 18px !important; }
            #receipt-print-area .text-lg { font-size: 14px !important; }
            #receipt-print-area .rounded-2xl,
            #receipt-print-area .rounded-xl,
            #receipt-print-area .rounded-lg { border-radius: 0 !important; }
            #receipt-print-area .shadow-2xl,
            #receipt-print-area .shadow-xl,
            #receipt-print-area .shadow-lg { box-shadow: none !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div className="max-w-7xl mx-auto">
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 mb-6 no-print">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#5a8503] transition-all cursor-pointer border-none shadow-lg shadow-[#6a9a04]/25"
            >
              <Printer size={18} /> Imprimir Ticket
            </button>
            <button
              onClick={() => {
                resetSale();
                setShowReceipt(false);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer border border-slate-200 shadow-sm"
            >
              <RotateCcw size={18} /> Nueva Venta
            </button>
          </div>

          {/* Receipt card */}
          <div id="receipt-print-area" ref={receiptRef} className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header - Business Info */}
            <div className="bg-gradient-to-r from-[#6a9a04] to-[#7db505] px-6 py-5 text-center">
              <h1 className="text-xl font-black text-white tracking-tight m-0">GREENLAND PRODUCTS</h1>
            </div>
            <div className="bg-[#5a8503] px-6 py-2 text-center">
              <p className="text-white/80 text-[9px] m-0 leading-relaxed">
                RFC: GPR230911971 &nbsp;•&nbsp; Tel: (844) 105 8692 / (871) 211 5806<br/>
                Blvd. Vito Alessio Robles #3550 Int. 9, Col. Nazario S. Ortiz Garza, Saltillo, Coah. C.P. 25100
              </p>
            </div>

            <div className="px-6 py-5">
              {/* Ticket type */}
              <div className="text-center mb-4 pb-3 border-b border-dashed border-slate-300">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 m-0">— Comprobante de Venta —</p>
              </div>

              {/* Sale info */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Folio</p>
                  <p className="text-sm font-black text-slate-900 m-0 font-mono">{receiptData.sale_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">Fecha</p>
                  <p className="text-sm font-bold text-slate-700 m-0">
                    {receiptDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500 m-0">
                    {receiptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-800">{receiptData.customer_name}</span>
              </div>

              {/* Items */}
              <div className="mb-4 pb-3 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-100">
                  <span className="flex-1">Descripción</span>
                  <span className="w-12 text-center">Cant</span>
                  <span className="w-20 text-right">P.Unit</span>
                  <span className="w-24 text-right">Importe</span>
                </div>
                <div className="space-y-1.5">
                  {receiptData.items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between text-sm">
                      <span className="flex-1 text-slate-800 font-medium pr-2 leading-tight">{item.name}</span>
                      <span className="w-12 text-center text-slate-600">{item.quantity}</span>
                      <span className="w-20 text-right text-slate-600">${item.unit_price.toFixed(2)}</span>
                      <span className="w-24 text-right font-bold text-slate-900">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
                  <span>Artículos: {receiptData.items_count || receiptData.items.reduce((s, i) => s + i.quantity, 0)}</span>
                  <span>{receiptData.items.length} concepto{receiptData.items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Totals section */}
              <div className="mb-4 pb-3 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-600">Subtotal</span>
                  <span className="text-sm font-bold text-slate-700">${receiptData.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 -mx-1">
                  <span className="text-lg font-black text-slate-900">TOTAL</span>
                  <span className="text-2xl font-black text-[#6a9a04]">${receiptData.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment details */}
              <div className="mb-4 pb-3 border-b border-dashed border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Forma de pago:</span>
                  <span className="font-bold text-slate-800">{receiptData.payment_method}</span>
                </div>
                {receiptData.payment_method === 'Efectivo' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Recibido:</span>
                      <span className="font-bold text-slate-800">${receiptData.amount_received.toFixed(2)}</span>
                    </div>
                    {receiptData.change > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5 -mx-1">
                        <span className="text-sm font-bold text-amber-700">Cambio:</span>
                        <span className="text-lg font-black text-amber-600">${receiptData.change.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sale info */}
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Atendió:</span>
                  <span className="font-semibold text-slate-700">{receiptData.sold_by_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sucursal:</span>
                  <span className="font-semibold text-slate-700">{receiptData.warehouse_name}</span>
                </div>
                {receiptData.notes && (
                  <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                    <p className="text-slate-400 m-0">Obs: {receiptData.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-600 m-0">¡Gracias por su compra!</p>
              <p className="text-[9px] text-slate-400 m-0">Este documento es un comprobante de venta. Consérvelo para cualquier aclaración.</p>
              <p className="text-[9px] text-slate-400 m-0">No se aceptan devoluciones sin este comprobante.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ──────────── MAIN PAGE ────────────
  return (
    <>
      {/* Print styles for receipt in historial - optimized for 80mm thermal printer */}
      <style>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-size: 11px !important;
          }
          #receipt-print-area h1 { font-size: 16px !important; }
          #receipt-print-area h4 { font-size: 14px !important; }
          #receipt-print-area .text-2xl { font-size: 18px !important; }
          #receipt-print-area .text-lg { font-size: 14px !important; }
          #receipt-print-area .rounded-2xl,
          #receipt-print-area .rounded-xl,
          #receipt-print-area .rounded-lg { border-radius: 0 !important; }
          #receipt-print-area .shadow-2xl,
          #receipt-print-area .shadow-xl,
          #receipt-print-area .shadow-lg { box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative">
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#6a9a04]" />
                </div>
                Venta en Mostrador
              </h1>
              <p className="text-slate-500 mt-1 font-medium m-0">Registro de ventas directas en bodega</p>
            </div>
          </div>

          {/* ─── TABS ─── */}
          <div className="flex gap-1 mb-6 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm w-fit">
            {[
              { key: 'nueva', label: 'Nueva Venta', icon: ShoppingCart },
              { key: 'historial', label: 'Historial', icon: Receipt },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${
                  activeTab === t.key
                    ? 'bg-[#6a9a04] text-white shadow-md'
                    : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {/* ═══════════════ NUEVA VENTA TAB ═══════════════ */}
          {activeTab === 'nueva' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ─── LEFT: Product Search + Items ─── */}
              <div className="lg:col-span-2 space-y-4">
                {/* Warehouse Selector */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-4">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 block">
                    <Warehouse size={13} className="inline mr-1.5 -mt-0.5" />
                    Bodega
                  </label>
                  <div className="relative">
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => {
                        setSelectedWarehouse(e.target.value);
                        // Clear items when warehouse changes since stock differs
                        if (saleItems.length > 0) {
                          if (confirm('Cambiar de bodega eliminará los productos agregados. ¿Continuar?')) {
                            setSaleItems([]);
                          } else {
                            return;
                          }
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 appearance-none cursor-pointer"
                    >
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Product Search */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-4 relative z-50">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 block">
                    <Search size={13} className="inline mr-1.5 -mt-0.5" />
                    Agregar Productos
                  </label>
                  <div className="relative" ref={searchRef}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar por SKU o nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                      className="w-full pl-12 pr-14 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={openScanner}
                      title="Escanear código de barras"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04] hover:bg-[#6a9a04]/20 transition-all cursor-pointer border-none flex items-center justify-center"
                    >
                      <Camera size={18} />
                    </button>

                    {/* Search Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[320px] overflow-y-auto">
                        {searchResults.map(product => {
                          const available = getAvailableStock(product.id, selectedWarehouse);
                          return (
                            <button
                              key={product.id}
                              onClick={() => addProductToSale(product)}
                              disabled={available <= 0}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-none transition-all ${
                                available <= 0
                                  ? 'bg-red-50/50 text-slate-400 cursor-not-allowed'
                                  : 'bg-transparent hover:bg-[#6a9a04]/5 cursor-pointer'
                              } border-b border-b-slate-50 last:border-b-0`}
                            >
                              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 m-0 truncate">{product.name}</p>
                                <p className="text-[11px] text-slate-500 m-0 font-mono">{product.sku}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black text-[#6a9a04] m-0">${Number(product.price || 0).toFixed(2)}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  available <= 0
                                    ? 'bg-red-100 text-red-600'
                                    : available <= 10
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-[#6a9a04]/10 text-[#6a9a04]'
                                }`}>
                                  {available} disp.
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sale Items List */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 m-0 flex items-center gap-2">
                      <ShoppingCart size={15} className="text-[#6a9a04]" />
                      Productos en venta
                      {saleItems.length > 0 && (
                        <span className="bg-[#6a9a04] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {saleItems.length}
                        </span>
                      )}
                    </h3>
                  </div>

                  {saleItems.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 m-0">Busca y agrega productos para iniciar la venta</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {saleItems.map((item) => {
                        const available = getAvailableStock(item.product_id, selectedWarehouse);
                        const subtotal = item.quantity * item.unit_price;
                        return (
                          <div key={item.product_id} className="px-4 py-3">
                            {/* Product info row */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 m-0 truncate">{item.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-slate-500">{item.sku}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    available <= 0
                                      ? 'bg-red-100 text-red-600'
                                      : available <= 5
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-[#6a9a04]/10 text-[#6a9a04]'
                                  }`}>
                                    Stock: {available}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeItem(item.product_id)}
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer border-none flex items-center justify-center flex-shrink-0"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Quantity + Price + Subtotal row */}
                            <div className="flex items-center gap-3 ml-[52px]">
                              {/* Quantity */}
                              <div className="flex items-center gap-0">
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-8 h-8 rounded-l-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer border border-slate-200 border-r-0 flex items-center justify-center"
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={available}
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.product_id, e.target.value)}
                                  className="w-12 h-8 text-center text-sm font-bold text-slate-900 border border-slate-200 outline-none focus:ring-1 focus:ring-[#6a9a04]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                                  disabled={item.quantity >= available}
                                  className="w-8 h-8 rounded-r-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer border border-slate-200 border-l-0 flex items-center justify-center"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* × */}
                              <span className="text-slate-400 text-sm font-bold">×</span>

                              {/* Price */}
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateItemPrice(item.product_id, e.target.value)}
                                  className="w-24 h-8 pl-5 pr-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>

                              {/* = */}
                              <span className="text-slate-400 text-sm font-bold">=</span>

                              {/* Subtotal */}
                              <span className="text-sm font-black text-[#6a9a04] whitespace-nowrap">
                                ${subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Items total bar */}
                  {saleItems.length > 0 && (
                    <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500">
                        {saleItems.reduce((s, i) => s + i.quantity, 0)} artículo(s)
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        Total: <span className="text-[#6a9a04]">${saleTotal.toFixed(2)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── RIGHT: Sale Footer / Checkout ─── */}
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-5 space-y-4 lg:sticky lg:top-4">
                  <h3 className="text-sm font-black text-slate-800 m-0 flex items-center gap-2">
                    <Receipt size={15} className="text-[#6a9a04]" />
                    Datos de Venta
                  </h3>

                  {/* Customer name */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      <User size={12} className="inline mr-1 -mt-0.5" />
                      Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Público General"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      <CreditCard size={12} className="inline mr-1 -mt-0.5" />
                      Método de Pago
                    </label>
                    <div className="relative">
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#6a9a04]/20 appearance-none cursor-pointer ${
                          !paymentMethod
                            ? 'border-amber-400 text-slate-400 animate-pulse'
                            : 'border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="" disabled>— Selecciona método —</option>
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Transferencia">🏦 Transferencia</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Amount received (cash only) */}
                  {paymentMethod === 'Efectivo' && saleItems.length > 0 && (
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                        💵 Monto Recibido
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min={saleTotal}
                          placeholder="Ingresa monto recibido"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-400"
                        />
                      </div>
                      {amountReceived && parseFloat(amountReceived) >= saleTotal && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-700">Cambio:</span>
                          <span className="text-base font-black text-amber-600">${(parseFloat(amountReceived) - saleTotal).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Notas (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Observaciones de la venta..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-400 resize-none"
                    />
                  </div>

                  {/* Total */}
                  <div className="bg-gradient-to-r from-[#6a9a04] to-[#7db505] rounded-xl p-4 text-center">
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider m-0">Total a Cobrar</p>
                    <p className="text-3xl font-black text-white m-0 mt-1">${saleTotal.toFixed(2)}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={resetSale}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer border border-slate-200"
                    >
                      <X size={16} /> Cancelar
                    </button>
                    <button
                      onClick={handleSubmitSale}
                      disabled={submitting || saleItems.length === 0}
                      className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#5a8503] transition-all cursor-pointer border-none shadow-lg shadow-[#6a9a04]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Procesando...
                        </>
                      ) : (
                        <>
                          <Check size={16} /> Cobrar y Registrar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ HISTORIAL TAB ═══════════════ */}
          {activeTab === 'historial' && (
            <div>
              {/* Search */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por folio, cliente o producto..."
                    value={historialSearch}
                    onChange={(e) => setHistorialSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                  />
                </div>
                <button
                  onClick={fetchHistorial}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                >
                  <RotateCcw size={14} /> Actualizar
                </button>
                <p className="text-sm text-slate-500 m-0 ml-auto">{filteredHistory.length} ventas</p>
              </div>

              {historialLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                  <div className="w-8 h-8 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
                  <p className="text-sm m-0">Cargando historial...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl px-6 py-16 text-center">
                  <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 m-0">No se encontraron ventas</p>
                </div>
              ) : (
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                  {/* Desktop table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Folio</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Fecha</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Cliente</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Productos</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Total</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Vendedor</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Bodega</th>
                          <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredHistory.map((sale) => {
                          const isExpanded = expandedSale === sale.id;
                          const saleDate = new Date(sale.created_at);
                          const items = sale.items || [];
                          const itemsSummary = items.length <= 2
                            ? items.map(i => `${i.quantity}× ${i.name}`).join(', ')
                            : `${items[0].quantity}× ${items[0].name} +${items.length - 1} más`;

                          return (
                            <React.Fragment key={sale.id}>
                              <tr
                                onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                                className="hover:bg-white/50 transition-colors cursor-pointer group"
                              >
                                <td className="px-4 py-3">
                                  <span className="font-mono text-sm font-bold text-[#6a9a04]">{sale.sale_number}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm text-slate-800 m-0 font-medium">
                                    {saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-[11px] text-slate-400 m-0">
                                    {saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{sale.customer_name}</td>
                                <td className="px-4 py-3">
                                  <p className="text-sm text-slate-600 m-0 max-w-[200px] truncate">{itemsSummary}</p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-black text-slate-900">${Number(sale.total).toFixed(2)}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{sale.seller?.full_name || '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{sale.warehouse?.name || '—'}</td>
                                <td className="px-4 py-3">
                                  {isExpanded
                                    ? <ChevronUp size={16} className="text-slate-400" />
                                    : <ChevronDown size={16} className="text-slate-400" />
                                  }
                                </td>
                              </tr>

                              {/* Expanded receipt detail */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} className="px-0 py-0 bg-slate-50/50">
                                    <div id="receipt-print-area" className="max-w-lg mx-auto my-4 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                                      {/* Header */}
                                      <div className="bg-gradient-to-r from-[#6a9a04] to-[#7db505] px-5 py-3 text-center">
                                        <h4 className="text-base font-black text-white m-0">GREENLAND PRODUCTS</h4>
                                      </div>
                                      <div className="bg-[#5a8503] px-5 py-1.5 text-center">
                                        <p className="text-white/80 text-[8px] m-0 leading-relaxed">RFC: GPR230911971 • Tel: (844) 105 8692 / (871) 211 5806<br/>Blvd. Vito Alessio Robles #3550 Int. 9, Col. Nazario S. Ortiz Garza, Saltillo, Coah. C.P. 25100</p>
                                      </div>
                                      <div className="px-5 py-4">
                                        <div className="text-center mb-3 pb-2 border-b border-dashed border-slate-300">
                                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 m-0">— Comprobante de Venta —</p>
                                        </div>
                                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-dashed border-slate-200">
                                          <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase m-0">Folio</p>
                                            <p className="text-sm font-black text-slate-900 m-0 font-mono">{sale.sale_number}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase m-0">Fecha</p>
                                            <p className="text-sm font-bold text-slate-700 m-0">
                                              {saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                              {' '}
                                              {saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Customer */}
                                        <div className="flex justify-between text-sm mb-2">
                                          <span className="text-slate-500">Cliente:</span>
                                          <span className="font-bold text-slate-800">{sale.customer_name}</span>
                                        </div>

                                        {/* Items */}
                                        <div className="mb-3 pb-3 border-b border-dashed border-slate-200">
                                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pb-1 border-b border-slate-100">
                                            <span className="flex-1">Descripción</span>
                                            <span className="w-10 text-center">Cant</span>
                                            <span className="w-16 text-right">P.Unit</span>
                                            <span className="w-20 text-right">Importe</span>
                                          </div>
                                          {items.map((item, idx) => (
                                            <div key={idx} className="flex items-start justify-between text-sm py-0.5">
                                              <span className="flex-1 text-slate-700 pr-2 leading-tight">{item.name}</span>
                                              <span className="w-10 text-center text-slate-500">{item.quantity}</span>
                                              <span className="w-16 text-right text-slate-500">${Number(item.unit_price).toFixed(2)}</span>
                                              <span className="w-20 text-right font-bold text-slate-900">${Number(item.subtotal).toFixed(2)}</span>
                                            </div>
                                          ))}
                                          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-100">
                                            <span>Artículos: {items.reduce((s, i) => s + i.quantity, 0)}</span>
                                            <span>{items.length} concepto{items.length !== 1 ? 's' : ''}</span>
                                          </div>
                                        </div>

                                        {/* Total */}
                                        <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 mb-3">
                                          <span className="text-base font-black text-slate-900">TOTAL</span>
                                          <span className="text-xl font-black text-[#6a9a04]">${Number(sale.total).toFixed(2)}</span>
                                        </div>

                                        {/* Payment details */}
                                        <div className="space-y-1 text-sm mb-3 pb-3 border-b border-dashed border-slate-200">
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">Forma de pago:</span>
                                            <span className="font-bold text-slate-800">{sale.payment_method}</span>
                                          </div>
                                        </div>

                                        {/* Sale info */}
                                        <div className="space-y-1 text-xs text-slate-500">
                                          <div className="flex justify-between">
                                            <span>Atendió:</span>
                                            <span className="font-semibold text-slate-700">{sale.seller?.full_name || '—'}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Sucursal:</span>
                                            <span className="font-semibold text-slate-700">{sale.warehouse?.name || '—'}</span>
                                          </div>
                                          {sale.notes && (
                                            <div className="pt-1.5 mt-1 border-t border-slate-100">
                                              <p className="text-slate-400 m-0">Obs: {sale.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Footer */}
                                      <div className="bg-slate-50 px-5 py-3 text-center space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-600 m-0">¡Gracias por su compra!</p>
                                        <p className="text-[8px] text-slate-400 m-0">Conserve este comprobante para cualquier aclaración.</p>
                                      </div>

                                      {/* Print button */}
                                      <div className="px-5 py-3 border-t border-slate-100 flex justify-center no-print">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6a9a04] text-white text-xs font-bold hover:bg-[#5a8503] transition-all cursor-pointer border-none shadow-sm"
                                        >
                                          <Printer size={14} /> Imprimir
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 m-0">
                      Mostrando {filteredHistory.length} de {salesHistory.length} ventas
                    </p>
                    {hasMoreHistory && (
                      <button
                        onClick={() => fetchHistorial(true)}
                        disabled={loadingMore}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04] text-xs font-bold hover:bg-[#6a9a04]/20 transition-all cursor-pointer border-none disabled:opacity-50"
                      >
                        {loadingMore ? 'Cargando...' : 'Cargar más ventas'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ BARCODE SCANNER MODAL ═══════════════ */}
      {showScanner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 m-0 flex items-center gap-2">
                <Camera size={16} className="text-[#6a9a04]" />
                Escanear Código de Barras
              </h3>
              <button
                onClick={closeScanner}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Camera Preview */}
            <div className="px-5 py-4">
              <div
                id="barcode-reader"
                className="w-full rounded-xl overflow-hidden bg-black"
                style={{ minHeight: 300 }}
              />
              <p className="text-center text-sm text-slate-500 mt-3 mb-0 animate-pulse">
                Apunta la cámara al código de barras...
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-center">
              <button
                onClick={closeScanner}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all cursor-pointer border-none"
              >
                <X size={15} /> Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SCAN FEEDBACK TOAST ═══════════════ */}
      {scanFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] animate-[slideUp_0.3s_ease-out]">
          <div className={`px-5 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 ${
            scanFeedback.startsWith('⚠')
              ? 'bg-amber-500 text-white'
              : 'bg-[#6a9a04] text-white'
          }`}>
            {!scanFeedback.startsWith('⚠') && <Check size={16} />}
            {scanFeedback}
          </div>
        </div>
      )}

      {/* Slide-up animation for toast */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
