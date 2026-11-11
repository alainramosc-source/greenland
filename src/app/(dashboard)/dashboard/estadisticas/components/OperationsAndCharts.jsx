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
    <div className="space-y-6">
      {/* High-Density KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider m-0">Total Pedidos</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">{kpis.totalOrders}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 m-0">Órdenes del periodo</p>
          </div>
          <span className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider m-0">Ingresos</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">{fmt(kpis.totalRevenue)}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 m-0">Volumen facturado</p>
          </div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl shrink-0">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider m-0">Ticket Prom.</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">{fmt(kpis.avgTicket)}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 m-0">Promedio por orden</p>
          </div>
          <span className="p-2.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl shrink-0">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider m-0">Distribuidores</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">{kpis.activeDistributors}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 m-0">Con compra activa</p>
          </div>
          <span className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl shrink-0">
            <Users className="w-4 h-4" />
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 rounded-2xl flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider m-0">Conversión</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">{conversionRate.rate}%</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 m-0">{conversionRate.confirmed}/{conversionRate.total} pedidos</p>
          </div>
          <span className={`p-2.5 rounded-xl border shrink-0 ${
            parseFloat(conversionRate.rate) >= 70
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            <Zap className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Fulfillment Metrics */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm sm:text-base font-black text-slate-900 m-0 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#6a9a04]/10 text-[#6a9a04]">
              <Timer className="w-4 h-4" />
            </span>
            Eficiencia Operativa y Tiempos de Surtimiento
          </h4>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">SLA Logístico</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3.5 bg-blue-50/40 rounded-xl p-3.5 border border-blue-100/80">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider m-0">Confirmación</p>
                <span className="text-[10px] text-slate-400 font-semibold">{fulfillmentMetrics.confirmCount} medidos</span>
              </div>
              <p className="text-lg font-black text-slate-900 m-0 mt-0.5">{fulfillmentMetrics.avgConfirmTime}</p>
              <p className="text-[11px] text-slate-500 m-0">Creación → Confirmado</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-purple-50/40 rounded-xl p-3.5 border border-purple-100/80">
            <div className="w-10 h-10 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider m-0">Surtido en Bodega</p>
                <span className="text-[10px] text-slate-400 font-semibold">{fulfillmentMetrics.fulfillCount} medidos</span>
              </div>
              <p className="text-lg font-black text-slate-900 m-0 mt-0.5">{fulfillmentMetrics.avgFulfillTime}</p>
              <p className="text-[11px] text-slate-500 m-0">Confirmado → Enviado</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider m-0">Lead Time Total</p>
                <span className="text-[10px] text-slate-400 font-semibold">{fulfillmentMetrics.leadCount} medidos</span>
              </div>
              <p className="text-lg font-black text-slate-900 m-0 mt-0.5">{fulfillmentMetrics.avgLeadTime}</p>
              <p className="text-[11px] text-slate-500 m-0">Pedido → Entrega a paquetería</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Monthly Revenue */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-base font-black text-slate-900 m-0">Ventas Mensuales</h4>
              <p className="text-xs text-slate-500 mt-0.5 m-0">Facturación acumulada por mes durante el año en curso</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#6a9a04]/10 text-[#6a9a04]">
              <span className="w-2 h-2 rounded-full bg-[#6a9a04]" /> {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: '192px' }}>
            {monthlyRevenue.map((rev, i) => {
              const barH = Math.max((rev / maxMonthly) * 180, rev > 0 ? 6 : 0);
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-2 cursor-default"
                  style={{ height: '100%' }}
                  onMouseEnter={() => setHoveredMonth(i)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <div className="w-full relative" style={{ height: `${barH}px` }}>
                    <div className={`absolute bottom-0 w-full bg-[#6a9a04] rounded-t-lg transition-all h-full ${hoveredMonth === i ? 'brightness-110 shadow-md shadow-[#6a9a04]/30' : ''}`} />
                    {hoveredMonth === i && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none shadow-md">
                        {fmt(rev)}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${i === new Date().getMonth() ? 'text-[#6a9a04] font-black' : 'text-slate-400'}`}>
                    {MONTH_NAMES[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 rounded-2xl flex flex-col">
          <div className="mb-4">
            <h4 className="text-base font-black text-slate-900 m-0">Estado de Pedidos</h4>
            <p className="text-xs text-slate-500 mt-0.5 m-0">Distribución operativa en el periodo</p>
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {Object.entries(statusBreakdown).filter(([, c]) => c > 0).map(([key, count]) => {
              const cfg = STATUS_CONFIG[key];
              if (!cfg) return null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 min-w-[105px]">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <span className="text-xs font-semibold text-slate-600">{cfg.label}</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(count / maxStatusCount) * 100}%`,
                        background: cfg.color,
                        minWidth: count > 0 ? '8px' : '0'
                      }}
                    />
                  </div>
                  <span className="font-black text-xs min-w-[30px] text-right font-mono" style={{ color: cfg.color }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
