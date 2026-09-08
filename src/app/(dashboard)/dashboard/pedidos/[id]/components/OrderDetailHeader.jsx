'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import { OP_STATUS, PAY_STATUS } from '@/hooks/useOrderDetail';

export default function OrderDetailHeader({
  order,
  isAdmin,
  payments,
  printLoadingSheet,
  handleReorder
}) {
  if (!order) return null;

  const sc = OP_STATUS[order.status] || OP_STATUS.pending;
  const ps = PAY_STATUS[order.payment_status] || PAY_STATUS.unpaid;
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pedidos"
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-inner"
          title="Volver a Pedidos"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Pedido #{order.order_number}
            </h1>

            {/* Badges */}
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide shadow-sm"
              style={{ backgroundColor: sc.bg, color: sc.color }}
            >
              {sc.label}
            </span>

            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide shadow-sm"
              style={{ backgroundColor: ps.bg, color: ps.color }}
            >
              {ps.label}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Realizado el {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Reorder Button for Distributor */}
        {!isAdmin && (
          <button
            onClick={handleReorder}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Volver a Pedir</span>
          </button>
        )}

        {/* Reprint Loading Sheet — Admin, when in_fulfillment or beyond */}
        {isAdmin && ['in_fulfillment', 'shipped', 'closed'].includes(order.status) && (
          <button
            onClick={() => printLoadingSheet()}
            className="px-4 py-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-extrabold text-xs flex items-center gap-2 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Reimprimir Hoja de Carga</span>
          </button>
        )}
      </div>
    </div>
  );
}
