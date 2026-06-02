import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.greenland-products.com.mx';

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const now = new Date().toISOString();

  // Static pages
  const staticPages = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/productos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/distribuidores`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/nosotros`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/deco`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/deco/cotizacion`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/spaces`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/spaces/cotizacion`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/aviso-de-privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terminos-de-uso`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Category pages
  const categoryPages = [
    'mesas-plegables', 'sillas-plegables', 'toldos-plegables', 'bancas-y-mobiliario'
  ].map(cat => ({
    url: `${BASE_URL}/categorias/${cat}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Deco subcategory pages
  const decoPages = [
    'wpc-interior', 'wpc-exterior', 'deck', 'uv-marble', 'acoustic-panel', 'spc-flooring', 'stone'
  ].map(sub => ({
    url: `${BASE_URL}/deco/${sub}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Dynamic product pages from Supabase
  let productPages = [];
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('sku, created_at')
      .eq('is_active', true)
      .order('sku');

    if (error) {
      console.error('Sitemap: Supabase error', error.message);
    } else if (products) {
      productPages = products.map(p => ({
        url: `${BASE_URL}/productos/${p.sku}`,
        lastModified: p.created_at || now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Sitemap: Error fetching products', err);
  }

  return [...staticPages, ...categoryPages, ...decoPages, ...productPages];
}
