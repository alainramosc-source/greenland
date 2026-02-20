import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

const productsToSeed = [
    { sku: 'GL01', name: 'Mesa Plegable 1.80', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL02', name: 'Mesa Plegable 1.22', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL03', name: 'Silla Plegable', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL04', name: 'Mesa Plegable 1.80 Black', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL05', name: 'Mesa Plegable 86 × 86 cm', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL06', name: 'Mesa Plegable 2.44', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL07', name: 'Toldo Blanco 3×3', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL08', name: 'Toldo Negro 3×3', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL09', name: 'Mesa Plegable 1.80 × 70', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL10', name: 'Toldo Blanco 2×2', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL11', name: 'Toldo Blanco 2×3', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL12', name: 'Toldo Blanco 3×4.5', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL13', name: 'Toldo Blanco 3×6', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL14', name: 'Silla Plegable Black', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL15', name: 'Mesa Plegable 1.80 Premium', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL16', name: 'Mesa Plegable 1.80 × 74 Tipo Ratán', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL17', name: 'Silla Plegable Tipo Ratán', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL18', name: 'Mesa Plegable Redonda 1.54', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL19', name: 'Mesa Plegable Personal 76', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL20', name: 'Mesa Plegable 1.80 × 74 Gray', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL21', name: 'Cobertizo 600', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL22', name: 'Silla Plegable C17', price: 0, is_active: true, description: 'Catálogo inicial' },
    { sku: 'GL23', name: 'Silla Plegable C17 Black', price: 0, is_active: true, description: 'Catálogo inicial' },
];

async function loginUser() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'alain.ramosc@gmail.com',
        password: 'Password123!',
    });

    if (error) {
        console.error('Login Error:', error.message);
        return false;
    } else {
        console.log('Login Success:', data.user?.id);
        return true;
    }
}

async function seedProducts() {
    console.log(`Starting to seed ${productsToSeed.length} products...`);
    const isLogged = await loginUser();
    if (!isLogged) return;

    // Check which ones already exist to avoid duplicates
    const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('sku');

    if (fetchError) {
        console.error('Error fetching existing products:', fetchError);
        return;
    }

    const existingSkus = existingProducts.map(p => p.sku);
    const productsToInsert = productsToSeed.filter(p => !existingSkus.includes(p.sku));

    if (productsToInsert.length === 0) {
        console.log('All products already exist in the database.');
        return;
    }

    console.log(`Inserting ${productsToInsert.length} new products...`);
    const { data, error } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select();

    if (error) {
        console.error('Error seeding products:', error);
    } else {
        console.log('Successfully seeded products!');
        console.log(data.map(p => `${p.sku} - ${p.name}`).join('\n'));
    }
}

seedProducts();
