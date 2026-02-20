import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://kjctnobogzpjxpwzmkwm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE'
);

async function signUpUser() {
    console.log('Signing up...');
    const { data, error } = await supabase.auth.signUp({
        email: 'alain.ramosc@gmail.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Alain Ramos',
                city: 'Monterrey',
                phone: '1234567890',
            },
        },
    });

    if (error) {
        console.error('Signup Error:', error);
    } else {
        console.log('Signup Success:', data.user?.id);
    }
}

signUpUser();
