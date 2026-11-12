'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { validatePrice } from '@/utils/sanitize';
import { useRouter } from 'next/navigation';

const CATEGORY_LABEL_MAP = {
  Mesas: 'Mesas Plegables',
  Sillas: 'Sillas de Evento',
  Toldos: 'Toldos Profesionales',
  Bancas: 'Bancas & Mobiliario',
  Cobertizos: 'Bancas & Mobiliario',
  Deco: 'Deco',
  Spaces: 'Spaces',
};

const CATEGORY_ID_MAP = {
  'Mesas Plegables': '03af3c00-4ea8-4002-87c5-49d982357086',
  'Sillas de Evento': '0b8b416e-24f8-4d18-a140-45835bc2a9ef',
  'Toldos Profesionales': '7850f1ba-6516-4c2a-8b1e-2303b3779065',
  'Bancas & Mobiliario': 'bb2b29c6-12a5-4645-b3bc-047d5cde5983',
  'Deco': '288e382e-eaaa-4675-b96f-d576d59e1337',
};

export function getProductCategoryName(p) {
  if (p?.categories?.name) return p.categories.name;
  if (p?.category) return CATEGORY_LABEL_MAP[p.category] || p.category;
  return '';
}

export function usePrecios() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedPrices, setEditedPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Percentage modal
  const [showPercent, setShowPercent] = useState(false);
  const [percentValue, setPercentValue] = useState('');
  const [percentTarget, setPercentTarget] = useState('all');

  // CSV modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const fileInputRef = useRef(null);

  // Sort
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Price history
  const [priceHistory, setPriceHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Distributor pricing
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState('base'); // 'base' or distributor UUID
  const [distributorAddresses, setDistributorAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('default'); // 'default' or address UUID
  const [distributorPrices, setDistributorPrices] = useState({}); // { productId: customPrice }

  // Bulk CSV for distributor prices
  const [showBulkCsv, setShowBulkCsv] = useState(false);
  const [bulkCsvRows, setBulkCsvRows] = useState([]);
  const [bulkCsvErrors, setBulkCsvErrors] = useState([]);
  const [bulkCsvUploading, setBulkCsvUploading] = useState(false);
  const [bulkCsvResult, setBulkCsvResult] = useState(null);
  const [allAddresses, setAllAddresses] = useState([]);
  const bulkFileRef = useRef(null);

  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      router.push('/dashboard/pedidos');
      return;
    }

    const [productsRes, historyRes, distributorsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, sku, price, avg_cost, category, category_id, categories:category_id(name)')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('price_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100),
      supabase
        .from('profiles')
        .select('id, full_name, email, city, client_number')
        .eq('role', 'distributor')
        .eq('is_active', true)
        .order('full_name'),
    ]);

    const data = productsRes.data || [];
    setProducts(data);
    setPriceHistory(historyRes.data || []);
    setDistributors(distributorsRes.data || []);
    const cats = [...new Set(data.map(p => getProductCategoryName(p)).filter(Boolean))];
    setCategories(cats);

    // Auto-heal missing category_id in DB for products that only have text category (e.g. GL31..GL56)
    const missingCatId = data.filter(p => !p.category_id && p.category);
    if (missingCatId.length > 0) {
      Promise.all(
        missingCatId.map(p => {
          const resolvedName = getProductCategoryName(p);
          const targetCatId = CATEGORY_ID_MAP[resolvedName];
          if (!targetCatId) return Promise.resolve();
          return supabase.from('products').update({ category_id: targetCatId }).eq('id', p.id);
        })
      ).catch(() => {});
    }

    // Fetch all addresses for bulk upload
    const { data: allAddr } = await supabase
      .from('distributor_addresses')
      .select('id, distributor_id, label, city, state')
      .order('label');
    setAllAddresses(allAddr || []);

    setLoading(false);
  };

  const loadDistributorPrices = async (distributorId, addressId) => {
    // Fetch prices: first specific address, then fallback to default (null address)
    let query = supabase
      .from('distributor_prices')
      .select('product_id, custom_price, address_id')
      .eq('distributor_id', distributorId);

    if (addressId) {
      // Get both address-specific and default prices
      query = query.or(`address_id.eq.${addressId},address_id.is.null`);
    } else {
      query = query.is('address_id', null);
    }

    const { data } = await query;
    const priceMap = {};
    // First set defaults (null address)
    (data || []).filter(d => d.address_id === null).forEach(d => {
      priceMap[d.product_id] = d.custom_price;
    });
    // Then override with address-specific
    if (addressId) {
      (data || []).filter(d => d.address_id === addressId).forEach(d => {
        priceMap[d.product_id] = d.custom_price;
      });
    }
    setDistributorPrices(priceMap);
    setEditedPrices({});
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch addresses when distributor changes
  useEffect(() => {
    if (selectedDistributor === 'base') {
      setDistributorAddresses([]);
      setSelectedAddress('default');
      setDistributorPrices({});
      return;
    }
    const fetchAddresses = async () => {
      const { data } = await supabase
        .from('distributor_addresses')
        .select('*')
        .eq('distributor_id', selectedDistributor)
        .order('is_default', { ascending: false });
      setDistributorAddresses(data || []);
      setSelectedAddress('default');
      // Load default (null address) prices
      loadDistributorPrices(selectedDistributor, null);
    };
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistributor]);

  // Fetch custom prices when address changes
  useEffect(() => {
    if (selectedDistributor === 'base') return;
    const addressId = selectedAddress === 'default' ? null : selectedAddress;
    loadDistributorPrices(selectedDistributor, addressId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress]);

  // Get current effective price for a product
  const getCurrentPrice = (product) => {
    if (selectedDistributor === 'base') return product.price;
    return distributorPrices[product.id] ?? product.price;
  };

  const hasCustomPrice = (product) => {
    return selectedDistributor !== 'base' && distributorPrices[product.id] !== undefined;
  };

  // --- Save edited prices ---
  const handleSaveAll = async () => {
    const entries = Object.entries(editedPrices);
    if (entries.length === 0) return;
    setSaving(true);

    if (selectedDistributor === 'base') {
      // Save to products table (base prices)
      const errors = [];
      for (const [id, newPrice] of entries) {
        const validPrice = validatePrice(newPrice);
        if (validPrice === null || validPrice <= 0) {
          const product = products.find(p => p.id === id);
          errors.push(`Precio inválido para ${product?.name || id}: debe ser mayor a 0`);
          continue;
        }
        const { error } = await supabase
          .from('products')
          .update({ price: validPrice })
          .eq('id', id);
        if (error) errors.push(error.message);
      }

      if (errors.length) {
        alert('Algunos errores: ' + errors.join(', '));
      } else {
        setEditedPrices({});
        await fetchData();
      }
    } else {
      // Save to distributor_prices table
      const addressId = selectedAddress === 'default' ? null : selectedAddress;
      const errors = [];
      for (const [productId, newPrice] of entries) {
        const validPrice = validatePrice(newPrice);
        if (validPrice === null || validPrice <= 0) {
          const product = products.find(p => p.id === productId);
          errors.push(`Precio inválido para ${product?.name || productId}`);
          continue;
        }

        // Check if row already exists
        let findQuery = supabase
          .from('distributor_prices')
          .select('id')
          .eq('distributor_id', selectedDistributor)
          .eq('product_id', productId);
        if (addressId) {
          findQuery = findQuery.eq('address_id', addressId);
        } else {
          findQuery = findQuery.is('address_id', null);
        }
        const { data: existing } = await findQuery.maybeSingle();

        let error;
        if (existing) {
          ({ error } = await supabase
            .from('distributor_prices')
            .update({ custom_price: validPrice, updated_at: new Date().toISOString() })
            .eq('id', existing.id));
        } else {
          ({ error } = await supabase
            .from('distributor_prices')
            .insert({
              distributor_id: selectedDistributor,
              product_id: productId,
              address_id: addressId,
              custom_price: validPrice,
            }));
        }
        if (error) errors.push(error.message);
      }

      if (errors.length) {
        alert('Algunos errores: ' + errors.join(', '));
      } else {
        setEditedPrices({});
        await loadDistributorPrices(selectedDistributor, addressId);
      }
    }
    setSaving(false);
  };

  // --- Apply percentage ---
  const handleApplyPercent = async () => {
    const pct = parseFloat(percentValue);
    if (isNaN(pct) || pct === 0) return;

    const targetProducts = percentTarget === 'all'
      ? products
      : products.filter(p => getProductCategoryName(p) === percentTarget);

    const newEdits = { ...editedPrices };
    targetProducts.forEach(p => {
      const currentPrice = getCurrentPrice(p);
      const current = editedPrices[p.id] !== undefined ? parseFloat(editedPrices[p.id]) : currentPrice;
      const newPrice = Math.round(current * (1 + pct / 100) * 100) / 100;
      newEdits[p.id] = newPrice;
    });

    setEditedPrices(newEdits);
    setShowPercent(false);
    setPercentValue('');
  };

  // --- CSV Line Parser (handles quoted fields with commas inside) ---
  const parseCsvLine = (line, delimiter = ',') => {
    if (delimiter !== ',') return line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const cleanPrice = (raw) => parseFloat((raw || '').replace(/[$,\s]/g, ''));

  // --- CSV Import ---
  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0].toLowerCase();

      // Detect separator
      const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ',';
      const rows = lines.slice(1).map(l => {
        const parts = parseCsvLine(l, sep);
        return { sku: (parts[0] || '').trim(), price: cleanPrice(parts[1]) };
      }).filter(r => r.sku && !isNaN(r.price) && r.price > 0);

      setCsvPreview(rows);
      setCsvData(rows);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyCsv = () => {
    if (!csvData) return;
    const newEdits = { ...editedPrices };
    let matched = 0;
    const unmatched = [];
    csvData.forEach(row => {
      const product = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
      if (product) {
        newEdits[product.id] = row.price;
        matched++;
      } else {
        unmatched.push(row.sku);
      }
    });
    setEditedPrices(newEdits);
    setShowCsvModal(false);
    setCsvData(null);
    setCsvPreview([]);
    if (unmatched.length > 0) {
      alert(`Se actualizaron ${matched} de ${csvData.length} productos.\n\nSKUs NO encontrados (${unmatched.length}):\n${unmatched.join(', ')}\n\nRevisa la consola (F12) para más detalles.`);
    } else {
      alert(`Se actualizaron ${matched} de ${csvData.length} productos del CSV.`);
    }
  };

  // --- Export CSV ---
  const handleExportCsv = () => {
    const header = 'SKU,Nombre,Precio\n';
    const rows = products.map(p => {
      const price = selectedDistributor === 'base' ? p.price : (distributorPrices[p.id] ?? p.price);
      return `${p.sku || ''},${p.name},${price}`;
    }).join('\n');
    const distName = selectedDistributor === 'base' ? 'base' : distributors.find(d => d.id === selectedDistributor)?.full_name || 'distribuidor';
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precios_${distName.replace(/\s+/g, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- BULK CSV for multiple distributors ---
  const handleBulkCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setBulkCsvErrors(['El archivo está vacío.']);
        setShowBulkCsv(true);
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
      const headers = parseCsvLine(lines[0], delimiter);
      const headersLower = headers.map(h => h.toLowerCase());

      const clientIdx = headersLower.findIndex(h => ['id_cliente', 'id cliente', 'cliente', 'client_number', 'distribuidor'].includes(h));
      const addrIdx = headersLower.findIndex(h => ['dirección', 'direccion', 'address', 'alias', 'label', 'etiqueta'].includes(h));
      const skuIdx = headersLower.findIndex(h => h === 'sku' || h === 'código' || h === 'codigo');
      const priceIdx = headersLower.findIndex(h => ['precio', 'price', 'precio_especial', 'custom_price'].includes(h));

      if (clientIdx === -1 || skuIdx === -1 || priceIdx === -1) {
        setBulkCsvErrors([`Columnas requeridas no encontradas. Encontradas: [${headers.join(', ')}]. Se necesitan: ID_Cliente, SKU, Precio (Dirección es opcional).`]);
        setBulkCsvRows([]);
        setShowBulkCsv(true);
        return;
      }

      const errors = [];
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i], delimiter);
        const clientNum = cols[clientIdx]?.toUpperCase();
        const sku = cols[skuIdx]?.toUpperCase();
        const price = cleanPrice(cols[priceIdx]);
        const addrAlias = addrIdx !== -1 ? cols[addrIdx] : null;

        if (!clientNum || !sku) continue;

        const dist = distributors.find(d => d.client_number?.toUpperCase() === clientNum);
        if (!dist) { errors.push(`Fila ${i + 1}: Cliente "${clientNum}" no encontrado`); continue; }

        const product = products.find(p => p.sku?.toUpperCase() === sku);
        if (!product) { errors.push(`Fila ${i + 1}: SKU "${sku}" no encontrado`); continue; }

        if (isNaN(price) || price <= 0) { errors.push(`Fila ${i + 1}: Precio inválido "${cols[priceIdx]}"`); continue; }

        // Normalize: strip accents for fuzzy fallback matching
        const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        let addressId = null;
        let addressName = 'Por defecto';
        if (addrAlias && norm(addrAlias) !== 'default' && norm(addrAlias) !== 'por defecto') {
          let addr = allAddresses.find(a => a.distributor_id === dist.id && a.label?.toLowerCase().trim() === addrAlias.toLowerCase().trim());
          if (!addr) addr = allAddresses.find(a => a.distributor_id === dist.id && norm(a.label) === norm(addrAlias));
          if (!addr) { errors.push(`Fila ${i + 1}: Dirección "${addrAlias}" no encontrada para ${clientNum}`); continue; }
          addressId = addr.id;
          addressName = addr.label;
        }

        rows.push({
          clientNum,
          distributorId: dist.id,
          distributorName: dist.full_name,
          sku,
          productId: product.id,
          productName: product.name,
          addressId,
          addressName,
          price,
        });
      }

      setBulkCsvRows(rows);
      setBulkCsvErrors(errors);
      setBulkCsvResult(null);
      setShowBulkCsv(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkCsvUpload = async () => {
    setBulkCsvUploading(true);
    let success = 0, failed = 0;
    const failedErrors = [];
    for (const row of bulkCsvRows) {
      let query = supabase
        .from('distributor_prices')
        .select('id')
        .eq('distributor_id', row.distributorId)
        .eq('product_id', row.productId);
      if (row.addressId) {
        query = query.eq('address_id', row.addressId);
      } else {
        query = query.is('address_id', null);
      }
      const { data: existing } = await query.maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('distributor_prices')
          .update({ custom_price: row.price, updated_at: new Date().toISOString() })
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase
          .from('distributor_prices')
          .insert({
            distributor_id: row.distributorId,
            product_id: row.productId,
            address_id: row.addressId,
            custom_price: row.price,
          }));
      }
      if (error) {
        failed++;
        if (failedErrors.length < 5) failedErrors.push(`${row.clientNum}/${row.sku}: ${error.message}`);
      } else {
        success++;
      }
    }
    setBulkCsvResult({ success, failed, errors: failedErrors });
    setBulkCsvUploading(false);
  };

  const downloadBulkTemplate = () => {
    const rows = ['ID_Cliente,Dirección,SKU,Precio'];
    distributors.forEach(d => {
      if (!d.client_number) return;
      const addrs = allAddresses.filter(a => a.distributor_id === d.id);
      products.slice(0, 2).forEach(p => {
        rows.push(`${d.client_number},Por defecto,${p.sku},${p.price}`);
      });
      addrs.forEach(addr => {
        products.slice(0, 2).forEach(p => {
          rows.push(`${d.client_number},${addr.label || addr.city || ''},${p.sku},${p.price}`);
        });
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_precios_distribuidores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy base prices to distributor
  const handleCopyBasePrices = () => {
    const newEdits = {};
    products.forEach(p => {
      newEdits[p.id] = p.price;
    });
    setEditedPrices(newEdits);
  };

  // --- Sorting ---
  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // --- Filter & Sort ---
  const filteredProducts = products
    .filter(p => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s);
      const matchCat = selectedCategory === 'all' || getProductCategoryName(p) === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name; vb = b.name; }
      else if (sortBy === 'sku') { va = a.sku || ''; vb = b.sku || ''; }
      else if (sortBy === 'price') { va = getCurrentPrice(a); vb = getCurrentPrice(b); }
      else if (sortBy === 'avg_cost') { va = Number(a.avg_cost) || 0; vb = Number(b.avg_cost) || 0; }
      else { va = a.name; vb = b.name; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const editCount = Object.keys(editedPrices).length;
  const isDistributorMode = selectedDistributor !== 'base';

  return {
    products,
    filteredProducts,
    loading,
    searchTerm,
    setSearchTerm,
    editedPrices,
    setEditedPrices,
    saving,
    categories,
    selectedCategory,
    setSelectedCategory,
    showPercent,
    setShowPercent,
    percentValue,
    setPercentValue,
    percentTarget,
    setPercentTarget,
    showCsvModal,
    setShowCsvModal,
    csvData,
    setCsvData,
    csvPreview,
    setCsvPreview,
    fileInputRef,
    sortBy,
    sortDir,
    handleSort,
    priceHistory,
    showHistory,
    setShowHistory,
    distributors,
    selectedDistributor,
    setSelectedDistributor,
    distributorAddresses,
    selectedAddress,
    setSelectedAddress,
    distributorPrices,
    showBulkCsv,
    setShowBulkCsv,
    bulkCsvRows,
    setBulkCsvRows,
    bulkCsvErrors,
    setBulkCsvErrors,
    bulkCsvUploading,
    bulkCsvResult,
    setBulkCsvResult,
    bulkFileRef,
    editCount,
    isDistributorMode,
    getCurrentPrice,
    hasCustomPrice,
    handleSaveAll,
    handleApplyPercent,
    handleCsvFile,
    handleApplyCsv,
    handleExportCsv,
    handleBulkCsvFile,
    handleBulkCsvUpload,
    downloadBulkTemplate,
    handleCopyBasePrices,
  };
}

