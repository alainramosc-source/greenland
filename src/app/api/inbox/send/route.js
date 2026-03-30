import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/utils/supabase/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// ============================================================
// POST — Send a message to a contact via their platform
// ============================================================
export async function POST(request) {
  try {
    // Verify authenticated user
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, content, content_type = 'text', media_url } = await request.json();

    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'conversation_id and content are required' }, { status: 400 });
    }

    // Get conversation with channel and contact info
    const { data: conversation, error: convError } = await getAdminClient()
      .from('inbox_conversations')
      .select(`
        *,
        inbox_channels(*),
        inbox_contacts(*)
      `)
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the user owns this conversation
    if (conversation.distributor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const channel = conversation.inbox_channels;
    const contact = conversation.inbox_contacts;

    // Send via the appropriate platform
    let platformMessageId = null;
    let sendStatus = 'sent';

    try {
      switch (channel.platform) {
        case 'whatsapp':
          platformMessageId = await sendWhatsApp(channel, contact, content, content_type);
          break;
        case 'messenger':
          platformMessageId = await sendMessenger(channel, contact, content, content_type);
          break;
        case 'instagram':
          platformMessageId = await sendInstagram(channel, contact, content, content_type);
          break;
        default:
          throw new Error(`Unsupported platform: ${channel.platform}`);
      }
    } catch (sendError) {
      console.error(`[Send] ❌ Failed to send via ${channel.platform}:`, sendError.message);
      sendStatus = 'failed';
      
      // Store the message as failed and return the error detail to the client
      await getAdminClient()
        .from('inbox_messages')
        .insert({
          conversation_id,
          direction: 'outbound',
          content,
          content_type,
          media_url,
          platform_message_id: null,
          status: 'failed',
        });
      
      return NextResponse.json({
        error: 'Message delivery failed',
        detail: sendError.message,
        platform: channel.platform,
      }, { status: 502 });
    }

    // Store message in database
    const { data: message, error: msgError } = await getAdminClient()
      .from('inbox_messages')
      .insert({
        conversation_id,
        direction: 'outbound',
        content,
        content_type,
        media_url,
        platform_message_id: platformMessageId,
        status: sendStatus,
      })
      .select()
      .single();

    if (msgError) {
      console.error('[Send] DB error:', msgError);
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
    }

    // Update conversation
    await getAdminClient()
      .from('inbox_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content?.substring(0, 100),
        unread_count: 0,
      })
      .eq('id', conversation_id);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('[Send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// WHATSAPP — Send via Cloud API
// ============================================================
async function sendWhatsApp(channel, contact, content, contentType) {
  // Use env token (confirmed working) as primary, fallback to DB token
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || channel.access_token;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID || channel.platform_account_id;
  const recipientPhone = contact.platform_user_id;

  console.log('[WhatsApp Send] phoneNumberId:', phoneNumberId, 'recipient:', recipientPhone, 'tokenSource:', process.env.META_WHATSAPP_ACCESS_TOKEN ? 'ENV' : 'DB');

  let messagePayload;

  if (contentType === 'text') {
    messagePayload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: content },
    };
  } else if (contentType === 'image') {
    messagePayload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'image',
      image: { link: content },
    };
  } else if (contentType === 'template') {
    // Template messages require pre-approved templates
    messagePayload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: content,
        language: { code: 'es_MX' },
      },
    };
  } else {
    messagePayload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: content },
    };
  }

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messagePayload),
  });

  const data = await res.json();
  console.log('[WhatsApp Send] Response:', JSON.stringify(data));
  if (data.error) {
    throw new Error(`WhatsApp API: ${data.error.message} (code: ${data.error.code}, type: ${data.error.type})`);
  }
  return data.messages?.[0]?.id || null;
}

// ============================================================
// MESSENGER — Send via Page API
// ============================================================
async function sendMessenger(channel, contact, content, contentType) {
  const recipientId = contact.platform_user_id;

  let messagePayload;

  if (contentType === 'text') {
    messagePayload = {
      recipient: { id: recipientId },
      message: { text: content },
    };
  } else if (contentType === 'image') {
    messagePayload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: { url: content, is_reusable: true },
        },
      },
    };
  } else {
    messagePayload = {
      recipient: { id: recipientId },
      message: { text: content },
    };
  }

  const res = await fetch(`${GRAPH_API}/me/messages?access_token=${channel.access_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messagePayload),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Messenger API error');
  }
  return data.message_id || null;
}

// ============================================================
// INSTAGRAM — Send via IG Messaging API
// ============================================================
async function sendInstagram(channel, contact, content, contentType) {
  const recipientId = contact.platform_user_id;

  let messagePayload;

  if (contentType === 'text') {
    messagePayload = {
      recipient: { id: recipientId },
      message: { text: content },
    };
  } else if (contentType === 'image') {
    messagePayload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: { url: content },
        },
      },
    };
  } else {
    messagePayload = {
      recipient: { id: recipientId },
      message: { text: content },
    };
  }

  const res = await fetch(`${GRAPH_API}/me/messages?access_token=${channel.access_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messagePayload),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Instagram API error');
  }
  return data.message_id || null;
}
