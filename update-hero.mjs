// trigger-vercel.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCMS() {
    console.log('Updating CMS to use local image...');
    const { error } = await supabase
        .from('cms_content')
        .update({ media_url: '/mesa black.jpg' })
        .eq('section_key', 'hero-bg');

    if (error) {
        console.error('Failed:', error);
    } else {
        console.log('Success! Supabase CMS updated.');
    }
}

updateCMS();
