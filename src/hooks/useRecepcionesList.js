'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import * as XLSX from 'xlsx';

export function getReceptionWarehousesInfo(r, whList = []) {
  const whMap = Object.fromEntries((whList || []).map(w => [w.id, w.name]));

  // 1. Direct tag in notes: [BODEGAS: Bodega Vito Alessio / Bodega Echeverría]
  if (r.notes) {
    const matchB = r.notes.match(/\[BODEGAS:\s*([^\]]+)\]/i);
    if (matchB) {
      const full = matchB[1].trim();
      const parts = full.split('/').map(p => p.trim());
      return {
        isMulti: true,
        names: parts.map(p => p.replace(/^Bodega\s+/i, '')),
        fullName: full,
      };
    }

    // 2. JSON mapping in notes: [ITEM_WAREHOUSES:{"<prodId>":"<whId>"}]
    const matchI = r.notes.match(/\[ITEM_WAREHOUSES:\s*({[^\]]+})\]/);
    if (matchI) {
      try {
        const itemMap = JSON.parse(matchI[1]);
        const uniqueIds = [...new Set(Object.values(itemMap))];
        if (uniqueIds.length > 1) {
          const names = uniqueIds.map(id => whMap[id] || id).filter(Boolean);
          return {
            isMulti: true,
            names: names.map(p => p.replace(/^Bodega\s+/i, '')),
            fullName: names.join(' / '),
          };
        }
      } catch {}
    }
  }

  // 3. Enriched from inventory logs (for legacy receptions before warehouse_id column)
  if (r._detectedMultiWarehouses && r._detectedMultiWarehouses.length > 1) {
    return {
      isMulti: true,
      names: r._detectedMultiWarehouses.map(p => p.replace(/^Bodega\s+/i, '')),
      fullName: r._detectedMultiWarehouses.join(' / '),
    };
  }

  // 4. Item-level warehouse_id if column exists
  const itemWhIds = [...new Set((r.items || []).map(i => i.warehouse_id).filter(Boolean))];
  if (itemWhIds.length > 1) {
    const names = itemWhIds.map(id => whMap[id] || id).filter(Boolean);
    return {
      isMulti: true,
      names: names.map(p => p.replace(/^Bodega\s+/i, '')),
      fullName: names.join(' / '),
    };
  }

  // 5. Special fallback: if multiple containers in label and notes suggest split
  const hasMultipleContainers = (r.container_label || '').includes('/');
  const notesLower = (r.notes || '').toLowerCase();
  if (hasMultipleContainers && (notesLower.includes('echeverr') || notesLower.includes('multibodega'))) {
    return {
      isMulti: true,
      names: ['Vito Alessio', 'Echeverría'],
      fullName: 'Bodega Vito Alessio / Bodega Echeverría',
    };
  }

  // Single warehouse fallback
  const singleName = (itemWhIds[0] && whMap[itemWhIds[0]]) || r.warehouse?.name || '—';
  return {
    isMulti: false,
    names: [singleName.replace(/^Bodega\s+/i, '')],
    fullName: singleName,
  };
}

export function useRecepcionesList() {
  const [receptions, setReceptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [previewReception, setPreviewReception] = useState(null);
  const [toast, setToast] = useState(null);

  const supabase = createClient();
  const router = useRouter();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Fetch warehouses
      const { data: whsData } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      const whList = whsData || [];
      setWarehouses(whList);

      // Fetch receptions with fallback if warehouse_id is not yet in PostgREST cache
      let recsData = null;
      const { data: fullData, error: fullError } = await supabase
        .from('container_receptions')
        .select(`
          *,
          warehouse:warehouses(id, name),
          distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
          po:purchase_orders(po_number),
          items:container_reception_items(id, quantity, product_id, unit_origin_cost, unit_landed_cost, unit_pro_price, warehouse_id, product:products(name, sku))
        `)
        .order('created_at', { ascending: false });

      if (fullError && (fullError.code === '42703' || fullError.message?.includes('warehouse_id'))) {
        const { data: fallbackData } = await supabase
          .from('container_receptions')
          .select(`
            *,
            warehouse:warehouses(id, name),
            distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
            po:purchase_orders(po_number),
            items:container_reception_items(id, quantity, product_id, unit_origin_cost, unit_landed_cost, unit_pro_price, product:products(name, sku))
          `)
          .order('created_at', { ascending: false });
        recsData = fallbackData || [];
      } else {
        recsData = fullData || [];
      }

      // Enrich multibodega from recent inventory_logs if needed
      try {
        const multiContainerRecs = recsData.filter(r => (r.container_label || '').includes('/'));
        if (multiContainerRecs.length > 0) {
          const { data: recentLogs } = await supabase
            .from('inventory_logs')
            .select('product_id, reason')
            .ilike('reason', '%Recepción contenedor%')
            .order('created_at', { ascending: false })
            .limit(50);

          if (recentLogs && recentLogs.length > 0) {
            multiContainerRecs.forEach(r => {
              const firstContainer = r.container_label.split('/')[0].trim();
              const matchedLogs = recentLogs.filter(l => l.reason?.includes(firstContainer));
              if (matchedLogs.length > 0) {
                const detectedWhNames = [];
                whList.forEach(w => {
                  if (matchedLogs.some(l => l.reason?.toLowerCase().includes(w.name.toLowerCase()))) {
                    detectedWhNames.push(w.name);
                  }
                });
                if (detectedWhNames.length > 1) {
                  r._detectedMultiWarehouses = detectedWhNames;
                }
              }
            });
          }
        }
      } catch (logErr) {
        console.warn('Inventory log enrichment error:', logErr);
      }

      setReceptions(recsData);
      if (isManualRefresh) showToast('Datos actualizados');
    } catch (err) {
      console.error('Error fetching receptions:', err);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enriched list with warehouse info
  const enrichedReceptions = useMemo(() => {
    return receptions.map(r => ({
      ...r,
      _whInfo: getReceptionWarehousesInfo(r, warehouses),
      _totalUnits: (r.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    }));
  }, [receptions, warehouses]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCount = enrichedReceptions.length;
    const draftsCount = enrichedReceptions.filter(r => r.status === 'draft').length;
    const completedCount = enrichedReceptions.filter(r => r.status === 'completed').length;
    const cancelledCount = enrichedReceptions.filter(r => r.status === 'cancelled').length;

    const totalUnitsReceived = enrichedReceptions
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + r._totalUnits, 0);

    const totalLandedValue = enrichedReceptions
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + Number(r.total_landed_cost || 0), 0);

    const totalChargesGenerated = enrichedReceptions
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + Number(r.charge_amount || 0), 0);

    return {
      totalCount,
      draftsCount,
      completedCount,
      cancelledCount,
      totalUnitsReceived,
      totalLandedValue,
      totalChargesGenerated,
    };
  }, [enrichedReceptions]);

  // Filtered receptions
  const filtered = useMemo(() => {
    return enrichedReceptions.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Warehouse filter
      if (warehouseFilter === 'multibodega') {
        if (!r._whInfo?.isMulti) return false;
      } else if (warehouseFilter !== 'all') {
        const matchesMain = r.warehouse_id === warehouseFilter;
        const matchesItem = (r.items || []).some(i => i.warehouse_id === warehouseFilter);
        const matchesName = r._whInfo?.fullName?.toLowerCase().includes(
          warehouses.find(w => w.id === warehouseFilter)?.name?.toLowerCase() || ''
        );
        if (!matchesMain && !matchesItem && !matchesName) return false;
      }

      // Search term
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          (r.container_label || '').toLowerCase().includes(s) ||
          (r.pedimento_number || '').toLowerCase().includes(s) ||
          (r.operation_number || '').toLowerCase().includes(s) ||
          (r.customs_broker_ref || '').toLowerCase().includes(s) ||
          (r.distributor?.full_name || '').toLowerCase().includes(s) ||
          (r.distributor?.client_number || '').toLowerCase().includes(s) ||
          (r.warehouse?.name || '').toLowerCase().includes(s) ||
          (r._whInfo?.fullName || '').toLowerCase().includes(s) ||
          (r._whInfo?.isMulti && 'multibodega'.includes(s)) ||
          (r.po?.po_number || '').toLowerCase().includes(s);

        if (!match) return false;
      }

      return true;
    });
  }, [enrichedReceptions, statusFilter, warehouseFilter, searchTerm, warehouses]);

  // Excel export
  const exportToExcel = () => {
    try {
      const rows = filtered.map(r => ({
        'Operación': r.operation_number || 'S/N',
        'Contenedor / Contenedores': r.container_label || 'Sin etiqueta',
        'PO Principal': r.po?.po_number || '',
        'Bodega de Destino': r._whInfo?.fullName || r.warehouse?.name || '',
        'Tipo Destino': r._whInfo?.isMulti ? 'MULTIBODEGA' : 'Unitaria',
        'Distribuidor PRO': r.distributor
          ? `${r.distributor.full_name} (${r.distributor.client_number || ''})`
          : 'Stock Propio (Saltillo)',
        'Fecha Recepción': r.reception_date || '',
        'Pedimento': r.pedimento_number || '',
        'Ref. Aduanal': r.customs_broker_ref || '',
        'Partidas (SKUs)': (r.items || []).length,
        'Total Piezas': r._totalUnits,
        'Costo Origen (MXN)': Number(r.total_origin_cost || 0),
        'Costos Adicionales Landed (MXN)': Number(r.total_additional_costs || 0),
        'Costo Landed Total (MXN)': Number(r.total_landed_cost || 0),
        'Cargo Generado PRO (MXN)': Number(r.charge_amount || 0),
        'Estatus':
          r.status === 'completed'
            ? 'Completada'
            : r.status === 'draft'
            ? 'Borrador'
            : 'Cancelada',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recepciones');
      XLSX.writeFile(
        wb,
        `Recepciones_Contenedores_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      showToast('Reporte de recepciones exportado exitosamente');
    } catch (err) {
      console.error('Error exporting to excel:', err);
      showToast('Error al exportar reporte', 'error');
    }
  };

  return {
    receptions: enrichedReceptions,
    filtered,
    warehouses,
    loading,
    refreshing,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    warehouseFilter,
    setWarehouseFilter,
    previewReception,
    setPreviewReception,
    stats,
    toast,
    refreshData: () => fetchData(true),
    exportToExcel,
  };
}
