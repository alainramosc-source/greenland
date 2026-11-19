import * as webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { validatePushSubscription } from './inbox-push-validation.js';

export function pushConfiguration() {
  const publicKey = process.env.INBOX_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.INBOX_PUSH_VAPID_PRIVATE_KEY;
  return publicKey && privateKey ? { publicKey, privateKey, subject: 'https://www.greenland-products.com.mx' } : null;
}

export function pushAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function dispatchInboxPush({ admin, send, config } = {}) {
  config ??= pushConfiguration();
  if (!config) return { skipped: true };
  admin ??= pushAdmin();
  send ??= webpush.sendNotification;
  const { data: deliveries, error } = await admin.rpc('claim_inbox_push_deliveries', { p_limit: 20 });
  if (error) throw new Error('No se pudo obtener la cola de avisos.');
  let accepted = 0;
  let failed = false;
  // Small bounded groups prevent a slow provider from delaying all devices.
  for (let i = 0; i < deliveries.length; i += 5) {
    const results = await Promise.allSettled(deliveries.slice(i, i + 5).map(async delivery => {
      const subscription = validatePushSubscription(delivery);
      let sent = false;
      let code = null;
      try {
        if (!subscription) throw Object.assign(new Error('Invalid subscription'), { statusCode: 410 });
        const platform = { whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram' }[delivery.platform] || 'Inbox';
        await send(subscription, JSON.stringify({
          title: `Mensaje nuevo · ${platform}`,
          body: 'Tienes un mensaje nuevo en el Inbox de Greenland.',
          url: `/dashboard/inbox?conv=${delivery.conversation_id}`,
          tag: `inbox-${delivery.message_id}`,
        }), { TTL: 86400, urgency: 'high', timeout: 5000, vapidDetails: config });
        sent = true;
        accepted++;
      } catch (err) {
        code = Number.isInteger(err.statusCode) ? err.statusCode : 0;
        if ([404, 410].includes(code)) {
          const { error: removeError } = await admin.from('inbox_push_subscriptions').delete().eq('id', delivery.subscription_id);
          if (removeError) throw new Error('No se pudo retirar una suscripción vencida.');
          return;
        }
      }
      const { error: finishError } = await admin.rpc('finish_inbox_push_delivery', { p_id: delivery.delivery_id, p_sent: sent, p_code: code });
      if (finishError) throw new Error('No se pudo actualizar la cola de avisos.');
    }));
    if (results.some(result => result.status === 'rejected')) failed = true;
  }
  if (failed) throw new Error('Algunos avisos requieren reintento.');
  return { processed: deliveries.length, accepted };
}
