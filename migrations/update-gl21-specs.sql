-- Actualizar especificaciones de GL21 Cobertizo 600
-- Ejecutar en Supabase SQL Editor

UPDATE products SET 
    name = 'Cobertizo 600',
    description = E'TAMAÑO: 600 GALONES\nMATERIAL: HDPE (DISEÑO DE MADERA)\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nDIMENSIONES: L180*W111.7*H132CM'
WHERE sku = 'GL21';
