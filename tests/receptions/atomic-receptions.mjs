import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Runtime can be supplied without installing anything in the application.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [admin, accountant, driver, pro, whA, whB, prod, supplier, poA, poB] =
  [1, 2, 3, 4, 10, 11, 20, 30, 40, 41].map(uid);
const rows = async (q, values = []) => (await db.query(q, values)).rows;
let passes = 0;
const pass = name => { passes++; console.log(`PASS ${name}`); };
try {
  await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    CREATE FUNCTION public.is_explicit_super_admin() RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()
        AND role='admin' AND sub_role='super_admin' AND is_active IS TRUE)
    $$;
    CREATE FUNCTION public.sync_product_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      UPDATE public.products SET stock_quantity=coalesce((SELECT sum(stock_quantity) FROM public.warehouse_stock
        WHERE product_id=coalesce(NEW.product_id,OLD.product_id)),0),
        reserved_quantity=coalesce((SELECT sum(reserved_quantity) FROM public.warehouse_stock
        WHERE product_id=coalesce(NEW.product_id,OLD.product_id)),0)
      WHERE id=coalesce(NEW.product_id,OLD.product_id);
      RETURN coalesce(NEW,OLD);
    END $$;
    CREATE TRIGGER trg_sync_product_stock AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_stock
      FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock();
    CREATE FUNCTION public.test_fault() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF current_setting('test.fail_stage',true)=TG_ARGV[0] THEN
        RAISE EXCEPTION 'injected failure %',TG_ARGV[0];
      END IF;
      RETURN coalesce(NEW,OLD);
    END $$;
    CREATE TRIGGER fail_cost BEFORE UPDATE OF avg_cost ON public.products FOR EACH ROW EXECUTE FUNCTION public.test_fault('cost');
    CREATE TRIGGER fail_transit BEFORE UPDATE OR DELETE ON public.transit_shipments FOR EACH ROW EXECUTE FUNCTION public.test_fault('transit');
    CREATE TRIGGER fail_freight BEFORE INSERT OR UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.test_fault('freight');
  `);
  await db.exec(await readFile(new URL('../../migrations/20261117_atomic_container_receptions.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO auth.users(id) VALUES ('${admin}'),('${accountant}'),('${driver}'),('${pro}');
    INSERT INTO public.profiles(id,role,sub_role,is_active) VALUES
      ('${admin}','admin','super_admin',true),('${accountant}','admin','accountant',true),
      ('${driver}','driver',null,true),('${pro}','distributor','distributor_pro',true);
    INSERT INTO public.warehouses(id,name,code) VALUES ('${whA}','Vito Alessio','vito'),('${whB}','Querétaro','qro');
    INSERT INTO public.products(id,name,sku,avg_cost) VALUES ('${prod}','Producto ficticio','TEST-01',500);
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,stock_quantity,reserved_quantity) VALUES
      ('${whA}','${prod}',50,4),('${whB}','${prod}',20,2);
    INSERT INTO public.suppliers(id,company_name,service_types) VALUES ('${supplier}','Transportista ficticio',ARRAY['flete']);
    INSERT INTO public.purchase_orders(id,po_number,status,supplier_id) VALUES
      ('${poA}','TEST-PO-A','sent','${supplier}'),('${poB}','TEST-PO-B','sent','${supplier}');
    INSERT INTO public.purchase_order_items(purchase_order_id,product_id,quantity) VALUES ('${poA}','${prod}',50),('${poB}','${prod}',50);
    INSERT INTO public.transit_shipments(purchase_order_id,product_id,warehouse_id,quantity,estimated_arrival) VALUES
      ('${poA}','${prod}','${whA}',30,'2026-11-17'),('${poB}','${prod}','${whB}',40,'2026-11-17');
  `);
  const setActor = id => rows("SELECT set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  const header = { warehouse_id: whA, supplier_id: supplier, purchase_order_id: poA,
    reception_date: '2026-11-17', container_label: 'CONT-TEST', exchange_rate_goods: 1,
    exchange_rate_freight: 1, freight_national: 250, operation_number: 'OpTEST' };
  const items = [
    { product_id: prod, warehouse_id: whA, purchase_order_id: poA, quantity: 10, unit_origin_cost: 600 },
    { product_id: prod, warehouse_id: whB, purchase_order_id: poB, quantity: 15, unit_origin_cost: 800 },
  ];
  const links = [{ id: poA, is_final: false }, { id: poB, is_final: false }];
  const save = async (id, confirm = true, h = header, i = items, l = links) =>
    (await rows('SELECT public.save_container_reception_atomic($1,$2::jsonb,$3::jsonb,$4::jsonb,$5) AS res',
      [id, JSON.stringify(h), JSON.stringify(i), JSON.stringify(l), confirm]))[0].res;
  const snapshot = () => rows(`SELECT jsonb_build_object(
    'receptions',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.container_receptions x),
    'items',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.container_reception_items x),
    'stock',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.warehouse_stock x),
    'cost',(SELECT jsonb_agg(jsonb_build_object('id',id,'avg',avg_cost,'stock',stock_quantity,'reserved',reserved_quantity) ORDER BY id) FROM public.products),
    'pos',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.purchase_orders x),
    'transits',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.transit_shipments x),
    'freight',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.service_orders x),
    'logs',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.inventory_logs x),
    'audit',(SELECT jsonb_agg(x ORDER BY x.id) FROM public.audit_log x)) AS state`);
  const unchangedFailure = async (action, pattern) => {
    const before = await snapshot();
    await assert.rejects(action, pattern);
    assert.deepEqual(await snapshot(), before, 'failure left partial business writes');
  };
  for (const actor of [accountant, driver, pro, null]) {
    await setActor(actor);
    await unchangedFailure(() => save(uid(100)), /Super Admin activo/);
  }
  await setActor(admin);
  await rows("UPDATE public.profiles SET is_active=false WHERE id=$1",[admin]);
  await unchangedFailure(() => save(uid(100)), /Super Admin activo/);
  await rows("UPDATE public.profiles SET is_active=true WHERE id=$1",[admin]);
  await db.exec('SET ROLE anon');
  await assert.rejects(() => save(uid(100)), /permission denied/);
  await db.exec('RESET ROLE');
  pass('Authorization: anon, inactive, accountant, driver and distributor denied; no writes');

  const rec = uid(100);
  const beforeDraft = (await snapshot())[0].state;
  assert.equal((await save(rec, false)).status, 'draft');
  const afterDraft = (await snapshot())[0].state;
  for (const key of ['stock','cost','pos','transits','freight','logs','audit']) assert.deepEqual(afterDraft[key],beforeDraft[key]);
  assert.equal(afterDraft.items.length, 2);
  assert.deepEqual(afterDraft.receptions[0].linked_purchase_orders, links);
  assert.equal(afterDraft.items.filter(i => i.purchase_order_id === poB).length, 1);
  assert.equal((await save(rec, false)).status, 'draft');
  assert.equal((await rows('SELECT count(*)::int n FROM public.container_reception_items'))[0].n, 2);
  pass('Draft replacement: no stock or financial writes; secondary PO and warehouse links persisted');

  for (const stage of ['cost','transit','freight']) {
    await rows("SELECT set_config('test.fail_stage',$1,false)",[stage]);
    await unchangedFailure(() => save(rec), new RegExp(`injected failure ${stage}`));
    await rows("SELECT set_config('test.fail_stage','',false)");
  }
  pass('Failures in costs, transit and freight roll back items, stock, averages, POs, logs and status');
  await unchangedFailure(() => save(rec,true,header,[{...items[0],quantity:-1}],links), /Cantidad o costo/);
  await unchangedFailure(() => save(rec,true,header,[{...items[0],warehouse_id:uid(999)}],links), /bodega inactivos/);
  await unchangedFailure(() => save(rec,true,header,[{...items[0],purchase_order_id:null}],links), /Asigna cada partida/);
  await unchangedFailure(() => save(rec,true,header,items,[...links,links[0]]), /duplicada/);
  pass('Invalid quantities, missing warehouses, ambiguous multi-PO lines and duplicate PO rejected atomically');

  // PGlite queues queries on one connection. This tests overlapping/retried calls;
  // independent-connection lock contention must also be checked on Postgres staging.
  const results = await Promise.all([save(rec), save(rec)]);
  assert.equal(results.filter(r => r.already_completed).length, 1);
  const done = (await snapshot())[0].state;
  assert.equal(done.receptions[0].status, 'completed');
  assert.equal(done.stock.find(s => s.warehouse_id === whA).stock_quantity, 60);
  assert.equal(done.stock.find(s => s.warehouse_id === whB).stock_quantity, 35);
  assert.equal(done.cost[0].stock, 95);
  assert.equal(done.cost[0].reserved, 6);
  assert.equal(Number(done.cost[0].avg), 560.53);
  assert.equal(done.transits.find(t => t.purchase_order_id === poA).quantity, 20);
  assert.equal(done.transits.find(t => t.purchase_order_id === poB).quantity, 25);
  assert.ok(done.pos.every(p => p.status === 'partially_received'));
  assert.equal(done.freight.length, 1);
  assert.equal(Number(done.freight[0].agreed_amount), 250);
  assert.match(done.freight[0].location, /Full/);
  assert.equal(done.logs.length, 2);
  assert.equal(done.audit.filter(a => a.action === 'reception_completed').length, 1);
  const completeState = await snapshot();
  assert.equal((await save(rec)).already_completed, true);
  assert.deepEqual(await snapshot(),completeState);
  await unchangedFailure(() => save(rec,false), /ya está completada/);
  await unchangedFailure(() => rows("UPDATE public.container_receptions SET status='draft' WHERE id=$1",[rec]), /no puede volver a borrador/);
  pass('Multi-warehouse confirmation: exact stock, single weighted average, partial PO balances and one freight order; retries do not duplicate');

  // Final partial reception on the same two POs, external transport and PRO charge.
  const rec2 = uid(101);
  const externalHeader = {...header, freight_external:true, freight_external_carrier:'Carrier ficticio',distributor_id:pro};
  const externalItems = items.map(i => ({...i,quantity:5,unit_pro_price:1000}));
  assert.equal((await save(rec2,true,externalHeader,externalItems,links.map(l=>({...l,is_final:true})))).success,true);
  const finalState = (await snapshot())[0].state;
  assert.ok(finalState.pos.every(p => p.status === 'received'));
  assert.equal(finalState.transits, null);
  assert.equal(finalState.freight.length,1);
  assert.equal(Number(finalState.receptions.find(r=>r.id===rec2).charge_amount),10000);
  pass('Final PO closure, external freight without service order, and PRO charge preserved');

  // Free reception is a normal supported flow (without any PO).
  const freeId = uid(103);
  const freeItem = {...items[0],purchase_order_id:null,quantity:2,unit_pro_price:1000};
  await db.exec('SET ROLE authenticated');
  assert.equal((await save(freeId,true,{...externalHeader,purchase_order_id:null},[freeItem],[])).success,true);
  await db.exec('RESET ROLE');
  pass('Free reception without PO supported');
  console.log(`\n${passes} checks passed. No production connection or business data used.`);
} catch (error) {
  console.error('FAIL', error.message, error.detail || '', error.where || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
