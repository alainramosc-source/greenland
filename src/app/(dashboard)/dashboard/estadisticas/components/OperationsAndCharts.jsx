'use client';
import {
    ShoppingCart, DollarSign, TrendingUp, Users, Zap,
    Timer, CheckCircle, Package, Truck
} from 'lucide-react';

const STATUS_CONFIG = {
    pending: { label: 'Pendientes', color: '#f59e0b' },
    confirmed: { label: 'Confirmados', color: '#3b82f6' },
    in_fulfillment: { label: 'En Surtido', color: '#8b5cf6' },
    shipped: { label: 'Enviados', color: '#10b981' },
    closed: { label: 'Cerrados', color: '#6b7280' },
    cancelled: { label: 'Cancelados', color: '#ef4444' },
    rejected: { label: 'Rechazados', color: '#f97316' },
};

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export default function OperationsAndCharts({
    kpis,
    conversionRate,
    fulfillmentMetrics,
    monthlyRevenue,
    maxMonthly,
    hoveredMonth,
    setHoveredMonth,
    statusBreakdown,
    fmt
}) {
    const maxStatusCount = Math.max(...Object.values(statusBreakdown), 1);

    return (
        <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Total Pedidos</p>
                    <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.totalOrders}</h3>
                </div>
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><DollarSign className="w-4 h-4" /></span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ingresos</p>
                    <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.totalRevenue)}</h3>
                </div>
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="p-2 bg-[#6a9a04]/10 text-[#6a9a04] rounded-lg"><TrendingUp className="w-4 h-4" /></span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Ticket Prom.</p>
                    <h3 className="text-2xl font-black text-slate-900 m-0">{fmt(kpis.avgTicket)}</h3>
                </div>
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-4 h-4" /></span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Distribuidores</p>
                    <h3 className="text-2xl font-black text-slate-900 m-0">{kpis.activeDistributors}</h3>
                </div>
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`p-2 rounded-lg ${parseFloat(conversionRate.rate) >= 70 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            <Zap className="w-4 h-4" />
                        </span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider m-0">Conversión</p>
                    <h3 className="text-2xl font-black text-slate-900 m-0">{conversionRate.rate}%</h3>
                    <p className="text-[10px] text-slate-400 m-0">{conversionRate.confirmed}/{conversionRate.total} pedidos</p>
                </div>
            </div>

            {/* Fulfillment Metrics */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-8">
                <h4 className="text-lg font-bold text-slate-900 m-0 mb-5 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-[#6a9a04]" /> Eficiencia de Surtimiento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CheckCircle className="w-5 h-5" /></div>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider m-0">Confirmación</p>
                            <p className="text-xs text-slate-500 m-0">Pedido → Confirmado</p>
                            <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgConfirmTime}</p>
                            <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.confirmCount} pedidos medidos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Package className="w-5 h-5" /></div>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider m-0">Surtido</p>
                            <p className="text-xs text-slate-500 m-0">Confirmado → Enviado</p>
                            <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgFulfillTime}</p>
                            <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.fulfillCount} pedidos medidos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-green-50/50 rounded-xl p-4 border border-green-100">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Truck className="w-5 h-5" /></div>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider m-0">Lead Time Total</p>
                            <p className="text-xs text-slate-500 m-0">Pedido → Entrega a paquetería</p>
                            <p className="text-xl font-black text-slate-900 m-0 mt-1">{fulfillmentMetrics.avgLeadTime}</p>
                            <p className="text-[10px] text-slate-400 m-0">{fulfillmentMetrics.leadCount} pedidos medidos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Bar Chart: Monthly Revenue */}
                <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-8 rounded-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-lg font-bold text-slate-900 m-0">Ventas Mensuales</h4>
                        <span className="flex items-center gap-1 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#6a9a04]" /> {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-end justify-between gap-2" style={{ height: '192px' }}>
                        {monthlyRevenue.map((rev, i) => {
                            const barH = Math.max((rev / maxMonthly) * 180, rev > 0 ? 6 : 0);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 cursor-default" style={{ height: '100%' }} onMouseEnter={() => setHoveredMonth(i)} onMouseLeave={() => setHoveredMonth(null)}>
                                    <div className="w-full relative" style={{ height: `${barH}px` }}>
                                        <div className={`absolute bottom-0 w-full bg-[#6a9a04] rounded-t-lg transition-all h-full ${hoveredMonth === i ? 'brightness-110' : ''}`} />
                                        {hoveredMonth === i && (
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                                                {fmt(rev)}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold ${i === new Date().getMonth() ? 'text-[#6a9a04]' : 'text-slate-400'}`}>{MONTH_NAMES[i]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm p-6 rounded-2xl flex flex-col">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 m-0">Estado de Pedidos</h4>
                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        {Object.entries(statusBreakdown).filter(([, c]) => c > 0).map(([key, count]) => {
                            const cfg = STATUS_CONFIG[key];
                            if (!cfg) return null;
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 min-w-[100px]">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                                        <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
                                    </div>
                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{
                                            width: `${(count / maxStatusCount) * 100}%`,
                                            background: cfg.color,
                                            minWidth: count > 0 ? '8px' : '0'
                                        }} />
                                    </div>
                                    <span className="font-bold text-sm min-w-[30px] text-right" style={{ color: cfg.color }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
