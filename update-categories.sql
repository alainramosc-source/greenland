-- ===================================================
-- ASIGNAR CATEGORÍAS A TODOS LOS PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ===================================================

-- MESAS PLEGABLES
UPDATE products SET category = 'Mesas' WHERE sku IN (
    'GL01',  -- Mesa Plegable 1.80
    'GL02',  -- Mesa Plegable 1.22
    'GL04',  -- Mesa Plegable 1.80 Black
    'GL05',  -- Mesa Plegable 86 × 86
    'GL06',  -- Mesa Plegable 2.44
    'GL09',  -- Mesa Plegable 1.80 × 70
    'GL15',  -- Mesa Plegable 1.80 Premium
    'GL16',  -- Mesa Plegable 1.80 × 74 Tipo Ratán
    'GL18',  -- Mesa Plegable Redonda 1.54
    'GL19',  -- Mesa Plegable Personal 76
    'GL20'   -- Mesa Plegable 1.80 × 74 Gray
);

-- SILLAS PLEGABLES
UPDATE products SET category = 'Sillas' WHERE sku IN (
    'GL03',  -- Silla Plegable
    'GL14',  -- Silla Plegable Black
    'GL17',  -- Silla Plegable Tipo Ratán
    'GL22',  -- Silla Plegable C17
    'GL23'   -- Silla Plegable C17 Black
);

-- TOLDOS PLEGABLES
UPDATE products SET category = 'Toldos' WHERE sku IN (
    'GL07',  -- Toldo Blanco 3×3
    'GL08',  -- Toldo Negro 3×3
    'GL10',  -- Toldo Blanco 2×2
    'GL11',  -- Toldo Blanco 2×3
    'GL12',  -- Toldo Plegable 3×4.5
    'GL13'   -- Toldo Plegable 3×6
);

-- BANCAS Y MOBILIARIO
UPDATE products SET category = 'Bancas' WHERE sku IN (
    'GL24'   -- Banca Plegable 183
);
UPDATE products SET category = 'Bancas' WHERE sku = 'BANCA-PL-180';

UPDATE products SET category = 'Cobertizos' WHERE sku IN (
    'GL21',  -- Cobertizo 600
    'GL25'   -- Baúl Exterior 130
);

-- ========== ASIGNAR IMAGE_URL PARA THUMBNAILS ==========
-- JPGs (modelos originales GL01-GL08)
UPDATE products SET image_url = '/productos/' || sku || '-P1.jpg' WHERE sku IN ('GL01','GL02','GL03','GL04','GL05','GL06','GL07','GL08');
-- PNGs (modelos nuevos GL09+)
UPDATE products SET image_url = '/productos/' || sku || '-P1.png' WHERE sku IN ('GL09','GL10','GL11','GL12','GL13','GL14','GL15','GL16','GL17','GL18','GL19','GL20','GL21','GL22','GL23','GL24','GL25');

-- Verificación: ver cuántos productos hay por categoría
SELECT category, COUNT(*) as total FROM products WHERE is_active = true GROUP BY category ORDER BY category;
