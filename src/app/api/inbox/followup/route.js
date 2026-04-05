// ============================================================
// Follow-up Cron Job — Proactive bot messages
// Runs every 3 minutes via Vercel Cron
// Sends follow-up messages to customers who stopped responding
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Verify cron secret to prevent unauthorized access
function verifyCron(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return false;
  }
  return true;
}

// Check if currently within business hours (9am-6pm Mexico City, Mon-Fri)
function isBusinessHours() {
  const now = new Date();
  const mxTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const hour = mxTime.getHours();
  const day = mxTime.getDay();
  return hour >= 9 && hour < 18 && day >= 1 && day <= 5;
}

// Follow-up message templates
const FOLLOWUP_MESSAGES = [
  '¿Sigues por aquí? 😊 Quedo atento por si tienes alguna duda.',
  '¡Hola de nuevo! 👋 ¿Necesitas más información sobre nuestros productos?',
  'No hemos recibido respuesta. Si necesitas ayuda más adelante, aquí estaremos con gusto. ¡Que tengas excelente día! 🙌',
];

// Send message via the correct platform
async function sendFollowupMessage(supabase, conversation, messageText) {
  const { data: channel } = await supabase
    .from('inbox_channels')
    .select('platform, access_token, platform_account_id')
    .eq('id', conversation.channel_id)
    .single();

  if (!channel) return false;

  const { data: contact } = await supabase
    .from('inbox_contacts')
    .select('platform_user_id, phone')
    .eq('id', conversation.contact_id)
    .single();

  if (!contact) return false;

  const recipientId = contact.platform_user_id;
  const platform = channel.platform;

  try {
    let sent = false;

    if (platform === 'whatsapp') {
      const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
      if (!accessToken || !phoneNumberId) return false;

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: contact.phone || recipientId,
            type: 'text',
            text: { body: messageText },
          }),
        }
      );
      sent = res.ok;
    } else if (platform === 'messenger') {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${channel.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: messageText },
          }),
        }
      );
      sent = res.ok;
    } else if (platform === 'instagram') {
      // Instagram uses Messenger platform via Page credentials
      const { data: messengerChannel } = await supabase
        .from('inbox_channels')
        .select('access_token, platform_account_id')
        .eq('platform', 'messenger')
        .eq('is_active', true)
        .single();

      if (messengerChannel) {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${messengerChannel.platform_account_id}/messages?access_token=${messengerChannel.access_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: recipientId },
              message: { text: messageText },
            }),
          }
        );
        sent = res.ok;
      }
    }

    if (sent) {
      // Save the follow-up message to DB
      await supabase.from('inbox_messages').insert({
        conversation_id: conversation.id,
        direction: 'outbound',
        content: messageText,
        content_type: 'text',
        status: 'sent',
        metadata: { sent_by: 'chatbot_followup' },
      });

      // Update conversation
      await supabase.from('inbox_conversations').update({
        last_message_preview: messageText.substring(0, 100),
        last_message_at: new Date().toISOString(),
        bot_last_replied_at: new Date().toISOString(),
        bot_followup_count: conversation.bot_followup_count + 1,
      }).eq('id', conversation.id);

      console.log(`[Followup] ✅ Sent followup #${conversation.bot_followup_count + 1} to ${conversation.id}`);
    }

    return sent;
  } catch (err) {
    console.error(`[Followup] Error sending to ${conversation.id}:`, err);
    return false;
  }
}

export async function GET(request) {
  // Verify cron authentication
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only run during business hours
  if (!isBusinessHours()) {
    return NextResponse.json({ status: 'skipped', reason: 'outside_business_hours' });
  }

  const supabase = getAdminClient();

  try {
    // Find conversations where:
    // 1. Bot is active (chatbot_active = true)
    // 2. Bot was the last to reply (bot_last_replied_at is set)
    // 3. Haven't reached max followups (< 3)
    // 4. Status is 'open'
    const { data: conversations, error } = await supabase
      .from('inbox_conversations')
      .select('id, channel_id, contact_id, bot_followup_count, bot_last_replied_at, last_message_at')
      .eq('chatbot_active', true)
      .eq('status', 'open')
      .not('bot_last_replied_at', 'is', null)
      .lt('bot_followup_count', 3)
      .order('bot_last_replied_at', { ascending: true });

    if (error) {
      console.error('[Followup] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sentCount = 0;
    const now = new Date();

    for (const conv of conversations || []) {
      const botRepliedAt = new Date(conv.bot_last_replied_at);
      const lastMsgAt = new Date(conv.last_message_at);
      const minutesSinceBotReply = (now - botRepliedAt) / 60000;

      // Skip if customer replied after bot (last_message_at > bot_last_replied_at)
      if (lastMsgAt > botRepliedAt) continue;

      // Determine if it's time for a followup based on count
      let shouldSend = false;
      if (conv.bot_followup_count === 0 && minutesSinceBotReply >= 2) {
        shouldSend = true; // First followup after 2 min
      } else if (conv.bot_followup_count === 1 && minutesSinceBotReply >= 5) {
        shouldSend = true; // Second followup after 5 min total
      } else if (conv.bot_followup_count === 2 && minutesSinceBotReply >= 8) {
        shouldSend = true; // Final message after 8 min total
      }

      if (shouldSend) {
        const messageText = FOLLOWUP_MESSAGES[conv.bot_followup_count];
        const sent = await sendFollowupMessage(supabase, conv, messageText);
        if (sent) sentCount++;

        // If this was the last followup, deactivate the bot for this conversation
        if (conv.bot_followup_count === 2 && sent) {
          await supabase.from('inbox_conversations').update({
            chatbot_active: false,
          }).eq('id', conv.id);
          console.log(`[Followup] 🔚 Conversation ${conv.id} closed after 3 followups`);
        }
      }
    }

    console.log(`[Followup] Processed ${conversations?.length || 0} conversations, sent ${sentCount} followups`);
    return NextResponse.json({ status: 'ok', processed: conversations?.length || 0, sent: sentCount });
  } catch (err) {
    console.error('[Followup] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
