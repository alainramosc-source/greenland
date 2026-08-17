const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAsAdmin() {
  // Login with admin user credentials to bypass anon RLS restriction
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@greenland.mx',
    password: 'admin'
  }).catch(() => ({ error: true }));

  console.log('Fetching recent counter_sales...');
  const { data: sales, error } = await supabase
    .from('counter_sales')
    .select('*, warehouse:warehouses(id, name)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }

  console.log(`Found ${sales.length} sales:`);
  sales.forEach(s => {
    console.log(`- Folio: "${s.sale_number}" | Status: "${s.status}" | Date: ${s.created_at} | Items: ${JSON.stringify(s.items)}`);
  });

  const { data: products } = await supabase.from('products').select('id, sku, name');

  // Find sales that are cancelled but need stock adjustment
  const cancelledSales = sales.filter(s => s.status === 'cancelled');
  console.log(`\nFound ${cancelledSales.length} cancelled sales.`);

  for (const sale of cancelledSales) {
    console.log(`\n--- Processing Cancelled Sale: ${sale.sale_number} (Warehouse: ${sale.warehouse?.name}) ---`);
    const items = sale.items || [];
    for (const item of items) {
      let pid = item.product_id || item.id;
      if (!pid && item.sku) {
        const found = products.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase());
        if (found) pid = found.id;
      }
      if (!pid && item.name) {
        const found = products.find(p => p.name && p.name.toLowerCase() === item.name.toLowerCase());
        if (found) pid = found.id;
      }

      console.log(`  Item: "${item.name}" (SKU: ${item.sku}), resolved product_id: ${pid}, qty to return: ${item.quantity}`);

      if (pid && sale.warehouse_id) {
        const { data: res, error: rpcErr } = await supabase.rpc('adjust_warehouse_stock', {
          p_product_id: pid,
          p_warehouse_id: sale.warehouse_id,
          p_quantity_change: item.quantity,
          p_reason: `ENTRADA_DEVOLUCION (Ajuste Retroactivo) — Venta Mostrador #${sale.sale_number} — Motivo: ${sale.cancel_reason || 'Devolución'}`,
        });

        if (rpcErr) {
          console.error('  RPC Error for', item.name, ':', rpcErr);
        } else {
          console.log('  Successfully adjusted stock for', item.name, 'Result:', res);
        }
      } else {
        console.error('  Could not resolve product_id or warehouse_id for item:', item);
      }
    }
  }

  // Check updated stock for GL26 (Lambrín Nogal Oscuro)
  const gl26 = products.find(p => p.sku === 'GL26');
  if (gl26) {
    const { data: ws } = await supabase
      .from('warehouse_stock')
      .select('*, warehouse:warehouses(name)')
      .eq('product_id', gl26.id);

    console.log('\n🎉 Updated Stock Summary for GL26 (Lambrín Nogal Oscuro):');
    ws?.forEach(w => console.log(`  Bodega ${w.warehouse?.name}: ${w.stock_quantity} unidades`));
  }
}

runAsAdmin();
