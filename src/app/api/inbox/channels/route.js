import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/utils/supabase/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ============================================================
// GET — List channels for the authenticated distributor
// ============================================================
export async function GET(request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await getAdminClient()
      .from('inbox_channels')
      .select('id, platform, platform_account_id, display_name, is_active, connected_at')
      .eq('distributor_id', user.id)
      .order('connected_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ channels: data || [] });
  } catch (error) {
    console.error('[Channels] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// POST — Connect a new channel (platform account)
// ============================================================
export async function POST(request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, platform_account_id, display_name, access_token } = await request.json();

    if (!platform || !platform_account_id || !access_token) {
      return NextResponse.json({ error: 'platform, platform_account_id, and access_token are required' }, { status: 400 });
    }

    if (!['whatsapp', 'messenger', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Check if channel already exists
    const { data: existing } = await getAdminClient()
      .from('inbox_channels')
      .select('id')
      .eq('distributor_id', user.id)
      .eq('platform', platform)
      .eq('platform_account_id', platform_account_id)
      .single();

    if (existing) {
      // Update existing channel
      const { data, error } = await getAdminClient()
        .from('inbox_channels')
        .update({ access_token, display_name, is_active: true })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ channel: data, updated: true });
    }

    // Create new channel
    const { data, error } = await getAdminClient()
      .from('inbox_channels')
      .insert({
        distributor_id: user.id,
        platform,
        platform_account_id,
        display_name: display_name || platform,
        access_token,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ channel: data, created: true }, { status: 201 });
  } catch (error) {
    console.error('[Channels] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// DELETE — Disconnect a channel
// ============================================================
export async function DELETE(request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('id');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel id is required' }, { status: 400 });
    }

    // Soft delete — just deactivate
    const { error } = await getAdminClient()
      .from('inbox_channels')
      .update({ is_active: false })
      .eq('id', channelId)
      .eq('distributor_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Channels] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
