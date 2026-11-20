import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { isInboxOperator, checkInboxSession, validateInboxFile, INBOX_SIGNERS, INBOX_FILE_TYPES } from '../../src/lib/inbox-access.js';
import { attachmentPath, attachmentUrl, signInboxAttachment } from '../../src/lib/inbox-attachments.js';
import { verifyMetaSignature } from '../../src/lib/meta-webhook-signature.js';
import { legacyMediaPath, legacyMediaUrl, signLegacyMedia } from '../../src/lib/inbox-legacy-media.js';

const [alain, didier] = [...INBOX_SIGNERS];
let passes = 0;
const pass = name => { passes++; console.log(`PASS ${name}`); };
const profile = { id: alain, role: 'admin', is_active: true };
function client(p = profile, user = { id: alain }) {
  return { auth: { getUser: async () => ({ data: { user } }) }, from: () => ({
    select() { return this; }, eq() { return this; }, single: async () => ({ data: p }),
  }) };
}
assert(isInboxOperator(profile));
assert(isInboxOperator({ ...profile, id: didier }));
for (const p of [{ ...profile, id: 'other-superadmin' }, { ...profile, is_active: false },
  { ...profile, is_active: null }, { ...profile, role: 'distributor' }, null]) assert(!isInboxOperator(p));
assert.equal((await checkInboxSession(client())).status, undefined);
assert.equal((await checkInboxSession(client(profile, null))).status, 401);
assert.equal((await checkInboxSession(client(null))).status, 403);
pass('existing session authorizes only active signers; no password or PIN flow');

assert.equal(validateInboxFile(new File(['pdf'], 'document.pdf', { type: 'application/pdf' })), null);
assert(validateInboxFile(new File(['<script>'], 'document.html', { type: 'text/html' })));
assert(validateInboxFile({ size: 15728641, type: 'image/jpeg', arrayBuffer() {} }));
assert(validateInboxFile(new File([], 'empty.pdf', { type: 'application/pdf' })));
const path = `${alain}/${didier}.pdf`;
assert.equal(attachmentPath(attachmentUrl(path)), path);
for (const bad of ['../../secret', `${alain}/../secret`, 'https://evil.test/x']) assert.equal(attachmentPath(attachmentUrl(bad)), null);
assert.equal(await signInboxAttachment({ storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'temporary-url' } }) }) } }, path), 'temporary-url');
pass('attachment limits, private reference parsing and temporary signing');

const body = Buffer.from('{"object":"page"}');
const signature = `sha256=${createHmac('sha256', 'test-only-secret').update(body).digest('hex')}`;
assert(verifyMetaSignature(body, signature, ['test-only-secret']));
for (const header of [null, 'sha256=00', 'sha256=' + '0'.repeat(64)]) assert(!verifyMetaSignature(body, header, ['test-only-secret']));
assert(!verifyMetaSignature(Buffer.from('{}'), signature, ['test-only-secret']));
assert(!verifyMetaSignature(body, signature, []));
pass('separate Meta patch validates raw bytes and rejects altered/missing signatures');

// Execute actual route exports with stubbed external integrations. Denied
// callers must not read conversations, invoke Gemini, send Meta or write data.
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const NextResponse = { json: (data, options = {}) => Response.json(data, options) };
async function route(name, authClient, extra = {}) {
  let source = await readFile(new URL(`../../src/app/api/inbox/${name}/route.js`, import.meta.url), 'utf8');
  source = source.replace(/^import .*;\r?\n/gm, '').replace(/export const /g, 'const ').replace(/export async function /g, 'async function ');
  return new AsyncFunction('NextResponse', 'createAuthClient', 'checkInboxSession', 'createClient', 'GoogleGenerativeAI', 'GREENLAND_KNOWLEDGE',
    'isInboxOperator', 'validateInboxFile', 'INBOX_FILE_TYPES', 'randomUUID', 'legacyMediaPath', 'legacyMediaUrl', 'signLegacyMedia',
    source + '\nreturn { GET: typeof GET === "function" ? GET : null, POST: typeof POST === "function" ? POST : null };')(
    NextResponse, async () => authClient, checkInboxSession,
    extra.admin || (() => { throw new Error('Unexpected privileged integration call'); }),
    () => { throw new Error('Unexpected AI call'); }, '', isInboxOperator, validateInboxFile, INBOX_FILE_TYPES, () => didier, legacyMediaPath, legacyMediaUrl, signLegacyMedia);
}
for (const c of [client(profile, null), client({ ...profile, id: 'other' })]) {
  const routes = await route('insights', c);
  assert([401,403].includes((await routes.GET(new Request('https://local.test/api/inbox/insights'))).status));
}
assert.equal((await (await route('chatbot', client())).POST()).status, 410);
pass('real Insights rejects unauthorized requests before privileged effects; retired bot returns 410');

for (const name of ['channels','media','send','send-bulk']) {
  for (const [c, status] of [[client(profile, null),401],[client({ ...profile, id: 'other' }),403]]) {
    const handlers = await route(name,c);
    const handler = handlers.POST || handlers.GET;
    assert.equal((await handler(new Request(`https://local.test/api/inbox/${name}`))).status,status);
  }
}
const allowedInsights = await route('insights',client(), { admin: () => ({ from: () => ({ select() {return this;}, order() {return this;},
  limit: async () => ({ data: [{ conversation_id: alain, direction: 'inbound', content: 'Necesito veinte mesas', content_type: 'text' }] }),
}) }) });
const insightsResponse = await allowedInsights.GET(new Request('https://local.test/api/inbox/insights?ai=false'));
assert.equal(insightsResponse.status,200);
assert.equal((await insightsResponse.json()).total_messages,1);
assert.equal(insightsResponse.headers.get('cache-control'),'private, no-store');
pass('actual protected routes deny outsiders; signer Insights still returns authorized data');

const driver = { id: didier, role: 'driver', is_active: true };
function uploadClient(p, assigned) {
  return { auth: { getUser: async () => ({ data: { user: {id:p.id} } }) }, from: table => ({
    select() {return this;}, eq() {return this;}, single: async () => ({ data:p }),
    maybeSingle: async () => ({ data: table==='lastmile_orders' && assigned ? {id:alain,assigned_driver_id:assigned} : null }),
  }) };
}
let uploads = 0;
const uploadAdmin = () => ({ storage: { from: () => ({ upload: async () => {uploads++;return {error:null};},
  getPublicUrl: () => ({data:{publicUrl:'https://example.test/evidence.pdf'}}),
}) } });
const uploadRequest = () => {
  const form = new FormData(); form.set('file',new File(['pdf'],'evidence.pdf',{type:'application/pdf'})); form.set('conversation_id',alain);
  return new Request('https://local.test/api/inbox/upload',{method:'POST',body:form});
};
assert.equal((await (await route('upload',uploadClient(driver,null),{admin:uploadAdmin})).POST(uploadRequest())).status,403);
assert.equal(uploads,0);
assert.equal((await (await route('upload',uploadClient(driver,didier),{admin:uploadAdmin})).POST(uploadRequest())).status,200);
assert.equal(uploads,1);
pass('shared evidence upload blocks unrelated driver and preserves assigned driver workflow');

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.profiles(id uuid primary key,role text,is_active boolean);
    CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated update inbox" ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='inbox-media');
    CREATE TABLE public.inbox_channels(id uuid,distributor_id uuid,platform text,platform_account_id text,display_name text,
      access_token text,is_active boolean,connected_at timestamptz,metadata jsonb);
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
  const tables = ['inbox_channels','inbox_contacts','inbox_conversations','inbox_messages','inbox_funnels','inbox_templates','inbox_tags','inbox_contact_tags'];
  for (const t of tables) {
    if (t !== 'inbox_channels') await db.exec(`CREATE TABLE public.${t}(id uuid,distributor_id uuid,contact_id uuid,conversation_id uuid);`);
    await db.exec(`GRANT ALL ON public.${t} TO authenticated,anon,service_role; ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy ON public.${t} FOR ALL USING(true);`);
  }
  await db.query('insert into public.profiles values ($1,$2,true),($3,$2,true),($4,$2,true)', [alain,'admin',didier,'e57ed395-4b32-4711-9bee-bfdc33f2e61f']);
  await db.query('insert into public.inbox_channels(id,access_token) values ($1,$2)', [alain,'fake-secret']);
  await db.query('insert into public.inbox_messages(id) values ($1)', [alain]);
  const migration = await readFile(new URL('../../supabase/migrations/20261118231046_inbox_operator_permissions.sql',import.meta.url),'utf8');
  await db.exec(migration);
  await db.exec('SET ROLE authenticated');
  for (const id of [alain,didier]) {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    assert.equal((await db.query('select id from public.inbox_channels')).rows.length,1);
    assert.equal((await db.query('select id from public.inbox_messages')).rows.length,1);
    await db.query('update public.inbox_messages set id=id');
    await assert.rejects(db.query('select access_token from public.inbox_channels'),/permission denied/);
    await assert.rejects(db.query('truncate public.inbox_messages'),/permission denied/);
    await assert.rejects(db.query('update public.inbox_channels set access_token=$1',['bad']),/permission denied/);
  }
  pass('exact SQL permits both signers but denies credentials, channel writes and TRUNCATE');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",['e57ed395-4b32-4711-9bee-bfdc33f2e61f']);
  assert.equal((await db.query('select id from public.inbox_messages')).rows.length,0);
  await assert.rejects(db.query('insert into public.inbox_messages(id) values ($1)',[alain]),/row-level security/);
  await db.exec('RESET ROLE');
  await db.query('update public.profiles set is_active=false where id=$1',[alain]);
  await db.exec('SET ROLE authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alain]);
  assert.equal((await db.query('select id from public.inbox_messages')).rows.length,0);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('select id from public.inbox_messages'),/permission denied/);
  await db.exec('RESET ROLE; SET ROLE service_role');
  assert.equal((await db.query('select access_token from public.inbox_channels')).rows.length,1);
  await db.exec('RESET ROLE');
  assert.equal((await db.query("select public from storage.buckets where id='inbox-attachments'")).rows[0].public,false);
  await db.exec(migration); // repeat-safe in isolation
  pass('non-members, inactive signers and anon blocked; Meta service role preserved; migration repeat-safe');
  // Restore captured production policies against the structural fixture.
  for (const t of tables) await db.exec(`DROP POLICY IF EXISTS legacy ON public.${t}`);
  await db.exec(await readFile(new URL('./rollback-permissions.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='public' and policyname='inbox_signers'")).rows[0].n,0);
  pass('compatibility rollback executes without deleting messages or uploaded files');
} finally { await db.close(); }
console.log(`${passes} test groups passed; no production calls.`);
