import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-initialized admin client (avoids build-time env errors)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ============================================================
// GET — Webhook Verification (Meta sends this to verify our endpoint)
// ============================================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'greenland_inbox_verify_2024';
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] ✅ Verification successful');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[Webhook] ❌ Verification failed — invalid token');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ============================================================
// POST — Receive incoming messages from Meta
// ============================================================
export async function POST(request) {
  try {
    const body = await request.json();

    // Meta sends different structures per platform
    if (body.object === 'whatsapp_business_account') {
      await handleWhatsApp(body);
    } else if (body.object === 'page') {
      await handleMessenger(body);
    } else if (body.object === 'instagram') {
      await handleInstagram(body);
    } else {
      console.log('[Webhook] Unknown object type:', body.object);
    }

    // Meta requires a 200 response within 20 seconds
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}

// ============================================================
// WHATSAPP HANDLER
// ============================================================
async function handleWhatsApp(body) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;

      // Status updates (sent, delivered, read)
      if (value.statuses) {
        for (const status of value.statuses) {
          await updateMessageStatus(status.id, status.status);
        }
        continue;
      }

      // Incoming messages
      if (!value.messages) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      const channel = await findChannel('whatsapp', phoneNumberId);
      if (!channel) {
        console.warn('[WhatsApp] No channel found for phone_number_id:', phoneNumberId);
        continue;
      }

      for (const msg of value.messages) {
        const senderPhone = msg.from;
        const senderName = value.contacts?.[0]?.profile?.name || senderPhone;

        // Find or create contact
        const contact = await findOrCreateContact(channel.distributor_id, 'whatsapp', senderPhone, senderName, senderPhone);

        // Find or create conversation
        const conversation = await findOrCreateConversation(channel, contact);

        // Parse message content
        let content = '';
        let contentType = 'text';
        let mediaUrl = null;

        switch (msg.type) {
          case 'text':
            content = msg.text?.body || '';
            break;
          case 'image':
            contentType = 'image';
            content = msg.image?.caption || '[Imagen]';
            mediaUrl = await getMediaUrl(msg.image?.id, process.env.META_WHATSAPP_ACCESS_TOKEN || channel.access_token);
            break;
          case 'video':
            contentType = 'video';
            content = msg.video?.caption || '[Video]';
            mediaUrl = await getMediaUrl(msg.video?.id, process.env.META_WHATSAPP_ACCESS_TOKEN || channel.access_token);
            break;
          case 'audio':
            contentType = 'audio';
            content = '[Audio]';
            mediaUrl = await getMediaUrl(msg.audio?.id, process.env.META_WHATSAPP_ACCESS_TOKEN || channel.access_token);
            break;
          case 'document':
            contentType = 'document';
            content = msg.document?.filename || '[Documento]';
            mediaUrl = await getMediaUrl(msg.document?.id, process.env.META_WHATSAPP_ACCESS_TOKEN || channel.access_token);
            break;
          case 'location':
            contentType = 'location';
            content = `📍 ${msg.location?.latitude}, ${msg.location?.longitude}`;
            break;
          default:
            content = `[${msg.type}]`;
        }

        // Store message
        await storeInboundMessage(conversation.id, content, contentType, mediaUrl, msg.id);
      }
    }
  }
}

// ============================================================
// MESSENGER HANDLER
// ============================================================
async function handleMessenger(body) {
  for (const entry of body.entry || []) {
    const pageId = entry.id;
    const channel = await findChannel('messenger', pageId);
    if (!channel) {
      console.warn('[Messenger] No channel found for page_id:', pageId);
      continue;
    }

    for (const event of entry.messaging || []) {
      if (!event.message) continue; // Skip delivery/read receipts

      const senderId = event.sender?.id;
      if (senderId === pageId) continue; // Skip messages sent BY the page

      // Get sender profile
      const senderName = await getMessengerProfile(senderId, channel.access_token);

      const contact = await findOrCreateContact(channel.distributor_id, 'messenger', senderId, senderName);
      const conversation = await findOrCreateConversation(channel, contact);

      let content = event.message.text || '';
      let contentType = 'text';
      let mediaUrl = null;

      if (event.message.attachments?.length > 0) {
        const attachment = event.message.attachments[0];
        contentType = attachment.type === 'image' ? 'image'
          : attachment.type === 'video' ? 'video'
          : attachment.type === 'audio' ? 'audio'
          : 'document';
        mediaUrl = attachment.payload?.url;
        content = content || `[${contentType}]`;
      }

      await storeInboundMessage(conversation.id, content, contentType, mediaUrl, event.message.mid);
    }
  }
}

// ============================================================
// INSTAGRAM HANDLER
// ============================================================
async function handleInstagram(body) {
  for (const entry of body.entry || []) {
    const igAccountId = entry.id;
    const channel = await findChannel('instagram', igAccountId);
    if (!channel) {
      console.warn('[Instagram] No channel found for account_id:', igAccountId);
      continue;
    }

    for (const event of entry.messaging || []) {
      if (!event.message) continue;

      const senderId = event.sender?.id;
      if (senderId === igAccountId) continue;

      const contact = await findOrCreateContact(channel.distributor_id, 'instagram', senderId, `IG User ${senderId}`);
      const conversation = await findOrCreateConversation(channel, contact);

      let content = event.message.text || '';
      let contentType = 'text';
      let mediaUrl = null;

      if (event.message.attachments?.length > 0) {
        const attachment = event.message.attachments[0];
        contentType = attachment.type === 'image' ? 'image' : attachment.type;
        mediaUrl = attachment.payload?.url;
        content = content || `[${contentType}]`;
      }

      await storeInboundMessage(conversation.id, content, contentType, mediaUrl, event.message.mid);
    }
  }
}

// ============================================================
// SHARED HELPERS
// ============================================================

async function findChannel(platform, platformAccountId) {
  const { data } = await getAdminClient()
    .from('inbox_channels')
    .select('*')
    .eq('platform', platform)
    .eq('platform_account_id', platformAccountId)
    .eq('is_active', true)
    .single();
  return data;
}

async function findOrCreateContact(distributorId, platform, platformUserId, displayName, phone = null) {
  // Try to find existing contact
  const { data: existing } = await getAdminClient()
    .from('inbox_contacts')
    .select('*')
    .eq('distributor_id', distributorId)
    .eq('platform', platform)
    .eq('platform_user_id', platformUserId)
    .single();

  if (existing) {
    // Update display name if changed
    if (displayName && displayName !== existing.display_name) {
      await getAdminClient()
        .from('inbox_contacts')
        .update({ display_name: displayName })
        .eq('id', existing.id);
    }
    return existing;
  }

  // Create new contact
  const { data: newContact } = await getAdminClient()
    .from('inbox_contacts')
    .insert({
      distributor_id: distributorId,
      platform,
      platform_user_id: platformUserId,
      display_name: displayName || platformUserId,
      phone,
    })
    .select()
    .single();

  return newContact;
}

async function findOrCreateConversation(channel, contact) {
  // Find existing open conversation
  const { data: existing } = await getAdminClient()
    .from('inbox_conversations')
    .select('*')
    .eq('channel_id', channel.id)
    .eq('contact_id', contact.id)
    .eq('distributor_id', channel.distributor_id)
    .neq('status', 'archived')
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data: newConv } = await getAdminClient()
    .from('inbox_conversations')
    .insert({
      channel_id: channel.id,
      contact_id: contact.id,
      distributor_id: channel.distributor_id,
      status: 'open',
    })
    .select()
    .single();

  return newConv;
}

async function storeInboundMessage(conversationId, content, contentType, mediaUrl, platformMessageId) {
  // Insert message
  await getAdminClient()
    .from('inbox_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      content,
      content_type: contentType,
      media_url: mediaUrl,
      platform_message_id: platformMessageId,
      status: 'delivered',
    });

  // Update conversation with last message info and increment unread
  const { data: conv } = await getAdminClient()
    .from('inbox_conversations')
    .select('unread_count, chatbot_active, contact_id')
    .eq('id', conversationId)
    .single();

  await getAdminClient()
    .from('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content?.substring(0, 100),
      unread_count: (conv?.unread_count || 0) + 1,
    })
    .eq('id', conversationId);

  console.log(`[Inbox] 📩 New message in conversation ${conversationId}`);

  // 🤖 Trigger chatbot if active (only for text messages)
  if (conv?.chatbot_active && contentType === 'text' && content) {
    try {
      // Get contact phone for WhatsApp reply
      let phoneNumber = null;
      if (conv.contact_id) {
        const { data: contact } = await getAdminClient()
          .from('inbox_contacts')
          .select('phone, platform_user_id')
          .eq('id', conv.contact_id)
          .single();
        phoneNumber = contact?.phone || contact?.platform_user_id;
      }

      // Call bot engine asynchronously (don't block webhook response)
      const botUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://greenland-products.com.mx'}/api/inbox/chatbot`;
      fetch(botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: content,
          phone_number: phoneNumber,
        }),
      }).catch(err => console.error('[Chatbot] Trigger error:', err));

      console.log(`[Chatbot] 🤖 Bot triggered for conversation ${conversationId}`);
    } catch (err) {
      console.error('[Chatbot] Error triggering bot:', err);
    }
  }
}

async function updateMessageStatus(platformMessageId, status) {
  await getAdminClient()
    .from('inbox_messages')
    .update({ status })
    .eq('platform_message_id', platformMessageId);
}

async function getMediaUrl(mediaId, accessToken) {
  if (!mediaId) return null;
  // Return a proxy URL that will download the media on demand
  // This is more reliable than Meta's temporary direct URLs
  return `/api/inbox/media?id=${mediaId}`;
}

async function getMessengerProfile(userId, accessToken) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${userId}?fields=first_name,last_name&access_token=${accessToken}`);
    const data = await res.json();
    return `${data.first_name || ''} ${data.last_name || ''}`.trim() || `User ${userId}`;
  } catch {
    return `User ${userId}`;
  }
}
