import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.greenland-products.com.mx';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const now = new Date().toISOString();

  const urls = [
    { loc: BASE_URL, lastmod: now, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/productos`, lastmod: now, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/distribuidores`, lastmod: now, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/nosotros`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/deco`, lastmod: now, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/deco/cotizacion`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/spaces`, lastmod: now, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/spaces/cotizacion`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/aviso-de-privacidad`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
    { loc: `${BASE_URL}/terminos-de-uso`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
  ];

  ['mesas-plegables', 'sillas-plegables', 'toldos-plegables', 'bancas-y-mobiliario'].forEach(cat => {
    urls.push({ loc: `${BASE_URL}/categorias/${cat}`, lastmod: now, changefreq: 'weekly', priority: '0.8' });
  });

  ['wpc-interior', 'wpc-exterior', 'deck', 'uv-marble', 'acoustic-panel', 'spc-flooring', 'stone'].forEach(sub => {
    urls.push({ loc: `${BASE_URL}/deco/${sub}`, lastmod: now, changefreq: 'monthly', priority: '0.7' });
  });

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('sku, created_at')
      .eq('is_active', true)
      .order('sku');

    if (!error && products) {
      products.forEach(p => {
        urls.push({
          loc: `${BASE_URL}/productos/${p.sku}`,
          lastmod: p.created_at || now,
          changefreq: 'weekly',
          priority: '0.8',
        });
      });
    }
  } catch (err) {
    console.error('Sitemap error:', err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
