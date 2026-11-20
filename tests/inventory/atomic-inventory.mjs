import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInventoryOperation, inventoryTransferItems } from '../../src/lib/inventory-operations.js';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [admin,warehouseAdmin,accountant,viewer,pro,whA,whB,p1,p2] = [1,2,3,4,5,10,11,20,21].map(id);
const rows = async(q,v=[]) => (await db.query(q,v)).rows;
let passes=0;
const pass=name=>{passes++;console.log('PASS '+name);};
try {
  await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT SELECT ON public.profiles,public.products,public.warehouses TO authenticated,service_role;
    GRANT ALL ON public.warehouse_stock,public.inventory_count_sessions,public.inventory_count_lines,public.inventory_adjustments,public.audit_log,public.inventory_logs TO authenticated,service_role;
    ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
    CREATE POLICY old_stock_read ON public.warehouse_stock FOR SELECT USING(true);
    CREATE POLICY old_stock_admin ON public.warehouse_stock FOR ALL USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    CREATE POLICY audit_insert ON public.audit_log FOR INSERT TO authenticated WITH CHECK(true);
    CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated USING(true);
    ALTER TABLE public.inventory_count_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;`);
  await db.exec(await readFile(new URL('./before.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261120030335_inventory_atomic_operations.sql',import.meta.url),'utf8'));
  for(const uid of [admin,warehouseAdmin,accountant,viewer,pro]) await rows('insert into auth.users(id) values($1)',[uid]);
  await rows(`insert into public.profiles(id,role,sub_role,is_active,assigned_warehouse_id) values
    ($1,'admin','super_admin',true,null),($2,'admin','warehouse_admin',true,null),($3,'admin','accountant',true,null),($4,'admin','viewer',true,null),($5,'distributor','distributor_pro',true,null)`,[admin,warehouseAdmin,accountant,viewer,pro]);
  await rows('insert into public.warehouses(id,name,code) values($1,$3,$4),($2,$5,$6)',[whA,whB,'Test A','test-a','Test B','test-b']);
  await rows('update public.profiles set assigned_warehouse_id=$1 where id=$2',[whA,pro]);
  await rows('insert into public.products(id,name,sku) values($1,$3,$4),($2,$5,$6)',[p1,p2,'Ficticio 1','TEST-1','Ficticio 2','TEST-2']);
  await rows('insert into public.warehouse_stock(product_id,warehouse_id,stock_quantity,reserved_quantity) values($1,$3,10,2),($1,$4,5,0),($2,$3,20,0),($2,$4,5,0)',[p1,p2,whA,whB]);
  const actor=async uid=>{await db.exec('RESET ROLE');await rows("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);await db.exec('SET ROLE '+(uid?'authenticated':'anon'));};
  const owner=()=>db.exec('RESET ROLE');
  const op=async(n,kind,payload)=>(await rows('select public.apply_inventory_operation($1,$2,$3::jsonb) as r',[id(n),kind,JSON.stringify(payload)]))[0].r;
  const snapshot=async()=>{await owner();return (await rows(`select jsonb_build_object(
    'stock',(select jsonb_agg(s order by s.id) from public.warehouse_stock s),
    'products',(select jsonb_agg(s order by s.id) from public.products s),
    'receptions',(select jsonb_agg(s order by s.id) from public.container_receptions s),
    'lines',(select jsonb_agg(s order by s.id) from public.container_reception_items s),
    'audit',(select jsonb_agg(s order by s.id) from public.audit_log s),
    'logs',(select jsonb_agg(s order by s.id) from public.inventory_logs s),
    'requests',(select jsonb_agg(s order by s.id) from public.inventory_operation_requests s)) as state`))[0].state;};
  const transfer={from_warehouse_id:whA,to_warehouse_id:whB,items:[{product_id:p1,quantity:3,credit:100.01},{product_id:p2,quantity:4,credit:200}]};
  await actor(null);
  await assert.rejects(rows('select public.adjust_warehouse_stock($1,$2,2)',[p1,whA]),/permission denied/);
  await assert.rejects(op(100,'transfer',transfer),/permission denied/);
  for(const who of [accountant,viewer]) {
    await actor(who);assert.equal((await op(100,'transfer',transfer)).success,false);
    await assert.rejects(rows('select public.adjust_warehouse_stock($1,$2,2)',[p1,whA]),/permiso/);
    assert.equal((await rows('update public.warehouse_stock set stock_quantity=1 where product_id=$1 returning id',[p1])).length,0);
    await assert.rejects(db.exec('TRUNCATE public.inventory_adjustments'),/permission denied/);
  }
  pass('anon and read-only accounting/viewer cannot adjust, transfer, bypass RLS or truncate audit records');
  await actor(admin);
  const adjust={reason:'test-only',items:[{product_id:p1,warehouse_id:whA,type:'ADD',quantity:2}]};
  assert.equal((await op(101,'adjust',adjust)).success,true);
  assert.equal((await op(101,'adjust',adjust)).replayed,true);
  assert.equal((await op(101,'adjust',{...adjust,reason:'changed'})).success,false);
  const reservedFailure=await op(102,'adjust',{items:[{product_id:p1,warehouse_id:whA,type:'SET',quantity:1,expected_stock:12}]});
  assert.equal(reservedFailure.success,false);
  assert.equal((await op(103,'adjust',{items:[{product_id:p1,warehouse_id:whA,type:'SET',quantity:13,expected_stock:10}]})).success,false);
  pass('adjustments are atomic, idempotent, reject stale SET/CSV bases and protect reserved stock');
  await actor(warehouseAdmin);
  assert.equal((await op(120,'adjust',{items:[{product_id:p1,warehouse_id:whB,type:'ADD',quantity:1}]})).success,true);
  await rows('select public.adjust_warehouse_stock($1,$2,1)',[p1,whB]);
  await owner();await rows('update public.profiles set is_active=false where id=$1',[warehouseAdmin]);
  await actor(warehouseAdmin);assert.equal((await op(121,'adjust',adjust)).success,false);
  await owner();await rows('update public.profiles set is_active=true where id=$1',[warehouseAdmin]);
  pass('active warehouse managers keep both new and compatible old adjustment flows; inactive profiles are rejected');
  const state=await snapshot();await actor(admin);
  const bad={...transfer,items:[transfer.items[0],{product_id:p2,quantity:999,credit:200}]};
  assert.equal((await op(104,'transfer',bad)).success,false);
  assert.deepEqual(await snapshot(),state);
  await actor(admin);const applied=await op(105,'transfer',transfer);assert.equal(applied.success,true);assert.equal(applied.credits.length,2);
  const after=await snapshot();await actor(admin);assert.equal((await op(105,'transfer',transfer)).replayed,true);assert.deepEqual(await snapshot(),after);
  assert.equal(Number((await rows('select sum(charge_amount) as total from public.container_receptions'))[0].total),-300.01);
  assert.equal((await rows('select count(*)::int n from public.container_reception_items'))[0].n,2);
  pass('whole transfer and exact PRO credits commit once; failure on a later SKU rolls everything back');
  await db.exec(`CREATE FUNCTION public.inject_inventory_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF current_setting('test.fail_stage',true)=TG_ARGV[0] THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_credit BEFORE INSERT ON public.container_receptions FOR EACH ROW EXECUTE FUNCTION public.inject_inventory_failure('credit');
    CREATE TRIGGER fail_credit_line BEFORE INSERT ON public.container_reception_items FOR EACH ROW EXECUTE FUNCTION public.inject_inventory_failure('credit_line');
    CREATE TRIGGER fail_log BEFORE INSERT ON public.inventory_logs FOR EACH ROW EXECUTE FUNCTION public.inject_inventory_failure('log');`);
  for(const [n,stage] of [[106,'credit'],[107,'credit_line'],[108,'log']]){
    const before=await snapshot();await rows("select set_config('test.fail_stage',$1,false)",[stage]);await actor(admin);
    assert.equal((await op(n,'transfer',{...transfer,items:[{product_id:p2,quantity:1,credit:10}]})).success,false);
    await owner();await rows("select set_config('test.fail_stage','',false)");assert.deepEqual(await snapshot(),before);
  }
  pass('injected log, credit-header and credit-line failures leave no partial stock or financial effects');
  await actor(pro);
  assert.equal((await op(109,'transfer',{...transfer,items:[{product_id:p2,quantity:1,credit:0}]})).success,true);
  assert.equal((await op(110,'transfer',{...transfer,items:[{product_id:p2,quantity:1,credit:1}]})).success,false);
  assert.equal((await op(111,'transfer',{from_warehouse_id:whB,to_warehouse_id:whA,items:[{product_id:p2,quantity:1}]})).success,false);
  await assert.rejects(rows('select public.adjust_warehouse_stock($1,$2,1)',[p2,whA]),/permiso/);
  await owner();await db.exec(`CREATE FUNCTION public.test_trusted_internal(p uuid,w uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.adjust_warehouse_stock(p,w,1,'trusted-internal',null); END $$; GRANT EXECUTE ON FUNCTION public.test_trusted_internal(uuid,uuid) TO authenticated;`);
  await actor(pro);await rows('select public.test_trusted_internal($1,$2)',[p2,whA]);
  await owner();await rows("select set_config('request.jwt.claim.sub','',false)");await db.exec('SET ROLE service_role');
  await rows('select public.adjust_warehouse_stock($1,$2,1,$3,$4)',[p2,whA,'service fixture',admin]);
  pass('PRO can transfer own stock without self-credit; trusted legacy internal callers still work');

  const create=async freeze=>(await rows('select public.create_count_session($1,$2,$3,$4,$5) as r',[whB,'full',admin,'test-only',freeze]))[0].r;
  const advance=async(s,a)=>(await rows('select public.advance_count_session($1,$2) as r',[s,a]))[0].r;
  let saveId=1000;
  const save=async(s,line,qty,recapture=true,request=id(saveId++))=>(await rows('select public.save_inventory_count_lines($1,$2,$3::jsonb) as r',[request,s,JSON.stringify([{id:line,qty_counted:qty,reason:'test-only',recapture}])]))[0].r;
  await actor(admin);const count=await create(false);assert.equal(count.success,true);
  const allLines=await rows('select id from public.inventory_count_lines where session_id=$1 order by product_id',[count.session_id]);
  const invalidSave=(await rows('select public.save_inventory_count_lines($1,$2,$3::jsonb) as r',[id(999),count.session_id,JSON.stringify([{id:allLines[0].id,qty_counted:1,recapture:true},{id:allLines[1].id,qty_counted:-1,recapture:true}])]))[0].r;
  assert.equal(invalidSave.success,false);
  assert.equal((await rows('select count(*)::int n from public.inventory_count_lines where session_id=$1 and qty_counted is not null',[count.session_id]))[0].n,0);
  pass('invalid later count line rolls back all saves; no false partial success');
  const countLine=(await rows('select * from public.inventory_count_lines where session_id=$1 and product_id=$2',[count.session_id,p2]))[0];
  const current=(await rows('select stock_quantity from public.warehouse_stock where warehouse_id=$1 and product_id=$2',[whB,p2]))[0].stock_quantity;
  assert.equal((await save(count.session_id,countLine.id,current+2)).success,true);
  assert.equal((await advance(count.session_id,'submit')).success,true);assert.equal((await advance(count.session_id,'approve')).success,true);
  await assert.rejects(rows('update public.inventory_count_lines set qty_counted=999 where id=$1',[countLine.id]),/cerrado/);
  const countState=await snapshot();await rows("select set_config('test.fail_stage','log',false)");await actor(admin);
  assert.equal((await advance(count.session_id,'post')).success,false);
  await owner();await rows("select set_config('test.fail_stage','',false)");assert.deepEqual(await snapshot(),countState);
  assert.equal((await rows('select status from public.inventory_count_sessions where id=$1',[count.session_id]))[0].status,'approved');
  assert.equal((await rows('select count(*)::int n from public.inventory_adjustments where session_id=$1',[count.session_id]))[0].n,0);
  await actor(admin);assert.equal((await advance(count.session_id,'post')).success,true);assert.equal((await advance(count.session_id,'post')).replayed,true);
  await owner();
  assert.equal((await rows('select count(*)::int n from public.inventory_adjustments where session_id=$1',[count.session_id]))[0].n,1);
  assert.equal((await rows('select p.stock_quantity=(select sum(s.stock_quantity) from public.warehouse_stock s where s.product_id=p.id) as matches from public.products p where p.id=$1',[p2]))[0].matches,true);
  pass('count applies each difference once; global total equals warehouses; approved and posted lines are protected');
  await actor(admin);const drifting=await create(false);
  const driftLine=(await rows('select * from public.inventory_count_lines where session_id=$1 and product_id=$2',[drifting.session_id,p2]))[0];
  const stock=(await rows('select stock_quantity from public.warehouse_stock where warehouse_id=$1 and product_id=$2',[whB,p2]))[0].stock_quantity;
  await save(drifting.session_id,driftLine.id,stock+1,true,id(130));await advance(drifting.session_id,'submit');await advance(drifting.session_id,'approve');
  await op(112,'adjust',{items:[{product_id:p2,warehouse_id:whB,type:'ADD',quantity:1}]});
  assert.equal((await save(drifting.session_id,driftLine.id,stock+1,true,id(130))).replayed,true);
  assert.equal((await advance(drifting.session_id,'post')).success,false);
  assert.equal((await advance(drifting.session_id,'reopen')).success,true);
  assert.equal((await save(drifting.session_id,driftLine.id,stock+2)).success,true);
  await advance(drifting.session_id,'submit');await advance(drifting.session_id,'approve');assert.equal((await advance(drifting.session_id,'post')).success,true);
  pass('movements after capture reject stale count; reopen and physical recapture restore a valid workflow');
  await actor(admin);const frozen=await create(true);assert.equal(frozen.success,true);
  assert.equal((await op(113,'adjust',{items:[{product_id:p2,warehouse_id:whB,type:'ADD',quantity:1}]})).success,false);
  const frozenLine=(await rows('select * from public.inventory_count_lines where session_id=$1 and product_id=$2',[frozen.session_id,p2]))[0];
  const frozenStock=(await rows('select stock_quantity from public.warehouse_stock where warehouse_id=$1 and product_id=$2',[whB,p2]))[0].stock_quantity;
  await save(frozen.session_id,frozenLine.id,frozenStock+1);await advance(frozen.session_id,'submit');await advance(frozen.session_id,'approve');
  assert.equal((await advance(frozen.session_id,'post')).success,true);
  assert.equal((await op(114,'adjust',{items:[{product_id:p2,warehouse_id:whB,type:'ADD',quantity:1}]})).success,true);
  pass('explicit freeze stops inventory movement and allows its own count posting; normal operations resume afterward');
  const removable=await create(true);assert.equal((await advance(removable.session_id,'unfreeze')).success,true);
  assert.equal((await op(122,'adjust',{items:[{product_id:p2,warehouse_id:whB,type:'ADD',quantity:1}]})).success,true);
  const generated=await Promise.all([create(false),create(false)]);
  assert.notEqual(generated[0].session_code,generated[1].session_code);
  pass('operators can explicitly release a freeze; normal repeated creation produces unique count codes');
  await actor(accountant);assert.equal((await advance(frozen.session_id,'post')).success,false);
  await owner();
  assert.equal((await rows("select count(*)::int n from public.products p where p.stock_quantity is distinct from (select coalesce(sum(stock_quantity),0) from public.warehouse_stock s where s.product_id=p.id)"))[0].n,0);
  pass('read-only roles cannot apply counts; final totals stay consistent across all tested operations');
} finally { await db.close(); }

const storageMap=new Map();const storage={getItem:k=>storageMap.get(k)||null,setItem:(k,v)=>storageMap.set(k,v),removeItem:k=>storageMap.delete(k)};
let sent=[];let first=true;
const client={rpc:async(name,args)=>{sent.push(args);if(first){first=false;return {error:{message:'lost response'}};}return {data:{success:true}};}};
const body={items:[{product_id:p1,warehouse_id:whA,type:'ADD',quantity:2}]};
await assert.rejects(runInventoryOperation(client,'adjust',body,storage),/lost/);
await runInventoryOperation(client,'adjust',body,storage);
assert.equal(sent[0].p_request_id,sent[1].p_request_id);
await runInventoryOperation(client,'adjust',body,storage);assert.notEqual(sent[1].p_request_id,sent[2].p_request_id);
assert.throws(()=>inventoryTransferItems([{sku:'TEST',qty:1.5}],[{id:p1,sku:'TEST'}]),/inválida/);
pass('browser retry reuses persisted request id after a lost response; new confirmed operations get a new id');
console.log(`${passes} groups passed. Only isolated fictitious data was changed.`);
