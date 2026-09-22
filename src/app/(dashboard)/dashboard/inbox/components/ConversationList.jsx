'use client';
import React from 'react';
import { MessageSquare, Search, MessageCircle, Sparkles, Filter } from 'lucide-react';
import { PLATFORM_CONFIG, formatTimeAgo } from '@/hooks/useInbox';

export default function ConversationList({
  conversations,
  activeConversation,
  onSelect,
  searchTerm,
  onSearchChange,
  platformFilter,
  onPlatformFilter
}) {
  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 text-slate-100 shadow-2xl select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6a9a04] to-emerald-400 flex items-center justify-center shadow-lg shadow-[#6a9a04]/20">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                Inbox Omnicanal
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </h2>
              <p className="text-[10px] font-bold text-slate-400">Greenland CRM Suite</p>
            </div>
          </div>

          {/* Platform Filters */}
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => onPlatformFilter(null)}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 font-bold ${
                !platformFilter
                  ? 'bg-[#6a9a04] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="Ver todos los canales"
            >
              <span>🌐</span>
              <span className="text-[10px]">Todos</span>
            </button>
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
              const isActive = platformFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => onPlatformFilter(isActive ? null : key)}
                  className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 font-bold ${
                    isActive
                      ? 'bg-slate-700 text-white shadow-md ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                  title={`Filtrar por ${cfg.label}`}
                >
                  <span className="text-xs">{cfg.icon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contacto, folio o mensaje..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 outline-none focus:border-[#6a9a04] focus:ring-2 focus:ring-[#6a9a04]/20 placeholder:text-slate-500 font-medium transition-all"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-3 border border-slate-700/50">
              <MessageCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-300">Sin mensajes registrados</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Los mensajes entrantes de Meta (WhatsApp, Messenger, Instagram) aparecerán automáticamente aquí.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const platform = PLATFORM_CONFIG[conv.platform] || PLATFORM_CONFIG.whatsapp;
            const isActive = activeConversation?.id === conv.id;
            const initial = conv.contact_name?.[0]?.toUpperCase() || '?';

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-start gap-3 p-3.5 transition-all cursor-pointer text-left relative group ${
                  isActive
                    ? 'bg-slate-800/90 text-white border-l-4 border-l-[#6a9a04]'
                    : 'hover:bg-slate-800/40 text-slate-300 border-l-4 border-l-transparent'
                }`}
              >
                {/* Avatar with Platform Indicator */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/60 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:border-[#6a9a04]/60 transition-colors">
                    {initial}
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] border-2 border-slate-900 shadow-sm"
                    style={{ backgroundColor: platform.color }}
                  >
                    {conv.platform === 'whatsapp' ? '📱' : conv.platform === 'messenger' ? '💬' : '📸'}
                  </span>
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                      {conv.contact_name || 'Sin nombre'}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      {conv.last_message_at ? formatTimeAgo(conv.last_message_at) : ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                    {conv.last_message_preview || 'Sin mensajes'}
                  </p>

                  {/* Tags */}
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {conv.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border border-white/10"
                          style={{ backgroundColor: `${tag.color}25`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unread Badge */}
                {conv.unread_count > 0 && (
                  <span className="shrink-0 px-1.5 py-0.5 bg-[#6a9a04] text-white rounded-full text-[10px] font-black shadow-md shadow-[#6a9a04]/30 animate-pulse">
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
