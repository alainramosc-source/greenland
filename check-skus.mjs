import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // All orders
    const { data: orders, error } = await supabase.from('orders').select('id, order_number, distributor_id, total_amount, status, payment_status').order('created_at');
    if (error) { console.log('orders error:', error.message); return; }
    console.log('=== ALL ORDERS ===');
    orders?.forEach(o => console.log(`${o.order_number} | dist: ${o.distributor_id?.substring(0, 8)} | total: $${o.total_amount} | status: ${o.status} | pay: ${o.payment_status}`));

    // All order_payments
    console.log('\n=== ORDER_PAYMENTS ===');
    const { data: op, error: opErr } = await supabase.from('order_payments').select('*');
    if (opErr) console.log('op error:', opErr.message);
    else if (!op?.length) console.log('No order_payments found');
    else op.forEach(p => console.log(`order: ${p.order_id?.substring(0, 8)} | $${p.amount} | ${p.payment_method}`));

    // All distributor_payments
    console.log('\n=== DISTRIBUTOR_PAYMENTS ===');
    const { data: dp, error: dpErr } = await supabase.from('distributor_payments').select('*');
    if (dpErr) console.log('dp error:', dpErr.message);
    else if (!dp?.length) console.log('No distributor_payments (anon blocked)');
    else dp.forEach(p => console.log(`dist: ${p.distributor_id?.substring(0, 8)} | $${p.amount} | status: ${p.status} | order: ${p.order_id?.substring(0, 8) || 'general'}`));
}
check();
