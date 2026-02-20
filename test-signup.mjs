import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function signUpUser() {
    console.log('Signing up new user...');
    const { data, error } = await supabase.auth.signUp({
        email: 'test_new_user123@greenland.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Test New User',
                city: 'Test City',
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
