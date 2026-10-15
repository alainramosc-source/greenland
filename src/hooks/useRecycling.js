'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useMemo, useCallback } from 'react';

export function useRecycling() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data State
  const [materialTypes, setMaterialTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('compra');

  // Buyer Identification / Security PIN state
  const [activeBuyer, setActiveBuyer] = useState(null);
  const [showBuyerPinModal, setShowBuyerPinModal] = useState(false);
  const [buyerPinInput, setBuyerPinInput] = useState('');
  const [buyerModalError, setBuyerModalError] = useState('');
  const [verifyingBuyer, setVerifyingBuyer] = useState(false);
  const [rememberBuyer, setRememberBuyer] = useState(false);
  const [pendingPurchaseAction, setPendingPurchaseAction] = useState(false);

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    material_type_id: '',
    supplier_name: 'Público en General',
    quantity_kg: '',
    price_per_kg: '',
    notes: '',
  });
  const [supplierSearch, setSupplierSearch] = useState('Público en General');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  // Multi-Material Sale Form State
  const [multiSaleBuyer, setMultiSaleBuyer] = useState('');
  const [multiSaleNotes, setMultiSaleNotes] = useState('');
  const [multiSaleRows, setMultiSaleRows] = useState([
    { id: 1, material_type_id: '', condition: '', quantity_kg: '', price_per_kg: '' }
  ]);
  const [submittingMultiSale, setSubmittingMultiSale] = useState(false);

  // Stock Adjustment Modal
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    type: 'add', amount_kg: '', exact_kg: '', reason: ''
  });
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Movement Edit Modal
  const [editingMovementModal, setEditingMovementModal] = useState(null);
  const [editMovementForm, setEditMovementForm] = useState({
    material_type_id: '', quantity_kg: '', price_per_kg: '', who: '', notes: ''
  });
  const [submittingEditMovement, setSubmittingEditMovement] = useState(false);

  // Material & Supplier Settings State
  const [newMaterial, setNewMaterial] = useState({ name: '', buy_price_per_kg: '' });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', notes: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  // History Filters
  const [historyFilter, setHistoryFilter] = useState({
    type: 'all',
    material: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Toast Helper
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Admin Role Check
  const isAdmin = useMemo(() => {
    if (!currentUserProfile) return true;
    return currentUserProfile.role === 'admin' || currentUserProfile.sub_role === 'super_admin';
  }, [currentUserProfile]);

  // Fetch All Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, supRes, purRes, salRes, profRes, userRes] = await Promise.all([
        supabase.from('recycling_material_types').select('*').order('name'),
        supabase.from('recycling_suppliers').select('*').order('name'),
        supabase.from('recycling_purchases').select('*, recycling_material_types(name)').order('created_at', { ascending: false }),
        supabase.from('recycling_sales').select('*, recycling_material_types(name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name'),
        supabase.auth.getUser()
      ]);

      if (matRes.data) setMaterialTypes(matRes.data);
      if (supRes.data) setSuppliers(supRes.data);
      if (purRes.data) setPurchases(purRes.data);
      if (salRes.data) setSales(salRes.data);
      if (profRes.data) setProfiles(profRes.data);

      if (userRes?.data?.user) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('id, role, sub_role, full_name')
          .eq('id', userRes.data.user.id)
          .single();
        if (myProfile) setCurrentUserProfile(myProfile);
      }
    } catch (err) {
      console.error('Error fetching recycling data:', err);
      showToast('Error al cargar datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Profiles Map
  const profilesMap = useMemo(() => {
    const map = {};
    (profiles || []).forEach(p => {
      if (p.id) map[p.id] = p.full_name || '—';
    });
    return map;
  }, [profiles]);

  // Active Materials
  const activeMaterials = useMemo(() => materialTypes.filter(m => m.is_active), [materialTypes]);

  // Stock Calculations by Material
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
    Object.values(map).forEach(m => {
      if (m.purchased_kg > 0) {
        const avgCost = m.total_invested / m.purchased_kg;
        m.cost_of_sold = avgCost * m.sold_kg;
      }
    });
    return map;
  }, [materialTypes, purchases, sales]);

  const stockArray = useMemo(() => {
    return Object.values(stockByMaterial).filter(m => m.is_active || m.purchased_kg > 0);
  }, [stockByMaterial]);

  // General Totals
  const totals = useMemo(() => {
    const totalStockKg = stockArray.reduce((s, m) => s + (m.purchased_kg - m.sold_kg), 0);
    const totalEstimatedValue = stockArray.reduce((s, m) => s + ((m.purchased_kg - m.sold_kg) * Number(m.buy_price_per_kg)), 0);
    const totalInvested = stockArray.reduce((s, m) => s + m.total_invested, 0);
    const totalSold = stockArray.reduce((s, m) => s + m.total_sold_amount, 0);
    const totalCostOfSold = stockArray.reduce((s, m) => s + m.cost_of_sold, 0);
    const grossProfit = totalSold - totalCostOfSold;
    return { totalStockKg, totalEstimatedValue, totalInvested, totalSold, grossProfit, totalCostOfSold };
  }, [stockArray]);

  // Purchase Form Preview Total
  const purchaseTotal = useMemo(() => {
    const qty = parseFloat(purchaseForm.quantity_kg) || 0;
    const price = parseFloat(purchaseForm.price_per_kg) || 0;
    return qty * price;
  }, [purchaseForm.quantity_kg, purchaseForm.price_per_kg]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers.filter(s => s.is_active);
    return suppliers.filter(s => s.is_active && s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
  }, [suppliers, supplierSearch]);

  // Multi-Sale Summary Calculator
  const multiSaleSummary = useMemo(() => {
    let totalKg = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    const requestedKgByMaterial = {};

    multiSaleRows.forEach(row => {
      const kg = parseFloat(row.quantity_kg) || 0;
      const price = parseFloat(row.price_per_kg) || 0;
      const matId = row.material_type_id;

      totalKg += kg;
      totalRevenue += kg * price;

      if (matId) {
        requestedKgByMaterial[matId] = (requestedKgByMaterial[matId] || 0) + kg;
        const matStock = stockByMaterial[matId];
        if (matStock && matStock.purchased_kg > 0) {
          const avgCost = matStock.total_invested / matStock.purchased_kg;
          totalCogs += avgCost * kg;
        }
      }
    });

    const grossProfit = totalRevenue - totalCogs;
    return { totalKg, totalRevenue, totalCogs, grossProfit, requestedKgByMaterial };
  }, [multiSaleRows, stockByMaterial]);

  // Consolidated History List
  const historyItems = useMemo(() => {
    const items = [];
    purchases.forEach(p => {
      items.push({
        id: p.id,
        type: 'compra',
        date: p.created_at,
        material: p.recycling_material_types?.name || '—',
        material_type_id: p.material_type_id,
        quantity_kg: p.quantity_kg,
        price_per_kg: p.price_per_kg,
        total_amount: p.total_amount,
        who: p.supplier_name || '—',
        captured_by: profilesMap[p.purchased_by] || '—',
        number: p.purchase_number,
        notes: p.notes,
        raw: p,
      });
    });
    sales.forEach(s => {
      items.push({
        id: s.id,
        type: 'venta',
        date: s.created_at,
        material: s.recycling_material_types?.name || '—',
        material_type_id: s.material_type_id,
        quantity_kg: s.quantity_kg,
        price_per_kg: s.price_per_kg,
        total_amount: s.total_amount,
        who: s.buyer_name || '—',
        captured_by: profilesMap[s.sold_by] || '—',
        number: s.sale_number,
        notes: s.notes,
        raw: s,
      });
    });

    let filtered = items;
    if (historyFilter.type !== 'all') filtered = filtered.filter(i => i.type === historyFilter.type);
    if (historyFilter.material !== 'all') filtered = filtered.filter(i => i.material_type_id === historyFilter.material);
    if (historyFilter.dateFrom) filtered = filtered.filter(i => i.date >= historyFilter.dateFrom);
    if (historyFilter.dateTo) filtered = filtered.filter(i => i.date <= historyFilter.dateTo + 'T23:59:59');
    if (historyFilter.search.trim()) {
      const q = historyFilter.search.toLowerCase();
      filtered = filtered.filter(i => 
        i.who.toLowerCase().includes(q) || 
        i.material.toLowerCase().includes(q) || 
        (i.number && i.number.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, sales, historyFilter, profilesMap]);

  // Export History CSV
  const exportHistoryExcel = () => {
    if (historyItems.length === 0) {
      showToast('No hay movimientos para exportar.', 'error');
      return;
    }
    const headers = ['Fecha', 'Hora', 'Tipo', 'Folio', 'Material', 'Proveedor/Comprador', 'Capturado Por', 'Kilos', 'Precio/Kg', 'Total'];
    const rows = historyItems.map(item => {
      const d = new Date(item.date);
      return [
        d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        item.type === 'compra' ? 'Compra' : 'Venta',
        item.number || '—',
        `"${item.material}"`,
        `"${item.who}"`,
        `"${item.captured_by || '—'}"`,
        Number(item.quantity_kg || 0).toFixed(3),
        Number(item.price_per_kg || 0).toFixed(2),
        Number(item.total_amount || 0).toFixed(2),
      ].join(',');
    });
    const totalKg = historyItems.reduce((s, i) => s + Number(i.quantity_kg || 0), 0);
    const totalAmt = historyItems.reduce((s, i) => s + (i.type === 'compra' ? -1 : 1) * Number(i.total_amount || 0), 0);
    rows.push('');
    rows.push(`,,,,,,,${totalKg.toFixed(3)},,${totalAmt.toFixed(2)}`);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reciclaje-historial_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Reporte CSV descargado');
  };

  // ========== ACTIONS & SUBMISSIONS ==========

  // Purchase Material Selection
  const handleMaterialChange = (materialId) => {
    const mat = materialTypes.find(m => m.id === materialId);
    setPurchaseForm(f => ({
      ...f,
      material_type_id: materialId,
      price_per_kg: mat ? String(mat.buy_price_per_kg) : '',
    }));
  };

  // Supplier Autocomplete Selection
  const handleSupplierSelect = (name) => {
    setSupplierSearch(name);
    setPurchaseForm(f => ({ ...f, supplier_name: name }));
    setShowSupplierDropdown(false);
  };

  // Submit Purchase Trigger
  const handleSubmitPurchase = async () => {
    if (!purchaseForm.material_type_id) return showToast('Selecciona un tipo de material', 'error');
    const qty = parseFloat(purchaseForm.quantity_kg);
    const price = parseFloat(purchaseForm.price_per_kg);
    if (!qty || qty <= 0) return showToast('Ingresa una cantidad válida', 'error');
    if (!price || price <= 0) return showToast('Ingresa un precio válido', 'error');

    if (activeBuyer) {
      await executePurchase(activeBuyer);
      return;
    }

    setPendingPurchaseAction(true);
    setBuyerPinInput('');
    setBuyerModalError('');
    setShowBuyerPinModal(true);
  };

  // PIN Verification
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
        name: matchedProfiles[0].full_name || 'Comprador',
      };

      if (rememberBuyer) {
        setActiveBuyer(foundBuyer);
      } else {
        setActiveBuyer(null);
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
      if (buyerPinInput.length < 24) {
        setBuyerPinInput(prev => prev + val);
      }
    }
  };

  // Execute Purchase Database Insertion
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

      let supplierId = null;
      const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      }

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

      setPurchaseForm({ material_type_id: '', supplier_name: 'Público en General', quantity_kg: '', price_per_kg: '', notes: '' });
      setSupplierSearch('Público en General');
      showToast(`Compra ${purchaseNumber} registrada por ${buyerName} — $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

      if (!rememberBuyer) {
        setActiveBuyer(null);
      }

      fetchData();
    } catch (err) {
      showToast('Error al registrar: ' + err.message, 'error');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // Multi-Material Sale Helpers
  const handleAddSaleRow = () => {
    setMultiSaleRows(prev => [
      ...prev,
      { id: Date.now() + Math.random(), material_type_id: '', condition: '', quantity_kg: '', price_per_kg: '' }
    ]);
  };

  const handleRemoveSaleRow = (id) => {
    if (multiSaleRows.length <= 1) return showToast('La venta debe incluir al menos 1 renglón', 'error');
    setMultiSaleRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSaleRowChange = (id, field, value) => {
    setMultiSaleRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmitMultiSale = async () => {
    const buyerName = multiSaleBuyer.trim();
    if (!buyerName) return showToast('Ingresa el nombre del comprador / empresa', 'error');
    if (multiSaleRows.length === 0) return showToast('Agrega al menos un material a la venta', 'error');

    for (let i = 0; i < multiSaleRows.length; i++) {
      const row = multiSaleRows[i];
      if (!row.material_type_id) return showToast(`Selecciona el material en el renglón #${i + 1}`, 'error');
      const kg = parseFloat(row.quantity_kg);
      const price = parseFloat(row.price_per_kg);
      if (isNaN(kg) || kg <= 0) return showToast(`Ingresa una cantidad válida de kilos en el renglón #${i + 1}`, 'error');
      if (isNaN(price) || price < 0) return showToast(`Ingresa un precio por kg válido en el renglón #${i + 1}`, 'error');
    }

    for (const [matId, totalReqKg] of Object.entries(multiSaleSummary.requestedKgByMaterial)) {
      const matStock = stockByMaterial[matId];
      const availKg = matStock ? (matStock.purchased_kg - matStock.sold_kg) : 0;
      if (totalReqKg > availKg) {
        const matName = matStock?.name || 'Material';
        return showToast(`Stock insuficiente para "${matName}". Disponibles: ${availKg.toFixed(3)} kg, Solicitados: ${totalReqKg.toFixed(3)} kg`, 'error');
      }
    }

    setSubmittingMultiSale(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
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

      const inserts = multiSaleRows.map(row => {
        const kg = parseFloat(row.quantity_kg);
        const price = parseFloat(row.price_per_kg);
        const cond = row.condition.trim();
        const rowNotes = cond ? (multiSaleNotes.trim() ? `[${cond}] ${multiSaleNotes.trim()}` : cond) : (multiSaleNotes.trim() || null);

        return {
          sale_number: saleNumber,
          material_type_id: row.material_type_id,
          quantity_kg: kg,
          price_per_kg: price,
          total_amount: kg * price,
          buyer_name: buyerName,
          notes: rowNotes,
          sold_by: userId,
        };
      });

      const { error } = await supabase.from('recycling_sales').insert(inserts);
      if (error) throw error;

      setMultiSaleBuyer('');
      setMultiSaleNotes('');
      setMultiSaleRows([{ id: Date.now(), material_type_id: '', condition: '', quantity_kg: '', price_per_kg: '' }]);

      showToast(`Venta ${saleNumber} registrada (${inserts.length} renglones) — $${multiSaleSummary.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      fetchData();
      setActiveTab('historial');
    } catch (err) {
      showToast('Error al registrar venta: ' + err.message, 'error');
    } finally {
      setSubmittingMultiSale(false);
    }
  };

  // Stock Adjustment
  const openAdjustmentModal = (material) => {
    const stockKg = material.purchased_kg - material.sold_kg;
    setAdjustModal({ ...material, stock_kg: stockKg });
    setAdjustForm({ type: 'add', amount_kg: '', exact_kg: stockKg.toFixed(3), reason: '' });
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustModal) return;
    let qty = 0;
    let isAdd = true;

    if (adjustForm.type === 'set_exact') {
      const exactVal = parseFloat(adjustForm.exact_kg);
      if (isNaN(exactVal) || exactVal < 0) return showToast('Ingresa un stock exacto válido', 'error');
      const diff = exactVal - adjustModal.stock_kg;
      if (Math.abs(diff) < 0.0001) return showToast('El nuevo stock es idéntico al actual', 'error');
      qty = Math.abs(diff);
      isAdd = diff > 0;
    } else {
      qty = parseFloat(adjustForm.amount_kg);
      if (!qty || qty <= 0) return showToast('Ingresa una cantidad de kilos válida', 'error');
      isAdd = adjustForm.type === 'add';
    }

    if (!adjustForm.reason.trim()) return showToast('Ingresa el motivo o razón del ajuste', 'error');

    setSubmittingAdjustment(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const reasonText = adjustForm.reason.trim();

      if (isAdd) {
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

        const { error } = await supabase.from('recycling_purchases').insert({
          purchase_number: purchaseNumber,
          material_type_id: adjustModal.id,
          quantity_kg: qty,
          price_per_kg: 0,
          total_amount: 0,
          supplier_name: 'Ajuste de Inventario',
          notes: `[AJUSTE INVENTARIO +] ${reasonText}`,
          purchased_by: userId
        });
        if (error) throw error;
      } else {
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
          material_type_id: adjustModal.id,
          quantity_kg: qty,
          price_per_kg: 0,
          total_amount: 0,
          buyer_name: 'Ajuste de Inventario',
          notes: `[AJUSTE INVENTARIO -] ${reasonText}`,
          sold_by: userId
        });
        if (error) throw error;
      }

      setAdjustModal(null);
      showToast('Stock ajustado correctamente');
      fetchData();
    } catch (err) {
      showToast('Error al ajustar stock: ' + err.message, 'error');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Movement Edit / Delete
  const openEditMovementModal = (item) => {
    setEditingMovementModal(item);
    setEditMovementForm({
      material_type_id: item.material_type_id || '',
      quantity_kg: String(item.quantity_kg || ''),
      price_per_kg: String(item.price_per_kg || ''),
      who: item.who || '',
      notes: item.notes || ''
    });
  };

  const handleSaveMovementEdit = async () => {
    if (!isAdmin) return showToast('Solo Administradores pueden editar o eliminar movimientos', 'error');
    if (!editingMovementModal) return;
    const qty = parseFloat(editMovementForm.quantity_kg);
    const price = parseFloat(editMovementForm.price_per_kg);
    if (isNaN(qty) || qty <= 0) return showToast('Ingresa una cantidad de kilos válida', 'error');
    if (isNaN(price) || price < 0) return showToast('Ingresa un precio válido', 'error');
    if (!editMovementForm.material_type_id) return showToast('Selecciona un material', 'error');

    setSubmittingEditMovement(true);
    try {
      const item = editingMovementModal;
      const isCompra = item.type === 'compra';
      const total = qty * price;
      const materialName = materialTypes.find(m => m.id === editMovementForm.material_type_id)?.name || '';
      const whoText = editMovementForm.who.trim() || (isCompra ? 'Público en General' : 'Comprador');

      const tableName = isCompra ? 'recycling_purchases' : 'recycling_sales';
      const payload = {
        material_type_id: editMovementForm.material_type_id,
        quantity_kg: qty,
        price_per_kg: price,
        total_amount: total,
        notes: editMovementForm.notes.trim() || null,
        ...(isCompra ? { supplier_name: whoText } : { buyer_name: whoText })
      };

      const { error: updateErr } = await supabase.from(tableName).update(payload).eq('id', item.id);
      if (updateErr) throw updateErr;

      const refType = isCompra ? 'recycling_purchase' : 'recycling_sale';
      const { data: existingCash } = await supabase.from('cash_movements')
        .select('id')
        .eq('reference_id', item.id)
        .eq('reference_type', refType);

      if (existingCash && existingCash.length > 0) {
        await supabase.from('cash_movements').update({
          amount: total,
          concept: isCompra
            ? `Compra tungsteno: ${qty} kg de ${materialName}`
            : `Venta reciclaje: ${qty} kg de ${materialName}`,
          responsible: whoText,
        }).eq('id', existingCash[0].id);
      }

      setEditingMovementModal(null);
      showToast(`Movimiento ${item.number} actualizado — Stock y Caja recalculados`);
      fetchData();
    } catch (err) {
      showToast('Error al actualizar movimiento: ' + err.message, 'error');
    } finally {
      setSubmittingEditMovement(false);
    }
  };

  const handleDeleteMovement = async (item) => {
    if (!isAdmin) return showToast('Solo Administradores pueden editar o eliminar movimientos', 'error');
    if (!confirm(`¿Eliminar definitivamente el movimiento ${item.number}? Esta acción actualizará la caja y el stock.`)) return;

    try {
      const isCompra = item.type === 'compra';
      const refType = isCompra ? 'recycling_purchase' : 'recycling_sale';
      const tableName = isCompra ? 'recycling_purchases' : 'recycling_sales';

      await supabase.from('cash_movements')
        .delete()
        .eq('reference_id', item.id)
        .eq('reference_type', refType);

      const { error } = await supabase.from(tableName).delete().eq('id', item.id);
      if (error) throw error;

      if (editingMovementModal && editingMovementModal.id === item.id) {
        setEditingMovementModal(null);
      }

      showToast(`Movimiento ${item.number} eliminado`);
      fetchData();
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  // Material & Supplier Catalog Handlers
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
      name: newSupplier.name.trim(),
      phone: newSupplier.phone.trim() || null,
      notes: newSupplier.notes.trim() || null,
      is_active: true,
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

  return {
    loading,
    toast,
    showToast,
    activeTab,
    setActiveTab,
    isAdmin,
    materialTypes,
    activeMaterials,
    suppliers,
    filteredSuppliers,
    purchases,
    sales,
    stockArray,
    stockByMaterial,
    totals,

    // Buyer PIN State
    activeBuyer,
    setActiveBuyer,
    showBuyerPinModal,
    setShowBuyerPinModal,
    buyerPinInput,
    setBuyerPinInput,
    buyerModalError,
    verifyingBuyer,
    rememberBuyer,
    setRememberBuyer,
    pendingPurchaseAction,
    setPendingPurchaseAction,
    verifyBuyerPin,
    handleKeypadPress,

    // Purchase Form State
    purchaseForm,
    setPurchaseForm,
    supplierSearch,
    setSupplierSearch,
    showSupplierDropdown,
    setShowSupplierDropdown,
    submittingPurchase,
    purchaseTotal,
    handleMaterialChange,
    handleSupplierSelect,
    handleSubmitPurchase,

    // Multi-Material Sale Form State
    multiSaleBuyer,
    setMultiSaleBuyer,
    multiSaleNotes,
    setMultiSaleNotes,
    multiSaleRows,
    submittingMultiSale,
    multiSaleSummary,
    handleAddSaleRow,
    handleRemoveSaleRow,
    handleSaleRowChange,
    handleSubmitMultiSale,

    // Adjustment Modal State
    adjustModal,
    setAdjustModal,
    adjustForm,
    setAdjustForm,
    submittingAdjustment,
    openAdjustmentModal,
    handleSubmitAdjustment,

    // Edit Movement Modal State
    editingMovementModal,
    setEditingMovementModal,
    editMovementForm,
    setEditMovementForm,
    submittingEditMovement,
    openEditMovementModal,
    handleSaveMovementEdit,
    handleDeleteMovement,

    // Config / Catalog State
    newMaterial,
    setNewMaterial,
    editingMaterial,
    setEditingMaterial,
    newSupplier,
    setNewSupplier,
    editingSupplier,
    setEditingSupplier,
    showAddMaterial,
    setShowAddMaterial,
    showAddSupplier,
    setShowAddSupplier,
    handleAddMaterial,
    handleUpdateMaterial,
    handleToggleMaterial,
    handleAddSupplier,
    handleUpdateSupplier,
    handleToggleSupplier,

    // History & Export
    historyItems,
    historyFilter,
    setHistoryFilter,
    exportHistoryExcel,

    // Refresh
    fetchData,
  };
}
