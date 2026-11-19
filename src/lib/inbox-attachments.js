export const INBOX_ATTACHMENT_BUCKET = 'inbox-attachments';
const PREFIX = '/api/inbox/attachments?path=';

export function attachmentUrl(path) {
  return `${PREFIX}${encodeURIComponent(path)}`;
}

export function attachmentPath(url) {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) return null;
  try {
    const path = decodeURIComponent(url.slice(PREFIX.length));
    return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/i.test(path) ? path : null;
  } catch { return null; }
}

export async function signInboxAttachment(admin, path, seconds = 300) {
  const { data, error } = await admin.storage.from(INBOX_ATTACHMENT_BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error('No se pudo obtener el adjunto.');
  return data.signedUrl;
}
