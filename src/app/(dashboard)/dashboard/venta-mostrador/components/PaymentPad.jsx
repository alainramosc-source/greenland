'use client';
import React from 'react';
import {
  CreditCard, DollarSign, User, FileText, Check, Loader2, RotateCcw, AlertTriangle, ArrowRight
} from 'lucide-react';

export default function PaymentPad({
  customerName,
  setCustomerName,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  notes,
  setNotes,
  submitting,
  saleTotal,
  handleSubmitSale,
  resetSale
}) {
  const receivedNum = parseFloat(amountReceived) || 0;
  const changeNum = paymentMethod === 'Efectivo' && receivedNum >= saleTotal ? (receivedNum - saleTotal) : 0;
  const isEnough = paymentMethod !== 'Efectivo' || receivedNum >= saleTotal;

  // Preset cash tender buttons
  const applyPresetTender = (val) => {
    if (val === 'exact') {
      setAmountReceived(saleTotal.toFixed(2));
    } else {
      setAmountReceived(val.toString());
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5 sticky top-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={16} className="text-[#6a9a04]" /> Terminal de Cobro
        </h3>
        <span className="text-[10px] font-bold text-slate-400">Paso Final</span>
      </div>

      {/* Customer Name Field */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>Cliente</span>
          <button
            type="button"
            onClick={() => setCustomerName('Público General')}
            className="text-[10px] font-extrabold text-[#6a9a04] hover:underline cursor-pointer"
          >
            Público General
          </button>
        </label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nombre del cliente (opcional)..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
          />
        </div>
      </div>

      {/* Payment Method Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Método de Pago *
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('Efectivo')}
            className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === 'Efectivo'
                ? 'bg-[#6a9a04]/10 border-[#6a9a04] text-[#6a9a04] shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <DollarSign size={20} />
            <span>Efectivo</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('Transferencia')}
            className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === 'Transferencia'
                ? 'bg-[#6a9a04]/10 border-[#6a9a04] text-[#6a9a04] shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <CreditCard size={20} />
            <span>Transferencia</span>
          </button>
        </div>
      </div>

      {/* Cash Received & Presets (Only when Efectivo selected) */}
      {paymentMethod === 'Efectivo' && (
        <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 animate-fade-in">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Monto Recibido *</span>
              <span className="text-[10px] text-slate-400">Prisa / Atajos</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl text-base font-black text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04] bg-white"
              />
            </div>
          </div>

          {/* Preset Tender Quick Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => applyPresetTender('exact')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-extrabold text-[#6a9a04] hover:bg-[#6a9a04]/10 transition-colors"
            >
              Exacto
            </button>
            {[100, 200, 500, 1000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => applyPresetTender(val)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ${val}
              </button>
            ))}
          </div>

          {/* Change Display Badge */}
          {amountReceived && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              isEnough ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <span>{isEnough ? 'Cambio a entregar:' : 'Falta para completar:'}</span>
              <span className="text-sm font-black">
                ${Math.abs(changeNum).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Observations / Notes */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
          <FileText size={13} className="text-slate-400" />
          <span>Observaciones (opcional)</span>
        </label>
        <input
          type="text"
          placeholder="Notas de la venta..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
        />
      </div>

      {/* Total Amount Badge */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-1 shadow-md">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Total a Cobrar
        </span>
        <p className="text-3xl font-black text-[#6a9a04] tracking-tight">
          ${saleTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleSubmitSale}
          disabled={submitting || saleTotal <= 0}
          className="w-full py-3.5 px-4 rounded-xl bg-[#6a9a04] hover:bg-[#588203] active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-[#6a9a04]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Procesando Venta...</span>
            </>
          ) : (
            <>
              <span>Cobrar y Registrar</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={resetSale}
          disabled={submitting}
          className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Cancelar Venta</span>
        </button>
      </div>
    </div>
  );
}
