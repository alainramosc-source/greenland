'use client';
import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Edit3, Trash2, Check, X, Sparkles } from 'lucide-react';
import { PLATFORM_CONFIG } from '@/hooks/useInbox';

export default function FunnelView({
  stages,
  conversations,
  activeConversation,
  onSelect,
  draggedConv,
  setDraggedConv,
  dragOverStage,
  setDragOverStage,
  supabase,
  setConversations
}) {
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [localStages, setLocalStages] = useState(stages);
  const [editingStageId, setEditingStageId] = useState(null);
  const [editingStageName, setEditingStageName] = useState('');

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
      const currentOrder = sorted[idx].order;
      const targetOrder = sorted[targetIdx].order;
      return prev.map(s => {
        if (s.id === sorted[idx].id) return { ...s, order: targetOrder };
        if (s.id === sorted[targetIdx].id) return { ...s, order: currentOrder };
        return s;
      });
    });
  }

  const allColumns = [
    { id: '__unassigned', name: 'Sin asignar', color: '#94a3b8', contacts: getUnassigned(), isFixed: true },
    ...sortedStages.map(s => ({ ...s, contacts: getConvsForStage(s.id), isFixed: false })),
  ];

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-950/60 custom-scrollbar p-3">
      <div className="flex h-full gap-3" style={{ minWidth: allColumns.length * 240 + (showAddStage ? 240 : 60) }}>
        {allColumns.map(col => (
          <div
            key={col.id}
            className={`flex flex-col rounded-2xl transition-all shrink-0 border border-slate-800/80 bg-slate-900/90 backdrop-blur-md shadow-xl ${
              dragOverStage === col.id ? 'ring-2 ring-[#6a9a04]' : ''
            }`}
            style={{ width: 240, minWidth: 240 }}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(col.id); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, col.id === '__unassigned' ? null : col.id)}
          >
            {/* Column Header */}
            <div className="px-3.5 py-3 flex items-center gap-2 shrink-0 border-b border-slate-800 bg-slate-950/40 rounded-t-2xl">
              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: col.color }} />

              {editingStageId === col.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editingStageName}
                    onChange={(e) => setEditingStageName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingStageId(null); }}
                    className="flex-1 px-2 py-1 text-xs font-bold border border-slate-700 rounded-lg outline-none focus:border-[#6a9a04] bg-slate-800 text-white uppercase"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 hover:bg-slate-800 rounded cursor-pointer text-emerald-400" title="Guardar">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingStageId(null)} className="p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-400" title="Cancelar">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 truncate flex-1">{col.name}</span>

                  {!col.isFixed && (
                    <div className="hidden group-hover/col:flex items-center gap-0.5 shrink-0">
                      <button onClick={() => handleMoveStage(col.id, 'left')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Mover izquierda">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMoveStage(col.id, 'right')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Mover derecha">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleStartEdit(col)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Editar etapa">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteStage(col.id)} className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400" title="Eliminar etapa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}

              <span
                className="text-[10px] font-black text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center shrink-0 px-1.5 shadow-md"
                style={{ backgroundColor: col.color }}
              >
                {col.contacts.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 custom-scrollbar">
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
                <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                  <div className="w-9 h-9 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center mb-1.5">
                    <span className="text-xs">📥</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arrastra aquí</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Stage Form */}
        {showAddStage ? (
          <div className="flex flex-col shrink-0 rounded-2xl bg-slate-900 border border-dashed border-slate-700 p-4" style={{ width: 240, minWidth: 240 }}>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3">Nueva Etapa de Ventas</p>
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
              placeholder="Ej: Cotización enviada..."
              className="w-full px-3 py-2 text-xs border border-slate-700 bg-slate-800 text-white rounded-xl outline-none focus:border-[#6a9a04] mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddStage}
                className="flex-1 py-2 text-xs font-bold bg-[#6a9a04] text-white rounded-xl hover:bg-[#5a8403] transition-colors cursor-pointer shadow-md"
              >
                Crear Etapa
              </button>
              <button
                onClick={() => { setShowAddStage(false); setNewStageName(''); }}
                className="px-3 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddStage(true)}
            className="flex flex-col items-center justify-center shrink-0 rounded-2xl border-2 border-dashed border-slate-800 hover:border-[#6a9a04]/50 hover:bg-[#6a9a04]/10 transition-all cursor-pointer group"
            style={{ width: 54, minWidth: 54 }}
            title="Agregar nueva etapa al embudo"
          >
            <Plus className="w-6 h-6 text-slate-600 group-hover:text-[#6a9a04] transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}

function FunnelCard({ conv, isActive, onSelect, onDragStart, isDragging }) {
  const platform = PLATFORM_CONFIG[conv.platform] || PLATFORM_CONFIG.whatsapp;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(conv)}
      className={`p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all border ${
        isActive
          ? 'bg-slate-800 border-[#6a9a04] ring-2 ring-[#6a9a04]/30 shadow-lg'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 shadow-sm'
      } ${isDragging ? 'opacity-30 scale-95' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-black text-xs">
            {conv.contact_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-slate-900"
            style={{ backgroundColor: platform.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isActive ? 'text-[#8cc618]' : 'text-slate-100'}`}>
            {conv.contact_name || 'Sin nombre'}
          </p>
          {conv.last_message_preview && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{conv.last_message_preview}</p>
          )}
        </div>
        {conv.unread_count > 0 && (
          <span className="px-1.5 py-0.5 bg-[#6a9a04] text-white rounded-full text-[9px] font-black shrink-0 shadow-sm">
            {conv.unread_count}
          </span>
        )}
      </div>
    </div>
  );
}
