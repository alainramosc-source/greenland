'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Recycle, Package, DollarSign, TrendingUp, Settings, Plus, Edit3, Trash2,
  ShoppingCart, Send, Filter, Calendar, Loader2, Check, X, BarChart3,
  Search, ChevronDown, Save, ToggleLeft, ToggleRight, Phone, FileText, Users, Weight, Download
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function RecyclingPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('compra');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data
  const [materialTypes, setMaterialTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);

  // Purchase form
  const [purchaseForm, setPurchaseForm] = useState({
    material_type_id: '', supplier_name: 'Público en General', quantity_kg: '', price_per_kg: '', notes: ''
  });
  const [supplierSearch, setSupplierSearch] = useState('Público en General');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  // Buyer PIN modal state
  const [activeBuyer, setActiveBuyer] = useState(null);
  const [showBuyerPinModal, setShowBuyerPinModal] = useState(false);
  const [buyerPinInput, setBuyerPinInput] = useState('');
  const [buyerModalError, setBuyerModalError] = useState('');
  const [verifyingBuyer, setVerifyingBuyer] = useState(false);
  const [rememberBuyer, setRememberBuyer] = useState(true);
  const [pendingPurchaseAction, setPendingPurchaseAction] = useState(false);

  // Sale modal
  const [saleModal, setSaleModal] = useState(null);
  const [saleForm, setSaleForm] = useState({
    quantity_kg: '', price_per_kg: '', buyer_name: '', notes: ''
  });
  const [submittingSale, setSubmittingSale] = useState(false);

  // History filters
  const [historyFilter, setHistoryFilter] = useState({ type: 'all', material: 'all', dateFrom: '', dateTo: '' });

  // Config
  const [newMaterial, setNewMaterial] = useState({ name: '', buy_price_per_kg: '' });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', notes: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [matRes, supRes, purRes, salRes] = await Promise.all([
      supabase.from('recycling_material_types').select('*').order('name'),
      supabase.from('recycling_suppliers').select('*').order('name'),
      supabase.from('recycling_purchases').select('*, recycling_material_types(name)').order('created_at', { ascending: false }),
      supabase.from('recycling_sales').select('*, recycling_material_types(name)').order('created_at', { ascending: false }),
    ]);
    if (matRes.data) setMaterialTypes(matRes.data);
    if (supRes.data) setSuppliers(supRes.data);
    if (purRes.data) setPurchases(purRes.data);
    if (salRes.data) setSales(salRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ========== COMPUTED VALUES ==========

  const activeMaterials = useMemo(() => materialTypes.filter(m => m.is_active), [materialTypes]);

  const stockByMaterial = useMemo(() => {
    const map = {};
    materialTypes.forEach(m => {
      map[m.id] = { ...m, purchased_kg: 0, sold_kg: 0, total_invested: 0, total_sold_amount: 0, cost_of_sold: 0 };
    });
    purchases.forEach(p => {
      if (map[p.material_type_id]) {
        map[p.material_type_id].purchased_kg += Number(p.quantity_kg);
        map[p.material_type_id].total_invested += Number(p.total_amount);
      }
    });
    sales.forEach(s => {
      if (map[s.material_type_id]) {
        map[s.material_type_id].sold_kg += Number(s.quantity_kg);
        map[s.material_type_id].total_sold_amount += Number(s.total_amount);
      }
    });
    // Calculate cost of goods sold using weighted average cost
    Object.values(map).forEach(m => {
      if (m.purchased_kg > 0) {
        const avgCost = m.total_invested / m.purchased_kg;
        m.cost_of_sold = avgCost * m.sold_kg;
      }
    });
    return map;
  }, [materialTypes, purchases, sales]);

  const stockArray = useMemo(() => Object.values(stockByMaterial).filter(m => m.is_active || m.purchased_kg > 0), [stockByMaterial]);

  const totals = useMemo(() => {
    const totalStockKg = stockArray.reduce((s, m) => s + (m.purchased_kg - m.sold_kg), 0);
    const totalEstimatedValue = stockArray.reduce((s, m) => s + ((m.purchased_kg - m.sold_kg) * Number(m.buy_price_per_kg)), 0);
    const totalInvested = stockArray.reduce((s, m) => s + m.total_invested, 0);
    const totalSold = stockArray.reduce((s, m) => s + m.total_sold_amount, 0);
    const totalCostOfSold = stockArray.reduce((s, m) => s + m.cost_of_sold, 0);
    const grossProfit = totalSold - totalCostOfSold;
    return { totalStockKg, totalEstimatedValue, totalInvested, totalSold, grossProfit, totalCostOfSold };
  }, [stockArray]);

  const purchaseTotal = useMemo(() => {
    const qty = parseFloat(purchaseForm.quantity_kg) || 0;
    const price = parseFloat(purchaseForm.price_per_kg) || 0;
    return qty * price;
  }, [purchaseForm.quantity_kg, purchaseForm.price_per_kg]);

  const saleTotal = useMemo(() => {
    const qty = parseFloat(saleForm.quantity_kg) || 0;
    const price = parseFloat(saleForm.price_per_kg) || 0;
    return qty * price;
  }, [saleForm.quantity_kg, saleForm.price_per_kg]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers.filter(s => s.is_active);
    return suppliers.filter(s => s.is_active && s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
  }, [suppliers, supplierSearch]);

  const historyItems = useMemo(() => {
    const items = [];
    purchases.forEach(p => {
      items.push({
        id: p.id, type: 'compra', date: p.created_at, material: p.recycling_material_types?.name || '—',
        material_type_id: p.material_type_id, quantity_kg: p.quantity_kg, price_per_kg: p.price_per_kg,
        total_amount: p.total_amount, who: p.supplier_name || '—', number: p.purchase_number
      });
    });
    sales.forEach(s => {
      items.push({
        id: s.id, type: 'venta', date: s.created_at, material: s.recycling_material_types?.name || '—',
        material_type_id: s.material_type_id, quantity_kg: s.quantity_kg, price_per_kg: s.price_per_kg,
        total_amount: s.total_amount, who: s.buyer_name || '—', number: s.sale_number
      });
    });
    // Apply filters
    let filtered = items;
    if (historyFilter.type !== 'all') filtered = filtered.filter(i => i.type === historyFilter.type);
    if (historyFilter.material !== 'all') filtered = filtered.filter(i => i.material_type_id === historyFilter.material);
    if (historyFilter.dateFrom) filtered = filtered.filter(i => i.date >= historyFilter.dateFrom);
    if (historyFilter.dateTo) filtered = filtered.filter(i => i.date <= historyFilter.dateTo + 'T23:59:59');
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, sales, historyFilter]);

  // Export history to Excel/CSV
  const exportHistoryExcel = () => {
    if (historyItems.length === 0) { alert('No hay movimientos para exportar.'); return; }
    const headers = ['Fecha', 'Hora', 'Tipo', 'Folio', 'Material', 'Proveedor/Comprador', 'Kilos', 'Precio/Kg', 'Total'];
    const rows = historyItems.map(item => {
      const d = new Date(item.date);
      return [
        d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        item.type === 'compra' ? 'Compra' : 'Venta',
        item.number || '—',
        `"${item.material}"`,
        `"${item.who}"`,
        Number(item.quantity_kg || 0).toFixed(3),
        Number(item.price_per_kg || 0).toFixed(2),
        Number(item.total_amount || 0).toFixed(2),
      ].join(',');
    });
    const totalKg = historyItems.reduce((s, i) => s + Number(i.quantity_kg || 0), 0);
    const totalAmt = historyItems.reduce((s, i) => s + (i.type === 'compra' ? -1 : 1) * Number(i.total_amount || 0), 0);
    rows.push('');
    rows.push(`,,,,,,${totalKg.toFixed(3)},,${totalAmt.toFixed(2)}`);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reciclaje-historial_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========== PURCHASE LOGIC ==========

  const handleMaterialChange = (materialId) => {
    const mat = materialTypes.find(m => m.id === materialId);
    setPurchaseForm(f => ({
      ...f, material_type_id: materialId,
      price_per_kg: mat ? String(mat.buy_price_per_kg) : ''
    }));
  };

  const handleSupplierSelect = (name) => {
    setSupplierSearch(name);
    setPurchaseForm(f => ({ ...f, supplier_name: name }));
    setShowSupplierDropdown(false);
  };

  const handleSubmitPurchase = async () => {
    if (!purchaseForm.material_type_id) return showToast('Selecciona un tipo de material', 'error');
    const qty = parseFloat(purchaseForm.quantity_kg);
    const price = parseFloat(purchaseForm.price_per_kg);
    if (!qty || qty <= 0) return showToast('Ingresa una cantidad válida', 'error');
    if (!price || price <= 0) return showToast('Ingresa un precio válido', 'error');

    // If active buyer is already set (remember buyer enabled), proceed directly
    if (activeBuyer) {
      await executePurchase(activeBuyer);
      return;
    }

    setPendingPurchaseAction(true);
    setBuyerPinInput('');
    setBuyerModalError('');
    setShowBuyerPinModal(true);
  };

  const verifyBuyerPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanInput = buyerPinInput.trim();
    if (!cleanInput) {
      setBuyerModalError('Ingresa un PIN o escanea tu credencial.');
      return;
    }

    setVerifyingBuyer(true);
    setBuyerModalError('');

    try {
      const { data: matchedProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .or(`authorization_pin.eq.${cleanInput},employee_barcode.eq.${cleanInput}`);

      if (error || !matchedProfiles || matchedProfiles.length === 0) {
        setBuyerModalError('PIN o Código de Barras no reconocido. Asigna un PIN al usuario desde el módulo de Usuarios.');
        setVerifyingBuyer(false);
        return;
      }

      const foundBuyer = {
        id: matchedProfiles[0].id,
        name: matchedProfiles[0].full_name || 'Comprador'
      };

      if (rememberBuyer) {
        setActiveBuyer(foundBuyer);
      } else {
        setActiveBuyer(foundBuyer);
      }

      setShowBuyerPinModal(false);
      setBuyerPinInput('');
      setVerifyingBuyer(false);

      if (pendingPurchaseAction) {
        setPendingPurchaseAction(false);
        await executePurchase(foundBuyer);
      } else {
        showToast(`Comprador identificado: ${foundBuyer.name}`);
      }
    } catch (err) {
      setBuyerModalError('Error de verificación: ' + (err.message || err));
      setVerifyingBuyer(false);
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setBuyerPinInput('');
    } else if (val === 'DEL') {
      setBuyerPinInput(prev => prev.slice(0, -1));
    } else {
      if (buyerPinInput.length < 10) {
        setBuyerPinInput(prev => prev + val);
      }
    }
  };

  const executePurchase = async (buyerObj) => {
    setSubmittingPurchase(true);
    try {
      const userId = buyerObj?.id || (await supabase.auth.getUser()).data.user?.id;
      const buyerName = buyerObj?.name || 'Comprador';
      const materialName = materialTypes.find(m => m.id === purchaseForm.material_type_id)?.name || '';
      const qty = parseFloat(purchaseForm.quantity_kg);
      const price = parseFloat(purchaseForm.price_per_kg);
      const total = qty * price;
      const supplierName = (purchaseForm.supplier_name || 'Público en General').trim();

      // Generate purchase number
      const { data: lastPurchase } = await supabase
        .from('recycling_purchases')
        .select('purchase_number')
        .order('created_at', { ascending: false })
        .limit(1);
      let nextNum = 1;
      if (lastPurchase && lastPurchase.length > 0) {
        const match = lastPurchase[0].purchase_number?.match(/GR-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const purchaseNumber = `GR-${String(nextNum).padStart(5, '0')}`;

      // Find or link supplier
      let supplierId = null;
      const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      }

      // Insert purchase
      const { data: newPurchase, error: purchaseError } = await supabase
        .from('recycling_purchases')
        .insert({
          purchase_number: purchaseNumber,
          material_type_id: purchaseForm.material_type_id,
          supplier_id: supplierId,
          supplier_name: supplierName,
          quantity_kg: qty,
          price_per_kg: price,
          total_amount: total,
          notes: purchaseForm.notes.trim() || null,
          purchased_by: userId,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Insert cash movement
      const { error: cashError } = await supabase.from('cash_movements').insert({
        type: 'exit',
        amount: total,
        concept: `Compra tungsteno: ${qty} kg de ${materialName}`,
        responsible: buyerName,
        reference_id: newPurchase.id,
        reference_type: 'recycling_purchase',
        movement_date: new Date().toLocaleDateString('en-CA'),
        created_by: userId,
        approval_status: 'approved',
      });

      if (cashError) console.error('Cash movement error:', cashError);

      // Reset form
      setPurchaseForm({ material_type_id: '', supplier_name: 'Público en General', quantity_kg: '', price_per_kg: '', notes: '' });
      setSupplierSearch('Público en General');
      showToast(`Compra ${purchaseNumber} registrada por ${buyerName} — $${fmt(total)}`);
      fetchData();
    } catch (err) {
      showToast('Error al registrar: ' + err.message, 'error');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // ========== SALE LOGIC ==========

  const openSaleModal = (material) => {
    const stockKg = material.purchased_kg - material.sold_kg;
    setSaleModal({ ...material, stock_kg: stockKg });
    setSaleForm({ quantity_kg: '', price_per_kg: '', buyer_name: '', notes: '' });
  };

  const handleSubmitSale = async () => {
    if (!saleModal) return;
    const qty = parseFloat(saleForm.quantity_kg);
    const price = parseFloat(saleForm.price_per_kg);
    if (!qty || qty <= 0) return showToast('Ingresa una cantidad válida', 'error');
    if (qty > saleModal.stock_kg) return showToast(`Solo hay ${fmt(saleModal.stock_kg)} kg disponibles`, 'error');
    if (!price || price <= 0) return showToast('Ingresa un precio válido', 'error');
    if (!saleForm.buyer_name.trim()) return showToast('Ingresa el nombre del comprador', 'error');

    setSubmittingSale(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const total = qty * price;

      // Generate sale number
      const { data: lastSale } = await supabase
        .from('recycling_sales')
        .select('sale_number')
        .order('created_at', { ascending: false })
        .limit(1);
      let nextNum = 1;
      if (lastSale && lastSale.length > 0) {
        const match = lastSale[0].sale_number?.match(/GRS-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const saleNumber = `GRS-${String(nextNum).padStart(5, '0')}`;

      const { error } = await supabase.from('recycling_sales').insert({
        sale_number: saleNumber,
        material_type_id: saleModal.id,
        quantity_kg: qty,
        price_per_kg: price,
        total_amount: total,
        buyer_name: saleForm.buyer_name.trim(),
        notes: saleForm.notes.trim() || null,
        sold_by: userId,
      });

      if (error) throw error;

      setSaleModal(null);
      showToast(`Venta ${saleNumber} registrada — $${fmt(total)}`);
      fetchData();
    } catch (err) {
      showToast('Error al registrar venta: ' + err.message, 'error');
    }
    setSubmittingSale(false);
  };

  // ========== CONFIG LOGIC ==========

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim()) return showToast('Ingresa el nombre del material', 'error');
    const price = parseFloat(newMaterial.buy_price_per_kg);
    if (!price || price <= 0) return showToast('Ingresa un precio válido', 'error');
    const { error } = await supabase.from('recycling_material_types').insert({
      name: newMaterial.name.trim(), buy_price_per_kg: price, is_active: true
    });
    if (error) return showToast('Error: ' + error.message, 'error');
    setNewMaterial({ name: '', buy_price_per_kg: '' });
    setShowAddMaterial(false);
    showToast('Material agregado');
    fetchData();
  };

  const handleUpdateMaterial = async (id, updates) => {
    const { error } = await supabase.from('recycling_material_types').update(updates).eq('id', id);
    if (error) return showToast('Error: ' + error.message, 'error');
    setEditingMaterial(null);
    showToast('Material actualizado');
    fetchData();
  };

  const handleToggleMaterial = async (id, currentActive) => {
    await handleUpdateMaterial(id, { is_active: !currentActive });
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return showToast('Ingresa el nombre del proveedor', 'error');
    const { error } = await supabase.from('recycling_suppliers').insert({
      name: newSupplier.name.trim(), phone: newSupplier.phone.trim() || null,
      notes: newSupplier.notes.trim() || null, is_active: true,
    });
    if (error) return showToast('Error: ' + error.message, 'error');
    setNewSupplier({ name: '', phone: '', notes: '' });
    setShowAddSupplier(false);
    showToast('Proveedor agregado');
    fetchData();
  };

  const handleUpdateSupplier = async (id, updates) => {
    const { error } = await supabase.from('recycling_suppliers').update(updates).eq('id', id);
    if (error) return showToast('Error: ' + error.message, 'error');
    setEditingSupplier(null);
    showToast('Proveedor actualizado');
    fetchData();
  };

  const handleToggleSupplier = async (id, currentActive) => {
    await handleUpdateSupplier(id, { is_active: !currentActive });
  };

  // ========== RENDER ==========

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
    </div>
  );

  const TABS = [
    { key: 'compra', label: 'Nueva Compra', icon: ShoppingCart },
    { key: 'inventario', label: 'Inventario', icon: Package },
    { key: 'historial', label: 'Historial', icon: FileText },
    { key: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2 animate-[slideIn_0.3s_ease] ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#6a9a04]'}`}
          style={{ animation: 'slideIn 0.3s ease' }}>
          {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Recycle size={28} className="text-[#6a9a04]" /> Reciclaje
        </h1>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon size={14} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =============== TAB: NUEVA COMPRA =============== */}
      {activeTab === 'compra' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2 mb-6">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#6a9a04]" /> Registrar Compra de Material
              </h2>
              {activeBuyer ? (
                <div className="bg-[#6a9a04]/10 border border-[#6a9a04]/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-[#6a9a04]">
                  <Users size={14} /> <span>Comprador: <span className="text-slate-900">{activeBuyer.name}</span></span>
                  <button onClick={() => setActiveBuyer(null)} className="text-slate-500 hover:text-slate-700 underline bg-transparent border-none cursor-pointer font-normal text-[11px] ml-1">
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBuyerPinInput('');
                    setBuyerModalError('');
                    setPendingPurchaseAction(false);
                    setShowBuyerPinModal(true);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Users size={14} className="text-[#6a9a04]" /> Identificar Comprador
                </button>
              )}
            </div>
            <div className="space-y-5">
              {/* Material Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Material *</label>
                <select
                  value={purchaseForm.material_type_id}
                  onChange={e => handleMaterialChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04] bg-white cursor-pointer"
                >
                  <option value="">Selecciona un material...</option>
                  {activeMaterials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — ${fmt(m.buy_price_per_kg)}/kg</option>
                  ))}
                </select>
              </div>

              {/* Supplier Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-1">Proveedor</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={e => {
                      setSupplierSearch(e.target.value);
                      setPurchaseForm(f => ({ ...f, supplier_name: e.target.value }));
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                    placeholder="Público en General"
                  />
                </div>
                {showSupplierDropdown && filteredSuppliers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuppliers.map(s => (
                      <button key={s.id} onMouseDown={() => handleSupplierSelect(s.name)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent flex items-center justify-between">
                        <span className="font-medium text-slate-700">{s.name}</span>
                        {s.phone && <span className="text-xs text-slate-400">{s.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity + Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad KG *</label>
                  <div className="relative">
                    <Weight size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" step="0.001" min="0"
                      value={purchaseForm.quantity_kg}
                      onChange={e => setPurchaseForm(f => ({ ...f, quantity_kg: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="0.000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Precio por KG *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                    <input type="number" step="0.01" min="0"
                      value={purchaseForm.price_per_kg}
                      onChange={e => setPurchaseForm(f => ({ ...f, price_per_kg: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={purchaseForm.notes}
                  onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04] resize-none"
                  rows={2} placeholder="Observaciones de la compra..." />
              </div>

              {/* Submit */}
              <button onClick={handleSubmitPurchase} disabled={submittingPurchase}
                className="w-full py-3 rounded-xl bg-[#6a9a04] hover:bg-[#5a8503] text-white font-bold text-sm border-none cursor-pointer shadow-lg shadow-[#6a9a04]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submittingPurchase ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                Registrar Compra
              </button>
            </div>
          </div>

          {/* Total Preview Card */}
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Resumen de Compra</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Material</span>
                  <span className="font-bold text-slate-900">
                    {materialTypes.find(m => m.id === purchaseForm.material_type_id)?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Proveedor</span>
                  <span className="font-medium text-slate-700">{purchaseForm.supplier_name || 'Público en General'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cantidad</span>
                  <span className="font-bold text-slate-900">{fmtKg(purchaseForm.quantity_kg)} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Precio/KG</span>
                  <span className="font-bold text-slate-900">${fmt(purchaseForm.price_per_kg)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">TOTAL A PAGAR</span>
                    <span className="text-3xl font-black text-[#6a9a04]">${fmt(purchaseTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Hoy</h3>
              {(() => {
                const today = new Date().toLocaleDateString('en-CA');
                const todayPurchases = purchases.filter(p => p.created_at?.startsWith(today));
                const todayTotal = todayPurchases.reduce((s, p) => s + Number(p.total_amount), 0);
                const todayKg = todayPurchases.reduce((s, p) => s + Number(p.quantity_kg), 0);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Compras hoy</span>
                      <span className="font-bold text-slate-900">{todayPurchases.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">KG comprados</span>
                      <span className="font-bold text-slate-900">{fmtKg(todayKg)} kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total gastado</span>
                      <span className="font-bold text-red-600">${fmt(todayTotal)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============== TAB: INVENTARIO =============== */}
      {activeTab === 'inventario' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Package size={20} className="text-blue-500" /></div>
                <span className="text-xs text-slate-500 font-medium">KG en Stock</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{fmtKg(totals.totalStockKg)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><DollarSign size={20} className="text-emerald-500" /></div>
                <span className="text-xs text-slate-500 font-medium">Valor Estimado</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">${fmt(totals.totalEstimatedValue)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><ShoppingCart size={20} className="text-red-500" /></div>
                <span className="text-xs text-slate-500 font-medium">Total Invertido</span>
              </div>
              <p className="text-2xl font-black text-red-600">${fmt(totals.totalInvested)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Send size={20} className="text-purple-500" /></div>
                <span className="text-xs text-slate-500 font-medium">Total Vendido</span>
              </div>
              <p className="text-2xl font-black text-purple-600">${fmt(totals.totalSold)}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><TrendingUp size={20} className="text-amber-500" /></div>
                <span className="text-xs text-slate-500 font-medium">Utilidad</span>
              </div>
              <p className={`text-2xl font-black ${totals.grossProfit >= 0 ? 'text-[#6a9a04]' : 'text-red-600'}`}>${fmt(totals.grossProfit)}</p>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#6a9a04]" /> Stock por Material
              </h2>
            </div>
            {stockArray.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay materiales registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Material</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">KG en Stock</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Precio Compra/KG</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Valor Estimado</th>
                      <th className="text-center px-5 py-3 font-bold text-slate-500 text-xs uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockArray.map(m => {
                      const stockKg = m.purchased_kg - m.sold_kg;
                      const value = stockKg * Number(m.buy_price_per_kg);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3">
                            <span className="font-bold text-slate-900">{m.name}</span>
                            {!m.is_active && <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">{fmtKg(stockKg)} kg</td>
                          <td className="px-5 py-3 text-right text-slate-600">${fmt(m.buy_price_per_kg)}</td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-600">${fmt(value)}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => openSaleModal(m)} disabled={stockKg <= 0}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6a9a04] hover:bg-[#5a8503] text-white text-xs font-bold border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                              <Send size={12} /> Registrar Venta
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Profitability Analysis */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-[#6a9a04]" /> Análisis de Rentabilidad
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invertido en Compras</p>
                <p className="text-2xl font-black text-red-600">${fmt(totals.totalInvested)}</p>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: totals.totalInvested > 0 ? '100%' : '0%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Generado por Ventas</p>
                <p className="text-2xl font-black text-purple-600">${fmt(totals.totalSold)}</p>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: totals.totalInvested > 0 ? `${Math.min((totals.totalSold / totals.totalInvested) * 100, 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Bruta</p>
                <p className={`text-2xl font-black ${totals.grossProfit >= 0 ? 'text-[#6a9a04]' : 'text-red-600'}`}>
                  ${fmt(totals.grossProfit)}
                </p>
                <p className="text-xs text-slate-400">
                  Costo de material vendido: ${fmt(totals.totalCostOfSold)}
                </p>
                {totals.totalCostOfSold > 0 && (
                  <p className="text-xs font-bold text-slate-500">
                    Margen: {fmt((totals.grossProfit / totals.totalCostOfSold) * 100)}%
                  </p>
                )}
              </div>
            </div>
            {/* Visual Comparison */}
            {(totals.totalInvested > 0 || totals.totalSold > 0) && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-end gap-4 h-32">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-red-100 rounded-t-xl flex items-end justify-center relative" style={{ height: `${totals.totalInvested > 0 ? Math.max((totals.totalInvested / Math.max(totals.totalInvested, totals.totalSold)) * 100, 10) : 10}%` }}>
                      <div className="w-full bg-red-400 rounded-t-xl" style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Compras</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-purple-100 rounded-t-xl flex items-end justify-center relative" style={{ height: `${totals.totalSold > 0 ? Math.max((totals.totalSold / Math.max(totals.totalInvested, totals.totalSold)) * 100, 10) : 10}%` }}>
                      <div className="w-full bg-purple-400 rounded-t-xl" style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Ventas</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-xl flex items-end justify-center relative" style={{ height: `${totals.grossProfit > 0 ? Math.max((totals.grossProfit / Math.max(totals.totalInvested, totals.totalSold)) * 100, 10) : 10}%` }}>
                      <div className={`w-full rounded-t-xl ${totals.grossProfit >= 0 ? 'bg-[#6a9a04]' : 'bg-red-400'}`} style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Utilidad</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============== TAB: HISTORIAL =============== */}
      {activeTab === 'historial' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo</label>
                <select value={historyFilter.type} onChange={e => setHistoryFilter(f => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04] bg-white cursor-pointer">
                  <option value="all">Todos</option>
                  <option value="compra">Compras</option>
                  <option value="venta">Ventas</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Material</label>
                <select value={historyFilter.material} onChange={e => setHistoryFilter(f => ({ ...f, material: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04] bg-white cursor-pointer">
                  <option value="all">Todos</option>
                  {materialTypes.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Desde</label>
                <input type="date" value={historyFilter.dateFrom} onChange={e => setHistoryFilter(f => ({ ...f, dateFrom: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Hasta</label>
                <input type="date" value={historyFilter.dateTo} onChange={e => setHistoryFilter(f => ({ ...f, dateTo: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]" />
              </div>
              {(historyFilter.type !== 'all' || historyFilter.material !== 'all' || historyFilter.dateFrom || historyFilter.dateTo) && (
                <button onClick={() => setHistoryFilter({ type: 'all', material: 'all', dateFrom: '', dateTo: '' })}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold border-none cursor-pointer hover:bg-slate-200 transition-colors">
                  <X size={14} className="inline mr-1" style={{ verticalAlign: '-2px' }} /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6a9a04]" /> Historial de Movimientos
                <span className="text-xs font-normal text-slate-400 ml-1">({historyItems.length})</span>
              </h2>
              <button onClick={exportHistoryExcel} disabled={historyItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#6a9a04]/30 text-sm font-bold text-[#6a9a04] bg-[#6a9a04]/5 hover:bg-[#6a9a04]/10 cursor-pointer transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <Download size={14} /> Exportar Excel
              </button>
            </div>
            {historyItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay movimientos en este filtro</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyItems.map(item => (
                  <div key={item.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'compra' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                      {item.type === 'compra'
                        ? <ShoppingCart size={18} className="text-emerald-500" />
                        : <Send size={18} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === 'compra' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {item.type === 'compra' ? 'COMPRA' : 'VENTA'}
                        </span>
                        <span className="font-mono text-xs text-[#6a9a04]">{item.number}</span>
                        <span className="text-slate-600">{item.material}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1">·</span>
                        {item.who}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{fmtKg(item.quantity_kg)} kg</p>
                      <p className="text-xs text-slate-400">${fmt(item.price_per_kg)}/kg</p>
                    </div>
                    <div className="text-right shrink-0 min-w-[100px]">
                      <p className={`text-sm font-black ${item.type === 'compra' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {item.type === 'compra' ? '-' : '+'}${fmt(item.total_amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============== TAB: CONFIGURACIÓN =============== */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Material Types */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Recycle className="w-5 h-5 text-[#6a9a04]" /> Tipos de Material
              </h2>
              <button onClick={() => setShowAddMaterial(!showAddMaterial)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6a9a04] hover:bg-[#5a8503] text-white text-xs font-bold border-none cursor-pointer shadow-sm transition-all">
                <Plus size={14} /> Agregar Tipo
              </button>
            </div>

            {/* Add Material Form */}
            {showAddMaterial && (
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                    <input type="text" value={newMaterial.name}
                      onChange={e => setNewMaterial(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="Ej: Tungsteno puro" />
                  </div>
                  <div className="w-40">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Precio/KG</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                      <input type="number" step="0.01" value={newMaterial.buy_price_per_kg}
                        onChange={e => setNewMaterial(f => ({ ...f, buy_price_per_kg: e.target.value }))}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                        placeholder="0.00" />
                    </div>
                  </div>
                  <button onClick={handleAddMaterial}
                    className="px-4 py-2.5 rounded-xl bg-[#6a9a04] text-white text-sm font-bold border-none cursor-pointer hover:bg-[#5a8503] transition-all">
                    <Check size={14} className="inline mr-1" style={{ verticalAlign: '-2px' }} /> Guardar
                  </button>
                  <button onClick={() => { setShowAddMaterial(false); setNewMaterial({ name: '', buy_price_per_kg: '' }); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold cursor-pointer bg-white hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Materials Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Nombre</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Precio Compra/KG</th>
                    <th className="text-center px-5 py-3 font-bold text-slate-500 text-xs uppercase">Estado</th>
                    <th className="text-center px-5 py-3 font-bold text-slate-500 text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialTypes.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {editingMaterial === m.id ? (
                          <input type="text" defaultValue={m.name} id={`mat-name-${m.id}`}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#6a9a04] w-full" />
                        ) : m.name}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {editingMaterial === m.id ? (
                          <div className="relative inline-block">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input type="number" step="0.01" defaultValue={m.buy_price_per_kg} id={`mat-price-${m.id}`}
                              className="pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#6a9a04] w-28 text-right" />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">${fmt(m.buy_price_per_kg)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => handleToggleMaterial(m.id, m.is_active)}
                          className="border-none bg-transparent cursor-pointer p-0" title={m.is_active ? 'Desactivar' : 'Activar'}>
                          {m.is_active
                            ? <ToggleRight size={28} className="text-[#6a9a04]" />
                            : <ToggleLeft size={28} className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {editingMaterial === m.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => {
                              const nameEl = document.getElementById(`mat-name-${m.id}`);
                              const priceEl = document.getElementById(`mat-price-${m.id}`);
                              handleUpdateMaterial(m.id, {
                                name: nameEl.value.trim(),
                                buy_price_per_kg: parseFloat(priceEl.value) || m.buy_price_per_kg
                              });
                            }}
                              className="w-8 h-8 rounded-lg bg-[#6a9a04] hover:bg-[#5a8503] flex items-center justify-center border-none cursor-pointer transition-colors">
                              <Check size={14} className="text-white" />
                            </button>
                            <button onClick={() => setEditingMaterial(null)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                              <X size={14} className="text-slate-500" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingMaterial(m.id)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                            <Edit3 size={14} className="text-slate-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {materialTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                        <Recycle size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No hay materiales. Agrega uno para empezar.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suppliers */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6a9a04]" /> Proveedores Frecuentes
              </h2>
              <button onClick={() => setShowAddSupplier(!showAddSupplier)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6a9a04] hover:bg-[#5a8503] text-white text-xs font-bold border-none cursor-pointer shadow-sm transition-all">
                <Plus size={14} /> Agregar Proveedor
              </button>
            </div>

            {/* Add Supplier Form */}
            {showAddSupplier && (
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre *</label>
                    <input type="text" value={newSupplier.name}
                      onChange={e => setNewSupplier(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="Nombre del proveedor" />
                  </div>
                  <div className="w-40">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                    <input type="text" value={newSupplier.phone}
                      onChange={e => setNewSupplier(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="10 dígitos" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notas</label>
                    <input type="text" value={newSupplier.notes}
                      onChange={e => setNewSupplier(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#6a9a04]"
                      placeholder="Opcional" />
                  </div>
                  <button onClick={handleAddSupplier}
                    className="px-4 py-2.5 rounded-xl bg-[#6a9a04] text-white text-sm font-bold border-none cursor-pointer hover:bg-[#5a8503] transition-all">
                    <Check size={14} className="inline mr-1" style={{ verticalAlign: '-2px' }} /> Guardar
                  </button>
                  <button onClick={() => { setShowAddSupplier(false); setNewSupplier({ name: '', phone: '', notes: '' }); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold cursor-pointer bg-white hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Suppliers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Nombre</th>
                    <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Teléfono</th>
                    <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Notas</th>
                    <th className="text-center px-5 py-3 font-bold text-slate-500 text-xs uppercase">Estado</th>
                    <th className="text-center px-5 py-3 font-bold text-slate-500 text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        {editingSupplier === s.id ? (
                          <input type="text" defaultValue={s.name} id={`sup-name-${s.id}`}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#6a9a04] w-full" />
                        ) : (
                          <span className="font-medium text-slate-900">{s.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editingSupplier === s.id ? (
                          <input type="text" defaultValue={s.phone || ''} id={`sup-phone-${s.id}`}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#6a9a04] w-32" />
                        ) : (
                          <span className="text-slate-600">{s.phone || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editingSupplier === s.id ? (
                          <input type="text" defaultValue={s.notes || ''} id={`sup-notes-${s.id}`}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#6a9a04] w-full" />
                        ) : (
                          <span className="text-slate-500 text-xs">{s.notes || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => handleToggleSupplier(s.id, s.is_active)}
                          className="border-none bg-transparent cursor-pointer p-0" title={s.is_active ? 'Desactivar' : 'Activar'}>
                          {s.is_active
                            ? <ToggleRight size={28} className="text-[#6a9a04]" />
                            : <ToggleLeft size={28} className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {editingSupplier === s.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => {
                              const nameEl = document.getElementById(`sup-name-${s.id}`);
                              const phoneEl = document.getElementById(`sup-phone-${s.id}`);
                              const notesEl = document.getElementById(`sup-notes-${s.id}`);
                              handleUpdateSupplier(s.id, {
                                name: nameEl.value.trim(),
                                phone: phoneEl.value.trim() || null,
                                notes: notesEl.value.trim() || null,
                              });
                            }}
                              className="w-8 h-8 rounded-lg bg-[#6a9a04] hover:bg-[#5a8503] flex items-center justify-center border-none cursor-pointer transition-colors">
                              <Check size={14} className="text-white" />
                            </button>
                            <button onClick={() => setEditingSupplier(null)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                              <X size={14} className="text-slate-500" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingSupplier(s.id)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors">
                            <Edit3 size={14} className="text-slate-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No hay proveedores. Agrega uno para empezar.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============== SALE MODAL =============== */}
      {saleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSaleModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Send size={20} className="text-[#6a9a04]" /> Registrar Venta
            </h3>
            <p className="text-sm text-slate-500 mb-5">Venta de material del inventario de reciclaje.</p>

            {/* Pre-invoice style */}
            <div className="bg-slate-50 rounded-xl p-4 mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Material</span>
                <span className="font-bold text-slate-900">{saleModal.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">KG Disponibles</span>
                <span className="font-bold text-[#6a9a04]">{fmt(saleModal.stock_kg)} kg</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad KG a vender *</label>
                <div className="relative">
                  <Weight size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" step="0.001" min="0" max={saleModal.stock_kg}
                    value={saleForm.quantity_kg}
                    onChange={e => setSaleForm(f => ({ ...f, quantity_kg: e.target.value }))}
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none text-sm"
                    placeholder="0.000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Precio de venta por KG *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input type="number" step="0.01" min="0"
                    value={saleForm.price_per_kg}
                    onChange={e => setSaleForm(f => ({ ...f, price_per_kg: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none text-sm"
                    placeholder="0.00" />
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#6a9a04]/5 border border-[#6a9a04]/20 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total a Facturar</p>
                <p className="text-3xl font-black text-[#6a9a04]">${fmt(saleTotal)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Comprador *</label>
                <input type="text"
                  value={saleForm.buyer_name}
                  onChange={e => setSaleForm(f => ({ ...f, buyer_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none text-sm"
                  placeholder="Nombre del comprador" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={saleForm.notes}
                  onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6a9a04] outline-none resize-none text-sm"
                  rows={2} placeholder="Observaciones..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setSaleModal(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer bg-white hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleSubmitSale} disabled={submittingSale}
                  className="flex-1 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm border-none cursor-pointer hover:bg-[#5a8503] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#6a9a04]/20 transition-all">
                  {submittingSale ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Registrar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autorización de Comprador (PIN / Escáner) */}
      {showBuyerPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Identificación de Comprador</h3>
                  <p className="text-xs text-slate-400">Escanea tu credencial o ingresa tu PIN</p>
                </div>
              </div>
              <button onClick={() => { setShowBuyerPinModal(false); setBuyerPinInput(''); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={verifyBuyerPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">PIN / Código de Barras</label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    value={buyerPinInput}
                    onChange={(e) => {
                      setBuyerPinInput(e.target.value);
                      if (buyerModalError) setBuyerModalError('');
                    }}
                    placeholder="Escanea credencial o digita PIN..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#6a9a04] outline-none text-center font-mono text-lg tracking-widest bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {buyerModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                  <X size={14} className="shrink-0" /> {buyerModalError}
                </div>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 py-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className={`py-3 rounded-xl font-bold text-base transition-all cursor-pointer border-none ${
                      key === 'C'
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : key === 'DEL'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberBuyer"
                  checked={rememberBuyer}
                  onChange={(e) => setRememberBuyer(e.target.checked)}
                  className="w-4 h-4 accent-[#6a9a04] rounded cursor-pointer"
                />
                <label htmlFor="rememberBuyer" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Recordar comprador durante esta sesión
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBuyerPinModal(false); setBuyerPinInput(''); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifyingBuyer || !buyerPinInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#6a9a04] text-white font-bold text-sm border-none hover:bg-[#5a8503] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {verifyingBuyer ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Autorizar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global slide-in animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
