import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
