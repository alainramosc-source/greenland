-- ============================================================
-- ORDER STATUS PROTECTION TRIGGERS
-- Prevents status regression and deletion of active orders
-- ============================================================

-- 1. TRIGGER: Prevent status regression
-- Valid transitions: pending → confirmed → in_fulfillment → shipped → closed
-- Cancellation/rejection allowed from: pending, confirmed, in_fulfillment
-- NO going backwards (e.g. confirmed → pending is BLOCKED)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_order_status_regression()
RETURNS TRIGGER AS $$
DECLARE
  v_status_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  -- Assign rank to statuses (higher = further in pipeline)
  v_status_rank := CASE OLD.status
    WHEN 'pending' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'in_fulfillment' THEN 3
    WHEN 'shipped' THEN 4
    WHEN 'closed' THEN 5
    WHEN 'cancelled' THEN 99
    WHEN 'rejected' THEN 99
    ELSE 0
  END;

  v_new_rank := CASE NEW.status
    WHEN 'pending' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'in_fulfillment' THEN 3
    WHEN 'shipped' THEN 4
    WHEN 'closed' THEN 5
    WHEN 'cancelled' THEN 99
    WHEN 'rejected' THEN 99
    ELSE 0
  END;

  -- If status didn't change, allow the update (could be updating other fields)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Block: terminal states (cancelled/rejected/closed) cannot change
  IF OLD.status IN ('cancelled', 'rejected', 'closed') THEN
    RAISE EXCEPTION 'No se puede cambiar el estado de un pedido % (estado terminal)', OLD.status;
  END IF;

  -- Block: status regression (going backwards in pipeline)
  IF v_new_rank < v_status_rank AND NEW.status NOT IN ('cancelled', 'rejected') THEN
    RAISE EXCEPTION 'No se permite regresar el estado de % a % (regresión de estado)', OLD.status, NEW.status;
  END IF;

  -- Allow cancellation/rejection only from pre-shipment states
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status IN ('shipped', 'closed') THEN
    RAISE EXCEPTION 'No se puede cancelar/rechazar un pedido que ya fue enviado o cerrado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_order_status_regression ON orders;
CREATE TRIGGER trg_prevent_order_status_regression
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION prevent_order_status_regression();


-- 2. TRIGGER: Prevent deletion of non-terminal orders
-- Only cancelled and rejected orders can be deleted
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_active_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('cancelled', 'rejected') THEN
    RAISE EXCEPTION 'No se puede eliminar un pedido con estado "%". Solo se pueden eliminar pedidos cancelados o rechazados.', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_active_order_deletion ON orders;
CREATE TRIGGER trg_prevent_active_order_deletion
  BEFORE DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_active_order_deletion();


-- ============================================================
-- VERIFICATION: Test the triggers exist
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_order_status_regression') THEN
    RAISE NOTICE '✅ Trigger de protección de estados ACTIVO';
  ELSE
    RAISE NOTICE '❌ Trigger de protección de estados NO encontrado';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_active_order_deletion') THEN
    RAISE NOTICE '✅ Trigger de protección de eliminación ACTIVO';
  ELSE
    RAISE NOTICE '❌ Trigger de protección de eliminación NO encontrado';
  END IF;
END $$;
