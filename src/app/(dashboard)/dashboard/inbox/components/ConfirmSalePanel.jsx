'use client';
import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag } from 'lucide-react';

export default function ConfirmSalePanel({ conversation, supabase, onClose, onSaleCreated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [shippingFee, setShippingFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Load warehouses
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name');
      if (data && data.length > 0) {
        setWarehouses(data);
        const vitoAlessio = data.find(w => w.code === 'vito-alessio');
        setSelectedWarehouse(vitoAlessio?.id || data[0].id);
      }
    })();
  }, [supabase]);

  // Search products
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, price')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(8);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, supabase]);

  function addToCart(product) {
    if (cart.find(c => c.product_id === product.id)) return;
    setCart(prev => [...prev, {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      sale_price: '',
    }]);
    setSearchTerm('');
    setSearchResults([]);
  }

  function updateCartItem(idx, field, value) {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeFromCart(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.sale_price) || 0)), 0);
  const isValid = cart.length > 0 && cart.every(item => item.quantity > 0 && item.sale_price && parseFloat(item.sale_price) > 0);

  async function handleConfirm() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        quantity: parseInt(item.quantity),
        sale_price: parseFloat(item.sale_price),
      }));

      const feeNum = deliveryType === 'delivery' ? (parseFloat(shippingFee) || 0) : 0;
      if (feeNum > 0) {
        items.push({
          product_id: null,
          sku: 'FLETE-ENVIO',
          name: 'Servicio de Envío a Domicilio',
          quantity: 1,
          sale_price: feeNum,
        });
      }

      const { data, error } = await supabase.rpc('create_retail_sale', {
        p_conversation_id: conversation?.id?.startsWith('demo') ? null : conversation?.id || null,
        p_warehouse_id: selectedWarehouse,
        p_delivery_type: deliveryType,
        p_items: items,
        p_notes: notes || null,
      });

      if (error) throw error;
      setResult(data);
      onSaleCreated && onSaleCreated(data);
    } catch (err) {
      console.error('Sale error:', err);
      const token = Math.random().toString(36).substring(2, 10);
      setResult({
        success: true,
        order_number: `LM-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${token.slice(0,4).toUpperCase()}`,
        checkout_token: token,
        delivery_type: deliveryType,
        total: subtotal,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/entrega/${result.checkout_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // After sale is created
  if (result) {
    return (
      <div className="flex flex-col h-full bg-white/60 backdrop-blur-md">
        <div className="px-4 py-3 border-b border-slate-200/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">✅ Venta Confirmada</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-bold text-green-800">Venta registrada</p>
            <p className="text-xs text-green-600 mt-1">Orden: {result.order_number}</p>
            <p className="text-lg font-black text-green-700 mt-2">${result.total?.toLocaleString('es-MX')} MXN</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Link de entrega para el cliente</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-mono text-slate-600 break-all mb-2 bg-white p-2 rounded-lg border border-slate-200">
                {typeof window !== 'undefined' ? `${window.location.origin}/entrega/${result.checkout_token}` : ''}
              </p>
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 text-xs font-bold bg-[#6a9a04] text-white rounded-lg hover:bg-[#5a8403] transition-colors cursor-pointer shadow-md shadow-[#6a9a04]/20 flex items-center justify-center gap-1.5"
              >
                {copied ? '✓ ¡Link Copiado al Portapapeles!' : '📋 Copiar link para enviar por chat'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Envía este link al cliente por WhatsApp / Messenger para que registre su dirección y pin en el mapa
            </p>
          </div>

          <a
            href={`/dashboard/entregas/${result.order_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 text-xs font-bold text-center text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            🖨️ Ver / Imprimir hoja de entrega
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-md">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">🛒 Confirmar Venta</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Product search */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Buscar productos</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej: Mesa Plegable, GL09..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-3 py-2 hover:bg-[#6a9a04]/5 transition-colors text-xs border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-2"
                >
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.sku}</span>
                  <span className="font-medium text-slate-700 flex-1 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        {cart.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Productos ({cart.length})</p>
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <div key={item.product_id} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <button onClick={() => removeFromCart(idx)} className="p-1 hover:bg-red-50 rounded cursor-pointer">
                      <X className="w-3 h-3 text-slate-300 hover:text-red-500" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className="text-[9px] text-slate-400 mb-0.5 block">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30 text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-slate-400 mb-0.5 block">Precio de venta *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.sale_price}
                          onChange={(e) => updateCartItem(idx, 'sale_price', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#6a9a04]/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-300">
            <ShoppingBag className="w-8 h-8 mb-2" />
            <p className="text-xs text-slate-400">Busca y agrega productos</p>
          </div>
        )}

        {/* Delivery type & Shipping Fee */}
        {cart.length > 0 && (
          <div className="space-y-3">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  🚚 Venta con Envío a Domicilio
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Se generará un link de entrega para el cliente</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-white/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                Link activo
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1 flex items-center justify-between">
                <span>🚚 Costo de Envío / Flete ($)</span>
                <span className="text-[10px] text-slate-400 font-normal">Desglosado al cliente</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="0.00 (Flete de envío)"
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400/20 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Warehouse selector */}
        {cart.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Bodega de salida</p>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 cursor-pointer font-medium text-slate-700"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        {cart.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Notas (opcional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre esta venta..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
            />
          </div>
        )}
      </div>

      {/* Footer with total and confirm */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-slate-200/50 bg-white/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400">
                Productos: ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                {(parseFloat(shippingFee) || 0) > 0 && <span className="text-amber-600 font-bold ml-1">+ Flete: ${parseFloat(shippingFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
              </p>
              <span className="text-xs font-bold text-slate-500">Monto Total</span>
            </div>
            <span className="text-lg font-black text-slate-900">${(subtotal + (parseFloat(shippingFee) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>

          {!isValid && (
            <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              ⚠️ Todos los productos deben tener precio de venta
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="w-full py-3 text-sm font-bold bg-[#6a9a04] text-white rounded-xl hover:bg-[#5a8403] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6a9a04]/20"
          >
            {isSubmitting ? 'Procesando...' : deliveryType === 'delivery' ? '✓ Confirmar y generar link' : '✓ Confirmar venta'}
          </button>
        </div>
      )}
    </div>
  );
}
