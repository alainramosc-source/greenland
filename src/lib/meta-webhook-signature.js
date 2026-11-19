import { createHmac, timingSafeEqual } from 'node:crypto';

// Must receive the original bytes, before JSON parsing. No changes to active
// webhook behavior until the separate patch is reviewed and deployed.
export function verifyMetaSignature(rawBody, header, secrets) {
  if (!/^sha256=[0-9a-f]{64}$/i.test(header || '')) return false;
  const supplied = Buffer.from(header.slice(7), 'hex');
  return secrets.filter(Boolean).some(secret => {
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
