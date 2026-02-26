import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjctnobogzpjxpwzmkwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3Rub2JvZ3pwanhwd3pta3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzYxNzksImV4cCI6MjA4NzA1MjE3OX0.4XOXPv7GmU2g2bakgP2N0xn9Iz7tQSObwSVyX93e9RE';
const supabase = createClient(supabaseUrl, supabaseKey);

const updates = [
    {
        sku: 'GL09',
        name: 'Mesa Plegable 1.80 × 70',
        description: `TAMAÑO: L180*W70*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 22*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*71*8 CMS\nPESO: 11 KGS\nCANT POR TARIMA: 40 PIEZAS`
    },
    {
        sku: 'GL12',
        name: 'Toldo Plegable 3×4.5 (Automático)',
        description: `TAMAÑO: 3 X 4.5 MTS\nMATERIAL: ACERO CON RECUBRIMIENTO BLANCO\nTELA: POLIÉSTER 800D CON RECUBRIMIENTO PVC (IMPERMEABLE)\nTUBO EXTERIOR DEL PIE: 30 X 30 X 0.7 MM\nTUBO INTERIOR DEL PIE: 25 X 25 X 0.7 MM\nTUBO TRANSVERSAL: 13 X 23 X 0.7 MM\nCONECTORES: PLÁSTICO ABS DE ALTA RESISTENCIA\nADICIONALES: BOTÓN DE SEGURIDAD ANTI-PELLIZCOS\nBASE DE PIE SILENCIOSA\nINCLUYE MANUAL DE INSTRUCCIONES\nEMPAQUE: TECHO + ESTRUCTURA EN BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 156*30*22 CMS\nPESO: 23.8 KGS\nCANT POR TARIMA: 24 PIEZAS`
    },
    {
        sku: 'GL13',
        name: 'Toldo Plegable 3×6 (Automático)',
        description: `TAMAÑO: 3 X 6 MTS\nMATERIAL: ACERO CON RECUBRIMIENTO BLANCO\nTELA: POLIÉSTER 800D CON RECUBRIMIENTO PVC (IMPERMEABLE)\nTUBO EXTERIOR DEL PIE: 30 X 30 X 0.7 MM\nTUBO INTERIOR DEL PIE: 25 X 25 X 0.7 MM\nTUBO TRANSVERSAL: 13 X 23 X 0.7 MM\nCONECTORES: PLÁSTICO ABS DE ALTA RESISTENCIA\nADICIONALES: BOTÓN DE SEGURIDAD ANTI-PELLIZCOS\nBASE DE PIE SILENCIOSA\nINCLUYE MANUAL DE INSTRUCCIONES\nEMPAQUE: TECHO + ESTRUCTURA EN BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 156*39*24 CMS\nPESO: 32.9 KGS\nCANT POR TARIMA: 18 PIEZAS`
    },
    {
        sku: 'GL22',
        name: 'Silla Plegable C17',
        description: `TAMAÑO: L49*W45*H84 CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 22*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 6 PIEZAS POR CAJA\nTAMAÑO CAJA: 111*32*46 CMS\nPESO: 4.3 KGS\nCANT POR TARIMA: 96 PIEZAS`
    },
    {
        sku: 'GL23',
        name: 'Silla Plegable C17 Black',
        description: `TAMAÑO: L49*W45*H84 CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 22*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 6 PIEZAS POR CAJA\nTAMAÑO CAJA: 111*32*46 CMS\nPESO: 4.3 KGS\nCANT POR TARIMA: 96 PIEZAS`
    }
];

async function updateProducts() {
    console.log('Updating 5 product specs...\n');
    for (const data of updates) {
        // Update using eq filter
        const { data: result, error, count } = await supabase
            .from('products')
            .update({ name: data.name, description: data.description })
            .eq('sku', data.sku)
            .select('sku, name');

        if (error) {
            console.error(`❌ ${data.sku}: ${error.message}`);
        } else if (result && result.length > 0) {
            console.log(`✅ ${data.sku}: "${result[0].name}" updated`);
        } else {
            console.log(`⚠️ ${data.sku}: No rows updated (RLS may block anon updates)`);
        }
    }
    console.log('\nDone!');
}

updateProducts();
