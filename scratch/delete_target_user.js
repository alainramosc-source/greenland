const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUser() {
  const email = 'greenland.reciclando@gmail.com';
  console.log(`Searching for profile with email: ${email}...`);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email);

  if (error) {
    console.error('Error finding profile:', error);
    return;
  }

  console.log('Found profiles:', profiles);

  if (profiles && profiles.length > 0) {
    const userId = profiles[0].id;
    console.log(`Calling RPC delete_user for ID: ${userId}...`);

    const { error: rpcErr } = await supabase.rpc('delete_user', { user_id: userId });
    if (rpcErr) {
      console.error('RPC delete_user error:', rpcErr);
      console.log('Attempting direct delete from profiles table...');
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', userId);
      if (delErr) {
        console.error('Direct profile delete error:', delErr);
      } else {
        console.log('Profile successfully deleted from public.profiles');
      }
    } else {
      console.log('RPC delete_user executed successfully!');
    }
  }
}

deleteUser();
