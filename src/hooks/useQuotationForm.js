'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import generateQuotationPDF from '@/app/(dashboard)/dashboard/cotizaciones/pdf-generator';
import { Building2, Armchair, Palette } from 'lucide-react';

// =============================================================================
// Brand configurations
// =============================================================================
export const BRANDS = [
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
export const QUANTITY_UNITS = [
  { value: 'pzs', label: 'Piezas' },
  { value: 'cajas', label: 'Cajas' },
  { value: 'rollos', label: 'Rollos' },
  { value: 'm²', label: 'm²' },
  { value: 'unidad', label: 'Unidad' },
];

// =============================================================================
// Currency formatter
// =============================================================================
export function fmtMoney(val, currency = 'MXN') {
  const num = Number(val) || 0;
  const prefix = currency === 'USD' ? 'US$' : '$';
  return `${prefix} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// =============================================================================
// Precision rounding
// =============================================================================
export function round2(x) {
  return Math.round(x * 100) / 100;
}

// =============================================================================
// Today's date in YYYY-MM-DD
// =============================================================================
export function todayStr() {
  // Hora de México (toISOString es UTC y después de las 18:00 da el día siguiente)
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

export function useQuotationForm() {
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

  const activeBrand = BRANDS.find(b => b.key === brand) || BRANDS[1];

  return {
    editId,
    brand,
    activeBrand,
    handleBrandChange,
    clientName, setClientName,
    clientCompany, setClientCompany,
    clientEmail, setClientEmail,
    clientPhone, setClientPhone,
    city, setCity,
    quoteDate, setQuoteDate,
    validityDays, setValidityDays,
    currency, setCurrency,
    includesIva, setIncludesIva,
    introText, setIntroText,
    conditions,
    addCondition,
    updateCondition,
    removeCondition,
    notes, setNotes,
    items,
    folio,
    templates,
    selectedTemplate,
    handleTemplateChange,
    productSearch,
    productResults,
    showProductDropdown,
    setShowProductDropdown,
    searchLoading,
    searchContainerRef,
    handleProductSearch,
    addProductFromSearch,
    addCustomItem,
    updateItem,
    removeItem,
    totals,
    saving,
    loading,
    toast,
    setToast,
    handleSave,
  };
}
