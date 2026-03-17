'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Users, Filter, Tag, Check, X, ChevronDown,
  MessageSquare, Zap, Clock, CheckCheck, AlertTriangle, RefreshCw,
  Radio
} from 'lucide-react';

const PLATFORM_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25D366' },
  messenger: { label: 'Messenger', icon: '💙', color: '#0084FF' },
  instagram: { label: 'Instagram', icon: '📸', color: '#E4405F' },
};

export default function BroadcastPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [channels, setChannels] = useState([]);
  const [history, setHistory] = useState([]);

  // Broadcast form
  const [message, setMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [platformFilter, setPlatformFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch contacts
      const { data: contactData } = await supabase
        .from('inbox_contacts')
        .select('*, inbox_conversations(id, inbox_channels(platform))')
        .eq('distributor_id', user.id);
      setContacts(contactData || []);

      // Fetch tags
      const { data: tagData } = await supabase
        .from('inbox_tags')
        .select('*')
        .eq('distributor_id', user.id);
      setTags(tagData || []);

      // Fetch templates
      const { data: tmplData } = await supabase
        .from('inbox_templates')
        .select('*')
        .eq('distributor_id', user.id);
      setTemplates(tmplData || []);

      // Fetch channels
      const res = await fetch('/api/inbox/channels');
      const channelRes = await res.json();
      setChannels(channelRes.channels || []);

    } catch (err) {
      console.error('Broadcast init error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter contacts
  const filteredContacts = contacts.filter(c => {
    if (platformFilter) {
      const platform = c.inbox_conversations?.[0]?.inbox_channels?.platform;
      if (platform !== platformFilter) return false;
    }
    return true;
  });

  // Toggle contact selection
  function toggleContact(contactId) {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }

  // Select/deselect all
  function handleSelectAll() {
    if (selectAll) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
    setSelectAll(!selectAll);
  }

  // Send broadcast
  async function handleSend() {
    if (!message.trim() || selectedContacts.length === 0) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/inbox/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          contact_ids: selectedContacts,
          platform_filter: platformFilter ? [platformFilter] : undefined,
          tag_filter: tagFilter.length > 0 ? tagFilter : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({
          success: true,
          sent: data.results?.filter(r => r.status === 'sent').length || 0,
          failed: data.results?.filter(r => r.status === 'failed').length || 0,
          total: selectedContacts.length,
        });
        // Reset form
        setMessage('');
        setSelectedContacts([]);
        setSelectAll(false);
      } else {
        setSendResult({ success: false, error: data.error || 'Error al enviar' });
      }
    } catch (err) {
      setSendResult({ success: false, error: 'Error de conexión' });
    } finally {
      setSending(false);
    }
  }

  // Insert template
  function insertTemplate(tmpl) {
    setMessage(tmpl.content);
  }

  const hasContacts = contacts.length > 0;

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
          <Radio className="w-5 h-5 text-[#6a9a04]" />
          <h1 className="text-lg font-black text-slate-900">Broadcast</h1>
        </div>
        <p className="text-xs text-slate-500 hidden md:block">Envía mensajes masivos a tus contactos</p>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left — Contact selection */}
        <div className="w-full md:w-96 shrink-0 flex flex-col border-r border-slate-200/50 bg-white/40">
          {/* Selection header */}
          <div className="p-4 border-b border-slate-200/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Destinatarios</span>
              </div>
              <span className="text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded-full">
                {selectedContacts.length} seleccionados
              </span>
            </div>

            {/* Platform filter */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setPlatformFilter(null)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  !platformFilter ? 'bg-[#6a9a04]/10 border-[#6a9a04]/30 text-[#6a9a04]' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                Todos
              </button>
              {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPlatformFilter(platformFilter === key ? null : key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                    platformFilter === key
                      ? 'border-current text-current'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                  style={platformFilter === key ? { color: cfg.color, borderColor: cfg.color, backgroundColor: `${cfg.color}10` } : {}}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>

            {/* Select all */}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#6a9a04] transition-colors cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                selectAll ? 'bg-[#6a9a04] border-[#6a9a04]' : 'border-slate-300'
              }`}>
                {selectAll && <Check className="w-3 h-3 text-white" />}
              </div>
              Seleccionar todos ({filteredContacts.length})
            </button>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {!hasContacts ? (
              // Demo contacts
              <div className="p-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Sin contactos reales</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Los contactos aparecerán aquí cuando empiecen a escribirte por WhatsApp, Messenger o Instagram.
                      </p>
                      <Link href="/dashboard/inbox/settings" className="text-xs font-bold text-amber-800 underline mt-1 inline-block">
                        Conectar canales →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Demo contacts */}
                {getDemoBroadcastContacts().map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-slate-200/60 mb-2 opacity-60">
                    <div className="w-4 h-4 rounded border-2 border-slate-300" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{PLATFORM_CONFIG[c.platform]?.icon} {c.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredContacts.map(contact => {
                const platform = contact.inbox_conversations?.[0]?.inbox_channels?.platform || 'whatsapp';
                const isSelected = selectedContacts.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={`w-full flex items-center gap-3 p-3 border-b border-slate-100 transition-all cursor-pointer text-left ${
                      isSelected ? 'bg-[#6a9a04]/5' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      isSelected ? 'bg-[#6a9a04] border-[#6a9a04]' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {contact.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{contact.display_name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{PLATFORM_CONFIG[platform]?.icon || '💬'}</span>
                        {contact.phone || contact.platform_user_id}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — Message composer */}
        <div className="flex-1 flex flex-col bg-white/40">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-xl mx-auto">
              {/* Templates */}
              {templates.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Respuestas Rápidas</p>
                  <div className="flex gap-2 flex-wrap">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => insertTemplate(t)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#6a9a04] hover:bg-[#6a9a04]/5 hover:border-[#6a9a04]/30 transition-all cursor-pointer"
                      >
                        /{t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input */}
              <div className="mb-5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí...

Ejemplo: ¡Hola! 👋 Tenemos una promoción especial en minisplits este fin de semana. ¿Te interesa conocer los detalles?"
                  rows={6}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400">
                    {message.length} caracteres
                  </span>
                  {message.length > 1000 && (
                    <span className="text-[10px] text-amber-600 font-bold">
                      ⚠️ Mensajes largos pueden ser recortados por WhatsApp
                    </span>
                  )}
                </div>
              </div>

              {/* Preview */}
              {message.trim() && (
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Vista Previa</p>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '16px 16px' }}>
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-[#6a9a04] text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{message}</p>
                        <p className="text-[10px] text-white/60 text-right mt-1">
                          {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-slate-700 mb-2">Resumen del envío</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#6a9a04]">{selectedContacts.length}</p>
                    <p className="text-[10px] text-slate-500 font-bold">Destinatarios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-700">{message.length}</p>
                    <p className="text-[10px] text-slate-500 font-bold">Caracteres</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-700">
                      {platformFilter ? PLATFORM_CONFIG[platformFilter]?.icon : '🌐'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {platformFilter ? PLATFORM_CONFIG[platformFilter]?.label : 'Todos'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Send result */}
              {sendResult && (
                <div className={`rounded-2xl p-4 mb-5 border ${
                  sendResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {sendResult.success ? (
                    <div className="flex items-start gap-2">
                      <CheckCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-green-800">¡Broadcast enviado!</p>
                        <p className="text-xs text-green-700 mt-0.5">
                          {sendResult.sent} enviados · {sendResult.failed} fallidos · {sendResult.total} total
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Error al enviar</p>
                        <p className="text-xs text-red-700 mt-0.5">{sendResult.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !message.trim() || selectedContacts.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#6a9a04] text-white rounded-2xl font-bold text-sm hover:bg-[#5a8a03] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg shadow-[#6a9a04]/20"
              >
                {sending ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Enviando a {selectedContacts.length} contactos...</>
                ) : (
                  <><Send className="w-5 h-5" /> Enviar Broadcast ({selectedContacts.length})</>
                )}
              </button>

              {selectedContacts.length === 0 && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  Selecciona al menos un contacto en el panel izquierdo
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo contacts for when no real data exists
function getDemoBroadcastContacts() {
  return [
    { id: 'd1', name: 'María González', phone: '+52 844 123 4567', platform: 'whatsapp' },
    { id: 'd2', name: 'Roberto Díaz', phone: '+52 811 234 5678', platform: 'whatsapp' },
    { id: 'd3', name: 'Laura Sánchez', phone: '+52 833 345 6789', platform: 'messenger' },
    { id: 'd4', name: 'Carlos Mendoza', phone: '+52 844 456 7890', platform: 'instagram' },
    { id: 'd5', name: 'Ana Rodríguez', phone: '+52 812 567 8901', platform: 'whatsapp' },
  ];
}
