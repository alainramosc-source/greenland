import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export const PLATFORM_CONFIG = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: '💬', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  messenger: { label: 'Messenger', color: '#0084FF', icon: '💙', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  instagram: { label: 'Instagram', color: '#E4405F', icon: '📸', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
};

export function getDemoConversations() {
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

export function getDemoMessages() {
  const now = Date.now();
  return [
    { id: 'msg-1', direction: 'inbound', content: 'Hola buenas tardes 👋', content_type: 'text', status: 'read', created_at: new Date(now - 600000).toISOString() },
    { id: 'msg-2', direction: 'inbound', content: 'Me interesa la Mesa Plegable 1.80 ¿la tienen disponible?', content_type: 'text', status: 'read', created_at: new Date(now - 540000).toISOString() },
    { id: 'msg-3', direction: 'outbound', content: '¡Hola María! Claro que sí, tenemos la Mesa Plegable 1.80×70 y la de 1.80×75. ¿Cuál te interesa?', content_type: 'text', status: 'read', created_at: new Date(now - 480000).toISOString() },
    { id: 'msg-4', direction: 'inbound', content: 'La de 1.80×70, ¿cuánto cuesta y hacen envíos?', content_type: 'text', status: 'read', created_at: new Date(now - 360000).toISOString() },
    { id: 'msg-5', direction: 'outbound', content: 'La Mesa Plegable 1.80×70 te la dejo en $2,800 MXN. Sí hacemos envíos a domicilio en zona urbana de Saltillo. 🚚📦', content_type: 'text', status: 'delivered', created_at: new Date(now - 300000).toISOString() },
  ];
}

export function formatTimeAgo(dateStr) {
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

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function useInbox() {
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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // View mode: list or funnel
  const [viewMode, setViewMode] = useState('list');
  const [funnelStages, setFunnelStages] = useState([]);
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [draggedConv, setDraggedConv] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showSalePanel, setShowSalePanel] = useState(false);

  // Fetch user and conversations
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdmin = profile?.role === 'admin';

        let channelQuery = supabase
          .from('inbox_channels')
          .select('id')
          .eq('is_active', true)
          .limit(1);
        if (!isAdmin) channelQuery = channelQuery.eq('distributor_id', user.id);
        const { data: channelData } = await channelQuery;
        setHasChannels(channelData && channelData.length > 0);

        let convQuery = supabase
          .from('inbox_conversations')
          .select(`
            *,
            inbox_contacts!inner(display_name, phone, email, notes, created_at),
            inbox_channels!inner(platform)
          `)
          .order('last_message_at', { ascending: false });
        if (!isAdmin) convQuery = convQuery.eq('distributor_id', user.id);
        const { data: convData } = await convQuery;

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
            chatbot_active: c.chatbot_active !== false,
            tags: c.tags || [],
            notes: c.notes || '',
          }));
          setConversations(mapped);

          const convParam = searchParams.get('conv');
          if (convParam) {
            const target = mapped.find(c => c.id === convParam);
            if (target) {
              setActiveConversation(target);
              setShowMobileChat(true);
            }
          }
        } else {
          if (isAdmin) {
            setConversations(getDemoConversations());
          }
        }

        const { data: tmplData } = await supabase
          .from('inbox_templates')
          .select('*')
          .eq('distributor_id', user.id);
        setTemplates(tmplData || []);

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

    // Realtime conversation updates
    const convChannel = supabase
      .channel('inbox-conversations-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox_conversations',
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
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

    // Polling fallback
    const pollInterval = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const { data: { user: pollUser } } = await supabase.auth.getUser();
        if (!pollUser) return;
        const { data: pollProfile } = await supabase.from('profiles').select('role').eq('id', pollUser.id).single();
        const isPollAdmin = pollProfile?.role === 'admin';
        let pollQuery = supabase
          .from('inbox_conversations')
          .select(`
            *,
            inbox_contacts!inner(display_name, phone, email, notes, created_at),
            inbox_channels!inner(platform)
          `)
          .order('last_message_at', { ascending: false });
        if (!isPollAdmin) pollQuery = pollQuery.eq('distributor_id', pollUser.id);
        const { data: freshConvs } = await pollQuery;
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
            const prevIds = prev.map(c => `${c.id}-${c.unread_count}-${c.last_message_preview}`).join(',');
            const newIds = mapped.map(c => `${c.id}-${c.unread_count}-${c.last_message_preview}`).join(',');
            return prevIds === newIds ? prev : mapped;
          });
        }
      } catch (e) {}
    }, 15000);

    return () => {
      supabase.removeChannel(convChannel);
      clearInterval(pollInterval);
    };
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) { setMessages([]); return; }

    if (activeConversation.id?.startsWith('demo-')) {
      setMessages(activeConversation.id === 'demo-1' ? getDemoMessages() : []);
      return;
    }

    async function fetchMessages() {
      const { data } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
    fetchMessages();

    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'inbox_messages',
        filter: `conversation_id=eq.${activeConversation.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          const optIdx = prev.findIndex(m => m.id?.startsWith('opt-') && m.content === payload.new.content && m.direction === payload.new.direction);
          if (optIdx >= 0) {
            const updated = [...prev];
            updated[optIdx] = payload.new;
            return updated;
          }
          return [...prev, payload.new];
        });
      })
      .subscribe();

    const msgPoll = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const { data } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('conversation_id', activeConversation.id)
          .order('created_at', { ascending: true });
        if (data) {
          setMessages(prev => {
            const optimistic = prev.filter(m => m.id?.startsWith('opt-'));
            const unreplacedOpt = optimistic.filter(o => !data.some(d => d.content === o.content && d.direction === o.direction));
            if (data.length + unreplacedOpt.length !== prev.length || data.some((m, i) => prev[i]?.id !== m.id)) {
              return [...data, ...unreplacedOpt];
            }
            return prev;
          });
        }
      } catch (e) {}
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(msgPoll);
    };
  }, [activeConversation?.id]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = !searchTerm ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.last_message_preview?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPlatform = !platformFilter || c.platform === platformFilter;
      const matchUnread = !showUnreadOnly || (c.unread_count || 0) > 0;
      return matchSearch && matchPlatform && matchUnread;
    });
  }, [conversations, searchTerm, platformFilter, showUnreadOnly]);

  // Toggle chatbot
  const handleToggleBot = useCallback(async () => {
    if (!activeConversation || activeConversation.id?.startsWith('demo-')) return;
    const newState = !activeConversation.chatbot_active;
    
    setActiveConversation(prev => ({ ...prev, chatbot_active: newState }));
    setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, chatbot_active: newState } : c));
    
    await supabase
      .from('inbox_conversations')
      .update({ chatbot_active: newState })
      .eq('id', activeConversation.id);
  }, [activeConversation, supabase]);

  // Send text message
  const handleSendMessage = useCallback(async (content) => {
    if (!activeConversation) return;

    if (activeConversation.chatbot_active && !activeConversation.id?.startsWith('demo-')) {
      setActiveConversation(prev => ({ ...prev, chatbot_active: false }));
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, chatbot_active: false } : c));
      await supabase
        .from('inbox_conversations')
        .update({ chatbot_active: false })
        .eq('id', activeConversation.id);
    }

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

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      direction: 'outbound',
      content,
      content_type: 'text',
      status: 'sending',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

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
        setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'failed' } : m));
        alert(`⚠️ Error al enviar mensaje:\n${err.detail || err.error || 'Error desconocido'}\n\nPlataforma: ${err.platform || 'N/A'}`);
      } else {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...data.message } : m));
        } else {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'sent' } : m));
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'failed' } : m));
      alert('⚠️ Error de red al enviar mensaje. Verifica tu conexión.');
    }
  }, [activeConversation, supabase]);

  // Send media message
  const handleSendMedia = useCallback(async (mediaUrl, contentType, fileName) => {
    if (!activeConversation) return;

    if (activeConversation.chatbot_active && !activeConversation.id?.startsWith('demo-')) {
      setActiveConversation(prev => ({ ...prev, chatbot_active: false }));
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, chatbot_active: false } : c));
      await supabase
        .from('inbox_conversations')
        .update({ chatbot_active: false })
        .eq('id', activeConversation.id);
    }

    const optimisticId = `opt-${Date.now()}`;
    const isImage = contentType === 'image';
    const optimisticMsg = {
      id: optimisticId,
      direction: 'outbound',
      content: isImage ? mediaUrl : fileName || 'Archivo',
      content_type: contentType,
      media_url: mediaUrl,
      status: 'sending',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation.id,
          content: mediaUrl,
          content_type: contentType,
          media_url: mediaUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Send media error:', err);
        setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'failed' } : m));
        alert(`⚠️ Error al enviar archivo:\n${err.detail || err.error || 'Error desconocido'}`);
      } else {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...data.message } : m));
        } else {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'sent' } : m));
        }
      }
    } catch (err) {
      console.error('Send media error:', err);
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'failed' } : m));
      alert('⚠️ Error de red al enviar archivo.');
    }
  }, [activeConversation, supabase]);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (convId) => {
    try {
      await supabase.from('inbox_messages').delete().eq('conversation_id', convId);
      await supabase.from('inbox_conversations').delete().eq('id', convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      setActiveConversation(null);
      setMessages([]);
      setShowMobileChat(false);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error al borrar conversación');
    }
  }, [supabase]);

  // Select conversation
  const handleSelectConversation = useCallback(async (conv) => {
    setActiveConversation(conv);
    setShowMobileChat(true);

    if (conv.unread_count > 0 && !conv.id?.startsWith('demo-')) {
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
      await supabase
        .from('inbox_conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id);
    }
  }, [supabase]);

  // Update contact notes
  const handleUpdateNotes = useCallback(async (notes) => {
    if (!activeConversation) return;
    await supabase.from('inbox_conversations').update({ notes }).eq('id', activeConversation.id);
    setActiveConversation(prev => ({ ...prev, notes }));
    setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, notes } : c));
  }, [activeConversation, supabase]);

  // Update contact tags
  const handleUpdateTags = useCallback(async (tags) => {
    if (!activeConversation) return;
    await supabase.from('inbox_conversations').update({ tags }).eq('id', activeConversation.id);
    setActiveConversation(prev => ({ ...prev, tags }));
    setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, tags } : c));
  }, [activeConversation, supabase]);

  return {
    supabase,
    loading,
    hasChannels,
    conversations,
    setConversations,
    filteredConversations,
    activeConversation,
    setActiveConversation,
    messages,
    templates,
    searchTerm,
    setSearchTerm,
    platformFilter,
    setPlatformFilter,
    showUnreadOnly,
    setShowUnreadOnly,
    showMobileChat,
    setShowMobileChat,
    viewMode,
    setViewMode,
    funnelStages,
    setFunnelStages,
    activeFunnelId,
    draggedConv,
    setDraggedConv,
    dragOverStage,
    setDragOverStage,
    showSalePanel,
    setShowSalePanel,
    handleSelectConversation,
    handleSendMessage,
    handleSendMedia,
    handleToggleBot,
    handleDeleteConversation,
    handleUpdateNotes,
    handleUpdateTags,
  };
}
