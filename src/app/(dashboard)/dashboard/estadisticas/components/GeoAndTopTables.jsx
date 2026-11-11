'use client';
import { MapPin, Warehouse, Trophy, Users } from 'lucide-react';

export default function GeoAndTopTables({
  cityHeatmap,
  maxCityRevenue,
  warehouseSales,
  topProducts,
  topDistributors,
  fmt
}) {
  return (
    <div className="space-y-6">
      {/* City Heatmap + Warehouse Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* City Heatmap */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#6a9a04]/10 text-[#6a9a04]">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-base font-black text-slate-900 m-0">Mapa de Calor por Ciudad</h4>
                <p className="text-xs text-slate-500 m-0">Concentración geográfica de ingresos B2B</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">{cityHeatmap.length} plazas</span>
          </div>
          {cityHeatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3">Ciudad</th>
                    <th className="px-3 py-3 text-center">Pedidos</th>
                    <th className="px-3 py-3 text-center">Dist.</th>
                    <th className="px-3 py-3">Ingresos</th>
                    <th className="px-5 py-3 text-right">Ticket Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cityHeatmap.map((row, i) => {
                    const intensity = row.revenue / maxCityRevenue;
                    const hue = intensity > 0.7 ? '106, 154, 4' : intensity > 0.3 ? '245, 158, 11' : '239, 68, 68';
                    return (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-6 rounded-full shrink-0"
                              style={{
                                background: `rgba(${hue}, ${0.3 + intensity * 0.7})`,
                              }}
                            />
                            <span className="font-bold text-xs sm:text-sm text-slate-900">{row.city}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-xs text-slate-700 font-mono">{row.orders}</td>
                        <td className="px-3 py-3 text-center text-xs text-slate-500 font-mono">{row.distributors}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[110px]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${intensity * 100}%`,
                                  background: `rgba(${hue}, 0.85)`
                                }}
                              />
                            </div>
                            <span className="font-bold text-xs text-slate-800 font-mono">{fmt(row.revenue)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-bold text-slate-500 font-mono">{fmt(row.avgTicket)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">Sin datos para este periodo</div>
          )}
        </div>

        {/* Warehouse Sales */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#6a9a04]/10 text-[#6a9a04]">
              <Warehouse className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-base font-black text-slate-900 m-0">Despacho por Bodega</h4>
              <p className="text-xs text-slate-500 m-0">Unidades y monto surtido por centro</p>
            </div>
          </div>
          <div className="p-5 space-y-3.5">
            {warehouseSales.map((wh, i) => (
              <div key={i} className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-900">{wh.name}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
                    {wh.totalStock.toLocaleString('es-MX')} en stock
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Items despachados</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 font-mono m-0 mt-0.5">{wh.items.toLocaleString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ingresos</p>
                    <p className="text-base sm:text-lg font-black text-[#6a9a04] font-mono m-0 mt-0.5">{fmt(wh.revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
            {warehouseSales.length === 0 && (
              <p className="text-center text-slate-400 text-xs font-medium py-8">Sin bodegas configuradas</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Top Distributors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Trophy className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-base font-black text-slate-900 m-0">Productos Estrella</h4>
              <p className="text-xs text-slate-500 m-0">Top 8 SKUs por ingresos en el periodo</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-3 py-3 text-center">Vendidos</th>
                  <th className="px-5 py-3 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.length > 0 ? topProducts.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{row.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-xs sm:text-sm text-slate-700 font-mono">{row.qty.toLocaleString('es-MX')}</td>
                    <td className="px-5 py-3 text-right font-black text-xs sm:text-sm text-[#6a9a04] font-mono">{fmt(row.revenue)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-xs">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-base font-black text-slate-900 m-0">Top Distribuidores</h4>
              <p className="text-xs text-slate-500 m-0">Clientes con mayor volumen de compra</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3">Distribuidor</th>
                  <th className="px-3 py-3 text-center">Pedidos</th>
                  <th className="px-5 py-3 text-right">Volumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDistributors.length > 0 ? topDistributors.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{row.name}</div>
                      <div className="text-[10px] text-slate-400">{row.city}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-xs sm:text-sm text-slate-700 font-mono">{row.count}</td>
                    <td className="px-5 py-3 text-right font-black text-xs sm:text-sm text-[#6a9a04] font-mono">{fmt(row.revenue)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-xs">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
