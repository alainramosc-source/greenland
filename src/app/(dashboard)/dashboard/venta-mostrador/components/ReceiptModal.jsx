'use client';
import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';

export default function ReceiptModal({
  showReceipt,
  setShowReceipt,
  receiptData,
  handlePrint,
  receiptRef,
  resetSale
}) {
  if (!showReceipt || !receiptData) return null;

  // Format date: "07 sep 2026 02:17 p.m."
  const formatDateFormatted = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      hours = hours % 12 || 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`;
    } catch (_) {
      return dateStr;
    }
  };

  const items = receiptData.items || [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const totalConceptos = items.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowReceipt(false); resetSale(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header Success Badge */}
        <div className="text-center space-y-1 shrink-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-black text-slate-900">Comprobante de Venta</h3>
          <p className="text-xs text-slate-500 font-medium">Folio #{receiptData.sale_number}</p>
        </div>

        {/* Printable Ticket Preview (Matched 100% to exact layout screenshot) */}
        <div className="flex-1 overflow-y-auto bg-white p-5 rounded-xl border border-slate-200 text-slate-900 text-xs font-sans space-y-3 shadow-inner" id="receipt-print-area" ref={receiptRef}>
          
          {/* 1. Header Company Name & Border */}
          <div className="text-center border-t-2 border-b-2 border-black py-2">
            <h2 className="font-black text-sm tracking-tight uppercase">GREENLAND PRODUCTS S.A. de C.V.</h2>
          </div>

          {/* 2. Fiscal & Contact Data */}
          <div className="text-center text-[10px] text-slate-700 leading-tight space-y-0.5 border-b-2 border-black pb-2">
            <p className="font-semibold">RFC: GPR230911971</p>
            <p>Tel: (844) 105 8692 / (871) 211 5806</p>
            <p>Blvd. Vito Alessio Robles #3550 Int. 9, Col. Nazario S. Ortiz Garza</p>
            <p>Saltillo, Coah. C.P. 25100</p>
          </div>

          {/* 3. Document Sub-Header */}
          <div className="text-center pt-1 border-b border-slate-200 pb-2">
            <p className="font-extrabold text-[#3b5998] tracking-widest text-[11px] uppercase">
              ★ COMPROBANTE DE VENTA ★
            </p>
          </div>

          {/* 4. Folio & Date/Time Row */}
          <div className="flex items-start justify-between gap-2 text-[11px]">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">FOLIO</span>
              <span className="font-black text-slate-900 text-xs">{receiptData.sale_number}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">FECHA / HORA</span>
              <span className="font-extrabold text-slate-800">{formatDateFormatted(receiptData.created_at)}</span>
            </div>
          </div>

          {/* 5. Customer Row */}
          <div className="flex items-center justify-between text-xs pt-1 border-b border-dashed border-slate-300 pb-2">
            <span className="text-slate-500 font-medium">Cliente:</span>
            <span className="font-black text-slate-900">{receiptData.customer_name || 'Público General'}</span>
          </div>

          {/* 6. Items Table Headers */}
          <div className="border-b border-slate-300 pb-1 pt-1">
            <div className="grid grid-cols-12 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-right">
              <span className="col-span-5 text-left">DESCRIPCIÓN</span>
              <span className="col-span-2">CANT</span>
              <span className="col-span-2">P.UNIT</span>
              <span className="col-span-3">IMPORTE</span>
            </div>
          </div>

          {/* 7. Item Rows */}
          <div className="space-y-2 py-1 text-xs">
            {items.map((item, idx) => {
              const unitPrice = Number(item.unit_price || 0);
              const subtotal = Number(item.subtotal || (item.quantity * unitPrice));
              return (
                <div key={idx} className="grid grid-cols-12 items-baseline text-right">
                  <div className="col-span-5 text-left pr-1">
                    <p className="font-bold text-slate-800 leading-snug">{item.name || item.sku}</p>
                    {item.sku && <p className="text-[9px] font-mono text-slate-400">SKU: {item.sku}</p>}
                  </div>
                  <span className="col-span-2 text-slate-600 font-medium">{item.quantity}</span>
                  <span className="col-span-2 text-slate-500">${unitPrice.toFixed(2)}</span>
                  <span className="col-span-3 font-black text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* 8. Sub-Summary Row */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-b border-dashed border-slate-300 py-1.5 font-medium">
            <span>Artículos: {totalQty}</span>
            <span>{totalConceptos} conceptos</span>
          </div>

          {/* 9. Total Row */}
          <div className="flex items-center justify-between py-2 border-b-2 border-slate-300">
            <span className="text-base font-black text-slate-900 tracking-tight">TOTAL</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              ${Number(receiptData.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* 10. Payment Method & Cash Change */}
          <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-2 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Forma de pago:</span>
              <span className="font-black text-slate-900">{receiptData.payment_method}</span>
            </div>

            {receiptData.payment_method === 'Efectivo' && receiptData.amount_received && (
              <>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span>Monto Recibido:</span>
                  <span>${Number(receiptData.amount_received).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-emerald-700 text-[11px]">
                  <span>Cambio:</span>
                  <span>${Number(receiptData.change || 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* 11. Attended By Row */}
          <div className="flex justify-between items-center text-xs pt-1">
            <span className="text-slate-500">Atendió:</span>
            <span className="font-bold text-slate-800">{receiptData.sold_by_name || 'Admin'}</span>
          </div>

          {/* Optional Notes */}
          {receiptData.notes && (
            <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500">
              <p><strong>Observaciones:</strong> {receiptData.notes}</p>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Printer size={16} />
            <span>Imprimir Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowReceipt(false); resetSale(); }}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
