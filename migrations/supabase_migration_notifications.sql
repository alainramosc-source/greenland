-- ========== NOTIFICACIONES ==========

-- 1. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'order_update',
  reference_id UUID,          -- order_id related
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- 2. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Función que genera notificaciones al cambiar status de orden
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_distributor_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_status_label TEXT;
BEGIN
  -- Solo actuar si el status cambió
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_order_number := NEW.order_number;
  v_distributor_id := NEW.distributor_id;

  -- Mapear status a etiqueta legible
  v_status_label := CASE NEW.status
    WHEN 'confirmed' THEN 'Confirmado'
    WHEN 'in_fulfillment' THEN 'En Surtido'
    WHEN 'shipped' THEN 'Enviado'
    WHEN 'closed' THEN 'Cerrado'
    WHEN 'cancelled' THEN 'Cancelado'
    WHEN 'rejected' THEN 'Rechazado'
    ELSE NEW.status
  END;

  v_title := 'Pedido #' || v_order_number || ' — ' || v_status_label;

  v_message := CASE NEW.status
    WHEN 'confirmed' THEN 'Tu pedido ha sido confirmado y el inventario fue reservado.'
    WHEN 'in_fulfillment' THEN 'Tu pedido está siendo surtido en almacén.'
    WHEN 'shipped' THEN '¡Tu pedido ha sido enviado!'
    WHEN 'closed' THEN 'Tu pedido ha sido cerrado operativamente.'
    WHEN 'cancelled' THEN 'Tu pedido ha sido cancelado.'
    WHEN 'rejected' THEN 'Tu pedido fue rechazado. Contacta a tu ejecutivo para más información.'
    ELSE 'El estado de tu pedido cambió a: ' || v_status_label
  END;

  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (v_distributor_id, v_title, v_message, 'order_update', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_order_status_notify ON orders;
CREATE TRIGGER trg_order_status_notify
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- ========== FIN NOTIFICACIONES ==========
