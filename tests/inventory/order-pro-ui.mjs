import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../src/hooks/useOrderDetail.js',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
for(const name of ['handleDeleteItem','handleUpdateQuantity','handleAddProduct','handleSplitItem']){
 const start=source.indexOf(`  const ${name} = `),end=source.indexOf('\n  const ',start+10);
 assert(start>=0&&end>start);
 const code=source.slice(start,end);
 const messages=[],rpcCalls=[];
 const supabase={rpc:async(n)=>{rpcCalls.push(n);return{data:{success:false,error:'Stock insuficiente'}};},from:()=>{throw Error('Unexpected direct write fallback');}};
 const handler=await new AsyncFunction('supabase','order','id','alert','confirm','setActionLoading','validateQuantity','setEditingItems','setEditingPrices','fetchOrderDetails','setShowAddProduct','setProductSearch','setAvailableProducts','warehouses','editingPrices',code+`\nreturn ${name};`)(
  supabase,{status:'pending',order_items:[{id:'item'},{id:'other'}]},'order',m=>messages.push(m),()=>true,()=>{},q=>q,()=>{throw Error('Unsaved input cleared');},()=>{},()=>{throw Error('False success refresh');},()=>{},()=>{},()=>{},[],{}
 );
 if(name==='handleDeleteItem')await handler('item');
 if(name==='handleUpdateQuantity')await handler('item',3);
 if(name==='handleAddProduct')await handler({id:'product',price:10});
 if(name==='handleSplitItem')await handler({id:'item',product_id:'product',unit_price:10});
 assert.equal(rpcCalls.length,1);assert(messages[0].includes('Stock insuficiente'));
}
console.log('PASS: four real order handlers preserve server rejection without direct writes, false success or clearing pending quantities.');
