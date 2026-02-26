-- ===================================================
-- VINCULAR PRODUCTOS CON CATEGORÍAS (category_id FK)
-- Ejecutar en Supabase SQL Editor
-- ===================================================

-- Mesas → category_id de slug 'mesas'
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'mesas')
WHERE category = 'Mesas';

-- Sillas → category_id de slug 'sillas'
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'sillas')
WHERE category = 'Sillas';

-- Toldos → category_id de slug 'toldos'
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'toldos')
WHERE category = 'Toldos';

-- Bancas y Cobertizos → category_id de slug 'bancas'
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'bancas')
WHERE category IN ('Bancas', 'Cobertizos');

-- Verificación
SELECT p.sku, p.name, c.name as categoria, c.slug
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY c.slug, p.sku;
