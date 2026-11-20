export const LEGACY_MEDIA_BUCKET = 'inbox-media';
const PREFIX = '/api/inbox/upload?path=';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PATH = new RegExp(`^${UUID}/(?:[0-9]{13}|${UUID})\\.[a-z0-9]{1,8}$`, 'i');

export function legacyMediaPath(url) {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) return null;
  try {
    const path = decodeURIComponent(url.slice(PREFIX.length));
    return PATH.test(path) ? path : null;
  } catch { return null; }
}

export function legacyMediaUrl(path) {
  if (!PATH.test(path)) throw new Error('Referencia inválida.');
  return PREFIX + encodeURIComponent(path);
}

export async function signLegacyMedia(admin, path, seconds = 300) {
  if (!PATH.test(path)) throw new Error('Referencia inválida.');
  const { data, error } = await admin.storage.from(LEGACY_MEDIA_BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error('Adjunto no disponible.');
  return data.signedUrl;
}
