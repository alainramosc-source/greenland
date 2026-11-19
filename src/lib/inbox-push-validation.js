export function validatePushSubscription(input) {
  if (!input || typeof input.endpoint !== 'string' || input.endpoint.length > 2048) return null;
  try {
    const url = new URL(input.endpoint);
    const host = url.hostname;
    const allowed = ['fcm.googleapis.com', 'android.googleapis.com', 'web.push.apple.com'].includes(host)
      || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com');
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) return null;
    const { p256dh, auth } = input.keys || {};
    if (typeof p256dh !== 'string' || typeof auth !== 'string'
      || !/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(auth)) return null;
    const point = Buffer.from(p256dh, 'base64url');
    if (point.length !== 65 || point[0] !== 4 || Buffer.from(auth, 'base64url').length !== 16) return null;
    return { endpoint: input.endpoint, keys: { p256dh, auth } };
  } catch { return null; }
}
