'use client';
import React, { useState } from 'react';
import { X, CheckCircle2, Banknote, Landmark, BadgeCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatMoney, amountToCollect } from './deliveryUtils';

// Used by both the driver route and the admin detail modal.
// Marking delivered only records how the customer paid; cash reaches the
// cash box later, when an admin liquidates the route.
// The payment method is never preselected: whoever registers it must click it.
export default function DeliverOrderModal({ order, onClose, onDone }) {
  const supabase = createClient();
  const isPrepaid = order?.payment_status === 'paid';
  const [method, setMethod] = useState(null);
  const [received, setReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!order) return null;

  const toCollect = amountToCollect(order);
  const receivedNum = parseFloat(received);
  const change = !isNaN(receivedNum) ? receivedNum - toCollect : null;

  const options = isPrepaid
    ? [{ key: 'prepaid', label: 'Ya estaba pagado', icon: BadgeCheck }]
    : [
        { key: 'cash', label: 'Efectivo', icon: Banknote },
        { key: 'transfer', label: 'Transferencia', icon: Landmark },
      ];

  function selectMethod(key) {
    setMethod(key);
    setError(null);
    if (key !== 'cash') setReceived('');
  }

  async function handleConfirm() {
    if (submitting) return;
    if (!method) {
      setError('Seleccione un método de pago');
      return;
    }
    if (method === 'cash') {
      if (isNaN(receivedNum) || receivedNum <= 0) {
        setError('Captura cuánto efectivo entregó el cliente');
        return;
      }
      if (receivedNum < toCollect) {
        setError(`Lo recibido (${formatMoney(receivedNum)}) es menor al total a cobrar (${formatMoney(toCollect)})`);
        return;
      }
    }

    const cashNote = method === 'cash'
      ? `Recibió ${formatMoney(receivedNum)}, cambio ${formatMoney(change)}.`
      : null;
    const finalNotes = [cashNote, notes.trim()].filter(Boolean).join(' ') || null;

    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('mark_lastmile_delivered', {
      p_order_id: order.id,
      p_method: method,
      p_amount: method === 'cash' || method === 'transfer' ? toCollect : 0,
      p_notes: finalNotes,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onDone && onDone();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#8cc618]" /> Confirmar entrega
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{order.order_number} · {order.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">{isPrepaid ? 'Pedido pagado por adelantado' : 'Total a cobrar'}</span>
          <span className={`text-lg font-black ${isPrepaid ? 'text-emerald-400' : 'text-[#8cc618]'}`}>
            {isPrepaid ? 'PAGADO' : formatMoney(toCollect)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">¿Cómo pagó el cliente?</label>
          <div className={`grid gap-2 ${options.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {options.map(opt => {
              const Icon = opt.icon;
              const active = method === opt.key;
              return (
                <button
                  key={opt.key}
                  id={`deliver-method-${opt.key}`}
                  type="button"
                  onClick={() => selectMethod(opt.key)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    active ? 'bg-[#6a9a04] border-[#8cc618] text-white shadow-md shadow-[#6a9a04]/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {method === 'cash' && (
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">¿Con cuánto pagó el cliente?</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">$</span>
                <input
                  id="deliver-cash-received"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={received}
                  onChange={(e) => { setReceived(e.target.value); setError(null); }}
                  placeholder={toCollect.toFixed(2)}
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-[#8cc618]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Cambio a entregar</span>
              <span className={`text-lg font-black ${change === null ? 'text-slate-500' : change < 0 ? 'text-red-400' : 'text-amber-300'}`}>
                {change === null ? '—' : change < 0 ? `Faltan ${formatMoney(-change)}` : formatMoney(change)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">El efectivo entra a caja cuando un admin liquide la ruta.</p>
          </div>
        )}

        {method === 'transfer' && (
          <p className="text-[11px] text-slate-400 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            Se registra como pagado por transferencia ({formatMoney(toCollect)}). Verifica que el depósito se haya reflejado.
          </p>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Recibió su hermana..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
          />
        </div>

        {error && <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">{error}</p>}

        <button
          id="deliver-confirm"
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-[#6a9a04] to-[#557e03] hover:brightness-110 text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#6a9a04]/20 disabled:opacity-40 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitting ? 'Guardando...' : 'Confirmar entrega'}
        </button>
      </div>
    </div>
  );
}
