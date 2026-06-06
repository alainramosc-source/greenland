const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function migrate() {
  // Test if column exists by trying to query it
  const { data, error } = await sb.from('purchase_order_items')
    .select('unit_price_usd')
    .limit(1);
  
  if (error && error.message.includes('unit_price_usd')) {
    console.log('Column does not exist yet. Please add it manually in Supabase SQL Editor:');
    console.log('ALTER TABLE purchase_order_items ADD COLUMN unit_price_usd DECIMAL(10,2) DEFAULT 0;');
  } else {
    console.log('Column unit_price_usd already exists or query succeeded.');
    console.log('Data:', data);
  }
}

migrate();
