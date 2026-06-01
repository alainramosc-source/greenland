'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JsBarcode from 'jsbarcode';
import {
  Tag, Printer, Loader2, Package, Search, CheckSquare, Square,
  Columns3, Maximize2, Hash, DollarSign, ChevronDown, Download
} from 'lucide-react';

const LABEL_SIZES = [
  { key: 'small', label: 'Pequeña (5×3cm)', width: '5cm', height: '3cm', barcodeWidth: 1.2, barcodeHeight: 35, fontSize: 10, nameFontSize: '8px', headerSize: '7px', priceSize: '9px' },
  { key: 'medium', label: 'Mediana (7×4cm)', width: '7cm', height: '4cm', barcodeWidth: 1.6, barcodeHeight: 50, fontSize: 12, nameFontSize: '9px', headerSize: '8px', priceSize: '11px' },
  { key: 'large', label: 'Grande (10×5cm)', width: '10cm', height: '5cm', barcodeWidth: 2, barcodeHeight: 60, fontSize: 14, nameFontSize: '11px', headerSize: '9px', priceSize: '13px' },
];

const COLUMN_OPTIONS = [1, 2, 3, 4, 5];

export default function EtiquetasPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth & state
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelSize, setLabelSize] = useState('medium');
  const [columns, setColumns] = useState(3);
  const [qtyPerSku, setQtyPerSku] = useState(1);
  const [includePrice, setIncludePrice] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodesRendered, setBarcodesRendered] = useState(false);

  const printAreaRef = useRef(null);

  // ──────────── INIT ────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Fetch active products
      const { data: prodData } = await supabase
        .from('products')
        .select('id, sku, name, price, image_url, is_active')
        .eq('is_active', true)
        .order('sku');

      setProducts(prodData || []);
      setLoading(false);
    };
    init();
  }, []);

  // ──────────── RENDER BARCODES ON PRODUCT CARDS ────────────
  useEffect(() => {
    if (products.length === 0) return;

    // Small delay to ensure SVGs are in DOM
    const timer = setTimeout(() => {
      products.forEach((product) => {
        const el = document.getElementById(`barcode-${product.sku}`);
        if (el) {
          try {
            JsBarcode(el, product.sku, {
              format: 'CODE128',
              width: 1.5,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 5,
              background: 'transparent',
              lineColor: '#1e293b',
            });
          } catch (e) {
            console.warn(`Barcode error for ${product.sku}:`, e);
          }
        }
      });
      setBarcodesRendered(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [products]);

  // ──────────── RENDER BARCODES ON PRINT AREA ────────────
  const renderPrintBarcodes = useCallback(() => {
    const sizeConfig = LABEL_SIZES.find(s => s.key === labelSize) || LABEL_SIZES[1];
    const selectedProducts = products.filter(p => selectedIds.has(p.id));

    // Render barcodes for each copy of each selected product in print area
    requestAnimationFrame(() => {
      selectedProducts.forEach((product) => {
        for (let i = 0; i < qtyPerSku; i++) {
          const el = document.getElementById(`print-barcode-${product.sku}-${i}`);
          if (el) {
            try {
              JsBarcode(el, product.sku, {
                format: 'CODE128',
                width: sizeConfig.barcodeWidth,
                height: sizeConfig.barcodeHeight,
                displayValue: false,
                margin: 2,
                background: 'transparent',
                lineColor: '#000000',
              });
            } catch (e) {
              console.warn(`Print barcode error for ${product.sku}:`, e);
            }
          }
        }
      });
    });
  }, [products, selectedIds, qtyPerSku, labelSize]);

  // Re-render print barcodes when selections or config change
  useEffect(() => {
    if (selectedIds.size > 0) {
      // Small delay to ensure print SVGs are in DOM
      const timer = setTimeout(renderPrintBarcodes, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedIds, qtyPerSku, labelSize, renderPrintBarcodes]);

  // ──────────── SELECTION HANDLERS ────────────
  const toggleProduct = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (p.sku || '').toLowerCase().includes(s) ||
      (p.name || '').toLowerCase().includes(s)
    );
  });

  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // ──────────── PRINT HANDLER ────────────
  const handlePrint = () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un producto para imprimir.');
      return;
    }
    // Give print barcodes a moment to render, then print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // ──────────── DOWNLOAD BARCODE AS PNG ────────────
  const downloadBarcode = (e, product) => {
    e.stopPropagation(); // Don't toggle selection
    const svgEl = document.getElementById(`barcode-${product.sku}`);
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 2x scale for crisp print quality
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `barcode-${product.sku}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ──────────── HELPERS ────────────
  const sizeConfig = LABEL_SIZES.find(s => s.key === labelSize) || LABEL_SIZES[1];
  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  // ──────────── LOADING ────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p>Cargando etiquetas...</p>
      </div>
    );
  }

  return (
    <>
      {/* ═══════ PRINT STYLES ═══════ */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-labels-area, #print-labels-area * { visibility: visible !important; }
          #print-labels-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
          .print-label-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        @media screen {
          #print-labels-area {
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="relative no-print">
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-[#6a9a04]" />
                </div>
                Etiquetas de Producto
              </h1>
              <p className="text-slate-500 mt-1 font-medium m-0">
                Genera e imprime etiquetas con código de barras para tus productos
              </p>
            </div>
          </div>

          {/* ─── CONTROLS BAR ─── */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              {/* Label Size */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center gap-1">
                  <Maximize2 size={11} /> Tamaño
                </label>
                <div className="relative">
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 appearance-none cursor-pointer"
                  >
                    {LABEL_SIZES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Columns */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center gap-1">
                  <Columns3 size={11} /> Columnas
                </label>
                <div className="flex gap-1">
                  {COLUMN_OPTIONS.map(col => (
                    <button
                      key={col}
                      onClick={() => setColumns(col)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
                        columns === col
                          ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity per SKU */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center gap-1">
                  <Hash size={11} /> Copias por SKU
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={qtyPerSku}
                  onChange={(e) => setQtyPerSku(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 text-center outline-none focus:ring-2 focus:ring-[#6a9a04]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Include Price */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center gap-1">
                  <DollarSign size={11} /> Opciones
                </label>
                <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                  <input
                    type="checkbox"
                    checked={includePrice}
                    onChange={(e) => setIncludePrice(e.target.checked)}
                    className="w-4 h-4 accent-[#6a9a04] cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-700">Incluir precio</span>
                </label>
              </div>

              {/* Select All / Deselect */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">&nbsp;</label>
                <button
                  onClick={toggleAll}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                    allSelected
                      ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      : 'bg-[#6a9a04]/10 text-[#6a9a04] border-[#6a9a04]/20 hover:bg-[#6a9a04]/20'
                  }`}
                >
                  {allSelected ? <Square size={15} /> : <CheckSquare size={15} />}
                  {allSelected ? 'Deseleccionar' : 'Seleccionar Todos'}
                </button>
              </div>

              {/* Print */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">&nbsp;</label>
                <button
                  onClick={handlePrint}
                  disabled={selectedIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#6a9a04] text-white font-bold text-sm hover:bg-[#5a8503] transition-all cursor-pointer border-none shadow-lg shadow-[#6a9a04]/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer size={16} />
                  Imprimir ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>

          {/* ─── SEARCH ─── */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por SKU o nombre..."
                className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} · {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''} · {selectedIds.size * qtyPerSku} etiqueta{selectedIds.size * qtyPerSku !== 1 ? 's' : ''} a imprimir
            </p>
          </div>

          {/* ─── PRODUCT GRID ─── */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-12 text-center">
              <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-sm text-slate-400 font-medium">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos activos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`bg-white/60 backdrop-blur-md rounded-2xl border-2 shadow-xl p-4 cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.01] ${
                      isSelected
                        ? 'border-[#6a9a04] ring-2 ring-[#6a9a04]/20 bg-[#6a9a04]/5'
                        : 'border-white/50 hover:border-slate-200'
                    }`}
                  >
                    {/* Top row: Checkbox + Name */}
                    <div className="flex items-start gap-2 mb-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? 'bg-[#6a9a04] border-[#6a9a04]'
                          : 'bg-white border-slate-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 m-0 truncate leading-tight">{product.name}</p>
                        <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] font-mono tracking-wide">
                          {product.sku}
                        </span>
                      </div>
                    </div>

                    {/* Barcode */}
                    <div className="flex justify-center my-2 bg-white/80 rounded-xl py-2">
                      <svg id={`barcode-${product.sku}`} className="max-w-full" />
                    </div>

                    {/* Price + Download */}
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-lg font-black text-[#6a9a04]">
                        ${Number(product.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={(e) => downloadBarcode(e, product)}
                        title={`Descargar barcode-${product.sku}.png`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-white hover:text-[#6a9a04] hover:border-[#6a9a04]/30 transition-all cursor-pointer bg-transparent"
                      >
                        <Download size={13} /> PNG
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ HIDDEN PRINT LABELS AREA ═══════════════ */}
      <div id="print-labels-area" ref={printAreaRef}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '4mm',
            width: '100%',
          }}
        >
          {selectedProducts.map((product) =>
            Array.from({ length: qtyPerSku }, (_, i) => (
              <div
                key={`${product.id}-${i}`}
                className="print-label-card"
                style={{
                  width: sizeConfig.width,
                  height: sizeConfig.height,
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '2mm',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  background: 'white',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Company Header */}
                <p style={{
                  margin: 0,
                  fontSize: sizeConfig.headerSize,
                  fontWeight: 900,
                  color: '#6a9a04',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: 1.2,
                }}>
                  Greenland Products
                </p>

                {/* Product Name */}
                <p style={{
                  margin: '1mm 0',
                  fontSize: sizeConfig.nameFontSize,
                  fontWeight: 700,
                  color: '#1e293b',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {product.name}
                </p>

                {/* Barcode SVG */}
                <svg
                  id={`print-barcode-${product.sku}-${i}`}
                  style={{ maxWidth: '90%' }}
                />

                {/* SKU Text */}
                <p style={{
                  margin: '0.5mm 0 0 0',
                  fontSize: sizeConfig.fontSize + 'px',
                  fontWeight: 900,
                  color: '#334155',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                }}>
                  {product.sku}
                </p>

                {/* Price (conditional) */}
                {includePrice && (
                  <p style={{
                    margin: '0.5mm 0 0 0',
                    fontSize: sizeConfig.priceSize,
                    fontWeight: 900,
                    color: '#6a9a04',
                  }}>
                    ${Number(product.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
