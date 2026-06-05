const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const BASE = 'https://www.greenland-products.com.mx';
const now = new Date().toISOString();

async function generate() {
  const urls = [
    { loc: BASE, prio: '1.0', freq: 'weekly' },
    { loc: `${BASE}/productos`, prio: '0.9', freq: 'weekly' },
    { loc: `${BASE}/distribuidores`, prio: '0.8', freq: 'monthly' },
    { loc: `${BASE}/nosotros`, prio: '0.6', freq: 'monthly' },
    { loc: `${BASE}/deco`, prio: '0.9', freq: 'monthly' },
    { loc: `${BASE}/deco/cotizacion`, prio: '0.7', freq: 'monthly' },
    { loc: `${BASE}/spaces`, prio: '0.8', freq: 'monthly' },
    { loc: `${BASE}/spaces/cotizacion`, prio: '0.7', freq: 'monthly' },
    { loc: `${BASE}/aviso-de-privacidad`, prio: '0.3', freq: 'yearly' },
    { loc: `${BASE}/terminos-de-uso`, prio: '0.3', freq: 'yearly' },
  ];

  ['mesas-plegables', 'sillas-plegables', 'toldos-plegables', 'bancas-y-mobiliario'].forEach(c => {
    urls.push({ loc: `${BASE}/categorias/${c}`, prio: '0.8', freq: 'weekly' });
  });

  ['wpc-interior', 'wpc-exterior', 'deck', 'uv-marble', 'acoustic-panel', 'spc-flooring', 'stone'].forEach(s => {
    urls.push({ loc: `${BASE}/deco/${s}`, prio: '0.7', freq: 'monthly' });
  });

  const { data: products } = await supabase
    .from('products')
    .select('sku, created_at')
    .eq('is_active', true)
    .order('sku');

  if (products) {
    products.forEach(p => {
      urls.push({ loc: `${BASE}/productos/${p.sku}`, prio: '0.8', freq: 'weekly', mod: p.created_at });
    });
  }

  const xmlLines = urls.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.mod || now}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.prio}</priority>\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlLines.join('\n')}\n</urlset>`;

  require('fs').writeFileSync('public/sitemap.xml', xml, 'utf8');
  console.log(`Generated public/sitemap.xml with ${urls.length} URLs`);
}

generate().catch(e => console.error(e));
