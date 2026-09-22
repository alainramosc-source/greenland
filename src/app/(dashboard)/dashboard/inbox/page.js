'use client';
import React from 'react';
import { WifiOff, List, GitBranch, ArrowLeft, X, Sparkles, MessageSquare, Radio, ShoppingBag } from 'lucide-react';
import { useInbox } from '@/hooks/useInbox';
import ConversationList from './components/ConversationList';
import ChatView from './components/ChatView';
import ContactPanel from './components/ContactPanel';
import ConfirmSalePanel from './components/ConfirmSalePanel';
import FunnelView from './components/FunnelView';

export default function InboxPage() {
  const inbox = useInbox();

  if (inbox.loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-slate-700 border-l-[#6a9a04] rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Cargando Inbox Omnicanal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* High-Tech Corporate Top Navigation Bar */}
      <div className="px-5 py-2.5 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
              Omnichannel CRM
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          <span className="text-xs font-bold text-slate-400 hidden sm:inline">
            {inbox.conversations.length} chats activos
          </span>

          {!inbox.hasChannels && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <WifiOff className="w-3 h-3" /> Sin canales vinculados
            </span>
          )}

          {(() => {
            const unreadTotal = inbox.conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
            return (
              <button
                onClick={() => inbox.setShowUnreadOnly(!inbox.showUnreadOnly)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1 border ${
                  inbox.showUnreadOnly
                    ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-md shadow-[#6a9a04]/40 animate-pulse'
                    : unreadTotal > 0
                    ? 'bg-[#6a9a04]/20 text-[#8cc618] border-[#6a9a04]/40 hover:bg-[#6a9a04]/30 font-extrabold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Haz clic para ver sólo las conversaciones con mensajes no leídos"
              >
                {inbox.showUnreadOnly
                  ? '⚡ Viendo No Leídos (Click para quitar filtro)'
                  : `${unreadTotal} ${unreadTotal === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`}
              </button>
            );
          })()}
        </div>

        {/* View Mode Switcher + Express Link Generator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => inbox.setShowSalePanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6a9a04] to-[#557e03] hover:brightness-110 transition-all cursor-pointer shadow-md shadow-[#6a9a04]/20 border border-[#6a9a04]/40"
            title="Generar link de entrega para Facebook Marketplace, WhatsApp o ventas externas"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>🔗 Link Express (FB Marketplace)</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => inbox.setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inbox.viewMode === 'list'
                  ? 'bg-gradient-to-r from-[#6a9a04] to-[#557e03] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Vista Lista</span>
            </button>
            <button
              onClick={() => inbox.setViewMode('funnel')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                inbox.viewMode === 'funnel'
                  ? 'bg-gradient-to-r from-[#6a9a04] to-[#557e03] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Embudo Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* === LISTA MODE: 3-column Layout === */}
      {inbox.viewMode === 'list' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column — Conversation List */}
          <div className={`w-full md:w-80 lg:w-96 shrink-0 ${inbox.showMobileChat ? 'hidden md:flex' : 'flex'} flex-col`}>
            <ConversationList
              conversations={inbox.filteredConversations}
              activeConversation={inbox.activeConversation}
              onSelect={inbox.handleSelectConversation}
              searchTerm={inbox.searchTerm}
              onSearchChange={inbox.setSearchTerm}
              platformFilter={inbox.platformFilter}
              onPlatformFilter={inbox.setPlatformFilter}
            />
          </div>

          {/* Center Column — Main Chat View */}
          <div className={`flex-1 ${inbox.showMobileChat ? 'flex' : 'hidden md:flex'} flex-col bg-slate-900/40`}>
            {inbox.showMobileChat && (
              <button
                onClick={() => inbox.setShowMobileChat(false)}
                className="md:hidden flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 border-b border-slate-800 bg-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a chats
              </button>
            )}
            <ChatView
              conversation={inbox.activeConversation}
              messages={inbox.messages}
              onSendMessage={inbox.handleSendMessage}
              onSendMedia={inbox.handleSendMedia}
              templates={inbox.templates}
              onCreateOrder={() => inbox.setShowSalePanel(true)}
              onToggleBot={inbox.handleToggleBot}
              onDeleteConversation={inbox.handleDeleteConversation}
            />
          </div>

          {/* Right Column — Contact Information / Confirm Sale Panel */}
          <div className="hidden xl:flex w-80 shrink-0 flex-col">
            {inbox.showSalePanel ? (
              <ConfirmSalePanel
                conversation={inbox.activeConversation}
                supabase={inbox.supabase}
                onClose={() => inbox.setShowSalePanel(false)}
                onSaleCreated={() => {}}
              />
            ) : (
              <ContactPanel
                conversation={inbox.activeConversation}
                onUpdateNotes={inbox.handleUpdateNotes}
                onUpdateTags={inbox.handleUpdateTags}
                onCreateOrder={() => inbox.setShowSalePanel(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* === EMBUDO MODE: Full-width Kanban + Slide-over Chat === */}
      {inbox.viewMode === 'funnel' && (
        <div className="flex-1 flex overflow-hidden relative">
          <div className={`flex-1 overflow-hidden transition-all ${inbox.activeConversation ? 'mr-0' : ''}`}>
            <FunnelView
              stages={inbox.funnelStages}
              conversations={inbox.filteredConversations}
              activeConversation={inbox.activeConversation}
              onSelect={inbox.handleSelectConversation}
              draggedConv={inbox.draggedConv}
              setDraggedConv={inbox.setDraggedConv}
              dragOverStage={inbox.dragOverStage}
              setDragOverStage={inbox.setDragOverStage}
              supabase={inbox.supabase}
              setConversations={inbox.setConversations}
            />
          </div>

          {/* Slide-Over Active Chat Panel */}
          {inbox.activeConversation && (
            <div className="w-[500px] shrink-0 flex flex-col border-l border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-30">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/60">
                <button
                  onClick={() => inbox.setActiveConversation(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-xs">
                    {inbox.activeConversation.contact_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs font-extrabold text-white truncate">{inbox.activeConversation.contact_name}</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <ChatView
                  conversation={inbox.activeConversation}
                  messages={inbox.messages}
                  onSendMessage={inbox.handleSendMessage}
                  onSendMedia={inbox.handleSendMedia}
                  templates={inbox.templates}
                  onCreateOrder={() => inbox.setShowSalePanel(true)}
                  onToggleBot={inbox.handleToggleBot}
                  onDeleteConversation={inbox.handleDeleteConversation}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
