import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { legacyMediaPath, legacyMediaUrl, signLegacyMedia } from '../../src/lib/inbox-legacy-media.js';
import { isInboxOperator, INBOX_SIGNERS } from '../../src/lib/inbox-access.js';
const conversation='11111111-1111-4111-8111-111111111111';
const filename='22222222-2222-4222-8222-222222222222.pdf';
for(const file of [filename,'1793984999250.jpeg'])assert.equal(legacyMediaPath(legacyMediaUrl(`${conversation}/${file}`)),`${conversation}/${file}`);
for(const bad of ['../secret',`${conversation}/../secret`,`${conversation}/a.pdf`,`${conversation}/${filename}?token=x`,`${conversation}/%2e%2e.pdf`]){
 assert.throws(()=>legacyMediaUrl(bad));
 assert.equal(legacyMediaPath('/api/inbox/upload?path='+encodeURIComponent(bad)),null);
}
assert.equal(legacyMediaPath('/api/inbox/upload?path=%zz'),null);
const text=await readFile(new URL('../../src/app/api/inbox/upload/route.js',import.meta.url),'utf8');
const source=text.replace(/^import .*;\r?\n/gm,'').replace(/export async function /g,'async function ');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const signer=[...INBOX_SIGNERS][0],driver='33333333-3333-4333-8333-333333333333';
let signed=0,uploads=0;
const admin=()=>({storage:{from(bucket){assert.equal(bucket,'inbox-media');return{createSignedUrl:async(path,seconds)=>{signed++;assert.equal(path,`${conversation}/${filename}`);assert.equal(seconds,300);return{data:{signedUrl:'https://storage.test/temporary'}};},upload:async()=>{uploads++;return{};}};}}});
function client({user=signer,profile={id:user,role:'admin',is_active:true},conv=true,assigned=null}={}){
 return{auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from(table){let key;return{select(){return this;},eq(k,v){if(k==='id')key=v;return this;},single:async()=>({data:profile}),maybeSingle:async()=>({data:table==='inbox_conversations'?(conv?{id:key}:null):assigned?{id:key,assigned_driver_id:assigned}:null})};}};
}
async function route(c){return new AsyncFunction('NextResponse','createAuthClient','createClient','isInboxOperator','legacyMediaPath','legacyMediaUrl','signLegacyMedia','randomUUID','validateInboxFile','INBOX_FILE_TYPES','process',source+'\nreturn {GET,POST};')(
 {json:(body,options)=>Response.json(body,options),redirect:(url,options)=>new Response(null,{...options,headers:{...options.headers,Location:url}})},async()=>c,admin,isInboxOperator,legacyMediaPath,legacyMediaUrl,signLegacyMedia,()=>filename.slice(0,-4),()=>null,new Map([['application/pdf','pdf']]),{env:{}}
);}
const url='https://local.test'+legacyMediaUrl(`${conversation}/${filename}`);
for(const [options,status]of [[{user:null},401],[{profile:{id:signer,role:'admin',is_active:false}},403],[{user:driver,profile:{id:driver,role:'driver',is_active:true},conv:false},404],[{user:driver,profile:{id:driver,role:'driver',is_active:true},conv:false,assigned:signer},404],[{user:driver,profile:{id:driver,role:'admin',is_active:true},conv:true},404]]){
 const before=signed;assert.equal((await(await route(client(options))).GET(new Request(url))).status,status);assert.equal(signed,before);
}
for(const options of [{},{user:driver,profile:{id:driver,role:'driver',is_active:true},conv:false,assigned:driver},{user:driver,profile:{id:driver,role:'admin',is_active:true},conv:false,assigned:signer}]){
 const response=await(await route(client(options))).GET(new Request(url));assert.equal(response.status,307);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('location'),'https://storage.test/temporary');
}
const form=new FormData();form.append('conversation_id',conversation);form.append('file',new File(['fixture'],'test.pdf',{type:'application/pdf'}));
const uploaded=await(await route(client())).POST(new Request('https://local.test/api/inbox/upload',{method:'POST',body:form}));assert.equal(uploaded.status,200);assert.equal((await uploaded.json()).url,legacyMediaUrl(`${conversation}/${filename}`));assert.equal(uploads,1);
console.log('PASS protected legacy paths, signer/admin/assigned-driver access, denied actors without storage calls, temporary redirects and compatible uploads.');

// Execute the actual send handler with simulated Graph/storage integrations.
const sendText=(await readFile(new URL('../../src/app/api/inbox/send/route.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export async function /g,'async function ');
let sent=0;
const sendAdmin=()=>({storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://storage.test/meta-temporary'}})})},from(table){const query={select(){return this;},eq(){return this;},insert(){return this;},update(){return this;},single:async()=>({data:table==='inbox_conversations'?{id:conversation,distributor_id:signer,inbox_channels:{platform:'whatsapp',platform_account_id:'fake-number',access_token:'fixture'},inbox_contacts:{platform_user_id:'fake-recipient'}}:table==='profiles'?{role:'admin'}:{id:'fixture-message'}})};return query;}});
const send=await new AsyncFunction('NextResponse','createAuthClient','createClient','checkInboxSession','attachmentPath','signInboxAttachment','legacyMediaPath','signLegacyMedia','fetch','process','console',sendText+'\nreturn POST;')(
 {json:(body,options)=>Response.json(body,options)},async()=>({}),sendAdmin,async()=>({user:{id:signer}}),()=>null,()=>{throw Error('Wrong bucket');},legacyMediaPath,signLegacyMedia,
 async(url,options)=>{sent++;assert.equal(JSON.parse(options.body).document.link,'https://storage.test/meta-temporary');return{json:async()=>({messages:[{id:'fixture-meta-message'}]})};},{env:{}},{log(){},error(){}}
);
const sendRequest=path=>new Request('https://local.test/api/inbox/send',{method:'POST',body:JSON.stringify({conversation_id:conversation,content:legacyMediaUrl(path),media_url:legacyMediaUrl(path),content_type:'document'})});
assert.equal((await send(sendRequest(`${conversation}/${filename}`))).status,200);assert.equal(sent,1);
assert.equal((await send(sendRequest(`33333333-3333-4333-8333-333333333333/${filename}`))).status,400);assert.equal(sent,1);
console.log('PASS actual send handler gives Meta a temporary signed URL and rejects another conversation before sending.');

const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec(`CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);CREATE TABLE storage.objects(bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;CREATE ROLE authenticated;CREATE POLICY "Allow authenticated select inbox" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='inbox-media');CREATE TABLE public.inbox_messages(id integer PRIMARY KEY,conversation_id uuid,media_url text,content text);INSERT INTO storage.buckets VALUES('inbox-media',true),('other',true);`);
 const prefix='https://kjctnobogzpjxpwzmkwm.supabase.co/storage/v1/object/public/inbox-media/';
 await db.query('insert into storage.objects values($1,$2)',['inbox-media',`${conversation}/1793984999250.jpeg`]);
 await db.query('insert into inbox_messages values(1,$1,$2,$2)',[conversation,prefix+`${conversation}/1793984999250.jpeg`]);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261120063437_private_legacy_inbox_media.sql',import.meta.url),'utf8'));
 const row=(await db.query('select * from inbox_messages')).rows[0];assert.equal(row.media_url,legacyMediaUrl(`${conversation}/1793984999250.jpeg`));assert.equal(row.content,row.media_url);
 assert.equal((await db.query("select public from storage.buckets where id='inbox-media'")).rows[0].public,false);
 assert.equal((await db.query("select public from storage.buckets where id='other'")).rows[0].public,true);
 assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage'")).rows[0].n,0);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261120063437_private_legacy_inbox_media.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select * from inbox_messages')).rows[0].media_url,row.media_url);
 console.log('PASS SQL migration keeps objects intact, rewrites references, closes only legacy bucket and broad policy, and is repeat-safe.');
}finally{await db.close();}
