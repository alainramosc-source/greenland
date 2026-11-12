'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const eventNames = new Set(['distributor_order_submitted', 'distributor_payment_receipt_submitted']);
const clientCookie = 'greenland_analytics_client';

export async function trackDistributorEvent(name) {
  const secret = process.env.GA4_MEASUREMENT_PROTOCOL_SECRET;
  if (!secret || !eventNames.has(name)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'distributor' || profile.is_active === false) return;

  const cookieStore = await cookies();
  let clientId = cookieStore.get(clientCookie)?.value;
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) {
    clientId = randomUUID();
    cookieStore.set(clientCookie, clientId, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  }

  const url = new URL('https://www.google-analytics.com/mp/collect');
  url.searchParams.set('measurement_id', 'G-KPY2MXDXGN');
  url.searchParams.set('api_secret', secret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, events: [{ name }] }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.warn('GA4 rechazó un evento de distribuidor.', response.status);
  } catch {
    console.warn('No se pudo enviar un evento de distribuidor a GA4.');
  }
}
