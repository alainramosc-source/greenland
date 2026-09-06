'use client';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export default function PaymentsSummaryHeader({
  pendingCount,
  approvedMonth,
  totalBalance,
  balances,
  showBalances,
  setShowBalances,
  loading,
  onRefresh
}) {
  return (
    <div className="space-y-4">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Gestión de Pagos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifica, aprueba o rechaza los comprobantes de depósito de los distribuidores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Pagos Pendientes</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{pendingCount}</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Aprobado Este Mes</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${approvedMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <DollarSign size={20} className="text-red-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Total por Cobrar</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Balances Section */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="w-full px-5 py-4 flex items-center justify-between border-none bg-transparent cursor-pointer hover:bg-slate-50/50 transition-colors"
        >
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6a9a04]" /> Saldos por Distribuidor
          </h2>
          {showBalances ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {showBalances && (
          <div className="border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">Distribuidor</th>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase">No. Cliente</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Total Pedidos</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Total Pagado</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((b) => (
                  <tr key={b.id || b.full_name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{b.full_name || 'Distribuidor'}</td>
                    <td className="px-5 py-3 font-mono text-[#6a9a04] text-xs font-bold">{b.client_number || '—'}</td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      ${(b.total_orders || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium">
                      ${(b.total_paid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${(b.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(b.balance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
