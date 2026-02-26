import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Check categories table
    const { data: cats, error: catErr } = await supabase.from('categories').select('*').order('sort_order');
    if (catErr) { console.error('categories error:', catErr.message); return; }
    console.log('=== CATEGORIES TABLE ===');
    cats.forEach(c => console.log(`id: ${c.id} | slug: ${c.slug} | name: ${c.name}`));

    // Check products category_id
    console.log('\n=== PRODUCTS ===');
    const { data: prods, error: prodErr } = await supabase.from('products').select('sku, name, category_id, category').order('sku');
    if (prodErr) { console.error('products error:', prodErr.message); return; }
    prods.forEach(p => console.log(`${p.sku} | cat_id: ${p.category_id || 'NULL'} | cat_text: ${p.category || 'NULL'}`));
}
check();
