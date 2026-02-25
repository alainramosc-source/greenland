import { createClient } from '@/utils/supabase/server';
import { ArrowRight, Box } from 'lucide-react';
import Link from 'next/link';

// Pre-render the specific categories the user requested
export async function generateStaticParams() {
    return [
        { slug: 'mesas-plegables' },
        { slug: 'sillas-plegables' },
        { slug: 'toldos-plegables' },
        { slug: 'bancas-y-mobiliario' }
    ];
}

export const dynamicParams = false; // Strictly only allow these 4 categories to prevent 404 caching on typos

const CATEGORY_DATA = {
    'mesas-plegables': {
        title: 'Mesas Plegables',
        dbCategory: 'Mesas',
        description: 'Mesas plegables rectangulares, cuadradas y redondas, desde formatos personales hasta mesas de gran capacidad. Diseños funcionales, resistentes y disponibles en distintos tamaños, colores y estilos para todo tipo de uso.'
    },
    'sillas-plegables': {
        title: 'Sillas Plegables',
        dbCategory: 'Sillas',  // Must match supabase DB category names roughly, or use wildcard search
        description: 'Sillas plegables resistentes y funcionales para cualquier ocasión. Modelos versátiles en distintos colores y acabados, diseñados para uso continuo, fácil manejo y larga vida útil.'
    },
    'toldos-plegables': {
        title: 'Toldos Plegables',
        dbCategory: 'Toldos',
        description: 'Toldos plegables de fácil montaje, disponibles en diferentes medidas y configuraciones. Diseñados para uso frecuente, con lonas resistentes y estructuras pensadas para brindad sombra, estabilidad y durabilidad.'
    },
    'bancas-y-mobiliario': {
        title: 'Bancas y Mobiliario',
        dbCategory: 'Bancas',
        description: 'Soluciones de mobiliario para espacios exteriores y áreas comunes. Bancas y cobertizos funcionales, ideales para parques, jardines, zonas recreativas y aplicaciones complementarias de uso continuo.'
    }
};

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const categoryInfo = CATEGORY_DATA[slug];

    if (!categoryInfo) {
        return (
            <div className="container py-20 text-center">
                <h2>Categoría no encontrada</h2>
                <Link href="/" className="text-[#6a9a04] hover:underline mt-4 inline-block">Volver al inicio</Link>
            </div>
        );
    }

    const supabase = await createClient();

    // Handle the Bancas and Mobiliario which might include Cobertizos based on user prompt
    let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

    if (slug === 'bancas-y-mobiliario') {
        query = query.in('category', ['Bancas', 'Cobertizos']);
    } else {
        // Normal Exact match for Mesas / Sillas / Toldos
        query = query.ilike('category', `%${categoryInfo.dbCategory}%`);
    }

    const { data: products } = await query.order('name');

    return (
        <div className="bg-[#FAFAFA] min-h-screen pb-20">
            {/* Category Header */}
            <section className="bg-slate-900 text-white pt-32 pb-16 relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#6a9a04]/20 to-transparent z-0"></div>

                <div className="container relative z-10 max-w-7xl mx-auto px-6">
                    <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-white mb-6 transition-colors font-mono">
                        ← VOLVER AL INICIO
                    </Link>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-tight">
                        {categoryInfo.title}
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed font-medium">
                        {categoryInfo.description}
                    </p>
                </div>
            </section>

            {/* Filtered Products Grid */}
            <section className="container max-w-7xl mx-auto px-6 mt-12">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Box size={20} className="text-[#6a9a04]" />
                        Catálogo Disponible
                    </h2>
                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{products?.length || 0} modelos</span>
                </div>

                {(!products || products.length === 0) ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <Box size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Sin productos disponibles</h3>
                        <p className="text-slate-500">Actualmente no hay modelos activos en esta categoría.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <Link href={`/productos/${product.sku}?ref=cat`} key={product.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                                <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden group-hover:bg-slate-100 transition-colors">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                            <Box size={32} />
                                        </div>
                                    )}
                                    {product.is_featured && (
                                        <div className="absolute top-3 left-3 bg-[#6a9a04] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                                            Destacado
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h3 className="font-bold text-slate-900 group-hover:text-[#6a9a04] transition-colors leading-tight line-clamp-2">
                                            {product.name}
                                        </h3>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded inline-block w-max mb-3">
                                        SKU: {product.sku}
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center text-sm font-bold text-[#6a9a04] group-hover:gap-2 transition-all">
                                        Ver ficha técnica <ArrowRight size={16} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
