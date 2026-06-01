import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DECO_SLUGS = [
  'wpc-interior', 'wpc-exterior', 'deck', 'uv-marble',
  'acoustic-panel', 'spc-flooring', 'stone',
];

const CATEGORY_SLUGS = [
  'mesas-plegables', 'sillas-plegables', 'toldos-plegables', 'bancas-y-mobiliario',
];

const BASE = 'https://www.greenland-products.com.mx';

function xmlUrl(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const now = new Date().toISOString();

  // Static pages
  const urls = [
    xmlUrl(BASE, now, 'weekly', '1.0'),
    xmlUrl(`${BASE}/productos`, now, 'weekly', '0.9'),
    xmlUrl(`${BASE}/distribuidores`, now, 'monthly', '0.8'),
    xmlUrl(`${BASE}/nosotros`, now, 'monthly', '0.6'),
    xmlUrl(`${BASE}/deco`, now, 'monthly', '0.9'),
    xmlUrl(`${BASE}/deco/cotizacion`, now, 'monthly', '0.7'),
    xmlUrl(`${BASE}/spaces`, now, 'monthly', '0.8'),
    xmlUrl(`${BASE}/spaces/cotizacion`, now, 'monthly', '0.7'),
    xmlUrl(`${BASE}/aviso-de-privacidad`, now, 'yearly', '0.3'),
    xmlUrl(`${BASE}/terminos-de-uso`, now, 'yearly', '0.3'),
  ];

  // Category pages
  CATEGORY_SLUGS.forEach(slug => {
    urls.push(xmlUrl(`${BASE}/categorias/${slug}`, now, 'weekly', '0.8'));
  });

  // Dynamic product pages from Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: products, error } = await supabase
      .from('products')
      .select('sku, created_at')
      .eq('is_active', true);

    if (!error && products) {
      products.forEach(product => {
        const lastmod = product.created_at ? new Date(product.created_at).toISOString() : now;
        urls.push(xmlUrl(`${BASE}/productos/${product.sku}`, lastmod, 'weekly', '0.8'));
      });
    }
  } catch (e) {
    console.error('Sitemap: Error fetching products', e);
  }

  // Deco pages
  DECO_SLUGS.forEach(slug => {
    urls.push(xmlUrl(`${BASE}/deco/${slug}`, now, 'monthly', '0.7'));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
