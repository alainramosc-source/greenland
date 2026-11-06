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
  const [showInsightsModal, setShowInsightsModal] = React.useState(false);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [insightsData, setInsightsData] = React.useState(null);

  const handleAnalyzeQuestions = async () => {
    setShowInsightsModal(true);
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/inbox/insights');
      const data = await res.json();
      setInsightsData(data);
    } catch (err) {
      setInsightsData({ error: err.message });
    } finally {
      setInsightsLoading(false);
    }
  };

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

        {/* View Mode Switcher + Express Link Generator + AI Insights */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyzeQuestions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900/80 transition-all cursor-pointer border border-indigo-500/40"
            title="Analizar automáticamente todas las preguntas reales de clientes y detectar qué más enseñarle al bot"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>🧠 Analizar Dudas (IA)</span>
          </button>

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

      {/* === MODAL: ANÁLISIS AUTOMÁTICO DE DUDAS DE CLIENTES === */}
      {showInsightsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden select-text">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Auditoría IA de Preguntas Reales de Clientes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Analiza todas las conversaciones de WhatsApp, Messenger e Instagram para detectar qué más enseñarle al bot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInsightsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-200 text-xs leading-relaxed">
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-3 border-slate-700 border-l-indigo-400 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-300">
                    Leyendo historial de chats y analizando dudas frecuentes con Gemini IA...
                  </p>
                </div>
              ) : insightsData?.error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  Error: {insightsData.error}
                </div>
              ) : insightsData ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Conversaciones Analizadas</p>
                      <p className="text-lg font-black text-white">{insightsData.total_conversations}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Mensajes de Clientes</p>
                      <p className="text-lg font-black text-emerald-400">{insightsData.total_inbound_messages}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Preguntas con Contenido</p>
                      <p className="text-lg font-black text-indigo-400">{insightsData.substantive_count}</p>
                    </div>
                  </div>

                  {insightsData.ai_report && (
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                      {insightsData.ai_report}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
