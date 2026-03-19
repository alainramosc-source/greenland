'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare, Search, Filter, Send, Paperclip, Image as ImageIcon,
  Smile, MoreVertical, Phone, Video, ArrowLeft, Hash, Tag, User,
  Clock, CheckCheck, Check, X, Plus, ChevronDown, Star, Archive,
  Zap, FileText, MapPin, ShoppingBag, Edit3, Trash2, MessageCircle,
  Settings, Wifi, WifiOff, List, GitBranch, GripVertical, ChevronLeft, ChevronRight
} from 'lucide-react';

// Platform config
const PLATFORM_CONFIG = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: '💬', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  messenger: { label: 'Messenger', color: '#0084FF', icon: '💙', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  instagram: { label: 'Instagram', color: '#E4405F', icon: '📸', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
};

const STATUS_ICONS = {
  pending: <Clock className="w-3 h-3 text-slate-400" />,
  sent: <Check className="w-3 h-3 text-slate-400" />,
  delivered: <CheckCheck className="w-3 h-3 text-slate-400" />,
  read: <CheckCheck className="w-3 h-3 text-blue-500" />,
  failed: <X className="w-3 h-3 text-red-500" />,
};

// ============================================================
// CONVERSATION LIST (Left Panel)
// ============================================================
function ConversationList({ conversations, activeConversation, onSelect, searchTerm, onSearchChange, platformFilter, onPlatformFilter }) {
  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-md border-r border-slate-200/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#6a9a04]" />
            Inbox
          </h2>
          <div className="flex items-center gap-1">
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => onPlatformFilter(platformFilter === key ? null : key)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  platformFilter === key
                    ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                    : 'bg-white/50 border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {cfg.icon}
              </button>
            ))}
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Conversation entries */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
            <MessageCircle className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-center">No hay conversaciones aún</p>
            <p className="text-xs text-center mt-1">Conecta tus redes sociales para empezar a recibir mensajes</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const platform = PLATFORM_CONFIG[conv.platform] || PLATFORM_CONFIG.whatsapp;
            const isActive = activeConversation?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-start gap-3 p-4 border-b border-slate-100 transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#6a9a04]/5 border-l-4 border-l-[#6a9a04]'
                    : 'hover:bg-slate-50/50 border-l-4 border-l-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
                    {conv.contact_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    {conv.platform === 'whatsapp' ? '📱' : conv.platform === 'messenger' ? '💬' : '📷'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-[#6a9a04]' : 'text-slate-900'}`}>
                      {conv.contact_name || 'Sin nombre'}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {conv.last_message_at ? formatTimeAgo(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {conv.last_message_preview || 'Sin mensajes'}
                  </p>
                  {/* Tags */}
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {conv.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unread badge */}
                {conv.unread_count > 0 && (
                  <span className="shrink-0 w-5 h-5 bg-[#6a9a04] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// CONFIRM SALE PANEL (Triggered from chat header)
// ============================================================
function ConfirmSalePanel({ conversation, supabase, onClose, onSaleCreated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
  }, [searchTerm]);

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

      const { data, error } = await supabase.rpc('create_lastmile_sale', {
        p_conversation_id: conversation?.id?.startsWith('demo') ? null : conversation?.id || null,
        p_delivery_type: deliveryType,
        p_items: items,
        p_notes: notes || null,
      });

      if (error) throw error;
      setResult(data);
      onSaleCreated && onSaleCreated(data);
    } catch (err) {
      console.error('Sale error:', err);
      // For demo mode, simulate a result
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

          {result.delivery_type === 'delivery' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Link de entrega</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-600 break-all mb-2">
                  {typeof window !== 'undefined' ? `${window.location.origin}/entrega/${result.checkout_token}` : ''}
                </p>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2 text-xs font-bold bg-[#6a9a04] text-white rounded-lg hover:bg-[#5a8403] transition-colors cursor-pointer"
                >
                  {copied ? '✓ ¡Copiado!' : '📋 Copiar link para enviar al cliente'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Envía este link al cliente por chat para que llene sus datos de entrega
              </p>
            </div>
          )}

          {result.delivery_type === 'pickup' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-blue-800">🏪 Recoger en sitio</p>
              <p className="text-xs text-blue-600 mt-1">El cliente pasará a recoger su pedido</p>
            </div>
          )}

          {/* Delivery Sheet Link */}
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

        {/* Delivery type */}
        {cart.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tipo de entrega</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  deliveryType === 'pickup'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                🏪 Recoger en sitio
              </button>
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  deliveryType === 'delivery'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                🚚 Envío a domicilio
              </button>
            </div>
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
            <span className="text-xs font-bold text-slate-500">Total</span>
            <span className="text-lg font-black text-slate-900">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
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

// ============================================================
// CHAT VIEW (Center Panel)
// ============================================================
function ChatView({ conversation, messages, onSendMessage, templates, onCreateOrder }) {
  const [inputValue, setInputValue] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    setShowTemplates(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (inputValue.startsWith('/') && inputValue.length > 1) {
      setShowTemplates(true);
    } else {
      setShowTemplates(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setInputValue(template.content);
    setShowTemplates(false);
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-50/50 to-white">
        <div className="w-24 h-24 bg-[#6a9a04]/10 rounded-3xl flex items-center justify-center mb-6">
          <MessageSquare className="w-12 h-12 text-[#6a9a04]" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Greenland Inbox</h3>
        <p className="text-sm text-slate-500 max-w-xs text-center">
          Selecciona una conversación para empezar a chatear con tus clientes
        </p>
      </div>
    );
  }

  const platform = PLATFORM_CONFIG[conversation.platform] || PLATFORM_CONFIG.whatsapp;

  // Filter templates based on input
  const filteredTemplates = showTemplates && templates
    ? templates.filter(t => t.title.toLowerCase().includes(inputValue.slice(1).toLowerCase()))
    : [];

  return (
    <div className="flex flex-col h-full bg-white/40">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-slate-200/50 bg-white/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
              {conversation.contact_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: platform.color }}
            />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{conversation.contact_name || 'Sin nombre'}</p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span style={{ color: platform.color }}>{platform.icon}</span> {platform.label}
              {conversation.contact_phone && <> · {conversation.contact_phone}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCreateOrder} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="Confirmar venta">
            <ShoppingBag className="w-4 h-4 text-slate-500" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="Más opciones">
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 bg-white/80 px-4 py-2 rounded-xl shadow-sm">
              No hay mensajes en esta conversación
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                    isOutbound
                      ? 'bg-[#6a9a04] text-white rounded-br-md'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {msg.content_type === 'image' && msg.media_url && (
                    <img src={msg.media_url} alt="" className="rounded-xl mb-2 max-w-full" />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? 'text-white/60' : 'text-slate-400'}`}>
                    <span className="text-[10px]">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {isOutbound && STATUS_ICONS[msg.status]}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Template suggestions */}
      {filteredTemplates.length > 0 && (
        <div className="border-t border-slate-200/50 bg-white/80 backdrop-blur-md max-h-40 overflow-y-auto">
          {filteredTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplateSelect(t)}
              className="w-full text-left px-4 py-2.5 hover:bg-[#6a9a04]/5 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
            >
              <p className="text-xs font-bold text-[#6a9a04]">/{t.title}</p>
              <p className="text-xs text-slate-500 truncate">{t.content}</p>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-slate-200/50 bg-white/60 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer" title="Adjuntar archivo">
            <Paperclip className="w-5 h-5 text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer" title="Enviar imagen">
            <ImageIcon className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje... (/ para respuestas rápidas)"
              rows={1}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none placeholder:text-slate-400"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer" title="Respuesta rápida">
            <Zap className="w-5 h-5 text-amber-500" />
          </button>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2.5 bg-[#6a9a04] text-white rounded-xl transition-all hover:bg-[#5a8a03] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6a9a04]/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONTACT PANEL (Right Panel)
// ============================================================
function ContactPanel({ conversation, tags, onAddTag, onRemoveTag, onUpdateNotes }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  useEffect(() => {
    setNotesValue(conversation?.contact_notes || '');
    setIsEditingNotes(false);
  }, [conversation?.id]);

  if (!conversation) return null;

  const platform = PLATFORM_CONFIG[conversation.platform] || PLATFORM_CONFIG.whatsapp;

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-md border-l border-slate-200/50 overflow-y-auto">
      {/* Contact header */}
      <div className="p-5 border-b border-slate-200/50 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-black text-xl mb-3">
          {conversation.contact_name?.[0]?.toUpperCase() || '?'}
        </div>
        <h3 className="font-bold text-slate-900">{conversation.contact_name || 'Sin nombre'}</h3>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${platform.bg} ${platform.border} ${platform.text} border`}
        >
          {platform.icon} {platform.label}
        </span>
      </div>

      {/* Contact info */}
      <div className="p-4 border-b border-slate-200/50">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Información</p>
        <div className="space-y-2">
          {conversation.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{conversation.contact_phone}</span>
            </div>
          )}
          {conversation.contact_email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>{conversation.contact_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Desde {conversation.contact_created ? formatDate(conversation.contact_created) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Etiquetas</p>
          <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {conversation.tags && conversation.tags.length > 0 ? (
            conversation.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
                <X className="w-2.5 h-2.5" onClick={() => onRemoveTag && onRemoveTag(tag.id)} />
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-400">Sin etiquetas</p>
          )}
        </div>
      </div>

      {/* Funnel Stage */}
      <div className="p-4 border-b border-slate-200/50">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Embudo de Ventas</p>
        {conversation.funnel_stage ? (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conversation.funnel_stage.color }} />
            <span className="text-sm font-medium text-slate-700">{conversation.funnel_stage.name}</span>
          </div>
        ) : (
          <button className="text-xs text-[#6a9a04] font-bold hover:underline cursor-pointer">
            + Asignar a embudo
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notas</p>
          <button
            onClick={() => {
              if (isEditingNotes) {
                onUpdateNotes && onUpdateNotes(notesValue);
              }
              setIsEditingNotes(!isEditingNotes);
            }}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {isEditingNotes ? <Check className="w-3.5 h-3.5 text-[#6a9a04]" /> : <Edit3 className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
        {isEditingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            className="w-full p-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
            rows={4}
            placeholder="Notas sobre este contacto..."
          />
        ) : (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {conversation.contact_notes || 'Sin notas'}
          </p>
        )}
      </div>

      {/* Last-mile orders */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pedidos</p>
          <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Crear pedido de última milla">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-400">Sin pedidos aún</p>
      </div>
    </div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// DEMO DATA (shown when no real conversations exist)
// ============================================================
function getDemoConversations() {
  return [
    {
      id: 'demo-1',
      contact_name: 'María González',
      platform: 'whatsapp',
      last_message_at: new Date(Date.now() - 300000).toISOString(),
      last_message_preview: 'Hola, me interesa la Mesa Plegable 1.80, ¿la tienen disponible?',
      unread_count: 2,
      contact_phone: '+52 844 123 4567',
      contact_notes: 'Interesada en mesas y sillas para evento. Zona norte de Saltillo.',
      tags: [{ name: 'Interesado', color: '#f59e0b' }, { name: 'Saltillo', color: '#3b82f6' }],
    },
    {
      id: 'demo-2',
      contact_name: 'Carlos Mendoza',
      platform: 'instagram',
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
      last_message_preview: '¿Hacen envíos a Monterrey?',
      unread_count: 0,
      contact_phone: '+52 811 987 6543',
      contact_notes: '',
      tags: [{ name: 'Monterrey', color: '#8b5cf6' }],
    },
    {
      id: 'demo-3',
      contact_name: 'Ana Rodríguez',
      platform: 'messenger',
      last_message_at: new Date(Date.now() - 86400000).toISOString(),
      last_message_preview: 'Perfecto, quedo al pendiente del presupuesto',
      unread_count: 0,
      contact_phone: '+52 833 456 7890',
      contact_notes: 'Pidió cotización para 5 Sillas Plegables C17.',
      tags: [{ name: 'Cotización', color: '#10b981' }, { name: 'Tampico', color: '#ef4444' }],
    },
  ];
}

function getDemoMessages() {
  const now = Date.now();
  return [
    { id: 'msg-1', direction: 'inbound', content: 'Hola buenas tardes 👋', content_type: 'text', status: 'read', created_at: new Date(now - 600000).toISOString() },
    { id: 'msg-2', direction: 'inbound', content: 'Me interesa la Mesa Plegable 1.80 ¿la tienen disponible?', content_type: 'text', status: 'read', created_at: new Date(now - 540000).toISOString() },
    { id: 'msg-3', direction: 'outbound', content: '¡Hola María! Claro que sí, tenemos la Mesa Plegable 1.80×70 y la de 1.80×75. ¿Cuál te interesa?', content_type: 'text', status: 'read', created_at: new Date(now - 480000).toISOString() },
    { id: 'msg-4', direction: 'inbound', content: 'La de 1.80×70, ¿cuánto cuesta y hacen envíos?', content_type: 'text', status: 'read', created_at: new Date(now - 360000).toISOString() },
    { id: 'msg-5', direction: 'outbound', content: 'La Mesa Plegable 1.80×70 te la dejo en $2,800 MXN. Sí hacemos envíos a domicilio en zona urbana de Saltillo. 🚚📦', content_type: 'text', status: 'delivered', created_at: new Date(now - 300000).toISOString() },
  ];
}

// ============================================================
// FUNNEL VIEW (Full-width kanban with column management)
// ============================================================
function FunnelView({ stages, conversations, activeConversation, onSelect, draggedConv, setDraggedConv, dragOverStage, setDragOverStage, supabase, setConversations }) {
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [localStages, setLocalStages] = useState(stages);
  const [editingStageId, setEditingStageId] = useState(null);
  const [editingStageName, setEditingStageName] = useState('');

  // Sync when parent stages change
  useEffect(() => { setLocalStages(stages); }, [stages]);

  const sortedStages = [...(localStages || [])].sort((a, b) => a.order - b.order);

  function getConvsForStage(stageId) {
    return conversations.filter(c => c.funnel_stage_id === stageId);
  }

  function getUnassigned() {
    const stageIds = sortedStages.map(s => s.id);
    return conversations.filter(c => !c.funnel_stage_id || !stageIds.includes(c.funnel_stage_id));
  }

  async function handleDrop(e, targetStageId) {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedConv) return;

    if (draggedConv.id && !draggedConv.id.toString().startsWith('demo')) {
      await supabase
        .from('inbox_conversations')
        .update({ funnel_stage_id: targetStageId })
        .eq('id', draggedConv.id);
    }

    setConversations(prev =>
      prev.map(c => c.id === draggedConv.id ? { ...c, funnel_stage_id: targetStageId } : c)
    );
    setDraggedConv(null);
  }

  // --- Column management ---
  function handleAddStage() {
    if (!newStageName.trim()) return;
    const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#f97316', '#6a9a04', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];
    const newStage = {
      id: `stage_${Date.now()}`,
      name: newStageName.trim(),
      color: colors[sortedStages.length % colors.length],
      order: sortedStages.length,
    };
    setLocalStages(prev => [...prev, newStage]);
    setNewStageName('');
    setShowAddStage(false);
  }

  function handleStartEdit(stage) {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  }

  function handleSaveEdit() {
    if (!editingStageName.trim()) return;
    setLocalStages(prev =>
      prev.map(s => s.id === editingStageId ? { ...s, name: editingStageName.trim() } : s)
    );
    setEditingStageId(null);
    setEditingStageName('');
  }

  function handleDeleteStage(stageId) {
    // Move all contacts in this stage to unassigned
    setConversations(prev =>
      prev.map(c => c.funnel_stage_id === stageId ? { ...c, funnel_stage_id: null } : c)
    );
    setLocalStages(prev => prev.filter(s => s.id !== stageId));
  }

  function handleMoveStage(stageId, direction) {
    setLocalStages(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(s => s.id === stageId);
      if (idx < 0) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
      // Swap orders
      const currentOrder = sorted[idx].order;
      const targetOrder = sorted[targetIdx].order;
      return prev.map(s => {
        if (s.id === sorted[idx].id) return { ...s, order: targetOrder };
        if (s.id === sorted[targetIdx].id) return { ...s, order: currentOrder };
        return s;
      });
    });
  }

  // Build columns
  const allColumns = [
    { id: '__unassigned', name: 'Sin asignar', color: '#94a3b8', contacts: getUnassigned(), isFixed: true },
    ...sortedStages.map(s => ({ ...s, contacts: getConvsForStage(s.id), isFixed: false })),
  ];

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex h-full gap-2 p-2" style={{ minWidth: allColumns.length * 200 + (showAddStage ? 200 : 50) }}>
        {allColumns.map(col => (
          <div
            key={col.id}
            className={`flex flex-col rounded-xl transition-all shrink-0 group/col ${
              dragOverStage === col.id ? 'ring-2' : ''
            }`}
            style={{
              width: 200,
              minWidth: 200,
              backgroundColor: dragOverStage === col.id ? `${col.color}15` : 'rgba(241,245,249,0.6)',
              ...(dragOverStage === col.id ? { '--tw-ring-color': col.color } : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(col.id); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, col.id === '__unassigned' ? null : col.id)}
          >
            {/* Column header */}
            <div className="px-2.5 py-2 flex items-center gap-1.5 shrink-0 border-b border-slate-200/30">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />

              {/* Editing mode */}
              {editingStageId === col.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editingStageName}
                    onChange={(e) => setEditingStageName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingStageId(null); }}
                    className="flex-1 px-1.5 py-0.5 text-[10px] font-bold border border-slate-300 rounded outline-none focus:ring-1 focus:ring-[#6a9a04]/40 bg-white uppercase"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-0.5 hover:bg-green-100 rounded cursor-pointer" title="Guardar">
                    <Check className="w-3 h-3 text-green-600" />
                  </button>
                  <button onClick={() => setEditingStageId(null)} className="p-0.5 hover:bg-slate-100 rounded cursor-pointer" title="Cancelar">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate flex-1">{col.name}</span>

                  {/* Move, Edit & Delete — visible on hover (not for 'Sin asignar') */}
                  {!col.isFixed && (
                    <div className="hidden group-hover/col:flex items-center gap-0 shrink-0">
                      <button
                        onClick={() => handleMoveStage(col.id, 'left')}
                        className="p-0.5 hover:bg-white/80 rounded transition-colors cursor-pointer"
                        title="Mover a la izquierda"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleMoveStage(col.id, 'right')}
                        className="p-0.5 hover:bg-white/80 rounded transition-colors cursor-pointer"
                        title="Mover a la derecha"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleStartEdit(col)}
                        className="p-0.5 hover:bg-white/80 rounded transition-colors cursor-pointer"
                        title="Editar nombre"
                      >
                        <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(col.id)}
                        className="p-0.5 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Eliminar etapa"
                      >
                        <Trash2 className="w-3 h-3 text-slate-300 hover:text-red-500" />
                      </button>
                    </div>
                  )}
                </>
              )}

              <span
                className="text-[9px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center shrink-0 px-1"
                style={{ backgroundColor: col.color }}
              >
                {col.contacts.length}
              </span>
            </div>

            {/* Column cards */}
            <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1.5">
              {col.contacts.map(conv => (
                <FunnelCard
                  key={conv.id}
                  conv={conv}
                  isActive={activeConversation?.id === conv.id}
                  onSelect={onSelect}
                  onDragStart={() => setDraggedConv(conv)}
                  isDragging={draggedConv?.id === conv.id}
                />
              ))}

              {col.contacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-1">
                    <span className="text-[10px]">📥</span>
                  </div>
                  <span className="text-[10px] italic">Arrastra aquí</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add stage button */}
        {showAddStage ? (
          <div className="flex flex-col shrink-0 rounded-xl bg-slate-50 border border-dashed border-slate-300" style={{ width: 200, minWidth: 200 }}>
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nueva etapa</p>
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                placeholder="Ej: Cotizado, En proceso..."
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6a9a04]/30 bg-white"
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddStage}
                  className="flex-1 px-3 py-1.5 text-[11px] font-bold bg-[#6a9a04] text-white rounded-lg hover:bg-[#5a8403] transition-colors cursor-pointer"
                >
                  Crear etapa
                </button>
                <button
                  onClick={() => { setShowAddStage(false); setNewStageName(''); }}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddStage(true)}
            className="flex flex-col items-center justify-center shrink-0 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#6a9a04]/40 hover:bg-[#6a9a04]/5 transition-all cursor-pointer group"
            style={{ width: 50, minWidth: 50 }}
            title="Agregar etapa"
          >
            <Plus className="w-5 h-5 text-slate-300 group-hover:text-[#6a9a04] transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact funnel card for kanban columns
function FunnelCard({ conv, isActive, onSelect, onDragStart, isDragging }) {
  const platform = PLATFORM_CONFIG[conv.platform] || PLATFORM_CONFIG.whatsapp;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(conv)}
      className={`p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
        isActive
          ? 'bg-white ring-2 ring-[#6a9a04]/30 shadow-sm'
          : 'bg-white hover:shadow-sm border border-slate-200/50'
      } ${isDragging ? 'opacity-30 scale-95' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-[10px]">
            {conv.contact_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: platform.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold truncate ${isActive ? 'text-[#6a9a04]' : 'text-slate-800'}`}>
            {conv.contact_name || 'Sin nombre'}
          </p>
          {conv.last_message_preview && (
            <p className="text-[9px] text-slate-400 truncate mt-0.5">{conv.last_message_preview}</p>
          )}
        </div>
        {conv.unread_count > 0 && (
          <span className="w-4 h-4 bg-[#6a9a04] text-white rounded-full flex items-center justify-center text-[8px] font-bold shrink-0">
            {conv.unread_count}
          </span>
        )}
      </div>
    </div>
  );
}


// ============================================================
// MAIN INBOX PAGE
// ============================================================
export default function InboxPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [hasChannels, setHasChannels] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);

  // View mode: list or funnel
  const [viewMode, setViewMode] = useState('list');
  const [funnelStages, setFunnelStages] = useState([]);
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [draggedConv, setDraggedConv] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showSalePanel, setShowSalePanel] = useState(false);

  // --- Supabase Channels (Realtime) ---
  const [channelSub, setChannelSub] = useState(null);

  // Fetch user and conversations
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Check if user has connected channels
        const { data: channelData } = await supabase
          .from('inbox_channels')
          .select('id')
          .eq('distributor_id', user.id)
          .eq('is_active', true)
          .limit(1);
        setHasChannels(channelData && channelData.length > 0);

        // Try to fetch real conversations
        const { data: convData } = await supabase
          .from('inbox_conversations')
          .select(`
            *,
            inbox_contacts!inner(display_name, phone, email, notes, created_at),
            inbox_channels!inner(platform)
          `)
          .eq('distributor_id', user.id)
          .order('last_message_at', { ascending: false });

        if (convData && convData.length > 0) {
          const mapped = convData.map(c => ({
            id: c.id,
            contact_name: c.inbox_contacts.display_name,
            contact_phone: c.inbox_contacts.phone,
            contact_email: c.inbox_contacts.email,
            contact_notes: c.inbox_contacts.notes,
            contact_created: c.inbox_contacts.created_at,
            platform: c.inbox_channels.platform,
            last_message_at: c.last_message_at,
            last_message_preview: c.last_message_preview,
            unread_count: c.unread_count,
            funnel_stage_id: c.funnel_stage_id,
            tags: [],
          }));
          setConversations(mapped);

          // Auto-select conversation from URL param (e.g. from Kanban)
          const convParam = searchParams.get('conv');
          if (convParam) {
            const target = mapped.find(c => c.id === convParam);
            if (target) {
              setActiveConversation(target);
              setShowMobileChat(true);
            }
          }
        } else {
          // Only show demo data for admin users, distributors see empty state
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          const isAdmin = profile?.role === 'admin';
          if (isAdmin) {
            setConversations(getDemoConversations());
          }
          // Non-admin users see empty state (no conversations)
        }

        // Fetch templates
        const { data: tmplData } = await supabase
          .from('inbox_templates')
          .select('*')
          .eq('distributor_id', user.id);
        setTemplates(tmplData || []);

        // Load funnel stages
        try {
          const { data: funnelData } = await supabase
            .from('inbox_funnels')
            .select('*')
            .eq('distributor_id', user.id)
            .order('created_at')
            .limit(1);

          if (funnelData && funnelData.length > 0) {
            setFunnelStages(funnelData[0].stages || []);
            setActiveFunnelId(funnelData[0].id);
          } else {
            // Default stages
            setFunnelStages([
              { id: 'new', name: 'Nuevo', color: '#3b82f6', order: 0 },
              { id: 'interested', name: 'Interesado', color: '#f59e0b', order: 1 },
              { id: 'quoted', name: 'Cotizado', color: '#8b5cf6', order: 2 },
              { id: 'negotiating', name: 'Negociando', color: '#f97316', order: 3 },
              { id: 'closed', name: 'Cerrado', color: '#6a9a04', order: 4 },
              { id: 'lost', name: 'Perdido', color: '#ef4444', order: 5 },
            ]);
          }
        } catch (e) { console.error('Funnel load error:', e); }

      } catch (err) {
        console.error('Inbox init error:', err);
        // Fallback — only show demo for admin
        try {
          const { data: { user: fbUser } } = await supabase.auth.getUser();
          if (fbUser) {
            const { data: fbProfile } = await supabase.from('profiles').select('role').eq('id', fbUser.id).single();
            if (fbProfile?.role === 'admin') {
              setConversations(getDemoConversations());
            }
          }
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    }
    init();

    // Realtime: listen for new/updated conversations
    const convChannel = supabase
      .channel('inbox-conversations-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox_conversations',
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch the full conversation with joins
          const { data: newConv } = await supabase
            .from('inbox_conversations')
            .select(`
              *,
              inbox_contacts!inner(display_name, phone, email, notes, created_at),
              inbox_channels!inner(platform)
            `)
            .eq('id', payload.new.id)
            .single();
          if (newConv) {
            const mapped = {
              id: newConv.id,
              contact_name: newConv.inbox_contacts.display_name,
              contact_phone: newConv.inbox_contacts.phone,
              contact_email: newConv.inbox_contacts.email,
              contact_notes: newConv.inbox_contacts.notes,
              contact_created: newConv.inbox_contacts.created_at,
              platform: newConv.inbox_channels.platform,
              last_message_at: newConv.last_message_at,
              last_message_preview: newConv.last_message_preview,
              unread_count: newConv.unread_count,
              funnel_stage_id: newConv.funnel_stage_id,
              tags: [],
            };
            setConversations(prev => [mapped, ...prev.filter(c => c.id !== mapped.id)]);
          }
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev => prev.map(c => {
            if (c.id !== payload.new.id) return c;
            return {
              ...c,
              last_message_at: payload.new.last_message_at,
              last_message_preview: payload.new.last_message_preview,
              unread_count: payload.new.unread_count,
              funnel_stage_id: payload.new.funnel_stage_id,
            };
          }));
        }
      })
      .subscribe();

    // Polling fallback: refetch conversations every 10 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: { user: pollUser } } = await supabase.auth.getUser();
        if (!pollUser) return;
        const { data: freshConvs } = await supabase
          .from('inbox_conversations')
          .select(`
            *,
            inbox_contacts!inner(display_name, phone, email, notes, created_at),
            inbox_channels!inner(platform)
          `)
          .eq('distributor_id', pollUser.id)
          .order('last_message_at', { ascending: false });
        if (freshConvs && freshConvs.length > 0) {
          const mapped = freshConvs.map(c => ({
            id: c.id,
            contact_name: c.inbox_contacts.display_name,
            contact_phone: c.inbox_contacts.phone,
            contact_email: c.inbox_contacts.email,
            contact_notes: c.inbox_contacts.notes,
            contact_created: c.inbox_contacts.created_at,
            platform: c.inbox_channels.platform,
            last_message_at: c.last_message_at,
            last_message_preview: c.last_message_preview,
            unread_count: c.unread_count,
            funnel_stage_id: c.funnel_stage_id,
            tags: [],
          }));
          setConversations(prev => {
            // Only update if data changed
            const prevIds = prev.map(c => `${c.id}-${c.unread_count}-${c.last_message_preview}`).join(',');
            const newIds = mapped.map(c => `${c.id}-${c.unread_count}-${c.last_message_preview}`).join(',');
            return prevIds === newIds ? prev : mapped;
          });
        }
      } catch (e) { /* silently ignore poll errors */ }
    }, 10000);

    return () => {
      supabase.removeChannel(convChannel);
      clearInterval(pollInterval);
    };
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) { setMessages([]); return; }

    // Demo mode
    if (activeConversation.id?.startsWith('demo-')) {
      setMessages(activeConversation.id === 'demo-1' ? getDemoMessages() : []);
      return;
    }

    // Real messages
    async function fetchMessages() {
      const { data } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'inbox_messages',
        filter: `conversation_id=eq.${activeConversation.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation?.id]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = !searchTerm ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.last_message_preview?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPlatform = !platformFilter || c.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [conversations, searchTerm, platformFilter]);

  // Handle send message
  const handleSendMessage = useCallback(async (content) => {
    if (!activeConversation) return;

    // Demo mode — add locally
    if (activeConversation.id?.startsWith('demo-')) {
      const newMsg = {
        id: `msg-${Date.now()}`,
        direction: 'outbound',
        content,
        content_type: 'text',
        status: 'sent',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);

      // Simulate demo reply after 2 seconds
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now() + 1}`,
          direction: 'inbound',
          content: '¡Gracias! Lo voy a considerar. 😊',
          content_type: 'text',
          status: 'read',
          created_at: new Date().toISOString(),
        }]);
      }, 2000);
      return;
    }

    try {
      const res = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation.id,
          content,
          content_type: 'text',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Send error:', err);
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  }, [activeConversation]);

  // Handle conversation select
  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv);
    setShowMobileChat(true);

    // Mark as read: reset unread count
    if (conv.unread_count > 0 && !conv.id?.startsWith('demo-')) {
      // Update local state immediately
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
      // Update database
      await supabase
        .from('inbox_conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toggle header — always visible */}
      <div className="px-4 py-2 bg-white/60 backdrop-blur-md border-b border-slate-200/50 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-slate-500">
          {conversations.length} conversaciones
        </span>
        {!hasChannels && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <WifiOff className="w-2.5 h-2.5" /> Sin canales
          </span>
        )}
        <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded-full">
          {conversations.reduce((s, c) => s + (c.unread_count || 0), 0)} sin leer
        </span>
        <div className="flex bg-slate-100 rounded-xl p-0.5 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode('funnel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'funnel'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Embudo
          </button>
        </div>
      </div>

      {/* === LISTA MODE: classic 3-column layout === */}
      {viewMode === 'list' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left — Conversations */}
          <div className={`w-full md:w-80 lg:w-96 shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col bg-white/60 backdrop-blur-md border-r border-slate-200/50`}>
            <ConversationList
              conversations={filteredConversations}
              activeConversation={activeConversation}
              onSelect={handleSelectConversation}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              platformFilter={platformFilter}
              onPlatformFilter={setPlatformFilter}
            />
          </div>

          {/* Center — Chat */}
          <div className={`flex-1 ${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col`}>
            {showMobileChat && (
              <button
                onClick={() => setShowMobileChat(false)}
                className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border-b border-slate-200/50 bg-white/60 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
            )}
            <ChatView
              conversation={activeConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              templates={templates}
              onCreateOrder={() => setShowSalePanel(true)}
            />
          </div>

          {/* Right — Contact panel OR Sale panel */}
          <div className="hidden xl:flex w-80 shrink-0 flex-col">
            {showSalePanel ? (
              <ConfirmSalePanel
                conversation={activeConversation}
                supabase={supabase}
                onClose={() => setShowSalePanel(false)}
                onSaleCreated={() => {}}
              />
            ) : (
              <ContactPanel
                conversation={activeConversation}
                tags={[]}
              />
            )}
          </div>
        </div>
      )}

      {/* === EMBUDO MODE: full-width kanban + slide-over chat === */}
      {viewMode === 'funnel' && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Full-width kanban */}
          <div className={`flex-1 overflow-hidden transition-all ${activeConversation ? 'mr-0' : ''}`}>
            <FunnelView
              stages={funnelStages}
              conversations={filteredConversations}
              activeConversation={activeConversation}
              onSelect={handleSelectConversation}
              draggedConv={draggedConv}
              setDraggedConv={setDraggedConv}
              dragOverStage={dragOverStage}
              setDragOverStage={setDragOverStage}
              supabase={supabase}
              setConversations={setConversations}
            />
          </div>

          {/* Slide-over chat panel */}
          {activeConversation && (
            <div className="w-[480px] shrink-0 flex flex-col border-l border-slate-200/50 bg-white/80 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/50 bg-white/60">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                    {activeConversation.contact_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-bold text-slate-900 truncate">{activeConversation.contact_name}</span>
                </div>
              </div>
              <ChatView
                conversation={activeConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                templates={templates}
                onCreateOrder={() => setShowSalePanel(true)}
              />
              {showSalePanel && (
                <div className="w-80 shrink-0 border-l border-slate-200/50">
                  <ConfirmSalePanel
                    conversation={activeConversation}
                    supabase={supabase}
                    onClose={() => setShowSalePanel(false)}
                    onSaleCreated={() => {}}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
