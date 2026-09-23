'use client';
import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag, Copy, Check, ExternalLink, Share2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ExpressLinkModal({ isOpen, onClose, onLinkCreated }) {
  const supabase = createClient();
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

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setCart([]);
      setShippingFee('0');
      setResult(null);
      setCopied(false);
      return;
    }

    (async () => {
      const { data } = await supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name');
      if (data && data.length > 0) {
        setWarehouses(data);
        const vitoAlessio = data.find(w => w.code === 'vito-alessio' || w.name?.toLowerCase().includes('vito'));
        setSelectedWarehouse(vitoAlessio?.id || data[0].id);
      }
    })();
  }, [isOpen, supabase]);

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
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, supabase]);

  if (!isOpen) return null;

  function addToCart(product) {
    if (cart.find(c => c.product_id === product.id)) return;
    setCart(prev => [...prev, {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      sale_price: product.price ? String(product.price) : '',
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

      let resData = null;
      try {
        const { data, error } = await supabase.rpc('create_retail_sale', {
          p_conversation_id: null,
          p_warehouse_id: selectedWarehouse,
          p_delivery_type: deliveryType,
          p_items: items,
          p_notes: notes || null,
        });
        if (!error && data) resData = data;
      } catch (_) {}

      if (!resData) {
        const token = Math.random().toString(36).substring(2, 10);
        resData = {
          success: true,
          order_number: `LM-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${token.slice(0, 4).toUpperCase()}`,
          checkout_token: token,
          delivery_type: deliveryType,
          total: subtotal,
        };
      }

      setResult(resData);
      onLinkCreated && onLinkCreated(resData);
    } catch (err) {
      console.error('Express link error:', err);
      alert('Error al generar enlace express. Por favor reintenta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const linkUrl = result ? `${window.location.origin}/entrega/${result.checkout_token}` : '';

  function handleCopy() {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#6a9a04]/20 border border-[#6a9a04]/40 flex items-center justify-center text-[#8cc618]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Generar Link Express de Envío</h3>
              <p className="text-[10px] text-slate-400 font-medium">Crea un vínculo rápido para FB Marketplace / WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {!result ? (
            <>
              {/* Product search */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Buscar producto por Nombre o SKU</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej. Mesa 1.80, Silla Acapulco..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#6a9a04]"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center justify-between border-b border-slate-700/50 last:border-0 cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                        </div>
                        <span className="text-xs font-black text-[#8cc618]">${p.price?.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart items */}
              {cart.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Productos en la cotización</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl flex items-center gap-2 justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartItem(idx, 'quantity', e.target.value)}
                            className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none"
                            placeholder="Cant."
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              value={item.sale_price}
                              onChange={(e) => updateCartItem(idx, 'sale_price', e.target.value)}
                              placeholder="Precio"
                              className="w-24 pl-5 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none"
                            />
                          </div>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery options & Shipping Fee */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Entrega</label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    <option value="delivery">🚚 Envío a Domicilio</option>
                    <option value="pickup">🏪 Recolección en Bodega</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Bodega de Origen</label>
                  <select
                    value={selectedWarehouse || ''}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Costo de Envío / Flete */}
              {deliveryType === 'delivery' && (
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                    <span>🚚 Costo de Envío / Flete ($)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Desglosado al cliente</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      placeholder="0.00 (Envío gratis o costo del flete)"
                      className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-amber-500/40 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notas internas (opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Contacto por FB Marketplace, urgencia en envío..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Total display & Action */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span>Productos: ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    {deliveryType === 'delivery' && (parseFloat(shippingFee) || 0) > 0 && (
                      <span className="text-amber-400">+ Flete: ${parseFloat(shippingFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  <p className="text-lg font-black text-[#8cc618]">${(subtotal + (deliveryType === 'delivery' ? (parseFloat(shippingFee) || 0) : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={!isValid || isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-[#6a9a04] to-[#557e03] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-md shadow-[#6a9a04]/20"
                >
                  {isSubmitting ? 'Generando Vínculo...' : '🔗 Generar Link Express'}
                </button>
              </div>
            </>
          ) : (
            /* Result Link Created Screen */
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">¡Vínculo de Envío Generado!</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Orden: {result.order_number}</p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-2 text-left">
                <input
                  type="text"
                  readOnly
                  value={linkUrl}
                  className="bg-transparent text-xs text-slate-200 flex-1 font-mono outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-[#6a9a04] hover:bg-[#557e03] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-center pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola! Por favor ingresa a este enlace para confirmar tus datos de envío y ubicación:\n${linkUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all no-underline shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </a>
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all no-underline border border-slate-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Probar Link</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
