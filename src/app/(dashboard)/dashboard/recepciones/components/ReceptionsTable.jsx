'use client';
import Link from 'next/link';
import { Container, Calendar, Warehouse, ChevronRight, Eye, PackageOpen, FileText } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

const STATUS_MAP = {
  draft: { label: 'Borrador', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  completed: { label: 'Completada', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

export default function ReceptionsTable({
  receptions,
  statusFilter,
  onOpenQuickView,
}) {
  if (receptions.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <PackageOpen size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-900 m-0">No se encontraron recepciones</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto m-0">
          {statusFilter !== 'all'
            ? `No hay recepciones registradas con el estatus seleccionado.`
            : 'No hay registros que coincidan con los criterios de búsqueda aplicados.'}
        </p>
        <div className="mt-5">
          <Link
            href="/dashboard/recepciones/nueva"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6a9a04] hover:bg-[#5b8503] text-white text-xs font-bold transition-all shadow-md shadow-[#6a9a04]/20 no-underline"
          >
            Registrar Nueva Recepción
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80">
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Op / Contenedor
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Bodega de Descarga
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Destino / PRO
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Fecha
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Pedimento
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Partidas
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">
                Cargo PRO
              </th>
              <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">
                Estatus
              </th>
              <th className="px-4 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receptions.map((r) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.draft;
              const isMulti = r._whInfo?.isMulti;

              return (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* OP & Container */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
                        <Container size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                          {r.operation_number && (
                            <span className="text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded text-xs font-black">
                              {r.operation_number}
                            </span>
                          )}
                          <span>{r.container_label || 'Sin etiqueta'}</span>
                        </div>
                        {r.po?.po_number && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <FileText size={11} className="text-slate-400" />
                            PO: {r.po.po_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Warehouse / Multibodega */}
                  <td className="px-4 py-4">
                    {isMulti ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                          <Warehouse size={11} className="text-purple-600 shrink-0" /> Multibodega
                        </span>
                        <span className="text-xs font-bold text-slate-800 leading-snug">
                          {r._whInfo.names.join(' / ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Warehouse size={13} className="text-slate-400 shrink-0" />
                        {r._whInfo?.fullName || r.warehouse?.name || '—'}
                      </span>
                    )}
                  </td>

                  {/* Distributor or Saltillo Stock */}
                  <td className="px-4 py-4">
                    {r.distributor ? (
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {r.distributor.full_name}
                        </span>
                        {r.distributor.client_number && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            {r.distributor.client_number}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100/70 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block">
                        Saltillo (Stock Propio)
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>{formatDateOnly(r.reception_date)}</span>
                    </div>
                  </td>

                  {/* Pedimento */}
                  <td className="px-4 py-4">
                    <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/60 whitespace-nowrap inline-block">
                      {r.pedimento_number || '—'}
                    </span>
                  </td>

                  {/* SKUs & Pieces */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs font-black text-slate-800">
                      {(r.items || []).length}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium ml-1">
                      ({r._totalUnits?.toLocaleString('es-MX')} pzas)
                    </span>
                  </td>

                  {/* PRO Charge */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {r.distributor ? (
                      <span className="font-extrabold text-xs text-[#6a9a04]">
                        ${Number(r.charge_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 font-mono">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${st.color} ${st.bg} ${st.border} shadow-xs inline-block`}
                    >
                      {st.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onOpenQuickView && (
                        <button
                          type="button"
                          onClick={() => onOpenQuickView(r)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                          title="Vista rápida"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <Link
                        href={`/dashboard/recepciones/nueva?id=${r.id}`}
                        className="p-1.5 text-slate-400 hover:text-[#6a9a04] hover:bg-[#6a9a04]/10 rounded-lg transition-colors no-underline inline-flex items-center"
                        title="Ver detalle completo"
                      >
                        <ChevronRight size={17} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
