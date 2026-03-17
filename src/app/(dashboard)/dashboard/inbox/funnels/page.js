'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, X, Edit3, Trash2, Check, GripVertical,
  User, MessageSquare, Phone, MoreVertical, ChevronDown,
  Palette, Settings, Zap
} from 'lucide-react';

const STAGE_COLORS = [
  '#6a9a04', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const PLATFORM_ICONS = { whatsapp: '💬', messenger: '💙', instagram: '📸' };

export default function KanbanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [funnels, setFunnels] = useState([]);
  const [activeFunnel, setActiveFunnel] = useState(null);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [draggedContact, setDraggedContact] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Modals
  const [showNewFunnel, setShowNewFunnel] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [editingStage, setEditingStage] = useState(null);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch funnels
      const { data: funnelData } = await supabase
        .from('inbox_funnels')
        .select('*')
        .eq('distributor_id', user.id)
        .order('created_at');

      if (funnelData && funnelData.length > 0) {
        setFunnels(funnelData);
        setActiveFunnel(funnelData[0]);
        await loadFunnelData(funnelData[0].id, user.id);
      } else {
        // Create default funnel
        const { data: defaultFunnel } = await supabase
          .from('inbox_funnels')
          .insert({
            distributor_id: user.id,
            name: 'Ventas',
            stages: [
              { id: 'new', name: 'Nuevo', color: '#3b82f6', order: 0 },
              { id: 'interested', name: 'Interesado', color: '#f59e0b', order: 1 },
              { id: 'quoted', name: 'Cotizado', color: '#8b5cf6', order: 2 },
              { id: 'negotiating', name: 'Negociando', color: '#f97316', order: 3 },
              { id: 'closed', name: 'Cerrado', color: '#6a9a04', order: 4 },
              { id: 'lost', name: 'Perdido', color: '#ef4444', order: 5 },
            ],
          })
          .select()
          .single();

        if (defaultFunnel) {
          setFunnels([defaultFunnel]);
          setActiveFunnel(defaultFunnel);
          await loadFunnelData(defaultFunnel.id, user.id);
        }
      }
    } catch (err) {
      console.error('Kanban init error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFunnelData(funnelId, userId) {
    // Load stages from funnel JSON
    const funnel = funnels.find(f => f.id === funnelId) || activeFunnel;
    if (funnel?.stages) {
      setStages(funnel.stages.sort((a, b) => a.order - b.order));
    }

    // Load contacts with their funnel stage
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId || user?.id;

    const { data: contactData } = await supabase
      .from('inbox_contacts')
      .select('*, inbox_conversations(id, last_message_at, last_message_preview, inbox_channels(platform))')
      .eq('distributor_id', uid);

    setContacts(contactData || []);
  }

  async function handleCreateFunnel(e) {
    e.preventDefault();
    if (!newFunnelName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('inbox_funnels')
      .insert({
        distributor_id: user.id,
        name: newFunnelName,
        stages: [
          { id: `stage-${Date.now()}`, name: 'Nuevo', color: '#3b82f6', order: 0 },
          { id: `stage-${Date.now()+1}`, name: 'En Proceso', color: '#f59e0b', order: 1 },
          { id: `stage-${Date.now()+2}`, name: 'Cerrado', color: '#6a9a04', order: 2 },
        ],
      })
      .select()
      .single();

    if (data) {
      setFunnels(prev => [...prev, data]);
      setNewFunnelName('');
      setShowNewFunnel(false);
    }
  }

  async function handleAddStage(e) {
    e.preventDefault();
    if (!newStageName.trim() || !activeFunnel) return;

    const updatedStages = [
      ...activeFunnel.stages,
      { id: `stage-${Date.now()}`, name: newStageName, color: newStageColor, order: activeFunnel.stages.length },
    ];

    const { error } = await supabase
      .from('inbox_funnels')
      .update({ stages: updatedStages })
      .eq('id', activeFunnel.id);

    if (!error) {
      const updated = { ...activeFunnel, stages: updatedStages };
      setActiveFunnel(updated);
      setStages(updatedStages);
      setFunnels(prev => prev.map(f => f.id === updated.id ? updated : f));
      setNewStageName('');
      setNewStageColor(STAGE_COLORS[0]);
      setShowNewStage(false);
    }
  }

  async function handleDeleteStage(stageId) {
    if (!activeFunnel) return;
    if (!confirm('¿Eliminar esta etapa? Los contactos en ella quedarán sin asignar.')) return;

    const updatedStages = activeFunnel.stages
      .filter(s => s.id !== stageId)
      .map((s, i) => ({ ...s, order: i }));

    const { error } = await supabase
      .from('inbox_funnels')
      .update({ stages: updatedStages })
      .eq('id', activeFunnel.id);

    if (!error) {
      const updated = { ...activeFunnel, stages: updatedStages };
      setActiveFunnel(updated);
      setStages(updatedStages);
      setFunnels(prev => prev.map(f => f.id === updated.id ? updated : f));
    }
  }

  // Drag & Drop handlers
  function handleDragStart(contact) {
    setDraggedContact(contact);
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();
    setDragOverStage(stageId);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e, targetStageId) {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedContact) return;

    // Demo mode — update local state only
    if (draggedContact.id?.toString().startsWith('demo-')) {
      setDemoState(prev =>
        prev.map(c => c.id === draggedContact.id ? { ...c, stageId: targetStageId } : c)
      );
      setDraggedContact(null);
      return;
    }

    // Real mode — update in database
    const convId = draggedContact.inbox_conversations?.[0]?.id;
    if (convId) {
      await supabase
        .from('inbox_conversations')
        .update({ funnel_stage_id: targetStageId })
        .eq('id', convId);
    }

    // Update local state
    setContacts(prev =>
      prev.map(c =>
        c.id === draggedContact.id
          ? { ...c, inbox_conversations: c.inbox_conversations?.map(conv => ({ ...conv, funnel_stage_id: targetStageId })) }
          : c
      )
    );
    setDraggedContact(null);
  }

  function getContactsForStage(stageId) {
    return contacts.filter(c => {
      const conv = c.inbox_conversations?.[0];
      return conv?.funnel_stage_id === stageId;
    });
  }

  function getUnassignedContacts() {
    return contacts.filter(c => {
      const conv = c.inbox_conversations?.[0];
      return !conv?.funnel_stage_id || !activeFunnel?.stages?.some(s => s.id === conv.funnel_stage_id);
    });
  }

  // Demo data when no real contacts exist
  const hasRealContacts = contacts.length > 0;
  const [demoState, setDemoState] = useState([]);

  // Initialize demo contacts once
  useEffect(() => {
    if (!hasRealContacts && activeFunnel?.stages) {
      setDemoState(getDemoKanbanContacts(activeFunnel.stages));
    }
  }, [hasRealContacts, activeFunnel?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 bg-white/60 backdrop-blur-md border-b border-slate-200/50 flex items-center gap-4">
        <Link href="/dashboard/inbox" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#6a9a04]" />
          <h1 className="text-lg font-black text-slate-900">Embudos de Venta</h1>
        </div>

        {/* Funnel selector */}
        <div className="flex items-center gap-2 ml-4">
          {funnels.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFunnel(f); setStages(f.stages?.sort((a, b) => a.order - b.order) || []); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFunnel?.id === f.id
                  ? 'bg-[#6a9a04] text-white shadow-lg shadow-[#6a9a04]/20'
                  : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
              }`}
            >
              {f.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewFunnel(true)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Nuevo embudo"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            {(activeFunnel?.stages || []).length} etapas
          </span>
          <span className="text-xs font-bold text-slate-500">·</span>
          <span className="text-xs font-bold text-slate-500">
            {hasRealContacts ? contacts.length : demoState.length} contactos
          </span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-5 h-full min-w-max">
          {/* Stage columns */}
          {(activeFunnel?.stages || stages).sort((a, b) => a.order - b.order).map((stage) => {
            const stageContacts = hasRealContacts
              ? getContactsForStage(stage.id)
              : demoState.filter(d => d.stageId === stage.id);

            return (
              <div
                key={stage.id}
                className={`w-72 shrink-0 flex flex-col bg-white/40 backdrop-blur-md rounded-2xl border transition-all ${
                  dragOverStage === stage.id
                    ? 'border-[#6a9a04] bg-[#6a9a04]/5 shadow-lg'
                    : 'border-slate-200/60'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage header */}
                <div className="p-3 border-b border-slate-200/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-bold text-sm text-slate-800 truncate">{stage.name}</h3>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold min-w-[20px] text-center">
                      {stageContacts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Eliminar etapa"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>

                {/* Contact cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageContacts.map((contact) => {
                    const conv = contact.inbox_conversations?.[0] || contact;
                    const platform = conv.inbox_channels?.platform || contact.platform || 'whatsapp';
                    return (
                      <div
                        key={contact.id}
                        draggable
                        onDragStart={() => handleDragStart(contact)}
                        className={`bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group/card ${draggedContact?.id === contact.id ? 'opacity-40 scale-95' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                            {(contact.display_name || contact.name)?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {contact.display_name || contact.name}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>{PLATFORM_ICONS[platform] || '💬'}</span>
                              {contact.phone || contact.platform_user_id || ''}
                            </p>
                          </div>
                          {/* Go to chat */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const convId = contact.inbox_conversations?.[0]?.id;
                              router.push(convId ? `/dashboard/inbox?conv=${convId}` : '/dashboard/inbox');
                            }}
                            className="p-1.5 hover:bg-[#6a9a04]/10 rounded-lg transition-all opacity-0 group-hover/card:opacity-100 cursor-pointer shrink-0"
                            title="Ir a la conversación"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#6a9a04]" />
                          </button>
                        </div>
                        {(conv.last_message_preview || contact.lastMessage) && (
                          <p className="text-[10px] text-slate-400 mt-2 truncate bg-slate-50 rounded-lg px-2 py-1">
                            {conv.last_message_preview || contact.lastMessage}
                          </p>
                        )}
                        {/* Tags */}
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {contact.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stageContacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <User className="w-8 h-8 mb-2" />
                      <p className="text-[10px] font-bold">Arrastra contactos aquí</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add stage button */}
          <div className="w-72 shrink-0">
            {!showNewStage ? (
              <button
                onClick={() => setShowNewStage(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold text-sm">Nueva Etapa</span>
              </button>
            ) : (
              <form onSubmit={handleAddStage} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <input
                  type="text"
                  autoFocus
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nombre de la etapa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 mb-3"
                />
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {STAGE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${newStageColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={!newStageName.trim()} className="flex-1 px-3 py-2 bg-[#6a9a04] text-white rounded-xl text-xs font-bold hover:bg-[#5a8a03] disabled:opacity-30 cursor-pointer">
                    Agregar
                  </button>
                  <button type="button" onClick={() => setShowNewStage(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Demo banner */}
      {!hasRealContacts && (
        <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-200 text-center">
          <p className="text-xs text-amber-700">
            <strong>Vista demo</strong> — Los contactos aparecerán aquí cuando conectes tus canales y empieces a recibir mensajes.
            <Link href="/dashboard/inbox/settings" className="ml-1 underline font-bold hover:text-amber-900">
              Conectar canales →
            </Link>
          </p>
        </div>
      )}

      {/* New Funnel Modal */}
      {showNewFunnel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewFunnel(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateFunnel}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="font-bold text-slate-900 mb-4">Nuevo Embudo</h3>
            <input
              type="text"
              autoFocus
              value={newFunnelName}
              onChange={(e) => setNewFunnelName(e.target.value)}
              placeholder="Ej: Ventas Minisplits, Cotizaciones..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 mb-4"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={!newFunnelName.trim()} className="flex-1 px-4 py-2.5 bg-[#6a9a04] text-white rounded-xl font-bold text-sm hover:bg-[#5a8a03] disabled:opacity-30 cursor-pointer">
                Crear
              </button>
              <button type="button" onClick={() => setShowNewFunnel(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEMO DATA
// ============================================================
function getDemoKanbanContacts(stages) {
  if (!stages || stages.length === 0) return [];

  const names = [
    { name: 'María González', phone: '+52 844 123 4567', platform: 'whatsapp', msg: 'Me interesa el GL-21', tags: [{ name: 'Saltillo', color: '#3b82f6' }] },
    { name: 'Roberto Díaz', phone: '+52 811 234 5678', platform: 'whatsapp', msg: '¿Hacen envíos a Monterrey?', tags: [{ name: 'Monterrey', color: '#8b5cf6' }] },
    { name: 'Laura Sánchez', phone: '+52 833 345 6789', platform: 'messenger', msg: 'Necesito 3 unidades', tags: [{ name: 'Mayoreo', color: '#f59e0b' }] },
    { name: 'Carlos Mendoza', phone: '+52 844 456 7890', platform: 'instagram', msg: 'Vi su publicación', tags: [] },
    { name: 'Ana Rodríguez', phone: '+52 812 567 8901', platform: 'whatsapp', msg: 'Ya hice la transferencia', tags: [{ name: 'Pagado', color: '#6a9a04' }] },
    { name: 'Pedro Santos', phone: '+52 844 678 9012', platform: 'messenger', msg: 'No me convenció el precio', tags: [{ name: 'Precio', color: '#ef4444' }] },
  ];

  // Distribute contacts across first stages
  return names.map((n, i) => ({
    id: `demo-k-${i}`,
    display_name: n.name,
    phone: n.phone,
    platform: n.platform,
    lastMessage: n.msg,
    tags: n.tags,
    stageId: stages[Math.min(i, stages.length - 1)]?.id,
  }));
}
