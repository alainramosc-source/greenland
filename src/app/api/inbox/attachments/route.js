import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { checkInboxSession, validateInboxFile, INBOX_FILE_TYPES } from '@/lib/inbox-access';
import { INBOX_ATTACHMENT_BUCKET, attachmentUrl, attachmentPath, signInboxAttachment } from '@/lib/inbox-attachments';

const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function context() {
  const supabase = await createClient();
  const access = await checkInboxSession(supabase);
  return { supabase, access };
}

export async function POST(request) {
  try {
    const { supabase, access } = await context();
    if (access.status) return NextResponse.json({ error: access.error }, { status: access.status });
    const form = await request.formData();
    const file = form.get('file');
    const conversationId = form.get('conversation_id');
    if (!/^[0-9a-f-]{36}$/i.test(conversationId || '')) return NextResponse.json({ error: 'Conversación inválida.' }, { status: 400 });
    const fileError = validateInboxFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    const { data, error } = await supabase.from('inbox_conversations').select('id').eq('id', conversationId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Conversación no disponible.' }, { status: 404 });
    const path = `${conversationId}/${randomUUID()}.${INBOX_FILE_TYPES.get(file.type)}`;
    const { error: uploadError } = await admin().storage.from(INBOX_ATTACHMENT_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return NextResponse.json({ success: true, url: attachmentUrl(path), fileName: file.name }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo subir el adjunto.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { supabase, access } = await context();
    if (access.status) return NextResponse.json({ error: access.error }, { status: access.status });
    const path = attachmentPath(attachmentUrl(new URL(request.url).searchParams.get('path') || ''));
    if (!path) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
    const { data, error } = await supabase.from('inbox_conversations').select('id').eq('id', path.split('/')[0]).maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Adjunto no disponible.' }, { status: 404 });
    return NextResponse.redirect(await signInboxAttachment(admin(), path), { status: 307, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch {
    return NextResponse.json({ error: 'Adjunto no disponible.' }, { status: 404 });
  }
}
