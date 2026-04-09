-- =====================================================
-- NUEVOS PRODUCTOS GREENLAND DECO (GL26-GL29)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear categoría Deco si no existe
INSERT INTO categories (name, slug)
VALUES ('Deco', 'deco')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insertar los 4 productos nuevos

-- GL26 - WPC Indoor Wall Panel / Lambrín
INSERT INTO products (sku, name, description, price, is_active, category_id)
VALUES (
    'GL26',
    'WPC Indoor Wall Panel / Lambrín',
    'Panel de pared interior WPC. Acabado madera premium para interiores.',
    85.00,
    true,
    (SELECT id FROM categories WHERE slug = 'deco')
) ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id;

-- GL27 - WPC Angular Line (Indoor) / Ángulo p/Interior
INSERT INTO products (sku, name, description, price, is_active, category_id)
VALUES (
    'GL27',
    'WPC Angular Line (Indoor) / Ángulo p/Interior',
    'Perfil angular WPC para interiores. Acabado y complemento para lambrín indoor.',
    35.00,
    true,
    (SELECT id FROM categories WHERE slug = 'deco')
) ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id;

-- GL28 - WPC Outdoor Wall Cladding (Co-Extrusion)
INSERT INTO products (sku, name, description, price, is_active, category_id)
VALUES (
    'GL28',
    'WPC Outdoor Wall Cladding (Co-Extrusion)',
    'Revestimiento exterior WPC co-extrusión. Alta resistencia UV e intemperie.',
    199.00,
    true,
    (SELECT id FROM categories WHERE slug = 'deco')
) ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id;

-- GL29 - WPC Angular Line (Outdoor) / Ángulo p/Exterior (Co-Extrusión)
INSERT INTO products (sku, name, description, price, is_active, category_id)
VALUES (
    'GL29',
    'WPC Angular Line (Outdoor) / Ángulo p/Exterior (Co-Extrusión)',
    'Perfil angular WPC co-extrusión para exteriores. Complemento para wall cladding outdoor.',
    110.00,
    true,
    (SELECT id FROM categories WHERE slug = 'deco')
) ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id;

-- 3. Verificar
SELECT p.sku, p.name, p.price, c.name as category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE sku IN ('GL26', 'GL27', 'GL28', 'GL29');
