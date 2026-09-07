'use client';
import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function ReceiptModal({
  showReceipt,
  setShowReceipt,
  receiptData,
  handlePrint,
  receiptRef,
  resetSale
}) {
  if (!showReceipt || !receiptData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowReceipt(false); resetSale(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header Success Badge */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900">¡Venta Exitosa!</h3>
          <p className="text-xs text-slate-500 font-medium">Ticket #{receiptData.sale_number}</p>
        </div>

        {/* Printable Ticket Preview Container */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-3" id="receipt-print-area" ref={receiptRef}>
          <div className="text-center border-b border-dashed border-slate-300 pb-2">
            <p className="font-bold text-sm">GREENLAND PRODUCTS</p>
            <p className="text-[10px] text-slate-500">Comprobante de Venta Mostrador</p>
            <p className="text-[10px] text-slate-500">{receiptData.warehouse_name || 'Bodega Vito Alessio'}</p>
          </div>

          <div className="text-[11px] space-y-0.5">
            <p><strong>Folio:</strong> #{receiptData.sale_number}</p>
            <p><strong>Fecha:</strong> {new Date(receiptData.created_at).toLocaleString('es-MX')}</p>
            <p><strong>Cliente:</strong> {receiptData.customer_name || 'Público General'}</p>
            <p><strong>Atendió:</strong> {receiptData.sold_by_name || 'Admin'}</p>
            <p><strong>Pago:</strong> {receiptData.payment_method}</p>
          </div>

          {/* Line Items */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
            <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
              <span>Cant x Prod</span>
              <span>Importe</span>
            </div>
            {(receiptData.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className="line-clamp-1 max-w-[180px]">
                  {item.quantity}x {item.name || item.sku}
                </span>
                <span className="font-bold shrink-0">
                  ${Number(item.subtotal || (item.quantity * item.unit_price)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-right text-[11px]">
            <p className="text-sm font-black flex justify-between">
              <span>TOTAL:</span>
              <span>${Number(receiptData.total).toFixed(2)}</span>
            </p>
            {receiptData.payment_method === 'Efectivo' && (
              <>
                <p className="flex justify-between text-slate-600">
                  <span>Recibido:</span>
                  <span>${Number(receiptData.amount_received).toFixed(2)}</span>
                </p>
                <p className="flex justify-between font-bold text-emerald-700">
                  <span>Cambio:</span>
                  <span>${Number(receiptData.change).toFixed(2)}</span>
                </p>
              </>
            )}
          </div>

          {receiptData.notes && (
            <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500">
              <p><strong>Notas:</strong> {receiptData.notes}</p>
            </div>
          )}

          <div className="text-center border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-400">
            <p>¡Gracias por su compra!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimir Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowReceipt(false); resetSale(); }}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
