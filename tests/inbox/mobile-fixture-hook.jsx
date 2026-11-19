'use client';
// Synthetic data for the isolated visual fixture; never imported by production.
import { useState } from 'react';
export const PLATFORM_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: 'W', color: '#25d366' },
  messenger: { label: 'Messenger', icon: 'M', color: '#0084ff' },
  instagram: { label: 'Instagram', icon: 'I', color: '#e1306c' },
};
export const formatTimeAgo = () => '1m';
export const formatDate = () => '18/11/2026';
const conversation = { id: '00000000-0000-4000-8000-000000000001', contact_name: 'Cliente de prueba móvil', contact_phone: '0000000000', platform: 'whatsapp', chatbot_active: true, unread_count: 2, tags: [], notes: '', last_message_preview: 'Mensaje de prueba', last_message_at: '2026-11-18T12:00:00Z' };
const conversations = Array.from({ length: 20 }, (_, n) => ({ ...conversation, id: `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`, contact_name: n === 0 ? conversation.contact_name : `Cliente de prueba ${n}` }));
const messages = [
  { id: 'long', direction: 'inbound', content_type: 'text', content: 'TextoLargoSinEspacios'.repeat(20), created_at: '2026-11-18T12:00:00Z' },
  { id: 'audio', direction: 'inbound', content_type: 'audio', media_url: '/fake-audio', created_at: '2026-11-18T12:00:01Z' },
  { id: 'document', direction: 'outbound', content_type: 'document', content: '/api/inbox/attachments?path=fake-private-reference', media_url: '/fake-document', created_at: '2026-11-18T12:00:02Z' },
  { id: 'image', direction: 'outbound', content_type: 'image', content: '/api/inbox/attachments?path=fake-private-reference', media_url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', created_at: '2026-11-18T12:00:03Z' },
];
const supabase = { from: () => ({ select() { return this; }, eq() { return this; }, order: async () => ({ data: [] }) }) };
const noOp = () => {};
const stages = [{ id: 'new', name: 'Nuevos', color: '#6a9a04', order: 0 }];
export function useInbox() {
  const [activeConversation, setActiveConversation] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showSalePanel, setShowSalePanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  return { loading: false, hasChannels: true, conversations, filteredConversations: conversations,
    activeConversation, setActiveConversation, showMobileChat, setShowMobileChat, viewMode, setViewMode,
    showSalePanel, setShowSalePanel, searchTerm, setSearchTerm, platformFilter, setPlatformFilter,
    showUnreadOnly, setShowUnreadOnly, messages, templates: [], supabase, funnelStages: stages,
    handleSelectConversation: c => { setActiveConversation(c); setShowMobileChat(true); },
    handleSendMessage: noOp, handleSendMedia: noOp, handleToggleBot: noOp, handleDeleteConversation: noOp,
    handleUpdateNotes: noOp, handleUpdateTags: noOp, setDraggedConv: noOp, setDragOverStage: noOp, setConversations: noOp,
  };
}
