'use client';
import { Calendar, RefreshCw, Download } from 'lucide-react';
import { useEstadisticas } from '@/hooks/useEstadisticas';
import OperationsAndCharts from './components/OperationsAndCharts';
import DistributorMonthlyMatrix from './components/DistributorMonthlyMatrix';
import GeoAndTopTables from './components/GeoAndTopTables';

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
            <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
                <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
            </div>
        );
    }
    if (!isAdmin) return null;

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 m-0">Centro de Inteligencia GreenLand</h2>
                        <p className="text-slate-500 mt-1 font-medium m-0">KPIs, eficiencia operativa y análisis geográfico en tiempo real</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Exportar Reporte
                        </button>
                        <button
                            onClick={fetchAllData}
                            className="bg-[#6a9a04] text-white flex items-center gap-2 px-5 py-2 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:scale-[1.02] transition-transform cursor-pointer border-none"
                        >
                            <RefreshCw className="w-4 h-4" /> Actualizar
                        </button>
                    </div>
                </header>

                {/* Date Filters */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-4 mb-8 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700 mr-2">Periodo:</span>
                        {['today', 'week', 'month', 'year', 'all'].map(key => (
                            <button
                                key={key}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-none ${dateRange === key ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                                onClick={() => setDateRange(key)}
                            >
                                {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo' }[key]}
                            </button>
                        ))}
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-none transition-all ${dateRange === 'custom' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/50 text-slate-600 hover:bg-white'}`}
                            onClick={() => setDateRange('custom')}
                        >Personalizado</button>
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 ml-4">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                                <span className="text-slate-400">—</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                    className="px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                                />
                            </div>
                        )}
                    </div>
                </div>

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

                {/* City Heatmap, Warehouse Dispatch, Top Products & Top Distributors */}
                <GeoAndTopTables
                    cityHeatmap={cityHeatmap}
                    maxCityRevenue={maxCityRevenue}
                    warehouseSales={warehouseSales}
                    topProducts={topProducts}
                    topDistributors={topDistributors}
                    fmt={fmt}
                />
            </div>
        </div>
    );
}
