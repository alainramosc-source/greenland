// Explicit membership: never infer authorization from a person's editable name.
export const INBOX_SIGNERS = new Set([
  'c5055cdc-db7a-469d-8c6b-78b44051941b',
  '94f1d56b-65a1-41d8-b808-62ece888c017',
]);

export function isInboxOperator(profile) {
  return Boolean(profile && profile.role === 'admin' && profile.is_active === true
    && INBOX_SIGNERS.has(profile.id));
}

export async function checkInboxSession(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { status: 401, error: 'No autenticado.' };
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id, role, is_active, full_name').eq('id', user.id).single();
  if (profileError || !isInboxOperator(profile)) {
    return { status: 403, error: 'Sin permiso para operar el Inbox.' };
  }
  return { user, profile };
}

export const MAX_INBOX_UPLOAD = 15 * 1024 * 1024;
export const INBOX_FILE_TYPES = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif'],
  ['application/pdf', 'pdf'], ['video/mp4', 'mp4'], ['video/3gpp', '3gp'],
  ['text/plain', 'txt'], ['text/csv', 'csv'], ['application/zip', 'zip'], ['application/x-zip-compressed', 'zip'],
  ['audio/mpeg', 'mp3'], ['audio/mp4', 'm4a'], ['audio/ogg', 'ogg'], ['audio/aac', 'aac'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
]);

export function validateInboxFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) return 'Archivo vacío o inválido.';
  if (file.size > MAX_INBOX_UPLOAD) return 'El archivo excede 15 MB.';
  if (!INBOX_FILE_TYPES.has(file.type)) return 'Tipo de archivo no permitido.';
  return null;
}
