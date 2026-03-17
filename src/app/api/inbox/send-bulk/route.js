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
// POST — Send a message to multiple contacts (broadcast)
// ============================================================
export async function POST(request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { contact_ids, content, content_type = 'text', tag_filter, platform_filter } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Build query to get target contacts
    let query = getAdminClient()
      .from('inbox_contacts')
      .select('id, platform, platform_user_id, display_name')
      .eq('distributor_id', user.id);

    // If specific contact IDs provided
    if (contact_ids && contact_ids.length > 0) {
      query = query.in('id', contact_ids);
    }

    // Filter by platform
    if (platform_filter) {
      query = query.eq('platform', platform_filter);
    }

    const { data: contacts, error: contactsError } = await query;
    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found' }, { status: 404 });
    }

    // If tag filter, get contacts with those tags
    let filteredContacts = contacts;
    if (tag_filter && tag_filter.length > 0) {
      const { data: taggedContacts } = await getAdminClient()
        .from('inbox_contact_tags')
        .select('contact_id')
        .in('tag_id', tag_filter);

      const taggedIds = new Set((taggedContacts || []).map(tc => tc.contact_id));
      filteredContacts = contacts.filter(c => taggedIds.has(c.id));
    }

    // Get channels for this distributor
    const { data: channels } = await getAdminClient()
      .from('inbox_channels')
      .select('*')
      .eq('distributor_id', user.id)
      .eq('is_active', true);

    const channelMap = {};
    (channels || []).forEach(ch => {
      channelMap[ch.platform] = ch;
    });

    // Send to each contact
    const results = { sent: 0, failed: 0, errors: [] };

    for (const contact of filteredContacts) {
      const channel = channelMap[contact.platform];
      if (!channel) {
        results.failed++;
        results.errors.push({ contact: contact.display_name, error: `No ${contact.platform} channel connected` });
        continue;
      }

      try {
        // Find or create conversation
        let { data: conversation } = await getAdminClient()
          .from('inbox_conversations')
          .select('id')
          .eq('channel_id', channel.id)
          .eq('contact_id', contact.id)
          .neq('status', 'archived')
          .single();

        if (!conversation) {
          const { data: newConv } = await getAdminClient()
            .from('inbox_conversations')
            .insert({
              channel_id: channel.id,
              contact_id: contact.id,
              distributor_id: user.id,
              status: 'open',
            })
            .select('id')
            .single();
          conversation = newConv;
        }

        // Send via platform API
        let platformMessageId = null;

        if (channel.platform === 'whatsapp') {
          const res = await fetch(`${GRAPH_API}/${channel.platform_account_id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${channel.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: contact.platform_user_id,
              type: 'text',
              text: { body: content },
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          platformMessageId = data.messages?.[0]?.id;
        } else {
          // Messenger / Instagram
          const res = await fetch(`${GRAPH_API}/me/messages?access_token=${channel.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: contact.platform_user_id },
              message: { text: content },
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          platformMessageId = data.message_id;
        }

        // Store in database
        await getAdminClient().from('inbox_messages').insert({
          conversation_id: conversation.id,
          direction: 'outbound',
          content,
          content_type,
          platform_message_id: platformMessageId,
          status: 'sent',
        });

        // Update conversation
        await getAdminClient()
          .from('inbox_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content?.substring(0, 100),
          })
          .eq('id', conversation.id);

        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ contact: contact.display_name, error: err.message });
      }
    }

    console.log(`[Broadcast] 📢 Sent: ${results.sent}, Failed: ${results.failed}`);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[Broadcast] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
