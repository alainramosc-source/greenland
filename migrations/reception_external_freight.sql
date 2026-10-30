-- =====================================================================
-- Flete con transportista externo (no frecuente) en recepciones
-- ---------------------------------------------------------------------
-- Cuando freight_external = true, al confirmar la recepción NO se genera
-- orden de servicio para el transportista registrado (GLO Shipping).
-- El monto de freight_national se sigue sumando al costo aterrizado.
-- =====================================================================

ALTER TABLE public.container_receptions
  ADD COLUMN IF NOT EXISTS freight_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS freight_external_carrier TEXT;

COMMENT ON COLUMN public.container_receptions.freight_external IS
  'true = flete nacional con transportista externo/no frecuente; no se genera service_order';
COMMENT ON COLUMN public.container_receptions.freight_external_carrier IS
  'Nombre del transportista externo (solo informativo)';

NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'container_receptions'
  AND column_name IN ('freight_external', 'freight_external_carrier');
