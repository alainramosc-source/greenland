export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/login', '/api/', '/pending-approval', '/portal-proveedores'],
      },
    ],
    sitemap: 'https://www.greenland-products.com.mx/sitemap.xml',
  };
}
