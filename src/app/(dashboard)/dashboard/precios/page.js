'use client';
import { createClient } from '@/utils/supabase/client';
import { validatePrice } from '@/utils/sanitize';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    DollarSign, Search, Save, Upload, Percent, X, Check,
    AlertTriangle, Package, ArrowUpDown, Download, FileSpreadsheet, History, ChevronDown, ChevronUp, Users, MapPin
} from 'lucide-react';

export default function PreciosPage() {
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
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') { router.push('/dashboard/pedidos'); return; }

        const [productsRes, historyRes, distributorsRes] = await Promise.all([
            supabase
                .from('products')
                .select('id, name, sku, price, category_id, categories:category_id(name)')
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
                .order('full_name')
        ]);

        const data = productsRes.data || [];
        setProducts(data);
        setPriceHistory(historyRes.data || []);
        setDistributors(distributorsRes.data || []);
        const cats = [...new Set(data.map(p => p.categories?.name).filter(Boolean))];
        setCategories(cats);

        // Fetch all addresses for bulk upload
        const { data: allAddr } = await supabase
            .from('distributor_addresses')
            .select('id, distributor_id, label, city, state')
            .order('label');
        setAllAddresses(allAddr || []);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

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
    }, [selectedDistributor]);

    // Fetch custom prices when address changes
    useEffect(() => {
        if (selectedDistributor === 'base') return;
        const addressId = selectedAddress === 'default' ? null : selectedAddress;
        loadDistributorPrices(selectedDistributor, addressId);
    }, [selectedAddress]);

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

    // --- Save edited prices ---
    const handleSaveAll = async () => {
        const entries = Object.entries(editedPrices);
        if (entries.length === 0) return;
        setSaving(true);

        if (selectedDistributor === 'base') {
            // Save to products table (base prices)
            let errors = [];
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
            let errors = [];
            for (const [productId, newPrice] of entries) {
                const validPrice = validatePrice(newPrice);
                if (validPrice === null || validPrice <= 0) {
                    const product = products.find(p => p.id === productId);
                    errors.push(`Precio inválido para ${product?.name || productId}`);
                    continue;
                }

                // Check if row already exists
                let findQuery = supabase.from('distributor_prices').select('id')
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
                    ({ error } = await supabase.from('distributor_prices')
                        .update({ custom_price: validPrice, updated_at: new Date().toISOString() })
                        .eq('id', existing.id));
                } else {
                    ({ error } = await supabase.from('distributor_prices')
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
            : products.filter(p => p.categories?.name === percentTarget);

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
        console.log('[CSV Debug] Products in system:', products.map(p => p.sku));
        csvData.forEach(row => {
            const product = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
            if (product) {
                newEdits[product.id] = row.price;
                matched++;
            } else {
                unmatched.push(row.sku);
                console.log(`[CSV Debug] SKU NOT FOUND: "${row.sku}" (charCodes: ${[...row.sku].map(c => c.charCodeAt(0)).join(',')})`);
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
            if (lines.length < 2) { setBulkCsvErrors(['El archivo está vacío.']); setShowBulkCsv(true); return; }

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

                let addressId = null;
                let addressName = 'Por defecto';
                if (addrAlias && addrAlias.toLowerCase() !== 'default' && addrAlias.toLowerCase() !== 'por defecto') {
                    const addr = allAddresses.find(a => a.distributor_id === dist.id && a.label?.toLowerCase() === addrAlias.toLowerCase());
                    if (!addr) { errors.push(`Fila ${i + 1}: Dirección "${addrAlias}" no encontrada para ${clientNum}`); continue; }
                    addressId = addr.id;
                    addressName = addr.label;
                }

                rows.push({
                    clientNum, distributorId: dist.id, distributorName: dist.full_name,
                    sku, productId: product.id, productName: product.name,
                    addressId, addressName, price
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
            // Check if exists
            let query = supabase.from('distributor_prices').select('id')
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
                ({ error } = await supabase.from('distributor_prices')
                    .update({ custom_price: row.price, updated_at: new Date().toISOString() })
                    .eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('distributor_prices')
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
            // Default (no specific address)
            products.slice(0, 2).forEach(p => {
                rows.push(`${d.client_number},Por defecto,${p.sku},${p.price}`);
            });
            // Each registered address
            addrs.forEach(addr => {
                products.slice(0, 2).forEach(p => {
                    rows.push(`${d.client_number},${addr.label || addr.city || ''},${p.sku},${p.price}`);
                });
            });
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'plantilla_precios_distribuidores.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
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

    // Get current effective price for a product
    const getCurrentPrice = (product) => {
        if (selectedDistributor === 'base') return product.price;
        return distributorPrices[product.id] ?? product.price;
    };

    const hasCustomPrice = (product) => {
        return selectedDistributor !== 'base' && distributorPrices[product.id] !== undefined;
    };

    // --- Filter & Sort ---
    const filteredProducts = products
        .filter(p => {
            const s = searchTerm.toLowerCase();
            const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s);
            const matchCat = selectedCategory === 'all' || p.categories?.name === selectedCategory;
            return matchSearch && matchCat;
        })
        .sort((a, b) => {
            let va, vb;
            if (sortBy === 'name') { va = a.name; vb = b.name; }
            else if (sortBy === 'sku') { va = a.sku || ''; vb = b.sku || ''; }
            else if (sortBy === 'price') { va = getCurrentPrice(a); vb = getCurrentPrice(b); }
            else { va = a.name; vb = b.name; }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === 'asc' ? va - vb : vb - va;
        });

    const editCount = Object.keys(editedPrices).length;
    const isDistributorMode = selectedDistributor !== 'base';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
                <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
                <p>Cargando precios...</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Gestión de Precios</h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">
                            Edita precios base o configura precios personalizados por distribuidor y destino.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Export */}
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar CSV
                        </button>
                        {/* Import */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-all"
                        >
                            <Upload className="w-3.5 h-3.5" /> Importar CSV
                        </button>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCsvFile} className="hidden" />
                        {/* Percentage */}
                        <button
                            onClick={() => setShowPercent(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-all"
                        >
                            <Percent className="w-3.5 h-3.5" /> Ajuste %
                        </button>
                        {/* Copy base prices */}
                        {isDistributorMode && (
                            <button
                                onClick={handleCopyBasePrices}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-all"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Copiar Precios Base
                            </button>
                        )}
                        {/* Bulk CSV Upload */}
                        <input ref={bulkFileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleBulkCsvFile} className="hidden" />
                        <button
                            onClick={() => bulkFileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/5 border border-[#6a9a04]/30 hover:bg-[#6a9a04]/15 cursor-pointer transition-all"
                        >
                            <Upload className="w-3.5 h-3.5" /> Carga Masiva
                        </button>
                        <button
                            onClick={downloadBulkTemplate}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" /> Plantilla
                        </button>
                        {/* Save */}
                        {editCount > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Guardando...' : `Guardar ${editCount} cambio${editCount > 1 ? 's' : ''}`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Distributor + Address Selector */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                <Users className="w-3 h-3" /> Distribuidor
                            </label>
                            <select
                                value={selectedDistributor}
                                onChange={(e) => { setSelectedDistributor(e.target.value); setEditedPrices({}); }}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
                            >
                                <option value="base">📋 Precios Base (General)</option>
                                {distributors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.full_name} {d.city ? `— ${d.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isDistributorMode && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <MapPin className="w-3 h-3" /> Dirección de Envío
                                </label>
                                <select
                                    value={selectedAddress}
                                    onChange={(e) => { setSelectedAddress(e.target.value); setEditedPrices({}); }}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
                                >
                                    <option value="default">🏠 Precio default del distribuidor</option>
                                    {distributorAddresses.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.label} — {a.city}, {a.state}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isDistributorMode && (
                            <div className="flex items-center gap-2 pb-0.5">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${Object.keys(distributorPrices).length > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {Object.keys(distributorPrices).length} precios personalizados
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm placeholder:text-slate-400 text-slate-800 outline-none shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${selectedCategory === 'all'
                                ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/20'
                                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white cursor-pointer'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${selectedCategory === cat
                                    ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/20'
                                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pending changes banner */}
                {editCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-bold text-amber-700">
                                {editCount} precio{editCount > 1 ? 's' : ''} modificado{editCount > 1 ? 's' : ''} sin guardar
                                {isDistributorMode && <span className="text-amber-500 font-normal"> (distribuidor)</span>}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditedPrices({})}
                                className="px-3 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="px-3 py-1 text-xs font-bold text-white bg-[#6a9a04] rounded-lg cursor-pointer hover:bg-[#6a9a04]/90 border-none disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Todo'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                        <span className="flex items-center gap-1">Producto <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('sku')}>
                                        <span className="flex items-center gap-1">SKU <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Categoría</th>
                                    {isDistributorMode && (
                                        <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-400">Precio Base</th>
                                    )}
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none" onClick={() => handleSort('price')}>
                                        <span className="flex items-center gap-1">
                                            {isDistributorMode ? 'Precio Distribuidor' : 'Precio Actual'} <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Nuevo Precio</th>
                                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.length === 0 ? (
                                    <tr><td colSpan={isDistributorMode ? 7 : 6} className="px-6 py-12 text-center text-slate-400">No se encontraron productos.</td></tr>
                                ) : (
                                    filteredProducts.map(product => {
                                        const currentPrice = getCurrentPrice(product);
                                        const hasEdit = editedPrices[product.id] !== undefined;
                                        const newPrice = hasEdit ? parseFloat(editedPrices[product.id]) : currentPrice;
                                        const diff = newPrice - currentPrice;
                                        const diffPct = currentPrice > 0 ? ((diff / currentPrice) * 100).toFixed(1) : 0;
                                        const isCustom = hasCustomPrice(product);
                                        return (
                                            <tr key={product.id} className={`transition-colors ${hasEdit ? 'bg-amber-50/50' : 'hover:bg-white/50'}`}>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <Package className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-900">{product.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                                                        {product.categories?.name || '—'}
                                                    </span>
                                                </td>
                                                {isDistributorMode && (
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-slate-400">
                                                            ${Number(product.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-sm font-black ${hasEdit ? 'text-slate-400 line-through' : isCustom ? 'text-blue-600' : 'text-slate-900'}`}>
                                                            ${Number(currentPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        {isCustom && !hasEdit && (
                                                            <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded">CUSTOM</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={hasEdit ? editedPrices[product.id] : ''}
                                                            placeholder={currentPrice.toString()}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || parseFloat(val) === currentPrice) {
                                                                    setEditedPrices(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                                                } else {
                                                                    setEditedPrices(prev => ({ ...prev, [product.id]: val }));
                                                                }
                                                            }}
                                                            className={`w-32 pl-7 pr-3 py-1.5 text-sm font-bold rounded-lg border outline-none transition-all ${hasEdit
                                                                ? 'border-[#6a9a04] bg-white text-[#6a9a04] ring-2 ring-[#6a9a04]/20'
                                                                : 'border-slate-200 bg-white/50 text-slate-700 focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20'
                                                                }`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {hasEdit ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-sm font-black ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff > 0 ? 'bg-green-50 text-green-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                                                                }`}>
                                                                {diff > 0 ? '+' : ''}{diffPct}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500 m-0">
                            {filteredProducts.length} productos · {editCount} modificados
                            {isDistributorMode && ` · ${Object.keys(distributorPrices).length} con precio custom`}
                        </p>
                    </div>
                </div>

                {/* Price History Section */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden mt-6">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-transparent border-none cursor-pointer hover:bg-white/30 transition-colors"
                    >
                        <h4 className="font-bold text-slate-900 m-0 flex items-center gap-2 text-sm">
                            <History className="w-4 h-4 text-[#6a9a04]" /> Historial de Cambios de Precio
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{priceHistory.length}</span>
                        </h4>
                        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {showHistory && (
                        <div className="border-t border-slate-200">
                            {priceHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Precio Anterior</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">→</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Precio Nuevo</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cambio</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {priceHistory.map(h => {
                                                const product = products.find(p => p.id === h.product_id);
                                                const diff = (h.new_price || 0) - (h.old_price || 0);
                                                const pct = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '—';
                                                return (
                                                    <tr key={h.id} className="hover:bg-white/50 transition-colors">
                                                        <td className="px-5 py-2.5">
                                                            <span className="font-bold text-sm text-slate-900">{product?.name || 'Producto eliminado'}</span>
                                                            <span className="text-[10px] text-slate-400 ml-2 font-mono">{product?.sku || ''}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-500">
                                                            ${Number(h.old_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center text-slate-300">→</td>
                                                        <td className="px-3 py-2.5 text-sm font-black text-slate-900">
                                                            ${Number(h.new_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-green-50 text-green-600' : diff < 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                                                                }`}>
                                                                {diff > 0 ? '+' : ''}{pct}%
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-[11px] text-slate-400">
                                                            {new Date(h.changed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-slate-400">
                                    No hay cambios de precios registrados aún. Los cambios se registrarán automáticamente al guardar.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Percentage Modal */}
            {showPercent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-[420px] rounded-2xl shadow-2xl border border-white overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                                <Percent className="w-5 h-5 text-purple-600" /> Ajuste Porcentual
                            </h3>
                            <button onClick={() => setShowPercent(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Aplicar a</label>
                                <select
                                    value={percentTarget}
                                    onChange={(e) => setPercentTarget(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 text-slate-800 outline-none shadow-sm"
                                >
                                    <option value="all">Todos los productos</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Porcentaje</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={percentValue}
                                        onChange={(e) => setPercentValue(e.target.value)}
                                        placeholder="Ej. 10 para +10%, -5 para -5%"
                                        autoFocus
                                        className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 text-slate-800 outline-none text-lg shadow-sm"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                </div>
                                <small className="block mt-1 text-xs text-slate-400">
                                    Positivo para subir, negativo para bajar. Los cambios se aplican a la columna "Nuevo Precio" sin guardar.
                                </small>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowPercent(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                >Cancelar</button>
                                <button onClick={handleApplyPercent} disabled={!percentValue}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/30 cursor-pointer transition-all border-none disabled:opacity-50"
                                >
                                    Aplicar Ajuste
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Preview Modal */}
            {showCsvModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-[550px] rounded-2xl shadow-2xl border border-white overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Previsualización CSV
                                {isDistributorMode && (
                                    <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                        → {distributors.find(d => d.id === selectedDistributor)?.full_name}
                                    </span>
                                )}
                            </h3>
                            <button onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                                className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Se encontraron <strong>{csvPreview.length}</strong> filas. Los SKUs que coincidan con productos existentes se actualizarán.
                            </p>
                            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 sticky top-0">
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">SKU</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Nuevo Precio</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Match</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {csvPreview.slice(0, 50).map((row, i) => {
                                            const match = products.find(p => p.sku?.toLowerCase() === row.sku.toLowerCase());
                                            return (
                                                <tr key={i} className={match ? '' : 'bg-red-50/50'}>
                                                    <td className="px-4 py-2 font-mono text-xs">{row.sku}</td>
                                                    <td className="px-4 py-2 font-bold text-[#6a9a04]">${row.price.toFixed(2)}</td>
                                                    <td className="px-4 py-2">
                                                        {match ? (
                                                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> {match.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-red-400">No encontrado</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => { setShowCsvModal(false); setCsvData(null); setCsvPreview([]); }}
                                    className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                >Cancelar</button>
                                <button onClick={handleApplyCsv}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 cursor-pointer transition-all border-none flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Aplicar Precios del CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk CSV Modal */}
            {showBulkCsv && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
                    <div className="bg-white/95 backdrop-blur-xl border border-white max-w-[800px] w-full rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-white/50">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-[#6a9a04]" />
                                <h3 className="text-lg font-bold text-slate-900 m-0">Carga Masiva — Precios por Distribuidor</h3>
                            </div>
                            <button onClick={() => { setShowBulkCsv(false); setBulkCsvRows([]); setBulkCsvErrors([]); setBulkCsvResult(null); }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-5 space-y-4">
                            {bulkCsvErrors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-sm font-bold text-red-700 mb-2 m-0 flex items-center gap-2"><AlertTriangle size={14} /> {bulkCsvErrors.length} error(es)</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {bulkCsvErrors.map((e, i) => <p key={i} className="text-xs text-red-600 m-0">{e}</p>)}
                                    </div>
                                </div>
                            )}

                            {bulkCsvResult && (
                                <div className={`border rounded-xl p-4 ${bulkCsvResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                                    <p className="text-sm font-bold m-0 flex items-center gap-2">
                                        {bulkCsvResult.failed === 0 ? <Check size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                                        {bulkCsvResult.success} precios actualizados
                                        {bulkCsvResult.failed > 0 && `, ${bulkCsvResult.failed} fallaron`}
                                    </p>
                                    {bulkCsvResult.errors?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {bulkCsvResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600 m-0">{err}</p>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {bulkCsvRows.length > 0 && !bulkCsvResult && (
                                <>
                                    <p className="text-sm text-slate-600 font-medium m-0">{bulkCsvRows.length} precios listos para aplicar:</p>
                                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                                                    <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Dirección</th>
                                                    <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">SKU</th>
                                                    <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Producto</th>
                                                    <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bulkCsvRows.slice(0, 50).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 text-sm"><span className="font-mono font-bold text-[#6a9a04]">{row.clientNum}</span> <span className="text-slate-400 text-xs">{row.distributorName}</span></td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">{row.addressName}</td>
                                                        <td className="px-3 py-2 text-sm font-mono text-slate-500">{row.sku}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-700">{row.productName}</td>
                                                        <td className="px-3 py-2 text-sm font-bold text-slate-900 text-right">${row.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {bulkCsvRows.length > 50 && <p className="text-xs text-slate-400 text-center py-2 m-0">...y {bulkCsvRows.length - 50} más</p>}
                                    </div>
                                </>
                            )}

                            {bulkCsvRows.length === 0 && bulkCsvErrors.length === 0 && !bulkCsvResult && (
                                <p className="text-center text-slate-400 py-8 m-0">No se encontraron datos válidos.</p>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => { setShowBulkCsv(false); setBulkCsvRows([]); setBulkCsvErrors([]); setBulkCsvResult(null); }}
                                className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                                {bulkCsvResult ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {bulkCsvRows.length > 0 && !bulkCsvResult && (
                                <button onClick={handleBulkCsvUpload} disabled={bulkCsvUploading}
                                    className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2">
                                    {bulkCsvUploading ? <Save size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {bulkCsvUploading ? 'Aplicando...' : `Aplicar ${bulkCsvRows.length} precios`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
