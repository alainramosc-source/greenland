import './globals.css';
import Script from 'next/script';

export const metadata = {
  metadataBase: new URL('https://www.greenland-products.com.mx'),
  title: {
    default: 'Greenland Products | Mesas, Sillas y Toldos Plegables para Distribuidores',
    template: '%s | Greenland Products',
  },
  description: 'Importador y proveedor mayorista de mesas plegables, sillas plegables, toldos plegables, recubrimientos decorativos y soluciones modulares. Proveedor mayorista para distribuidores en México.',
  keywords: ['mesas plegables', 'sillas plegables', 'toldos plegables', 'mobiliario plegable', 'greenland products', 'distribuidor mobiliario', 'mesas tipo maleta', 'mobiliario para eventos', 'recubrimientos decorativos', 'WPC', 'soluciones modulares'],
  authors: [{ name: 'Greenland Products S.A. de C.V.' }],
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://www.greenland-products.com.mx',
    siteName: 'Greenland Products',
    title: 'Greenland Products | Mesas, Sillas y Toldos Plegables para Distribuidores',
    description: 'Importador y proveedor mayorista de mobiliario plegable profesional, recubrimientos decorativos y soluciones modulares. Proveedor mayorista para distribuidores en México.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Greenland Products - Mobiliario Plegable Profesional' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Greenland Products | Mobiliario Plegable Profesional',
    description: 'Mesas plegables, sillas plegables, toldos y más. Proveedor mayorista para distribuidores en México.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {
    google: 'RJwAWedMG7YP_utk-BWPrZYqjXK8qb-3aCzwbkmxctA',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KPY2MXDXGN"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KPY2MXDXGN');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Greenland Products S.A. de C.V.',
              url: 'https://www.greenland-products.com.mx',
              logo: 'https://www.greenland-products.com.mx/logo-new.jpg',
              description: 'Importador y proveedor mayorista de mobiliario plegable profesional, recubrimientos decorativos y soluciones modulares. Proveedor mayorista para distribuidores en México.',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'MX',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'ventas@greenland-products.com.mx',
                contactType: 'sales',
                availableLanguage: ['Spanish', 'English'],
              },
              sameAs: [],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}

