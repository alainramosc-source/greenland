'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Banknote, Landmark, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { isPendingSettlement, formatMoney, PAYMENT_METHODS } from './deliveryUtils';

// "Liquidar ruta": when the driver is back at the warehouse, an admin reviews what
// each driver collected and confirms. Cash amounts become cash_movements entries.
export default function SettleRouteModal({ isOpen, orders, onClose, onSettled }) {
  const supabase = createClient();
  const [people, setPeople] = useState({});
  const [selected, setSelected] = useState({});
  const [amounts, setAmounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pending = useMemo(() => (orders || []).filter(isPendingSettlement), [orders]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setResult(null);
    const sel = {};
    const amt = {};
    pending.forEach(o => {
      sel[o.id] = true;
      amt[o.id] = String(Number(o.collected_amount || 0));
    });
    setSelected(sel);
    setAmounts(amt);

    const ids = [...new Set(pending.map(o => o.delivered_by || o.assigned_driver_id).filter(Boolean))];
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      const map = {};
      (data || []).forEach(p => { map[p.id] = p.full_name || p.email; });
      setPeople(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const groups = {};
  pending.forEach(o => {
    const key = o.delivered_by || o.assigned_driver_id || 'sin-chofer';
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  const hasAmount = (o) => ['cash', 'transfer', 'card'].includes(o.collected_method);
  const selectedOrders = pending.filter(o => selected[o.id]);
  const cashTotal = selectedOrders.filter(o => o.collected_method === 'cash').reduce((s, o) => s + (parseFloat(amounts[o.id]) || 0), 0);
  const otherTotal = selectedOrders.filter(o => ['transfer', 'card'].includes(o.collected_method)).reduce((s, o) => s + (parseFloat(amounts[o.id]) || 0), 0);

  async function handleSettle() {
    if (selectedOrders.length === 0 || submitting) return;
    if (!window.confirm(`¿Liquidar ${selectedOrders.length} envío(s)?\n\nEntrarán ${formatMoney(cashTotal)} a la caja de efectivo.`)) return;
    setSubmitting(true);
    setError(null);
    const payload = selectedOrders.map(o => ({
      id: o.id,
      amount: hasAmount(o) ? (parseFloat(amounts[o.id]) || 0) : 0,
    }));
    const { data, error: rpcError } = await supabase.rpc('settle_lastmile_orders', { p_orders: payload });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setResult(data);
    onSettled && onSettled();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Liquidar ruta</h3>
              <p className="text-[11px] text-slate-400">Confirma lo que entregó cada chofer. El efectivo entra a caja.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {result ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-white">Ruta liquidada</h4>
              <p className="text-xs text-slate-300">
                {result.settled} envío(s) · {formatMoney(result.cash_total)} a caja de efectivo
                {Number(result.non_cash_total) > 0 && <> · {formatMoney(result.non_cash_total)} en transferencia/tarjeta</>}
              </p>
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer">Cerrar</button>
            </div>
          ) : pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No hay envíos pendientes de liquidar.</p>
          ) : (
            Object.entries(groups).map(([driverId, list]) => {
              const driverCash = list.filter(o => selected[o.id] && o.collected_method === 'cash').reduce((s, o) => s + (parseFloat(amounts[o.id]) || 0), 0);
              return (
                <div key={driverId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8cc618]" /> {people[driverId] || (driverId === 'sin-chofer' ? 'Sin chofer' : 'Chofer')}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300">Efectivo a entregar: {formatMoney(driverCash)}</span>
                  </div>
                  {list.map(o => {
                    const amountNum = parseFloat(amounts[o.id]);
                    const differs = hasAmount(o) && !isNaN(amountNum) && Math.abs(amountNum - Number(o.collected_amount || 0)) > 0.009;
                    return (
                      <div key={o.id} className={`p-3 rounded-xl border flex items-center gap-3 ${selected[o.id] ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                        <input
                          type="checkbox"
                          checked={!!selected[o.id]}
                          onChange={(e) => setSelected(prev => ({ ...prev, [o.id]: e.target.checked }))}
                          className="w-4 h-4 accent-[#6a9a04] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{o.order_number} · {o.customer_name || 'Sin nombre'}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            {o.collected_method === 'cash' ? <Banknote className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                            {PAYMENT_METHODS[o.collected_method] || (o.status === 'returned' ? 'Devolución total (sin cobro)' : 'Sin cobro')}
                            {' · '}Total pedido {formatMoney(o.total)}
                          </p>
                          {o.delivery_notes && <p className="text-[10px] text-slate-500 italic truncate">"{o.delivery_notes}"</p>}
                        </div>
                        {hasAmount(o) ? (
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={amounts[o.id] ?? ''}
                              onChange={(e) => setAmounts(prev => ({ ...prev, [o.id]: e.target.value }))}
                              className={`w-full pl-5 pr-2 py-1.5 bg-slate-900 border rounded-lg text-xs font-bold text-white outline-none ${differs ? 'border-amber-500' : 'border-slate-700'}`}
                              title="Monto realmente recibido"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 w-28 text-right shrink-0">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {!result && pending.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 space-y-0.5">
              <p>A caja de efectivo: <span className="font-black text-emerald-300 text-sm">{formatMoney(cashTotal)}</span></p>
              {otherTotal > 0 && <p>Transferencia / tarjeta: <span className="font-bold text-slate-200">{formatMoney(otherTotal)}</span></p>}
            </div>
            <button
              onClick={handleSettle}
              disabled={selectedOrders.length === 0 || submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Wallet className="w-4 h-4" />
              {submitting ? 'Liquidando...' : `Liquidar ${selectedOrders.length} envío(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
