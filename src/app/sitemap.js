import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DECO_SLUGS = [
  'wpc-interior', 'wpc-exterior', 'deck', 'uv-marble',
  'acoustic-panel', 'spc-flooring', 'stone',
];

const CATEGORY_SLUGS = [
  'mesas-plegables', 'sillas-plegables', 'toldos-plegables', 'bancas-y-mobiliario',
];

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Static pages
  const staticPages = [
    { url: 'https://www.greenland-products.com.mx', lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://www.greenland-products.com.mx/productos', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://www.greenland-products.com.mx/distribuidores', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://www.greenland-products.com.mx/nosotros', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://www.greenland-products.com.mx/deco', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://www.greenland-products.com.mx/deco/cotizacion', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://www.greenland-products.com.mx/spaces', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://www.greenland-products.com.mx/spaces/cotizacion', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://www.greenland-products.com.mx/aviso-de-privacidad', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://www.greenland-products.com.mx/terminos-de-uso', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Category pages
  const categoryPages = CATEGORY_SLUGS.map((slug) => ({
    url: `https://www.greenland-products.com.mx/categorias/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Dynamic product pages from Supabase
  let productPages = [];
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('sku, created_at')
      .eq('is_active', true);

    if (error) {
      console.error('Sitemap: Supabase error', error.message);
    }

    productPages = (products || []).map((product) => ({
      url: `https://www.greenland-products.com.mx/productos/${product.sku}`,
      lastModified: product.created_at ? new Date(product.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (e) {
    console.error('Sitemap: Error fetching products', e);
  }

  // Deco product pages
  const decoPages = DECO_SLUGS.map((slug) => ({
    url: `https://www.greenland-products.com.mx/deco/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...decoPages];
}

