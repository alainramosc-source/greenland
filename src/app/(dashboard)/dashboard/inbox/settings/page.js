'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Settings, MessageSquare, Plus, Trash2, Check, X, ExternalLink,
  RefreshCw, Shield, AlertTriangle, Copy, Eye, EyeOff, ArrowLeft
} from 'lucide-react';

const PLATFORM_CONFIG = {
  whatsapp: { label: 'WhatsApp Business', color: '#25D366', icon: '💬', description: 'Conecta tu cuenta de WhatsApp Business API para recibir y enviar mensajes.' },
  messenger: { label: 'Facebook Messenger', color: '#0084FF', icon: '💙', description: 'Conecta tu Facebook Page para recibir mensajes de Messenger.' },
  instagram: { label: 'Instagram DMs', color: '#E4405F', icon: '📸', description: 'Conecta tu cuenta de Instagram Business para DMs.' },
};

export default function InboxSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');

  // New channel form
  const [newChannel, setNewChannel] = useState({ platform: 'whatsapp', platform_account_id: '', display_name: '', access_token: '' });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // New template form
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '', category: 'general' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch channels
      const res = await fetch('/api/inbox/channels');
      const channelData = await res.json();
      setChannels(channelData.channels || []);

      // Fetch templates
      const { data: tmplData } = await supabase
        .from('inbox_templates')
        .select('*')
        .eq('distributor_id', user.id)
        .order('created_at', { ascending: false });
      setTemplates(tmplData || []);
    } catch (err) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChannel(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/inbox/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });
      const data = await res.json();
      if (res.ok) {
        setChannels(prev => [data.channel, ...prev]);
        setNewChannel({ platform: 'whatsapp', platform_account_id: '', display_name: '', access_token: '' });
        setShowAddChannel(false);
      } else {
        alert(data.error || 'Error al conectar canal');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnectChannel(channelId) {
    if (!confirm('¿Desactivar este canal? Las conversaciones existentes se conservan.')) return;
    try {
      await fetch(`/api/inbox/channels?id=${channelId}`, { method: 'DELETE' });
      setChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (err) {
      alert('Error al desconectar');
    }
  }

  async function handleAddTemplate(e) {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('inbox_templates')
        .insert({ ...newTemplate, distributor_id: user.id })
        .select()
        .single();
      if (error) throw error;
      setTemplates(prev => [data, ...prev]);
      setNewTemplate({ title: '', content: '', category: 'general' });
      setShowAddTemplate(false);
    } catch (err) {
      alert('Error al crear template');
    }
  }

  async function handleDeleteTemplate(templateId) {
    if (!confirm('¿Eliminar esta respuesta rápida?')) return;
    try {
      await supabase.from('inbox_templates').delete().eq('id', templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      alert('Error al eliminar');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/dashboard/inbox')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#6a9a04]" />
            Configuración del Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona tus canales de comunicación y respuestas rápidas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'channels' ? 'bg-white shadow-sm text-[#6a9a04]' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Canales
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'templates' ? 'bg-white shadow-sm text-[#6a9a04]' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Respuestas Rápidas
        </button>
      </div>

      {/* ============================================================ */}
      {/* CHANNELS TAB */}
      {/* ============================================================ */}
      {activeTab === 'channels' && (
        <div>
          {/* Connected channels */}
          {channels.length > 0 && (
            <div className="space-y-3 mb-6">
              {channels.map((channel) => {
                const cfg = PLATFORM_CONFIG[channel.platform] || PLATFORM_CONFIG.whatsapp;
                return (
                  <div key={channel.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${cfg.color}15` }}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{channel.display_name || cfg.label}</p>
                        <p className="text-xs text-slate-500">{cfg.label} · {channel.platform_account_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        channel.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {channel.is_active ? '● Activo' : '● Inactivo'}
                      </span>
                      <button
                        onClick={() => handleDisconnectChannel(channel.id)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Desconectar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add channel button or form */}
          {!showAddChannel ? (
            <button
              onClick={() => setShowAddChannel(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold text-sm">Conectar Canal</span>
            </button>
          ) : (
            <form onSubmit={handleAddChannel} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Conectar Nuevo Canal</h3>
                <button type="button" onClick={() => setShowAddChannel(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Platform selector */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewChannel(prev => ({ ...prev, platform: key }))}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                      newChannel.platform === key
                        ? 'border-[#6a9a04] bg-[#6a9a04]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{cfg.icon}</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{cfg.label}</p>
                  </button>
                ))}
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">¿Cómo obtener los datos?</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {newChannel.platform === 'whatsapp'
                        ? 'Necesitas una cuenta de WhatsApp Business API en Meta for Developers. El Phone Number ID y Access Token los encuentras en tu app de Meta.'
                        : newChannel.platform === 'messenger'
                        ? 'Necesitas una Facebook Page con Messenger activo. El Page ID y Access Token los encuentras en Meta for Developers → tu app → Messenger Settings.'
                        : 'Necesitas una cuenta de Instagram Business conectada a una Facebook Page. El IG Account ID y Token los encuentras en Meta for Developers.'
                      }
                    </p>
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 mt-1 hover:underline"
                    >
                      Ir a Meta for Developers <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del canal</label>
                  <input
                    type="text"
                    value={newChannel.display_name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder={`Ej: Mi ${PLATFORM_CONFIG[newChannel.platform].label}`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {newChannel.platform === 'whatsapp' ? 'Phone Number ID' : newChannel.platform === 'messenger' ? 'Page ID' : 'IG Account ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newChannel.platform_account_id}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, platform_account_id: e.target.value }))}
                    placeholder="Ej: 123456789012345"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Access Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      required
                      value={newChannel.access_token}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, access_token: e.target.value }))}
                      placeholder="EAAxxxxxxx..."
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="submit"
                  disabled={saving || !newChannel.platform_account_id || !newChannel.access_token}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6a9a04] text-white rounded-xl font-bold text-sm hover:bg-[#5a8a03] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Conectando...' : 'Conectar Canal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(false)}
                  className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Webhook info */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#6a9a04]" />
              <h3 className="font-bold text-slate-900 text-sm">Webhook URL</h3>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Configura esta URL en tu aplicación de Meta for Developers como Webhook URL para recibir mensajes:
            </p>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <code className="text-xs text-slate-700 flex-1 truncate font-mono">
                https://greenland-products.com.mx/api/inbox/webhook
              </code>
              <button
                onClick={() => navigator.clipboard.writeText('https://greenland-products.com.mx/api/inbox/webhook')}
                className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Copiar"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Verify Token: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">greenland_inbox_verify_2024</code>
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TEMPLATES TAB */}
      {/* ============================================================ */}
      {activeTab === 'templates' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Crea respuestas rápidas para agilizar tus conversaciones. Escribe <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#6a9a04] font-mono text-xs">/</code> en el chat para usarlas.
          </p>

          {/* Existing templates */}
          {templates.length > 0 && (
            <div className="space-y-2 mb-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#6a9a04]">/{tmpl.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{tmpl.content}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
                      {tmpl.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add template */}
          {!showAddTemplate ? (
            <button
              onClick={() => setShowAddTemplate(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold text-sm">Nueva Respuesta Rápida</span>
            </button>
          ) : (
            <form onSubmit={handleAddTemplate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Nueva Respuesta Rápida</h3>
                <button type="button" onClick={() => setShowAddTemplate(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Comando (sin /)</label>
                  <input
                    type="text"
                    required
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
                    placeholder="saludo, precio_gl21, horarios..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mensaje</label>
                  <textarea
                    required
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="¡Hola! Gracias por contactarnos. ¿En qué te puedo ayudar?"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Categoría</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                  >
                    <option value="general">General</option>
                    <option value="saludo">Saludo</option>
                    <option value="precios">Precios</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="cierre">Cierre</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="submit"
                  disabled={!newTemplate.title || !newTemplate.content}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6a9a04] text-white rounded-xl font-bold text-sm hover:bg-[#5a8a03] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" /> Crear Respuesta
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTemplate(false)}
                  className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
