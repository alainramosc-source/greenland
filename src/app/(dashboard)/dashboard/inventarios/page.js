'use client';

import React, { useState } from 'react';
import {
  Boxes, RefreshCw, FileSpreadsheet, Sliders, ArrowRightLeft, ClipboardCheck, History, Package, AlertTriangle, Layers, Download
} from 'lucide-react';
import useInventarios from '@/hooks/useInventarios';

import StockTableView from './components/StockTableView';
import AdjustStockModal from './components/AdjustStockModal';
import TransferStockModal from './components/TransferStockModal';
import CsvImportModal from './components/CsvImportModal';
import CountSessionsView from './components/CountSessionsView';
import MovementLogsView from './components/MovementLogsView';
import ProBulkSaleModal from './components/ProBulkSaleModal';

export default function InventariosPage() {
  const {
    stockData,
    products,
    warehouses,
    countSessions,
    movementLogs,
    visibleWarehouses,
    toggleWarehouseVisibility,
    searchFilter,
    setSearchFilter,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    selectedSkus,
    toggleSelectSku,
    selectAllSkus,
    categories,
    matrix,
    stats,
    valuationData,
    loading,
    refreshData,
    handleAdjustStock,
    handleTransferStock,
    handleCreateCountSession,
    handleProRetailSale,
    handleCsvFileSelect,
    csvPreviewData,
    csvInvalidRows,
    handleBulkCsvImport,
    userRole,
    isPro
  } = useInventarios();

  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'conteo' | 'historial'
  const [modalState, setModalState] = useState({
    adjust: false,
    transfer: false,
    csv: false,
    proSale: false,
    targetSkus: []
  });

  const openModal = (type, skus = []) => {
    setModalState({
      adjust: type === 'adjust',
      transfer: type === 'transfer',
      csv: type === 'csv',
      proSale: type === 'proSale',
      targetSkus: skus
    });
  };

  const closeModal = () => {
    setModalState({ adjust: false, transfer: false, csv: false, proSale: false, targetSkus: [] });
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,SKU,Bodega,Cantidad\nGL01,ECHEVERRÍA,50\nGL02,VITO ALESSIO,100";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headers = [
      'SKU',
      'Producto',
      'Categoría',
      'Precio Público ($)',
      ...warehouses.map(w => `${w.name || w.codigo} (Disp)`),
      ...warehouses.map(w => `${w.name || w.codigo} (Res)`),
      'Total Disponible (Neto)',
      'Total Físico (Con Reservas)'
    ];

    const rows = matrix.map(row => {
      const whAvails = warehouses.map(wh => row.warehouses[wh.id]?.available || 0);
      const whRes = warehouses.map(wh => row.warehouses[wh.id]?.reserved || 0);

      return [
        `"${row.sku}"`,
        `"${(row.name || '').replace(/"/g, '""')}"`,
        `"${(row.category || '').replace(/"/g, '""')}"`,
        row.price || 0,
        ...whAvails,
        ...whRes,
        row.totalAvailable,
        row.totalPhysical
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_Greenland_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Boxes className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Control de Inventarios & Bodegas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Matriz de existencias multidepósito, transferencias en tiempo real y auditorías físicas
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm font-medium"
            title="Actualizar Datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Plantilla CSV
          </button>

          <button
            onClick={() => openModal('csv')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Cargar CSV
          </button>

          <button
            onClick={() => openModal('transfer', selectedSkus)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" /> Transferir Stock
          </button>

          <button
            onClick={() => openModal('adjust', selectedSkus)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4" /> Ajuste Manual
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total SKUs</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.totalSkus}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Unidades Disponibles</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.totalUnits.toLocaleString('es-MX')}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Bodegas Activas</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.activeWarehouses}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Alertas Stock Bajo</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{stats.lowStockAlerts}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content View Switcher Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 inline-flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" /> Matriz de Inventarios
        </button>

        <button
          onClick={() => setActiveTab('conteo')}
          className={`pb-3 inline-flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'conteo'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Conteos & Auditorías
          {countSessions.some(s => s.status === 'OPEN') && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
              En progreso
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`pb-3 inline-flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'historial'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" /> Historial de Movimientos
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'matrix' && (
        <StockTableView
          matrix={matrix}
          warehouses={warehouses}
          visibleWarehouses={visibleWarehouses}
          toggleWarehouseVisibility={toggleWarehouseVisibility}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          selectedSkus={selectedSkus}
          toggleSelectSku={toggleSelectSku}
          selectAllSkus={selectAllSkus}
          categories={categories}
          onOpenAdjust={(skus) => openModal('adjust', skus)}
          onOpenTransfer={(skus) => openModal('transfer', skus)}
          onOpenProSale={(skus) => openModal('proSale', skus)}
          userRole={userRole}
          isPro={isPro}
          stats={stats}
          valuationData={valuationData}
          totalProductsCount={products.length}
        />
      )}

      {activeTab === 'conteo' && (
        <CountSessionsView
          sessions={countSessions}
          warehouses={warehouses}
          onCreateSession={handleCreateCountSession}
          loading={loading}
        />
      )}

      {activeTab === 'historial' && (
        <MovementLogsView
          logs={movementLogs}
          warehouses={warehouses}
        />
      )}

      {/* Dialog Modals */}
      <AdjustStockModal
        isOpen={modalState.adjust}
        onClose={closeModal}
        targetSkus={modalState.targetSkus}
        warehouses={warehouses}
        stockData={stockData}
        onSubmit={async (data) => {
          await handleAdjustStock(data);
          closeModal();
        }}
        loading={loading}
      />

      <TransferStockModal
        isOpen={modalState.transfer}
        onClose={closeModal}
        targetSkus={modalState.targetSkus}
        warehouses={warehouses}
        stockData={stockData}
        onSubmit={async (data) => {
          await handleTransferStock(data);
          closeModal();
        }}
        loading={loading}
      />

      <CsvImportModal
        isOpen={modalState.csv}
        onClose={closeModal}
        onFileSelect={handleCsvFileSelect}
        previewData={csvPreviewData}
        invalidRows={csvInvalidRows}
        onSubmit={async () => {
          await handleBulkCsvImport();
          closeModal();
        }}
        loading={loading}
      />

      <ProBulkSaleModal
        isOpen={modalState.proSale}
        onClose={closeModal}
        targetSkus={modalState.targetSkus}
        warehouses={warehouses}
        stockData={stockData}
        onSubmit={async (data) => {
          await handleProRetailSale(data);
          closeModal();
        }}
        loading={loading}
      />
    </div>
  );
}
