-- BL / Guía marítima en recepciones de contenedor.
-- Texto libre; acepta varios BL separados por "/".
ALTER TABLE container_receptions
  ADD COLUMN IF NOT EXISTS bl_number TEXT;
