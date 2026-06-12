'use client';
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import generateQuotationPDF from '../pdf-generator';
import {
  ArrowLeft, Building2, Armchair, Palette, Search, Plus, Trash2,
  GripVertical, Save, FileText, X, ChevronDown, Package, Loader2,
  CheckCircle, AlertCircle, ImageOff
} from 'lucide-react';

// =============================================================================
// Brand configurations
// =============================================================================
const BRANDS = [
  {
    key: 'spaces',
    name: 'Greenland Spaces',
    description: 'Contenedores y espacios modulares',
    color: '#2d7d46',
    lightBg: 'rgba(45, 125, 70, 0.06)',
    icon: Building2,
  },
  {
    key: 'products',
    name: 'Greenland Products',
    description: 'Mobiliario y productos',
    color: '#6a9a04',
    lightBg: 'rgba(106, 154, 4, 0.06)',
    icon: Armchair,
  },
  {
    key: 'deco',
    name: 'Greenland Deco',
    description: 'Decoración y acabados',
    color: '#5a8a3c',
    lightBg: 'rgba(90, 138, 60, 0.06)',
    icon: Palette,
  },
];

// =============================================================================
// Quantity unit options
// =============================================================================
const QUANTITY_UNITS = [
  { value: 'pzs', label: 'Piezas' },
  { value: 'cajas', label: 'Cajas' },
  { value: 'rollos', label: 'Rollos' },
  { value: 'm²', label: 'm²' },
  { value: 'unidad', label: 'Unidad' },
];

// =============================================================================
// Currency formatter
// =============================================================================
function fmtMoney(val, currency = 'MXN') {
  const num = Number(val) || 0;
  const prefix = currency === 'USD' ? 'US$' : '$';
  return `${prefix} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// =============================================================================
// Precision rounding
// =============================================================================
function round2(x) {
  return Math.round(x * 100) / 100;
}

// =============================================================================
// Today's date in YYYY-MM-DD
// =============================================================================
function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// =============================================================================
// Inner component that uses useSearchParams
// =============================================================================
function QuotationFormInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  // ---- Form state ----
  const [brand, setBrand] = useState('products');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [city, setCity] = useState('Saltillo, Coahuila');
  const [quoteDate, setQuoteDate] = useState(todayStr());
  const [validityDays, setValidityDays] = useState(15);
  const [currency, setCurrency] = useState('MXN');
  const [includesIva, setIncludesIva] = useState(false);
  const [introText, setIntroText] = useState('');
  const [conditions, setConditions] = useState([]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [folio, setFolio] = useState('');

  // ---- Templates ----
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // ---- Product search ----
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // ---- UI state ----
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);

  // ===========================
  // Close product dropdown on outside click
  // ===========================
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===========================
  // Load templates when brand changes
  // ===========================
  useEffect(() => {
    async function loadTemplates() {
      const { data } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('brand', brand)
        .eq('is_active', true)
        .order('name');
      setTemplates(data || []);
      setSelectedTemplate('');
    }
    loadTemplates();
  }, [brand]);

  // ===========================
  // Load existing quotation in edit mode
  // ===========================
  useEffect(() => {
    if (!editId) return;
    async function loadQuotation() {
      setLoading(true);
      try {
        const { data: quot, error } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', editId)
          .single();

        if (error || !quot) {
          setToast({ type: 'error', message: 'No se pudo cargar la cotización' });
          setLoading(false);
          return;
        }

        setBrand(quot.brand || 'products');
        setClientName(quot.client_name || '');
        setClientCompany(quot.client_company || '');
        setClientEmail(quot.client_email || '');
        setClientPhone(quot.client_phone || '');
        setCity(quot.city || 'Saltillo, Coahuila');
        setQuoteDate(quot.quote_date || todayStr());
        setValidityDays(quot.validity_days || 15);
        setCurrency(quot.currency || 'MXN');
        setIncludesIva(quot.includes_iva || false);
        setIntroText(quot.intro_text || '');
        setNotes(quot.notes || '');
        setFolio(quot.folio || '');

        // Parse conditions
        let conds = [];
        if (quot.conditions) {
          try {
            conds = typeof quot.conditions === 'string' ? JSON.parse(quot.conditions) : quot.conditions;
          } catch { conds = []; }
        }
        setConditions(conds);

        // Load items
        const { data: itemsData } = await supabase
          .from('quotation_items')
          .select('*')
          .eq('quotation_id', editId)
          .order('sort_order');

        setItems((itemsData || []).map((it, idx) => ({
          id: it.id,
          tempId: `existing-${idx}`,
          sku: it.sku || '',
          name: it.name || '',
          description: it.description || '',
          unit_price: it.unit_price || 0,
          quantity: it.quantity || 1,
          quantity_unit: it.quantity_unit || 'pzs',
          image_url: it.image_url || '',
          isCustom: !it.sku,
        })));
      } catch (err) {
        console.error(err);
        setToast({ type: 'error', message: 'Error cargando cotización' });
      }
      setLoading(false);
    }
    loadQuotation();
  }, [editId]);

  // ===========================
  // Template change handler
  // ===========================
  const handleTemplateChange = useCallback((templateId) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setIntroText(tpl.intro_text || '');
    setNotes(tpl.notes || '');
    let conds = [];
    if (tpl.conditions) {
      try {
        conds = typeof tpl.conditions === 'string' ? JSON.parse(tpl.conditions) : tpl.conditions;
      } catch { conds = []; }
    }
    setConditions(conds);
  }, [templates]);

  // ===========================
  // Product search
  // ===========================
  const handleProductSearch = useCallback((q) => {
    setProductSearch(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q || q.length < 2) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('is_active', true)
        .or(`sku.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(8);
      setProductResults(data || []);
      setShowProductDropdown(true);
      setSearchLoading(false);
    }, 300);
  }, []);

  // ===========================
  // Add product from search
  // ===========================
  const addProductFromSearch = useCallback((product) => {
    setItems(prev => [...prev, {
      tempId: `item-${Date.now()}-${Math.random()}`,
      sku: product.sku,
      name: product.name,
      description: '',
      unit_price: 0,
      quantity: 1,
      quantity_unit: 'pzs',
      image_url: `/productos/${product.sku}-P1.jpg`,
      isCustom: false,
    }]);
    setProductSearch('');
    setProductResults([]);
    setShowProductDropdown(false);
  }, []);

  // ===========================
  // Add custom item
  // ===========================
  const addCustomItem = useCallback(() => {
    setItems(prev => [...prev, {
      tempId: `custom-${Date.now()}-${Math.random()}`,
      sku: '',
      name: '',
      description: '',
      unit_price: 0,
      quantity: 1,
      quantity_unit: 'pzs',
      image_url: '',
      isCustom: true,
    }]);
  }, []);

  // ===========================
  // Update item field
  // ===========================
  const updateItem = useCallback((tempId, field, value) => {
    setItems(prev => prev.map(it =>
      it.tempId === tempId ? { ...it, [field]: value } : it
    ));
  }, []);

  // ===========================
  // Remove item
  // ===========================
  const removeItem = useCallback((tempId) => {
    setItems(prev => prev.filter(it => it.tempId !== tempId));
  }, []);

  // ===========================
  // Conditions management
  // ===========================
  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, '']);
  }, []);

  const updateCondition = useCallback((idx, value) => {
    setConditions(prev => prev.map((c, i) => i === idx ? value : c));
  }, []);

  const removeCondition = useCallback((idx) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ===========================
  // Calculations
  // ===========================
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => {
      return sum + round2(Number(it.unit_price || 0) * Number(it.quantity || 0));
    }, 0);
    const roundedSubtotal = round2(subtotal);
    const ivaAmount = includesIva ? 0 : round2(roundedSubtotal * 0.16);
    const total = round2(roundedSubtotal + ivaAmount);
    return { subtotal: roundedSubtotal, ivaAmount, total };
  }, [items, includesIva]);

  // ===========================
  // Save handler
  // ===========================
  const handleSave = useCallback(async (generatePdf = false) => {
    // Validate
    if (!clientName.trim()) {
      setToast({ type: 'error', message: 'El nombre del cliente es requerido' });
      return;
    }
    if (items.length === 0) {
      setToast({ type: 'error', message: 'Agrega al menos un producto o servicio' });
      return;
    }

    setSaving(true);
    try {
      let currentFolio = folio;

      // Generate folio if new
      if (!editId && !currentFolio) {
        const { data: folioData, error: folioError } = await supabase.rpc('generate_quotation_folio');
        if (folioError) {
          console.error('Folio generation error:', folioError);
          setToast({ type: 'error', message: 'Error generando folio' });
          setSaving(false);
          return;
        }
        currentFolio = folioData;
        setFolio(currentFolio);
      }

      // Build quotation record
      const quotationRecord = {
        brand,
        folio: currentFolio,
        client_name: clientName.trim(),
        client_company: clientCompany.trim() || null,
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        city: city.trim() || null,
        quote_date: quoteDate,
        validity_days: Number(validityDays) || 15,
        currency,
        includes_iva: includesIva,
        intro_text: introText.trim() || null,
        conditions: JSON.stringify(conditions.filter(c => c.trim())),
        notes: notes.trim() || null,
        subtotal: totals.subtotal,
        iva_amount: totals.ivaAmount,
        total: totals.total,
        status: generatePdf ? 'sent' : 'draft',
      };

      let quotationId = editId;

      if (editId) {
        // Update existing
        const { error } = await supabase
          .from('quotations')
          .update(quotationRecord)
          .eq('id', editId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('quotations')
          .insert(quotationRecord)
          .select('id')
          .single();
        if (error) throw error;
        quotationId = data.id;
      }

      // Delete old items and insert new
      if (editId) {
        await supabase.from('quotation_items').delete().eq('quotation_id', editId);
      }

      const itemRecords = items.map((it, idx) => ({
        quotation_id: quotationId,
        sku: it.sku || null,
        name: it.name,
        description: it.description || null,
        unit_price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
        quantity_unit: it.quantity_unit || 'pzs',
        total: round2(Number(it.unit_price || 0) * Number(it.quantity || 0)),
        image_url: it.image_url || null,
        sort_order: idx,
      }));

      if (itemRecords.length > 0) {
        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemRecords);
        if (itemsError) throw itemsError;
      }

      // PDF generation
      if (generatePdf) {
        try {
          const doc = await generateQuotationPDF({
            quotation: { ...quotationRecord, folio: currentFolio },
            items: itemRecords,
          });

          // Upload to storage
          const pdfBlob = doc.output('blob');
          const pdfPath = `${quotationId}/${currentFolio}.pdf`;

          const { error: uploadError } = await supabase.storage
            .from('quotation-pdfs')
            .upload(pdfPath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('quotation-pdfs')
              .getPublicUrl(pdfPath);

            if (urlData?.publicUrl) {
              await supabase
                .from('quotations')
                .update({ pdf_url: urlData.publicUrl })
                .eq('id', quotationId);
            }
          }

          // Trigger download
          doc.save(`${currentFolio}.pdf`);
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
          setToast({ type: 'error', message: 'Cotización guardada, pero hubo un error al generar el PDF' });
          setSaving(false);
          return;
        }
      }

      setToast({ type: 'success', message: generatePdf ? 'Cotización guardada y PDF generado' : 'Borrador guardado exitosamente' });
      setTimeout(() => router.push('/dashboard/cotizaciones'), 1200);
    } catch (err) {
      console.error('Save error:', err);
      setToast({ type: 'error', message: 'Error al guardar la cotización' });
    }
    setSaving(false);
  }, [editId, brand, folio, clientName, clientCompany, clientEmail, clientPhone, city,
    quoteDate, validityDays, currency, includesIva, introText, conditions, notes,
    items, totals, router]);

  // ===========================
  // Toast auto-dismiss
  // ===========================
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ===========================
  // Brand change handler
  // ===========================
  const handleBrandChange = useCallback((newBrand) => {
    setBrand(newBrand);
  }, []);

  // ===========================
  // Loading state
  // ===========================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Cargando cotización...</p>
      </div>
    );
  }

  const activeBrand = BRANDS.find(b => b.key === brand) || BRANDS[1];

  return (
    <div className="relative max-w-5xl mx-auto pb-32">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all animate-slideIn ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded-lg transition-colors cursor-pointer bg-transparent border-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/cotizaciones"
          className="p-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl hover:bg-white/80 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 m-0">
            {editId ? `Editar Cotización ${folio || ''}` : 'Nueva Cotización'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 m-0">
            {editId ? 'Modifica los datos de la cotización' : 'Crea una nueva cotización para tu cliente'}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BRAND SELECTOR */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-3">Marca</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BRANDS.map((b) => {
            const Icon = b.icon;
            const isSelected = brand === b.key;
            return (
              <button
                key={b.key}
                onClick={() => handleBrandChange(b.key)}
                className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer bg-transparent text-left ${
                  isSelected
                    ? 'shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                style={isSelected ? {
                  borderColor: b.color,
                  backgroundColor: b.lightBg,
                  borderLeftWidth: '4px',
                } : {}}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${b.color}15`, color: b.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 m-0">{b.name}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">{b.description}</p>
                </div>
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: b.color }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CLIENT INFO */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-4">Información del Cliente</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nombre del cliente <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Empresa</label>
            <input
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Nombre de la empresa"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(844) 123 4567"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ciudad, Estado"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* QUOTE DETAILS */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-4">Detalles de la Cotización</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Vigencia (días)</label>
            <input
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              min="1"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Moneda</label>
            <div className="flex gap-2">
              {['MXN', 'USD'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer bg-transparent ${
                    currency === c
                      ? 'border-[#6a9a04] bg-[#6a9a04]/5 text-[#6a9a04]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={currency === c ? { backgroundColor: 'rgba(106,154,4,0.05)' } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">IVA</label>
            <button
              onClick={() => setIncludesIva(!includesIva)}
              className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer bg-transparent flex items-center justify-center gap-2 ${
                includesIva
                  ? 'border-[#6a9a04] text-[#6a9a04]'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              style={includesIva ? { backgroundColor: 'rgba(106,154,4,0.05)' } : {}}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                includesIva ? 'border-[#6a9a04] bg-[#6a9a04]' : 'border-slate-300'
              }`}>
                {includesIva && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              IVA incluido
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TEMPLATE SELECTOR */}
      {/* ============================================================ */}
      {templates.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-1">Plantilla</label>
          <p className="text-xs text-slate-500 mb-3 m-0">Selecciona una plantilla para pre-llenar texto introductorio, condiciones y notas</p>
          <div className="relative">
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm appearance-none cursor-pointer pr-10"
            >
              <option value="">— Seleccionar plantilla —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INTRO TEXT */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-1">Texto Introductorio</label>
        <p className="text-xs text-slate-500 mb-3 m-0">Mensaje de presentación para el cliente</p>
        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          rows={4}
          placeholder="Estimado cliente, a continuación le presentamos nuestra cotización..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm resize-y"
        />
      </div>

      {/* ============================================================ */}
      {/* PRODUCTS / SERVICES */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: activeBrand.color }} />
            <label className="text-sm font-bold text-slate-700">Productos / Servicios</label>
          </div>
          <button
            onClick={addCustomItem}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-all cursor-pointer bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Agregar ítem personalizado
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-5" ref={searchContainerRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => handleProductSearch(e.target.value)}
              onFocus={() => { if (productResults.length > 0) setShowProductDropdown(true); }}
              placeholder="Buscar producto por SKU o nombre..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Search results dropdown */}
          {showProductDropdown && productResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
              {productResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addProductFromSearch(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left cursor-pointer bg-transparent border-0 border-b border-b-slate-100 last:border-b-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={`/productos/${p.sku}-P1.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-slate-400 text-xs">—</span>'; }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded mr-2">
                      {p.sku}
                    </span>
                    <span className="text-sm text-slate-700 font-medium">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showProductDropdown && productResults.length === 0 && productSearch.length >= 2 && !searchLoading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 text-center text-sm text-slate-500">
              No se encontraron productos
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium m-0">No hay productos agregados</p>
            <p className="text-xs text-slate-400 mt-1 m-0">Busca un producto o agrega un ítem personalizado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.tempId}
                className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all bg-white/40"
              >
                <div className="flex gap-3 items-start">
                  {/* Drag handle + Image */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                    {item.image_url ? (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                          }}
                        />
                        <div className="w-full h-full items-center justify-center hidden">
                          <ImageOff className="w-5 h-5 text-slate-300" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Item fields */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.sku && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{
                          color: activeBrand.color,
                          backgroundColor: `${activeBrand.color}15`,
                        }}>
                          {item.sku}
                        </span>
                      )}
                      {item.isCustom && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Personalizado
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">#{idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.tempId, 'name', e.target.value)}
                          placeholder="Nombre del producto"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Descripción</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                          placeholder="Descripción breve"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Precio Unit.</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.tempId, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.tempId, 'quantity', e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Unidad</label>
                        <select
                          value={item.quantity_unit}
                          onChange={(e) => updateItem(item.tempId, 'quantity_unit', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all appearance-none cursor-pointer"
                        >
                          {QUANTITY_UNITS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Total</label>
                        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800">
                          {fmtMoney(round2(Number(item.unit_price || 0) * Number(item.quantity || 0)), currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeItem(item.tempId)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer bg-transparent border-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {items.length > 0 && (
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600 font-medium">Subtotal</span>
                <span className="text-sm font-bold text-slate-800">{fmtMoney(totals.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600 font-medium">IVA (16%)</span>
                <span className="text-sm font-bold text-slate-800">
                  {includesIva ? 'Incluido' : fmtMoney(totals.ivaAmount, currency)}
                </span>
              </div>
              <div
                className="flex justify-between items-center px-4 py-3 rounded-xl text-white font-bold"
                style={{ backgroundColor: activeBrand.color }}
              >
                <span className="text-sm">Total</span>
                <span className="text-lg">{fmtMoney(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CONDITIONS */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <label className="text-sm font-bold text-slate-700">Condiciones Comerciales</label>
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6a9a04] hover:bg-[#6a9a04]/5 transition-all cursor-pointer bg-transparent border border-[#6a9a04]/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar condición
          </button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-sm text-slate-400 italic m-0">No hay condiciones. Agrega una o selecciona una plantilla.</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((cond, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeBrand.color }}
                />
                <input
                  type="text"
                  value={cond}
                  onChange={(e) => updateCondition(idx, e.target.value)}
                  placeholder="Escribir condición..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none text-sm transition-all"
                />
                <button
                  onClick={() => removeCondition(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer bg-transparent border-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* NOTES */}
      {/* ============================================================ */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-1">Notas</label>
        <p className="text-xs text-slate-500 mb-3 m-0">Información adicional o aclaraciones</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notas adicionales para el cliente..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 outline-none transition-all text-sm resize-y"
        />
      </div>

      {/* ============================================================ */}
      {/* STICKY ACTIONS BAR */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/dashboard/cotizaciones"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer bg-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Borrador
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer border-0 disabled:opacity-50"
              style={{
                backgroundColor: activeBrand.color,
                boxShadow: `0 8px 24px ${activeBrand.color}40`,
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in animation for toast */}
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// =============================================================================
// Main page export wrapped in Suspense for useSearchParams
// =============================================================================
export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Cargando...</p>
      </div>
    }>
      <QuotationFormInner />
    </Suspense>
  );
}
