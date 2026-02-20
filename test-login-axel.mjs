import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://kjctnobogzpjxpwzmkwm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE'
);

async function loginUser() {
    console.log('Logging in axelramosc...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'axelramosc@gmail.com',
        password: 'Password123!',
    });

    if (error) {
        console.error('Login Error:', error.message);
    } else {
        console.log('Login Success:', data.user?.id);
    }
}

loginUser();
