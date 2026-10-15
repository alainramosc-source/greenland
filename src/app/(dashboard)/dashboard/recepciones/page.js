'use client';
import { Loader2, Check, X } from 'lucide-react';
import { useRecepcionesList } from '@/hooks/useRecepcionesList';
import ReceptionsHeader from './components/ReceptionsHeader';
import ReceptionsStats from './components/ReceptionsStats';
import ReceptionsFilters from './components/ReceptionsFilters';
import ReceptionsTable from './components/ReceptionsTable';
import ReceptionQuickViewModal from './components/ReceptionQuickViewModal';

export default function RecepcionesPage() {
  const {
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
    refreshData,
    exportToExcel,
  } = useRecepcionesList();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="text-xs font-bold text-slate-400 animate-pulse m-0">
          Cargando Módulo de Recepciones...
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-24 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-2xl text-xs font-extrabold text-white flex items-center gap-2.5 transition-all border border-white/20 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
          }`}
          style={{ animation: 'slideIn 0.3s ease' }}
        >
          {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header Navigation Card */}
      <ReceptionsHeader
        onRefresh={refreshData}
        refreshing={refreshing}
        onExportExcel={exportToExcel}
        totalFiltered={filtered.length}
      />

      {/* 2. Overview Stats Cards */}
      <ReceptionsStats stats={stats} />

      {/* 3. Search and Filters Toolbar */}
      <ReceptionsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        warehouseFilter={warehouseFilter}
        setWarehouseFilter={setWarehouseFilter}
        warehouses={warehouses}
        stats={stats}
        totalFiltered={filtered.length}
      />

      {/* 4. Table View */}
      <ReceptionsTable
        receptions={filtered}
        statusFilter={statusFilter}
        onOpenQuickView={(rec) => setPreviewReception(rec)}
      />

      {/* 5. Quick View Modal */}
      {previewReception && (
        <ReceptionQuickViewModal
          reception={previewReception}
          onClose={() => setPreviewReception(null)}
          warehouses={warehouses}
        />
      )}
    </div>
  );
}
