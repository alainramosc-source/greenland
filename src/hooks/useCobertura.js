'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function useCobertura() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);
  const transitFileRef = useRef(null);

  // Simulation mode
  const [simulationData, setSimulationData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [saltilloWarehouseIds, setSaltilloWarehouseIds] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [coverageData, setCoverageData] = useState([]);
  const [transitShipments, setTransitShipments] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ stock_bodega: 0, stock_transito: 0, weekly_demand: 0 });
  const [saving, setSaving] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [skuFilter, setSkuFilter] = useState('');

  // Smart coverage state
  const [transitPanel, setTransitPanel] = useState(null); // product_id of open panel
  const [transitForm, setTransitForm] = useState({ quantity: '', estimated_arrival: '', origin: '' });
  const [editingTransitId, setEditingTransitId] = useState(null);
  const [editingTransitForm, setEditingTransitForm] = useState({ quantity: '', estimated_arrival: '', origin: '' });
  const [transitCsvImporting, setTransitCsvImporting] = useState(false);

  // Manufacturer lead time configs — loaded from DB
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);

  // Compute lead time dynamically based on manufacturer + warehouse transit override
  const getLeadTimeWeeks = () => {
    if (!selectedManufacturer) return 9;
    const production = selectedManufacturer.production_lead_weeks || 4;
    // Use warehouse transit override if available, otherwise manufacturer's default
    const transit = selectedWarehouse?.transit_lead_weeks || selectedManufacturer.transit_lead_weeks || 5;
    return production + transit;
  };
  const LEAD_TIME_WEEKS = getLeadTimeWeeks();

  // Dynamic horizon: configurable rolling vision (default 26 weeks ~ 6 months into 2027)
  const [horizonWeeks, setHorizonWeeks] = useState(26);
  const NUM_WEEKS = horizonWeeks;
  const ORDER_CYCLE_WEEKS = 4; // Pedido nuevo cada 4 semanas (mensual)
  const REORDER_TARGET_WEEKS = LEAD_TIME_WEEKS + ORDER_CYCLE_WEEKS;
  const SAFETY_STOCK_WEEKS = 0; // Desactivado por ahora — se activará por SKU después

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, sub_role, assigned_warehouse_id')
      .eq('id', user.id)
      .single();
    const isAdminUser = profile?.role === 'admin';
    const isProUser = profile?.role === 'distributor' && profile?.sub_role === 'distributor_pro' && profile?.assigned_warehouse_id;
    if (!isAdminUser && !isProUser) {
      router.push('/dashboard');
      return;
    }
    setIsAdmin(isAdminUser);
    await fetchBaseData(isProUser ? profile.assigned_warehouse_id : null);
  };

  const fetchBaseData = async (proWarehouseId = null) => {
    setLoading(true);
    const [whRes, prodRes, mfgRes] = await Promise.all([
      supabase.from('warehouses').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('id, name, sku, container_capacity').eq('is_active', true).order('sku'),
      supabase.from('suppliers').select('id, short_name, production_lead_weeks, transit_lead_weeks').eq('type', 'manufacturer').eq('is_active', true).order('short_name'),
    ]);
    const mfgs = mfgRes.data || [];
    setManufacturers(mfgs);
    if (mfgs.length > 0 && !selectedManufacturer) setSelectedManufacturer(mfgs[0]);
    const SALTILLO_BODEGAS = ['Bodega Vito Alessio', 'Bodega Echeverría'];
    const allWarehouses = whRes.data || [];
    const saltilloIds = allWarehouses.filter(w => SALTILLO_BODEGAS.includes(w.name)).map(w => w.id);
    setSaltilloWarehouseIds(saltilloIds);

    let finalWarehouses;
    if (proWarehouseId) {
      // PRO user: show only their assigned warehouse
      const proWh = allWarehouses.find(w => w.id === proWarehouseId);
      if (saltilloIds.includes(proWarehouseId)) {
        // Assigned to a Saltillo warehouse → show combined Saltillo tab
        finalWarehouses = [{ id: 'saltillo-combined', name: 'Saltillo', isCombined: true }];
      } else if (proWh) {
        finalWarehouses = [proWh];
      } else {
        finalWarehouses = [];
      }
    } else {
      // Admin: show all warehouses
      const wh = allWarehouses.filter(w => !SALTILLO_BODEGAS.includes(w.name));
      const saltilloTab = saltilloIds.length > 0 ? [{ id: 'saltillo-combined', name: 'Saltillo', isCombined: true }] : [];
      finalWarehouses = [...saltilloTab, ...wh];
    }

    setWarehouses(finalWarehouses);
    setProducts(prodRes.data || []);
    if (finalWarehouses.length > 0) {
      // If simulation mode, auto-select the simulated warehouse
      let simRaw = null;
      try { simRaw = sessionStorage.getItem('po_simulation'); } catch (e) {}
      const simParsed = simRaw ? JSON.parse(simRaw) : null;
      const simWarehouseId = simParsed?.warehouse_id;
      let defaultWh = finalWarehouses[0];
      if (simWarehouseId) {
        // Check if it matches a Saltillo warehouse
        if (saltilloIds.includes(simWarehouseId)) {
          const saltilloTab = finalWarehouses.find(w => w.isCombined);
          if (saltilloTab) defaultWh = saltilloTab;
        } else {
          const match = finalWarehouses.find(w => w.id === simWarehouseId);
          if (match) defaultWh = match;
        }
      }
      setSelectedWarehouse(defaultWh);
      await Promise.all([
        fetchCoverage(defaultWh, saltilloIds),
        fetchTransits(defaultWh, saltilloIds),
      ]);
    }
    setLoading(false);
  };

  const fetchCoverage = async (warehouse, saltilloIds = saltilloWarehouseIds) => {
    if (warehouse?.isCombined) {
      // Fetch actual stock from warehouse_stock for both Saltillo bodegas
      const [wsRes, covRes] = await Promise.all([
        supabase.from('warehouse_stock').select('*').in('warehouse_id', saltilloIds),
        supabase.from('coverage_inventory').select('*').in('warehouse_id', saltilloIds),
      ]);
      const merged = {};
      // First, load stock data from warehouse_stock
      for (const row of (wsRes.data || [])) {
        if (!merged[row.product_id]) {
          merged[row.product_id] = {
            product_id: row.product_id,
            warehouse_id: 'saltillo-combined',
            stock_bodega: row.stock_quantity || 0,
            stock_transito: 0,
            weekly_demand: 0,
          };
        } else {
          merged[row.product_id].stock_bodega += (row.stock_quantity || 0);
        }
      }
      // Then, overlay weekly_demand and stock_transito from coverage_inventory if available
      for (const row of (covRes.data || [])) {
        if (merged[row.product_id]) {
          merged[row.product_id].stock_transito += (row.stock_transito || 0);
          merged[row.product_id].weekly_demand += (row.weekly_demand || 0);
        } else {
          merged[row.product_id] = {
            product_id: row.product_id,
            warehouse_id: 'saltillo-combined',
            stock_bodega: row.stock_bodega || 0,
            stock_transito: row.stock_transito || 0,
            weekly_demand: row.weekly_demand || 0,
          };
        }
      }
      setCoverageData(Object.values(merged));
    } else {
      // Fetch real stock from warehouse_stock (source of truth) + demand/transit from coverage_inventory
      const [wsRes, covRes] = await Promise.all([
        supabase.from('warehouse_stock').select('product_id, stock_quantity').eq('warehouse_id', warehouse.id),
        supabase.from('coverage_inventory').select('*').eq('warehouse_id', warehouse.id),
      ]);
      const merged = {};
      // First, load real stock from warehouse_stock
      for (const row of (wsRes.data || [])) {
        merged[row.product_id] = {
          product_id: row.product_id,
          warehouse_id: warehouse.id,
          stock_bodega: row.stock_quantity || 0,
          stock_transito: 0,
          weekly_demand: 0,
        };
      }
      // Then, overlay weekly_demand and stock_transito from coverage_inventory
      for (const row of (covRes.data || [])) {
        if (merged[row.product_id]) {
          merged[row.product_id].stock_transito = row.stock_transito || 0;
          merged[row.product_id].weekly_demand = row.weekly_demand || 0;
          if (row.id) merged[row.product_id].id = row.id;
        } else {
          merged[row.product_id] = {
            product_id: row.product_id,
            warehouse_id: warehouse.id,
            stock_bodega: 0,
            stock_transito: row.stock_transito || 0,
            weekly_demand: row.weekly_demand || 0,
            id: row.id,
          };
        }
      }
      setCoverageData(Object.values(merged));
    }
  };

  // Fetch transit shipments for current warehouse context
  const fetchTransits = async (warehouse, saltIds) => {
    const ids = saltIds || saltilloWarehouseIds;
    let query = supabase.from('transit_shipments').select('*').eq('status', 'in_transit');
    if (warehouse?.isCombined) {
      query = query.in('warehouse_id', ids);
    } else if (warehouse?.id) {
      query = query.eq('warehouse_id', warehouse.id);
    }
    const { data } = await query.order('estimated_arrival', { ascending: true });
    setTransitShipments(data || []);
  };

  useEffect(() => {
    checkAdminAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load simulation data from sessionStorage
  useEffect(() => {
    if (searchParams.get('simulate') === 'true') {
      try {
        const raw = sessionStorage.getItem('po_simulation');
        if (raw) setSimulationData(JSON.parse(raw));
      } catch (e) {
        console.warn('Failed to parse simulation data');
      }
    }
  }, [searchParams]);

  const handleWarehouseChange = async (wh) => {
    setSelectedWarehouse(wh);
    setEditingRow(null);
    setTransitPanel(null);
    await Promise.all([fetchCoverage(wh), fetchTransits(wh)]);
  };

  const handleRefresh = async () => {
    if (selectedWarehouse) {
      await Promise.all([fetchCoverage(selectedWarehouse), fetchTransits(selectedWarehouse)]);
      showToast('Datos actualizados');
    }
  };

  const isCombinedView = selectedWarehouse?.isCombined === true;

  // Build heatmap data with SMART reorder intelligence
  const heatmapData = useMemo(() => {
    const now = new Date();
    return products.map(product => {
      const coverage = coverageData.find(c => c.product_id === product.id);
      const stockBodega = coverage?.stock_bodega || 0;
      const weeklyDemand = coverage?.weekly_demand || 0;

      // Get transit shipments for this product (real + simulated)
      const productTransits = transitShipments.filter(t => t.product_id === product.id);
      // Inject simulated transits
      const simTransits = simulationData?.items?.filter(t => t.product_id === product.id) || [];
      const allTransits = [...productTransits, ...simTransits.map(s => ({ ...s, isSimulated: true }))];
      const totalTransitQty = allTransits.reduce((s, t) => s + t.quantity, 0);

      // Calculate which week each transit arrives
      const getTransitWeek = (arrivalDate) => {
        // Normalize both dates to noon to avoid UTC vs local timezone mismatch
        const parts = arrivalDate.toString().split(/[-T]/);
        const arrival = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        const diffMs = arrival - today;
        const diffWeeks = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
        return diffWeeks;
      };

      // SMART projection: week-by-week simulation
      const weeks = [];
      let running = stockBodega; // Start with bodega only, NOT transit
      for (let i = 0; i < NUM_WEEKS; i++) {
        // Inject transits arriving this week
        for (const t of allTransits) {
          if (getTransitWeek(t.estimated_arrival) === i) {
            running += t.quantity;
          }
        }
        // Dead demand: only subtract if stock > 0
        if (running > 0 && weeklyDemand > 0) {
          running = Math.max(0, running - weeklyDemand);
        }
        weeks.push(running);
      }

      // Coverage weeks: when does stock first hit 0?
      const totalStock = stockBodega; // For display, just bodega (transit shown separately)
      const coverageWeeks = weeklyDemand > 0 ? (() => {
        for (let i = 0; i < NUM_WEEKS; i++) {
          if (weeks[i] <= 0) return i;
        }
        return NUM_WEEKS;
      })() : 999;

      // Reorder intelligence
      let stockoutWeek = null;
      let stockoutDate = null;
      let reorderStatus = 'no_demand';
      let reorderMargin = 999;
      let suggestedQty = 0;

      if (weeklyDemand > 0) {
        stockoutWeek = coverageWeeks;
        const stockoutDateObj = new Date(now);
        stockoutDateObj.setDate(now.getDate() + (coverageWeeks * 7));
        stockoutDate = stockoutDateObj;

        reorderMargin = coverageWeeks - LEAD_TIME_WEEKS;

        if (reorderMargin > 4) reorderStatus = 'ok';
        else if (reorderMargin > 0) reorderStatus = 'plan';
        else if (reorderMargin > -4) reorderStatus = 'order_now';
        else reorderStatus = 'late';

        // SMART suggested qty: target stock for (lead_time + cycle + safety) weeks
        // minus what we already have (current stock + incoming transits)
        const neededForTarget = weeklyDemand * (REORDER_TARGET_WEEKS + SAFETY_STOCK_WEEKS);
        const totalOnHand = stockBodega + totalTransitQty;
        suggestedQty = Math.max(0, Math.ceil(neededForTarget - totalOnHand));
      }

      return {
        product,
        stockBodega,
        stockTransito: totalTransitQty,
        weeklyDemand,
        totalStock,
        coverageWeeks,
        weeks,
        coverageId: coverage?.id || null,
        stockoutWeek,
        stockoutDate,
        reorderStatus,
        reorderMargin,
        suggestedQty,
        transitCount: productTransits.length,
        nextArrival: productTransits[0]?.estimated_arrival || null,
      };
    });
  }, [products, coverageData, transitShipments, simulationData, LEAD_TIME_WEEKS, NUM_WEEKS, REORDER_TARGET_WEEKS]);

  // KPIs
  const kpis = useMemo(() => {
    const withDemand = heatmapData.filter(r => r.weeklyDemand > 0);
    const green = withDemand.filter(r => r.coverageWeeks >= 8).length;
    const yellow = withDemand.filter(r => r.coverageWeeks >= 4 && r.coverageWeeks < 8).length;
    const red = withDemand.filter(r => r.coverageWeeks < 4).length;
    const noDemand = heatmapData.filter(r => r.weeklyDemand === 0).length;
    const avgCoverage = withDemand.length > 0
      ? withDemand.reduce((sum, r) => sum + Math.min(r.coverageWeeks, NUM_WEEKS), 0) / withDemand.length
      : 0;
    const needReorder = withDemand.filter(r => r.reorderStatus === 'order_now' || r.reorderStatus === 'late').length;
    return { green, yellow, red, noDemand, avgCoverage, total: heatmapData.length, needReorder };
  }, [heatmapData, NUM_WEEKS]);

  // Products that need urgent reorder
  const reorderAlerts = useMemo(() => {
    return heatmapData
      .filter(r => r.weeklyDemand > 0 && (r.reorderStatus === 'order_now' || r.reorderStatus === 'late' || r.reorderStatus === 'plan'))
      .sort((a, b) => a.reorderMargin - b.reorderMargin);
  }, [heatmapData]);

  // Week labels & rich metadata (supports cross-year 2026 -> 2027 vision)
  const weekMetadata = useMemo(() => {
    const now = new Date();
    const metadata = [];
    const currentYear = now.getFullYear();
    let lastYear = null;

    for (let i = 0; i < NUM_WEEKS; i++) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() + (i * 7));

      // Thursday of the week determines the ISO year
      const target = new Date(weekDate);
      target.setHours(0, 0, 0, 0);
      target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
      const weekNum = getWeekNumber(weekDate);
      const year = target.getFullYear();

      // Detect year transition (e.g. 2026 -> 2027)
      const isYearTransition = lastYear !== null && year !== lastYear;
      lastYear = year;

      // Date range calculation (Monday to Sunday)
      const monday = new Date(weekDate);
      monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const yearSuffix = year !== currentYear ? `'${String(year).slice(-2)}` : '';
      const label = `WK${weekNum.toString().padStart(2, '0')}${yearSuffix ? ' ' + yearSuffix : ''}`;

      // Chinese New Year 2027 (~Feb 2027, weeks 5-7)
      const isCNY = (year === 2027 && (weekNum >= 5 && weekNum <= 7));

      const dateRangeStr = `${monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: year !== currentYear ? 'numeric' : undefined })}`;

      metadata.push({
        index: i,
        weekNum,
        year,
        label,
        isYearTransition,
        isCNY,
        dateRangeStr,
      });
    }
    return metadata;
  }, [NUM_WEEKS]);

  // Edit handlers
  const startEdit = (row) => {
    setEditingRow(row.product.id);
    setEditForm({ stock_bodega: row.stockBodega, stock_transito: row.stockTransito, weekly_demand: row.weeklyDemand });
  };
  const cancelEdit = () => {
    setEditingRow(null);
    setEditForm({ stock_bodega: 0, stock_transito: 0, weekly_demand: 0 });
  };

  const saveEdit = async (productId) => {
    if (!selectedWarehouse) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const newStock = parseInt(editForm.stock_bodega) || 0;
    const newTransito = parseInt(editForm.stock_transito) || 0;
    const newDemand = parseInt(editForm.weekly_demand) || 0;

    // For combined Saltillo view, save transit/demand to the first Saltillo bodega
    const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse.id;

    const payload = {
      warehouse_id: targetWarehouseId,
      product_id: productId,
      stock_bodega: isCombinedView ? 0 : newStock,
      stock_transito: newTransito,
      weekly_demand: newDemand,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    // For combined view, also zero out the second bodega's transit/demand to avoid double-counting
    if (isCombinedView && saltilloWarehouseIds.length > 1) {
      await supabase.from('coverage_inventory').upsert({
        warehouse_id: saltilloWarehouseIds[1],
        product_id: productId,
        stock_bodega: 0,
        stock_transito: 0,
        weekly_demand: 0,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'warehouse_id,product_id' });
    }

    const { error } = await supabase.from('coverage_inventory').upsert(payload, { onConflict: 'warehouse_id,product_id' });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      // Optimistic update — update local state immediately
      setCoverageData(prev => {
        const exists = prev.find(c => c.product_id === productId);
        if (exists) {
          return prev.map(c => c.product_id === productId
            ? { ...c, stock_transito: newTransito, weekly_demand: newDemand, ...(isCombinedView ? {} : { stock_bodega: newStock }) }
            : c);
        }
        return [...prev, { product_id: productId, warehouse_id: targetWarehouseId, stock_bodega: isCombinedView ? 0 : newStock, stock_transito: newTransito, weekly_demand: newDemand }];
      });
      setEditingRow(null);
      showToast('Datos guardados');
    }
    setSaving(false);
  };

  // Auto-detect CSV separator (comma, semicolon, or tab)
  const detectSeparator = (text) => {
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes('\t')) return '\t';
    if (firstLine.includes(';')) return ';';
    return ',';
  };

  // Normalize date string to YYYY-MM-DD, handles: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
  const normalizeDate = (raw) => {
    if (!raw) return null;
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const slash = s.split('/');
    if (slash.length === 3) {
      const [a, b, c] = slash.map(Number);
      if (c > 1000) {
        if (a > 12) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
        if (b > 12) return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
        return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  // CSV Import — format: sku, weekly_demand, transit_qty, transit_date, transit_origin
  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWarehouse) return;
    setCsvImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('sku') || header.includes('demand') || header.includes('demanda');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const { data: { user } } = await supabase.auth.getUser();
    const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
    let demandUpdated = 0, transitsCreated = 0, errors = 0;
    const sep = detectSeparator(text);
    for (const line of dataLines) {
      const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 2) { errors++; continue; }
      const [sku, demanda, transitQty, transitDate, transitOrigin] = cols;
      const product = products.find(p => p.sku === sku);
      if (!product) { errors++; continue; }

      const { error: demandErr } = await supabase.from('coverage_inventory').upsert({
        warehouse_id: targetWarehouseId,
        product_id: product.id,
        weekly_demand: parseInt(demanda) || 0,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'warehouse_id,product_id' });
      if (demandErr) { errors++; } else { demandUpdated++; }

      if (transitQty && parseInt(transitQty) > 0 && transitDate) {
        const normDate = normalizeDate(transitDate);
        if (normDate) {
          const { error: transitErr } = await supabase.from('transit_shipments').insert({
            product_id: product.id,
            warehouse_id: targetWarehouseId,
            quantity: parseInt(transitQty),
            estimated_arrival: normDate,
            origin: transitOrigin || null,
            created_by: user.id,
          });
          if (transitErr) errors++; else transitsCreated++;
        }
      }
    }
    await Promise.all([fetchCoverage(selectedWarehouse), fetchTransits(selectedWarehouse)]);
    setCsvImporting(false);
    e.target.value = '';
    showToast(`${demandUpdated} demandas actualizadas${transitsCreated > 0 ? `, ${transitsCreated} tránsitos creados` : ''}.${errors > 0 ? ` ${errors} errores.` : ''}`, errors > 0 ? 'warning' : 'success');
  };

  // --- Transit Shipment Management ---
  const addTransit = async (productId) => {
    if (!transitForm.quantity || !transitForm.estimated_arrival) {
      showToast('Cantidad y fecha de llegada son obligatorios', 'error');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
    const { error } = await supabase.from('transit_shipments').insert({
      product_id: productId,
      warehouse_id: targetWarehouseId,
      quantity: parseInt(transitForm.quantity),
      estimated_arrival: transitForm.estimated_arrival,
      origin: transitForm.origin || null,
      created_by: user.id,
    });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      setTransitForm({ quantity: '', estimated_arrival: '', origin: '' });
      await fetchTransits(selectedWarehouse);
      showToast('Embarque registrado');
    }
  };

  const deleteTransit = async (transitId) => {
    if (!confirm('¿Eliminar este embarque?')) return;
    const { error } = await supabase.from('transit_shipments').delete().eq('id', transitId);
    if (error) showToast('Error: ' + error.message, 'error');
    else {
      await fetchTransits(selectedWarehouse);
      showToast('Embarque eliminado');
    }
  };

  const markTransitArrived = async (transitId) => {
    const { error } = await supabase.from('transit_shipments')
      .update({ status: 'arrived' }).eq('id', transitId);
    if (error) showToast('Error: ' + error.message, 'error');
    else {
      await fetchTransits(selectedWarehouse);
      showToast('Embarque marcado como llegado');
    }
  };

  const startEditTransit = (t) => {
    setEditingTransitId(t.id);
    const dateStr = t.estimated_arrival ? t.estimated_arrival.toString().split('T')[0] : '';
    setEditingTransitForm({
      quantity: t.quantity || '',
      estimated_arrival: dateStr,
      origin: t.origin || '',
    });
  };

  const cancelEditTransit = () => {
    setEditingTransitId(null);
    setEditingTransitForm({ quantity: '', estimated_arrival: '', origin: '' });
  };

  const saveEditTransit = async (transitId) => {
    if (!editingTransitForm.estimated_arrival || !editingTransitForm.quantity) {
      showToast('Cantidad y fecha de llegada son obligatorios', 'error');
      return;
    }
    const { error } = await supabase
      .from('transit_shipments')
      .update({
        quantity: parseInt(editingTransitForm.quantity) || 0,
        estimated_arrival: editingTransitForm.estimated_arrival,
        origin: editingTransitForm.origin || null,
      })
      .eq('id', transitId);

    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      await fetchTransits(selectedWarehouse);
      setEditingTransitId(null);
      showToast('Embarque actualizado con éxito');
    }
  };

  // Bulk CSV transit import (file-based)
  const handleTransitCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTransitCsvImporting(true);
    const text = await file.text();
    const { data: { user } } = await supabase.auth.getUser();
    const targetWarehouseId = isCombinedView ? saltilloWarehouseIds[0] : selectedWarehouse?.id;
    const lines = text.split('\n').filter(l => l.trim());
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('sku') || header.includes('fecha') || header.includes('cantidad');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    let imported = 0, errors = 0;
    const sep = detectSeparator(text);
    for (const line of dataLines) {
      const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 3) { errors++; continue; }
      const [sku, qty, fecha, origen] = cols;
      const product = products.find(p => p.sku === sku);
      if (!product) { errors++; continue; }
      const normDate = normalizeDate(fecha);
      if (!normDate) { errors++; continue; }
      const { error } = await supabase.from('transit_shipments').insert({
        product_id: product.id,
        warehouse_id: targetWarehouseId,
        quantity: parseInt(qty) || 0,
        estimated_arrival: normDate,
        origin: origen || null,
        created_by: user.id,
      });
      if (error) errors++; else imported++;
    }
    await fetchTransits(selectedWarehouse);
    setTransitCsvImporting(false);
    e.target.value = '';
    showToast(`${imported} tránsitos importados.${errors > 0 ? ` ${errors} errores.` : ''}`, errors > 0 ? 'warning' : 'success');
  };

  return {
    router,
    fileInputRef,
    transitFileRef,
    simulationData,
    loading,
    isAdmin,
    warehouses,
    selectedWarehouse,
    products,
    transitShipments,
    editingRow,
    editForm,
    setEditForm,
    saving,
    csvImporting,
    toast,
    skuFilter,
    setSkuFilter,
    transitPanel,
    setTransitPanel,
    transitForm,
    setTransitForm,
    editingTransitId,
    editingTransitForm,
    setEditingTransitForm,
    transitCsvImporting,
    manufacturers,
    selectedManufacturer,
    setSelectedManufacturer,
    LEAD_TIME_WEEKS,
    horizonWeeks,
    setHorizonWeeks,
    ORDER_CYCLE_WEEKS,
    REORDER_TARGET_WEEKS,
    isCombinedView,
    heatmapData,
    kpis,
    reorderAlerts,
    weekMetadata,
    handleWarehouseChange,
    handleRefresh,
    startEdit,
    cancelEdit,
    saveEdit,
    handleCsvImport,
    handleTransitCsvImport,
    addTransit,
    deleteTransit,
    markTransitArrived,
    startEditTransit,
    cancelEditTransit,
    saveEditTransit,
  };
}

