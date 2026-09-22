'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Paperclip, Image as ImageIcon,
  MoreVertical, CheckCheck, Check, X, Trash2, ShoppingBag, Zap, Bot, Sparkles
} from 'lucide-react';
import { PLATFORM_CONFIG } from '@/hooks/useInbox';

const STATUS_ICONS = {
  pending: <span className="text-[9px] text-slate-400">⏳</span>,
  sending: <span className="text-[9px] text-slate-400">⏳</span>,
  sent: <Check className="w-3.5 h-3.5 text-white/70" />,
  delivered: <CheckCheck className="w-3.5 h-3.5 text-white/70" />,
  read: <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />,
  failed: <X className="w-3.5 h-3.5 text-red-300" />,
};

export default function ChatView({
  conversation,
  messages,
  onSendMessage,
  onSendMedia,
  templates,
  onCreateOrder,
  onToggleBot,
  onDeleteConversation
}) {
  const [inputValue, setInputValue] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Falló la compresión de imagen'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileSelect = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El límite máximo es 15 MB.');
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = file;
      if (type === 'image' && file.type.startsWith('image/') && file.size > 800 * 1024) {
        try {
          fileToUpload = await compressImage(file);
        } catch (compErr) {
          console.warn('No se pudo comprimir la imagen, intentando enviar original:', compErr);
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('conversation_id', conversation.id);

      const res = await fetch('/api/inbox/upload', {
        method: 'POST',
        body: formData,
      });

      let result;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await res.json();
      } else {
        const textErr = await res.text();
        if (res.status === 413 || textErr.includes('Too Large')) {
          throw new Error('El archivo excede el tamaño máximo permitido por el servidor (4.5 MB). Por favor elige una imagen más ligera.');
        }
        throw new Error(`Error en servidor (${res.status}): ${textErr.slice(0, 100)}`);
      }

      if (!res.ok || !result.success) {
        throw new Error(result?.error || 'Falló la subida');
      }

      if (onSendMedia) {
        await onSendMedia(result.url, type === 'image' ? 'image' : 'document', file.name);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('⚠️ Error al subir archivo:\n' + (err.message || 'Intenta de nuevo'));
    }
    setUploading(false);
  };

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
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/50 backdrop-blur-md text-slate-300">
        <div className="w-20 h-20 bg-gradient-to-tr from-[#6a9a04]/20 to-emerald-500/20 border border-[#6a9a04]/30 rounded-3xl flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-10 h-10 text-[#6a9a04]" />
        </div>
        <h3 className="text-lg font-black text-slate-100 mb-1">Greenland Omnichannel Suite</h3>
        <p className="text-xs text-slate-400 max-w-xs text-center font-medium">
          Selecciona un chat del panel para iniciar la conversación en tiempo real.
        </p>
      </div>
    );
  }

  const platform = PLATFORM_CONFIG[conversation.platform] || PLATFORM_CONFIG.whatsapp;

  const filteredTemplates = showTemplates && templates
    ? templates.filter(t => t.title.toLowerCase().includes(inputValue.slice(1).toLowerCase()))
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-950/40 relative">
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-black text-sm">
              {conversation.contact_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-sm"
              style={{ backgroundColor: platform.color }}
            />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-sm">{conversation.contact_name || 'Sin nombre'}</p>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <span>{platform.icon}</span> {platform.label}
              {conversation.contact_phone && <> · <span className="font-mono text-slate-300">{conversation.contact_phone}</span></>}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Bot Toggle */}
          <button
            onClick={() => onToggleBot && onToggleBot()}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-black border shadow-sm ${
              conversation.chatbot_active
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={conversation.chatbot_active ? 'Bot IA activo — click para pausar' : 'Bot IA inactivo — click para activar'}
          >
            <Bot className="w-4 h-4" />
            {conversation.chatbot_active ? '🟢 Bot Activo' : '⚪ Bot Pausado'}
          </button>

          {/* Create Order Button */}
          <button
            onClick={onCreateOrder}
            className="px-3 py-1.5 rounded-xl bg-[#6a9a04]/20 hover:bg-[#6a9a04]/30 border border-[#6a9a04]/40 text-[#8cc618] text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Confirmar venta POS"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Confirmar Venta</span>
          </button>

          {/* More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 py-1 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('¿Borrar esta conversación y todos sus mensajes? Esta acción no se puede deshacer.')) {
                      onDeleteConversation && onDeleteConversation(conversation.id);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Borrar conversación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages area with high-tech background pattern */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs font-bold text-slate-400 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 shadow-sm">
              No hay mensajes registrados en esta conversación
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-lg border transition-all ${
                    isOutbound
                      ? 'bg-gradient-to-r from-[#6a9a04] to-[#557e03] text-white border-[#6a9a04]/40 rounded-br-none'
                      : 'bg-white text-slate-900 border-slate-200/80 rounded-bl-none shadow-md'
                  }`}
                >
                  {msg.content_type === 'image' && msg.media_url && (
                    <img src={msg.media_url} alt="" className="rounded-xl mb-2 max-w-full border border-black/10" />
                  )}
                  {msg.content_type === 'audio' && msg.media_url ? (
                    <div className="flex items-center gap-2 min-w-[220px]">
                      <audio controls preload="none" className="w-full h-8" style={{ filter: isOutbound ? 'invert(1) brightness(2)' : 'none' }}>
                        <source src={msg.media_url} />
                      </audio>
                    </div>
                  ) : msg.content_type === 'audio' ? (
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs italic ${isOutbound ? 'text-white/80' : 'text-slate-500'}`}>
                      🎤 Audio de voz
                    </div>
                  ) : null}
                  {msg.content_type === 'video' && msg.media_url && (
                    <video controls preload="none" className="rounded-xl mb-2 max-w-full max-h-64">
                      <source src={msg.media_url} />
                    </video>
                  )}
                  {msg.content_type === 'document' && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-xs font-bold no-underline transition-colors ${
                        isOutbound ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      📄 {msg.content || 'Ver documento adjunto'}
                    </a>
                  )}
                  {(msg.content_type === 'text' || (msg.content && !['audio', 'image', 'document', 'video'].includes(msg.content_type))) && (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-normal">{msg.content}</p>
                  )}
                  <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isOutbound ? 'text-white/70' : 'text-slate-400'}`}>
                    <span className="text-[10px] font-mono">
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

      {/* Template Autocomplete Suggestions */}
      {filteredTemplates.length > 0 && (
        <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur-md max-h-40 overflow-y-auto">
          {filteredTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplateSelect(t)}
              className="w-full text-left px-4 py-2.5 hover:bg-[#6a9a04]/20 transition-colors border-b border-slate-800 last:border-0 cursor-pointer"
            >
              <p className="text-xs font-black text-[#8cc618]">/{t.title}</p>
              <p className="text-xs text-slate-300 truncate">{t.content}</p>
            </button>
          ))}
        </div>
      )}

      {/* Uploading Indicator */}
      {uploading && (
        <div className="px-4 py-2 border-t border-slate-800 bg-amber-500/10 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-amber-400">Subiendo archivo multimedia...</span>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" className="hidden" onChange={(e) => handleFileSelect(e, 'document')} />

        <div className="flex items-end gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-30 text-slate-400 hover:text-white"
            title="Adjuntar documento"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-30 text-slate-400 hover:text-white"
            title="Enviar imagen"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje... (usa / para respuestas rápidas)"
              rows={1}
              className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs text-slate-100 outline-none focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 resize-none placeholder:text-slate-500 transition-all"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-3 bg-gradient-to-r from-[#6a9a04] to-[#588403] text-white rounded-2xl transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6a9a04]/20 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
