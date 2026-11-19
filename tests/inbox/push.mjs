import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createECDH, randomBytes } from 'node:crypto';
import vm from 'node:vm';
import * as webpush from 'web-push';
import { validatePushSubscription } from '../../src/lib/inbox-push-validation.js';
import { dispatchInboxPush } from '../../src/lib/inbox-push-server.js';
import { checkInboxSession, INBOX_SIGNERS } from '../../src/lib/inbox-access.js';

const [alain,didier] = [...INBOX_SIGNERS];
const other = 'e57ed395-4b32-4711-9bee-bfdc33f2e61f';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const curve = createECDH('prime256v1'); curve.generateKeys();
const subscription = {endpoint:'https://fcm.googleapis.com/fcm/send/test-only',keys:{
  p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url'),
}};
let passes = 0;
const pass = name => { passes++; console.log(`PASS ${name}`); };
assert.deepEqual(validatePushSubscription(subscription),subscription);
for (const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://fcm.googleapis.com@evil.test/x','https://fcm.googleapis.com:123/x']) {
  assert.equal(validatePushSubscription({...subscription,endpoint}),null);
}
assert.equal(validatePushSubscription({...subscription,keys:{auth:'bad',p256dh:'bad'}}),null);
const vapid = webpush.generateVAPIDKeys();
const config = {...vapid,subject:'https://www.greenland-products.com.mx'};
const encrypted = webpush.generateRequestDetails(subscription,'test-only',{vapidDetails:config});
assert(encrypted.body.length>0);
assert(!encrypted.body.includes(Buffer.from('test-only')));
pass('provider allowlist blocks SSRF; real Web Push encryption and VAPID generation work offline');

// Actual API handlers, with only auth/database/network dependencies replaced.
const source = (await readFile(new URL('../../src/app/api/inbox/push/route.js',import.meta.url),'utf8'))
  .replace(/^import .*;\r?\n/gm,'').replace(/export async function /g,'async function ');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const authClient=(profile,user={id:alain})=>({auth:{getUser:async()=>({data:{user}})},from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:profile})})});
let saved;
const routes=async client=>new AsyncFunction('NextResponse','createClient','checkInboxSession','pushAdmin','pushConfiguration','validatePushSubscription',source+'\nreturn {GET,POST,DELETE};')(
  {json:(body,options)=>Response.json(body,options)},async()=>client,checkInboxSession,
  ()=>({from:()=>({upsert:async row=>{saved=row;return {};},delete:()=>({eq(){return this;},then(resolve){resolve({});}})})}),
  ()=>config,validatePushSubscription);
for(const [client,status] of [[authClient(null,null),401],[authClient({id:other,role:'admin',is_active:true}),403]]){
  const r=await routes(client);assert.equal((await r.GET()).status,status);
  assert.equal((await r.POST(new Request('https://test',{method:'POST',body:'{}'}))).status,status);
}
const r=await routes(authClient({id:alain,role:'admin',is_active:true}));
const settings=await (await r.GET()).json();assert.equal(settings.publicKey,vapid.publicKey);assert(!JSON.stringify(settings).includes(vapid.privateKey));
assert.equal((await r.POST(new Request('https://test',{method:'POST',body:JSON.stringify({...subscription,user_id:other})}))).status,200);
assert.equal(saved.user_id,alain);
assert.equal((await r.POST(new Request('https://test',{method:'POST',body:JSON.stringify({...subscription,endpoint:'https://localhost/x'})}))).status,400);
pass('subscription API requires signer session, hides private key and derives ownership on server');

const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.profiles(id uuid primary key,role text,is_active boolean);
    CREATE TABLE public.inbox_channels(id uuid primary key,platform text);
    CREATE TABLE public.inbox_conversations(id uuid primary key,channel_id uuid references public.inbox_channels(id));
    CREATE TABLE public.inbox_messages(id uuid primary key,conversation_id uuid references public.inbox_conversations(id),direction text);
    GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;`);
  await db.query('insert into public.profiles values ($1,$4,true),($2,$4,true),($3,$4,true)',[alain,didier,other,'admin']);
  await db.query('insert into public.inbox_channels values($1,$2)',[id(1),'whatsapp']);
  await db.query('insert into public.inbox_conversations values($1,$2)',[id(2),id(1)]);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261119052724_inbox_push_notifications.sql',import.meta.url),'utf8'));
  await db.query('insert into public.inbox_messages values($1,$2,$3)',[id(10),id(2),'inbound']);
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries')).rows[0].n,0);
  for(const [n,user] of [[20,alain],[21,didier],[22,other]]) await db.query('insert into public.inbox_push_subscriptions(id,user_id,endpoint,keys) values($1,$2,$3,$4)',[id(n),user,subscription.endpoint+n,subscription.keys]);
  await db.query('insert into public.inbox_messages values($1,$2,$3)',[id(11),id(2),'outbound']);
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries')).rows[0].n,0);
  await db.query('insert into public.inbox_messages values($1,$2,$3)',[id(12),id(2),'inbound']);
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries')).rows[0].n,2);
  await assert.rejects(db.query('insert into public.inbox_messages values($1,$2,$3)',[id(12),id(2),'inbound']),/duplicate/);
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries')).rows[0].n,2);
  for(const role of ['anon','authenticated']){
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query('select * from public.inbox_push_subscriptions'),/permission denied/);
    await assert.rejects(db.query('select * from public.claim_inbox_push_deliveries(20)'),/permission denied/);
    await db.exec('RESET ROLE');
  }
  pass('exact SQL queues only new inbound messages for active signers; no history, bot replies or duplicate events; RLS blocks clients');

  const claimed=(await db.query('select * from public.claim_inbox_push_deliveries(20)')).rows;
  assert.equal(claimed.length,2);
  assert.equal((await db.query('select * from public.claim_inbox_push_deliveries(20)')).rows.length,0);
  await db.query('select public.finish_inbox_push_delivery($1,false,500)',[claimed[0].delivery_id]);
  await db.query('select public.finish_inbox_push_delivery($1,true,null)',[claimed[1].delivery_id]);
  const states=(await db.query('select status,attempts from public.inbox_push_deliveries order by status')).rows;
  assert.deepEqual(states.map(x=>x.status),['pending','sent']);
  await db.exec("update public.inbox_push_deliveries set next_attempt_at=now()-interval '1 second' where status='pending'");
  assert.equal((await db.query('select * from public.claim_inbox_push_deliveries(20)')).rows.length,1);
  await db.exec("update public.inbox_push_deliveries set attempts=5,next_attempt_at=now()-interval '1 second' where status='processing'");
  assert.equal((await db.query('select * from public.claim_inbox_push_deliveries(20)')).rows.length,0);
  assert.equal((await db.query("select count(*)::int n from public.inbox_push_deliveries where status='failed'")).rows[0].n,1);
  pass('delivery lease prevents overlap, transient failures retry and retries stop after five attempts');

  await db.query('update public.profiles set is_active=false where id=$1',[alain]);
  await db.query('insert into public.inbox_messages values($1,$2,$3)',[id(13),id(2),'inbound']);
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries where message_id=$1',[id(13)])).rows[0].n,1);
  await db.query('update public.profiles set is_active=false where id=$1',[didier]);
  assert.equal((await db.query('select * from public.claim_inbox_push_deliveries(20)')).rows.length,0);
  await db.query('update public.profiles set is_active=true where id=$1',[didier]);
  await db.exec("update public.inbox_push_deliveries set created_at=now()-interval '8 days'");
  await db.query('select * from public.claim_inbox_push_deliveries(20)');
  assert.equal((await db.query('select count(*)::int n from public.inbox_push_deliveries')).rows[0].n,0);
  pass('revoked operators cannot receive queued notifications; delivery retention is bounded');

  // Force the notification enqueue to fail: the actual customer message must survive.
  await db.exec("CREATE FUNCTION fail_push_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER fail_push_test BEFORE INSERT ON public.inbox_push_deliveries FOR EACH ROW EXECUTE FUNCTION fail_push_test();");
  await db.query('insert into public.inbox_messages values($1,$2,$3)',[id(14),id(2),'inbound']);
  assert.equal((await db.query('select id from public.inbox_messages where id=$1',[id(14)])).rows.length,1);
  await db.exec('DROP TRIGGER fail_push_test ON public.inbox_push_deliveries');
  pass('notification queue failure does not roll back a real incoming message');
}finally{await db.close();}

const delivery={delivery_id:id(40),message_id:id(41),conversation_id:id(2),subscription_id:id(20),platform:'whatsapp',...subscription};
let finishes=[],deleted=[];
const admin={rpc:async(name,args)=>name==='claim_inbox_push_deliveries'?{data:[delivery]}:(finishes.push(args),{}),from:()=>({delete:()=>({eq:async(_,value)=>{deleted.push(value);return {};}})})};
let payload;
await dispatchInboxPush({admin,config,send:async(_s,p)=>{payload=JSON.parse(p);}});
assert.equal(finishes[0].p_sent,true);assert(payload.url.includes(id(2)));assert(!payload.body.includes('private customer text'));
finishes=[];
await dispatchInboxPush({admin,config,send:async()=>{throw Object.assign(new Error('temporary'),{statusCode:503});}});
assert.equal(finishes[0].p_sent,false);assert.equal(finishes[0].p_code,503);
await dispatchInboxPush({admin,config,send:async()=>{throw Object.assign(new Error('expired'),{statusCode:410});}});
assert.deepEqual(deleted,[id(20)]);
pass('actual dispatcher encrypts via configured send, records acceptance/retry and removes expired subscriptions');

// Verify notification dispatch starts concurrently and cannot hold up bot start.
const webhook=await readFile(new URL('../../src/app/api/inbox/webhook/route.js',import.meta.url),'utf8');
const handler=webhook.slice(webhook.indexOf('async function storeInboundMessage('),webhook.indexOf('async function updateMessageStatus('));
let botStarted=false,releasePush;
const pending=new Promise(resolve=>{releasePush=resolve;});
const dbClient={from:table=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null}),
  single:async()=>({data:{unread_count:0,chatbot_active:true,contact_id:null}}),insert:async()=>({}),update:()=>({eq:async()=>({})}),
})};
const makeHandler=dispatch=>new Function('getAdminClient','dispatchInboxPush','processBotMessage','console',handler+'; return storeInboundMessage;')(
  ()=>dbClient,dispatch,async()=>{botStarted=true;return {success:true};},{log(){},warn(){},error(){}});
const processing=makeHandler(()=>pending)(id(2),'test','text',null,'test-platform-id');
await new Promise(resolve=>setTimeout(resolve,10));assert(botStarted);
releasePush();await processing;
botStarted=false;await makeHandler(async()=>{throw new Error('push offline');})(id(2),'test','text',null,'test-platform-id');assert(botStarted);
pass('actual webhook starts bot without waiting for push and ignores push failure');

const events={},notifications=[],opened=[];
vm.runInNewContext(await readFile(new URL('../../public/inbox-push-sw.js',import.meta.url),'utf8'),{
  URL,self:{location:{origin:'https://example.test'},addEventListener:(event,callback)=>{events[event]=callback;},
    registration:{showNotification:async(title,options)=>{notifications.push({title,...options});}},
    clients:{matchAll:async()=>[],openWindow:async url=>{opened.push(url);}},skipWaiting(){},
  },
});
for(const n of [1,2])await new Promise(resolve=>events.push({data:{json:()=>({title:'New',url:`/dashboard/inbox?conv=${id(2)}`,tag:'inbox-'+n})},waitUntil:promise=>promise.then(resolve)}));
assert.equal(notifications.length,2);assert.notEqual(notifications[0].tag,notifications[1].tag);
await new Promise(resolve=>events.notificationclick({notification:{close(){},data:{url:`/dashboard/inbox?conv=${id(2)}`}},waitUntil:promise=>promise.then(resolve)}));
assert.equal(opened[0],`https://example.test/dashboard/inbox?conv=${id(2)}`);
pass('service worker displays each distinct message and opens its conversation');
console.log(`${passes} push test groups passed; no production messages or notifications sent.`);
