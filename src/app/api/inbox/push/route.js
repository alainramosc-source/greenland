import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkInboxSession } from '@/lib/inbox-access';
import { pushAdmin, pushConfiguration } from '@/lib/inbox-push-server';
import { validatePushSubscription } from '@/lib/inbox-push-validation';

async function access() { return checkInboxSession(await createClient()); }
const denied = a => NextResponse.json({ error: a.error }, { status: a.status });

export async function GET() {
  const a = await access();
  if (a.status) return denied(a);
  const config = pushConfiguration();
  return NextResponse.json({ configured: Boolean(config), publicKey: config?.publicKey || null },
    { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request) {
  const a = await access();
  if (a.status) return denied(a);
  if (!pushConfiguration()) return NextResponse.json({ error: 'Los avisos aún no están disponibles.' }, { status: 503 });
  if (Number(request.headers.get('content-length')) > 8192) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  let subscription;
  try { subscription = validatePushSubscription(await request.json()); } catch { /* Invalid body. */ }
  if (!subscription) return NextResponse.json({ error: 'Suscripción de notificaciones inválida.' }, { status: 400 });
  const { error } = await pushAdmin().from('inbox_push_subscriptions').upsert({
    user_id: a.user.id, ...subscription, updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  return error ? NextResponse.json({ error: 'No se pudieron activar los avisos.' }, { status: 500 }) : NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const a = await access();
  if (a.status) return denied(a);
  let endpoint;
  try { ({ endpoint } = await request.json()); } catch { /* Invalid body. */ }
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 });
  const { error } = await pushAdmin().from('inbox_push_subscriptions').delete().eq('user_id', a.user.id).eq('endpoint', endpoint);
  return error ? NextResponse.json({ error: 'No se pudieron desactivar los avisos.' }, { status: 500 }) : NextResponse.json({ success: true });
}
