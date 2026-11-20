import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/utils/supabase/server';
import { randomUUID } from 'node:crypto';
import { isInboxOperator, validateInboxFile, INBOX_FILE_TYPES } from '@/lib/inbox-access';
import { legacyMediaPath, legacyMediaUrl, signLegacyMedia } from '@/lib/inbox-legacy-media';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    // Verify authenticated user
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const conversationId = formData.get('conversation_id');

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'file and conversation_id required' }, { status: 400 });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) {
      return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
    }
    const fileError = validateInboxFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    const { data: profile } = await supabase.from('profiles')
      .select('id, role, is_active').eq('id', user.id).single();
    const { data: conversation, error: conversationError } = await supabase.from('inbox_conversations')
      .select('id').eq('id', conversationId).maybeSingle();
    let allowed = !conversationError && conversation && isInboxOperator(profile);
    // Existing delivery evidence shares this endpoint. Preserve it only for an
    // active driver assigned to that order, or an active administrator.
    if (!allowed && profile?.is_active === true && ['admin', 'driver'].includes(profile.role)) {
      const { data: order } = await supabase.from('lastmile_orders')
        .select('id, assigned_driver_id').eq('id', conversationId).maybeSingle();
      allowed = order && (profile.role === 'admin' || order.assigned_driver_id === user.id);
    }
    if (!allowed) return NextResponse.json({ error: 'Sin acceso a la conversación o entrega.' }, { status: 403 });

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = INBOX_FILE_TYPES.get(file.type);
    const fileName = `${conversationId}/${randomUUID()}.${ext}`;

    // Upload with service role (bypasses RLS)
    const { data, error } = await getAdminClient().storage
      .from('inbox-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[Upload] Storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: legacyMediaUrl(fileName),
      fileName: file.name,
    });
  } catch (err) {
    console.error('[Upload] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Historical attachments and delivery evidence use the same protected route.
// Authorize the conversation/order before using the privileged storage client.
export async function GET(request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const path = legacyMediaPath('/api/inbox/upload?path=' + encodeURIComponent(new URL(request.url).searchParams.get('path') || ''));
    if (!path) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('id, role, is_active').eq('id', user.id).single();
    if (profileError || !profile?.is_active) return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
    const parentId = path.split('/')[0];
    const { data: conversation, error: conversationError } = await supabase.from('inbox_conversations')
      .select('id').eq('id', parentId).maybeSingle();
    let allowed = !conversationError && conversation && isInboxOperator(profile);
    if (!allowed && ['admin', 'driver'].includes(profile.role)) {
      const { data: order } = await supabase.from('lastmile_orders')
        .select('id, assigned_driver_id').eq('id', parentId).maybeSingle();
      allowed = order && (profile.role === 'admin' || order.assigned_driver_id === user.id);
    }
    if (!allowed) return NextResponse.json({ error: 'Adjunto no disponible.' }, { status: 404 });
    return NextResponse.redirect(await signLegacyMedia(getAdminClient(), path), {
      status: 307, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    return NextResponse.json({ error: 'Adjunto no disponible.' }, { status: 404 });
  }
}
