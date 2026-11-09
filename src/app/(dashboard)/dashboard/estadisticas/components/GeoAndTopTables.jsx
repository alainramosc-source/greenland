'use client';
import { MapPin, Warehouse } from 'lucide-react';

export default function GeoAndTopTables({
    cityHeatmap,
    maxCityRevenue,
    warehouseSales,
    topProducts,
    topDistributors,
    fmt
}) {
    return (
        <>
            {/* City Heatmap + Warehouse Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
                {/* City Heatmap */}
                <div className="lg:col-span-3 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#6a9a04]" />
                        <h4 className="font-bold text-slate-900 m-0">Mapa de Calor por Ciudad</h4>
                    </div>
                    {cityHeatmap.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3">Ciudad</th>
                                        <th className="px-3 py-3 text-center">Pedidos</th>
                                        <th className="px-3 py-3 text-center">Dist.</th>
                                        <th className="px-3 py-3">Ingresos</th>
                                        <th className="px-3 py-3 text-right">Ticket</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cityHeatmap.map((row, i) => {
                                        const intensity = row.revenue / maxCityRevenue;
                                        const hue = intensity > 0.7 ? '106, 154, 4' : intensity > 0.3 ? '245, 158, 11' : '239, 68, 68';
                                        return (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-8 rounded-full" style={{
                                                            background: `rgba(${hue}, ${0.3 + intensity * 0.7})`,
                                                            boxShadow: `0 0 8px rgba(${hue}, ${intensity * 0.4})`
                                                        }} />
                                                        <span className="font-bold text-sm text-slate-900">{row.city}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.orders}</td>
                                                <td className="px-3 py-3 text-center text-sm text-slate-500">{row.distributors}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                            <div className="h-full rounded-full transition-all duration-700" style={{
                                                                width: `${intensity * 100}%`,
                                                                background: `rgba(${hue}, 0.85)`
                                                            }} />
                                                        </div>
                                                        <span className="font-bold text-xs text-slate-700">{fmt(row.revenue)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right text-xs font-bold text-slate-500">{fmt(row.avgTicket)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-400 text-sm">Sin datos para este periodo</div>
                    )}
                </div>

                {/* Warehouse Sales */}
                <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-[#6a9a04]" />
                        <h4 className="font-bold text-slate-900 m-0">Despacho por Bodega</h4>
                    </div>
                    <div className="p-6 space-y-5">
                        {warehouseSales.map((wh, i) => (
                            <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-sm text-slate-900">{wh.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                        {wh.totalStock} en stock
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Items despachados</p>
                                        <p className="text-lg font-black text-slate-900 m-0">{wh.items}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase m-0">Ingresos</p>
                                        <p className="text-lg font-black text-[#6a9a04] m-0">{fmt(wh.revenue)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {warehouseSales.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4">Sin bodegas configuradas</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Products + Top Distributors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 m-0">🏆 Productos Estrella</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Producto</th>
                                    <th className="px-3 py-3 text-center">Vendidos</th>
                                    <th className="px-3 py-3 text-right">Ingresos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topProducts.length > 0 ? topProducts.map((row, i) => (
                                    <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.qty}</td>
                                        <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 m-0">👥 Top Distribuidores</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Distribuidor</th>
                                    <th className="px-3 py-3 text-center">Pedidos</th>
                                    <th className="px-3 py-3 text-right">Volumen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topDistributors.length > 0 ? topDistributors.map((row, i) => (
                                    <tr key={i} className="hover:bg-[#6a9a04]/5 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-bold text-sm text-slate-900">{row.name}</div>
                                            <div className="text-[10px] text-slate-400">{row.city}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-sm text-slate-700">{row.count}</td>
                                        <td className="px-3 py-3 text-right font-bold text-sm text-[#6a9a04]">{fmt(row.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-400 text-sm">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
