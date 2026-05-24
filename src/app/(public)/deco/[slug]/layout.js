const DECO_SEO = {
  'wpc-interior': {
    title: 'Lambrín WPC Interior | Panel Acanalado Tipo Madera',
    description: 'Lambrín WPC para interiores con acabado fluted acanalado tipo madera. Lambrín interior resistente a humedad y polillas. Instalación rápida por clipaje sin obra húmeda. Más de 20 tonalidades. Distribución mayorista en México.',
    keywords: ['lambrín', 'lambrín WPC', 'lambrín interior', 'panel WPC', 'panel acanalado', 'lambrín tipo madera', 'WPC interior'],
  },
  'wpc-exterior': {
    title: 'Wall Cladding WPC Coextruido | Lambrín Exterior',
    description: 'Wall cladding coextruido y lambrín exterior WPC para fachadas. También conocido como deck para muro o deck para techo. Resistencia UV máxima, 100% impermeable. Lambrín WPC coextruido con garantía de color 10-15 años. Distribución mayorista.',
    keywords: ['wall cladding', 'wall cladding coextruido', 'lambrín exterior', 'lambrín WPC', 'lambrín coextruido', 'deck para muro', 'deck para techo', 'WPC exterior', 'revestimiento exterior'],
  },
  'deck': {
    title: 'Deck Coextruido WPC | Deck para Terraza y Piso Exterior',
    description: 'Deck coextruido WPC para pisos exteriores: terrazas, albercas, jardines y rooftops. Deck para piso y deck para terraza con tecnología de doble capa anti-decoloración. Superficie antideslizante, 100% impermeable. Garantía 20-25 años.',
    keywords: ['deck', 'deck coextruido', 'deck para piso', 'deck para terraza', 'deck WPC', 'deck para alberca', 'piso exterior', 'piso para terraza'],
  },
  'uv-marble': {
    title: 'Panel de Mármol PVC UV | Mármol PVC Decorativo',
    description: 'Panel de mármol PVC con recubrimiento UV de alta brillantez. Mármol PVC en gran formato (1220×2440mm) para muros, baños, cocinas y lobbies. Aspecto idéntico al mármol natural a una fracción del costo. Instalación rápida sobre muro existente.',
    keywords: ['panel mármol PVC', 'mármol PVC', 'panel PVC mármol UV', 'lámina de mármol', 'panel decorativo mármol', 'mármol artificial'],
  },
  'acoustic-panel': {
    title: 'Panel Acústico Decorativo | Slat Wall Panel',
    description: 'Panel acústico de listones MDF con fieltro de poliéster para absorción de sonido. Panel decorativo acústico para salas, oficinas, restaurantes y home theaters. Reduce reverberación hasta 85%. Múltiples acabados en madera.',
    keywords: ['panel acústico', 'panel acústico decorativo', 'slat wall panel', 'panel de listones', 'panel absorbe sonido'],
  },
  'spc-flooring': {
    title: 'Piso Vinílico SPC | Piso Click Impermeable',
    description: 'Piso vinílico SPC (Stone Polymer Composite) con sistema click. 100% impermeable, aspecto de madera natural. Piso SPC para baños, cocinas y alto tráfico. Clasificación AC5/Clase 33. Garantía 25 años residencial.',
    keywords: ['piso vinílico SPC', 'piso SPC', 'piso click', 'piso vinílico', 'piso impermeable', 'piso tipo madera'],
  },
  'stone': {
    title: 'Piedra Flexible y PU Stone | Recubrimiento de Piedra Decorativa',
    description: 'Piedra flexible ultra delgada y paneles PU Stone con textura 3D realista. Recubrimiento de piedra decorativa 95% más ligera que la piedra natural. Se instala con adhesivo, sin mortero ni obra húmeda.',
    keywords: ['piedra flexible', 'PU stone', 'piedra decorativa', 'recubrimiento piedra', 'panel de piedra'],
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const seo = DECO_SEO[slug];
  if (!seo) return { title: 'Producto Deco' };
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: `${seo.title} | Greenland Products`,
      description: seo.description,
    },
  };
}

export default function Layout({ children }) {
  return children;
}
