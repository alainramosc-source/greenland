import { NextResponse } from 'next/server';
import { dispatchInboxPush } from '@/lib/inbox-push-server';

export const maxDuration = 60;
export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    return NextResponse.json(await dispatchInboxPush());
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la cola de avisos.' }, { status: 500 });
  }
}
