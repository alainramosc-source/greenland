'use client';
import React from 'react';
import { CreditCard, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OrderPaymentsCard({
  order,
  payments,
  isAdmin,
  setShowPaymentModal
}) {
  if (!order) return null;

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalAmount = Number(order.total_amount || 0);
  const rawBalance = totalAmount - totalPaid;
  // Tolerance of up to $1.00 MXN for centavo discrepancies
  const isFullyPaid = (rawBalance <= 1.00) && totalAmount > 0;
  const balance = isFullyPaid ? 0 : rawBalance;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Pagos y Cobranza</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Historial de abonos registrados para este pedido
            </p>
          </div>
        </div>

        {/* Admin Register Payment Button */}
        {isAdmin && order.status !== 'cancelled' && order.status !== 'rejected' && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Pago</span>
          </button>
        )}
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total del Pedido</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Total Pagado</span>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
            ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          balance <= 0
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40 text-red-700 dark:text-red-400'
        }`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">Saldo Pendiente</span>
          <span className="text-lg font-black">
            ${Math.max(0, balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Payment History List */}
      {payments.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          No hay pagos o abonos registrados aún
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Historial de Transacciones</h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                      {p.payment_method} {p.reference ? `· Ref: ${p.reference}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                </div>
                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                  +${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
