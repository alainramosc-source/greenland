'use client';
import { Calendar, RefreshCw, Download, BarChart3 } from 'lucide-react';
import { useEstadisticas } from '@/hooks/useEstadisticas';
import OperationsAndCharts from './components/OperationsAndCharts';
import DistributorMonthlyMatrix from './components/DistributorMonthlyMatrix';
import GeoAndTopTables from './components/GeoAndTopTables';

const PERIOD_LABELS = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
  all: 'Todo',
  custom: 'Rango',
};

export default function EstadisticasPage() {
  const {
    loading,
    isAdmin,
    dateRange, setDateRange,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    hoveredMonth, setHoveredMonth,
    kpis,
    conversionRate,
    fulfillmentMetrics,
    statusBreakdown,
    topProducts,
    topDistributors,
    cityHeatmap,
    maxCityRevenue,
    warehouseSales,
    monthlyRevenue,
    maxMonthly,
    matrixMetric, setMatrixMetric,
    matrixRange, setMatrixRange,
    includeCurrentMonth, setIncludeCurrentMonth,
    distSearch, setDistSearch,
    distTrendFilter, setDistTrendFilter,
    expandedDistId, setExpandedDistId,
    distributorMatrixData,
    filteredMatrixRows,
    fetchAllData,
    handleExport,
    handleExportDistributorMatrixXLSX,
    fmt
  } = useEstadisticas();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2 text-xs font-bold">
        <div className="w-6 h-6 border-2 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
        <span>Cargando Centro de Inteligencia...</span>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Executive Header & Period Filter Bar */}
      <header className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#6a9a04]/10 border border-[#6a9a04]/20 flex items-center justify-center text-[#6a9a04] shadow-sm shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5 m-0">
                Centro de Inteligencia GreenLand
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] border border-[#6a9a04]/20">
                  BI & Analytics
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium m-0">
                KPIs comerciales, eficiencia de surtimiento y matriz de rendimiento de distribuidores en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar Reporte
            </button>
            <button
              onClick={fetchAllData}
              className="bg-[#6a9a04] hover:bg-[#5b8503] text-white inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#6a9a04]/20 transition-all cursor-pointer border-none"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>
        </div>

        {/* Segmented Date Filters */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#6a9a04]" />
              <span>Periodo de análisis:</span>
            </div>
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-wrap">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map(key => (
                <button
                  key={key}
                  onClick={() => setDateRange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    dateRange === key
                      ? 'bg-white text-[#6a9a04] shadow-sm border-slate-200/60'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20"
              />
              <span className="text-slate-400 text-xs font-bold">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20"
              />
            </div>
          )}
        </div>
      </header>

      {/* KPIs, Fulfillment & Monthly Bar Chart */}
      <OperationsAndCharts
        kpis={kpis}
        conversionRate={conversionRate}
        fulfillmentMetrics={fulfillmentMetrics}
        monthlyRevenue={monthlyRevenue}
        maxMonthly={maxMonthly}
        hoveredMonth={hoveredMonth}
        setHoveredMonth={setHoveredMonth}
        statusBreakdown={statusBreakdown}
        fmt={fmt}
      />

      {/* Distributor Month-over-Month Performance Matrix */}
      <DistributorMonthlyMatrix
        distributorMatrixData={distributorMatrixData}
        filteredMatrixRows={filteredMatrixRows}
        matrixMetric={matrixMetric}
        setMatrixMetric={setMatrixMetric}
        matrixRange={matrixRange}
        setMatrixRange={setMatrixRange}
        includeCurrentMonth={includeCurrentMonth}
        setIncludeCurrentMonth={setIncludeCurrentMonth}
        distSearch={distSearch}
        setDistSearch={setDistSearch}
        distTrendFilter={distTrendFilter}
        setDistTrendFilter={setDistTrendFilter}
        expandedDistId={expandedDistId}
        setExpandedDistId={setExpandedDistId}
        onExportXLSX={handleExportDistributorMatrixXLSX}
        fmt={fmt}
      />

      {/* City Heatmap, Warehouse Dispatch & Top Products/Distributors */}
      <GeoAndTopTables
        cityHeatmap={cityHeatmap}
        maxCityRevenue={maxCityRevenue}
        warehouseSales={warehouseSales}
        topProducts={topProducts}
        topDistributors={topDistributors}
        fmt={fmt}
      />
    </div>
  );
}
