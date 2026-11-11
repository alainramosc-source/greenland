'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShoppingBag, Loader2 } from 'lucide-react';

export default function NewDeliverySaleModal({ supabase, onClose, onSaleCreated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const deliveryType = 'delivery'; // con recolección se registra en Venta Mostrador
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [formError, setFormError] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name');
      if (data && data.length > 0) {
        setWarehouses(data);
        const vitoAlessio = data.find(w => w.code === 'vito-alessio');
        setSelectedWarehouse(vitoAlessio?.id || data[0].id);
      }
    })();
    setTimeout(() => searchInputRef.current?.focus(), 200);
  }, [supabase]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, price')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, supabase]);

  function addToCart(product) {
    if (cart.find(c => c.product_id === product.id)) return;
    setCart(prev => [...prev, {
      product_id: product.id, sku: product.sku, name: product.name,
      quantity: 1, sale_price: product.price ? String(product.price) : '',
    }]);
    setSearchTerm('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  }

  function updateCartItem(idx, field, value) {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeFromCart(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.sale_price) || 0)), 0);
  const isValid = cart.length > 0 && cart.every(item => item.quantity > 0 && item.sale_price && parseFloat(item.sale_price) > 0);

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    if (!paymentMethod) {
      setFormError('Seleccione un método de pago');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id, sku: item.sku, name: item.name,
        quantity: parseInt(item.quantity), sale_price: parseFloat(item.sale_price),
      }));

      const noteText = (customerName ? `Cliente: ${customerName}. ` : '') + (notes || '');
      const { data, error } = await supabase.rpc('create_retail_sale', {
        p_conversation_id: null,
        p_warehouse_id: selectedWarehouse,
        p_delivery_type: deliveryType,
        p_items: items,
        p_notes: noteText,
      });

      if (error) throw error;
      if (data?.success) {
        let payNote = 'por cobrar al entregar';
        if (paymentMethod === 'transfer' && data.order_id) {
          const { error: payError } = await supabase.rpc('register_lastmile_prepayment', {
            p_order_id: data.order_id,
            p_method: 'transfer',
            p_amount: subtotal,
          });
          payNote = payError
            ? `⚠️ no se pudo marcar como pagado: ${payError.message}`
            : 'pagado por transferencia';
        }
        alert(`✅ Envío ${data.order_number} creado (${payNote}) — $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\nCopia el link para el cliente desde "Ver detalle" para que capture su dirección.`);
        onSaleCreated && onSaleCreated();
      } else {
        alert('Error: ' + (data?.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Sale error:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#6a9a04]" /> Nuevo Envío a Domicilio
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del cliente (opcional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Agregar productos</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={cart.find(c => c.product_id === p.id)}
                    className="w-full text-left px-4 py-3 hover:bg-[#6a9a04]/5 transition-colors text-sm border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent"
                  >
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span>
                    <span className="font-medium text-slate-700 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-slate-400">${Number(p.price || 0).toLocaleString('es-MX')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 ? (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Productos ({cart.length})</label>
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={item.product_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                      </div>
                      <button onClick={() => removeFromCart(idx)} className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer border-none bg-transparent">
                        <X className="w-4 h-4 text-slate-300 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 mb-0.5 block">Cantidad</label>
                        <input
                          type="number" min="1" value={item.quantity}
                          onChange={(e) => updateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30 text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 mb-0.5 block">Precio de venta</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input
                            type="number" min="0" step="0.01" value={item.sale_price}
                            onChange={(e) => updateCartItem(idx, 'sale_price', e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30"
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right pt-4">
                        <p className="text-sm font-bold text-slate-700">${(item.quantity * (parseFloat(item.sale_price) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-sm text-slate-400">Busca y agrega productos al carrito</p>
            </div>
          )}

          {cart.length > 0 && (
            <>
              <div className="px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm font-bold text-green-700">
                🚚 Envío a domicilio
                <span className="block text-[11px] font-medium text-green-600">El inventario se descuenta al surtir. Para recolección en bodega usa Venta Mostrador.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Método de pago</label>
                <div className="flex gap-2">
                  <button
                    id="retail-pay-cod"
                    type="button"
                    onClick={() => { setPaymentMethod('cod'); setFormError(null); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      paymentMethod === 'cod' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >💵 Cobrar al entregar</button>
                  <button
                    id="retail-pay-transfer"
                    type="button"
                    onClick={() => { setPaymentMethod('transfer'); setFormError(null); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      paymentMethod === 'transfer' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >🏦 Ya pagó por transferencia</button>
                </div>
                {formError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg mt-2">{formError}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Bodega de salida</label>
                <select
                  value={selectedWarehouse || ''}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 cursor-pointer font-medium text-slate-700"
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas sobre este envío..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Total</span>
              <span className="text-2xl font-black text-slate-900">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            {!isValid && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">⚠️ Todos los productos deben tener precio de venta</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full py-3.5 text-sm font-bold bg-[#6a9a04] text-white rounded-xl hover:bg-[#5a8403] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6a9a04]/20 border-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : '✓ Confirmar Envío'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

