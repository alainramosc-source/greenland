'use client';
import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Clock, Plus, X, Check, Edit3, User, ShieldCheck, Tag, FileText } from 'lucide-react';
import { PLATFORM_CONFIG, formatDate } from '@/hooks/useInbox';

export default function ContactPanel({ conversation, onUpdateNotes, onUpdateTags, onCreateOrder }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const TAG_COLORS = ['#6a9a04', '#e67e22', '#3498db', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#2c3e50'];

  useEffect(() => {
    setNotesValue(conversation?.notes || '');
    setIsEditingNotes(false);
  }, [conversation?.id, conversation?.notes]);

  if (!conversation) return null;

  const platform = PLATFORM_CONFIG[conversation.platform] || PLATFORM_CONFIG.whatsapp;
  const tags = conversation.tags || [];

  const handleAddTag = () => {
    const name = tagInput.trim();
    if (!name) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    const newTags = [...tags, { name, color }];
    onUpdateTags && onUpdateTags(newTags);
    setTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (idx) => {
    const newTags = tags.filter((_, i) => i !== idx);
    onUpdateTags && onUpdateTags(newTags);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 text-slate-100 overflow-y-auto custom-scrollbar select-none">
      {/* Contact Profile Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/40 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-black text-xl mb-3 shadow-xl shadow-black/20">
          {conversation.contact_name?.[0]?.toUpperCase() || '?'}
        </div>
        <h3 className="font-extrabold text-white text-base tracking-wide">{conversation.contact_name || 'Sin nombre'}</h3>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-300">
          <span>{platform.icon}</span>
          <span>{platform.label}</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-5 border-b border-slate-800/80 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <User className="w-3 h-3 text-[#6a9a04]" /> Información de Contacto
        </p>
        <div className="space-y-2.5 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
          {conversation.contact_phone && (
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono">{conversation.contact_phone}</span>
            </div>
          )}
          {conversation.contact_email && (
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{conversation.contact_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Registrado {conversation.contact_created ? formatDate(conversation.contact_created) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-amber-400" /> Etiquetas CRM
          </p>
          <button
            onClick={() => setShowTagInput(!showTagInput)}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Agregar etiqueta"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showTagInput && (
          <div className="flex gap-1.5 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Nueva etiqueta..."
              className="flex-1 px-2.5 py-1 text-xs border border-slate-700 bg-slate-800 text-slate-100 rounded-xl outline-none focus:border-[#6a9a04]"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              className="px-2.5 py-1 text-[10px] font-bold bg-[#6a9a04] text-white rounded-xl hover:bg-[#5a8a00] transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {tags.length > 0 ? (
            tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer hover:opacity-80 transition-opacity border border-white/10"
                style={{ backgroundColor: `${tag.color}25`, color: tag.color }}
              >
                {tag.name}
                <X className="w-3 h-3" onClick={() => handleRemoveTag(i)} />
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">Sin etiquetas asignadas</p>
          )}
        </div>
      </div>

      {/* Internal Notes Section */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-blue-400" /> Notas Internas
          </p>
          <button
            onClick={() => {
              if (isEditingNotes) {
                onUpdateNotes && onUpdateNotes(notesValue);
              }
              setIsEditingNotes(!isEditingNotes);
            }}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            {isEditingNotes ? <Check className="w-3.5 h-3.5 text-[#6a9a04]" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isEditingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            className="w-full p-3 text-xs bg-slate-800/90 border border-slate-700 text-slate-100 rounded-2xl outline-none focus:border-[#6a9a04] resize-none"
            rows={4}
            placeholder="Notas internas sobre preferencias o seguimiento de este cliente..."
          />
        ) : (
          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 min-h-[60px]">
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {conversation.notes || 'Sin notas registradas.'}
            </p>
          </div>
        )}
      </div>

      {/* Orders Quick Action */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ventas y Pedidos</p>
          <button
            onClick={() => onCreateOrder && onCreateOrder()}
            className="px-2.5 py-1 text-[10px] font-bold bg-[#6a9a04]/20 border border-[#6a9a04]/40 text-[#8cc618] rounded-xl hover:bg-[#6a9a04]/30 transition-colors cursor-pointer"
          >
            + Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
}
