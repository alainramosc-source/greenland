'use client';
import Link from 'next/link';
import { Container, Plus, Download, RefreshCw } from 'lucide-react';

export default function ReceptionsHeader({
  onRefresh,
  refreshing,
  onExportExcel,
  totalFiltered,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl border border-white/60 p-5 sm:p-6 rounded-3xl shadow-xl mb-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6a9a04] to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-[#6a9a04]/25 shrink-0">
          <Container size={26} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
            Recepciones de Contenedores
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              Importaciones
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
            Registro de llegadas, distribución multibodega, costeo landed y cargos a distribuidores PRO
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all shadow-sm font-medium cursor-pointer disabled:opacity-50"
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-[#6a9a04]' : 'text-slate-500'} />
        </button>

        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer hover:border-emerald-300 hover:text-emerald-700"
          title="Exportar listado a archivo Excel (.xlsx)"
        >
          <Download size={15} className="text-emerald-600" />
          <span>Exportar a Excel</span>
          {totalFiltered > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
              {totalFiltered}
            </span>
          )}
        </button>

        <Link
          href="/dashboard/recepciones/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6a9a04] hover:bg-[#5b8503] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#6a9a04]/25 no-underline cursor-pointer active:scale-95"
        >
          <Plus size={16} />
          <span>Nueva Recepción</span>
        </Link>
      </div>
    </div>
  );
}
