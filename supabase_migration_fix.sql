-- PASO 1: Quitar la restricción vieja de estados
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- PASO 2: Agregar nueva restricción con los estados correctos
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'in_fulfillment', 'shipped', 'closed', 'cancelled', 'rejected'));

-- PASO 3: Ahora sí migrar los estados existentes
UPDATE orders SET status = 'confirmed' WHERE status = 'processing';
UPDATE orders SET status = 'closed' WHERE status = 'delivered';

-- PASO 4: Inicializar payment_status en los registros que ya existen
UPDATE orders SET payment_status = 'paid' WHERE payment_confirmed_at IS NOT NULL AND payment_status = 'unpaid';
