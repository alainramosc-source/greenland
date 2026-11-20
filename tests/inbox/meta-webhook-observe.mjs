import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { verifyMetaSignature } from '../../src/lib/meta-webhook-signature.js';

const source = await readFile(new URL('../../src/app/api/inbox/webhook/route.js', import.meta.url), 'utf8');
const start = source.indexOf('export async function POST(request)');
const end = source.indexOf('// WHATSAPP HANDLER', start);
const postSource = source.slice(start, end).replace('export async function', 'async function');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const secret = 'isolated-test-secret';
let handled = [];
let logs = [];
const env = { META_APP_SECRET: secret };
const post = await new AsyncFunction('NextResponse', 'verifyMetaSignature', 'process', 'console',
  'handleWhatsApp', 'handleMessenger', 'handleInstagram',
  postSource + '\nreturn POST;')(
  { json: (body, options) => Response.json(body, options) }, verifyMetaSignature,
  { env }, { info: (...args) => logs.push(args.join(' ')), log() {}, error() {} },
  async () => handled.push('whatsapp_business_account'), async () => handled.push('page'), async () => handled.push('instagram')
);
for (const platform of ['whatsapp_business_account', 'page', 'instagram']) {
  const raw = Buffer.from(JSON.stringify({ object: platform, entry: [], test: 'á 🌱' }));
  const sig = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  assert(verifyMetaSignature(raw, sig, [secret]));
  for (const header of [sig, undefined, 'sha256=' + '0'.repeat(64)]) {
    const response = await post(new Request('https://local.test', {
      method: 'POST', body: raw, headers: header ? { 'x-hub-signature-256': header } : {},
    }));
    assert.equal(response.status, 200);
    assert.equal(handled.at(-1), platform);
    assert(logs.at(-1).includes(header === sig ? '"valid"' : '"invalid"'));
    assert(!logs.at(-1).includes(secret));
    assert(!logs.at(-1).includes(sig));
    assert(!logs.at(-1).includes('entry'));
  }
  assert(!verifyMetaSignature(Buffer.concat([raw, Buffer.from(' ')]), sig, [secret]));
}
env.META_APP_SECRET = undefined;
assert.equal((await post(new Request('https://local.test', { method: 'POST', body: '{"object":"page"}' }))).status, 200);
assert(logs.at(-1).includes('unconfigured'));
assert.equal(handled.length, 10);
assert(!source.includes('JSON.stringify(acceptedTokens)'));
assert(!source.includes('JSON.stringify(token)'));
console.log('PASS: raw-byte signatures, all 3 platform handlers, observation compatibility, missing configuration and secret-free logs.');
