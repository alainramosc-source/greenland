import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Check profiles for client_number
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, role, client_number');
    if (pErr) console.log('profiles error:', pErr.message);
    else profiles?.forEach(p => console.log(`Profile: ${p.full_name} | role: ${p.role} | client_number: ${p.client_number || 'NULL'}`));
    
    // Check payments
    console.log('\n--- PAYMENTS ---');
    const { data: payments, error: payErr } = await supabase.from('distributor_payments').select('*');
    if (payErr) console.log('payments error:', payErr.message);
    else if (!payments || payments.length === 0) console.log('No payments found (RLS may be blocking anon reads)');
    else payments.forEach(p => console.log(`Payment: $${p.amount} | status: ${p.status} | dist: ${p.distributor_id}`));
}
check();
