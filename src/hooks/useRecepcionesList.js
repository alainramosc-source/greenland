'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import * as XLSX from 'xlsx';

export function normalizeSearchText(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function cleanAlphaNumeric(str) {
  return normalizeSearchText(str).replace(/[^a-z0-9]/gi, '');
}

// Créditos PRO por traspaso de inventario: se guardan como "recepción" con cargo
// negativo para que resten del saldo del distribuidor (ver useInventarios.js).
// No son contenedores, así que no se muestran ni se cuentan en este módulo.
const isProTransferCredit = (r) => Number(r.charge_amount) < 0;

// Bodegas de una recepción, a partir del warehouse_id de cada partida.
export function getReceptionWarehousesInfo(r, whList = []) {
  const whMap = Object.fromEntries(whList.map(w => [w.id, w.name]));
  const ids = [...new Set((r.items || []).map(i => i.warehouse_id || r.warehouse_id).filter(Boolean))];
  if (ids.length === 0 && r.warehouse_id) ids.push(r.warehouse_id);

  const fullNames = ids.map(id => whMap[id] || r.warehouse?.name || '—');
  return {
    isMulti: ids.length > 1,
    names: fullNames.map(n => n.replace(/^Bodega\s+/i, '')),
    fullName: fullNames.join(' / ') || '—',
  };
}

const STATUS_LABELS = { completed: 'Completada', draft: 'Borrador', cancelled: 'Cancelada' };

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

      const [{ data: whsData }, { data: recsData, error }] = await Promise.all([
        supabase.from('warehouses').select('id, name, is_active').order('name'),
        supabase
          .from('container_receptions')
          .select(`
            *,
            warehouse:warehouses(id, name),
            distributor:profiles!container_receptions_distributor_id_fkey(full_name, client_number),
            po:purchase_orders(po_number),
            items:container_reception_items(id, quantity, product_id, unit_origin_cost, unit_landed_cost, unit_pro_price, warehouse_id, product:products(name, sku))
          `)
          .order('created_at', { ascending: false }),
      ]);
      if (error) throw error;

      setWarehouses(whsData || []);
      setReceptions((recsData || []).filter(r => !isProTransferCredit(r)));
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
    const completed = enrichedReceptions.filter(r => r.status === 'completed');
    const sum = (list, fn) => list.reduce((s, r) => s + fn(r), 0);

    return {
      totalCount: enrichedReceptions.length,
      draftsCount: enrichedReceptions.filter(r => r.status === 'draft').length,
      completedCount: completed.length,
      cancelledCount: enrichedReceptions.filter(r => r.status === 'cancelled').length,
      totalUnitsReceived: sum(completed, r => r._totalUnits),
      totalLandedValue: sum(completed, r => Number(r.total_landed_cost || 0)),
      totalChargesGenerated: sum(completed, r => Number(r.charge_amount || 0)),
    };
  }, [enrichedReceptions]);

  // Filtered receptions
  const filtered = useMemo(() => {
    return enrichedReceptions.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      if (warehouseFilter === 'multibodega') {
        if (!r._whInfo.isMulti) return false;
      } else if (warehouseFilter !== 'all') {
        const matches =
          r.warehouse_id === warehouseFilter ||
          (r.items || []).some(i => i.warehouse_id === warehouseFilter);
        if (!matches) return false;
      }

      if (searchTerm && searchTerm.trim()) {
        const normQuery = normalizeSearchText(searchTerm).replace(/\s+/g, ' ').trim();
        const alphaQuery = cleanAlphaNumeric(searchTerm);

        const rawCombined = [
          r.pedimento_number,
          r.bl_number,
          r.container_label,
          r.operation_number,
          r.customs_broker_ref,
          r.distributor?.full_name,
          r.distributor?.client_number,
          r._whInfo.fullName,
          r._whInfo.isMulti ? 'multibodega' : '',
          r.po?.po_number,
          r.notes,
          ...(r.items || []).flatMap(i => [i.product?.name, i.product?.sku]),
        ].filter(Boolean).join(' ');
        const normCombined = normalizeSearchText(rawCombined).replace(/\s+/g, ' ');
        const alphaCombined = cleanAlphaNumeric(rawCombined);

        // 1. Texto normal  2. Ignorando espacios/guiones (pedimentos, contenedores)
        // 3. Cada palabra por separado
        const matches =
          normCombined.includes(normQuery) ||
          (alphaQuery && alphaCombined.includes(alphaQuery)) ||
          normQuery.split(' ').filter(Boolean).every(token => {
            const alphaToken = cleanAlphaNumeric(token);
            return normCombined.includes(token) || (alphaToken && alphaCombined.includes(alphaToken));
          });

        if (!matches) return false;
      }

      return true;
    });
  }, [enrichedReceptions, statusFilter, warehouseFilter, searchTerm]);

  // Excel export
  const exportToExcel = () => {
    try {
      const rows = filtered.map(r => ({
        'Operación': r.operation_number || 'S/N',
        'Contenedor / Contenedores': r.container_label || 'Sin etiqueta',
        'PO Principal': r.po?.po_number || '',
        'Bodega de Destino': r._whInfo.fullName,
        'Tipo Destino': r._whInfo.isMulti ? 'MULTIBODEGA' : 'Unitaria',
        'Distribuidor PRO': r.distributor
          ? `${r.distributor.full_name} (${r.distributor.client_number || ''})`
          : 'Stock Propio (Saltillo)',
        'Fecha Recepción': r.reception_date || '',
        'Pedimento': r.pedimento_number || '',
        'BL / Guía': r.bl_number || '',
        'Ref. Aduanal': r.customs_broker_ref || '',
        'Partidas (SKUs)': (r.items || []).length,
        'Total Piezas': r._totalUnits,
        'Costo Origen (MXN)': Number(r.total_origin_cost || 0),
        'Costos Adicionales Landed (MXN)': Number(r.total_additional_costs || 0),
        'Costo Landed Total (MXN)': Number(r.total_landed_cost || 0),
        'Cargo Generado PRO (MXN)': Number(r.charge_amount || 0),
        'Estatus': STATUS_LABELS[r.status] || 'Cancelada',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recepciones');
      XLSX.writeFile(wb, `Recepciones_Contenedores_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Reporte de recepciones exportado exitosamente');
    } catch (err) {
      console.error('Error exporting to excel:', err);
      showToast('Error al exportar reporte', 'error');
    }
  };

  return {
    receptions: enrichedReceptions,
    filtered,
    warehouses: warehouses.filter(w => w.is_active),
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
