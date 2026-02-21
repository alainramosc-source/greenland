import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    const productsData = [
        {
            sku: 'GL01',
            name: 'Mesa Plegable 1.80',
            description: `TAMAÑO: L180*W74*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 90*75*8 CMS
PESO: 12.5 KGS
CANT POR TARIMA: 35 PIEZAS`
        },
        {
            sku: 'GL02',
            name: 'Mesa Plegable 1.22',
            description: `ALTURA AJUSTABLE: 3 NIVELES
TAMAÑO: L122*W61*H(48/61/74)CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 62*62*8 CMS
PESO: 8.5 KGS
CANT POR TARIMA: 60 PIEZAS`
        },
        {
            sku: 'GL03',
            name: 'Silla Plegable',
            description: `TAMAÑO: L51*W45*H85.5 CMS
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA
TAMAÑO CAJA: 116*34*48 CMS
PESO: 4.5 KGS
CANT POR TARIMA: 80 PIEZAS`
        },
        {
            sku: 'GL04',
            name: 'Mesa Plegable 1.80 Black',
            description: `TAMAÑO: L180*W74*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 90*75*8 CMS
PESO NETO: 11 KGS
CANT POR TARIMA: 35 PIEZAS`
        },
        {
            sku: 'GL05',
            name: 'Mesa Plegable 86 × 86 cm',
            description: `TAMAÑO: L86*W86*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 87*46*10 CMS
PESO: 10 KGS
CANT POR TARIMA: 50 PIEZAS`
        },
        {
            sku: 'GL06',
            name: 'Mesa Plegable 2.44',
            description: `TAMAÑO: L244*W75*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 28*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 122*76*10 CMS
PESO NETO: 18.5 KGS
CANT POR TARIMA: 26 PIEZAS`
        },
        {
            sku: 'GL07',
            name: 'Toldo Blanco 3×3',
            description: `TAMAÑO: 3 X 3 MTS
MATERIAL: ACERO CON RECUBRIMIENTO BLANCO
TELA: POLIÉSTER 800D CON RECUBRIMIENTO PVC (IMPERMEABLE)
TUBO EXTERIOR DEL PIE: 30 X 30 X 0.7 MM
TUBO INTERIOR DEL PIE: 25 X 25 X 0.7 MM
TUBO TRANSVERSAL: 13 X 23 X 0.7 MM
CONECTORES: PLÁSTICO ABS DE ALTA RESISTENCIA 
ADICIONALES: BOTÓN DE SEGURIDAD ANTI-PELLIZCOS, BASE DE PIE SILENCIOSA, INCLUYE MANUAL DE INSTRUCCIONES
EMPAQUE: TECHO + ESTRUCTURA EN BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 156*22*22 CMS
PESO: 20.5 KGS
CANT POR TARIMA: 35 PIEZAS`
        },
        {
            sku: 'GL08',
            name: 'Toldo Negro 3×3',
            description: `TAMAÑO: 3 X 3 MTS
MATERIAL: ACERO CON RECUBRIMIENTO NEGRO
TELA: POLIÉSTER 420D CON RECUBRIMIENTO PVC (IMPERMEABLE)
TUBO EXTERIOR DEL PIE: 30 X 30 X 0.6 MM
TUBO INTERIOR DEL PIE: 25 X 25 X 0.6 MM
TUBO TRANSVERSAL: 13 X 23 X 0.6 MM
ADICIONALES: INCLUYE MANUAL DE INSTRUCCIONES
EMPAQUE: TECHO + ESTRUCTURA EN CAJA DE CARTÓN
TAMAÑO CAJA: 148*21*20 CMS
PESO: 18 KGS
CANT POR TARIMA: 40 PIEZAS`
        },
        {
            sku: 'GL09',
            name: 'Mesa Plegable 1.80 × 70',
            description: `TAMAÑO: L180*W70*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 22*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 90*72*8 CMS
PESO NETO: 11 KGS
CANT POR TARIMA: 40 PIEZAS`
        },
        {
            sku: 'GL14',
            name: 'Silla Plegable Black',
            description: `TAMAÑO: L51*W45*H85.5 CMS
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA
TAMAÑO CAJA: 116*34*48 CMS
PESO: 4.5 KGS
CANT POR TARIMA: 80 PIEZAS`
        },
        {
            sku: 'GL15', // Normalized GL-15 to GL15
            name: 'Mesa Plegable 1.80 Premium',
            description: `TAMAÑO: L180*W74*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 90*75*10 CMS
PESO NETO: 14 KGS
CANT POR TARIMA: 32 PIEZAS`
        },
        {
            sku: 'GL16',
            name: 'Mesa Plegable 1.80 × 74 Tipo Ratán',
            description: `TAMAÑO: L180*W74*H74CM
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN
TAMAÑO CAJA: 90*75*8 CMS
PESO: 11 KGS
CANT POR TARIMA: 35 PIEZAS`
        },
        {
            sku: 'GL17',
            name: 'Silla Plegable Tipo Ratán',
            description: `TAMAÑO: L51*W45*H85.5 CMS
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 25*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA
TAMAÑO CAJA: 116*34*48 CMS
PESO: 4.5 KGS
CANT POR TARIMA: 80 PIEZAS`
        },
        {
            sku: 'GL18',
            name: 'Mesa Plegable Redonda 1.54',
            description: `TAMAÑO: D154*H74CMS
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 28*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA, 1 PIEZAS POR CAJA
TAMAÑO CAJA: 156*79*10 CMS
PESO: 21.5 KGS
CANT POR TARIMA: 20 PIEZAS`
        },
        {
            sku: 'GL19',
            name: 'Mesa Plegable Personal 76',
            description: `TAMAÑO: L76*W50*(H53.5 – 71.5) CMS
MATERIAL: HDPE + ACERO
MARCO DE ACERO: DIA 19*1.0 MM
EMPAQUE: BOLSA DE PE POR PIEZA, 1 PIEZA POR CAJA
TAMAÑO CAJA: 93*51*6 CMS
PESO: 4.5 KGS
CANT POR TARIMA: 90 PIEZAS`
        }
    ];

    const results = [];
    for (const data of productsData) {
        // Because the server client has admin-level execution in this Next.js app setup (service role under the hood)
        // or uses postgres RLS bypass via RPC if configured. 
        // We will execute a raw sql or bypass RPC if needed, but let's try direct first from server context.

        const { error } = await supabase
            .from('products')
            .update({
                name: data.name,
                description: data.description
            })
            // Checking both GL15 and GL-15 just in case
            .or(\`sku.eq.\${data.sku},sku.eq.\${data.sku.replace('GL', 'GL-')}\`);

        results.push({ sku: data.sku, failed: !!error, error: error ? error.message : null });
    }

    return NextResponse.json({ message: 'Sync complete', results });
}
